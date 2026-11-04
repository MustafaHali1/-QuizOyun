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
// KESİN RAKAM KURALI & MATEMATİK METNİ TEMİZLEYİCİ
// Doğu Arap / Fars rakamlarını (٠١٢٣٤٥٦٧٨٩) 0123456789 yapar,
// ham LaTeX komutlarını (\vec{OA}, \overline{AB}, $$) temiz okunaklı metne çevirir.
// ============================================================================
function normalizeDigits(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

function cleanMathText(str) {
  if (typeof str !== 'string') return '';
  return normalizeDigits(str)
    .replace(/\$\$/g, ' ')
    .replace(/\$/g, '')
    .replace(/\\(?:vec|overrightarrow|overline|bar)\s*\{([^}]+)\}/g, '$1')
    .replace(/\\frac\s*\{([^}]+)\}\s*\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\sqrt\s*\[([^\]]+)\]\s*\{([^}]+)\}/g, '$1√($2)')
    .replace(/\\sqrt\s*\{([^}]+)\}/g, '√($1)')
    .replace(/\\infty/g, '∞')
    .replace(/\\pi/g, 'π')
    .replace(/\\leq|\\le/g, '≤')
    .replace(/\\geq|\\ge/g, '≥')
    .replace(/\\neq|\\ne/g, '≠')
    .replace(/\\cdot|\\times/g, '·')
    .replace(/\\to|\\rightarrow/g, '→')
    .replace(/\\mathbb\{R\}|\\Re/g, 'ℝ')
    .replace(/\s+/g, ' ')
    .trim();
}

function letterToOptionIndex(rawLetter, fallbackIndex = 0) {
  const ch = String(rawLetter || '').trim().toUpperCase();
  const map = {
    A: 0,
    B: 1,
    C: 2,
    D: 3,
    E: 4,
    F: 5,
    'أ': 0,
    'ا': 0,
    'إ': 0,
    'آ': 0,
    'ب': 1,
    'ج': 2,
    'د': 3,
    'ه': 4,
    'هـ': 4,
    'و': 5,
    'ت': 2,
    'ث': 3
  };
  return ch in map ? map[ch] : fallbackIndex;
}

// ============================================================================
// 1. ÇOK DİLLİ (TR / AR / EN) HIZLI YEREL SORU & ŞIK AYIKLAYICI (2-6 Şık: A-F)
// ============================================================================
function extractStructuredQuestionsFromText(rawText) {
  const normalized = normalizeDigits(rawText)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/(\s+)(?=(?:[A-Fa-f]|[أابجدهوتث]|هـ)[\)\.\-]\s+)/g, '\n');

  const lines = normalized
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const questions = [];
  let currentQ = null;

  const qStartRegex = /^(?:Soru\s*|Question\s*|Q\s*|سؤال\s*|السؤال\s*|س\s*)?(\d+)[\.\)\-\:،]\s*(.+)/i;
  const optRegex = /^(?:\(?([A-Fa-f]|هـ|[أابجدهوتث])[\.\)\-\:،])\s*(.+)/;
  const ansRegex = /^(?:Cevap|Doğru\s*Cevap|Yanıt|Answer|Correct\s*Answer|الإجابة(?:\s*الصحيحة)?|الجواب)[\s\:\-]*([A-Fa-f]|هـ|[أابجدهوتث])/i;

  for (const line of lines) {
    const ansMatch = line.match(ansRegex);
    if (ansMatch && currentQ) {
      currentQ.detectedAnswer = letterToOptionIndex(ansMatch[1], 0);
      continue;
    }

    const optMatch = line.match(optRegex);
    if (optMatch && currentQ) {
      let optText = cleanMathText(optMatch[2].trim());
      const seqIdx = currentQ.options.length;
      if (seqIdx >= 6) continue;
      const stdLetter = String.fromCharCode(65 + Math.min(5, seqIdx));

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
        question: cleanMathText(qMatch[2].trim()),
        options: [],
        detectedAnswer: null
      };
      continue;
    }

    if (currentQ) {
      if (currentQ.options.length === 0) {
        currentQ.question += ' ' + cleanMathText(line);
      } else {
        if (currentQ.options.length >= 4) {
          questions.push(currentQ);
          currentQ = {
            id: questions.length + 1,
            question: cleanMathText(line),
            options: [],
            detectedAnswer: null
          };
        } else {
          currentQ.options[currentQ.options.length - 1] += ' ' + cleanMathText(line);
        }
      }
    } else {
      currentQ = {
        id: 1,
        question: cleanMathText(line),
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
// AKILLI KALİTE KONTROLÜ: PDF'ten çıkan metin ve yerel ayrıştırma temiz mi?
// Ayrıca eğer metinde "yandaki şekilde / في الرسم المجاور" gibi şekilli soru varsa
// şekli kesebilmek için doğrudan Görsel PDF moduna geçirir!
// ============================================================================
function isLocalParseHighQuality(questions, rawText, isPdf) {
  if (!Array.isArray(questions) || questions.length === 0) return false;

  if (isPdf) {
    // Bozuk sembol fontu varsa veya şekilli soru ibaresi varsa görsel moda geç
    if (/[\uF000-\uF8FF]/.test(rawText)) return false;
    if (/الرسم المجاور|الرسم السابق|الشكل المقابل|yandaki şekil|yukarıdaki şekil|aşağıdaki şekil|in the figure|shown in the figure/i.test(rawText)) {
      return false;
    }
  }

  const validQuestions = questions.filter(
    (q) =>
      q.question &&
      q.question.trim().length >= 4 &&
      Array.isArray(q.options) &&
      q.options.length >= 2 &&
      q.options.length <= 6
  );

  if (validQuestions.length < questions.length * 0.8) {
    return false;
  }

  return true;
}

async function callGeminiWithRetry(fn, maxRetries = 2) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = String(err?.message || '');
      const isRateLimit = msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate');
      if (isRateLimit && attempt < maxRetries) {
        const waitMs = 2000 * (attempt + 1);
        console.warn(`⏳ API limit uyarısı (429), ${waitMs}ms beklenip tekrar deneniyor...`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// ============================================================================
// 2. ULTRA HIZLI ÇOK DİLLİ YZ ÇÖZÜCÜ (Temiz Metin Dosyaları İçin)
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
          c: { type: 'integer', description: '0-based index of the correct option (0=A, 1=B, 2=C, 3=D, 4=E, 5=F)' },
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
  const MAX_CONCURRENCY = 3;
  const batches = [];
  for (let i = 0; i < rawQuestions.length; i += BATCH_SIZE) {
    batches.push(rawQuestions.slice(i, i + BATCH_SIZE));
  }

  const systemPrompt = `You are a fast multilingual exam solver supporting Turkish (tr), Arabic (ar), and English (en).
Find the correct option index (0=A, 1=B, 2=C, 3=D, 4=E, 5=F) for each multiple-choice question.
Rules:
- 'c': 0-based integer index of the correct option.
- 'e': Very concise 1-sentence explanation (max 12 words) written in the SAME LANGUAGE as the question.
- 'h': Short hint (5-8 words) without giving away the answer directly, written in the SAME LANGUAGE as the question.
- CRITICAL NUMERAL RULE: Always use Western digits (0, 1, 2, 3, 4, 5, 6, 7, 8, 9). NEVER use Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩).`;

  const allAnswers = [];

  for (let i = 0; i < batches.length; i += MAX_CONCURRENCY) {
    const group = batches.slice(i, i + MAX_CONCURRENCY);
    const groupResults = await Promise.all(
      group.map(async (batch) => {
        const compactText = batch
          .map((q) => {
            const opts = q.options.join(' | ');
            const known = q.detectedAnswer !== null ? ` [Detected Answer Index: ${q.detectedAnswer}]` : '';
            return `#${q.id}: ${q.question}\nOptions: ${opts}${known}`;
          })
          .join('\n\n');

        try {
          const interaction = await callGeminiWithRetry(() =>
            ai.interactions.create({
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
            })
          );

          const parsed = JSON.parse(interaction.output_text || '{"answers":[]}');
          return parsed.answers || [];
        } catch (err) {
          console.warn('Batch (gemini-3.5-flash-lite) fallback -> gemini-3.8-flash:', err.message);
          const interaction = await callGeminiWithRetry(() =>
            ai.interactions.create({
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
            })
          );
          const parsed = JSON.parse(interaction.output_text || '{"answers":[]}');
          return parsed.answers || [];
        }
      })
    );
    allAnswers.push(...groupResults.flat());
  }

  const answerMap = new Map();
  allAnswers.forEach((ans) => {
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
      question: cleanMathText(q.question),
      options: q.options.map((o) => cleanMathText(o)),
      correctAnswer: correctIdx,
      explanation: cleanMathText(solved?.e || fallbacks.explanation),
      hint: cleanMathText(solved?.h || fallbacks.hint)
    };
  });
}

// ============================================================================
// 3. DOĞRUDAN GÖRSEL BELGE / PDF / RESİM + OTOMATİK ŞEKİL KOORDİNAT ÇIKARICI
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
          hint: { type: 'string' },
          hasFigure: {
            type: 'boolean',
            description: 'True if the question refers to a figure/diagram/drawing/graph on the page (including "previous figure")'
          },
          figurePage: {
            type: 'integer',
            description: '1-based page number of the PDF where the figure is located (1 for single image, 0 if hasFigure is false)'
          },
          figureBox: {
            type: 'array',
            items: { type: 'integer' },
            description: 'If hasFigure is true, [ymin, xmin, ymax, xmax] (0 to 1000 normalized page coordinates) tightly framing the figure and its vertex/axis labels. If hasFigure is false, return [0, 0, 0, 0].'
          }
        },
        required: [
          'id',
          'question',
          'options',
          'correctAnswer',
          'explanation',
          'hint',
          'hasFigure',
          'figurePage',
          'figureBox'
        ]
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
    let isPdfFile = false;
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
        isPdfFile = true;
        inlineMedia = {
          type: 'document',
          data: uploadedFile.buffer.toString('base64'),
          mime_type: 'application/pdf'
        };

        try {
          const uint8 = new Uint8Array(uploadedFile.buffer);
          const { text: pdfPagesText } = await extractText(uint8, { mergePages: true });
          if (pdfPagesText && pdfPagesText.trim().length > 40) {
            extractedText = (extractedText ? extractedText + '\n\n' : '') + normalizeDigits(pdfPagesText.trim());
            console.log(`⚡ PDF metni yerel olarak ${Date.now() - startTime}ms içinde çıkarıldı (${extractedText.length} karakter).`);
          }
        } catch (pdfErr) {
          console.warn('unpdf metin çıkarma uyarısı, doğrudan görsel PDF kullanılacak:', pdfErr.message);
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

    // 1. ÖNCE YEREL AYRIŞTIRMAYI VE KALİTE KONTROLÜNÜ DENE
    const preParsedQuestions = extractedText ? extractStructuredQuestionsFromText(extractedText) : [];
    const isHighQualityLocal = isLocalParseHighQuality(preParsedQuestions, extractedText, isPdfFile);
    console.log(
      `🔍 Yerel ön-ayrıştırma: ${preParsedQuestions.length} soru tespit edildi (Kalite Kontrolü: ${
        isHighQualityLocal ? 'GEÇTİ ✅' : 'GÖRSEL MODA GEÇİLİYOR 🔄'
      }).`
    );

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
            question: cleanMathText(q.question),
            options: q.options.map((o) => cleanMathText(o)),
            correctAnswer: q.detectedAnswer ?? 0,
            explanation: fb.explanation,
            hint: fb.hint
          };
        })
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    // 2. EĞER METİN TEMİZSE VE ŞEKİLLİ SORU YOKSA -> PARALEL HIZLI ÇÖZÜM
    if (isHighQualityLocal && (!inlineMedia || isPdfFile)) {
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

    // 3. DOĞRUDAN GÖRSEL BELGE + ŞEKİL KOORDİNAT ÇIKARIM MODU
    console.log(`⚡ Doğrudan Görsel Belge & Şekil Kırpma Modu başlatıldı...`);
    const systemInstruction = `Extract ONLY multiple-choice questions (questions that have 2 to 6 options such as A, B, C, D, E, F or أ, ب, ج, د, هـ, و) from the document, image, or text.
Rules:
1. Skip cover pages, instruction tables, answer-sheet grids, and skip open-ended questions that have no options.
2. Preserve all options in order (whether 2, 3, 4, 5, or 6 options A-F).
3. Do NOT use LaTeX commands like $$ or \\overline or \\vec. Write clean mathematical expressions using readable Unicode symbols (², ³, ⁻¹, √, ³√, ≤, ≥, ≠, ∞, π, ℝ, →, ∫, ±, ·).
4. Solve each question and set 'correctAnswer' to the 0-based index of the correct option (0=A, 1=B, 2=C, 3=D, 4=E, 5=F).
5. FIGURE DETECTION & CROPPING:
   - If a question refers to a geometric figure, diagram, graph, or drawing (e.g., "في الرسم المجاور", "في الرسم السابق", "في الشكل", "yandaki şekilde", "yukarıdaki şekilde", "in the figure"), set 'hasFigure' = true, 'figurePage' = 1-based page number of that figure, and 'figureBox' = [ymin, xmin, ymax, xmax] (0 to 1000 normalized coordinates on that page) covering the entire drawing and its labels.
   - If a question says "in the previous figure" ("في الرسم السابق" / "önceki şekilde"), set 'hasFigure' = true and give it the EXACT SAME 'figurePage' and 'figureBox' as the previous question's figure!
   - If a question has NO figure, set 'hasFigure' = false, 'figurePage' = 0, and 'figureBox' = [0, 0, 0, 0].
6. Write 'explanation' (max 10 words) and 'hint' (max 6 words) in the SAME LANGUAGE as the questions.
7. CRITICAL NUMERAL RULE: Always use standard Western digits (0, 1, 2, 3, 4, 5, 6, 7, 8, 9) everywhere. NEVER output Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩).`;

    const inputParts = [];
    if (inlineMedia) {
      inputParts.push(inlineMedia);
      if (rawText) {
        inputParts.push({ type: 'text', text: rawText });
      } else {
        inputParts.push({
          type: 'text',
          text: 'Extract all multiple-choice questions, their options, and any figure bounding boxes [ymin, xmin, ymax, xmax] into JSON.'
        });
      }
    } else {
      inputParts.push({ type: 'text', text: extractedText || 'Extract all multiple-choice questions as JSON.' });
    }

    let interaction;
    try {
      interaction = await callGeminiWithRetry(() =>
        ai.interactions.create({
          model: 'gemini-3.5-flash-lite',
          system_instruction: systemInstruction,
          input: inputParts,
          generation_config: {
            thinking_level: 'minimal'
          },
          response_format: {
            type: 'text',
            mime_type: 'application/json',
            schema: fullExtractSchema
          }
        })
      );
    } catch (liteErr) {
      console.warn('Görsel çıkarım (gemini-3.5-flash-lite) fallback -> gemini-3.8-flash:', liteErr.message);
      interaction = await callGeminiWithRetry(() =>
        ai.interactions.create({
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
        })
      );
    }

    const parsedData = JSON.parse(interaction.output_text || '{"questions":[]}');
    let lastValidFigure = null;

    const normalizedQuestions = (parsedData.questions || [])
      .filter((q) => Array.isArray(q.options) && q.options.length >= 2)
      .map((q, idx) => {
        const qText = cleanMathText(q.question || '');
        const fb = getDefaultFallbackTexts(qText, uiLang);
        const opts = q.options.slice(0, 6).map((opt, oIdx) => {
          const cleaned = cleanMathText(String(opt))
            .replace(/^(?:\(?([A-Fa-f]|هـ|[أابجدهوتث])[\.\)\-\:،])\s*/, '')
            .trim();
          return `${String.fromCharCode(65 + oIdx)}) ${cleaned}`;
        });

        let hasFig = Boolean(q.hasFigure);
        let figPage = typeof q.figurePage === 'number' && q.figurePage > 0 ? q.figurePage : 0;
        let figBox =
          Array.isArray(q.figureBox) &&
          q.figureBox.length === 4 &&
          q.figureBox.some((v) => v > 0)
            ? q.figureBox
            : null;

        // Eğer soru metni "önceki şekilde / في الرسم السابق" diyorsa ve kendi koordinatı boşsa bir önceki şekli miras al!
        const mentionsFigure =
          /الرسم المجاور|الرسم السابق|الشكل المقابل|الشكل المجاور|yandaki şekil|önceki şekil|önceki resim|yukarıdaki şekil|aşağıdaki şekil|in the figure|previous figure/i.test(
            qText
          );

        if (hasFig && figPage > 0 && figBox) {
          lastValidFigure = { figurePage: figPage, figureBox: figBox };
        } else if ((hasFig || mentionsFigure) && lastValidFigure) {
          hasFig = true;
          figPage = lastValidFigure.figurePage;
          figBox = [...lastValidFigure.figureBox];
        } else {
          hasFig = false;
          figPage = 0;
          figBox = null;
        }

        return {
          id: idx + 1,
          question: qText,
          options: opts,
          correctAnswer:
            typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer < opts.length
              ? q.correctAnswer
              : 0,
          explanation: cleanMathText(q.explanation || fb.explanation),
          hint: cleanMathText(q.hint || fb.hint),
          hasFigure: hasFig,
          figurePage: figPage,
          figureBox: figBox
        };
      });

    console.log(
      `✅ Görsel/Tam Çıkarım Tamamlandı (${normalizedQuestions.length} soru, ${
        normalizedQuestions.filter((q) => q.hasFigure).length
      } şekilli soru)! Süre: ${((Date.now() - startTime) / 1000).toFixed(1)} sn.`
    );

    res.json({
      mode: 'ai-visual-fast',
      title: cleanMathText(fileTitle || parsedData.title || 'Quiz Map'),
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
