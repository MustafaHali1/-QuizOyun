import express from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import { extractText } from 'unpdf';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }
});

function getApiKey() {
  try {
    const keyFilePath = path.join(__dirname, 'apikey.txt');
    if (fs.existsSync(keyFilePath)) {
      const raw = fs.readFileSync(keyFilePath, 'utf-8').trim();
      const cleaned = raw.replace(/^GEMINI_API_KEY\s*=\s*/i, '').trim();
      if (cleaned.length > 10) return cleaned;
    }
  } catch (e) {
    // ignore
  }
  dotenv.config({ override: true });
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  return key.trim();
}

// ============================================================================
// KESİN RAKAM KURALI: Doğu Arap / Fars rakamlarını (٠١٢٣٤٥٦٧٨٩) her zaman
// standart 0123456789 rakamlarına dönüştürür.
// ============================================================================
function normalizeDigits(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

function letterToOptionIndex(rawLetter, fallbackIndex = 0) {
  const ch = String(rawLetter || '').trim().toUpperCase();
  const map = {
    A: 0,
    B: 1,
    C: 2,
    D: 3,
    E: 4,
    'أ': 0,
    'ا': 0,
    'إ': 0,
    'آ': 0,
    'ب': 1,
    'ج': 2,
    'د': 3,
    'ه': 4,
    'هـ': 4,
    'ت': 2,
    'ث': 3
  };
  return ch in map ? map[ch] : fallbackIndex;
}

// ============================================================================
// 1. ÇOK DİLLİ (TR / AR / EN) HIZLI YEREL SORU & ŞIK AYIKLAYICI
// ============================================================================
function extractStructuredQuestionsFromText(rawText) {
  const normalized = normalizeDigits(rawText)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Yan yana yazılmış Latin veya Arapça şıkları alt satıra indir
    .replace(/(\s+)(?=(?:[A-Ea-e]|[أابجدهتث]|هـ)[\)\.\-]\s+)/g, '\n');

  const lines = normalized
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const questions = [];
  let currentQ = null;

  // TR: Soru 1., EN: Question 1., Q1., AR: س1:, السؤال 1:, 1-
  const qStartRegex = /^(?:Soru\s*|Question\s*|Q\s*|سؤال\s*|السؤال\s*|س\s*)?(\d+)[\.\)\-\:،]\s*(.+)/i;
  // TR/EN: A) B) C) D) E) veya AR: أ) ب) ج) د) هـ)
  const optRegex = /^(?:\(?([A-Ea-e]|هـ|[أابجدهتث])[\.\)\-\:،])\s*(.+)/;
  // Cevap Anahtarı Satırı (TR / EN / AR)
  const ansRegex = /^(?:Cevap|Doğru\s*Cevap|Yanıt|Answer|Correct\s*Answer|الإجابة(?:\s*الصحيحة)?|الجواب)[\s\:\-]*([A-Ea-e]|هـ|[أابجدهتث])/i;

  for (const line of lines) {
    const ansMatch = line.match(ansRegex);
    if (ansMatch && currentQ) {
      currentQ.detectedAnswer = letterToOptionIndex(ansMatch[1], 0);
      continue;
    }

    const optMatch = line.match(optRegex);
    if (optMatch && currentQ) {
      let optText = normalizeDigits(optMatch[2].trim());
      const seqIdx = currentQ.options.length;
      const letterIdx = letterToOptionIndex(optMatch[1], seqIdx);
      const stdLetter = String.fromCharCode(65 + Math.min(4, seqIdx));

      if (
        optText.endsWith('*') ||
        /\((?:doğru|cevap|correct|صحيح|الإجابة)\)/i.test(optText)
      ) {
        optText = optText
          .replace(/\*+$/, '')
          .replace(/\((?:doğru|cevap|correct|صحيح|الإجابة)\)/gi, '')
          .trim();
        currentQ.detectedAnswer = seqIdx;
      }

      currentQ.options.push(`${stdLetter}) ${optText}`);
      continue;
    }

    const qMatch = line.match(qStartRegex);
    if (qMatch) {
      if (currentQ && currentQ.options.length >= 2) {
        questions.push(currentQ);
      }
      currentQ = {
        id: questions.length + 1,
        question: normalizeDigits(qMatch[2].trim()),
        options: [],
        detectedAnswer: null
      };
      continue;
    }

    if (currentQ) {
      if (currentQ.options.length === 0) {
        currentQ.question += ' ' + normalizeDigits(line);
      } else {
        if (currentQ.options.length >= 4) {
          questions.push(currentQ);
          currentQ = {
            id: questions.length + 1,
            question: normalizeDigits(line),
            options: [],
            detectedAnswer: null
          };
        } else {
          currentQ.options[currentQ.options.length - 1] += ' ' + normalizeDigits(line);
        }
      }
    } else {
      currentQ = {
        id: 1,
        question: normalizeDigits(line),
        options: [],
        detectedAnswer: null
      };
    }
  }

  if (currentQ && currentQ.options.length >= 2) {
    questions.push(currentQ);
  }

  return questions;
}

// ============================================================================
// 2. ULTRA HIZLI ÇOK DİLLİ YZ ÇÖZÜCÜ (15'erli Paralel Paketler)
// ============================================================================
const fastSolveSchema = {
  type: 'object',
  properties: {
    answers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'Question ID number' },
          c: { type: 'integer', description: '0-based index of the correct option (0=A, 1=B, 2=C, 3=D, 4=E)' },
          e: { type: 'string', description: 'Short 1-sentence explanation in the SAME language as the question (use only 0-9 digits)' },
          h: { type: 'string', description: 'Short 5-8 word hint in the SAME language as the question (use only 0-9 digits)' }
        },
        required: ['id', 'c', 'e', 'h']
      }
    }
  },
  required: ['answers']
};

function getDefaultFallbackTexts(questionText, uiLang = 'tr') {
  const isArabic = /[\u0600-\u06FF]/.test(questionText) || uiLang === 'ar';
  if (isArabic) {
    return {
      explanation: 'تم تحديد الإجابة الصحيحة بعد تحليل السؤال.',
      hint: 'ركز على المفهوم الأساسي في السؤال.'
    };
  }
  if (uiLang === 'en') {
    return {
      explanation: 'Correct answer determined by analyzing the question.',
      hint: 'Focus on the key concept in the question.'
    };
  }
  return {
    explanation: 'Doğru cevap analiz edilerek belirlendi.',
    hint: 'Sorudaki anahtar kavrama odaklan.'
  };
}

async function solveQuestionsInParallel(ai, rawQuestions, uiLang = 'tr') {
  const BATCH_SIZE = 15;
  const batches = [];
  for (let i = 0; i < rawQuestions.length; i += BATCH_SIZE) {
    batches.push(rawQuestions.slice(i, i + BATCH_SIZE));
  }

  const systemPrompt = `You are a fast multilingual exam solver supporting Turkish (tr), Arabic (ar), and English (en).
Find the correct option index (0=A, 1=B, 2=C, 3=D, 4=E) for each multiple-choice question.
Rules:
- 'c': 0-based integer index of the correct option.
- 'e': Very concise 1-sentence explanation (max 12 words) written in the SAME LANGUAGE as the question (if Arabic -> write in Arabic; if English -> write in English; if Turkish -> write in Turkish).
- 'h': Short hint (5-8 words) without giving away the answer directly, written in the SAME LANGUAGE as the question.
- CRITICAL NUMERAL RULE: Always use Western digits (0, 1, 2, 3, 4, 5, 6, 7, 8, 9). NEVER use Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩) even when writing in Arabic.`;

  const batchPromises = batches.map(async (batch) => {
    const compactText = batch
      .map((q) => {
        const opts = q.options.join(' | ');
        const known = q.detectedAnswer !== null ? ` [Detected Answer Index: ${q.detectedAnswer}]` : '';
        return `#${q.id}: ${q.question}\nOptions: ${opts}${known}`;
      })
      .join('\n\n');

    try {
      const interaction = await ai.interactions.create({
        model: 'gemini-3.5-flash-lite',
        system_instruction: systemPrompt,
        input: compactText,
        generation_config: {
          thinking_level: 'minimal'
        },
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema: fastSolveSchema
        }
      });

      const parsed = JSON.parse(interaction.output_text || '{"answers":[]}');
      return parsed.answers || [];
    } catch (err) {
      console.warn('Batch (gemini-3.5-flash-lite) fallback -> gemini-3.8-flash:', err.message);
      const interaction = await ai.interactions.create({
        model: 'gemini-3.8-flash',
        system_instruction: systemPrompt,
        input: compactText,
        generation_config: {
          thinking_level: 'low'
        },
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema: fastSolveSchema
        }
      });
      const parsed = JSON.parse(interaction.output_text || '{"answers":[]}');
      return parsed.answers || [];
    }
  });

  const results = await Promise.all(batchPromises);
  const answerMap = new Map();
  results.flat().forEach((ans) => {
    answerMap.set(ans.id, ans);
  });

  return rawQuestions.map((q, idx) => {
    const solved = answerMap.get(q.id);
    let correctIdx = q.detectedAnswer !== null ? q.detectedAnswer : (solved ? solved.c : 0);
    if (typeof correctIdx !== 'number' || correctIdx < 0 || correctIdx >= q.options.length) {
      correctIdx = 0;
    }
    const fallbacks = getDefaultFallbackTexts(q.question, uiLang);
    return {
      id: idx + 1,
      question: normalizeDigits(q.question),
      options: q.options.map((o) => normalizeDigits(o)),
      correctAnswer: correctIdx,
      explanation: normalizeDigits(solved?.e || fallbacks.explanation),
      hint: normalizeDigits(solved?.h || fallbacks.hint)
    };
  });
}

// ============================================================================
// 3. TAM METİN / GÖRSEL AYIKLAYICI (Serbest metin veya taranmış PDF/Görsel için)
// ============================================================================
const fullExtractSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          question: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          correctAnswer: { type: 'integer' },
          explanation: { type: 'string' },
          hint: { type: 'string' }
        },
        required: ['id', 'question', 'options', 'correctAnswer', 'explanation', 'hint']
      }
    }
  },
  required: ['title', 'questions']
};

// ============================================================================
// ANA ENDPOINT: POST /api/parse
// ============================================================================
app.post('/api/parse', upload.single('file'), async (req, res) => {
  const startTime = Date.now();
  try {
    const rawText = req.body.text ? normalizeDigits(req.body.text.trim()) : '';
    const uiLang = req.body.lang || 'tr';
    const uploadedFile = req.file;

    if (!rawText && !uploadedFile) {
      return res.status(400).json({ error: 'Lütfen soru metni yapıştırın veya bir dosya seçin.' });
    }

    const apiKey = getApiKey();
    let extractedText = rawText;
    let inlineMedia = null;
    let fileTitle = '';

    if (uploadedFile) {
      const ext = path.extname(uploadedFile.originalname).toLowerCase();
      const mime = uploadedFile.mimetype;
      fileTitle = normalizeDigits(path.basename(uploadedFile.originalname, ext));
      console.log(`📂 Dosya alındı: ${uploadedFile.originalname} (${(uploadedFile.size / 1024).toFixed(1)} KB)`);

      if (ext === '.docx' || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer: uploadedFile.buffer });
        extractedText = (extractedText ? extractedText + '\n\n' : '') + normalizeDigits(result.value);
      } else if (ext === '.txt' || ext === '.md' || ext === '.csv' || mime.startsWith('text/')) {
        const fileText = uploadedFile.buffer.toString('utf-8');
        extractedText = (extractedText ? extractedText + '\n\n' : '') + normalizeDigits(fileText);
      } else if (ext === '.pdf' || mime === 'application/pdf') {
        try {
          const uint8 = new Uint8Array(uploadedFile.buffer);
          const { text: pdfPagesText } = await extractText(uint8, { mergePages: true });
          if (pdfPagesText && pdfPagesText.trim().length > 40) {
            extractedText = (extractedText ? extractedText + '\n\n' : '') + normalizeDigits(pdfPagesText.trim());
            console.log(`⚡ PDF metni yerel olarak ${Date.now() - startTime}ms içinde çıkarıldı (${extractedText.length} karakter).`);
          } else {
            inlineMedia = {
              type: 'document',
              data: uploadedFile.buffer.toString('base64'),
              mime_type: 'application/pdf'
            };
          }
        } catch (pdfErr) {
          console.warn('unpdf metin çıkarma uyarısı, inline PDF kullanılacak:', pdfErr.message);
          inlineMedia = {
            type: 'document',
            data: uploadedFile.buffer.toString('base64'),
            mime_type: 'application/pdf'
          };
        }
      } else if (mime.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
        inlineMedia = {
          type: 'image',
          data: uploadedFile.buffer.toString('base64'),
          mime_type: mime.startsWith('image/') ? mime : 'image/png'
        };
      } else {
        return res.status(400).json({ error: `Desteklenmeyen dosya formatı: ${ext}` });
      }
    }

    // 1. ÖNCE HIZLI YEREL AYRIŞTIRMAYI DENE (TR / AR / EN)
    const preParsedQuestions = extractedText ? extractStructuredQuestionsFromText(extractedText) : [];
    console.log(`🔍 Yerel ön-ayrıştırma: ${preParsedQuestions.length} soru tespit edildi.`);

    if (!apiKey || apiKey.length < 10) {
      if (preParsedQuestions.length === 0) {
        return res.status(400).json({ error: 'API Anahtarı bulunamadı ve metinden soru ayrıştırılamadı.' });
      }
      return res.json({
        mode: 'fallback',
        title: fileTitle || 'Quiz Map',
        count: preParsedQuestions.length,
        questions: preParsedQuestions.map((q, i) => {
          const fb = getDefaultFallbackTexts(q.question, uiLang);
          return {
            id: i + 1,
            question: normalizeDigits(q.question),
            options: q.options.map((o) => normalizeDigits(o)),
            correctAnswer: q.detectedAnswer ?? 0,
            explanation: fb.explanation,
            hint: fb.hint
          };
        })
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    // 2. EĞER YEREL AYRIŞTIRICI SORULARI VE ŞIKLARI BULDUYSA -> PARALEL HIZLI ÇÖZÜM
    if (preParsedQuestions.length >= 1 && !inlineMedia) {
      console.log(`🚀 Hızlı Paralel Çözüm Modu başlatıldı (${preParsedQuestions.length} soru)...`);
      const solvedQuestions = await solveQuestionsInParallel(ai, preParsedQuestions, uiLang);
      console.log(`✅ Tamamlandı! Süre: ${((Date.now() - startTime) / 1000).toFixed(1)} saniye.`);

      return res.json({
        mode: 'ai-fast',
        title: fileTitle || `Map (${solvedQuestions.length})`,
        count: solvedQuestions.length,
        questions: solvedQuestions
      });
    }

    // 3. EĞER GÖRSEL / TARANMIŞ PDF İSE VEYA STANDART ŞIK FORMATI YOKSA -> TAM MODEL ÇIKARIMI
    console.log(`🤖 Tam Belge/Görsel Çıkarım Modu başlatıldı...`);
    const systemInstruction = `Extract all multiple-choice questions and their options (A, B, C, D) from the document or image (supports Turkish, Arabic, and English).
If no answer key is provided, solve each question and set 'correctAnswer' to the 0-based index (0=A, 1=B, 2=C, 3=D).
Write 'explanation' (max 10 words) and 'hint' (max 6 words) in the SAME LANGUAGE as the questions in the document.
CRITICAL RULE: Always use standard Western digits (0, 1, 2, 3, 4, 5, 6, 7, 8, 9) everywhere. NEVER output Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩).`;

    const inputParts = [];
    if (inlineMedia) inputParts.push(inlineMedia);
    if (extractedText) {
      inputParts.push({ type: 'text', text: extractedText });
    } else {
      inputParts.push({ type: 'text', text: 'Extract all multiple-choice questions as JSON.' });
    }

    const interaction = await ai.interactions.create({
      model: 'gemini-3.8-flash',
      system_instruction: systemInstruction,
      input: inputParts,
      generation_config: {
        thinking_level: 'low'
      },
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: fullExtractSchema
      }
    });

    const parsedData = JSON.parse(interaction.output_text || '{"questions":[]}');
    const normalizedQuestions = (parsedData.questions || []).map((q, idx) => {
      const qText = normalizeDigits(q.question || '');
      const fb = getDefaultFallbackTexts(qText, uiLang);
      const opts = Array.isArray(q.options)
        ? q.options.map((opt, oIdx) => {
            const cleaned = normalizeDigits(String(opt)).replace(/^(?:\(?([A-Ea-e]|هـ|[أابجدهتث])[\.\)\-\:،])\s*/, '').trim();
            return `${String.fromCharCode(65 + oIdx)}) ${cleaned}`;
          })
        : [];
      return {
        id: idx + 1,
        question: qText,
        options: opts,
        correctAnswer:
          typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer < opts.length
            ? q.correctAnswer
            : 0,
        explanation: normalizeDigits(q.explanation || fb.explanation),
        hint: normalizeDigits(q.hint || fb.hint)
      };
    });

    console.log(`✅ Tam Çıkarım Tamamlandı (${normalizedQuestions.length} soru)! Süre: ${((Date.now() - startTime) / 1000).toFixed(1)} sn.`);

    res.json({
      mode: 'ai-full',
      title: normalizeDigits(fileTitle || parsedData.title || 'Quiz Map'),
      count: normalizedQuestions.length,
      questions: normalizedQuestions
    });
  } catch (err) {
    console.error('❌ Soru ayrıştırma hatası:', err);
    res.status(500).json({
      error: `Sorular işlenirken hata oluştu: ${err.message || 'Bilinmeyen hata'}`
    });
  }
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 QuizOyun Çok Dilli Hızlı Sunucu Çalışıyor: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
