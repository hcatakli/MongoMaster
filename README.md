# Chart Recognizer with Telegram Bot

Bu proje, grafik görsellerini tanıyan ve analiz eden bir web uygulaması ve Telegram botu içerir.

## Özellikler

- Grafik görsellerini yükleyip analiz etme
- Grafik türünü otomatik tanıma
- Grafik verilerini yorumlama
- Telegram bot entegrasyonu ile mobil kullanım

## Kurulum

1. Projeyi klonlayın:
```
git clone <repo-url>
cd Chart-recognizer
```

2. Bağımlılıkları yükleyin:
```
npm install
```

3. Telegram Bot Token:
   - Telegram botu zaten oluşturuldu: [@DocGraphBot](https://t.me/DocGraphBot)
   - Token `src/telegramBot.js` dosyasında ayarlandı, ancak güvenlik için çevre değişkeni olarak ayarlamak daha iyi olabilir

## Kullanım

### Web Uygulaması

Web uygulamasını başlatmak için:

```
npm run web
```

Bu komut, web sunucusunu `http://localhost:3000` adresinde başlatır.

### Telegram Bot

Sadece Telegram botunu başlatmak için:

```
npm run telegram
```

Hem web uygulamasını hem de Telegram botunu birlikte çalıştırmak için:

```
npm run combined
```

### Telegram Bot Kullanımı

1. Botunuzu Telegram'da arayın ve başlatın (`/start` komutunu gönderin)
2. Bir grafik görseli gönderin - Bot görseli analiz edecek ve sonuçları gönderecektir
3. Metin mesajları gönderin - Bot sorularınızı yanıtlayacaktır

## Komutlar

- `/start` - Botu başlatır
- `/help` - Yardım mesajını gösterir

## Teknik Detaylar

Bu proje aşağıdaki teknolojileri kullanmaktadır:

- Node.js ve Express.js - Backend
- Mastra - AI entegrasyonu
- Gemini API - Görsel analizi
- node-telegram-bot-api - Telegram bot entegrasyonu

## Çevre Değişkenleri

Aşağıdaki çevre değişkenlerini ayarlayabilirsiniz:

- `TELEGRAM_BOT_TOKEN` - Telegram bot token'ı
- `GEMINI_API_KEY` - Gemini API anahtarı
- `PORT` - Web sunucusu portu (varsayılan: 3000)

## Geliştirme

Geliştirme modunda çalıştırmak için:

```
npm run dev
```

## Lisans

ISC
