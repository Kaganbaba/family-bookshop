# Family Bookshop — Claude talimatları

## Firestore kuralları

- `firestore.rules` her değiştiğinde veya yeni bir Firestore kuralı eklendiğinde kullanıcıya şu komutu çalıştırmasını hatırlat:

  ```
  firebase deploy --only firestore:rules
  ```

- `index.html` içindeki veritabanı sorgularının (okuma, yazma, batch işlemleri, alan adları) `firestore.rules` güvenlik kurallarıyla her zaman birbiriyle tam uyumlu olduğunu kontrol et.
