import express from 'express';
import path from 'path';
import cors from 'cors';
// Mastra API'sine doğrudan erişim yerine HTTP istekleri kullanacağız
// import { mastra } from './mastra/index.js';

// Express uygulaması oluştur
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Statik dosyaları sun
app.use(express.static(path.join(process.cwd(), 'public')));

// Ana sayfa
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

// Playground sayfası
app.get('/chat', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'playground.html'));
});

// Mastra API'sine proxy
app.post('/api/agents/:agentName/generate', async (req, res) => {
  try {
    const { agentName } = req.params;

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

    // Dosya içeriğini kontrol et (varsa)
    if (req.body.tools && Array.isArray(req.body.tools) && req.body.tools.length > 0) {
      const graphTool = req.body.tools.find(tool => tool.name === 'analyze-graph');
      if (graphTool && (!graphTool.parameters || !graphTool.parameters.fileContent)) {
        console.error('Dosya içeriği eksik');
        return res.status(400).json({ error: 'Geçersiz istek formatı: Dosya içeriği eksik' });
      }
    }

    console.log(`API isteği: ${agentName} ajanına istek gönderiliyor`);

    try {
      // Mastra API'sine istek gönder
      const response = await fetch(`http://localhost:4111/api/agents/${agentName}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(req.body)
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
    } catch (fetchError) {
      console.error('Fetch hatası:', fetchError);
      res.status(503).json({
        error: 'Mastra API\'sine bağlanılamadı. Lütfen API\'nin çalıştığından emin olun.',
        details: fetchError.message
      });
    }
  } catch (error) {
    console.error('Genel API hatası:', error);
    res.status(500).json({
      error: 'Sunucu hatası',
      details: error.message
    });
  }
});

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`Web server running on http://localhost:${PORT}`);
  console.log(`Mastra API running on http://localhost:4111/api`);
});
