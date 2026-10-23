# Family Bookshop — Claude talimatları

## Firestore kuralları

- `firestore.rules` her değiştiğinde veya yeni bir Firestore kuralı eklendiğinde kullanıcıya şu komutu çalıştırmasını hatırlat:

  ```
  firebase deploy --only firestore:rules
  ```

- `index.html` içindeki veritabanı sorgularının (okuma, yazma, batch işlemleri, alan adları) `firestore.rules` güvenlik kurallarıyla her zaman birbiriyle tam uyumlu olduğunu kontrol et.
- Siteye girebilen e-posta listesi iki yerde sabit yazılı ve birebir aynı olmalı: `index.html` → `ALLOWED_EMAILS`, `firestore.rules` → `allowedEmails()`. Birini değiştirirken diğerini de değiştir ve kural deploy'unu hatırlat.
