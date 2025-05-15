import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
// PDF işleme için dinamik import kullanacağız
// import pdfParse from 'pdf-parse';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

// Desteklenen dosya türleri
export const SUPPORTED_IMAGE_TYPES = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
export const SUPPORTED_PDF_TYPES = ['.pdf'];
export const SUPPORTED_FILE_TYPES = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_PDF_TYPES];

// Geçici dosya dizini
const TEMP_DIR = path.join(process.cwd(), 'temp');

// Geçici dizini oluştur (yoksa)
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Base64 formatındaki veriyi dosyaya kaydeder
 */
export async function saveBase64File(base64Data: string, fileType: string): Promise<string> {
  try {
    if (!base64Data) {
      throw new Error('Base64 verisi boş veya tanımsız');
    }

    // Base64 önekini kaldır
    let base64Content = base64Data;

    // Eğer data:image veya data:application gibi bir önek varsa kaldır
    if (base64Data.includes('base64,')) {
      base64Content = base64Data.split('base64,')[1];
    } else {
      // Başka olası önekleri temizle
      base64Content = base64Data.replace(/^data:.*?;base64,/, '');
    }

    if (!base64Content) {
      throw new Error('Base64 içeriği çıkarılamadı');
    }

    // Dosya için benzersiz bir isim oluştur
    const hash = createHash('md5').update(base64Content).digest('hex');
    const fileName = `${hash}${fileType}`;
    const filePath = path.join(TEMP_DIR, fileName);

    // Geçici dizinin varlığını kontrol et
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    // Dosyayı kaydet
    fs.writeFileSync(filePath, Buffer.from(base64Content, 'base64'));

    // Dosyanın başarıyla oluşturulduğunu kontrol et
    if (!fs.existsSync(filePath)) {
      throw new Error('Dosya oluşturulamadı');
    }

    return filePath;
  } catch (error) {
    console.error('Base64 dosya kaydetme hatası:', error);
    throw new Error(`Dosya kaydedilemedi: ${error.message}`);
  }
}

/**
 * PDF dosyasından metin çıkarır
 */
export async function extractTextFromPdf(filePath: string): Promise<string> {
  try {
    // Dinamik olarak pdf-parse modülünü yükle
    const pdfParse = await import('pdf-parse').then(module => module.default);

    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('PDF işleme hatası:', error);
    return "PDF dosyası işlenemedi. Hata: " + error.message;
  }
}

/**
 * Görüntüden metin çıkarır (OCR)
 */
export async function extractTextFromImage(filePath: string): Promise<string> {
  try {
    // Görüntüyü işle ve optimize et
    const processedImagePath = await preprocessImage(filePath);

    // OCR işlemi
    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(processedImagePath);
    await worker.terminate();

    return text;
  } catch (error) {
    console.error('Görüntü işleme hatası:', error);
    return "Görüntü dosyası işlenemedi. Hata: " + error.message;
  }
}

/**
 * Görüntüyü OCR için optimize eder
 */
async function preprocessImage(filePath: string): Promise<string> {
  const outputPath = `${filePath}_processed.png`;

  await sharp(filePath)
    .resize(1800, null, { fit: 'inside' }) // Boyutu ayarla
    .sharpen() // Keskinleştir
    .normalize() // Kontrastı normalize et
    .toFile(outputPath);

  return outputPath;
}

/**
 * Dosya türünü belirler
 */
export function getFileType(filePath: string): 'image' | 'pdf' | 'unsupported' {
  const ext = path.extname(filePath).toLowerCase();

  if (SUPPORTED_IMAGE_TYPES.includes(ext)) {
    return 'image';
  } else if (SUPPORTED_PDF_TYPES.includes(ext)) {
    return 'pdf';
  }

  return 'unsupported';
}

/**
 * Dosyadan metin çıkarır (PDF veya görüntü)
 */
export async function extractTextFromFile(filePath: string): Promise<string> {
  const fileType = getFileType(filePath);

  switch (fileType) {
    case 'pdf':
      return extractTextFromPdf(filePath);
    case 'image':
      return extractTextFromImage(filePath);
    default:
      throw new Error(`Desteklenmeyen dosya türü: ${path.extname(filePath)}`);
  }
}

/**
 * Geçici dosyaları temizler
 */
export function cleanupTempFiles(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // İşlenmiş görüntü dosyasını da temizle
    const processedPath = `${filePath}_processed.png`;
    if (fs.existsSync(processedPath)) {
      fs.unlinkSync(processedPath);
    }
  } catch (error) {
    console.error('Dosya temizleme hatası:', error);
  }
}
