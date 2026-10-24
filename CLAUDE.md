# Family Bookshop — Claude talimatları

## Firestore kuralları

- `firestore.rules` her değiştiğinde veya yeni bir Firestore kuralı eklendiğinde kullanıcıya "Kuralları deploy edeyim mi?" diye sor. Onay verirse şu komutu sen çalıştır; onay vermeden asla deploy etme:

  ```
  firebase deploy --only firestore:rules
  ```

- `js/` dosyalarındaki veritabanı sorgularının (okuma, yazma, batch işlemleri, alan adları) `firestore.rules` güvenlik kurallarıyla her zaman birbiriyle tam uyumlu olduğunu kontrol et. Yazmaların çoğu `js/logic.js` (bölüm 5) içinde, canlı okumalar (`SYNC`) `js/app.js` içinde.
- Siteye girebilen e-posta listesi iki yerde sabit yazılı ve birebir aynı olmalı: `js/core.js` → `ALLOWED_EMAILS`, `firestore.rules` → `allowedEmails()`. Birini değiştirirken diğerini de değiştir ve kural deploy'unu hatırlat.

## Dosya haritası

Derleme adımı yok. Tüm JS dosyaları **normal (modül olmayan) `<script defer>`** dosyalarıdır, `import`/`export` kullanılmaz. En üst seviyedeki `const`/`let`/`function` tanımları global olduğu için dosyalar birbirinin değişken ve fonksiyonlarını doğrudan kullanır. Bölüm numaraları (0–21) kod içindeki `/* ===== N) BAŞLIK ===== */` başlıklarıdır.

| Dosya | İçerik |
|---|---|
| `index.html` | `<head>` (Firebase/Tailwind CDN, `tailwind.config`), HTML iskeleti (giriş ekranı, navbar, profil paneli, sayfa `<section>`'ları, footer, modal kökleri), script/link etiketleri |
| `css/styles.css` | Özel CSS: animasyonlar, vitrinler, konfeti, şimşek, ghost-title |
| `js/core.js` | 0) Firebase + `ALLOWED_EMAILS` · 1) veri önbellek dizileri · 1.1) örnek katalog (`SEED_*`) · ayarlar ve `state` · 2) sabitler ve yardımcılar (`$`, `format*`, `escapeHTML`, `isAdmin`…) · 6–7) menü, rozetler, SPA yönlendirme (`PAGE_RENDERERS`, `router`) · 14) modal altyapısı · 18–19) aç/kapa ve canlı sayaç (`tick`) |
| `js/logic.js` | 3) kiralama + reyting yardımcıları · 4) günün indirimleri motoru, vitrin/yeni kitap indirimi hesapları · 5) Firestore yazmaları, puan/kupon hesapları, liderlik |
| `js/home.js` | 8) Ana sayfa: istatistik kartları, yeni kitap vitrini, vitrin indirimleri, günün indirimleri, son kiralananlar |
| `js/books.js` | 9) Kitaplar sayfası · 9.1) Kiralananlar sayfası · kitap detay modalı, kiralama (`rentBook`), fiyat logu modalı, filtre yardımcıları · 11) Fiyat değişimleri logu sayfası |
| `js/users-news.js` | 10) Kullanıcılar: liderlik tablosu ve istatistik pencereleri · 12) Duyurular (haberler + güncellemeler) |
| `js/shop.js` | 12.5) Hediyelerim: puan ve kuponlar · 13) Özel teklifler |
| `js/admin.js` | 15) Admin formları (kitap, fiyat, sürüm notu, kiralama iptali, kategoriler, duyuru, teklif, kapak yükleme) · 17.1) örnek kataloğu Firestore'a taşıma |
| `js/account.js` | 16–17) rol yönetimi, profil menüsü, bakiye paneli · 17.05) geri bildirim · 17.06) iade · 17.0) Profilim |
| `js/app.js` | 20) olay dinleyicileri (`bindEvents`) · 21) kimlik doğrulama, canlı senkron (`SYNC`, `startSync`), footer, `init` + `DOMContentLoaded` |

**Yükleme sırası** (index.html'de bu sırayla): `core → logic → home → books → users-news → shop → admin → account → app`.

## Yeni kod hangi dosyaya yazılır

- Yeni bir sayfanın veya sayfa özelliğinin render/modal kodu o sayfanın dosyasına yazılır (yukarıdaki tablo). Yeni sayfa: `index.html`'e `<section id="page-…">`, `core.js`'de `ROUTES` + `PAGE_RENDERERS`, render fonksiyonu kendi konusunun dosyasına.
- Firestore'a yazan ortak işlemler ve iş kuralları (fiyat, indirim, puan, kupon hesabı) → `js/logic.js`.
- Birden çok dosyada kullanılan küçük yardımcılar, sabitler, ikonlar → `js/core.js` (bölüm 2).
- Admin'e özel ekleme/düzenleme formları → `js/admin.js`.
- Profil paneli, geri bildirim, iade, hesap ayarları → `js/account.js`.
- Yeni canlı koleksiyon: önbellek dizisi `core.js`'e (bölüm 1), `SYNC` kaydı `app.js`'e, kuralı `firestore.rules`'a.
- Yeni olay dinleyicisi (`data-…` tıklamaları) → `js/app.js` → `bindEvents`.
- CSS → `css/styles.css`. Tailwind sınıfları HTML/JS içinde kalır.

**Dosya yükleme kuralları (aksi halde "is not defined" hatası):**
- Fonksiyonların **içinde** başka bir dosyadaki her şey kullanılabilir. Bu kodlar sayfa yüklendikten sonra çalışır.
- Dosyanın **en üst seviyesinde, yükleme anında çalışan** kod (ör. `const X = foo();`, `const Y = [BAR, …]`) sadece **daha önce yüklenen** dosyalardaki veya aynı dosyada daha yukarıdaki tanımları kullanabilir. `function` tanımları başka dosyaya taşınınca hoisting ile öne gelmez.
- Aynı global ad iki dosyada tanımlanamaz (`const`/`let` için tarayıcı hata verir).
- Bir JS veya CSS dosyası değişince `index.html`'deki **tüm** `?v=N` sürümlerini birer artır ki tarayıcı eski dosyayı kullanmasın.
