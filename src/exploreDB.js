import { MongoClient } from 'mongodb';

// MongoDB bağlantı URL'si
const MONGODB_URI = 'mongodb://2.59.119.114:52026/MastraMonger';

// MongoDB'ye bağlanma ve veritabanı yapısını keşfetme
async function exploreDatabase() {
  let client;
  
  try {
    console.log(`MongoDB'ye bağlanılıyor: ${MONGODB_URI}`);
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('MongoDB bağlantısı başarılı');
    
    // Veritabanını al
    const db = client.db();
    
    // Koleksiyonları listele
    console.log('\n=== KOLEKSİYONLAR ===');
    const collections = await db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('Veritabanında hiç koleksiyon bulunamadı.');
      return;
    }
    
    console.log(`Toplam ${collections.length} koleksiyon bulundu:`);
    collections.forEach((collection, index) => {
      console.log(`${index + 1}. ${collection.name}`);
    });
    
    // Her koleksiyondan örnek veri al ve yapısını incele
    console.log('\n=== KOLEKSİYON YAPILARI ===');
    
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`\n--- ${collectionName} ---`);
      
      // Koleksiyondaki belge sayısını al
      const count = await db.collection(collectionName).countDocuments();
      console.log(`Belge sayısı: ${count}`);
      
      if (count === 0) {
        console.log('Bu koleksiyon boş.');
        continue;
      }
      
      // Örnek belgeleri al (en fazla 3)
      const sampleDocs = await db.collection(collectionName).find({}).limit(3).toArray();
      
      // İlk belgenin yapısını analiz et
      if (sampleDocs.length > 0) {
        const firstDoc = sampleDocs[0];
        console.log('Şema yapısı:');
        
        // Belge alanlarını ve türlerini göster
        Object.keys(firstDoc).forEach(field => {
          const value = firstDoc[field];
          const type = Array.isArray(value) ? 'array' : typeof value;
          const additionalInfo = type === 'object' && value !== null ? 
            (value instanceof Date ? 'date' : 'object') : '';
          
          console.log(`  - ${field}: ${type}${additionalInfo ? ` (${additionalInfo})` : ''}`);
        });
        
        // Örnek veri
        console.log('\nÖrnek veri:');
        sampleDocs.forEach((doc, index) => {
          console.log(`\nÖrnek ${index + 1}:`);
          console.log(JSON.stringify(doc, null, 2).substring(0, 500) + (JSON.stringify(doc, null, 2).length > 500 ? '...' : ''));
        });
        
        // Çizilebilecek grafik türlerini belirle
        console.log('\nÇizilebilecek grafik türleri:');
        
        // Sayısal ve kategori alanlarını belirle
        const numericFields = [];
        const dateFields = [];
        const categoryFields = [];
        
        Object.keys(firstDoc).forEach(field => {
          if (field === '_id') return;
          
          const value = firstDoc[field];
          if (typeof value === 'number') {
            numericFields.push(field);
          } else if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
            dateFields.push(field);
          } else if (typeof value === 'string') {
            categoryFields.push(field);
          }
        });
        
        console.log(`  Sayısal alanlar: ${numericFields.join(', ') || 'Yok'}`);
        console.log(`  Tarih alanları: ${dateFields.join(', ') || 'Yok'}`);
        console.log(`  Kategori alanları: ${categoryFields.join(', ') || 'Yok'}`);
        
        // Grafik önerileri
        if (numericFields.length > 0) {
          if (categoryFields.length > 0) {
            console.log(`  - Çubuk Grafik: ${categoryFields[0]} kategorilerine göre ${numericFields[0]} değerleri`);
            console.log(`  - Pasta Grafik: ${categoryFields[0]} kategorilerine göre ${numericFields[0]} dağılımı`);
          }
          
          if (dateFields.length > 0) {
            console.log(`  - Çizgi Grafik: ${dateFields[0]} tarihine göre ${numericFields[0]} değişimi`);
          }
          
          if (numericFields.length > 1) {
            console.log(`  - Dağılım Grafiği: ${numericFields[0]} ve ${numericFields[1]} arasındaki ilişki`);
          }
        } else {
          console.log('  Bu koleksiyon için uygun grafik türü bulunamadı.');
        }
      }
    }
    
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\nMongoDB bağlantısı kapatıldı');
    }
  }
}

// Fonksiyonu çalıştır
exploreDatabase();
