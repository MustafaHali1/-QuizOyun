// QuizOyun — Çoklu Harita (Multi-Map) & Çok Dilli (TR / AR / EN) Oyun Motoru

const STORAGE_KEY = 'quiz_hunter_multimap_v2';

// Kesin Rakam Kuralı: Doğu Arap/Fars rakamlarını (٠١٢٣٤٥٦٧٨٩) her zaman 0123456789 yapar
function normalizeDigits(val) {
  return String(val ?? '')
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

function isArabicText(str) {
  return /[\u0600-\u06FF]/.test(String(str || ''));
}

const I18N = {
  tr: {
    appBrand: 'QUIZOYUN',
    navMistakes: 'Hata',
    btnNewMap: '+ Yeni Harita / Soru At',
    btnResetMap: 'Sıfırla',
    btnQuestions: 'Sorular',
    revengeReadyTitle: '💀 İntikam Modu Hazır',
    revengeReadyDesc: (n) => `Bu haritada yanlış yaptığın <span id="bannerMistakeCount" class="text-white underline">${n}</span> soru seni bekliyor.`,
    btnCleanMistakes: 'Temizle',
    badgeSummary: (q, s) => `${q} SORU • ${s} BÖLÜM`,
    stageTitle: (i, isBoss) => (isBoss ? `Bölüm ${i} (Boss)` : `Bölüm ${i}`),
    stageRange: (start, end) => `${start}-${end}. Sorular`,
    badgeStart: 'BAŞLA',
    badgeReplay: 'TEKRAR',
    jokerHint: 'İpucu',
    jokerHeal: '+1 Can',
    btnContinue: 'DEVAM ET',
    btnFinish: 'BİTİR',
    btnSeeResult: 'SONUCU GÖR',
    lblMapScore: 'HARİTA PUANI',
    lblAccuracy: 'BÖLÜM İSABETİ',
    lblRemainingLives: 'KALAN CAN',
    btnNextStage: 'SONRAKİ BÖLÜM →',
    btnRestartFullMap: '🔄 HARİTAYI BAŞTAN BAŞLAT (PUANI SIFIRLA)',
    btnRetryStage: 'BU BÖLÜMÜ TEKRAR OYNA',
    btnBackToMap: 'HARİTAYA DÖN',
    importModalTitle: 'Yeni Harita Oluştur (Soru At)',
    importModalSub: 'Türkçe, Arapça veya İngilizce soru seti yükleyebilirsin.',
    importTitlePlaceholder: 'Harita / Ders Adı (Örn: Tarih Vize, Fizik Test 2)',
    rawInputPlaceholder: 'Soruları buraya olduğu gibi yapıştır (TR, AR veya EN)...\n\n1. Soru metni?\nA) Şık 1\nB) Şık 2\nC) Şık 3\nD) Şık 4',
    tabPasteText: 'Metin Yapıştır',
    tabUploadFile: 'PDF / Word / Resim',
    tabJsonBackup: 'JSON Yedek',
    lblSelectFile: 'PDF, Word (.docx), TXT veya Resim Seç',
    btnRemoveFile: 'Kaldır',
    lblAppendMode: 'Yeni harita açma, şu anki haritaya ekle',
    btnCreateMapSubmit: 'YENİ HARİTAYI KUR',
    btnAppendMapSubmit: 'MEVCUT HARİTAYA EKLE',
    settingsTitle: '⚙️ Ayarlar & Haritalarım',
    lblLanguageSection: 'Dil / Language / اللغة',
    lblMyMaps: 'Haritalarım',
    lblShowHide: '▼ Aç / Gizle',
    lblShow: '▶ Göster',
    lblHide: '▼ Gizle',
    lblQuestionsPerStage: 'Bölüm Başı Soru',
    optStageAuto: 'Otomatik (~8-10)',
    optStage5: '5 Soru',
    optStage10: '10 Soru',
    optStage15: '15 Soru',
    optStageAll: 'Tek Bölüm (Hepsi)',
    lblStartingLives: 'Başlangıç Canı',
    btnDownloadAll: 'Yedek İndir',
    btnAddSampleMap: 'Örnek Harita',
    previewModalTitle: 'Harita Soru Havuzu',
    previewModalSub: 'Doğru cevabı değiştirmek için şıkkın üstüne tıkla.',
    btnResetProgressOnly: 'Bu Haritanın İlerlemesini Sıfırla',
    btnClose: 'Kapat',
    btnDelete: 'Sil',
    questionsShort: (n) => `${n} Soru`,
    questionCounter: (title, cur, total) => `${title} • SORU ${cur} / ${total}`,
    comboBadge: (n) => `🔥 ${n} SERİ`,
    mistakeModeTitle: 'Hata Havuzu',
    noMistakesAlert: 'Bu haritanın hata havuzu tertemiz! Hiç yanlış sorun yok.',
    minOneMapAlert: 'En az 1 harita bulunmalıdır.',
    confirmDeleteMap: (title) => `"${title}" haritasını silmek istediğine emin misin?`,
    confirmRestartMap: (title) => `"${title}" haritasını baştan başlatmak ve puanını (0 / 100) sıfırlamak istiyor musun?`,
    feedbackCorrectCombo: '✓ Doğru Cevap! 🔥 5x Seri Ödülü: +1 Can Kazandın!',
    feedbackCorrect: (score) => `✓ Harika! Doğru Cevap (Harita Puanı: ${score} / 100)`,
    feedbackWrong: (letter) => `✕ Yanlış! Doğru Cevap: ${letter}`,
    resultMistakesCleared: 'Hatalar Temizlendi!',
    resultMapCompleted: (score) => `Harita Tamamlandı! (${score}/100)`,
    resultStagePassed: 'Bölüm Geçildi!',
    resultSurvivedSub: (total, corr) => `Bu bölümde ${total} soruda ${corr} doğru yaptın.`,
    resultGameOverTitle: 'Canların Bitti!',
    resultGameOverSub: 'Yanlışlar bu haritanın Hata Havuzuna eklendi. Tekrar dene!',
    errEmptyImport: 'Lütfen soru metnini yapıştır veya bir dosya seç.',
    statusPreparing: (sec) => `HAZIRLANIYOR (${sec} sn)...`,
    statusSolving: '⚡ Sorular paralel olarak ayıklanıyor ve çözülüyor, lütfen bekle...',
    defaultMapName: (n) => `Harita #${n}`
  },
  ar: {
    appBrand: 'كويز أويون',
    navMistakes: 'أخطاء',
    btnNewMap: '+ خريطة جديدة / أضف أسئلة',
    btnResetMap: 'إعادة ضبط',
    btnQuestions: 'الأسئلة',
    revengeReadyTitle: '💀 وضع الانتقام جاهز',
    revengeReadyDesc: (n) => `لديك <span id="bannerMistakeCount" class="text-white underline">${n}</span> أسئلة خاطئة في هذه الخريطة بانتظارك.`,
    btnCleanMistakes: 'تصفية الأخطاء',
    badgeSummary: (q, s) => `${q} سؤال • ${s} مراحل`,
    stageTitle: (i, isBoss) => (isBoss ? `المرحلة ${i} (الأخيرة)` : `المرحلة ${i}`),
    stageRange: (start, end) => `الأسئلة ${start}-${end}`,
    badgeStart: 'ابدأ',
    badgeReplay: 'إعادة',
    jokerHint: 'تلميح',
    jokerHeal: '+1 قلب',
    btnContinue: 'متابعة',
    btnFinish: 'إنهاء',
    btnSeeResult: 'عرض النتيجة',
    lblMapScore: 'نقاط الخريطة',
    lblAccuracy: 'دقة المرحلة',
    lblRemainingLives: 'القلوب المتبقية',
    btnNextStage: 'المرحلة التالية ←',
    btnRestartFullMap: '🔄 إعادة الخريطة من البداية (تصفير النقاط)',
    btnRetryStage: 'إعادة لعب هذه المرحلة',
    btnBackToMap: 'العودة للخريطة',
    importModalTitle: 'إنشاء خريطة جديدة (إضافة أسئلة)',
    importModalSub: 'يمكنك رفع أسئلة باللغة العربية أو التركية أو الإنجليزية.',
    importTitlePlaceholder: 'اسم الخريطة أو المادة (مثال: اختبار التاريخ 1)',
    rawInputPlaceholder: 'الصق الأسئلة هنا كما هي (بالعربية أو التركية أو الإنجليزية)...\n\n1. نص السؤال؟\nأ) الخيار 1\nب) الخيار 2\nج) الخيار 3\nد) الخيار 4',
    tabPasteText: 'لصق نص',
    tabUploadFile: 'PDF / وورد / صورة',
    tabJsonBackup: 'نسخة JSON',
    lblSelectFile: 'اختر ملف PDF أو Word (.docx) أو TXT أو صورة',
    btnRemoveFile: 'إزالة',
    lblAppendMode: 'لا تفتح خريطة جديدة، أضف إلى الخريطة الحالية',
    btnCreateMapSubmit: 'إنشاء الخريطة الآن',
    btnAppendMapSubmit: 'إضافة للخريطة الحالية',
    settingsTitle: '⚙️ الإعدادات وخرائطي',
    lblLanguageSection: 'اللغة / Dil / Language',
    lblMyMaps: 'خرائطي',
    lblShowHide: '▼ إظهار / إخفاء',
    lblShow: '◀ إظهار',
    lblHide: '▼ إخفاء',
    lblQuestionsPerStage: 'أسئلة كل مرحلة',
    optStageAuto: 'تلقائي (~8-10)',
    optStage5: '5 أسئلة',
    optStage10: '10 أسئلة',
    optStage15: '15 سؤال',
    optStageAll: 'مرحلة واحدة (الكل)',
    lblStartingLives: 'عدد القلوب',
    btnDownloadAll: 'تحميل نسخة',
    btnAddSampleMap: 'خريطة تجريبية',
    previewModalTitle: 'بنك أسئلة الخريطة',
    previewModalSub: 'اضغط على أي خيار لتعيينه كإجابة صحيحة.',
    btnResetProgressOnly: 'تصفير تقدم هذه الخريطة فقط',
    btnClose: 'إغلاق',
    btnDelete: 'حذف',
    questionsShort: (n) => `${n} سؤال`,
    questionCounter: (title, cur, total) => `${title} • سؤال ${cur} / ${total}`,
    comboBadge: (n) => `🔥 ${n} متتالية`,
    mistakeModeTitle: 'صندوق الأخطاء',
    noMistakesAlert: 'صندوق الأخطاء نظيف تماماً! لا توجد لديك إجابات خاطئة.',
    minOneMapAlert: 'يجب أن تبقى خريطة واحدة على الأقل.',
    confirmDeleteMap: (title) => `هل أنت متأكد من حذف خريطة "${title}"؟`,
    confirmRestartMap: (title) => `هل تريد إعادة خريطة "${title}" من البداية وتصفير نقاطها (0 / 100)؟`,
    feedbackCorrectCombo: '✓ إجابة صحيحة! 🔥 مكافأة 5x متتالية: ربحت +1 قلب!',
    feedbackCorrect: (score) => `✓ رائع! إجابة صحيحة (نقاط الخريطة: ${score} / 100)`,
    feedbackWrong: (letter) => `✕ خطأ! الإجابة الصحيحة: ${letter}`,
    resultMistakesCleared: 'تمت تصفية الأخطاء!',
    resultMapCompleted: (score) => `اكتملت الخريطة! (${score}/100)`,
    resultStagePassed: 'تم اجتياز المرحلة!',
    resultSurvivedSub: (total, corr) => `أجبت بشكل صحيح على ${corr} من أصل ${total} في هذه المرحلة.`,
    resultGameOverTitle: 'انتهت القلوب!',
    resultGameOverSub: 'تمت إضافة الأسئلة الخاطئة إلى صندوق الأخطاء. حاول مرة أخرى!',
    errEmptyImport: 'يرجى لصق نص الأسئلة أو اختيار ملف.',
    statusPreparing: (sec) => `جارٍ التحضير (${sec} ث)...`,
    statusSolving: '⚡ يتم استخراج الأسئلة وحلها بالتوازي، يرجى الانتظار...',
    defaultMapName: (n) => `خريطة #${n}`
  },
  en: {
    appBrand: 'QUIZOYUN',
    navMistakes: 'Mistakes',
    btnNewMap: '+ New Map / Add Quiz',
    btnResetMap: 'Reset',
    btnQuestions: 'Questions',
    revengeReadyTitle: '💀 Revenge Mode Ready',
    revengeReadyDesc: (n) => `You have <span id="bannerMistakeCount" class="text-white underline">${n}</span> missed questions waiting in this map.`,
    btnCleanMistakes: 'Clear Now',
    badgeSummary: (q, s) => `${q} QUESTIONS • ${s} STAGES`,
    stageTitle: (i, isBoss) => (isBoss ? `Stage ${i} (Boss)` : `Stage ${i}`),
    stageRange: (start, end) => `Questions ${start}-${end}`,
    badgeStart: 'START',
    badgeReplay: 'REPLAY',
    jokerHint: 'Hint',
    jokerHeal: '+1 Life',
    btnContinue: 'CONTINUE',
    btnFinish: 'FINISH',
    btnSeeResult: 'SEE RESULT',
    lblMapScore: 'MAP SCORE',
    lblAccuracy: 'STAGE ACCURACY',
    lblRemainingLives: 'LIVES LEFT',
    btnNextStage: 'NEXT STAGE →',
    btnRestartFullMap: '🔄 RESTART MAP (RESET SCORE TO 0)',
    btnRetryStage: 'RETRY THIS STAGE',
    btnBackToMap: 'BACK TO MAP',
    importModalTitle: 'Create New Map (Add Questions)',
    importModalSub: 'Upload question sets in Turkish, Arabic, or English.',
    importTitlePlaceholder: 'Map / Course Title (e.g. History Midterm, Biology Quiz 1)',
    rawInputPlaceholder: 'Paste your questions here (TR, AR, or EN)...\n\n1. Question text?\nA) Option 1\nB) Option 2\nC) Option 3\nD) Option 4',
    tabPasteText: 'Paste Text',
    tabUploadFile: 'PDF / Word / Image',
    tabJsonBackup: 'JSON Backup',
    lblSelectFile: 'Select PDF, Word (.docx), TXT or Image',
    btnRemoveFile: 'Remove',
    lblAppendMode: 'Do not create new map, append to current map',
    btnCreateMapSubmit: 'BUILD NEW MAP',
    btnAppendMapSubmit: 'APPEND TO CURRENT MAP',
    settingsTitle: '⚙️ Settings & My Maps',
    lblLanguageSection: 'Language / Dil / اللغة',
    lblMyMaps: 'My Maps',
    lblShowHide: '▼ Show / Hide',
    lblShow: '▶ Show',
    lblHide: '▼ Hide',
    lblQuestionsPerStage: 'Questions / Stage',
    optStageAuto: 'Auto (~8-10)',
    optStage5: '5 Questions',
    optStage10: '10 Questions',
    optStage15: '15 Questions',
    optStageAll: 'Single Stage (All)',
    lblStartingLives: 'Starting Lives',
    btnDownloadAll: 'Download Backup',
    btnAddSampleMap: 'Sample Map',
    previewModalTitle: 'Map Question Pool',
    previewModalSub: 'Click any option to mark it as the correct answer.',
    btnResetProgressOnly: 'Reset Progress for This Map',
    btnClose: 'Close',
    btnDelete: 'Delete',
    questionsShort: (n) => `${n} Qs`,
    questionCounter: (title, cur, total) => `${title} • QUESTION ${cur} / ${total}`,
    comboBadge: (n) => `🔥 ${n} STREAK`,
    mistakeModeTitle: 'Mistake Pool',
    noMistakesAlert: 'Your mistake pool for this map is spotless! Zero wrong answers.',
    minOneMapAlert: 'At least 1 map must remain.',
    confirmDeleteMap: (title) => `Are you sure you want to delete "${title}"?`,
    confirmRestartMap: (title) => `Restart "${title}" from the beginning and reset its score to 0 / 100?`,
    feedbackCorrectCombo: '✓ Correct! 🔥 5x Streak Bonus: +1 Life Earned!',
    feedbackCorrect: (score) => `✓ Awesome! Correct Answer (Map Score: ${score} / 100)`,
    feedbackWrong: (letter) => `✕ Wrong! Correct Answer: ${letter}`,
    resultMistakesCleared: 'Mistakes Cleared!',
    resultMapCompleted: (score) => `Map Completed! (${score}/100)`,
    resultStagePassed: 'Stage Passed!',
    resultSurvivedSub: (total, corr) => `You answered ${corr} out of ${total} questions correctly in this stage.`,
    resultGameOverTitle: 'Out of Lives!',
    resultGameOverSub: 'Wrong answers were added to this map\'s Mistake Pool. Try again!',
    errEmptyImport: 'Please paste question text or select a file.',
    statusPreparing: (sec) => `PREPARING (${sec}s)...`,
    statusSolving: '⚡ Extracting and solving questions in parallel, please wait...',
    defaultMapName: (n) => `Map #${n}`
  }
};

// Display transition probe (modern-web-guidance: animate-to-from-top-layer)
let supportsDisplayTransition;
function canTransitionDisplay() {
  if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
  if (!window.CSS?.supports?.('transition-behavior', 'allow-discrete') || !document.body) {
    return false;
  }
  const probe = document.createElement('div');
  probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = 'none';
  supportsDisplayTransition = getComputedStyle(probe).display === 'block';
  probe.remove();
  return supportsDisplayTransition;
}

function supportsTopLayerExit() {
  return window.CSS?.supports?.('overlay', 'auto') && canTransitionDisplay();
}

const DEMO_QUESTIONS = [
  {
    id: 1,
    question: 'Bir işletim sisteminde CPU\'nun bir işlemden (process) diğerine geçerken mevcut durumu kaydetmesi işlemine ne ad verilir?',
    options: ['A) Deadlock (Kilitlenme)', 'B) Context Switch (Bağlam Değiştirme)', 'C) Paging (Sayfalama)', 'D) Spooling'],
    correctAnswer: 1,
    explanation: 'Context Switch, CPU\'nun o anki işlemin durumunu kaydedip yeni işlemin durumunu yüklemesidir.',
    hint: 'Bir bağlamdan (context) diğerine geçişi ifade eden terimi düşün.'
  },
  {
    id: 2,
    question: 'Aşağıdaki veri yapılarından hangisi LIFO (Son Giren İlk Çıkar) prensibiyle çalışır?',
    options: ['A) Queue (Kuyruk)', 'B) Stack (Yığın)', 'C) Linked List (Bağlı Liste)', 'D) Binary Search Tree'],
    correctAnswer: 1,
    explanation: 'Stack (Yığın) veri yapısı LIFO mantığıyla çalışır; en son eklenen eleman ilk çıkarılır.',
    hint: 'Üst üste dizilmiş tabak yığınını hayal et.'
  },
  {
    id: 3,
    question: 'OSI referans modelinde IP adresleme ve yönlendirme (routing) işlemleri hangi katmanda gerçekleşir?',
    options: ['A) Fiziksel Katman', 'B) Veri Bağı Katmanı', 'C) Ağ (Network) Katmanı', 'D) Taşıma (Transport) Katmanı'],
    correctAnswer: 2,
    explanation: 'IP protokolü ve paket yönlendirme (routing) OSI 3. katmanı olan Ağ (Network) katmanında çalışır.',
    hint: 'Router cihazlarının adını aldığı katman.'
  },
  {
    id: 4,
    question: 'İlişkisel veritabanlarında bir tablodaki her satırı benzersiz olarak tanımlayan ve NULL değer alamayan alan hangisidir?',
    options: ['A) Foreign Key', 'B) Primary Key', 'C) Index Key', 'D) Trigger'],
    correctAnswer: 1,
    explanation: 'Primary Key (Birincil Anahtar) kayıtları benzersiz tanımlar ve asla NULL olamaz.',
    hint: 'Birincil derecede önemli anahtar.'
  },
  {
    id: 5,
    question: 'HTTP protokolünde "404 Not Found" durum kodu ne anlama gelir?',
    options: ['A) Sunucu iç hatası oluştu', 'B) İstenen kaynak sunucuda bulunamadı', 'C) Yetkisiz erişim engellendi', 'D) İstek başarıyla tamamlandı'],
    correctAnswer: 1,
    explanation: '404 durum kodu, istemcinin talep ettiği URL/kaynağın sunucuda mevcut olmadığını bildirir.',
    hint: 'Web\'de olmayan bir sayfaya girdiğinde çıkan klasik hata.'
  },
  {
    id: 6,
    question: 'Sıralı bir dizide İkili Arama (Binary Search) algoritmasının en kötü durum zaman karmaşıklığı nedir?',
    options: ['A) O(1)', 'B) O(log n)', 'C) O(n)', 'D) O(n²)'],
    correctAnswer: 1,
    explanation: 'Binary Search her adımda arama uzayını yarıya böldüğü için zaman karmaşıklığı O(log n) olur.',
    hint: 'Uzayı sürekli 2\'ye bölen algoritmaların logaritmik davranışını hatırla.'
  },
  {
    id: 7,
    question: 'Nesne Yönelimli Programlamada (OOP) bir sınıfın iç detaylarını gizleyip dış dünyaya kontrollü arayüz sunması ilkesine ne denir?',
    options: ['A) Polymorphism (Çok Biçimlilik)', 'B) Inheritance (Kalıtım)', 'C) Encapsulation (Kapsülleme)', 'D) Compilation'],
    correctAnswer: 2,
    explanation: 'Encapsulation (Kapsülleme), veriyi ve metotları bir kapsül içinde koruyup gizlemektir.',
    hint: 'Veriyi bir kapsül içine alma işlemi.'
  },
  {
    id: 8,
    question: 'Git versiyon kontrol sisteminde yerel depodaki commit\'leri uzak sunucuya göndermek için hangi komut kullanılır?',
    options: ['A) git pull', 'B) git clone', 'C) git push', 'D) git checkout'],
    correctAnswer: 2,
    explanation: 'git push komutu yerel daldaki (branch) commit\'leri uzak depoya iter.',
    hint: 'İleri doğru itmek anlamına gelen İngilizce fiil.'
  },
  {
    id: 9,
    question: 'Aşağıdakilerden hangisi ilişkisel olmayan (NoSQL) belge tabanlı bir veritabanıdır?',
    options: ['A) PostgreSQL', 'B) MongoDB', 'C) Oracle DB', 'D) Microsoft SQL Server'],
    correctAnswer: 1,
    explanation: 'MongoDB, verileri JSON benzeri BSON belgeleri olarak saklayan popüler bir NoSQL veritabanıdır.',
    hint: 'JSON/BSON dökümanlarıyla ünlü veritabanı.'
  },
  {
    id: 10,
    question: 'TCP ile UDP protokolleri arasındaki en temel fark aşağıdakilerden hangisidir?',
    options: ['A) TCP bağlantı yönelimlidir ve iletim garantisi sunar, UDP bağlantısızdır', 'B) UDP sadece web sayfalarında kullanılır', 'C) TCP şifreleme yapar, UDP yapmaz', 'D) UDP daha yavaştır'],
    correctAnswer: 0,
    explanation: 'TCP el sıkışma ile bağlantı kurar ve paketlerin ulaşmasını garanti eder; UDP hız odaklı ve bağlantısızdır.',
    hint: 'El sıkışma (handshake) ve güvenilirlik farkını düşün.'
  },
  {
    id: 11,
    question: 'SQL\'de gruplanmış veriler (GROUP BY) üzerinde filtreleme yapmak için hangi anahtar kelime kullanılır?',
    options: ['A) WHERE', 'B) HAVING', 'C) ORDER BY', 'D) DISTINCT'],
    correctAnswer: 1,
    explanation: 'WHERE satırları gruplamadan önce filtreler; HAVING ise GROUP BY ile oluşturulmuş grupları filtreler.',
    hint: 'GROUP BY ile ayrılmaz ikili olan filtre komutu.'
  },
  {
    id: 12,
    question: 'İki veya daha fazla işlemin birbirinin elindeki kaynağı bırakmasını sonsuza dek beklemesi durumuna ne denir?',
    options: ['A) Starvation', 'B) Deadlock (Ölümcül Kilitlenme)', 'C) Thrashing', 'D) Fragmentation'],
    correctAnswer: 1,
    explanation: 'Deadlock, işlemlerin döngüsel olarak birbirinin tuttuğu kaynağı beklemesi sonucu hiçbirinin ilerleyememesidir.',
    hint: 'Karşılıklı kilitlenme durumu.'
  },
  {
    id: 13,
    question: 'Web güvenliğinde kullanıcının tarayıcısında zararlı JavaScript kodu çalıştırılması saldırısına ne ad verilir?',
    options: ['A) SQL Injection', 'B) XSS (Cross-Site Scripting)', 'C) DDoS', 'D) Brute Force'],
    correctAnswer: 1,
    explanation: 'XSS, temizlenmemiş kullanıcı girdileri üzerinden sayfaya zararlı script enjekte edilmesidir.',
    hint: 'İçinde "Scripting" geçen kısaltma.'
  },
  {
    id: 14,
    question: 'Docker\'da bir uygulamanın çalışması için gereken kod ve bağımlılıkların paketlendiği salt-okunur şablona ne denir?',
    options: ['A) Docker Image', 'B) Virtual Machine', 'C) Hypervisor', 'D) Kernel'],
    correctAnswer: 0,
    explanation: 'Docker Image, konteynerlerin ayağa kaldırıldığı değiştirilemez (immutable) şablon paketidir.',
    hint: 'Container\'ın kendisinden üretildiği kalıp/görüntü.'
  },
  {
    id: 15,
    question: 'RESTful API mimarisinde sunucudaki mevcut bir kaydı tamamen güncellemek için hangi HTTP metodu kullanılır?',
    options: ['A) GET', 'B) POST', 'C) PUT', 'D) DELETE'],
    correctAnswer: 2,
    explanation: 'GET okuma, POST yeni oluşturma, PUT mevcut kaydı güncelleme, DELETE ise silme için kullanılır.',
    hint: 'Güncelleme (yerine koyma) anlamındaki 3 harfli HTTP metodu.'
  },
  {
    id: 16,
    question: 'RAM\'in yetersiz kaldığı durumlarda diskin bir kısmının RAM gibi kullanılması tekniğine ne ad verilir?',
    options: ['A) Cache Memory', 'B) Virtual Memory (Sanal Bellek)', 'C) Register', 'D) ROM'],
    correctAnswer: 1,
    explanation: 'Sanal Bellek (Virtual Memory), diskteki alanı kullanarak fiziksel RAM\'den daha büyük adres alanı sunar.',
    hint: 'Gerçek fiziksel RAM olmayan, "sanal" bellek.'
  },
  {
    id: 17,
    question: 'Makine öğrenmesinde modelin eğitim verisini aşırı ezberleyip yeni verilerde başarısız olmasına ne denir?',
    options: ['A) Underfitting', 'B) Overfitting (Aşırı Öğrenme)', 'C) Normalization', 'D) Backpropagation'],
    correctAnswer: 1,
    explanation: 'Overfitting, modelin eğitim setini ezberleyip genelleme yeteneğini kaybetmesidir.',
    hint: 'Modele gereğinden "aşırı" (over) uyum sağlama.'
  }
];

class QuizHunterApp {
  constructor() {
    const initialMapId = 'map_demo_1';
    this.store = {
      activeMapId: initialMapId,
      settings: {
        stageSize: 'auto',
        maxLives: 3,
        lang: 'tr'
      },
      maps: [
        {
          id: initialMapId,
          title: 'Örnek: Bilgisayar Müh. (17 Soru)',
          questions: JSON.parse(JSON.stringify(DEMO_QUESTIONS)),
          solvedIds: [],
          mistakeIds: [],
          stageProgress: {}
        }
      ]
    };

    this.stages = [];
    this.currentGame = null;
    this.activeImportTab = 'text';
    this.selectedFile = null;

    this.init();
  }

  get lang() {
    const l = this.store.settings?.lang;
    return l === 'ar' || l === 'en' ? l : 'tr';
  }

  get t() {
    return I18N[this.lang] || I18N.tr;
  }

  get activeMap() {
    let found = this.store.maps.find((m) => m.id === this.store.activeMapId);
    if (!found && this.store.maps.length > 0) {
      found = this.store.maps[0];
      this.store.activeMapId = found.id;
    }
    if (found && !Array.isArray(found.solvedIds)) {
      found.solvedIds = [];
    }
    return found;
  }

  getMapScore(map) {
    if (!map || !Array.isArray(map.questions) || map.questions.length === 0) return 0;
    const validIds = new Set(map.questions.map((q) => q.id));
    const solved = (map.solvedIds || []).filter((id) => validIds.has(id));
    return Math.min(100, Math.round((solved.length / map.questions.length) * 100));
  }

  init() {
    this.loadFromStorage();
    this.setupDialogFallbacks();
    this.setupKeyboardShortcuts();
    this.applyTranslations();
    this.syncSettingsUI();
    this.recalculateStages();
    this.renderDashboard();
  }

  // modern-web-guidance: dialog & animate-to-from-top-layer fallbacks
  setupDialogFallbacks() {
    const outside = (e, dialog) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };

    const dialogs = document.querySelectorAll('dialog[closedby="any"]');
    dialogs.forEach((dialog) => {
      if (!('closedBy' in HTMLDialogElement.prototype)) {
        let pressedOutside = false;
        dialog.addEventListener('pointerdown', (e) => {
          pressedOutside = outside(e, dialog);
        });
        dialog.addEventListener('pointerup', (e) => {
          if (pressedOutside && outside(e, dialog)) {
            this.closeTopLayer(dialog);
          }
        });
      }

      dialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        this.closeTopLayer(dialog);
      });
    });
  }

  async closeTopLayer(element) {
    if (!element || !element.open) return;
    if (!supportsTopLayerExit()) {
      element.setAttribute('data-closing', '');
      const animations = element.getAnimations({ subtree: true });
      if (animations.length > 0) {
        await Promise.race([
          Promise.allSettled(animations.map((a) => a.finished)),
          new Promise((r) => setTimeout(r, 400))
        ]);
      }
      if (!element.hasAttribute('data-closing')) return;
      element.removeAttribute('data-closing');
    }
    element.close();
  }

  closeDialog(dialogId) {
    const dlg = document.getElementById(dialogId);
    if (dlg) this.closeTopLayer(dlg);
  }

  setLanguage(newLang) {
    if (!['tr', 'ar', 'en'].includes(newLang)) return;
    this.store.settings.lang = newLang;
    this.saveToStorage();
    this.applyTranslations();
    this.recalculateStages();
    this.renderDashboard();
    if (this.currentGame && !document.getElementById('screenGame').classList.contains('hidden')) {
      this.renderCurrentQuestion();
    }
  }

  applyTranslations() {
    const lang = this.lang;
    const dict = this.t;

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    // Dil butonlarının aktiflik durumu
    ['tr', 'ar', 'en'].forEach((code) => {
      const btn = document.getElementById(`langBtn_${code}`);
      if (btn) {
        btn.className = `btn-3d ${
          code === lang ? 'btn-green' : 'btn-neutral'
        } py-2.5 px-2 rounded-xl font-black text-xs flex flex-col items-center gap-0.5`;
      }
    });

    // Tüm data-i18n etiketlerini çevir
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key && typeof dict[key] === 'string') {
        el.textContent = normalizeDigits(dict[key]);
      }
    });

    const titleInput = document.getElementById('importQuizTitle');
    if (titleInput) titleInput.placeholder = dict.importTitlePlaceholder;

    const rawInput = document.getElementById('rawQuestionInput');
    if (rawInput) rawInput.placeholder = dict.rawInputPlaceholder;

    const appendCb = document.getElementById('appendModeCheckbox');
    const submitSpan = document.querySelector('#parseSubmitBtn span');
    if (submitSpan && appendCb) {
      submitSpan.textContent = appendCb.checked ? dict.btnAppendMapSubmit : dict.btnCreateMapSubmit;
    }
  }

  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      const openDialog = document.querySelector('dialog[open]');
      if (openDialog) return;
      if (!this.currentGame) return;

      const gameScreenVisible = !document.getElementById('screenGame').classList.contains('hidden');
      if (!gameScreenVisible) return;

      const key = e.key.toUpperCase();
      if (!this.currentGame.answered) {
        const keyMap = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, A: 0, B: 1, C: 2, D: 3, E: 4 };
        if (key in keyMap) {
          const idx = keyMap[key];
          const q = this.currentGame.questions[this.currentGame.currentIndex];
          if (q && idx < q.options.length) {
            const btn = document.querySelector(`#optionsContainer button[data-index="${idx}"]`);
            if (btn && !btn.disabled) {
              this.selectAnswer(idx);
            }
          }
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.nextQuestion();
      }
    });
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.maps) && parsed.maps.length > 0) {
          // Kayıtlı tüm sorularda Doğu Arap rakamları varsa 0-9'a temizle
          parsed.maps.forEach((m) => {
            m.title = normalizeDigits(m.title);
            if (Array.isArray(m.questions)) {
              m.questions.forEach((q) => {
                q.question = normalizeDigits(q.question);
                q.options = (q.options || []).map((o) => normalizeDigits(o));
                q.explanation = normalizeDigits(q.explanation);
                q.hint = normalizeDigits(q.hint);
              });
            }
          });
          this.store = {
            ...this.store,
            ...parsed,
            settings: { ...this.store.settings, ...(parsed.settings || {}) }
          };
        }
      }
    } catch (e) {
      console.warn('LocalStorage okunamadı:', e);
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.store));
    } catch (e) {
      console.warn('LocalStorage kaydedilemedi:', e);
    }
  }

  syncSettingsUI() {
    const stageSel = document.getElementById('stageSizeSelect');
    const livesSel = document.getElementById('maxLivesSelect');
    if (stageSel) stageSel.value = String(this.store.settings.stageSize || 'auto');
    if (livesSel) livesSel.value = String(this.store.settings.maxLives || 3);

    const appendCb = document.getElementById('appendModeCheckbox');
    if (appendCb) {
      appendCb.onchange = () => {
        const btnSpan = document.querySelector('#parseSubmitBtn span');
        if (btnSpan) {
          btnSpan.textContent = appendCb.checked ? this.t.btnAppendMapSubmit : this.t.btnCreateMapSubmit;
        }
      };
    }
  }

  updateSettings() {
    const stageSel = document.getElementById('stageSizeSelect');
    const livesSel = document.getElementById('maxLivesSelect');
    this.store.settings.stageSize = stageSel.value;
    this.store.settings.maxLives = parseInt(livesSel.value, 10) || 3;
    this.recalculateStages();
    this.saveToStorage();
    this.renderDashboard();
  }

  switchMap(mapId) {
    if (this.store.maps.some((m) => m.id === mapId)) {
      this.store.activeMapId = mapId;
      this.recalculateStages();
      this.saveToStorage();
      this.renderDashboard();
      this.closeDialog('settingsDialog');
    }
  }

  toggleMapsListInSettings() {
    const bar = document.getElementById('mapSwitcherBar');
    const arrow = document.getElementById('mapsAccordionArrow');
    if (!bar) return;
    const isHidden = bar.classList.toggle('hidden');
    if (arrow) {
      arrow.textContent = isHidden ? this.t.lblShow : this.t.lblHide;
    }
  }

  deleteMapById(mapId, event) {
    if (event) event.stopPropagation();
    if (this.store.maps.length <= 1) {
      alert(this.t.minOneMapAlert);
      return;
    }
    const target = this.store.maps.find((m) => m.id === mapId);
    if (!target) return;
    if (!confirm(this.t.confirmDeleteMap(target.title))) return;

    this.store.maps = this.store.maps.filter((m) => m.id !== mapId);
    if (this.store.activeMapId === mapId) {
      this.store.activeMapId = this.store.maps[0].id;
    }
    this.recalculateStages();
    this.saveToStorage();
    this.renderDashboard();
  }

  restartActiveMap(skipConfirm = false) {
    const map = this.activeMap;
    if (!map) return;
    if (!skipConfirm && !confirm(this.t.confirmRestartMap(map.title))) {
      return;
    }
    map.solvedIds = [];
    map.stageProgress = {};
    map.mistakeIds = [];
    this.recalculateStages();
    this.saveToStorage();
    this.showScreen('dashboard');
  }

  recalculateStages() {
    const map = this.activeMap;
    if (!map) return;

    const questions = map.questions || [];
    const total = questions.length;
    this.stages = [];

    if (total === 0) return;

    const mode = this.store.settings.stageSize;
    let numStages = 1;

    if (mode === 'all') {
      numStages = 1;
    } else if (mode === 'auto') {
      if (total <= 10) numStages = 1;
      else numStages = Math.max(2, Math.round(total / 9));
    } else {
      const fixedSize = parseInt(mode, 10) || 10;
      numStages = Math.max(1, Math.ceil(total / fixedSize));
    }

    const baseSize = Math.floor(total / numStages);
    const remainder = total % numStages;

    let currentIdx = 0;
    for (let i = 0; i < numStages; i++) {
      const count = baseSize + (i < remainder ? 1 : 0);
      const slice = questions.slice(currentIdx, currentIdx + count);
      const startNum = currentIdx + 1;
      const endNum = currentIdx + count;

      const prevProg = i > 0 ? map.stageProgress[i - 1] : null;
      const currentProg = map.stageProgress[i] || {
        unlocked: i === 0,
        completed: false,
        stars: 0,
        bestScore: 0
      };

      if (i === 0 || (prevProg && prevProg.completed)) {
        currentProg.unlocked = true;
      }

      map.stageProgress[i] = currentProg;

      const isBoss = i === numStages - 1 && numStages > 1;
      this.stages.push({
        index: i,
        title: normalizeDigits(this.t.stageTitle(i + 1, isBoss)),
        rangeText: normalizeDigits(this.t.stageRange(startNum, endNum)),
        questions: slice,
        progress: currentProg
      });

      currentIdx += count;
    }
  }

  renderDashboard() {
    const map = this.activeMap;
    if (!map) return;

    const currentMapScore = this.getMapScore(map);
    document.getElementById('navTotalScore').textContent = `${currentMapScore} / 100`;

    // Yan Çekmece (Ayarlar) içindeki Haritalarım Listesi
    const switcher = document.getElementById('mapSwitcherBar');
    if (switcher) {
      switcher.innerHTML = '';
      const countLabel = document.getElementById('mapsCountLabel');
      if (countLabel) countLabel.textContent = `${this.store.maps.length}`;

      this.store.maps.forEach((m) => {
        const isActive = m.id === map.id;
        const mScore = this.getMapScore(m);
        const row = document.createElement('div');
        row.onclick = () => this.switchMap(m.id);
        row.className = `btn-3d w-full px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center justify-between gap-2 cursor-pointer ${
          isActive ? 'btn-green' : 'btn-neutral'
        }`;

        const delBtnHtml =
          this.store.maps.length > 1
            ? `<button type="button" onclick="app.deleteMapById('${m.id}', event)" class="px-2 py-1 rounded-lg bg-black/25 hover:bg-[#ff4b4b] text-white text-[11px]" title="${this.t.btnDelete}">🗑️</button>`
            : '';

        row.innerHTML = `
          <div class="flex items-center gap-2 truncate">
            <span>${isActive ? '🟢' : '🗺️'}</span>
            <span class="truncate">${this.escapeHtml(normalizeDigits(m.title))}</span>
          </div>
          <div class="flex items-center gap-1.5 shrink-0" dir="ltr">
            <span class="px-2 py-0.5 rounded-md text-[10px] font-black ${
              isActive ? 'bg-black/25 text-[#ffc800]' : 'bg-[#131f24] text-[#ffc800]'
            }">⚡ ${mScore}/100</span>
            <span class="px-2 py-0.5 rounded-md text-[10px] ${
              isActive ? 'bg-black/25 text-white' : 'bg-[#131f24] text-slate-400'
            }">${normalizeDigits(this.t.questionsShort(m.questions.length))}</span>
            ${delBtnHtml}
          </div>
        `;
        switcher.appendChild(row);
      });
    }

    const validIds = new Set(map.questions.map((q) => q.id));
    map.mistakeIds = (map.mistakeIds || []).filter((id) => validIds.has(id));
    const mistakeCount = map.mistakeIds.length;

    document.getElementById('navMistakeCount').textContent = `${mistakeCount}`;
    const mistakeBanner = document.getElementById('mistakeBanner');
    if (mistakeCount > 0) {
      mistakeBanner.classList.remove('hidden');
      const descEl = document.getElementById('mistakeBannerDesc');
      if (descEl) {
        descEl.innerHTML = normalizeDigits(this.t.revengeReadyDesc(mistakeCount));
      }
    } else {
      mistakeBanner.classList.add('hidden');
    }

    const totalQ = map.questions.length;
    const totalS = this.stages.length;

    document.getElementById('activeQuizTitle').textContent = normalizeDigits(map.title || 'Quiz Map');
    document.getElementById('activeQuizBadge').textContent = normalizeDigits(this.t.badgeSummary(totalQ, totalS));

    // Oyun Patikası (Kıvrımlı Dikey Yol - Rakamlar her zaman 1, 2, 3...)
    const grid = document.getElementById('stageGrid');
    grid.innerHTML = '';

    const activeStageIdx = this.stages.findIndex((s) => s.progress.unlocked && !s.progress.completed);
    const offsets = ['translate-x-0', '-translate-x-10', 'translate-x-0', 'translate-x-10'];

    this.stages.forEach((stage, idx) => {
      const { unlocked, completed, stars } = stage.progress;
      const isCurrent = idx === activeStageIdx || (activeStageIdx === -1 && idx === 0);
      const offsetClass = offsets[idx % offsets.length];

      const wrapper = document.createElement('div');
      wrapper.className = `flex flex-col items-center relative ${offsetClass}`;

      let nodeClass = 'stage-node-locked';
      let iconText = `${idx + 1}`;
      if (completed) {
        nodeClass = 'stage-node-unlocked';
        iconText = '✓';
      } else if (unlocked) {
        nodeClass = 'stage-node-current';
      }

      let starsHtml = '';
      for (let s = 1; s <= 3; s++) {
        starsHtml += `<span class="${s <= stars ? 'text-[#ffc800]' : 'text-[#23363f]'} text-lg">★</span>`;
      }

      const startTooltip =
        isCurrent && unlocked
          ? `<div class="bounce-badge mb-2 px-3 py-1 rounded-xl bg-white text-[#131f24] font-black text-xs uppercase tracking-wider shadow-lg">
              ${completed ? this.t.badgeReplay : this.t.badgeStart}
            </div>`
          : '';

      wrapper.innerHTML = `
        ${startTooltip}
        <button type="button" class="stage-node ${nodeClass}" dir="ltr" ${!unlocked ? 'disabled' : ''}>
          <span>${iconText}</span>
        </button>
        <div class="flex items-center gap-1 mt-1.5" dir="ltr">${starsHtml}</div>
        <div class="text-xs font-extrabold text-slate-300 mt-0.5">${stage.title}</div>
        <div class="text-[11px] font-bold text-slate-500">${stage.rangeText}</div>
      `;

      const btn = wrapper.querySelector('button');
      if (unlocked) {
        btn.onclick = () => this.startStage(stage.index);
      }

      grid.appendChild(wrapper);
    });
  }

  showScreen(screenName) {
    document.getElementById('mainHeader').classList.toggle('hidden', screenName === 'game');
    document.getElementById('screenDashboard').classList.add('hidden');
    document.getElementById('screenGame').classList.add('hidden');
    document.getElementById('screenResult').classList.add('hidden');

    if (screenName === 'dashboard') {
      this.recalculateStages();
      this.renderDashboard();
      document.getElementById('screenDashboard').classList.remove('hidden');
    } else if (screenName === 'game') {
      document.getElementById('screenGame').classList.remove('hidden');
    } else if (screenName === 'result') {
      document.getElementById('screenResult').classList.remove('hidden');
    }
  }

  startStage(stageIndex) {
    const stage = this.stages[stageIndex];
    if (!stage) return;

    const maxLives = parseInt(this.store.settings.maxLives, 10) || 3;
    this.currentGame = {
      mode: 'stage',
      stageIndex,
      title: stage.title,
      questions: [...stage.questions],
      currentIndex: 0,
      lives: maxLives,
      maxLives,
      score: 0,
      combo: 0,
      correctCount: 0,
      answered: false,
      jokers: { fifty: 1, hint: 1, heal: 1 }
    };

    this.showScreen('game');
    this.renderCurrentQuestion();
  }

  startMistakeMode() {
    const map = this.activeMap;
    const mistakeQuestions = map.questions.filter((q) =>
      map.mistakeIds.includes(q.id)
    );

    if (mistakeQuestions.length === 0) {
      alert(this.t.noMistakesAlert);
      return;
    }

    const maxLives = parseInt(this.store.settings.maxLives, 10) || 3;
    this.currentGame = {
      mode: 'mistake',
      stageIndex: null,
      title: this.t.mistakeModeTitle,
      questions: mistakeQuestions,
      currentIndex: 0,
      lives: maxLives,
      maxLives,
      score: 0,
      combo: 0,
      correctCount: 0,
      answered: false,
      jokers: { fifty: 1, hint: 1, heal: 1 }
    };

    this.showScreen('game');
    this.renderCurrentQuestion();
  }

  renderCurrentQuestion() {
    const g = this.currentGame;
    if (!g) return;

    const q = g.questions[g.currentIndex];
    g.answered = false;

    const stageTitle =
      g.mode === 'mistake'
        ? this.t.mistakeModeTitle
        : this.stages[g.stageIndex]?.title || g.title;

    document.getElementById('gameQuestionCounter').textContent = normalizeDigits(
      this.t.questionCounter(stageTitle, g.currentIndex + 1, g.questions.length)
    );

    const progressPct = Math.round((g.currentIndex / g.questions.length) * 100);
    document.getElementById('gameProgressBar').style.width = `${Math.max(8, progressPct)}%`;

    this.renderLives();
    this.renderCombo();
    this.renderJokers();

    document.getElementById('hintBox').classList.add('hidden');
    document.getElementById('feedbackPanel').classList.add('hidden');

    // Akıllı Soru Kartı Yönü (Auto-RTL / Auto-LTR)
    const qText = normalizeDigits(q.question);
    const questionIsArabic = isArabicText(qText) || q.options.some((o) => isArabicText(o));
    const qCard = document.getElementById('questionCard');
    if (qCard) {
      qCard.dir = questionIsArabic ? 'rtl' : 'ltr';
    }

    const qEl = document.getElementById('questionText');
    qEl.textContent = qText;
    qEl.className = `text-xl sm:text-2xl font-extrabold text-white leading-snug ${
      questionIsArabic ? 'text-right' : 'text-left'
    }`;

    const optsWrap = document.getElementById('optionsContainer');
    optsWrap.innerHTML = '';

    q.options.forEach((optText, idx) => {
      const cleanText = normalizeDigits(optText).replace(/^(?:\(?([A-Ea-e]|هـ|[أابجدهتث])[\.\)\-\:،])\s*/, '');
      const letter = String.fromCharCode(65 + idx);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.index = idx;
      btn.dir = questionIsArabic ? 'rtl' : 'ltr';
      btn.className = `btn-3d btn-neutral w-full ${
        questionIsArabic ? 'text-right' : 'text-left'
      } p-4 rounded-2xl font-extrabold text-base flex items-center gap-3.5`;

      btn.innerHTML = `
        <span class="w-8 h-8 rounded-xl border-2 border-[#334e5a] flex items-center justify-center text-xs font-black text-slate-300 shrink-0" dir="ltr">
          ${letter}
        </span>
        <span class="leading-snug flex-1">${this.escapeHtml(cleanText)}</span>
      `;

      btn.onclick = () => this.selectAnswer(idx);
      optsWrap.appendChild(btn);
    });
  }

  renderLives() {
    const g = this.currentGame;
    const container = document.getElementById('gameLivesContainer');
    container.innerHTML = `<span>❤️</span> <span>${g.lives}</span>`;
  }

  renderCombo() {
    const g = this.currentGame;
    const badge = document.getElementById('comboBadge');
    if (g.combo >= 2) {
      badge.textContent = normalizeDigits(this.t.comboBadge(g.combo));
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  renderJokers() {
    const g = this.currentGame;
    document.getElementById('joker50Btn').disabled = g.jokers.fifty <= 0 || g.answered;
    document.getElementById('jokerHintBtn').disabled = g.jokers.hint <= 0 || g.answered;
    document.getElementById('jokerHealBtn').disabled = g.jokers.heal <= 0 || g.answered;
  }

  useJoker50() {
    const g = this.currentGame;
    if (!g || g.answered || g.jokers.fifty <= 0) return;

    const q = g.questions[g.currentIndex];
    const wrongIndices = q.options
      .map((_, idx) => idx)
      .filter((idx) => idx !== q.correctAnswer);

    wrongIndices.sort(() => Math.random() - 0.5);
    const toEliminate = wrongIndices.slice(0, Math.min(2, wrongIndices.length));

    const buttons = document.querySelectorAll('#optionsContainer button');
    buttons.forEach((btn) => {
      const idx = parseInt(btn.dataset.index, 10);
      if (toEliminate.includes(idx)) {
        btn.disabled = true;
        btn.classList.add('opacity-25', 'line-through');
      }
    });

    g.jokers.fifty--;
    this.renderJokers();
  }

  useJokerHint() {
    const g = this.currentGame;
    if (!g || g.answered || g.jokers.hint <= 0) return;

    const q = g.questions[g.currentIndex];
    const hintStr = normalizeDigits(q.hint || '');
    const hintBox = document.getElementById('hintBox');
    hintBox.dir = isArabicText(hintStr) ? 'rtl' : this.lang === 'ar' ? 'rtl' : 'ltr';
    document.getElementById('hintText').textContent = hintStr;
    hintBox.classList.remove('hidden');

    g.jokers.hint--;
    this.renderJokers();
  }

  useJokerHeal() {
    const g = this.currentGame;
    if (!g || g.answered || g.jokers.heal <= 0) return;

    g.lives++;
    g.jokers.heal--;
    this.renderLives();
    this.renderJokers();
  }

  selectAnswer(selectedIndex) {
    const g = this.currentGame;
    const map = this.activeMap;
    if (!g || g.answered || !map) return;
    g.answered = true;

    const q = g.questions[g.currentIndex];
    const isCorrect = selectedIndex === q.correctAnswer;
    const questionIsArabic = isArabicText(q.question) || q.options.some((o) => isArabicText(o));
    const alignClass = questionIsArabic ? 'text-right' : 'text-left';

    const buttons = document.querySelectorAll('#optionsContainer button');
    buttons.forEach((btn) => {
      btn.disabled = true;
      const idx = parseInt(btn.dataset.index, 10);

      if (idx === q.correctAnswer) {
        btn.className = `btn-3d btn-green w-full ${alignClass} p-4 rounded-2xl font-black text-base flex items-center gap-3.5`;
      } else if (idx === selectedIndex && !isCorrect) {
        btn.className = `btn-3d btn-red w-full ${alignClass} p-4 rounded-2xl font-black text-base flex items-center gap-3.5 animate-shake`;
      } else {
        btn.classList.add('opacity-40');
      }
    });

    let comboBonusHeart = false;

    if (isCorrect) {
      g.combo++;
      g.correctCount++;

      if (!Array.isArray(map.solvedIds)) map.solvedIds = [];
      if (!map.solvedIds.includes(q.id)) {
        map.solvedIds.push(q.id);
      }

      if (g.combo > 0 && g.combo % 5 === 0 && g.lives < g.maxLives) {
        g.lives++;
        comboBonusHeart = true;
      }

      if (map.mistakeIds.includes(q.id)) {
        map.mistakeIds = map.mistakeIds.filter((id) => id !== q.id);
      }
    } else {
      g.combo = 0;
      g.lives = Math.max(0, g.lives - 1);

      if (Array.isArray(map.solvedIds) && map.solvedIds.includes(q.id)) {
        map.solvedIds = map.solvedIds.filter((id) => id !== q.id);
      }

      if (!map.mistakeIds.includes(q.id)) {
        map.mistakeIds.push(q.id);
      }
    }

    const progressPct = Math.round(((g.currentIndex + 1) / g.questions.length) * 100);
    document.getElementById('gameProgressBar').style.width = `${progressPct}%`;

    this.saveToStorage();
    const updatedMapScore = this.getMapScore(map);
    document.getElementById('navTotalScore').textContent = `${updatedMapScore} / 100`;
    this.renderLives();
    this.renderCombo();
    this.renderJokers();

    const feedbackPanel = document.getElementById('feedbackPanel');
    const feedbackTitle = document.getElementById('feedbackTitle');
    const feedbackExplanation = document.getElementById('feedbackExplanation');
    const nextBtn = document.getElementById('nextQuestionBtn');

    feedbackPanel.classList.remove('hidden');

    if (isCorrect) {
      feedbackPanel.className = 'rounded-2xl p-5 border-2 border-[#58cc02] bg-[#162e14] space-y-3';
      feedbackTitle.className = 'text-lg font-black text-[#58cc02]';
      feedbackTitle.textContent = normalizeDigits(
        comboBonusHeart ? this.t.feedbackCorrectCombo : this.t.feedbackCorrect(updatedMapScore)
      );
      nextBtn.className = 'btn-3d btn-green px-7 py-3 rounded-2xl font-black text-sm uppercase tracking-wider shrink-0';
    } else {
      feedbackPanel.className = 'rounded-2xl p-5 border-2 border-[#ff4b4b] bg-[#2e1619] space-y-3';
      feedbackTitle.className = 'text-lg font-black text-[#ff4b4b]';
      const rightLetter = String.fromCharCode(65 + q.correctAnswer);
      feedbackTitle.textContent = normalizeDigits(this.t.feedbackWrong(rightLetter));
      nextBtn.className = 'btn-3d btn-red px-7 py-3 rounded-2xl font-black text-sm uppercase tracking-wider shrink-0';
    }

    const expText = normalizeDigits(q.explanation || '');
    feedbackExplanation.textContent = expText;
    feedbackExplanation.dir = isArabicText(expText) ? 'rtl' : 'ltr';

    if (g.lives <= 0) {
      nextBtn.querySelector('span').textContent = this.t.btnSeeResult;
    } else if (g.currentIndex >= g.questions.length - 1) {
      nextBtn.querySelector('span').textContent = this.t.btnFinish;
    } else {
      nextBtn.querySelector('span').textContent = this.t.btnContinue;
    }
  }

  nextQuestion() {
    const g = this.currentGame;
    if (!g) return;

    if (g.lives <= 0) {
      this.finishStage(false);
      return;
    }

    if (g.currentIndex < g.questions.length - 1) {
      g.currentIndex++;
      this.renderCurrentQuestion();
    } else {
      this.finishStage(true);
    }
  }

  finishStage(survived) {
    const g = this.currentGame;
    const map = this.activeMap;
    if (!g || !map) return;

    const totalQ = g.questions.length;
    const accuracy = totalQ > 0 ? Math.round((g.correctCount / totalQ) * 100) : 0;
    const mapScore = this.getMapScore(map);

    let stars = 0;
    if (survived) {
      if (accuracy >= 90 && g.lives >= g.maxLives) stars = 3;
      else if (accuracy >= 75) stars = 2;
      else stars = 1;
    }

    if (g.mode === 'stage' && g.stageIndex !== null) {
      const prog = map.stageProgress[g.stageIndex] || {
        unlocked: true,
        completed: false,
        stars: 0,
        bestScore: 0
      };

      if (survived) {
        prog.completed = true;
        prog.stars = Math.max(prog.stars || 0, stars);
        prog.bestScore = mapScore;

        if (g.stageIndex + 1 < this.stages.length) {
          const nextIdx = g.stageIndex + 1;
          map.stageProgress[nextIdx] = {
            ...(map.stageProgress[nextIdx] || { completed: false, stars: 0, bestScore: 0 }),
            unlocked: true
          };
        }
      }

      map.stageProgress[g.stageIndex] = prog;
      this.saveToStorage();
    }

    this.showScreen('result');

    const titleEl = document.getElementById('resultTitle');
    const subEl = document.getElementById('resultSubtitle');
    const starsWrap = document.getElementById('resultStars');
    const nextStageBtn = document.getElementById('resultNextStageBtn');
    const restartMapBtn = document.getElementById('resultRestartMapBtn');

    document.getElementById('resultScore').textContent = `${mapScore} / 100`;
    document.getElementById('resultAccuracy').textContent = `%${accuracy}`;
    document.getElementById('resultRemainingLives').textContent = `${g.lives}`;

    starsWrap.innerHTML = '';
    for (let s = 1; s <= 3; s++) {
      starsWrap.innerHTML += `<span class="${s <= stars ? 'text-[#ffc800]' : 'text-[#23363f]'}">★</span>`;
    }

    if (survived) {
      const isFinalStage = g.mode === 'stage' && g.stageIndex === this.stages.length - 1;
      titleEl.textContent = normalizeDigits(
        g.mode === 'mistake'
          ? this.t.resultMistakesCleared
          : isFinalStage
          ? this.t.resultMapCompleted(mapScore)
          : this.t.resultStagePassed
      );
      subEl.textContent = normalizeDigits(this.t.resultSurvivedSub(totalQ, g.correctCount));

      if (window.confetti) {
        window.confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      }

      if (g.mode === 'stage' && g.stageIndex + 1 < this.stages.length) {
        nextStageBtn.classList.remove('hidden');
        if (restartMapBtn) restartMapBtn.classList.add('hidden');
      } else {
        nextStageBtn.classList.add('hidden');
        if (restartMapBtn) restartMapBtn.classList.remove('hidden');
      }
    } else {
      titleEl.textContent = this.t.resultGameOverTitle;
      subEl.textContent = this.t.resultGameOverSub;
      nextStageBtn.classList.add('hidden');
      if (restartMapBtn) restartMapBtn.classList.add('hidden');
    }
  }

  retryCurrentStage() {
    if (!this.currentGame) return;
    if (this.currentGame.mode === 'mistake') {
      this.startMistakeMode();
    } else {
      this.startStage(this.currentGame.stageIndex);
    }
  }

  playNextStage() {
    if (!this.currentGame || this.currentGame.mode !== 'stage') return;
    const nextIdx = this.currentGame.stageIndex + 1;
    if (nextIdx < this.stages.length) {
      this.startStage(nextIdx);
    }
  }

  quitStage() {
    this.showScreen('dashboard');
  }

  // ================= MODALLAR & YAN ÇEKMECE =================

  openImportModal() {
    document.getElementById('importStatusBox').classList.add('hidden');
    document.getElementById('appendModeCheckbox').checked = false;
    const btnSpan = document.querySelector('#parseSubmitBtn span');
    if (btnSpan) btnSpan.textContent = this.t.btnCreateMapSubmit;
    document.getElementById('importDialog').showModal();
  }

  openSettingsModal() {
    this.syncSettingsUI();
    this.renderDashboard();
    document.getElementById('settingsDialog').showModal();
  }

  switchImportTab(tab) {
    this.activeImportTab = tab;
    const tabs = ['text', 'file', 'json'];
    tabs.forEach((t) => {
      const cap = t.charAt(0).toUpperCase() + t.slice(1);
      const btn = document.getElementById(`tabBtn${cap}`);
      const panel = document.getElementById(`importTab${cap}`);
      if (t === tab) {
        btn.className = 'btn-3d btn-blue py-2 rounded-xl font-extrabold text-xs uppercase';
        panel.classList.remove('hidden');
      } else {
        btn.className = 'btn-3d btn-neutral py-2 rounded-xl font-extrabold text-xs uppercase';
        panel.classList.add('hidden');
      }
    });
  }

  onFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;
    this.selectedFile = file;
    document.getElementById('selectedFileBadge').classList.remove('hidden');
    document.getElementById('selectedFileName').textContent = `📎 ${normalizeDigits(file.name)}`;
  }

  clearSelectedFile() {
    this.selectedFile = null;
    document.getElementById('fileUploadInput').value = '';
    document.getElementById('selectedFileBadge').classList.add('hidden');
  }

  async submitParse() {
    const statusBox = document.getElementById('importStatusBox');
    const submitBtn = document.getElementById('parseSubmitBtn');
    const customTitle = normalizeDigits(document.getElementById('importQuizTitle').value.trim());
    const appendMode = document.getElementById('appendModeCheckbox').checked;
    const rawText = normalizeDigits(document.getElementById('rawQuestionInput').value.trim());
    const fileInputEl = document.getElementById('fileUploadInput');
    const fileToSend = this.selectedFile || (fileInputEl && fileInputEl.files && fileInputEl.files[0]);

    if (!rawText && !fileToSend) {
      statusBox.className = 'rounded-xl p-3 text-xs font-bold bg-[#2e1619] border-2 border-[#ff4b4b] text-[#ff4b4b]';
      statusBox.textContent = this.t.errEmptyImport;
      statusBox.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    let sec = 0;
    submitBtn.querySelector('span').textContent = normalizeDigits(this.t.statusPreparing(0));

    statusBox.className = 'rounded-xl p-3 text-xs font-bold bg-[#131f24] border-2 border-[#1cb0f6] text-[#1cb0f6]';
    statusBox.textContent = this.t.statusSolving;
    statusBox.classList.remove('hidden');

    const timer = setInterval(() => {
      sec++;
      submitBtn.querySelector('span').textContent = normalizeDigits(this.t.statusPreparing(sec));
    }, 1000);

    try {
      const formData = new FormData();
      formData.append('lang', this.lang);
      if (rawText) formData.append('text', rawText);
      if (fileToSend) formData.append('file', fileToSend);

      const response = await fetch('/api/parse', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error');
      }

      const incomingQuestions = (data.questions || []).map((q) => ({
        ...q,
        question: normalizeDigits(q.question),
        options: (q.options || []).map((o) => normalizeDigits(o)),
        explanation: normalizeDigits(q.explanation),
        hint: normalizeDigits(q.hint)
      }));

      if (incomingQuestions.length === 0) {
        throw new Error('No multiple-choice questions found.');
      }

      if (appendMode && this.activeMap) {
        const map = this.activeMap;
        const startId = map.questions.length;
        const reindexed = incomingQuestions.map((q, i) => ({ ...q, id: startId + i + 1 }));
        map.questions = [...map.questions, ...reindexed];
        if (customTitle) map.title = customTitle;
      } else {
        const newMapId = `map_${Date.now()}`;
        const mapNumber = this.store.maps.length + 1;
        const defaultTitle =
          customTitle ||
          (data.title ? normalizeDigits(data.title) : this.t.defaultMapName(mapNumber));

        const newMap = {
          id: newMapId,
          title: defaultTitle,
          questions: incomingQuestions.map((q, i) => ({ ...q, id: i + 1 })),
          solvedIds: [],
          mistakeIds: [],
          stageProgress: {}
        };

        this.store.maps.push(newMap);
        this.store.activeMapId = newMapId;
      }

      this.recalculateStages();
      this.saveToStorage();
      this.renderDashboard();

      document.getElementById('rawQuestionInput').value = '';
      document.getElementById('importQuizTitle').value = '';
      this.clearSelectedFile();
      this.closeDialog('importDialog');
    } catch (err) {
      statusBox.className = 'rounded-xl p-3 text-xs font-bold bg-[#2e1619] border-2 border-[#ff4b4b] text-[#ff4b4b]';
      statusBox.textContent = normalizeDigits(err.message);
    } finally {
      clearInterval(timer);
      submitBtn.disabled = false;
      submitBtn.querySelector('span').textContent = appendMode
        ? this.t.btnAppendMapSubmit
        : this.t.btnCreateMapSubmit;
    }
  }

  openPreviewModal() {
    const map = this.activeMap;
    if (!map) return;

    const container = document.getElementById('previewListContainer');
    container.innerHTML = '';

    map.questions.forEach((q, qIdx) => {
      const qIsAr = isArabicText(q.question) || q.options.some((o) => isArabicText(o));
      const item = document.createElement('div');
      item.dir = qIsAr ? 'rtl' : 'ltr';
      item.className = 'p-4 rounded-2xl bg-[#131f24] border-2 border-[#2c424d] space-y-2.5';

      const optsHtml = q.options
        .map((opt, oIdx) => {
          const isRight = oIdx === q.correctAnswer;
          return `<button type="button" onclick="app.changeCorrectAnswer(${qIdx}, ${oIdx})" class="text-start px-3 py-2 rounded-xl text-xs font-bold border-2 transition ${
            isRight
              ? 'bg-[#162e14] border-[#58cc02] text-[#58cc02]'
              : 'bg-[#1b2b32] border-[#2c424d] text-slate-300'
          }">
            ${this.escapeHtml(normalizeDigits(opt))} ${isRight ? '✓' : ''}
          </button>`;
        })
        .join('');

      item.innerHTML = `
        <div class="flex items-start justify-between gap-2">
          <div class="font-extrabold text-sm text-white">${q.id}. ${this.escapeHtml(normalizeDigits(q.question))}</div>
          <button onclick="app.deleteQuestion(${qIdx})" class="text-slate-500 hover:text-[#ff4b4b] text-xs font-bold shrink-0">${this.t.btnDelete}</button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">${optsHtml}</div>
      `;

      container.appendChild(item);
    });

    const dlg = document.getElementById('previewDialog');
    if (dlg && !dlg.open) dlg.showModal();
  }

  changeCorrectAnswer(qIdx, newCorrectIdx) {
    const map = this.activeMap;
    if (map && map.questions[qIdx]) {
      map.questions[qIdx].correctAnswer = newCorrectIdx;
      this.saveToStorage();
      this.openPreviewModal();
    }
  }

  deleteQuestion(qIdx) {
    const map = this.activeMap;
    if (!map || map.questions.length <= 1) return;
    map.questions.splice(qIdx, 1);
    map.questions.forEach((q, idx) => (q.id = idx + 1));
    this.recalculateStages();
    this.saveToStorage();
    this.renderDashboard();
    this.openPreviewModal();
  }

  resetProgressOnly() {
    const map = this.activeMap;
    if (!map) return;
    map.solvedIds = [];
    map.stageProgress = {};
    map.mistakeIds = [];
    this.recalculateStages();
    this.saveToStorage();
    this.renderDashboard();
    this.closeDialog('previewDialog');
  }

  loadDemoQuiz() {
    const newId = `map_demo_${Date.now()}`;
    this.store.maps.push({
      id: newId,
      title: 'Bilgisayar Müh. (17 Soru)',
      questions: JSON.parse(JSON.stringify(DEMO_QUESTIONS)),
      solvedIds: [],
      mistakeIds: [],
      stageProgress: {}
    });
    this.store.activeMapId = newId;
    this.recalculateStages();
    this.saveToStorage();
    this.renderDashboard();
    this.closeDialog('settingsDialog');
  }

  exportJson() {
    const dataStr = JSON.stringify(this.store, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quizoyun-maps-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importJsonFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed && Array.isArray(parsed.maps)) {
          this.store = parsed;
        } else {
          const questions = Array.isArray(parsed) ? parsed : parsed.questions;
          if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error('Invalid JSON');
          }
          const newId = `map_${Date.now()}`;
          this.store.maps.push({
            id: newId,
            title: normalizeDigits(parsed.title || file.name.replace('.json', '')),
            questions: questions.map((q, i) => ({
              ...q,
              id: i + 1,
              question: normalizeDigits(q.question),
              options: (q.options || []).map((o) => normalizeDigits(o))
            })),
            solvedIds: [],
            mistakeIds: [],
            stageProgress: {}
          });
          this.store.activeMapId = newId;
        }
        this.applyTranslations();
        this.recalculateStages();
        this.saveToStorage();
        this.renderDashboard();
        this.closeDialog('importDialog');
      } catch (err) {
        alert('JSON Error: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

window.app = new QuizHunterApp();
