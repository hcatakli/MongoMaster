import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// __dirname için
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Renk kodları
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
};

// Log fonksiyonu
function log(prefix, message, color = colors.white) {
  const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
  console.log(`${color}[${timestamp}] [${prefix}]${colors.reset} ${message}`);
}

// Hata log fonksiyonu
function logError(prefix, message) {
  log(prefix, message, colors.red);
}

// Başarı log fonksiyonu
function logSuccess(prefix, message) {
  log(prefix, message, colors.green);
}

// Bilgi log fonksiyonu
function logInfo(prefix, message) {
  log(prefix, message, colors.cyan);
}

// Uyarı log fonksiyonu
function logWarning(prefix, message) {
  log(prefix, message, colors.yellow);
}

// Süreç başlatma fonksiyonu
function startProcess(command, args, name, options = {}) {
  return new Promise((resolve, reject) => {
    logInfo(name, `Başlatılıyor: ${command} ${args.join(' ')}`);
    
    const process = spawn(command, args, {
      stdio: 'pipe',
      shell: true,
      ...options
    });
    
    process.stdout.on('data', (data) => {
      const lines = data.toString().trim().split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          log(name, line);
        }
      });
    });
    
    process.stderr.on('data', (data) => {
      const lines = data.toString().trim().split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          logError(name, line);
        }
      });
    });
    
    process.on('error', (error) => {
      logError(name, `Başlatma hatası: ${error.message}`);
      reject(error);
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        logSuccess(name, `Süreç başarıyla tamamlandı (kod: ${code})`);
      } else {
        logWarning(name, `Süreç sonlandı (kod: ${code})`);
      }
      resolve(code);
    });
    
    return process;
  });
}

// Tüm servisleri başlat
async function startAllServices() {
  try {
    // Başlık göster
    console.log(`
${colors.cyan}╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║  ${colors.yellow}Chart Recognizer - Tüm Servisler${colors.cyan}                           ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}
`);
    
    // Geçici klasörü oluştur
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      logInfo('SYSTEM', 'Geçici klasör oluşturuldu: ' + tempDir);
    }
    
    // .mastra klasörünü temizle (eğer kilitliyse)
    const mastraDir = path.join(path.dirname(__dirname), '.mastra');
    if (fs.existsSync(mastraDir)) {
      try {
        fs.rmSync(mastraDir, { recursive: true, force: true });
        logInfo('SYSTEM', '.mastra klasörü temizlendi');
      } catch (error) {
        logWarning('SYSTEM', '.mastra klasörü temizlenemedi: ' + error.message);
      }
    }
    
    // Mastra'yı başlat
    logInfo('MASTRA', 'Mastra başlatılıyor...');
    const mastraProcess = startProcess('npx', ['mastra', 'dev'], 'MASTRA');
    
    // Web sunucusunu başlat
    logInfo('SERVER', 'Web sunucusu başlatılıyor...');
    const serverProcess = startProcess('node', ['src/server.js'], 'SERVER');
    
    // Telegram botunu başlat
    logInfo('TELEGRAM', 'Telegram botu başlatılıyor...');
    const telegramProcess = startProcess('node', ['src/telegramBot.js'], 'TELEGRAM');
    
    // Tüm süreçleri bekle
    await Promise.all([mastraProcess, serverProcess, telegramProcess]);
    
    logSuccess('SYSTEM', 'Tüm servisler başlatıldı!');
    logInfo('SYSTEM', 'Web arayüzü: http://localhost:3000');
    logInfo('SYSTEM', 'Chat arayüzü: http://localhost:3000/chat');
    logInfo('SYSTEM', 'Telegram bot: @DocGraphBot');
    
    // Çıkış işleyicisi
    process.on('SIGINT', async () => {
      logWarning('SYSTEM', 'Kapatma sinyali alındı, tüm servisler sonlandırılıyor...');
      process.exit(0);
    });
    
  } catch (error) {
    logError('SYSTEM', `Hata: ${error.message}`);
    process.exit(1);
  }
}

// Başlat
startAllServices();
