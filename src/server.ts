// @ts-nocheck
import express from 'express';
import path from 'path';
import cors from 'cors';
import { mastra } from './mastra';

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

// Mastra API'sine proxy
app.post('/api/agents/:agentName/generate', async (req, res) => {
  try {
    const { agentName } = req.params;
    const agent = mastra.getAgent(agentName);

    if (!agent) {
      return res.status(404).json({ error: `Agent '${agentName}' not found` });
    }

    const { messages, tools } = req.body;

    // Ajan yanıtını oluştur
    const result = await agent.generate(messages, { tools });

    res.json(result);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`Web server running on http://localhost:${PORT}`);
  console.log(`Mastra API running on http://localhost:4111/api`);
});
