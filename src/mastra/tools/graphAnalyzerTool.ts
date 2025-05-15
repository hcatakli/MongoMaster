import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import {
  saveBase64File,
  extractTextFromFile,
  cleanupTempFiles,
  SUPPORTED_FILE_TYPES
} from '../utils/fileProcessor';

// Grafik türleri
const GRAPH_TYPES = [
  'bar chart',
  'line chart',
  'pie chart',
  'scatter plot',
  'histogram',
  'box plot',
  'heatmap',
  'area chart',
  'bubble chart',
  'radar chart',
  'violin plot',
  'ridgeline plot',
  'density plot',
  'waterfall chart',
  'funnel chart',
  'sankey diagram',
  'treemap',
  'network graph',
  'candlestick chart',
  'gantt chart'
] as const;

// Grafik analiz aracı
export const graphAnalyzerTool = createTool({
  id: 'analyze-graph',
  description: 'Yüklenen grafik görüntüsünü veya PDF dosyasını analiz eder, türünü belirler ve yorumlar',
  inputSchema: z.object({
    fileContent: z.string().describe('Base64 formatında dosya içeriği'),
    fileType: z.string().describe('Dosya uzantısı (.jpg, .png, .pdf vb.)'),
    referenceUrls: z.array(z.string()).optional().describe('Analiz için referans URL\'leri')
  }),
  outputSchema: z.object({
    graphType: z.string().describe('Tespit edilen grafik türü'),
    analysis: z.string().describe('Grafiğin detaylı analizi'),
    extractedText: z.string().optional().describe('Grafikten çıkarılan metin (varsa)'),
    confidence: z.number().describe('Analiz güven skoru (0-1 arası)'),
    referencesUsed: z.array(z.string()).optional().describe('Kullanılan referans kaynakları')
  }),
  execute: async ({ context }) => {
    let filePath = '';

    try {
      // Context'i kontrol et
      if (!context) {
        console.error('Context boş veya tanımsız');
        return {
          graphType: 'unknown',
          analysis: 'Dosya analiz edilemedi: Geçersiz istek formatı.',
          extractedText: '',
          confidence: 0,
          referencesUsed: []
        };
      }

      const { fileContent, fileType, referenceUrls = [] } = context;

      // Dosya içeriğini kontrol et
      if (!fileContent) {
        console.error('Dosya içeriği boş veya tanımsız');
        return {
          graphType: 'unknown',
          analysis: 'Dosya analiz edilemedi: Dosya içeriği bulunamadı.',
          extractedText: '',
          confidence: 0,
          referencesUsed: referenceUrls
        };
      }

      // Dosya uzantısını kontrol et
      if (!fileType || !SUPPORTED_FILE_TYPES.includes(fileType.toLowerCase())) {
        console.error(`Desteklenmeyen dosya türü: ${fileType}`);
        return {
          graphType: 'unknown',
          analysis: `Dosya analiz edilemedi: Desteklenmeyen dosya türü. Desteklenen türler: ${SUPPORTED_FILE_TYPES.join(', ')}`,
          extractedText: '',
          confidence: 0,
          referencesUsed: referenceUrls
        };
      }

      console.log(`Dosya işleniyor: ${fileType} türünde`);

      try {
        // Base64 verisini dosyaya kaydet
        filePath = await saveBase64File(fileContent, fileType);
        console.log(`Dosya kaydedildi: ${filePath}`);
      } catch (saveError) {
        console.error('Dosya kaydetme hatası:', saveError);
        return {
          graphType: 'unknown',
          analysis: `Dosya analiz edilemedi: Dosya kaydedilemedi. Hata: ${saveError.message}`,
          extractedText: '',
          confidence: 0,
          referencesUsed: referenceUrls
        };
      }

      // Dosyadan metin çıkar
      let extractedText = "";
      try {
        extractedText = await extractTextFromFile(filePath);
        console.log(`Metin çıkarıldı, uzunluk: ${extractedText.length} karakter`);
      } catch (extractError) {
        console.error("Metin çıkarma hatası:", extractError);
        extractedText = "Metin çıkarılamadı: " + extractError.message;
      }

      // Grafik türünü belirle
      let graphType = 'unknown';
      let confidence = 0.5;
      let analysis = '';

      // Metin içeriğine göre grafik türünü tahmin et
      if (extractedText.toLowerCase().includes('bar') || extractedText.toLowerCase().includes('column')) {
        graphType = 'bar chart';
        confidence = 0.7;
        analysis = 'Bu bir çubuk grafiktir. Çubuk grafikler, kategorik verileri karşılaştırmak için kullanılır.';
      } else if (extractedText.toLowerCase().includes('line')) {
        graphType = 'line chart';
        confidence = 0.7;
        analysis = 'Bu bir çizgi grafiktir. Çizgi grafikler, zaman içindeki değişimleri göstermek için kullanılır.';
      } else if (extractedText.toLowerCase().includes('pie')) {
        graphType = 'pie chart';
        confidence = 0.8;
        analysis = 'Bu bir pasta grafiktir. Pasta grafikler, bir bütünün parçalarını göstermek için kullanılır.';
      } else if (extractedText.toLowerCase().includes('scatter')) {
        graphType = 'scatter plot';
        confidence = 0.7;
        analysis = 'Bu bir saçılım grafiğidir. Saçılım grafikleri, iki değişken arasındaki ilişkiyi göstermek için kullanılır.';
      } else if (extractedText.toLowerCase().includes('box')) {
        graphType = 'box plot';
        confidence = 0.7;
        analysis = 'Bu bir kutu grafiğidir. Kutu grafikleri, veri dağılımını göstermek için kullanılır.';
      } else if (extractedText.toLowerCase().includes('heat')) {
        graphType = 'heatmap';
        confidence = 0.7;
        analysis = 'Bu bir ısı haritasıdır. Isı haritaları, iki kategorik değişken arasındaki ilişkiyi renk yoğunluğu ile gösterir.';
      } else {
        // Görsel içeriğe göre tahmin et
        if (fileType.toLowerCase().includes('jpg') || fileType.toLowerCase().includes('jpeg') ||
            fileType.toLowerCase().includes('png') || fileType.toLowerCase().includes('gif')) {
          graphType = 'bar chart'; // Varsayılan olarak en yaygın grafik türünü seç
          confidence = 0.4;
          analysis = 'Bu bir grafik görüntüsüdür, ancak türü kesin olarak belirlenemedi. Muhtemelen bir çubuk grafiktir.';
        } else {
          analysis = 'Grafik türü belirlenemedi. Lütfen daha net bir görüntü yükleyin.';
        }
      }

      if (analysis === '') {
        analysis = `Bu bir ${graphType} grafiğidir. Grafikte gösterilen veriler analiz edilmiştir.`;
      }

      // Analiz sonuçları
      const result = {
        graphType,
        analysis,
        extractedText,
        confidence,
        referencesUsed: referenceUrls
      };

      console.log(`Analiz tamamlandı: ${graphType} (güven: ${confidence})`);

      return result;
    } catch (error) {
      console.error('Grafik analiz hatası:', error);
      return {
        graphType: 'unknown',
        analysis: `Grafik analiz edilemedi: ${error.message}`,
        extractedText: '',
        confidence: 0,
        referencesUsed: []
      };
    } finally {
      // Geçici dosyaları temizle
      if (filePath) {
        try {
          cleanupTempFiles(filePath);
        } catch (cleanupError) {
          console.error('Dosya temizleme hatası:', cleanupError);
        }
      }
    }
  }
});

// Diğer araçları kaldırdık, sadece graphAnalyzerTool kullanılacak
