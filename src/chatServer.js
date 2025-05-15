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
  res.sendFile(path.join(path.dirname(__dirname), 'public', 'chat.html'));
});

// Gemini API anahtarı - gerçek bir anahtar ile değiştirilmeli
const GEMINI_API_KEY = "AIzaSyAlcDx_dBOo78Mhj-rL6MaZOCnYk0LcUkY"; // Bu anahtarı gerçek bir anahtarla değiştirin

// Mastra API'sine proxy
app.post('/api/agents/:agentName/generate', async (req, res) => {
  try {
    const { agentName } = req.params;

    console.log(`API isteği: ${agentName} ajanına istek gönderiliyor`);

    // İstek gövdesini kontrol et
    if (!req.body) {
      console.error('Boş istek gövdesi');
      return res.status(400).json({ error: 'Geçersiz istek formatı: İstek gövdesi boş' });
    }

    // Mesajları kontrol et
    if (!req.body.messages || !Array.isArray(req.body.messages) || req.body.messages.length === 0) {
      console.error('Geçersiz mesaj formatı');
      return res.status(400).json({ error: 'Geçersiz istek formatı: Mesajlar bulunamadı veya geçersiz format' });
    }

    // Görüntü verisi varsa, Gemini API'sini kullan
    if (req.body.imageData) {
      try {
        // Gemini API için istek gövdesi - düzeltilmiş format
        const requestBody = {
          contents: [
            {
              role: 'user',
              parts: [
                { text: req.body.messages[0].content }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        };

        // Görüntü verisini doğru formatta ekle
        if (req.body.imageData) {
          try {
            // Base64 veriyi ayır
            const base64Data = req.body.imageData.split(',')[1];
            // MIME tipini belirle - ya istemciden gelen değeri kullan ya da varsayılan değeri
            const mimeType = req.body.mimeType || 'image/jpeg';

            // Görüntüyü ayrı bir mesaj olarak ekle
            requestBody.contents.push({
              role: 'user',
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                  }
                }
              ]
            });
          } catch (error) {
            console.error('Görüntü verisi işlenirken hata:', error);
          }
        }

        // Sistem talimatlarını ekle
        requestBody.contents.unshift({
          role: 'model',
          parts: [{
            text: `Sen bir grafik analiz uzmanısın. Kullanıcıların yüklediği grafik görüntülerini analiz ederek:

1. Grafiğin türünü MUTLAKA belirle. Önce aşağıdaki referans kaynaklardan grafik türünü tam olarak tespit et.
2. Grafikte gösterilen verileri yorumla
3. Grafiğin ana mesajını ve önemli bulgularını açıkla
4. Grafiğin güçlü ve zayıf yönlerini belirt
5. Gerekirse grafiği iyileştirme önerileri sun

Analiz yaparken şu referans kaynaklardan MUTLAKA yararlan ve bu kaynaklardaki grafik türlerini referans al:
- https://r-graph-gallery.com/300-basic-lollipop-plot.html (Lollipop grafikler)
- https://dreamrs.github.io/esquisse/ (Farklı grafik türleri ve özellikleri)
- https://www.data-to-viz.com/#boxplot (Kutu grafikleri ve diğer grafik türleri)

Grafik türünü belirlerken, önce bu referans kaynaklarını kontrol et ve grafiğin hangi türe ait olduğunu tam olarak belirle. Örneğin:
- Bar chart (Çubuk grafik)
- Line chart (Çizgi grafik)
- Scatter plot (Dağılım grafiği)
- Box plot (Kutu grafiği)
- Violin plot (Keman grafiği)
- Lollipop chart (Lolipop grafik)
- Histogram
- Density plot (Yoğunluk grafiği)
- Heatmap (Isı haritası)
- Pie chart (Pasta grafik)
- Donut chart (Halka grafik)
- Radar chart (Radar grafik)
- Bubble chart (Kabarcık grafik)
- Treemap (Ağaç haritası)
- Sankey diagram (Sankey diyagramı)
- Network graph (Ağ grafiği)
- Ridgeline plot (Sırt çizgisi grafiği)

Yanıtlarında şu yapıyı kullan:

## Grafik Türü
[Belirlenen grafik türü ve açıklaması - referans kaynaklardan tam olarak belirle]

## Analiz
[Grafiğin detaylı analizi, gösterdiği veriler ve ana mesaj]

## Önemli Bulgular
- [Bulgu 1]
- [Bulgu 2]
...

## Değerlendirme
[Grafiğin güçlü ve zayıf yönleri]

## Öneriler
[Grafiği iyileştirme önerileri]`
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
        return res.json({
          text: content.parts[0].text,
          model: 'gemini-2.0-flash'
        });
      } catch (geminiError) {
        console.error('Gemini API hatası:', geminiError);
        return res.status(500).json({ error: `Gemini API hatası: ${geminiError.message}` });
      }
    }

    // Görüntü verisi yoksa, Mastra API'sini kullan
    try {
      // Mastra API'sine istek gönder
      const response = await fetch(`http://localhost:4111/api/agents/${agentName}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: req.body.messages
        })
      });

      console.log(`API yanıtı: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        let errorMessage = `API hatası: ${response.status} ${response.statusText}`;

        try {
          const errorData = await response.json();
          console.error('API hata detayları:', errorData);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('API hata yanıtı işlenemedi:', parseError);
        }

        return res.status(response.status).json({ error: errorMessage });
      }

      const result = await response.json();
      res.json(result);
    } catch (mastraError) {
      console.error('Mastra API hatası:', mastraError);
      return res.status(500).json({ error: `Mastra API hatası: ${mastraError.message}` });
    }
  } catch (error) {
    console.error('Genel API hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`Web server running on http://localhost:${PORT}`);
  console.log(`Chat interface available at http://localhost:${PORT}/chat`);
});
