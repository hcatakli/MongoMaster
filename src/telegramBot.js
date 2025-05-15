import TelegramBot from 'node-telegram-bot-api';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';
import { sampleData, mongoCollections } from './data/sampleData.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';



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

// Gemini API anahtarı
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyAlcDx_dBOo78Mhj-rL6MaZOCnYk0LcUkY";


// Mastra API URL - Mastra'nın varsayılan portu 3111'dir
const MASTRA_API_URL = 'http://localhost:3111/api';

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

// Koleksiyonları analiz edip çizilebilecek grafikleri belirleyen fonksiyon
async function analyzeCollection(collectionName, limit = 10) {
  try {
    // Bağlantı durumunu kontrol et
    if (!isConnected || !db) {
      await connectToMongo();
    }

    const collection = db.collection(collectionName);

    // Koleksiyondaki belge sayısını al
    const count = await collection.countDocuments();

    if (count === 0) {
      return {
        collectionName,
        isEmpty: true,
        message: 'Bu koleksiyon boş.'
      };
    }

    // Örnek belgeleri al
    const sampleDocs = await collection.find({}).limit(limit).toArray();

    // Veri yapısını analiz et
    const firstDoc = sampleDocs[0];
    const fields = Object.keys(firstDoc);

    // Sayısal, tarih ve kategori alanlarını belirle
    const numericFields = [];
    const dateFields = [];
    const categoryFields = [];
    const booleanFields = [];
    const objectFields = [];
    const arrayFields = [];
    const monthFields = [];

    fields.forEach(field => {
      if (field === '_id') return;

      // Tüm belgelerde bu alanın tipini kontrol et
      let fieldTypes = new Set();
      let isConsistentType = true;

      sampleDocs.forEach(doc => {
        if (doc[field] !== undefined && doc[field] !== null) {
          const type = Array.isArray(doc[field]) ? 'array' : typeof doc[field];
          fieldTypes.add(type);

          // Tarih kontrolü
          if (type === 'string' && !isNaN(Date.parse(doc[field]))) {
            fieldTypes.add('date');
          } else if (type === 'object' && doc[field] instanceof Date) {
            fieldTypes.add('date');
          }
        }
      });

      isConsistentType = fieldTypes.size <= 2 && (fieldTypes.has('date') || fieldTypes.size === 1);

      if (!isConsistentType) {
        console.log(`Alan ${field} için tutarsız tipler:`, [...fieldTypes]);
        return; // Bu alanı atla
      }

      const value = firstDoc[field];

      if (typeof value === 'number') {
        numericFields.push(field);
      } else if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
        dateFields.push(field);
      } else if (typeof value === 'string') {
        // Benzersiz değerlerin sayısını kontrol et
        const uniqueValues = new Set(sampleDocs.map(doc => doc[field])).size;
        // Eğer benzersiz değer sayısı örnek belge sayısının %70'inden azsa, kategori olarak kabul et
        if (uniqueValues < sampleDocs.length * 0.7) {
          categoryFields.push(field);
        }
      } else if (typeof value === 'boolean') {
        booleanFields.push(field);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        objectFields.push(field);
      } else if (Array.isArray(value)) {
        arrayFields.push(field);
      }
    });

    // Çizilebilecek grafik türlerini belirle ***************************************************************
    const possibleCharts = [];

    // Sayısal alan varsa
    if (numericFields.length > 0) {
      // Kategori alanı da varsa
      if (categoryFields.length > 0) {
        // Her kategori alanı için
        categoryFields.forEach(categoryField => {
          // Her sayısal alan için
          numericFields.forEach(numericField => {
            possibleCharts.push({
              type: 'bar',
              name: 'Çubuk Grafik',
              description: `${categoryField} kategorilerine göre ${numericField} değerlerini gösteren çubuk grafik`,
              xAxis: categoryField,
              yAxis: numericField
            });

            possibleCharts.push({
              type: 'pie',
              name: 'Pasta Grafik',
              description: `${categoryField} kategorilerine göre ${numericField} dağılımını gösteren pasta grafik`,
              category: categoryField,
              value: numericField
            });
          });
        });
      }

      // Boolean alanı varsa
      if (booleanFields.length > 0) {
        booleanFields.forEach(boolField => {
          numericFields.forEach(numericField => {
            possibleCharts.push({
              type: 'bar',
              name: 'Boolean Çubuk Grafik',
              description: `${boolField} değerine göre ${numericField} değerlerini gösteren çubuk grafik`,
              xAxis: boolField,
              yAxis: numericField
            });

            possibleCharts.push({
              type: 'pie',
              name: 'Boolean Pasta Grafik',
              description: `${boolField} değerine göre ${numericField} dağılımını gösteren pasta grafik`,
              category: boolField,
              value: numericField
            });
          });
        });
      }

      // Tarih alanı varsa
      if (dateFields.length > 0) {
        dateFields.forEach(dateField => {
          numericFields.forEach(numericField => {
            possibleCharts.push({
              type: 'line',
              name: 'Zaman Serisi Grafiği',
              description: `${dateField} tarihine göre ${numericField} değişimini gösteren çizgi grafik`,
              xAxis: dateField,
              yAxis: numericField
            });

            possibleCharts.push({
              type: 'bar',
              name: 'Zaman Çubuk Grafiği',
              description: `${dateField} tarihine göre ${numericField} değerlerini gösteren çubuk grafik`,
              xAxis: dateField,
              yAxis: numericField
            });
          });
        });
      }

      // Birden fazla sayısal alan varsa
      if (numericFields.length > 1) {
        // Her sayısal alan çifti için
        for (let i = 0; i < numericFields.length; i++) {
          for (let j = i + 1; j < numericFields.length; j++) {
            possibleCharts.push({
              type: 'scatter',
              name: 'Dağılım Grafiği',
              description: `${numericFields[i]} ve ${numericFields[j]} arasındaki ilişkiyi gösteren dağılım grafiği`,
              xAxis: numericFields[i],
              yAxis: numericFields[j]
            });
          }
        }
      }

      // Tek sayısal alan varsa
      numericFields.forEach(numericField => {
        possibleCharts.push({
          type: 'histogram',
          name: 'Histogram',
          description: `${numericField} değerlerinin dağılımını gösteren histogram`,
          value: numericField
        });
      });
    }

    // Kategori alanları varsa
    if (categoryFields.length > 1) {
      // Her kategori alan çifti için
      for (let i = 0; i < categoryFields.length; i++) {
        for (let j = i + 1; j < categoryFields.length; j++) {
          possibleCharts.push({
            type: 'heatmap',
            name: 'Isı Haritası',
            description: `${categoryFields[i]} ve ${categoryFields[j]} arasındaki ilişkiyi gösteren ısı haritası`,
            xAxis: categoryFields[i],
            yAxis: categoryFields[j]
          });
        }
      }
    }

    return {
      collectionName,
      documentCount: count,
      sampleData: sampleDocs.slice(0, 2), // Sadece ilk 2 belgeyi gönder
      fields: {
        numeric: numericFields,
        date: dateFields,
        category: categoryFields,
        boolean: booleanFields,
        object: objectFields,
        array: arrayFields,
        month: monthFields
      },
      possibleCharts
    };
  } catch (error) {
    console.error(`Koleksiyon analiz hatası (${collectionName}):`, error);
    return {
      collectionName,
      error: error.message
    };
  }
}

// Bot oluştur - daha sağlam bağlantı ayarları ile
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {
  polling: {
    interval: 300, // Polling aralığını artır (ms)
    autoStart: true,
    params: {
      timeout: 10 // Uzun polling zaman aşımı (saniye)
    }
  },
  request: {
    proxy: false, // Proxy kullanma
    timeout: 60000, // İstek zaman aşımı (ms)
    agent: false, // Özel agent kullanma
    pool: { maxSockets: 100 } // Bağlantı havuzu boyutu
  }
});

// Geçici dosyalar için klasör
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Hata yakalama ve yeniden bağlanma
bot.on('polling_error', (error) => {
  console.error('Polling hatası:', error.code, error.message);

  // Belirli hatalarda yeniden bağlanmayı dene
  if (error.code === 'EFATAL' || error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
    console.log('Bağlantı hatası nedeniyle yeniden bağlanılıyor...');

    // Polling'i durdur ve yeniden başlat
    try {
      bot.stopPolling();

      // 5 saniye bekle ve yeniden başlat
      setTimeout(() => {
        bot.startPolling();
        console.log('Polling yeniden başlatıldı');
      }, 5000);
    } catch (e) {
      console.error('Polling yeniden başlatma hatası:', e);
    }
  }
});

// Callback butonları için işleyici
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  // Callback verisini işle
  if (data.startsWith('analyze_')) {
    // Koleksiyon adını al
    const collectionName = data.substring('analyze_'.length);

    // Kullanıcıya bilgi ver
    bot.answerCallbackQuery(callbackQuery.id, { text: `${collectionName} koleksiyonu analiz ediliyor...` });

    // Analiz işlemini başlat
    try {
      // Bağlantı durumunu kontrol et
      if (!isConnected || !db) {
        bot.sendMessage(chatId, '🔄 MongoDB\'ye bağlanılıyor...');
        await connectToMongo();
      }

      bot.sendMessage(chatId, `"${collectionName}" koleksiyonu analiz ediliyor...`);
      bot.sendChatAction(chatId, 'typing');

      const analysis = await analyzeCollection(collectionName);

      if (analysis.error) {
        bot.sendMessage(chatId, `❌ Analiz hatası: ${analysis.error}`);
        return;
      }

      if (analysis.isEmpty) {
        bot.sendMessage(chatId, `⚠️ "${collectionName}" koleksiyonu boş.`);
        return;
      }

      // Koleksiyon hakkında genel bilgi gönder
      let infoMessage = `📊 *${collectionName}* Koleksiyonu Analizi\n\n`;
      infoMessage += `*Belge Sayısı:* ${analysis.documentCount}\n`;

      // Alan türlerini göster
      if (analysis.fields.numeric.length > 0) {
        infoMessage += `\n*Sayısal Alanlar:* ${analysis.fields.numeric.join(', ')}\n`;
      }

      if (analysis.fields.date.length > 0) {
        infoMessage += `*Tarih Alanları:* ${analysis.fields.date.join(', ')}\n`;
      }

      if (analysis.fields.category.length > 0) {
        infoMessage += `*Kategori Alanları:* ${analysis.fields.category.join(', ')}\n`;
      }

      if (analysis.fields.boolean.length > 0) {
        infoMessage += `*Boolean Alanları:* ${analysis.fields.boolean.join(', ')}\n`;
      }

      // Örnek veri
      if (analysis.sampleData && analysis.sampleData.length > 0) {
        infoMessage += `\n*Örnek Veri:*\n\`\`\`\n${JSON.stringify(analysis.sampleData[0], null, 2).substring(0, 300)}${JSON.stringify(analysis.sampleData[0], null, 2).length > 300 ? '...' : ''}\n\`\`\`\n`;
      }

      bot.sendMessage(chatId, infoMessage, { parse_mode: 'Markdown' });

      if (analysis.possibleCharts.length === 0) {
        bot.sendMessage(chatId, `⚠️ "${collectionName}" koleksiyonu için çizilebilecek grafik bulunamadı.`);
        return;
      }

      // Kullanıcı durumunu kaydet
      userStates[chatId] = {
        action: 'selectChart',
        collection: collectionName,
        analysis: analysis
      };

      // Çizilebilecek grafikleri kategorilere ayır
      const chartsByType = {
        bar: [],
        pie: [],
        line: [],
        scatter: [],
        histogram: [],
        heatmap: []
      };

      analysis.possibleCharts.forEach(chart => {
        if (chartsByType[chart.type]) {
          chartsByType[chart.type].push(chart);
        }
      });

      // Çizilebilecek grafikleri listele
      let message = `🎯 *"${collectionName}" koleksiyonu için çizilebilecek grafikler:*\n\n`;

      let chartIndex = 1;

      // Her grafik türü için
      Object.entries(chartsByType).forEach(([type, charts]) => {
        if (charts.length > 0) {
          const typeEmoji = type === 'bar' ? '📊' :
                           type === 'pie' ? '🥧' :
                           type === 'line' ? '📈' :
                           type === 'scatter' ? '🔵' :
                           type === 'histogram' ? '📶' :
                           type === 'heatmap' ? '🔥' : '📊';

          message += `${typeEmoji} *${type.charAt(0).toUpperCase() + type.slice(1)} Grafikler:*\n`;

          charts.forEach(chart => {
            message += `  ${chartIndex}. ${chart.description}\n`;
            chartIndex++;
          });

          message += '\n';
        }
      });

      message += '👉 Oluşturmak istediğiniz grafiğin numarasını girin:';

      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Koleksiyon analiz hatası:', error);
      bot.sendMessage(chatId, `❌ Koleksiyon analiz hatası: ${error.message}`);
    }
  }
});

// Bot başlatırken MongoDB'ye otomatik bağlan
(async () => {
  try {
    console.log('MongoDB\'ye bağlanılıyor...');
    await connectToMongo();
    console.log('MongoDB bağlantısı başarılı');
  } catch (error) {
    console.error('MongoDB bağlantı hatası:', error);
  }

  // Bot başlatma mesajı
  console.log('Telegram bot başlatıldı...');
})();

// /start komutu
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    'Merhaba! Ben bir grafik tanıma botuyum. Bana bir grafik görseli gönderirseniz, onu analiz edebilirim. Ayrıca normal sorular da sorabilirsiniz.'
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
    '   /salesreport - Satış raporu grafiği oluşturur\n' +
    '   /usertrends - Kullanıcı trendleri grafiği oluşturur\n' +
    '   /weathertrends - Hava durumu trendleri grafiği oluşturur\n' +
    '4. MongoDB komutları:\n' +
    '   /dbconnect - MongoDB\'ye bağlanır\n' +
    '   /collections - Veritabanındaki koleksiyonları listeler\n' +
    '   /analyze - Bir koleksiyonu analiz eder ve çizilebilecek grafikleri gösterir\n' +
    '/start - Botu başlatır\n' +
    '/help - Bu yardım mesajını gösterir'
  );
});

// MongoDB bağlantı durumunu kontrol etme komutu
bot.onText(/\/dbconnect/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    if (isConnected && db) {
      bot.sendMessage(chatId, `✅ MongoDB bağlantısı zaten aktif: ${MONGODB_URI}`);
    } else {
      bot.sendMessage(chatId, '🔄 MongoDB\'ye bağlanılıyor...');
      await connectToMongo();
      bot.sendMessage(chatId, `✅ MongoDB bağlantısı başarılı: ${MONGODB_URI}`);
    }

    // Bağlantı bilgilerini göster
    const adminDb = db.admin();
    const serverStatus = await adminDb.serverStatus();

    let infoMessage = `📊 *MongoDB Bağlantı Bilgileri*\n\n`;
    infoMessage += `*Sunucu:* ${serverStatus.host}\n`;
    infoMessage += `*Sürüm:* ${serverStatus.version}\n`;
    infoMessage += `*Uptime:* ${Math.floor(serverStatus.uptime / 3600)} saat ${Math.floor((serverStatus.uptime % 3600) / 60)} dakika\n`;
    infoMessage += `*Bağlantı URL:* ${MONGODB_URI}\n`;

    // Veritabanı istatistikleri
    const stats = await db.stats();
    infoMessage += `\n*Veritabanı İstatistikleri*\n`;
    infoMessage += `*Koleksiyon Sayısı:* ${stats.collections}\n`;
    infoMessage += `*Belge Sayısı:* ${stats.objects}\n`;
    infoMessage += `*Veri Boyutu:* ${(stats.dataSize / (1024 * 1024)).toFixed(2)} MB\n`;

    bot.sendMessage(chatId, infoMessage, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('MongoDB bağlantı hatası:', error);
    bot.sendMessage(chatId, `❌ MongoDB bağlantı hatası: ${error.message}`);
  }
});

// Koleksiyonları listeleme komutu
bot.onText(/\/collections/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    // Bağlantı durumunu kontrol et
    if (!isConnected || !db) {
      bot.sendMessage(chatId, '🔄 MongoDB\'ye bağlanılıyor...');
      await connectToMongo();
    }

    bot.sendChatAction(chatId, 'typing');

    const collections = await db.listCollections().toArray();

    if (collections.length === 0) {
      bot.sendMessage(chatId, '⚠️ Veritabanında hiç koleksiyon bulunamadı.');
      return;
    }

    // Koleksiyonları analiz et ve belge sayılarını al
    const collectionDetails = [];

    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      collectionDetails.push({
        name: collection.name,
        count
      });
    }

    // Belge sayısına göre sırala (çoktan aza)
    collectionDetails.sort((a, b) => b.count - a.count);

    let message = '📚 *Veritabanındaki Koleksiyonlar*\n\n';

    collectionDetails.forEach((collection, index) => {
      message += `${index + 1}. *${collection.name}* - ${collection.count} belge\n`;
    });

    message += '\n📊 *Grafik Oluşturma*\n';
    message += 'Bir koleksiyonu analiz etmek ve grafik oluşturmak için:\n';
    message += '`/analyze KOLEKSIYON_ADI` komutunu kullanın.\n\n';
    message += 'Örnek: `/analyze ' + collectionDetails[0].name + '`';

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

    // Hızlı erişim için butonlar oluştur
    if (collectionDetails.length > 0) {
      // En fazla 5 koleksiyon için buton göster
      const topCollections = collectionDetails.slice(0, 5);

      const buttons = topCollections.map(collection => [{
        text: `📊 ${collection.name} (${collection.count} belge)`,
        callback_data: `analyze_${collection.name}`
      }]);

      bot.sendMessage(chatId, '🔍 *Hızlı Erişim*\nAşağıdaki koleksiyonlardan birini analiz etmek için tıklayın:', {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: buttons
        }
      });
    }
  } catch (error) {
    console.error('Koleksiyonları listeleme hatası:', error);
    bot.sendMessage(chatId, `❌ Koleksiyonları listeleme hatası: ${error.message}`);
  }
});

// Koleksiyon analiz komutu
bot.onText(/\/analyze (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const collectionName = match[1];

  try {
    // Bağlantı durumunu kontrol et
    if (!isConnected || !db) {
      bot.sendMessage(chatId, '🔄 MongoDB\'ye bağlanılıyor...');
      await connectToMongo();
    }

    bot.sendMessage(chatId, `"${collectionName}" koleksiyonu analiz ediliyor...`);
    bot.sendChatAction(chatId, 'typing');

    const analysis = await analyzeCollection(collectionName);

    if (analysis.error) {
      bot.sendMessage(chatId, `❌ Analiz hatası: ${analysis.error}`);
      return;
    }

    if (analysis.isEmpty) {
      bot.sendMessage(chatId, `⚠️ "${collectionName}" koleksiyonu boş.`);
      return;
    }

    // Koleksiyon hakkında genel bilgi gönder
    let infoMessage = `📊 *${collectionName}* Koleksiyonu Analizi\n\n`;
    infoMessage += `*Belge Sayısı:* ${analysis.documentCount}\n`;

    // Alan türlerini göster
    if (analysis.fields.numeric.length > 0) {
      infoMessage += `\n*Sayısal Alanlar:* ${analysis.fields.numeric.join(', ')}\n`;
    }

    if (analysis.fields.date.length > 0) {
      infoMessage += `*Tarih Alanları:* ${analysis.fields.date.join(', ')}\n`;
    }

    if (analysis.fields.category.length > 0) {
      infoMessage += `*Kategori Alanları:* ${analysis.fields.category.join(', ')}\n`;
    }

    if (analysis.fields.boolean.length > 0) {
      infoMessage += `*Boolean Alanları:* ${analysis.fields.boolean.join(', ')}\n`;
    }

    // Örnek veri
    if (analysis.sampleData && analysis.sampleData.length > 0) {
      infoMessage += `\n*Örnek Veri:*\n\`\`\`\n${JSON.stringify(analysis.sampleData[0], null, 2).substring(0, 300)}${JSON.stringify(analysis.sampleData[0], null, 2).length > 300 ? '...' : ''}\n\`\`\`\n`;
    }

    bot.sendMessage(chatId, infoMessage, { parse_mode: 'Markdown' });

    if (analysis.possibleCharts.length === 0) {
      bot.sendMessage(chatId, `⚠️ "${collectionName}" koleksiyonu için çizilebilecek grafik bulunamadı.`);
      return;
    }

    // Kullanıcı durumunu kaydet
    userStates[chatId] = {
      action: 'selectChart',
      collection: collectionName,
      analysis: analysis
    };

    // Çizilebilecek grafikleri kategorilere ayır
    const chartsByType = {
      bar: [],
      pie: [],
      line: [],
      scatter: [],
      histogram: [],
      heatmap: []
    };

    analysis.possibleCharts.forEach(chart => {
      if (chartsByType[chart.type]) {
        chartsByType[chart.type].push(chart);
      }
    });

    // Çizilebilecek grafikleri listele
    let message = `🎯 *"${collectionName}" koleksiyonu için çizilebilecek grafikler:*\n\n`;

    let chartIndex = 1;

    // Her grafik türü için
    Object.entries(chartsByType).forEach(([type, charts]) => {
      if (charts.length > 0) {
        const typeEmoji = type === 'bar' ? '📊' :
                         type === 'pie' ? '🥧' :
                         type === 'line' ? '📈' :
                         type === 'scatter' ? '🔵' :
                         type === 'histogram' ? '📶' :
                         type === 'heatmap' ? '🔥' : '📊';

        message += `${typeEmoji} *${type.charAt(0).toUpperCase() + type.slice(1)} Grafikler:*\n`;

        charts.forEach(chart => {
          message += `  ${chartIndex}. ${chart.description}\n`;
          chartIndex++;
        });

        message += '\n';
      }
    });

    message += '👉 Oluşturmak istediğiniz grafiğin numarasını girin:';

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Koleksiyon analiz hatası:', error);
    bot.sendMessage(chatId, `❌ Koleksiyon analiz hatası: ${error.message}`);
  }
});



// Set up ChartJS canvas for server-side rendering
const width = 800;
const height = 600;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

// Add this command to your bot
bot.onText(/\/grafik/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    // JSON verisini burada doğrudan tanımladık
    const jsonData = {
      title: "2025 Sales Trend",
      xLabel: "Month",
      yLabel: "Sales",
      data: [
        { month: "Jan", sales: 200 },
        { month: "Feb", sales: 220 },
        { month: "Mar", sales: 250 },
        { month: "Apr", sales: 300 },
        { month: "May", sales: 350 },
        { month: "Jun", sales: 400 },
        { month: "Jul", sales: 420 },
        { month: "Aug", sales: 450 },
        { month: "Sep", sales: 475 },
        { month: "Oct", sales: 500 },
        { month: "Nov", sales: 525 },
        { month: "Dec", sales: 550 }
      ]
    };

    const labels = jsonData.data.map(entry => entry.month);
    const values = jsonData.data.map(entry => entry.sales);

    const configuration = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: jsonData.yLabel,
          data: values,
          backgroundColor: 'rgba(54, 162, 235, 0.6)'
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: jsonData.title,
            font: { size: 20 }
          }
        },
        scales: {
          x: { title: { display: true, text: jsonData.xLabel } },
          y: { title: { display: true, text: jsonData.yLabel }, beginAtZero: true }
        }
      }
    };

    // Render chart to buffer
    const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
    
    // Send chart as photo
    await bot.sendPhoto(chatId, buffer, { caption: '2025 Aylık Satış Grafiği' });

  } catch (error) {
    console.error('Grafik oluşturulurken hata:', error);
    bot.sendMessage(chatId, 'Grafik oluşturulurken bir hata oluştu.');
  }
});

// Add a command to draw charts from MongoDB data
bot.onText(/\/mongodbgrafik (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const collectionName = match[1];
  
  try {
    // Check MongoDB connection
    if (!isConnected || !db) {
      bot.sendMessage(chatId, '🔄 MongoDB\'ye bağlanılıyor...');
      await connectToMongo();
    }
    
    const collection = db.collection(collectionName);
    const data = await collection.find({}).toArray();
    
    if (data.length === 0) {
      bot.sendMessage(chatId, `⚠️ "${collectionName}" koleksiyonu boş.`);
      return;
    }
    
    // Analyze data to determine fields
    const firstDoc = data[0];
    const fields = Object.keys(firstDoc);
    
    // Find numeric and string fields
    const numericFields = [];
    const stringFields = [];
    
    fields.forEach(field => {
      if (typeof firstDoc[field] === 'number') {
        numericFields.push(field);
      } else if (typeof firstDoc[field] === 'string') {
        stringFields.push(field);
      }
    });
    
    if (numericFields.length === 0) {
      bot.sendMessage(chatId, '⚠️ Koleksiyonda sayısal veri bulunamadı.');
      return;
    }
    
    if (stringFields.length === 0) {
      bot.sendMessage(chatId, '⚠️ Koleksiyonda kategori verisi bulunamadı.');
      return;
    }
    
    // Use first string field as label and first numeric field as value
    const labelField = stringFields[0];
    const valueField = numericFields[0];
    
    // Prepare data for chart
    const labels = data.map(item => item[labelField]);
    const values = data.map(item => item[valueField]);
    
    const configuration = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: valueField,
          data: values,
          backgroundColor: 'rgba(54, 162, 235, 0.6)'
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: `${collectionName}: ${labelField} - ${valueField}`,
            font: { size: 20 }
          }
        },
        scales: {
          x: { title: { display: true, text: labelField } },
          y: { title: { display: true, text: valueField }, beginAtZero: true }
        }
      }
    };
    
    // Render chart to buffer
    const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
    
    // Send chart as photo
    await bot.sendPhoto(chatId, buffer, { 
      caption: `${collectionName} koleksiyonundan oluşturulan grafik: ${labelField} - ${valueField}` 
    });
    
  } catch (error) {
    console.error('MongoDB grafik oluşturulurken hata:', error);
    bot.sendMessage(chatId, `Grafik oluşturulurken bir hata oluştu: ${error.message}`);
  }
});

// Add a more flexible command to draw charts from MongoDB with field selection
bot.onText(/\/customgrafik (.+) (.+) (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const collectionName = match[1];
  const labelField = match[2];
  const valueField = match[3];
  
  try {
    // Check MongoDB connection
    if (!isConnected || !db) {
      bot.sendMessage(chatId, '🔄 MongoDB\'ye bağlanılıyor...');
      await connectToMongo();
    }
    
    const collection = db.collection(collectionName);
    const data = await collection.find({}).toArray();
    
    if (data.length === 0) {
      bot.sendMessage(chatId, `⚠️ "${collectionName}" koleksiyonu boş.`);
      return;
    }
    
    // Check if fields exist
    if (!data[0].hasOwnProperty(labelField)) {
      bot.sendMessage(chatId, `⚠️ "${labelField}" alanı bulunamadı.`);
      return;
    }
    
    if (!data[0].hasOwnProperty(valueField)) {
      bot.sendMessage(chatId, `⚠️ "${valueField}" alanı bulunamadı.`);
      return;
    }
    
    // Prepare data for chart
    const labels = data.map(item => item[labelField]);
    const values = data.map(item => item[valueField]);
    
    // Determine chart type based on data
    let chartType = 'bar';
    if (data.length > 20) {
      chartType = 'line'; // Use line chart for larger datasets
    }
    
    const configuration = {
      type: chartType,
      data: {
        labels: labels,
        datasets: [{
          label: valueField,
          data: values,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgb(54, 162, 235)',
          tension: 0.1
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: `${collectionName}: ${labelField} - ${valueField}`,
            font: { size: 20 }
          }
        },
        scales: {
          x: { title: { display: true, text: labelField } },
          y: { title: { display: true, text: valueField }, beginAtZero: true }
        }
      }
    };
    
    // Render chart to buffer
    const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
    
    // Send chart as photo
    await bot.sendPhoto(chatId, buffer, { 
      caption: `${collectionName} koleksiyonundan oluşturulan ${chartType} grafik: ${labelField} - ${valueField}` 
    });
    
  } catch (error) {
    console.error('MongoDB grafik oluşturulurken hata:', error);
    bot.sendMessage(chatId, `Grafik oluşturulurken bir hata oluştu: ${error.message}`);
  }
});

// MongoDB'den ID'leri listeleyen ve seçilen ID'ye göre grafik çizen komut
bot.onText(/\/mongoid (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const collectionName = match[1];
  
  try {
    // MongoDB bağlantısını kontrol et
    if (!isConnected || !db) {
      bot.sendMessage(chatId, '🔄 MongoDB\'ye bağlanılıyor...');
      await connectToMongo();
    }
    
    const collection = db.collection(collectionName);
    
    // Koleksiyondaki belge sayısını kontrol et
    const count = await collection.countDocuments();
    if (count === 0) {
      bot.sendMessage(chatId, `⚠️ "${collectionName}" koleksiyonu boş.`);
      return;
    }
    
    // Tüm belgelerin ID'lerini çek
    const documents = await collection.find({}, { projection: { _id: 1 } }).toArray();
    
    // ID'leri düğmeler olarak göster
    const keyboard = [];
    const rowSize = 3; // Her satırda kaç düğme olacak
    
    for (let i = 0; i < documents.length; i += rowSize) {
      const row = [];
      for (let j = 0; j < rowSize && i + j < documents.length; j++) {
        const doc = documents[i + j];
        const idStr = doc._id.toString();
        row.push({
          text: idStr.substring(0, 10) + '...', // ID'nin ilk 10 karakteri
          callback_data: `docid_${collectionName}_${idStr}`
        });
      }
      keyboard.push(row);
    }
    
    // Kullanıcıya ID listesini gönder
    bot.sendMessage(chatId, 
      `📋 *${collectionName}* koleksiyonundaki belgeler (toplam: ${count})\n\nGrafik oluşturmak için bir ID seçin:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: keyboard
        }
      }
    );
    
  } catch (error) {
    console.error('MongoDB ID listesi hatası:', error);
    bot.sendMessage(chatId, `❌ Hata: ${error.message}`);
  }
});

// Command to explore MongoDB collections and draw graphs
// bot.onText(/\/exploremongodata/, async (msg) => {
//   const chatId = msg.chat.id;
  
//   try {
//     // Check MongoDB connection
//     if (!isConnected || !db) {
//       bot.sendMessage(chatId, '🔄 Connecting to MongoDB...');
//       await connectToMongo();
//     }
    
//     // Get list of collections
//     const collections = await db.listCollections().toArray();
    
//     if (collections.length === 0) {
//       bot.sendMessage(chatId, '⚠️ No collections found in the database.');
//       return;
//     }
    
//     // Create inline keyboard with collection names
//     const keyboard = [];
//     collections.forEach(collection => {
//       keyboard.push([{
//         text: collection.name,
//         callback_data: `analyze_${collection.name}`
//       }]);
//     });
    
//     bot.sendMessage(chatId, 
//       '📊 *Available MongoDB Collections*\n\nSelect a collection to analyze and create graphs:',
//       {
//         parse_mode: 'Markdown',
//         reply_markup: {
//           inline_keyboard: keyboard
//         }
//       }
//     );
//   } catch (error) {
//     console.error('Error exploring MongoDB:', error);
//     bot.sendMessage(chatId, `❌ Error: ${error.message}`);
//   }
// });

// // Add this to your existing callback_query handler or create a new one
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  
  // Handle collection analysis
  if (data.startsWith('analyze_')) {
    const collectionName = data.substring('analyze_'.length);
    
    // Acknowledge the callback
    bot.answerCallbackQuery(callbackQuery.id, { text: `Analyzing ${collectionName}...` });
    
    try {
      // Analyze collection
      const analysis = await analyzeCollection(collectionName);
      
      if (analysis.error) {
        bot.sendMessage(chatId, `❌ Analysis error: ${analysis.error}`);
        return;
      }
      
      // Show collection info
      let message = `📊 *Collection: ${collectionName}*\n`;
      message += `Documents: ${analysis.documentCount}\n\n`;
      
      // Show field types
      if (analysis.numericFields.length > 0) {
        message += `*Numeric fields:* ${analysis.numericFields.join(', ')}\n`;
      }
      if (analysis.categoryFields.length > 0) {
        message += `*Category fields:* ${analysis.categoryFields.join(', ')}\n`;
      }
      if (analysis.dateFields.length > 0) {
        message += `*Date fields:* ${analysis.dateFields.join(', ')}\n`;
      }
      if (analysis.monthFields.length > 0) {
        message += `*Month fields:* ${analysis.monthFields.join(', ')}\n`;
      }
      
      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      
      // If no charts possible
      if (analysis.possibleCharts.length === 0) {
        bot.sendMessage(chatId, '⚠️ No suitable charts found for this collection.');
        return;
      }
      
      // Create chart selection buttons
      const chartButtons = [];
      analysis.possibleCharts.forEach((chart, index) => {
        chartButtons.push([{
          text: `${index + 1}. ${chart.name}: ${chart.description.substring(0, 30)}...`,
          callback_data: `chart_${collectionName}_${index}`
        }]);
      });
      
      // Save chart options in user state
      userStates[chatId] = {
        action: 'selectChart',
        collection: collectionName,
        charts: analysis.possibleCharts
      };
      
      bot.sendMessage(chatId, 
        '🎯 *Available Charts*\n\nSelect a chart to generate:',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: chartButtons
          }
        }
      );
    } catch (error) {
      console.error('Error analyzing collection:', error);
      bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
  }
  
  // Handle chart generation
  else if (data.startsWith('chart_')) {
    const parts = data.substring('chart_'.length).split('_');
    const collectionName = parts[0];
    const chartIndex = parseInt(parts[1]);
    
    // Acknowledge the callback
    bot.answerCallbackQuery(callbackQuery.id, { text: 'Generating chart...' });
    
    try {
      // Get user state
      const state = userStates[chatId];
      if (!state || state.action !== 'selectChart' || !state.charts) {
        bot.sendMessage(chatId, '❌ Session expired. Please start over.');
        return;
      }
      
      const selectedChart = state.charts[chartIndex];
      
      // Get data for the chart
      const collection = db.collection(collectionName);
      let chartData;
      
      // Process data based on chart type
      switch (selectedChart.type) {
        case 'bar':
        case 'pie':
          // For bar and pie charts, we need to aggregate by category
          const aggregation = await collection.aggregate([
            { $group: { 
              _id: `$${selectedChart.xAxis || selectedChart.category}`, 
              value: { $sum: `$${selectedChart.yAxis || selectedChart.value}` } 
            }},
            { $sort: { _id: 1 } }
          ]).toArray();
          
          chartData = {
            labels: aggregation.map(item => String(item._id)),
            datasets: [{
              label: selectedChart.yAxis || selectedChart.value,
              data: aggregation.map(item => item.value),
              backgroundColor: generateColors(aggregation.length)
            }]
          };
          break;
          
        case 'line':
          // For line charts, sort by date
          const timeData = await collection.find({})
            .sort({ [selectedChart.xAxis]: 1 })
            .toArray();
          
          chartData = {
            labels: timeData.map(item => {
              const date = new Date(item[selectedChart.xAxis]);
              return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
            }),
            datasets: [{
              label: selectedChart.yAxis,
              data: timeData.map(item => item[selectedChart.yAxis]),
              borderColor: 'rgb(75, 192, 192)',
              tension: 0.1
            }]
          };
          break;
          
        case 'scatter':
          // For scatter plots
          const scatterData = await collection.find({}).toArray();
          
          chartData = {
            datasets: [{
              label: `${selectedChart.xAxis} vs ${selectedChart.yAxis}`,
              data: scatterData.map(item => ({
                x: item[selectedChart.xAxis],
                y: item[selectedChart.yAxis]
              })),
              backgroundColor: 'rgba(75, 192, 192, 0.5)'
            }]
          };
          break;
          
        default:
          bot.sendMessage(chatId, `❌ Chart type '${selectedChart.type}' not implemented yet.`);
          return;
      }
      
      // Generate chart URL
      const chartUrl = generateChartUrl(selectedChart.type, chartData, {
        title: {
          display: true,
          text: selectedChart.description
        }
      });
      
      // Send chart image
      bot.sendPhoto(chatId, chartUrl, {
        caption: `${selectedChart.name}: ${selectedChart.description}`
      });
      
    } catch (error) {
      console.error('Error generating chart:', error);
      bot.sendMessage(chatId, `❌ Error generating chart: ${error.message}`);
    }
  }
});

// Helper function to generate colors for charts
function generateColors(count) {
  const colors = [
    'rgba(255, 99, 132, 0.5)',
    'rgba(54, 162, 235, 0.5)',
    'rgba(255, 206, 86, 0.5)',
    'rgba(75, 192, 192, 0.5)',
    'rgba(153, 102, 255, 0.5)',
    'rgba(255, 159, 64, 0.5)'
  ];
  
  // If we need more colors than in our predefined array
  if (count > colors.length) {
    // Generate additional random colors
    for (let i = colors.length; i < count; i++) {
      const r = Math.floor(Math.random() * 255);
      const g = Math.floor(Math.random() * 255);
      const b = Math.floor(Math.random() * 255);
      colors.push(`rgba(${r}, ${g}, ${b}, 0.5)`);
    }
  }
  
  return colors.slice(0, count);
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

// Satış raporu grafiği
bot.onText(/\/salesreport/, (msg) => {
  const chatId = msg.chat.id;

  try {
    // MongoDB koleksiyonundan veri çek (simülasyon)
    const salesData = mongoCollections.sales;

    // Verileri işle
    const months = [...new Set(salesData.map(item => item.month))];
    const products = [...new Set(salesData.map(item => item.product))];

    const datasets = products.map(product => {
      const productData = months.map(month => {
        const monthData = salesData.filter(item => item.product === product && item.month === month);
        return monthData.reduce((sum, item) => sum + item.revenue, 0) / 1000; // Bin TL cinsinden
      });

      return {
        label: product,
        data: productData,
        backgroundColor: product === 'Laptop' ? 'rgba(54, 162, 235, 0.5)' :
                         product === 'Telefon' ? 'rgba(255, 99, 132, 0.5)' :
                         'rgba(75, 192, 192, 0.5)'
      };
    });

    const data = {
      labels: months,
      datasets: datasets
    };

    // Grafik URL'si oluştur
    const chartUrl = generateChartUrl('bar', data, {
      title: {
        display: true,
        text: '2024 Ürün Satış Raporu (Bin TL)'
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Gelir (Bin TL)'
          }
        }
      }
    });

    // Grafiği gönder
    bot.sendPhoto(chatId, chartUrl, {
      caption: '2024 Ürün Satış Raporu - Veritabanından oluşturuldu'
    });
  } catch (error) {
    console.error('Grafik oluşturulurken hata:', error);
    bot.sendMessage(chatId, 'Grafik oluşturulurken bir hata oluştu.');
  }
});

// Kullanıcı trendleri grafiği
bot.onText(/\/usertrends/, (msg) => {
  const chatId = msg.chat.id;

  try {
    // MongoDB koleksiyonundan veri çek (simülasyon)
    const userData = mongoCollections.userStats;

    // Verileri işle
    const dates = userData.map(item => {
      const date = new Date(item.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });

    const data = {
      labels: dates,
      datasets: [
        {
          label: 'Yeni Kullanıcılar',
          data: userData.map(item => item.newUsers),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          yAxisID: 'y'
        },
        {
          label: 'Aktif Kullanıcılar',
          data: userData.map(item => item.activeUsers),
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          yAxisID: 'y1'
        }
      ]
    };

    // Grafik URL'si oluştur
    const chartUrl = generateChartUrl('line', data, {
      title: {
        display: true,
        text: 'Kullanıcı Trendleri'
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Yeni Kullanıcılar'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Aktif Kullanıcılar'
          },
          grid: {
            drawOnChartArea: false
          }
        }
      }
    });

    // Grafiği gönder
    bot.sendPhoto(chatId, chartUrl, {
      caption: 'Kullanıcı Trendleri - Veritabanından oluşturuldu'
    });
  } catch (error) {
    console.error('Grafik oluşturulurken hata:', error);
    bot.sendMessage(chatId, 'Grafik oluşturulurken bir hata oluştu.');
  }
});

// Hava durumu trendleri grafiği
bot.onText(/\/weathertrends/, (msg) => {
  const chatId = msg.chat.id;

  try {
    // MongoDB koleksiyonundan veri çek (simülasyon)
    const weatherData = mongoCollections.weatherData;

    // Verileri işle
    const cities = [...new Set(weatherData.map(item => item.city))];
    const dates = [...new Set(weatherData.map(item => item.date))].map(date => {
      const d = new Date(date);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    });

    const datasets = cities.map(city => {
      const cityData = weatherData.filter(item => item.city === city);
      return {
        label: `${city} Sıcaklık`,
        data: cityData.map(item => item.temperature),
        borderColor: city === 'İstanbul' ? 'rgb(255, 99, 132)' : 'rgb(54, 162, 235)',
        backgroundColor: city === 'İstanbul' ? 'rgba(255, 99, 132, 0.5)' : 'rgba(54, 162, 235, 0.5)',
        tension: 0.1
      };
    });

    const data = {
      labels: dates,
      datasets: datasets
    };

    // Grafik URL'si oluştur
    const chartUrl = generateChartUrl('line', data, {
      title: {
        display: true,
        text: 'Şehirlere Göre Sıcaklık Değişimi'
      },
      scales: {
        y: {
          title: {
            display: true,
            text: 'Sıcaklık (°C)'
          }
        }
      }
    });

    // Grafiği gönder
    bot.sendPhoto(chatId, chartUrl, {
      caption: 'Şehirlere Göre Sıcaklık Değişimi - Veritabanından oluşturuldu'
    });
  } catch (error) {
    console.error('Grafik oluşturulurken hata:', error);
    bot.sendMessage(chatId, 'Grafik oluşturulurken bir hata oluştu.');
  }
});

// MongoDB'den veri çekip grafik oluşturma fonksiyonu
async function createChartFromMongoDB(chatId, collectionName, chartConfig) {
  try {
    // Bağlantı durumunu kontrol et
    if (!isConnected || !db) {
      await connectToMongo();
    }

    const collection = db.collection(collectionName);

    // Grafik türüne göre veri çekme ve işleme
    let chartData = {};
    let chartOptions = {};

    // İşlem başladığını bildir
    bot.sendMessage(chatId, `"${collectionName}" koleksiyonundan ${chartConfig.name} oluşturuluyor...`);

    if (chartConfig.type === 'bar') {
      // Kategori bazlı çubuk grafik için veri çekme (group by)
      const pipeline = [
        {
          $group: {
            _id: `$${chartConfig.xAxis}`,
            value: { $sum: `$${chartConfig.yAxis}` }
          }
        },
        {
          $sort: { _id: 1 }
        },
        {
          $limit: 20 // En fazla 20 kategori göster
        }
      ];

      const aggregationResult = await collection.aggregate(pipeline).toArray();

      const labels = aggregationResult.map(item => String(item._id));
      const values = aggregationResult.map(item => item.value);

      chartData = {
        labels: labels,
        datasets: [
          {
            label: chartConfig.yAxis,
            data: values,
            backgroundColor: 'rgba(54, 162, 235, 0.5)'
          }
        ]
      };

      chartOptions = {
        title: {
          display: true,
          text: `${chartConfig.xAxis} - ${chartConfig.yAxis} Grafiği`
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: chartConfig.yAxis
            }
          },
          x: {
            title: {
              display: true,
              text: chartConfig.xAxis
            }
          }
        }
      };
    } else if (chartConfig.type === 'pie') {
      // Pasta grafik için veri çekme (group by)
      const pipeline = [
        {
          $group: {
            _id: `$${chartConfig.category}`,
            value: { $sum: `$${chartConfig.value}` }
          }
        },
        {
          $sort: { value: -1 } // Değere göre azalan sıralama
        },
        {
          $limit: 10 // En fazla 10 dilim göster
        }
      ];

      const aggregationResult = await collection.aggregate(pipeline).toArray();

      const labels = aggregationResult.map(item => String(item._id));
      const values = aggregationResult.map(item => item.value);

      // Renk paleti oluştur
      const colors = [
        'rgba(255, 99, 132, 0.7)',
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)',
        'rgba(255, 159, 64, 0.7)',
        'rgba(199, 199, 199, 0.7)',
        'rgba(83, 102, 255, 0.7)',
        'rgba(78, 205, 196, 0.7)',
        'rgba(232, 65, 24, 0.7)'
      ];

      chartData = {
        labels: labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors.slice(0, labels.length)
          }
        ]
      };

      chartOptions = {
        title: {
          display: true,
          text: `${chartConfig.category} - ${chartConfig.value} Dağılımı`
        },
        legend: {
          position: 'right'
        }
      };
    } else if (chartConfig.type === 'line') {
      // Zaman serisi için veri çekme
      const documents = await collection.find({})
        .sort({ [chartConfig.xAxis]: 1 })
        .limit(100) // En fazla 100 veri noktası
        .toArray();

      const labels = documents.map(doc => {
        let dateValue = doc[chartConfig.xAxis];

        // Tarih formatını kontrol et
        if (typeof dateValue === 'string') {
          const date = new Date(dateValue);
          return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
        } else if (dateValue instanceof Date) {
          return `${dateValue.getDate()}/${dateValue.getMonth() + 1}/${dateValue.getFullYear()}`;
        } else {
          return String(dateValue);
        }
      });

      const values = documents.map(doc => doc[chartConfig.yAxis]);

      chartData = {
        labels: labels,
        datasets: [
          {
            label: chartConfig.yAxis,
            data: values,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            fill: true,
            tension: 0.2
          }
        ]
      };

      chartOptions = {
        title: {
          display: true,
          text: `${chartConfig.yAxis} Zaman Serisi`
        },
        scales: {
          y: {
            title: {
              display: true,
              text: chartConfig.yAxis
            }
          },
          x: {
            title: {
              display: true,
              text: chartConfig.xAxis
            }
          }
        }
      };
    } else if (chartConfig.type === 'scatter') {
      // Dağılım grafiği için veri çekme
      const documents = await collection.find({})
        .limit(200) // En fazla 200 veri noktası
        .toArray();

      const data = documents.map(doc => ({
        x: doc[chartConfig.xAxis],
        y: doc[chartConfig.yAxis]
      })).filter(point => point.x !== undefined && point.y !== undefined);

      chartData = {
        datasets: [
          {
            label: `${chartConfig.xAxis} - ${chartConfig.yAxis}`,
            data: data,
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            pointRadius: 5,
            pointHoverRadius: 7
          }
        ]
      };

      chartOptions = {
        title: {
          display: true,
          text: `${chartConfig.xAxis} - ${chartConfig.yAxis} Dağılım Grafiği`
        },
        scales: {
          x: {
            title: {
              display: true,
              text: chartConfig.xAxis
            }
          },
          y: {
            title: {
              display: true,
              text: chartConfig.yAxis
            }
          }
        }
      };
    } else if (chartConfig.type === 'histogram') {
      // Histogram için veri çekme
      const documents = await collection.find({})
        .limit(1000) // En fazla 1000 veri noktası
        .toArray();

      const values = documents.map(doc => doc[chartConfig.value])
        .filter(value => value !== undefined && value !== null);

      // Veri aralıklarını belirle
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min;
      const binCount = Math.min(20, Math.ceil(Math.sqrt(values.length))); // Bin sayısı
      const binWidth = range / binCount;

      // Histogram verilerini oluştur
      const bins = Array(binCount).fill(0);
      values.forEach(value => {
        const binIndex = Math.min(binCount - 1, Math.floor((value - min) / binWidth));
        bins[binIndex]++;
      });

      // Bin etiketlerini oluştur
      const labels = Array(binCount).fill(0).map((_, i) => {
        const start = min + i * binWidth;
        const end = min + (i + 1) * binWidth;
        return `${start.toFixed(1)}-${end.toFixed(1)}`;
      });

      chartData = {
        labels: labels,
        datasets: [
          {
            label: chartConfig.value,
            data: bins,
            backgroundColor: 'rgba(153, 102, 255, 0.5)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1
          }
        ]
      };

      chartOptions = {
        title: {
          display: true,
          text: `${chartConfig.value} Histogram`
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Frekans'
            }
          },
          x: {
            title: {
              display: true,
              text: chartConfig.value
            }
          }
        }
      };
    } else if (chartConfig.type === 'heatmap') {
      // Isı haritası için veri çekme
      const pipeline = [
        {
          $group: {
            _id: {
              x: `$${chartConfig.xAxis}`,
              y: `$${chartConfig.yAxis}`
            },
            count: { $sum: 1 }
          }
        }
      ];

      const aggregationResult = await collection.aggregate(pipeline).toArray();

      // Benzersiz x ve y değerlerini bul
      const xValues = [...new Set(aggregationResult.map(item => item._id.x))].sort();
      const yValues = [...new Set(aggregationResult.map(item => item._id.y))].sort();

      // Veri matrisini oluştur
      const data = [];
      yValues.forEach((y, yIndex) => {
        xValues.forEach((x, xIndex) => {
          const item = aggregationResult.find(item => item._id.x === x && item._id.y === y);
          data.push({
            x: xIndex,
            y: yIndex,
            v: item ? item.count : 0
          });
        });
      });

      // Özel bir grafik türü olduğu için, QuickChart'ın özel formatını kullanıyoruz
      const chartUrl = `https://quickchart.io/chart?c={
        type:'heatmap',
        data:{
          labels:${JSON.stringify(xValues)},
          datasets:[{
            label:'${chartConfig.yAxis}',
            data:${JSON.stringify(data)},
            yLabels:${JSON.stringify(yValues)}
          }]
        },
        options:{
          title:{
            display:true,
            text:'${chartConfig.xAxis} - ${chartConfig.yAxis} Isı Haritası'
          },
          scales:{
            x:{
              title:{
                display:true,
                text:'${chartConfig.xAxis}'
              }
            },
            y:{
              title:{
                display:true,
                text:'${chartConfig.yAxis}'
              }
            }
          },
          plugins:{
            colorschemes:{
              scheme:'brewer.YlOrRd9'
            }
          }
        }
      }`;

      // Grafiği gönder
      bot.sendPhoto(chatId, chartUrl, {
        caption: `${collectionName} koleksiyonundan oluşturulan ${chartConfig.name}`
      });

      return true;
    }

    // Heatmap dışındaki grafikler için URL oluştur
    if (chartConfig.type !== 'heatmap') {
      // Grafik URL'si oluştur
      const chartUrl = generateChartUrl(chartConfig.type, chartData, chartOptions);

      // Grafiği gönder
      bot.sendPhoto(chatId, chartUrl, {
        caption: `${collectionName} koleksiyonundan oluşturulan ${chartConfig.name}`
      });
    }

    // Grafik hakkında ek bilgi gönder
    const recordCount = chartData.labels ? chartData.labels.length :
                       (chartData.datasets && chartData.datasets[0].data ? chartData.datasets[0].data.length : 0);

    bot.sendMessage(chatId,
      `📊 *Grafik Bilgileri*\n\n` +
      `*Koleksiyon:* ${collectionName}\n` +
      `*Grafik Türü:* ${chartConfig.name}\n` +
      `*Veri Noktası Sayısı:* ${recordCount}\n` +
      `*Kullanılan Alanlar:* ${Object.entries(chartConfig)
        .filter(([key, _]) => ['xAxis', 'yAxis', 'category', 'value'].includes(key) && chartConfig[key])
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')}`,
      { parse_mode: 'Markdown' }
    );

    return true;
  } catch (error) {
    console.error('MongoDB grafik oluşturma hatası:', error);
    bot.sendMessage(chatId, `Grafik oluşturulurken bir hata oluştu: ${error.message}`);
    return false;
  }
}

// Metin mesajlarını işle
bot.on('message', async (msg) => {
  // Sadece metin mesajlarını işle, diğer mesaj türleri için ayrı işleyiciler var
  if (!msg.text || msg.text.startsWith('/')) return;

  const chatId = msg.chat.id;

  // Kullanıcı durumunu kontrol et
  if (userStates[chatId] && userStates[chatId].action === 'selectChart') {
    const userState = userStates[chatId];
    const chartIndex = parseInt(msg.text) - 1;

    if (isNaN(chartIndex) || chartIndex < 0 || chartIndex >= userState.analysis.possibleCharts.length) {
      bot.sendMessage(chatId, 'Geçersiz seçim. Lütfen listeden bir numara seçin.');
      return;
    }

    const selectedChart = userState.analysis.possibleCharts[chartIndex];
    bot.sendMessage(chatId, `"${selectedChart.name}" oluşturuluyor...`);

    // Grafiği oluştur
    await createChartFromMongoDB(chatId, userState.collection, selectedChart);

    // Kullanıcı durumunu temizle
    delete userStates[chatId];
    return;
  }

  try {
    // Kullanıcıya yazıyor... mesajı gönder
    bot.sendChatAction(chatId, 'typing');

    // Mastra API'ye istek gönderme fonksiyonu
    const sendRequestToMastra = async (retryCount = 0, maxRetries = 3) => {
      try {
        console.log(`Mastra API'ye istek gönderiliyor (deneme ${retryCount + 1}/${maxRetries + 1})...`);

        // Mastra API'ye istek gönder
        const response = await fetch(`${MASTRA_API_URL}/agents/default/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'user',
                content: msg.text
              }
            ]
          }),
          timeout: 10000 // 10 saniye zaman aşımı
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Yanıt metni alınamadı');
          throw new Error(`API hatası: ${response.status} ${response.statusText} - ${errorText}`);
        }

        return await response.json();
      } catch (error) {
        // Eğer maksimum yeniden deneme sayısına ulaşılmadıysa, yeniden dene
        if (retryCount < maxRetries) {
          console.log(`Mastra API hatası, yeniden deneniyor (${retryCount + 1}/${maxRetries})...`);
          // Üstel geri çekilme ile bekle (1s, 2s, 4s, ...)
          const waitTime = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return sendRequestToMastra(retryCount + 1, maxRetries);
        }

        // Maksimum yeniden deneme sayısına ulaşıldıysa, hatayı yeniden fırlat
        throw error;
      }
    };

    // Mastra API'ye istek gönder
    const result = await sendRequestToMastra();

    // Yanıtı gönder
    bot.sendMessage(chatId, result.text || 'Yanıt alınamadı', { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Metin mesajı işlenirken hata:', error);

    // Kullanıcıya daha kullanıcı dostu bir hata mesajı gönder
    bot.sendMessage(
      chatId,
      'Üzgünüm, şu anda Mastra API ile iletişim kurarken bir sorun yaşıyorum. ' +
      'Lütfen daha sonra tekrar deneyin veya başka bir komut kullanın.\n\n' +
      'Alternatif olarak, grafik analizi için bir görsel gönderebilir veya ' +
      'MongoDB veritabanı komutlarını kullanabilirsiniz (/collections, /analyze).'
    );
  }
});

// Fotoğrafları işle
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;

  try {
    // En büyük boyutlu fotoğrafı al
    const photo = msg.photo[msg.photo.length - 1];
    const fileId = photo.file_id;

    // Kullanıcıya işleniyor mesajı gönder
    bot.sendMessage(chatId, 'Grafik analiz ediliyor, lütfen bekleyin...');
    bot.sendChatAction(chatId, 'typing');

    // Dosyayı indir
    const fileInfo = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;

    // Dosyayı indir
    const response = await fetch(fileUrl);
    const buffer = await response.buffer();

    // Base64'e dönüştür
    const base64Data = buffer.toString('base64');
    const mimeType = 'image/jpeg'; // Telegram genellikle JPEG formatında gönderir
    const imageData = `data:${mimeType};base64,${base64Data}`;

    // Gemini API için istek gövdesi
    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Bu grafiği analiz et ve türünü belirle.' }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    };

    // Görüntü verisini ekle
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

    // Gemini API'ye istek gönder
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text();
      throw new Error(`Gemini API hatası: ${geminiResponse.status} ${errorData}`);
    }

    const result = await geminiResponse.json();

    // Yanıtı işle
    if (!result.candidates || result.candidates.length === 0) {
      throw new Error('Gemini API yanıt vermedi');
    }

    const content = result.candidates[0].content;

    if (!content || !content.parts || content.parts.length === 0) {
      throw new Error('Gemini API yanıtı boş');
    }

    // Yanıtı gönder
    bot.sendMessage(chatId, content.parts[0].text, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Fotoğraf işlenirken hata:', error);
    bot.sendMessage(chatId, `Üzgünüm, grafiği analiz ederken bir hata oluştu: ${error.message}`);
  }
});

export default bot;
