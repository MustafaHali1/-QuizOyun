# Quiz Hunter — Oyunlaştırılmış YZ Destekli Soru Çözme Uygulaması

Ders sorularını sıkıcı listelerden kurtarıp **Can (HP)**, **Skor & Combo**, **Dinamik Seviye Haritası**, **Jokerler** ve **Hata Havuzu (İntikam Modu)** ile oyunlaştıran modern web uygulaması.

## Özellikler

- **Hibrit Veri Girişi:**
  - Doğrudan metin yapıştırma (WhatsApp, web, ders notları).
  - Dosya yükleme: **PDF (`.pdf`)**, **Word (`.docx`)**, **Metin (`.txt`, `.md`)**, **Görsel/Ekran Görüntüsü (`.png`, `.jpg`, `.webp`)**.
- **Dinamik Soru Sayısı & Akıllı Bölümleme:**
  - Sabit 100 soru sınırı yoktur! İster 10, ister 17, ister 31, ister 100+ soru girin; sistem otomatik olarak dengeli bölümlere (Stage) ayırır.
- **YZ (`gemini-3.8-flash`) Çözüm & Açıklama:**
  - Sorularda cevap anahtarı olmasa bile YZ doğru cevabı bulur, her soruya özel **"Neden bu şık doğru?"** açıklaması ve **YZ Fısıltısı (İpucu)** üretir.
- **Güvenli API Anahtarı (`.env` + `.gitignore`):**
  - API anahtarı asla kaynak kodun içine yazılmaz. Yalnızca `.gitignore` ile korunan yerel `.env` dosyasında saklanır.

## Kurulum ve Çalıştırma

```bash
npm install
npm start
```

Tarayıcıda açın: `http://localhost:3000`
