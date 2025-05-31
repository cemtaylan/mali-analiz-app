# Mali Analiz - Full Stack Application

Bu proje, PDF formatındaki mali tabloları analiz eden full-stack bir uygulamadır.

## Proje Yapısı

```
mali-analiz-fullstack/
├── client/          # React frontend uygulaması
├── server/          # Node.js backend API
├── package.json     # Ana proje bağımlılıkları
└── README.md
```

## Kurulum

### Tüm bağımlılıkları yükle
```bash
npm run install-deps
```

### Geliştirme modunda çalıştır (hem frontend hem backend)
```bash
npm run dev
```

### Sadece backend çalıştır
```bash
npm run server
```

### Sadece frontend çalıştır
```bash
npm run client
```

### Production build
```bash
npm run build
```

### Production'da çalıştır
```bash
npm start
```

## Özellikler

- PDF dosyalarından mali veri çıkarma
- Gemini AI entegrasyonu
- Modern React frontend
- Express.js backend API
- Tailwind CSS ile responsive tasarım

## API Endpoints

- `POST /upload` - PDF dosyası yükle ve analiz et
- `GET /health` - API sağlık kontrolü

## Gereksinimler

- Node.js 16+
- NPM veya Yarn
- Gemini API anahtarı

## Çevre Değişkenleri

Server dizininde `.env` dosyası oluşturun:
```
GEMINI_API_KEY=your_api_key_here
PORT=5002
``` 