  /* ==========================================================
     0) FIREBASE (Auth + Firestore · compat SDK)
     ----------------------------------------------------------
     • Web yapılandırması gizli değildir; güvenliği firestore.rules sağlar.
     • OWNER_EMAIL: ilk girişte otomatik Admin olan hesap.
       firestore.rules içindeki isOwner() ile aynı olmalı.
     ========================================================== */
  const firebaseConfig = {
    apiKey: 'AIzaSyBjzTroOLcd-KcivXB3kR9hlAyuHYbDDxA',
    authDomain: 'family-bookshop.firebaseapp.com',
    projectId: 'family-bookshop',
    storageBucket: 'family-bookshop.firebasestorage.app',
    messagingSenderId: '220079451000',
    appId: '1:220079451000:web:93f2334c704e4e9152768d'
  };
  const OWNER_EMAIL = 'tolga.kagan2017@gmail.com';
  /* Siteye girebilen hesaplar (küçük harf). firestore.rules → allowedEmails() ile aynı olmalı;
     asıl koruma kurallardadır, buradaki liste yalnızca anlaşılır bir "izin yok" ekranı içindir. */
  const ALLOWED_EMAILS = [
    'tolga.kagan2017@gmail.com',
    'duraksenay81@gmail.com',
    'tolga.durak2020@gmail.com',
    'durakceylin167@gmail.com'
  ];
  const isAllowedEmail = (email) => ALLOWED_EMAILS.includes(String(email || '').trim().toLowerCase());

  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  // Tarayıcı önbelleği (IndexedDB): 30 dk içindeki yenilemelerde yalnızca değişen belgeler okunur (kota tasarrufu).
  // Desteklenmezse (gizli pencere vb.) eskisi gibi önbelleksiz çalışır
  db.enablePersistence({ synchronizeTabs: true }).catch((e) => console.warn('[persistence]', e.code));
  const FieldValue = firebase.firestore.FieldValue;
  const Timestamp = firebase.firestore.Timestamp;
  const col = (name) => db.collection(name);
  const bookRef = (id) => col('books').doc(String(id));

  /* ==========================================================
     1) VERİ ÖNBELLEĞİ (Firestore onSnapshot ile doldurulur)
     ----------------------------------------------------------
     Uygulamanın geri kalanı bu dizileri okur; yazma işlemleri
     Firestore'a gider ve dinleyiciler dizileri günceller.
     ========================================================== */
  const DAY_MS = 864e5;
  const HOUR_MS = 36e5;
  const NOW_MS = Date.now();
  const isoAt = (ms) => new Date(ms).toISOString();

  /* users/{uid} · role: 'admin' (Admin) | 'member' (Kullanıcı) | 'observer' (Gözlemci)
     lastTx / lastTxType ('rental' | 'package'): son ödeme · güvenlik kuralı bakiye düşüşünü bununla doğrular */
  const users = [];
  const bookTypes = [];      // bookTypes/{id}  · order alanına göre sıralı
  const books = [];          // books/{id}      · id sayısal, belge adı String(id) · Müze'dekiler hariç
  /* books/{id} içinde museum: true olanlar · kitaplıkta kiralanamaz (museumType, museumAt) · exhibitable: false → asla sergilenemez
     · exhibitUntil (Timestamp, seçilen gün 10:00) + exhibitUntilBy (ayarlayan Admin): son sergilenebilme anı ·
       gelince siteyi açan ilk kişi (herkes) kitabı Sergilenemez yapar ve Bilgilendirme duyurusunu atar (kural denetler)
     Müze Vitrini'ndeyken (sergide) kitapta: exhibitId, exhibitPrice, exhibitEndsAt (Timestamp) · bu süre boyunca kiralanabilir ve puanlanabilir */
  const museumBooks = [];
  /* museumExhibits/{id} · sergi geçmişi: { bookId, price, rentalDays, startAt (ISO), endsAt (Timestamp), endedAt (ISO | null), createdBy } */
  const museumExhibits = [];
  const rentals = [];        // rentals/{id}
  const offerPurchases = []; // offerPurchases/{id}
  const priceLogs = [];      // priceLogs/{id}
  const announcements = [];  // announcements/{id}
  const offers = [];         // offers/{id}
  const discounts = [];      // discounts/{bookId} · Vitrin İndirimi (Admin seçer): { bookId, name, rate (1–100), endsAt, createdAt, createdBy }
  const ratings = [];        // ratings/{bookId_userId} · { bookId, userId, score (1–5), rentalId, createdAt, updatedAt }
  const couponShop = [];     // couponShop/{id} · Admin'in mağaza kuponu: { type, value, free (Al-Öde), name, cost, endsAt|null, createdAt, createdBy }
  const coupons = [];        // coupons/{id} · alınan kupon: { userId, shopId, type, value, free, name, cost, boughtAt, expiresAt, usedAt, rentalIds, bookIds, freeBookIds, paidTotal }
  /* bookThemes/{id} · tema (etiket): { label, emoji, color ('#rrggbb'), order } · kitapta themes: [temaId…] ·
     'kis-sezonu' sabit temadır (silinemez, Kış Fırsatları'na yalnızca bu temadaki kitaplar girer) */
  const bookThemes = [];
  /* winterDeals/{bookId} · Kış Fırsatları indirimi: { bookId, rate (0 | 15 | 25 | 50), updatedAt, updatedBy } ·
     Kış Sezonu temalı her kitap vitrinde görünür; kaydı yoksa indirimsizdir */
  const winterDeals = [];
  /* giftClaims/{boxId_gün_uid} · Hediye Kutusu'ndan alınan günlük ödül: { userId, boxId, day (1–7), reward, claimedAt } */
  const giftClaims = [];
  /* settings/{id} · 'giftBox': Hediye Kutusu { enabled, boxId, startAt, day2At (Timestamp), rewards: [7 ödül] } ·
     'deals': { pinDay, pinGroup, pinAt, removedDay, removedIds } · 'showcase': Vitrin Ayarları
     'season': { active: 'winter' | null, endsAt (Timestamp | null), startedAt (ISO, sezon açıldığı an) } */
  const appSettings = [];
  /* feedback/{id} · { userId, type, message, createdAt, status ('open'|'answered'), replies: [{ by, text, at }],
     adminSeen, lastReplyAt, userSeenAt } · üye yalnızca kendininkini, Admin hepsini okur (ayrı dinleyici) */
  const feedbacks = [];
  /* refunds/{rentalId} · iade talebi: { userId, rentalId, bookId, amount, reason, createdAt, status ('pending'|'approved'|'rejected'),
     decidedAt, decidedBy, adminNote, userSeenAt } · üye yalnızca kendininkini, Admin hepsini okur (ayrı dinleyici) */
  const refunds = [];
  /* giftCheques/{id} · Admin'in gönderdiği ₺ hediye çeki: { userId, amount, cost (0 = ücretsiz, >0 = puanla açılır), name,
     createdAt, createdBy, expiresAt, openedAt, seenAt, usedAt, rentalId } · üye yalnızca kendininkini, Admin hepsini okur (ayrı dinleyici) */
  const giftCheques = [];

  /* ==========================================================
     1.1) ÖRNEK KATALOG (Admin panelinden bir kez Firestore'a yüklenir)
     ========================================================== */

  /* Kitap türleri · color: '#rrggbb' (renk seçiciyle) · eski kayıtlarda palette: TYPE_PALETTES anahtarı
     inDeals: false → bu türdeki kitaplar günlük indirim döngüsüne girmez
     Günün İndirimleri yalnızca Seri kitaplar üzerinden döner. */
  const SEED_TYPES = [
    { id: 'seri',  label: 'Seri',  palette: 'blue',   inDeals: true },
    { id: 'album', label: 'Albüm', palette: 'violet', inDeals: false }
  ];

  /* Kitaplar (yazarı Admin · authorId yüklenirken Admin'in uid'si olur)
     type: bookTypes[].id
     id: sayısal ve artan (belge adı)
     seriesNo: kaçıncı seri · Günün İndirimleri sırası ve oranı buna göre (yalnızca indirim türlerinde)
     releaseDate: çıkış tarihi · liste sıralaması, çıkış yılı ve 7 günlük yeni kitap indirimi buradan
     addedAt: kitaplığa eklenme anı (indirim döngüsü) · cover: base64 görsel veya ''
     lockUntil / lockBy / lockRental: kiralama kilidi (güvenlik kuralı boşta olmayı bununla denetler)
     status: kiralik | kiradisi | listedisi | planlaniyor | yakinda (yoksa kiralik) · description: açıklama
     museum: true → Müze'de (kiralanamaz) · museumType: kategori id'si ya da MUSEUM_TYPES anahtarı · period: eski özel kitabın dönemi */
  const SEED_BOOKS = [
    { id: 1,  title: 'Gece Yolcusu I: Karanlık Peron', type: 'seri', seriesNo: 1,  price: 25, pages: 212, rentalDays: 14, place: 'Ankara – Çankaya',        releaseDate: '2019-09-01', authorId: 'u1', cover: '', addedAt: '2026-09-01T12:00:00', newDiscountUntil: null },
    { id: 2,  title: 'Gece Yolcusu II: Son Tren',      type: 'seri', seriesNo: 2,  price: 15, pages: 236, rentalDays: 14, place: 'Ankara – Çankaya',        releaseDate: '2020-06-10', authorId: 'u1', cover: '', addedAt: '2026-09-01T12:00:00', newDiscountUntil: null },
    { id: 3,  title: 'Gece Yolcusu III: Gar',          type: 'seri', seriesNo: 3,  price: 40, pages: 268, rentalDays: 14, place: 'İstanbul – Haydarpaşa',   releaseDate: '2021-08-30', authorId: 'u1', cover: '', addedAt: '2026-09-02T12:00:00', newDiscountUntil: null },
    { id: 4,  title: 'Karadeniz Yaz Albümü 2019',      type: 'album', price: 35, pages: 64,  rentalDays: 7,  place: 'Trabzon – Uzungöl',       releaseDate: '2019-12-15', authorId: 'u1', cover: '', addedAt: '2026-09-03T12:00:00', newDiscountUntil: null },
    { id: 5,  title: 'Rüzgârın Kızı',                  type: 'seri', seriesNo: 4,  price: 30, pages: 190, rentalDays: 14, place: 'İzmir – Urla',            releaseDate: '2022-11-01', authorId: 'u1', cover: '', addedAt: '2026-09-05T12:00:00', newDiscountUntil: null },
    { id: 6,  title: 'Rüzgârın Oğlu',                  type: 'seri', seriesNo: 5,  price: 22, pages: 204, rentalDays: 14, place: 'İzmir – Urla',            releaseDate: '2023-09-15', authorId: 'u1', cover: '', addedAt: '2026-09-06T12:00:00', newDiscountUntil: null },
    { id: 7,  title: 'Dedemin Bahçesi',                type: '', museum: true, museumType: 'ozel', status: 'kiradisi', period: 'yaz tatillerinde', description: 'Dedemin köy evindeki bahçede geçen yaz anıları.', price: 60, pages: 148, rentalDays: 21, place: 'Kastamonu – Köy evi',     releaseDate: '2018-12-01', authorId: 'u1', cover: '', addedAt: '2026-09-08T12:00:00', newDiscountUntil: null },
    { id: 8,  title: 'Kapadokya Albümü 2021',          type: 'album', price: 18, pages: 48,  rentalDays: 7,  place: 'Nevşehir – Göreme',       releaseDate: '2022-01-05', authorId: 'u1', cover: '', addedAt: '2026-09-10T12:00:00', newDiscountUntil: null },
    { id: 9,  title: 'Kayıp Harita',                   type: 'seri', seriesNo: 6,  price: 45, pages: 312, rentalDays: 14, place: 'Ankara – Çalışma odası',  releaseDate: '2024-04-20', authorId: 'u1', cover: '', addedAt: '2026-09-12T12:00:00', newDiscountUntil: null },
    { id: 10, title: 'Bayram Sabahları',               type: 'album', price: 20, pages: 56,  rentalDays: 7,  place: 'Ankara – Keçiören',       releaseDate: '2024-05-01', authorId: 'u1', cover: '', addedAt: '2026-09-14T12:00:00', newDiscountUntil: null },
    { id: 11, title: 'Yıldız Tozu',                    type: 'seri', seriesNo: 7,  price: 22, pages: 176, rentalDays: 14, place: 'Bolu – Abant',            releaseDate: '2025-01-10', authorId: 'u1', cover: '', addedAt: '2026-09-15T12:00:00', newDiscountUntil: null },
    { id: 12, title: 'Ailemizin Hikâyesi',             type: '', museum: true, museumType: 'donemsel', status: 'kiradisi', period: 'bayram günlerinde', description: 'Ailemizin kuşaklar boyu anlatılan hikâyesi.', price: 80, pages: 420, rentalDays: 21, place: 'Ankara – Çankaya',        releaseDate: '2025-06-01', authorId: 'u1', cover: '', addedAt: '2026-09-18T12:00:00', newDiscountUntil: null },
    { id: 13, title: 'Sessiz Kütüphane',               type: 'seri', seriesNo: 8,  price: 16, pages: 160, rentalDays: 14, place: 'İstanbul – Kadıköy',      releaseDate: '2026-03-01', authorId: 'u1', cover: '', addedAt: '2026-09-20T12:00:00', newDiscountUntil: null },
    { id: 14, title: 'Kış Masalları',                  type: 'seri', seriesNo: 9,  price: 38, pages: 132, rentalDays: 14, place: 'Ankara – Çankaya',        releaseDate: '2026-10-22', authorId: 'u1', cover: '', addedAt: '2026-10-22T15:00:00', newDiscountUntil: '2026-10-29T15:00:00' } // yeni → ertesi günden itibaren listeye girer
  ];

  /* Kiralamalar (rentals) — örnek veri yok, gerçek kullanıcılar oluşturur
     listPrice: kiralama anındaki normal fiyat · price: ödenen (paket kitaplarında payı)
     discountSource: 'deal' (günün indirimi) | 'new' (yeni kitap) | 'offer' (özel teklif) | null
     offerId / purchaseId / offerPrice: özel teklifle alınan kitaplar
     Özel teklif satın alımları (offerPurchases) harcama istatistiğine paket fiyatı olarak yansır. */

  /* Fiyat logları: changeBookPrice() her çağrıldığında otomatik eklenir
     changedBy yüklenirken Admin'in uid'si olur */
  const SEED_PRICE_LOGS = [
    { id: 'p1', bookId: 3,  oldPrice: 35,   newPrice: 40, changedBy: 'u1', changedAt: isoAt(NOW_MS - 22 * DAY_MS) },
    { id: 'p6', bookId: 3,  oldPrice: 30,   newPrice: 35, changedBy: 'u1', changedAt: isoAt(NOW_MS - 50 * DAY_MS) },
    { id: 'p2', bookId: 1,  oldPrice: 30,   newPrice: 25, changedBy: 'u1', changedAt: isoAt(NOW_MS - 13 * DAY_MS) },
    { id: 'p3', bookId: 9,  oldPrice: 42.5, newPrice: 45, changedBy: 'u1', changedAt: isoAt(NOW_MS - DAY_MS - 3 * HOUR_MS) },
    { id: 'p4', bookId: 6,  oldPrice: 24,   newPrice: 22, changedBy: 'u1', changedAt: isoAt(NOW_MS - DAY_MS - 5 * HOUR_MS) },
    { id: 'p5', bookId: 13, oldPrice: 18,   newPrice: 16, changedBy: 'u1', changedAt: isoAt(NOW_MS - 2 * HOUR_MS) }
  ];

  /* Duyurular:
     type 'news'   → Haberler sekmesi (category: NEWS_CATEGORIES anahtarı)
     type 'update' → Güncellemeler sekmesi (version, releaseDate, year, items)
     readBy        → okuyan kullanıcı uid'leri (bildirim rozeti bundan hesaplanır) */
  const SEED_ANNOUNCEMENTS = [
    { id: 'a1', type: 'news', category: 'Duyuru', title: 'Kitaplığımız açıldı! 🎉',
      body: 'Family Bookshop artık yayında! Aile kitaplığımızdaki tüm kitapları bakiyenle kiralayabilir, her sabah 10:00\'da yenilenen Günün İndirimleri\'nden faydalanabilirsin.\nİyi okumalar!',
      bookId: null, authorId: 'u1', createdAt: '2026-10-01T10:00:00', pinned: true, readBy: ['u1', 'u2', 'u3', 'u4'] },
    { id: 'a3', type: 'news', category: 'Yeni Kitap', title: 'Yeni kitap: Kış Masalları',
      body: 'Müjde! Kağan Durak tarafından yazılan "Kış Masalları" isimli yeni Seri kitabımız eklenmiştir! 7 gün boyunca %15 yeni indirim fırsatıyla yayında!',
      bookId: 14, authorId: 'u1', createdAt: '2026-10-22T15:00:00', pinned: false, readBy: ['u1', 'u2'] },
    { id: 'a2', type: 'update', version: 'v1.1.0', title: 'Günün İndirimleri ve canlı sayaçlar', releaseDate: '2026-10-18', year: 2026,
      items: ['Her sabah 10:00\'da yenilenen sıralı indirim döngüsü', 'Aktif kiralamalar için canlı kalan süre çubukları', 'İndirimli kitaplar için tek tıkla kiralama'],
      authorId: 'u1', createdAt: '2026-10-18T19:30:00', readBy: ['u1'] },
    { id: 'a4', type: 'update', version: 'v1.0.0', title: 'İlk sürüm yayında', releaseDate: '2026-10-01', year: 2026,
      items: ['Mavi-beyaz yeni arayüz', 'Kullanıcı değiştirme ve bakiye yönetimi', 'Mobil uyumlu menü'],
      authorId: 'u1', createdAt: '2026-10-01T09:00:00', readBy: ['u1', 'u2', 'u3', 'u4'] },
    { id: 'a5', type: 'update', version: 'v0.9.0', title: 'Kapalı beta', releaseDate: '2025-12-20', year: 2025,
      items: ['Aile içi test sürümü', 'Temel kitap listesi'],
      authorId: 'u1', createdAt: '2025-12-20T12:00:00', readBy: ['u1', 'u2', 'u3', 'u4'] }
  ];

  /* Özel Teklifler: 1–3 kitaplık paketler
     items[i].cover: vitrin için isteğe bağlı kapak (boşsa kitabın kendi kapağı)
     validTime: bitiş saati ('SS:DD', yoksa gün sonu)
     Firestore'da ayrıca bookIds (kurallar için) ve endsAt (son an, Timestamp) tutulur. */
  const SEED_OFFERS = [
    { id: 'o1', title: 'Gece Yolcusu Üçlemesi', description: 'Serinin üç kitabı tek pakette! Karanlık Peron\'dan Gar\'a kadar tüm yolculuk tek kiralamayla senin.',
      price: 35, items: [{ bookId: 1, cover: '' }, { bookId: 2, cover: '' }, { bookId: 3, cover: '' }], validUntil: '2026-11-30', theme: 'blue', createdAt: '2026-10-15T10:00:00' },
    { id: 'o2', title: 'Rüzgâr & Kapadokya Paketi', description: 'Rüzgâr serisinin iki kitabı ve Kapadokya albümü bir arada.',
      price: 40, items: [{ bookId: 5, cover: '' }, { bookId: 6, cover: '' }, { bookId: 8, cover: '' }], validUntil: '2026-12-31', theme: 'violet', createdAt: '2026-10-20T10:00:00' }
  ];

  /* Günün İndirimleri ayarları */
  const DISCOUNT_SETTINGS = {
    anchorDate: '2026-10-01', // ilk döngünün başladığı gün (o günün 10:00'ı)
    resetHour: 10,            // her gün 10:00'da yeni grup
    groupSize: 3              // günde kaç kitap
  };
  const NEW_BOOK_DISCOUNT = { rate: 15, days: 7 }; // yeni eklenen kitap indirimi
  /* Hediyelerim kupon türleri (mağazayı Admin doldurur)
     percent: %1–100 · amount: ₺ indirim (fiyat 0'ın altına inmez)
     bogo: value kitap alınır, free tanesi bedava (en düşük fiyatlılar) · ör. 3 Al 2 Öde = value 3, free 1 */
  const COUPON_TYPES = {
    percent: { label: 'Yüzde Kuponu', hint: 'İndirim yüzdesi (1–100)', min: 1, max: 100, step: 1 },
    amount:  { label: '₺ Kuponu',      hint: 'İndirim tutarı (₺)',      min: 0.01, max: 10000, step: 0.01 },
    bogo:    { label: 'Al-Öde Kuponu', hint: 'Kaç kitap alınacak (2–5)', min: 2, max: 5, step: 1 }
  };
  const COUPON_DAYS = 7; // alınan kupon 1 hafta içinde kullanılmalı
  /* Sezonlar (Admin profil panelindeki Sezonlar butonundan seçer) · Kış: karlı tema + Kış Fırsatları vitrini;
     sezon boyunca Günün İndirimi, Yeni Kitap ve Fırsatlar kapalıdır */
  const SEASONS = {
    winter: { label: 'Kış', icon: '❄️', desc: 'Karlı tema · Kış Fırsatları açılır, Günün İndirimi ve Fırsatlar kapanır' }
  };
  /* Kış Fırsatları indirim seçenekleri (0 = indirimsiz) */
  const WINTER_RATES = [0, 15, 25, 50];
  /* Hediye Kutusu: 7 günlük ödül havuzu · her gün 10:00'da sıradaki gün açılır (kaçırılan gün geri gelmez) */
  const GIFT_DAYS = 7;
  const GIFT_REWARD_TYPES = {
    none:    { label: 'Ödül yok',     icon: '—' },
    balance: { label: 'Bakiye',       icon: '💰' },
    cheque:  { label: 'Hediye Çeki',  icon: '🎁' },
    coupon:  { label: 'Kupon',        icon: '🎟️' }
  };

  /* --- Temalar (kitap etiketleri) · Kış Sezonu teması her zaman vardır (belgesi yoksa varsayılanı kullanılır) --- */
  const WINTER_THEME_ID = 'kis-sezonu';
  const WINTER_THEME_DEFAULT = { id: WINTER_THEME_ID, label: 'Kış Sezonu', emoji: '❄️', color: '#0ea5e9', order: 0 };
  const isHexColor = (s) => /^#[0-9a-f]{6}$/i.test(s || '');
  const allThemes = () => (bookThemes.some((t) => t.id === WINTER_THEME_ID) ? [...bookThemes] : [WINTER_THEME_DEFAULT, ...bookThemes]);
  const getTheme = (id) => allThemes().find((t) => t.id === id) || null;
  const themeIdsOf = (b) => (Array.isArray(b?.themes) ? b.themes : []);
  const bookThemesOf = (b) => allThemes().filter((t) => themeIdsOf(b).includes(t.id));
  const hasWinterTheme = (b) => themeIdsOf(b).includes(WINTER_THEME_ID);
  /* Tema rozeti: emoji + ad, kendi renginde yazı, açık tonlu zemin */
  const themeChipHTML = (t) => {
    const c = isHexColor(t.color) ? t.color : '#64748b';
    return `<span class="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style="color:color-mix(in srgb, ${c} 80%, #0f172a);background:${c}1f;box-shadow:inset 0 0 0 1px ${c}45">${t.emoji ? `<span>${escapeHTML(t.emoji)}</span>` : ''}${escapeHTML(t.label)}</span>`;
  };
  const themeChipsHTML = (b, cls = '') => {
    const list = bookThemesOf(b);
    return list.length ? `<span class="flex items-center gap-1 flex-wrap ${cls}">${list.map(themeChipHTML).join('')}</span>` : '';
  };
  const CHEQUE_DAYS = 30;     // hediye çekinin varsayılan geçerliliği
  const DEFAULT_RENTAL_DAYS = 7;

  /* Uygulama durumu */
  const state = {
    currentUserId: null,   // giriş yapan Firebase kullanıcısının uid'si
    authUser: null,        // firebase.User
    ready: false,          // ilk veriler geldi mi
    pendingName: '',       // e-posta ile kayıtta girilen ad (profil belgesine yazılır)
    readPending: new Set(), // okundu olarak yazılmakta olan duyurular
    purgePending: new Set(), // Admin'in sildiği süresi dolmuş teklifler
    route: 'dashboard',
    profileOpen: false,
    mobileMenuOpen: false,
    modalOpen: false,
    lastDealDay: null,
    lastNewKey: '',        // ana sayfadaki Yeni Kitap vitrininde gösterilen kitaplar
    lastExhibitKey: '',    // Müze Vitrini'nde sergide olan kitaplar (süre dolunca yeniden çizilir)
    statsUserId: null,     // açık istatistik modalındaki kullanıcı
    statsPage: { rentals: 1 },
    confirmAction: null,
    panelUser: null,       // profil panelindeki Kullanıcı Yönetimi: açık olan kullanıcı
    feedbackOpen: false,   // Geri Bildirim penceresi açık mı (canlı liste yenilemesi için)
    fbFilter: 'open',      // Admin: 'open' | 'answered' | 'all'
    fbFresh: null,         // pencere açılırken "yeni" olan geri bildirimler
    refundsOpen: false,    // Onay Bekleyenler / İadelerim penceresi açık mı
    refundFilter: 'pending', // Admin: 'pending' | 'approved' | 'rejected'
    memberView: (() => { try { return localStorage.getItem('fb.memberView') === '1'; } catch { return false; } })(), // Admin: Üye Görünümü
    bookTab: 'all',
    bookFilterKind: 'none', // Kitaplar: filtre türü (place | year | status | rating)
    bookFilterValue: 'all', // Kitaplar: seçili türün değeri
    logFilterKind: 'none',  // Fiyat Logu: filtre türü (change | year | book)
    logFilterValue: 'all',
    bookLogFilterKind: 'none', // Kitabın "Tümünü gör" fiyat geçmişi: filtre türü (change | year)
    bookLogFilterValue: 'all',
    bookLogsOpen: null,     // açık "Tümünü gör" penceresi: { bookId, backOfferId }
    rentTab: 'all',        // Kiralananlar: tür filtresi
    rentStatus: 'active',  // Kiralananlar: 'active' | 'past'
    annTab: 'news',
    newsFilterKind: 'none', // Haberler: filtre türü (category | year)
    newsFilterValue: 'all',
    newsPage: 1,            // Haberler: sayfa (1 = en yeni)
    updFilterKind: 'none',  // Güncellemeler: filtre türü (year | series)
    updFilterValue: 'all',
    updPage: 1,             // Güncellemeler: sayfa (1 = en yeni)
    freshAnnIds: new Set(), // bu ziyarette "Yeni" olarak işaretlenecek duyurular
    bookDraftCover: '',     // kitap formundaki kapak (base64)
    offerDraftCovers: ['', '', ''],
    coverBusy: false
  };

  /* ==========================================================
     2) SABİTLER & YARDIMCI FONKSİYONLAR
     ========================================================== */
  const ICONS = {
    dashboard: 'M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75',
    books: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
    rentals: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
    users: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
    'price-logs': 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941',
    announcements: 'M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46',
    offers: 'M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z',
    gifts: 'M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z',
    wallet: 'M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3',
    tag: 'M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3zM6 6h.008v.008H6V6z',
    close: 'M6 18L18 6M6 6l12 12',
    plus: 'M12 4.5v15m7.5-7.5h-15',
    cog: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
    pencil: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10',
    trash: 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
    check: 'M4.5 12.75l6 6 9-13.5',
    search: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z',
    info: 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z',
    arrow: 'M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3',
    back: 'M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18',
    chevron: 'M8.25 4.5l7.5 7.5-7.5 7.5',
    news: 'M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z',
    sparkles: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z',
    pin: 'M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z',
    calendar: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
    pages: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
    chart: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
    link: 'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244',
    lock: 'M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z',
    photo: 'M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21zm10.5-11.25h.008v.008h-.008V9.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z'
  };

  const ROUTES = {
    'dashboard':     { label: 'Ana Sayfa',      desc: 'Kitaplığın genel görünümü ve özet istatistikler.' },
    'books':         { label: 'Kitaplar',       desc: 'Kağan Durak\'ın tüm eserleri · çıkış tarihine göre en yeniden eskiye.' },
    'rentals':       { label: 'Kiralananlar',   desc: 'Aktif ve geçmiş kiralama kayıtları.' },
    'users':         { label: 'Kullanıcılar',   desc: 'Kitaplar için en çok bakiye harcayanlar liderlik tablosu.' },
    'price-logs':    { label: 'Fiyat Logu',     desc: 'Kitap fiyatlarındaki tüm değişimlerin tarihe göre geçmişi.' },
    'announcements': { label: 'Duyurular',      desc: 'Haberler ve sürüm güncellemeleri.' },
    'offers':        { label: 'Özel Teklifler', desc: '1–3 kitaplık özel paketler · tek kiralamayla hepsi birden.' },
    'gifts':         { label: 'Hediyelerim',    desc: 'İndirimlerden biriken puanlarınla kupon al, kiralık bir kitaba uygula.' }
  };
  const DEFAULT_ROUTE = 'dashboard';

  /* Kitap türü renk paletleri (Tailwind sınıfları tam yazılı kalmalı) */
  const TYPE_PALETTES = {
    blue:    { label: 'Mavi',   grad: 'from-sky-400 to-brand-600',     chip: 'bg-brand-50 text-brand-600',     dot: 'bg-brand-400' },
    rose:    { label: 'Mercan', grad: 'from-rose-400 to-orange-400',   chip: 'bg-rose-50 text-rose-500',       dot: 'bg-rose-400' },
    violet:  { label: 'Mor',    grad: 'from-violet-400 to-indigo-600', chip: 'bg-violet-50 text-violet-600',   dot: 'bg-violet-400' },
    emerald: { label: 'Yeşil',  grad: 'from-emerald-400 to-teal-600',  chip: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-400' },
    amber:   { label: 'Amber',  grad: 'from-amber-400 to-orange-500',  chip: 'bg-amber-50 text-amber-700',     dot: 'bg-amber-400' },
    slate:   { label: 'Gri',    grad: 'from-slate-400 to-slate-600',   chip: 'bg-slate-100 text-slate-600',    dot: 'bg-slate-400' }
  };
  const getType = (id) => bookTypes.find((t) => t.id === id);
  /* Eski kayıtlardaki palet adının renk karşılığı (renk seçici bununla açılır) */
  const PALETTE_HEX = { blue: '#3b82f6', rose: '#fb7185', violet: '#8b5cf6', emerald: '#10b981', amber: '#f59e0b', slate: '#64748b' };
  const typeColorOf = (t) => (isHexColor(t?.color) ? t.color : PALETTE_HEX[t?.palette] || PALETTE_HEX.slate);
  /* Kategori rengi serbest seçilir (color: '#rrggbb'): her kategoriye degrade / rozet / nokta sınıfı üretilir
     (sınıflar <style id="typeColors"> içinde · kategoriler değişince yenilenir) · eski kayıtlarda palette sınıfları */
  let typeColorKey = '';
  function syncTypeColorCSS() {
    const list = bookTypes.filter((t) => isHexColor(t.color));
    const key = list.map((t) => t.id + t.color).join('|');
    if (key === typeColorKey) return;
    typeColorKey = key;
    let el = document.getElementById('typeColors');
    if (!el) { el = document.createElement('style'); el.id = 'typeColors'; document.head.appendChild(el); }
    el.textContent = list.map((t) => {
      const k = typeClassKey(t.id), c = t.color;
      return `.tc-${k}-g{background-image:linear-gradient(to bottom right,color-mix(in srgb,${c} 60%,#fff),${c})!important}`
        + `.tc-${k}-c{background-color:color-mix(in srgb,${c} 12%,#fff)!important;color:color-mix(in srgb,${c} 80%,#0f172a)!important}`
        + `.tc-${k}-d{background-color:${c}!important}`;
    }).join('\n');
  }
  const typeClassKey = (id) => String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
  const typeStyle = (id) => {
    const t = getType(id);
    if (!isHexColor(t?.color)) return TYPE_PALETTES[t?.palette] || TYPE_PALETTES.slate;
    syncTypeColorCSS();
    const k = typeClassKey(t.id);
    return { label: t.label, grad: `tc-${k}-g`, chip: `tc-${k}-c`, dot: `tc-${k}-d` };
  };
  const typeLabel = (t) => getType(t)?.label || 'Kitap';
  const defaultTypeId = () => bookTypes[0]?.id || '';

  /* Müze türü = kitabın kategorisi (Seri, Albüm… · kitap müzeye kendi türüyle girer) ya da kategorilerde
     artık olmayan eski müze türleri: Özel (eski Özel kategorisinin rengi: amber) · Dönemsel (mavi–mor–sarı–yeşil, css → .museum-rainbow)
     Müze bu türlere göre gruplanır · kitap yalnızca türü kategorilerde varsa müzeden çıkarılabilir */
  const MUSEUM_TYPES = {
    ozel:     { label: 'Özel',     grad: TYPE_PALETTES.amber.grad, chip: TYPE_PALETTES.amber.chip,     dot: TYPE_PALETTES.amber.dot },
    donemsel: { label: 'Dönemsel', grad: 'museum-rainbow',        chip: 'bg-violet-50 text-violet-600', dot: 'museum-rainbow' }
  };
  const museumTypeOf = (b) => b?.museumType || b?.type || 'ozel';
  const isMuseumTypeKey = (k) => !!(getType(k) || MUSEUM_TYPES[k]);
  const museumTypeInfo = (k) => (getType(k)
    ? { ...typeStyle(k), label: getType(k).label } // palette'in renk adı değil, kategorinin adı
    : MUSEUM_TYPES[k] || { ...TYPE_PALETTES.slate, label: 'Diğer' });
  const museumStyle = (b) => museumTypeInfo(museumTypeOf(b));
  /* Müze türü seçenekleri: önce kategoriler, sonra kategorilerde olmayan eski müze türleri */
  const museumTypeKeys = () => [...bookTypes.map((t) => t.id), ...Object.keys(MUSEUM_TYPES).filter((k) => !getType(k))];
  /* Müzeden çıkarılabilir mi: türü kategorilerde olmalı (kitaplıkta o türe döner) */
  const canLeaveMuseum = (b) => !!getType(museumTypeOf(b));
  /* Tür rozeti: türün renginde nokta + adı (Dönemsel: noktası çok renkli) */
  const museumDot = (t, size = 'w-2 h-2') => `<span class="${size} rounded-full shrink-0 ${t.dot}"></span>`;
  const museumChip = (b) => `<span class="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${museumStyle(b).chip}">${museumDot(museumStyle(b))}${museumStyle(b).label}</span>`;
  /* Müze kapağı: görsel kırpılmadan tam görünür (beyaz zemin + ince çerçeve) · görsel yoksa degrade kapak */
  const MUSEUM_COVER = { md: 'w-20 h-28 rounded-xl', lg: 'w-28 h-40 rounded-2xl', case: 'w-[5.5rem] h-32 sm:w-24 sm:h-36 rounded-md' };
  const museumCoverHTML = (b, size = 'md') => (b.cover
    ? `<img src="${escapeHTML(b.cover)}" alt="${escapeHTML(b.title)} kapağı" class="${MUSEUM_COVER[size]} shrink-0 object-contain bg-white border border-stone-200 shadow-soft" />`
    : coverHTML(b, size === 'case' ? 'lg' : size));

  /* Kitap durumları (Admin ayarlar; tüm türler için). "Kirada", kiralanmış kitapta kendiliğinden görünür. */
  const BOOK_STATUSES = {
    kiralik:     { label: 'Kiralık',     chip: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-400', desc: 'Kiralanabilir' },
    kiradisi:    { label: 'Kira dışı',   chip: 'bg-rose-50 text-rose-500',       dot: 'bg-rose-400',    desc: 'Görünür ama kiralanamaz' },
    listedisi:   { label: 'Liste dışı',  chip: 'bg-slate-100 text-slate-500',    dot: 'bg-slate-400',   desc: 'Yalnızca Adminler görür' },
    planlaniyor: { label: 'Planlanıyor', chip: 'bg-violet-50 text-violet-600',   dot: 'bg-violet-400',  desc: 'Gelmesi planlanıyor · bilgiler eksik olabilir · kiralanamaz' },
    yakinda:     { label: 'Yakında',     chip: 'bg-sky-50 text-sky-600',         dot: 'bg-sky-400',     desc: 'Yazılmaya başlandı · bilgiler eksik olabilir · kiralanamaz' }
  };
  const RENTED_STATUS = { label: 'Kirada', chip: 'bg-amber-50 text-amber-600', dot: 'bg-amber-400' };
  const bookStatus = (b) => (BOOK_STATUSES[b?.status] ? b.status : 'kiralik');   // eski kayıtlar → Kiralık
  const isDraftBook = (b) => ['planlaniyor', 'yakinda'].includes(bookStatus(b)); // bilgileri eksik olabilir
  const isRentableStatus = (b) => bookStatus(b) === 'kiralik' && !b?.museum;
  const isVisibleBook = (b) => !!b && (isAdmin() || bookStatus(b) !== 'listedisi');
  const visibleBooks = () => books.filter(isVisibleBook);
  const hasPrice = (b) => typeof b?.price === 'number' && b.price > 0;
  /* Görünen durum: kiradaysa "Kirada", değilse ayarlanan durum */
  const statusView = (b, now = Date.now()) => (isBookRented(b, now) ? RENTED_STATUS : BOOK_STATUSES[bookStatus(b)]);
  const statusChipHTML = (b, now = Date.now(), extra = '') => {
    const s = statusView(b, now);
    return `<span class="inline-flex items-center gap-1 whitespace-nowrap text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.chip} ${extra}"><span class="w-1.5 h-1.5 rounded-full ${s.dot}"></span>${s.label}</span>`;
  };
  /* Kiralanamama sebebi (duruma göre) */
  function statusBlockReason(b) {
    const st = bookStatus(b);
    if (b?.museum) return 'Bu kitap Müze\'de · artık kiralanamaz.';
    if (st === 'kiradisi') return 'Bu kitap şu an kira dışı.';
    if (st === 'planlaniyor') return 'Bu kitap henüz planlanıyor, kiralanamaz.';
    if (st === 'yakinda') return 'Bu kitap yakında çıkacak, henüz kiralanamaz.';
    if (st === 'listedisi') return 'Bu kitap listede değil.';
    return null;
  }

  /* Haber türleri (Duyurular → Haberler)
     Duyuru: Admin'in genel yazısı · Yeni Kitap: yeni kitap eklendi / yayına girdi
     İndirim: vitrin indirimi, özel teklif · Bilgilendirme: kitap durumu değişti, kitap silindi
     (kupon ve Müze Vitrini haberleri Duyuru'dur · eski "Etkinlik" haberleri Duyuru sayılır) */
  const NEWS_CATEGORIES = {
    'Duyuru':        'bg-brand-50 text-brand-600',
    'Yeni Kitap':    'bg-emerald-50 text-emerald-600',
    'İndirim':       'bg-rose-50 text-rose-600',
    'Bilgilendirme': 'bg-sky-50 text-sky-600'
  };
  /* Liste satırındaki tür simgesi ve renk zemini */
  const NEWS_ICONS = {
    'Duyuru':        { emoji: '📣', bg: 'from-brand-100 to-brand-50' },
    'Yeni Kitap':    { emoji: '📚', bg: 'from-emerald-100 to-emerald-50' },
    'İndirim':       { emoji: '🏷️', bg: 'from-rose-100 to-rose-50' },
    'Bilgilendirme': { emoji: 'ℹ️', bg: 'from-sky-100 to-sky-50' }
  };
  /* Eski türler güncel türlere eşlenir · bir dönem "İndirim" olarak kaydedilen yeni kitap haberleri → Yeni Kitap */
  const newsCategoryOf = (a) => {
    if (a?.category === 'İndirim' && /^Yeni kitap:/.test(a.title || '')) return 'Yeni Kitap';
    return { 'Kitap Durumu': 'Bilgilendirme', 'Etkinlik': 'Duyuru' }[a?.category] || (NEWS_CATEGORIES[a?.category] ? a.category : 'Duyuru');
  };
  const newsChipCls = (c) => NEWS_CATEGORIES[c] || 'bg-slate-100 text-slate-600';
  /* Otomatik haberler yalnızca Admin işaretlerse atılır */
  const announceCheckHTML = (id, cat, checked = false) => `
    <label class="flex items-center justify-center gap-2 mt-3 text-[11px] text-slate-600">
      <input type="checkbox" id="${id}" name="announce" ${checked ? 'checked' : ''} class="rounded border-slate-300 text-brand-600" />
      📣 Duyuruya at <span class="text-[10px] font-semibold px-1.5 py-px rounded-full ${newsChipCls(cat)}">${cat}</span>
    </label>`;

  /* Roller · renkler: Admin yeşil, Üye mavi, Gözlemci sarı */
  const ROLES = {
    admin:    { label: 'Admin',    chip: 'bg-emerald-50 text-emerald-600', desc: 'Tüm yönetim yetkileri' },
    member:   { label: 'Üye',      chip: 'bg-brand-50 text-brand-600',     desc: 'Kiralama yapabilir' },
    observer: { label: 'Gözlemci', chip: 'bg-amber-50 text-amber-600',     desc: 'Sadece görüntüler' }
  };

  const MEDALS = ['🥇', '🥈', '🥉'];

  /* Ortak form / buton sınıfları */
  const INPUT_CLS = 'w-full text-xs rounded-xl border border-brand-100 bg-white px-3 py-2.5 text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-300 transition';
  const BTN_PRIMARY = 'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-brand-500 to-brand-700 hover:shadow-soft-lg transition disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed disabled:shadow-none';
  const BTN_SOFT = 'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-brand-700 bg-white border border-brand-100 hover:border-brand-300 hover:shadow-soft transition';
  const BTN_ICON = 'w-8 h-8 rounded-lg flex items-center justify-center transition';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const formatMoney = (v) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

  const formatDate = (iso, withTime = false) =>
    new Date(iso).toLocaleDateString('tr-TR', withTime
      ? { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
      : { day: 'numeric', month: 'short', year: 'numeric' });

  /* Yıl + saat (ör. "12 Kas 2029 10:00") · yıllar sonrasına uzanabilen tarihler için */
  const formatDateTimeYear = (iso) =>
    new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const formatLongDate = (iso) =>
    new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  /* 'YYYY-MM-DD' (yerel) — tarih inputları ve gruplama için */
  const localDateKey = (d = new Date()) => {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  };
  /* 'YYYY-MM-DD' → yerel gece yarısı Date */
  const dateFromKey = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };
  const isDateKey = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');

  function relativeDay(iso) {
    const diff = Math.round((dateFromKey(localDateKey()) - dateFromKey(localDateKey(iso))) / DAY_MS);
    if (diff === 0) return 'Bugün';
    if (diff === 1) return 'Dün';
    if (diff > 1 && diff < 7) return `${diff} gün önce`;
    return formatDate(iso);
  }

  /* "3 gün önce çıktı" / "4 yıl 7 ay önce çıktı" (çıkış tarihinden) */
  function releasedAgo(dateKey) {
    if (!isDateKey(dateKey)) return 'Çıkış tarihi belli değil';
    const from = dateFromKey(dateKey);
    const now = new Date();
    if (from > now) return 'Yakında';
    let y = now.getFullYear() - from.getFullYear();
    let m = now.getMonth() - from.getMonth();
    let d = now.getDate() - from.getDate();
    if (d < 0) { m--; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
    if (m < 0) { y--; m += 12; }
    const parts = [];
    if (y) parts.push(`${y} yıl`);
    if (m) parts.push(`${m} ay`);
    if (!y && d) parts.push(`${d} gün`);
    return parts.length ? `${parts.slice(0, 2).join(' ')} önce çıktı` : 'Bugün çıktı';
  }

  const escapeHTML = (str) => String(str ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const initials = (name) => String(name).trim().split(/\s+/).map((p) => p[0] || '').slice(0, 2).join('').toUpperCase() || '?';

  const icon = (key, cls = 'w-4 h-4') =>
    `<svg class="${cls}" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${ICONS[key]}"/></svg>`;

  const round2 = (n) => Math.round(n * 100) / 100;
  const sum = (arr, fn) => round2(arr.reduce((s, x) => s + fn(x), 0));

  const getUser = (id) => users.find((u) => u.id === id);
  /* Müze'deki kitap da bulunur (geçmiş kiralamalar, fiyat logu vb. adını göstersin) · kiralama b.museum ile engellenir */
  const getBook = (id) => books.find((b) => b.id === Number(id)) || museumBooks.find((b) => b.id === Number(id));
  const getRental = (id) => rentals.find((r) => r.id === id);
  const getAnn = (id) => announcements.find((a) => a.id === id);
  const getOffer = (id) => offers.find((o) => o.id === id);
  const currentUser = () => getUser(state.currentUserId);
  /* Gerçek Admin rolü · Üye Görünümü açıkken arayüz Admin'i üye gibi gösterir (isAdmin false) */
  const isRealAdmin = () => currentUser()?.role === 'admin';
  const isAdmin = () => isRealAdmin() && !state.memberView;
  const canRent = (user = currentUser()) => user && user.role !== 'observer';
  const canViewStats = (userId) => isAdmin() || userId === state.currentUserId;
  const authorName = (book) => getUser(book?.authorId)?.name || 'Kağan Durak';
  const uid = (prefix) => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  function toast(message, type = 'info') {
    const styles = {
      success: 'bg-white border-emerald-200 text-emerald-700',
      error:   'bg-white border-rose-200 text-rose-600',
      info:    'bg-white border-brand-200 text-brand-700'
    };
    const el = document.createElement('div');
    el.className = `pointer-events-auto px-4 py-2.5 rounded-xl border shadow-soft-lg text-xs font-medium transition duration-300 opacity-0 translate-y-2 ${styles[type]}`;
    el.textContent = message;
    $('#toastContainer').appendChild(el);
    requestAnimationFrame(() => el.classList.remove('opacity-0', 'translate-y-2'));
    setTimeout(() => {
      el.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => el.remove(), 300);
    }, 2800);
  }

  /* Kitap kapağı: base64 görsel varsa onu, yoksa türüne göre degrade kutu */
  const COVER_SIZES = {
    xs: 'w-8 h-11 text-[9px] rounded-md',
    sm: 'w-10 h-14 text-[10px] rounded-lg',
    md: 'w-14 h-20 text-xs rounded-xl',
    lg: 'w-24 h-36 text-base rounded-2xl',
    fill: 'w-full h-full text-lg rounded-xl'
  };
  function coverHTML(book, size = 'md', overrideCover = '') {
    const b = book || { title: '?', type: '' };
    const src = overrideCover || b.cover;
    let cover;
    if (src) {
      // kapak kırpılmadan tam görünür (oranı farklıysa kenarları beyaz kalır)
      cover = `<img src="${escapeHTML(src)}" alt="${escapeHTML(b.title)} kapağı" class="block ${COVER_SIZES[size]} object-contain shadow-soft shrink-0 bg-white" />`;
    } else {
      const grad = b.museum ? museumStyle(b).grad : getType(b.type) ? typeStyle(b.type).grad : 'from-brand-400 to-brand-600';
      const letters = initials(String(b.title).replace(/[^\p{L}\p{N}\s]/gu, '') || b.title);
      cover = `
      <div class="${COVER_SIZES[size]} shrink-0 bg-gradient-to-br ${grad} text-white font-bold shadow-soft flex items-center justify-center relative overflow-hidden">
        <span class="absolute left-1.5 top-0 bottom-0 w-px bg-white/30"></span>
        <span class="absolute -right-3 -bottom-3 w-10 h-10 rounded-full bg-white/10"></span>
        <span class="drop-shadow-sm">${escapeHTML(letters)}</span>
      </div>`;
    }
    return cover;
  }

  function avatarHTML(user, cls = 'w-5 h-5 text-[9px]') {
    return `<span class="${cls} rounded-full bg-gradient-to-br ${user.color} text-white flex items-center justify-center font-semibold shrink-0">${initials(user.name)}</span>`;
  }

  const typeChip = (t) => `<span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeStyle(t).chip}">${escapeHTML(typeLabel(t))}</span>`;
  const roleChip = (r) => `<span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLES[r]?.chip || ''}">${ROLES[r]?.label || r}</span>`;

  const emptyState = (text, extra = '') =>
    `<div class="${extra} text-center text-xs text-slate-400 py-10 px-4 bg-white/60 border border-dashed border-brand-200 rounded-2xl">${text}</div>`;

  const setPageActions = (page, html) => {
    const slot = document.querySelector(`#page-${page} [data-page-actions]`);
    if (slot) slot.innerHTML = html;
  };

  /* Yerel görsel dosyasını okuyup küçültür ve base64 (JPEG) döndürür.
     Küçültme, Firestore'un 1 MB belge sınırı için önemlidir. */
  function readImageFile(file, maxW = 360, maxH = 540) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) return reject(new Error('Lütfen bir görsel dosyası seçin.'));
      if (file.size > 10 * 1024 * 1024) return reject(new Error('Görsel en fazla 10 MB olabilir.'));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Dosya okunamadı.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Görsel açılamadı.'));
        img.onload = () => {
          const scale = Math.min(1, maxW / img.width, maxH / img.height);
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(reader.result);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ==========================================================
     6) MENÜ, ROZETLER & SAYFA BAŞLIKLARI
     ========================================================== */
  const BADGE_CLS = 'min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none flex items-center justify-center ring-2 ring-white shadow-sm transition duration-300 opacity-0 scale-50';

  function renderMenus() {
    const entries = Object.entries(ROUTES);

    $('#desktopMenu').innerHTML = entries.map(([key, r]) => `
      <li>
        <a href="#${key}" data-nav="${key}"
           class="nav-link relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-500 hover:text-brand-600 transition">
          ${icon(key, 'w-3.5 h-3.5')}<span>${r.label}</span>
          ${key === 'announcements' ? `<span data-badge="announcements" class="absolute -top-1.5 -right-1 ${BADGE_CLS}"></span>` : ''}
        </a>
      </li>`).join('');

    $('#mobileMenuList').innerHTML = entries.map(([key, r]) => `
      <li>
        <a href="#${key}" data-nav="${key}"
           class="nav-link flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-600 bg-brand-50/60 hover:bg-brand-100 transition">
          ${icon(key)}<span>${r.label}</span>
          ${key === 'announcements' ? `<span data-badge="announcements" class="ml-auto ${BADGE_CLS}"></span>` : ''}
        </a>
      </li>`).join('');

    // Sayfa başlıkları (+ sağda sayfa aksiyonları için yuva)
    $$('[data-page]').forEach((section) => {
      const key = section.id.replace('page-', '');
      const r = ROUTES[key];
      section.querySelector('[data-page-header]').innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div class="flex items-center gap-3 min-w-0">
            <span class="w-10 h-10 rounded-xl bg-white shadow-soft text-brand-600 flex items-center justify-center shrink-0">${icon(key, 'w-5 h-5')}</span>
            <div class="min-w-0">
              <h1 class="text-base font-bold text-slate-800">${r.label}</h1>
              <p class="text-xs text-slate-400" data-page-desc>${r.desc}</p>
            </div>
          </div>
          <div data-page-actions class="flex flex-wrap gap-2"></div>
        </div>`;
    });
  }

  function updateBadges() {
    const count = unreadCount();
    $$('[data-badge="announcements"]').forEach((el) => {
      const wasHidden = el.classList.contains('opacity-0');
      if (count > 0) {
        el.textContent = count > 9 ? '9+' : count;
        el.classList.remove('opacity-0', 'scale-50');
        if (wasHidden) { el.classList.remove('badge-pop'); void el.offsetWidth; el.classList.add('badge-pop'); }
      } else {
        el.classList.add('opacity-0', 'scale-50');
      }
    });
    const dot = $('#menuDot');
    if (dot) {
      dot.classList.toggle('opacity-0', count === 0);
      dot.classList.toggle('scale-50', count === 0);
    }
  }

  /* ==========================================================
     7) SPA YÖNLENDİRME (hash + hidden)
     ========================================================== */
  function router() {
    let route = location.hash.replace('#', '');
    if (!ROUTES[route]) {
      route = DEFAULT_ROUTE;
      history.replaceState(null, '', '#' + route);
    }
    const changed = state.route !== route;
    state.route = route;
    if (route === 'announcements') state.freshAnnIds = new Set();

    $$('[data-page]').forEach((section) => {
      const active = section.id === 'page-' + route;
      section.classList.toggle('hidden', !active);
      if (active) {
        section.classList.remove('page-enter');
        void section.offsetWidth;            // animasyonu yeniden tetikle
        section.classList.add('page-enter');
      }
    });

    $$('.nav-link').forEach((link) => {
      const active = link.dataset.nav === route;
      link.classList.toggle('bg-white', active);
      link.classList.toggle('text-brand-600', active);
      link.classList.toggle('shadow-soft', active);
      link.classList.toggle('text-slate-500', !active && !!link.closest('#desktopMenu'));
      if (link.closest('#mobileMenuList')) {
        link.classList.toggle('ring-1', active);
        link.classList.toggle('ring-brand-200', active);
      }
    });

    document.title = `${ROUTES[route].label} · Family Bookshop`;
    toggleMobileMenu(false);
    toggleProfile(false);
    closeModal();
    renderCurrentPage();
    if (changed) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const PAGE_RENDERERS = {
    'dashboard':     () => renderDashboard(),
    'books':         () => renderBooks(),
    'users':         () => renderUsers(),
    'price-logs':    () => renderPriceLogs(),
    'announcements': () => renderAnnouncements(),
    'offers':        () => renderOffers(),
    'gifts':         () => renderGifts(),
    'rentals':       () => renderRentals()
  };

  function renderCurrentPage() {
    if (!state.ready || !currentUser()) return;
    state.lastExhibitKey = exhibitKey(); // sergi süresi dolunca tick() yeniden çizdirir
    applySeasonTheme();
    PAGE_RENDERERS[state.route]?.();
    updateBadges();
  }

  /* Sezon teması: <body> sınıfı (season-winter) + ekran boyu kar yağışı katmanı (bir kez kurulur) */
  function applySeasonTheme() {
    state.renderedSeason = activeSeason(); // süreli sezon bitince tick() yeniden çizdirir
    const winter = state.renderedSeason === 'winter';
    document.body.classList.toggle('season-winter', winter);
    let layer = $('#snowLayer');
    if (winter && !layer) {
      layer = document.createElement('div');
      layer.id = 'snowLayer';
      layer.className = 'snow-layer';
      layer.setAttribute('aria-hidden', 'true');
      layer.innerHTML = snowflakesHTML(42);
      document.body.appendChild(layer);
    }
    if (!winter && layer) layer.remove();
  }
  /* Düşen kar taneleri (konum, boyut, hız ve gecikme sabit dağılımlı · her çizimde aynı) */
  const snowflakesHTML = (count) => Array.from({ length: count }, (_, i) => {
    const size = 3 + (i * 7) % 6;
    return `<i style="left:${(i * 37 + 11) % 100}%;width:${size}px;height:${size}px;opacity:${(0.45 + ((i * 13) % 50) / 100).toFixed(2)};`
      + `animation-duration:${(7 + (i * 5) % 9).toFixed(1)}s,${(3 + (i % 4)).toFixed(1)}s;animation-delay:-${((i * 1.7) % 12).toFixed(1)}s,-${(i % 3).toFixed(1)}s"></i>`;
  }).join('');

  /* ==========================================================
     14) MODAL ALTYAPISI
     ========================================================== */
  function openModal(html, size = 'md') {
    const root = $('#modalRoot');
    const panel = $('#modalPanel');
    panel.classList.remove('sm:max-w-md', 'sm:max-w-2xl');
    panel.classList.add(size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-md');
    panel.innerHTML = html;
    panel.scrollTop = 0;
    root.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    state.modalOpen = true;
    toggleProfile(false);
    requestAnimationFrame(() => {
      $('#modalBackdrop').classList.remove('opacity-0');
      panel.classList.remove('opacity-0', 'translate-y-6', 'sm:translate-y-2', 'sm:scale-95');
      panel.querySelector('[autofocus]')?.focus();
    });
  }

  function closeModal() {
    if (!state.modalOpen) return;
    state.modalOpen = false;
    state.confirmAction = null;
    state.feedbackOpen = false;
    state.refundsOpen = false;
    state.bookLogsOpen = null;
    $('#modalBackdrop').classList.add('opacity-0');
    $('#modalPanel').classList.add('opacity-0', 'translate-y-6', 'sm:translate-y-2', 'sm:scale-95');
    document.body.style.overflow = '';
    setTimeout(() => { if (!state.modalOpen) $('#modalRoot').classList.add('hidden'); }, 200);
  }

  /* Kapak büyütme: görsel kırpılmadan, ekrana sığacak en büyük boyutta */
  function openCoverLightbox(img) {
    if (!img?.src) return;
    const box = $('#coverLightbox');
    $('#coverLightboxImg').src = img.src;
    $('#coverLightboxImg').alt = img.alt;
    box.classList.remove('hidden');
    box.classList.add('flex');
  }
  function closeCoverLightbox() {
    const box = $('#coverLightbox');
    box.classList.add('hidden');
    box.classList.remove('flex');
    $('#coverLightboxImg').removeAttribute('src');
  }

  const closeBtn = () =>
    `<button type="button" data-modal-close aria-label="Kapat" class="w-9 h-9 rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition shrink-0">${icon('close', 'w-4 h-4 pointer-events-none')}</button>`;

  const modalHeader = (title, subtitle, iconKey, tone = 'bg-brand-50 text-brand-600') => `
    <span class="sm:hidden absolute left-1/2 -translate-x-1/2 top-2 w-10 h-1 rounded-full bg-slate-200"></span>
    <div class="flex items-start gap-3 p-5 pb-4 border-b border-slate-100">
      <span class="w-10 h-10 rounded-xl ${tone} flex items-center justify-center shrink-0">${icon(iconKey, 'w-5 h-5')}</span>
      <div class="min-w-0 flex-1">
        <h3 class="text-sm font-bold text-slate-800">${title}</h3>
        <p class="text-[11px] text-slate-400">${subtitle}</p>
      </div>
      ${closeBtn()}
    </div>`;

  const field = (label, control, hint = '') => `
    <label class="block">
      <span class="block text-[11px] font-medium text-slate-500 mb-1">${label}</span>
      ${control}
      ${hint ? `<span class="block text-[10px] text-slate-400 mt-1">${hint}</span>` : ''}
    </label>`;

  const formFooter = (submitLabel) => `
    <div class="grid grid-cols-2 gap-2.5 pt-2">
      <button type="button" data-modal-close class="py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition">Vazgeç</button>
      <button type="submit" class="${BTN_PRIMARY} !py-2.5">${submitLabel}</button>
    </div>`;

  /* Onay modalı (silme vb.) */
  /* positive: true → onay (yeşil, ikon iconKey) · varsayılan silme (kırmızı, çöp kutusu) */
  function openConfirm({ title, message, confirmLabel = 'Sil', onConfirm, positive = false, iconKey = 'trash' }) {
    openModal(`
      <div class="p-6 text-center">
        <span class="w-12 h-12 rounded-2xl ${positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'} flex items-center justify-center mx-auto">${icon(iconKey, 'w-6 h-6')}</span>
        <h3 class="text-sm font-bold text-slate-800 mt-3">${title}</h3>
        <p class="text-xs text-slate-500 mt-1.5 leading-relaxed">${message}</p>
        <div class="grid grid-cols-2 gap-2.5 mt-5">
          <button type="button" data-modal-close class="py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition">Vazgeç</button>
          <button type="button" data-confirm-yes class="py-2.5 rounded-xl text-xs font-semibold ${positive ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'} text-white transition">${confirmLabel}</button>
        </div>
      </div>`);
    state.confirmAction = onConfirm;
  }

  const requireAdmin = () => {
    if (isAdmin()) return true;
    toast('Bu işlem yalnızca Admin tarafından yapılabilir.', 'error');
    return false;
  };

  /* ==========================================================
     18) AÇ/KAPA KONTROLLERİ
     ========================================================== */
  function toggleProfile(force) {
    state.profileOpen = typeof force === 'boolean' ? force : !state.profileOpen;
    const p = $('#profilePanel');
    p.classList.toggle('opacity-0', !state.profileOpen);
    p.classList.toggle('scale-95', !state.profileOpen);
    p.classList.toggle('-translate-y-1', !state.profileOpen);
    p.classList.toggle('pointer-events-none', !state.profileOpen);
    $('#profileChevron').classList.toggle('rotate-180', state.profileOpen);
    $('#profileBtn').setAttribute('aria-expanded', state.profileOpen);
    if (state.profileOpen) { toggleMobileMenu(false); renderProfile(); }
  }

  function toggleMobileMenu(force) {
    state.mobileMenuOpen = typeof force === 'boolean' ? force : !state.mobileMenuOpen;
    const m = $('#mobileMenu');
    m.style.maxHeight = state.mobileMenuOpen ? m.scrollHeight + 'px' : '0px';
    $('#iconMenuOpen').classList.toggle('hidden', state.mobileMenuOpen);
    $('#iconMenuClose').classList.toggle('hidden', !state.mobileMenuOpen);
    if (state.mobileMenuOpen && state.profileOpen) toggleProfile(false);
  }

  /* ==========================================================
     19) CANLI SAYAÇ (her saniye)
     ========================================================== */
  function tick() {
    if (!state.ready) return;
    const now = new Date();
    // Tarihi gelen planlı fiyat değişimleri (dakikada bir)
    if (now.getSeconds() === 0) applyDuePrices(now.getTime());
    // Süreli sezon bittiyse tema kalkar (her şey yeniden çizilir)
    if (state.renderedSeason !== undefined && activeSeason() !== state.renderedSeason) return scheduleRender();
    // Müze Vitrini'nde süresi dolan sergi kalkar (Admin açıksa sergi geçmişine bitiş yazılır)
    if (exhibitKey() !== state.lastExhibitKey && !state.modalOpen) return scheduleRender();
    // Süresi biten özel teklifler gün dönümünde vitrinden silinir
    if (purgeExpiredOffers(now) && state.route === 'offers' && !state.modalOpen) renderCurrentPage();
    if (!['dashboard', 'rentals'].includes(state.route) || document.hidden) return;

    if (state.route === 'dashboard') {
      // 10:00 geçildiyse yeni indirim grubuna geç
      if (discountDayNumber(now) !== state.lastDealDay) return renderDashboard();
      // Yeni kitap indirimi biten kitap vitrinden düşsün
      if (newBooksKey(now) !== state.lastNewKey) return renderDashboard();
      updateCountdown(now);
      // Hediye Kutusu: kalan süre · 10:00'da yeni gün açılınca kutu yeniden çizilir
      updateGiftBoxFab(now);
    }

    const root = $(`#page-${state.route}`);
    let somethingExpired = false;
    root.querySelectorAll('[data-rental-bar]').forEach((el) => {
      if (applyProgress(el.dataset.rentalBar, now.getTime(), root) <= 0) somethingExpired = true;
    });
    // Süresi biten kiralama "Süresi Dolan" satırlarına taşınsın
    if (somethingExpired) renderCurrentPage();
  }

