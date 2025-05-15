import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

// __dirname için
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express uygulaması oluştur
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Statik dosyaları sun
app.use(express.static(path.join(path.dirname(__dirname), 'public')));

// Ana sayfa
app.get('/', (req, res) => {
  res.sendFile(path.join(path.dirname(__dirname), 'public', 'index.html'));
});

// Chat sayfası
app.get('/chat', (req, res) => {
  res.sendFile(path.join(path.dirname(__dirname), 'public', 'playground.html'));
});

// Gemini API anahtarı
// Not: Bu bir örnek anahtardır ve çalışmayacaktır
// Kendi API anahtarınızı oluşturup buraya eklemeniz gerekiyor
// https://aistudio.google.com/ adresinden bir anahtar oluşturabilirsiniz
const GEMINI_API_KEY = "AIzaSyAlcDx_dBOo78Mhj-rL6MaZOCnYk0LcUkY";

// Grafik analizi için API endpoint'i
app.post('/api/analyze-graph', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Geçersiz istek formatı: Mesajlar bulunamadı' });
    }

    // Referans kaynakları
    const referenceUrls = [
      'https://r-graph-gallery.com/web-double-ridgeline-plot.html',
      'https://dreamrs.github.io/esquisse/',
      'https://www.data-to-viz.com/'
    ];

    // Gemini API için istek gövdesi
    const requestBody = {
      contents: messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: Array.isArray(msg.content) ? msg.content : [{ text: msg.content }]
      })),
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    };

    // Sistem talimatlarını ekle
    requestBody.contents.unshift({
      role: 'model',
      parts: [{
        text: `Sen bir grafik analiz uzmanısın. Kullanıcıların yüklediği grafik görüntülerini analiz ederek:

1. Grafiğin türünü belirle (çubuk grafik, çizgi grafik, pasta grafik, kutu grafik, vb.)
2. Grafikte gösterilen verileri yorumla
3. Grafiğin ana mesajını ve önemli bulgularını açıkla
4. Grafiğin güçlü ve zayıf yönlerini belirt
5. Gerekirse grafiği iyileştirme önerileri sun

Analiz yaparken şu referans kaynaklardan MUTLAKA yararlan:
- ${referenceUrls[0]}
- ${referenceUrls[1]}
- ${referenceUrls[2]}

Yanıtlarında şu yapıyı kullan:

## Grafik Türü
[Belirlenen grafik türü ve açıklaması]

## Analiz
[Grafiğin detaylı analizi, gösterdiği veriler ve ana mesaj]

## Önemli Bulgular
- [Bulgu 1]
- [Bulgu 2]
...

## Değerlendirme
[Grafiğin güçlü ve zayıf yönleri]

## Öneriler
[Grafiği iyileştirme önerileri]

Kullanıcı dosya yüklemeden soru sorarsa, dosya yüklemesi için nazikçe yönlendir.`
      }]
    });

    console.log('Gemini API isteği gönderiliyor...');

    // Gemini API'ye istek gönder
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API hatası:', response.status, errorData);
      return res.status(response.status).json({
        error: `Gemini API hatası: ${response.status} ${response.statusText}`,
        details: errorData
      });
    }

    const result = await response.json();

    // Yanıtı işle
    if (!result.candidates || result.candidates.length === 0) {
      return res.status(500).json({ error: 'Gemini API yanıt vermedi' });
    }

    const content = result.candidates[0].content;

    if (!content || !content.parts || content.parts.length === 0) {
      return res.status(500).json({ error: 'Gemini API yanıtı boş' });
    }

    // Yanıtı döndür
    res.json({
      text: content.parts[0].text,
      model: 'gemini-2.0-flash'
    });

  } catch (error) {
    console.error('API hatası:', error);
    res.status(500).json({
      error: 'Sunucu hatası',
      details: error.message
    });
  }
});

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`Web server running on http://localhost:${PORT}`);
  console.log(`Chat interface available at http://localhost:${PORT}/chat`);
});
