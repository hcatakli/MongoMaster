import TelegramBot from 'node-telegram-bot-api';
import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';
import { sampleData, mongoCollections } from './data/sampleData.js';

// __dirname için
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB bağlantı URL'si
const MONGODB_URI = 'mongodb://2.59.119.114:52026/MastraMonger';

// MongoDB bağlantısı
let mongoClient;
let db;
let isConnected = false;

// Kullanıcı durumlarını saklamak için
const userStates = {};

// Telegram Bot Token
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7138133334:AAGZDwfhKm-E3pqcCA7Cavrsv1-vIi1YI24';

// Mastra API URL
const MASTRA_API_URL = 'http://localhost:4111/api';

// Express uygulaması
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(bodyParser.json());

// Bot oluştur - webhook modu
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {
  polling: false
});

// Webhook URL (ngrok veya benzeri bir servis kullanarak dışarıya açılmalı)
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://your-webhook-url.com';

// Webhook ayarla
app.post(`/bot${TELEGRAM_BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Webhook'u etkinleştir
async function setupWebhook() {
  try {
    // Önce mevcut webhook'u temizle
    await bot.deleteWebHook();
    
    // Yeni webhook'u ayarla
    await bot.setWebHook(`${WEBHOOK_URL}/bot${TELEGRAM_BOT_TOKEN}`);
    
    console.log(`Webhook ayarlandı: ${WEBHOOK_URL}/bot${TELEGRAM_BOT_TOKEN}`);
  } catch (error) {
    console.error('Webhook ayarlama hatası:', error);
  }
}

// Express sunucusunu başlat
app.listen(PORT, () => {
  console.log(`Webhook sunucusu çalışıyor: http://localhost:${PORT}`);
  setupWebhook();
});

// MongoDB'ye bağlanma fonksiyonu
async function connectToMongo() {
  try {
    if (isConnected && db) {
      return db;
    }
    
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    db = mongoClient.db();
    isConnected = true;
    console.log('MongoDB bağlantısı başarılı');
    return db;
  } catch (error) {
    console.error('MongoDB bağlantı hatası:', error);
    throw error;
  }
}

// Grafik URL'si oluşturma fonksiyonu
function generateChartUrl(chartType, data, options = {}) {
  // QuickChart API kullanarak grafik URL'si oluştur
  const chartConfig = {
    type: chartType,
    data: data,
    options: options
  };
  
  // JSON'u URL-safe base64'e dönüştür
  const encodedConfig = encodeURIComponent(JSON.stringify(chartConfig));
  
  // QuickChart URL'sini oluştur
  return `https://quickchart.io/chart?c=${encodedConfig}`;
}

// /start komutu
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    'Merhaba! Ben bir grafik tanıma ve oluşturma botuyum. Bana bir grafik görseli gönderirseniz, onu analiz edebilirim. Ayrıca MongoDB veritabanından grafik oluşturabilirim.'
  );
});

// /help komutu
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    'Kullanım:\n' +
    '1. Bir grafik görseli gönderin - Görsel analiz edilecektir\n' +
    '2. Metin mesajı gönderin - Sorunuza cevap verilecektir\n' +
    '3. Grafik komutları:\n' +
    '   /barchart - Çubuk grafik oluşturur\n' +
    '   /linechart - Çizgi grafik oluşturur\n' +
    '   /piechart - Pasta grafik oluşturur\n' +
    '4. MongoDB komutları:\n' +
    '   /dbconnect - MongoDB\'ye bağlanır\n' +
    '   /collections - Veritabanındaki koleksiyonları listeler\n' +
    '   /analyze - Bir koleksiyonu analiz eder ve çizilebilecek grafikleri gösterir\n' +
    '/start - Botu başlatır\n' +
    '/help - Bu yardım mesajını gösterir'
  );
});

// MongoDB'ye bağlanma komutu
bot.onText(/\/dbconnect/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    bot.sendMessage(chatId, 'MongoDB\'ye bağlanılıyor...');
    await connectToMongo();
    bot.sendMessage(chatId, `MongoDB bağlantısı başarılı: ${MONGODB_URI}`);
  } catch (error) {
    console.error('MongoDB bağlantı hatası:', error);
    bot.sendMessage(chatId, `MongoDB bağlantı hatası: ${error.message}`);
  }
});

// Koleksiyonları listeleme komutu
bot.onText(/\/collections/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    if (!isConnected) {
      bot.sendMessage(chatId, 'Önce MongoDB\'ye bağlanılıyor...');
      await connectToMongo();
    }
    
    const collections = await db.listCollections().toArray();
    
    if (collections.length === 0) {
      bot.sendMessage(chatId, 'Veritabanında hiç koleksiyon bulunamadı.');
      return;
    }
    
    let message = 'Veritabanındaki koleksiyonlar:\n\n';
    collections.forEach((collection, index) => {
      message += `${index + 1}. ${collection.name}\n`;
    });
    
    message += '\nBir koleksiyonu analiz etmek için /analyze KOLEKSIYON_ADI komutunu kullanın.';
    
    bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Koleksiyonları listeleme hatası:', error);
    bot.sendMessage(chatId, `Koleksiyonları listeleme hatası: ${error.message}`);
  }
});

// Çubuk grafik komutu
bot.onText(/\/barchart/, (msg) => {
  const chatId = msg.chat.id;
  
  try {
    // Örnek veri kullan
    const data = sampleData.barChart;
    
    // Grafik URL'si oluştur
    const chartUrl = generateChartUrl('bar', data, {
      title: {
        display: true,
        text: 'Aylık Satış ve Gider Raporu'
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    });
    
    // Grafiği gönder
    bot.sendPhoto(chatId, chartUrl, {
      caption: 'Aylık Satış ve Gider Raporu'
    });
  } catch (error) {
    console.error('Grafik oluşturulurken hata:', error);
    bot.sendMessage(chatId, 'Grafik oluşturulurken bir hata oluştu.');
  }
});

// Çizgi grafik komutu
bot.onText(/\/linechart/, (msg) => {
  const chatId = msg.chat.id;
  
  try {
    // Örnek veri kullan
    const data = sampleData.lineChart;
    
    // Grafik URL'si oluştur
    const chartUrl = generateChartUrl('line', data, {
      title: {
        display: true,
        text: 'Aylık Web Sitesi Ziyaretçi Sayısı'
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    });
    
    // Grafiği gönder
    bot.sendPhoto(chatId, chartUrl, {
      caption: 'Aylık Web Sitesi Ziyaretçi Sayısı'
    });
  } catch (error) {
    console.error('Grafik oluşturulurken hata:', error);
    bot.sendMessage(chatId, 'Grafik oluşturulurken bir hata oluştu.');
  }
});

// Pasta grafik komutu
bot.onText(/\/piechart/, (msg) => {
  const chatId = msg.chat.id;
  
  try {
    // Örnek veri kullan
    const data = sampleData.pieChart;
    
    // Grafik URL'si oluştur
    const chartUrl = generateChartUrl('pie', data, {
      title: {
        display: true,
        text: 'Renk Dağılımı'
      }
    });
    
    // Grafiği gönder
    bot.sendPhoto(chatId, chartUrl, {
      caption: 'Renk Dağılımı'
    });
  } catch (error) {
    console.error('Grafik oluşturulurken hata:', error);
    bot.sendMessage(chatId, 'Grafik oluşturulurken bir hata oluştu.');
  }
});

console.log('Telegram webhook bot başlatıldı...');
