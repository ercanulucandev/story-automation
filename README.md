# Story Automation

AI ile YouTube için 9:16 (Shorts) veya 16:9 hikaye videoları üreten yerel uygulama.

**Akış:** Senaryo (yapay zeka) → Seslendirme (ElevenLabs / OpenAI) → Görseller (Flux / Imagen, fal.ai) → Video klipler (Kling / Hailuo / Veo / Seedance, fal.ai) → Montaj + kelime vurgulu altyazı + müzik (FFmpeg)

## Kurulum

1. Node.js 20+ ve FFmpeg kurulu olmalı (`ffmpeg -version` çalışmalı).
2. `npm install`
3. `npm run dev` → http://localhost:3000
4. **Ayarlar** sayfasından API anahtarlarını gir:
   - Senaryo yapay zekası (gerekli): senaryo, başlık ve açıklama
   - fal.ai (gerekli): görsel ve video
   - ElevenLabs veya OpenAI: seslendirme

## Güvenlik

- Uygulama yerel kullanım içindir. Sunucu yalnızca `127.0.0.1` adresini dinler, ağdaki diğer cihazlar erişemez.
- API yalnızca bu bilgisayardan ve uygulamanın kendi sayfalarından gelen istekleri kabul eder. Başka sitelerden gelen istekler engellenir.
- `/api/media` yalnızca proje ve müzik klasörlerindeki video, ses ve görsel dosyalarını sunar. Ayar dosyaları asla sunulmaz.
- API anahtarları `data/settings.json` içinde saklanır ve git'e girmez. Uygulamayı internete açmayın.

## Kullanım

- **Yeni Video**: tür, dil, süre, format, görsel stil, video modeli, ses, altyazı ve müzik seçimi. Sağdaki panelde tahmini maliyet görünür.
- "Senaryoyu onaylamak istiyorum" açıksa, senaryo yazıldıktan sonra üretim durur. Sahneleri düzenleyip **Onayla ve devam et**'e basarsın.
- Proje sayfasında her sahnenin sesini, görselini veya klibini tek tek yeniden üretebilirsin. Video otomatik olarak yeniden birleştirilir.
- Arka plan müzikleri için `data/music/` klasörüne mp3/wav dosyası koy.

## Yapı

- `src/lib/catalog.ts`: türler, diller, stiller, model listeleri ve fiyatlar (yeni model eklemek için burayı düzenle)
- `src/lib/pipeline.ts`: üretim adımları ve FFmpeg montajı
- `src/lib/providers/`: senaryo, seslendirme ve görsel/video servis adapter'ları
- `src/lib/captions.ts`: TikTok tarzı ASS altyazı üretimi
- `data/`: projeler, üretilen dosyalar ve ayarlar (git'e girmez)
