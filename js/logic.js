  /* ==========================================================
     3) KİRALAMA YARDIMCILARI
     ========================================================== */
  const isActiveRental  = (r, now = Date.now()) => !r.returnedAt && new Date(r.dueAt).getTime() > now;
  const isExpiredRental = (r, now = Date.now()) => new Date(r.dueAt).getTime() <= now;
  const activeRentalOf  = (book, now = Date.now()) => rentals.find((r) => r.bookId === book.id && isActiveRental(r, now));
  const isBookRented    = (book, now = Date.now()) => !!activeRentalOf(book, now);
  /* ==========================================================
     REYTİNG (1 en kötü · 5 çok iyi)
     • Kullanıcı bir kitaba tek oy verir, istediği zaman değiştirir; en az 1 kez kiralamış olmalı.
     • O kitaba ait kiralama kayıtlarının hepsi silinirse oyu da silinir (ratingCleanupOps).
     ========================================================== */
  /* Ortalama rengi: [alt sınır, renk] — 5 yalnızca tam 5 ortalamada */
  const RATING_COLORS = [[5, '#0037c5'], [4.5, '#00c3ff'], [4, '#20e816'], [3, '#fff003'], [2, '#ffc303'], [0, '#a50b0b']];
  const ratingColor = (avg) => RATING_COLORS.find(([min]) => avg >= min)[1];
  const bookRatings = (bookId) => ratings.filter((r) => r.bookId === Number(bookId) && r.score >= 1 && r.score <= 5);
  const myRatingOf = (bookId, userId = state.currentUserId) => ratings.find((r) => r.id === `${bookId}_${userId}`) || null;
  /* Ortalama: renk kesin değere göre; yazı 1 basamağa aşağı yuvarlanır (4,96 → 4,9 · renk aralığıyla çelişmesin) */
  function ratingSummary(bookId) {
    const rs = bookRatings(bookId);
    if (!rs.length) return null;
    const avg = sum(rs, (r) => r.score) / rs.length;
    const shown = Math.floor(avg * 10 + 1e-9) / 10;
    return { avg, count: rs.length, text: shown.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) };
  }
  /* Kapak üstündeki ortalama rozeti: beyaz yazı, dolgulu renk */
  function ratingBadgeHTML(bookId, cls = 'absolute -bottom-1.5 -right-1.5 text-[10px]') {
    const s = ratingSummary(bookId);
    if (!s) return '';
    return `<span class="${cls} z-[2] inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-extrabold text-white shadow-soft ring-1 ring-white leading-none"
      style="background:${ratingColor(s.avg)};text-shadow:0 1px 2px rgba(0,0,0,.45)" title="Ortalama reyting ${s.text} · ${s.count} oy">★ ${s.text}</span>`;
  }
  /* Oy verebilmek için kullanıcının bu kitaba ait en az bir kiralama kaydı olmalı (iptal / süresi dolmuş da sayılır) */
  const userRentalOf = (bookId, userId = state.currentUserId) => rentals
    .filter((r) => r.bookId === Number(bookId) && r.userId === userId)
    .sort((a, b) => new Date(b.rentedAt) - new Date(a.rentedAt))[0] || null;
  /* Silinen kiralamalardan sonra o kitaba hiç kaydı kalmayan kullanıcının oyu silinir */
  function ratingCleanupOps(removed) {
    const gone = new Set(removed.map((r) => r.id));
    const keys = [...new Set(removed.map((r) => `${r.bookId}_${r.userId}`))];
    return keys
      .filter((key) => ratings.some((x) => x.id === key) && !rentals.some((r) => !gone.has(r.id) && `${r.bookId}_${r.userId}` === key))
      .map((key) => (bt) => bt.delete(col('ratings').doc(key)));
  }

  /* Kitap detayındaki reyting kutusu: ortalama + oy sayısı, kendi oyun (yıldızlar), Reyting bilgileri */
  function ratingBoxHTML(b) {
    const s = ratingSummary(b.id);
    const mine = myRatingOf(b.id);
    const canRate = !!userRentalOf(b.id);
    const stars = [1, 2, 3, 4, 5].map((n) => `
      <button type="button" data-rate-book="${b.id}" data-score="${n}" title="${n} puan" aria-label="${n} puan"
        class="text-2xl leading-none transition hover:scale-110 ${mine && n <= mine.score ? 'text-amber-400' : 'text-slate-200 hover:text-amber-300'}">★</button>`).join('');
    return `
      <div class="rounded-2xl border border-slate-100 p-3.5 space-y-3">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5 min-w-0">
            ${s ? `<span class="inline-flex items-center px-2.5 py-1.5 rounded-xl text-sm font-black text-white shadow-soft"
                style="background:${ratingColor(s.avg)};text-shadow:0 1px 2px rgba(0,0,0,.45)">★ ${s.text}</span>`
              : '<span class="inline-flex items-center px-2.5 py-1.5 rounded-xl text-sm font-black text-slate-400 bg-slate-100">★ —</span>'}
            <div class="min-w-0">
              <p class="text-xs font-bold text-slate-700">Reyting</p>
              <p class="text-[10px] text-slate-400">${s ? `${s.count} oy · ortalama` : 'Henüz oy yok'}</p>
            </div>
          </div>
          <button type="button" data-rating-info="${b.id}" class="${BTN_SOFT} !py-1.5 shrink-0">Reyting bilgileri →</button>
        </div>
        ${canRate ? `
          <div class="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-dashed border-slate-100">
            <span class="text-[11px] text-slate-500">${mine ? `Senin puanın: <b class="text-slate-700">${mine.score}</b> · değiştirmek için tıkla` : 'Puan ver (1 en kötü · 5 çok iyi)'}</span>
            <div class="flex items-center gap-1">${stars}</div>
          </div>
          ${mine ? `<button type="button" data-unrate-book="${b.id}" class="text-[10px] font-semibold text-slate-400 hover:text-rose-500">Puanımı kaldır</button>` : ''}`
          : `<p class="text-[10px] text-slate-400 pt-2 border-t border-dashed border-slate-100">Puan verebilmek için bu kitabı en az bir kez kiralamış olmalısın.</p>`}
      </div>`;
  }

  /* Oy ver / değiştir · kiralama kaydı kural tarafında da denetlenir (rentalId) */
  async function rateBook(bookId, score) {
    const b = getBook(bookId);
    const u = currentUser();
    score = Number(score);
    if (!b || !u || !(score >= 1 && score <= 5)) return;
    const rental = userRentalOf(b.id, u.id);
    if (!rental) return toast('Puan verebilmek için bu kitabı en az bir kez kiralamış olmalısın.', 'error');
    const prev = myRatingOf(b.id, u.id);
    if (prev?.score === score) return;
    const now = isoAt(Date.now());
    const ok = await run(col('ratings').doc(`${b.id}_${u.id}`).set({
      bookId: b.id, userId: u.id, score, rentalId: rental.id, createdAt: prev?.createdAt || now, updatedAt: now
    }), prev ? `Puanın güncellendi: ${score} ⭐` : `"${b.title}" için ${score} puan verdin ⭐`);
    if (ok && $('#ratingBox')) $('#ratingBox').innerHTML = ratingBoxHTML(b);
  }

  async function unrateBook(bookId) {
    const b = getBook(bookId);
    const mine = myRatingOf(bookId);
    if (!b || !mine) return;
    const ok = await run(col('ratings').doc(mine.id).delete(), 'Puanın kaldırıldı.', 'info');
    if (ok && $('#ratingBox')) $('#ratingBox').innerHTML = ratingBoxHTML(b);
  }

  /* Reyting bilgileri: kim, ne zaman (tarih + saat), kaç puan */
  function openRatingInfoModal(bookId) {
    const b = getBook(bookId);
    if (!b) return;
    const s = ratingSummary(b.id);
    const list = bookRatings(b.id).sort((x, y) => new Date(y.updatedAt) - new Date(x.updatedAt));
    const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: list.filter((r) => r.score === n).length }));
    const admin = isAdmin();
    openModal(`
      ${modalHeader(`Reyting · ${escapeHTML(b.title)}`, s ? `Ortalama ${s.text} · ${s.count} oy` : 'Henüz oy yok', 'chart', 'bg-amber-50 text-amber-600')}
      <div class="p-5 space-y-4">
        ${admin && list.length ? `<div class="flex justify-end -mb-2"><button type="button" data-delete-rating="all" data-book="${b.id}"
          class="text-[11px] font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1">${icon('trash', 'w-3.5 h-3.5')}Tüm oyları sil</button></div>` : ''}
        ${list.length ? `
          <div class="space-y-1">${dist.map(({ n, c }) => `
            <div class="flex items-center gap-2 text-[11px]">
              <span class="w-8 text-slate-500 font-semibold">${n} ★</span>
              <span class="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden"><span class="block h-full rounded-full" style="width:${(c / list.length) * 100}%;background:${ratingColor(n)}"></span></span>
              <span class="w-6 text-right text-slate-400 tabular-nums">${c}</span>
            </div>`).join('')}
          </div>
          <ul class="space-y-2">${list.map((r) => {
            const usr = getUser(r.userId);
            return `
              <li class="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/80">
                ${usr ? avatarHTML(usr, 'w-8 h-8 text-[11px]') : '<span class="w-8 h-8 rounded-full bg-slate-200 shrink-0"></span>'}
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-semibold text-slate-700 truncate">${escapeHTML(usr?.name || 'Kullanıcı')}</p>
                  <p class="text-[10px] text-slate-400">${formatLongDate(r.updatedAt)} · Saat ${formatTime(r.updatedAt)}${r.updatedAt !== r.createdAt ? ' · düzenlendi' : ''}</p>
                </div>
                <span class="shrink-0 text-sm tracking-tight"><span class="text-amber-400">${'★'.repeat(r.score)}</span><span class="text-slate-200">${'★'.repeat(5 - r.score)}</span></span>
                ${admin ? `<button type="button" data-delete-rating="${r.id}" data-book="${b.id}" title="Bu oyu sil" aria-label="Bu oyu sil"
                  class="${BTN_ICON} text-slate-300 hover:text-rose-500 hover:bg-rose-50 shrink-0">${icon('trash', 'w-3.5 h-3.5 pointer-events-none')}</button>` : ''}
              </li>`;
          }).join('')}</ul>`
          : '<p class="text-[11px] text-slate-400 bg-slate-50 rounded-xl px-3 py-2.5">Bu kitaba henüz kimse puan vermedi.</p>'}
        <div class="grid grid-cols-2 gap-2.5 pt-1">
          <button type="button" data-open-book="${b.id}" class="${BTN_SOFT} !py-2.5">${icon('back', 'w-3.5 h-3.5')}Kitaba dön</button>
          <button type="button" data-modal-close class="${BTN_PRIMARY} !py-2.5">Kapat</button>
        </div>
      </div>`);
  }

  /* Admin: oy(lar)ı sil · silinen oyun sahibi yeniden oy verebilir */
  function deleteRating(id, bookId) {
    if (!requireAdmin()) return;
    const b = getBook(bookId);
    const list = id === 'all' ? bookRatings(bookId) : ratings.filter((r) => r.id === id);
    if (!list.length) return;
    const who = list.length === 1 ? `<b>${escapeHTML(getUser(list[0].userId)?.name || 'Kullanıcı')}</b> kullanıcısının ${list[0].score} puanlık oyu` : `<b>${list.length} oy</b>`;
    openConfirm({
      title: list.length > 1 ? 'Tüm oylar silinsin mi?' : 'Oy silinsin mi?',
      message: `"${escapeHTML(b?.title || 'Kitap')}" için ${who} silinecek. Ortalama yeniden hesaplanır; kullanıcı isterse yeniden oy verebilir.`,
      onConfirm: async () => {
        await run(commitOps(list.map((r) => (bt) => bt.delete(col('ratings').doc(r.id)))), `${list.length} oy silindi.`, 'info');
        openRatingInfoModal(bookId);
      }
    });
  }

  /* Kiralanma sayısı: kayıtlardan sayılır · Admin bir kiralamayı silince kendiliğinden düşer */
  const bookRentCount   = (bookId) => rentals.filter((r) => r.bookId === Number(bookId)).length;

  function rentalProgress(r, now = Date.now()) {
    const start = new Date(r.rentedAt).getTime();
    const end = new Date(r.dueAt).getTime();
    const remainingMs = Math.max(0, end - now);
    const ratio = end > start ? Math.min(1, remainingMs / (end - start)) : 0;
    return { remainingMs, ratio };
  }

  function formatRemaining(ms) {
    if (ms <= 0) return 'Süre doldu';
    const d = Math.floor(ms / DAY_MS);
    const h = Math.floor((ms % DAY_MS) / HOUR_MS);
    const m = Math.floor((ms % HOUR_MS) / 6e4);
    const s = Math.floor((ms % 6e4) / 1e3);
    if (d > 0) return `${d} gün ${h} sa kaldı`;
    if (h > 0) return `${h} sa ${m} dk kaldı`;
    return `${m} dk ${s} sn kaldı`;
  }

  /* Kalan oran → yeşil (120°) ile kırmızı (0°) arası renk */
  const progressColor = (ratio) => `hsl(${Math.round(ratio * 120)}, 72%, 46%)`;

  /* root: aynı kiralamanın çubuğu birden çok sayfada olabildiği için arama kapsamı */
  function applyProgress(rentalId, now = Date.now(), root = document) {
    const r = getRental(rentalId);
    const bar = root.querySelector(`[data-rental-bar="${rentalId}"]`);
    const label = root.querySelector(`[data-rental-left="${rentalId}"]`);
    if (!r || !bar) return 0;
    const { remainingMs, ratio } = rentalProgress(r, now);
    bar.style.width = `${Math.max(ratio * 100, 2)}%`;
    bar.style.backgroundColor = progressColor(ratio);
    if (label) {
      label.textContent = formatRemaining(remainingMs);
      label.style.color = progressColor(ratio);
    }
    return remainingMs;
  }

  /* ==========================================================
     4) GÜNÜN İNDİRİMLERİ — SIRALI DÖNGÜ MOTORU
     ----------------------------------------------------------
     • Bir "indirim günü" saat 10:00'da başlar, ertesi gün 09:59'da biter.
     • Liste: o günün 10:00'ında mevcut Seri kitaplar (inDeals türler), seri
       numarasına göre sıralı. Gün içinde eklenen kitap ertesi gün listeye girer.
     • Her gün bir sonraki 3'lü grup gelir (1-2-3 → 4-5-6 → …). Son grup eksik
       kalırsa (22-23) o şekilde gösterilir, ertesi gün yine 1-2-3'ten başlar.
     • Admin "Sonraki 3'lü" ile istediği kadar ilerletebilir ya da grubu
       kendisi seçebilir (settings/deals.pinDay/pinGroup/pinAt). Sonraki günler
       o gruptan devam eder; 10:00'daki otomatik geçiş her zaman çalışır.
     ========================================================== */
  /* Seri numarasına göre günün indirimi oranı: 1–5 %50 · 6–12 %40 · 13–15 %30 · 16–19 %25 · 20 ve sonrası %20 */
  const RATE_TIERS = [
    { max: 5,        rate: 50 },
    { max: 12,       rate: 40 },
    { max: 15,       rate: 30 },
    { max: 19,       rate: 25 },
    { max: Infinity, rate: 20 }
  ];
  /* Seri sırası: Admin'in girdiği "kaçıncı seri" numarası.
     Numarası olmayan (eski) kayıtlar sıranın sonuna, kitap numarasına göre dizilir. */
  const seriesRank = (book) => (Number.isInteger(book?.seriesNo) && book.seriesNo > 0 ? book.seriesNo : 1e6 + (book?.id || 0));
  const getDiscountRate = (bookId) => {
    const b = getBook(bookId);
    const rank = Number.isInteger(b?.seriesNo) && b.seriesNo > 0 ? b.seriesNo : Number(bookId);
    return RATE_TIERS.find((t) => rank <= t.max).rate;
  };
  /* Döngüye girer: indirim türü + henüz planlanan/yazılan kitap değil.
     Kira dışı / Liste dışı kitaplar sırasını korur ama o gün gösterilmez (o gün 2 indirim olur). */
  const isDiscountEligible = (book) => getType(book.type)?.inDeals !== false && !isDraftBook(book);
  /* "Seri #3" etiketi (numarası yoksa kitap numarası) */
  /* Seri kitapta "Seri #3", seri numarası olmayan (Özel, Albüm…) kitapta yalnızca tür adı */
  const seriesLabel = (b) => (Number.isInteger(b?.seriesNo) && b.seriesNo > 0 && getType(b.type)?.inDeals ? `${typeLabel(b.type)} #${b.seriesNo}` : typeLabel(b.type));
  /* Kitap seçim listeleri: önce seri kitaplar (seri numarasına göre), altta diğerleri (türe, sonra ada göre) */
  const bySeriesThenTitle = (a, b) => {
    const sa = Number.isInteger(a.seriesNo) && getType(a.type)?.inDeals, sb = Number.isInteger(b.seriesNo) && getType(b.type)?.inDeals;
    if (sa !== sb) return sa ? -1 : 1;
    if (sa) return a.seriesNo - b.seriesNo || a.id - b.id;
    return typeLabel(a.type).localeCompare(typeLabel(b.type), 'tr') || a.title.localeCompare(b.title, 'tr');
  };

  /* Tarihi "indirim günü numarası"na çevirir (10:00 öncesi bir önceki güne sayılır) */
  function discountDayNumber(date = new Date()) {
    const shifted = new Date(date.getTime() - DISCOUNT_SETTINGS.resetHour * HOUR_MS);
    return Math.round(Date.UTC(shifted.getFullYear(), shifted.getMonth(), shifted.getDate()) / DAY_MS);
  }

  /* Gün numarasının yerel saatle 10:00 anı */
  function discountDayStart(dayNum) {
    const u = new Date(dayNum * DAY_MS);
    return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate(), DISCOUNT_SETTINGS.resetHour, 0, 0, 0);
  }

  function anchorDayNumber() {
    const [y, m, d] = DISCOUNT_SETTINGS.anchorDate.split('-').map(Number);
    return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
  }

  /* Günün sıralı listesi · cutoffMs verilirse o andaki kitaplarla (Admin seçimi) */
  function dealList(dayNum, cutoffMs = null) {
    const startTime = cutoffMs ?? discountDayStart(dayNum).getTime();
    return books
      .filter((b) => isDiscountEligible(b) && new Date(b.addedAt).getTime() <= startTime)
      .sort((a, b) => seriesRank(a) - seriesRank(b) || a.id - b.id)
      .map((b) => b.id);
  }
  const dealGroupCount = (list) => Math.ceil(list.length / DISCOUNT_SETTINGS.groupSize);

  /* settings/deals.pinDay + pinGroup + pinAt: Admin'in en son seçtiği grup (o günden itibaren geçerli) */
  const dealsDoc = () => appSettings.find((s) => s.id === 'deals') || {};
  /* settings/deals.removedDay + removedIds: Admin'in bugünkü indirimden çıkardığı kitaplar
     (yalnızca o indirim günü geçerli; 10:00'da yeni gün başlayınca kendiliğinden düşer) */
  const dealsRemovedToday = (now = new Date()) => {
    const d = dealsDoc();
    return d.removedDay === discountDayNumber(now) ? (d.removedIds || []).map(Number) : [];
  };

  /* settings/showcase: Admin'in Vitrin Ayarları · { vitrine, deals, newBooks } (false = kapalı, alan yoksa açık).
     Kapalı vitrin hiç yokmuş gibidir: ana sayfada görünmez, indirimi hiçbir yerde uygulanmaz.
     dealsPausedDay + dealsPausedGroup: Günün İndirimi kapatılırken gösterilen grup (açılınca oradan devam eder) */
  const showcaseDoc = () => appSettings.find((s) => s.id === 'showcase') || {};
  /* Kış sezonunda yalnızca Kış Fırsatları açıktır: bu vitrinler hiç yokmuş gibi kapalı sayılır (anahtarları da gizlenir) */
  const WINTER_OFF_SHOWCASES = ['deals', 'vitrine', 'newBooks'];
  const showcaseOn = (key) => !(WINTER_OFF_SHOWCASES.includes(key) && activeSeason() === 'winter') && showcaseDoc()[key] !== false;

  /* Sezon (settings/season) · süreli açıldıysa endsAt geçince kendiliğinden kapalı sayılır
     (kayıtları Admin istemcisi expireSeason ile temizler) · Kış Fırsatları yalnızca Kış sezonunda ve vitrini açıkken geçerlidir */
  const seasonDoc = () => appSettings.find((x) => x.id === 'season') || {};
  const seasonEndsMs = () => seasonDoc().endsAt?.toMillis?.() ?? null;
  const seasonStartMs = () => seasonDoc().startedAt?.toMillis?.() ?? null; // eski kayıtlarda yok
  const activeSeason = () => {
    const d = seasonDoc();
    const end = seasonEndsMs();
    return SEASONS[d.active] && (end == null || end > Date.now()) ? d.active : null;
  };
  const winterOn = () => activeSeason() === 'winter' && showcaseOn('winter');
  /* Kış Fırsatları puan çarpanı (settings/winter.multiplier · 1–WINTER_MULT_MAX tam sayı, yoksa 1) */
  const winterMult = () => {
    const m = appSettings.find((x) => x.id === 'winter')?.multiplier;
    return Number.isInteger(m) && m >= 1 && m <= WINTER_MULT_MAX ? m : 1;
  };
  const winterDealOf = (book) => (winterOn() && winterDeals.find((d) => d.bookId === book?.id && Number.isInteger(d.rate) && d.rate > 0)) || null;
  /* Kışın yeni kitabı: Kış sezonu başladıktan sonra kitaplığa giren (ya da sezon açılırken yeni kitap indirimi süren) kitap ·
     sezon boyunca YENİ olarak Kış Fırsatları'nda %WINTER_NEW_RATE · normal Yeni Kitap vitrini kışın kapalıdır */
  const isWinterNewBook = (book) => {
    if (!book || activeSeason() !== 'winter' || isDraftBook(book)) return false;
    const start = seasonStartMs();
    return (start != null && new Date(book.addedAt).getTime() >= start) || (newDiscountEnd(book) || 0) > Date.now();
  };
  /* Yeni kitabın içinde olduğu YENİ kış paketi (yoksa null) · paketteki yeni kitaplar yalnızca paketle indirimlidir */
  const winterNewPackOf = (book) => offers.find((o) => o.season === 'winter' && o.bookIds?.includes(book?.id) && isWinterNewPack(o)) || null;
  /* Kitabın Kış Fırsatı (yeni kitap önce): { rate, source: 'winterNew' | 'winter', isNew, pack } · yoksa null
     pack: yeni kitap bir yeni kış paketindeyse tek başına indirimi yoktur (rate 0) · vitrinde yalnızca paket görünür */
  function winterOfferOf(book) {
    if (!winterOn() || !hasPrice(book)) return null;
    if (isWinterNewBook(book)) {
      const pack = winterNewPackOf(book);
      return pack ? { rate: 0, source: null, isNew: true, pack } : { rate: WINTER_NEW_RATE, source: 'winterNew', isNew: true, pack: null };
    }
    const d = winterDealOf(book);
    return d ? { rate: d.rate, source: 'winter', isNew: false, pack: null } : null;
  }

  function getDailyDeals(now = new Date()) {
    const size = DISCOUNT_SETTINGS.groupSize;
    const today = discountDayNumber(now);
    let day = anchorDayNumber();
    if (today < day || !showcaseOn('deals')) return { ids: [], group: 0, groupCount: 0, listSize: 0, pinned: false };

    // Başlangıç: Admin'in en son seçimi (bugün veya önce yapıldıysa), yoksa ilk gün 1. grup
    const d = dealsDoc();
    let group = 0;
    let list;
    if (Number.isInteger(d.pinDay) && d.pinDay >= day && d.pinDay <= today) {
      day = d.pinDay;
      group = Number(d.pinGroup) || 0;
      list = dealList(day, d.pinAt ? new Date(d.pinAt).getTime() : null);
    } else {
      list = dealList(day);
    }
    if (group >= dealGroupCount(list)) group = 0;

    // Her 10:00'da bir sonraki gruba geç; son grubun ardından baştan başla
    while (day < today) {
      day++;
      list = dealList(day);
      group = group + 1 < dealGroupCount(list) ? group + 1 : 0;
    }

    const removed = dealsRemovedToday(now);
    const ids = list
      .slice(group * size, group * size + size)
      // silinmiş / bugün indirimden çıkarılmış / Kiralık olmayan (Kira dışı, Liste dışı) /
      // Vitrin indirimindeki / yeni kitap indirimi süren kitapları atla · sırası korunur, o gün yeri boş kalır
      .filter((id) => getBook(id) && !removed.includes(id) && isRentableStatus(getBook(id))
        && !customDiscountOf(getBook(id), now) && !winterOfferOf(getBook(id)) && !isNewBook(getBook(id), now));

    return {
      ids, group, list,
      groupCount: dealGroupCount(list),
      listSize: list.length,
      pinned: d.pinDay === today && !d.pinResume, // vitrin yeniden açılınca yazılan devam noktası "Admin seçti" sayılmaz
      fromPos: group * size + 1,
      toPos: Math.min(group * size + size, list.length)
    };
  }

  const nextDealReset = (now = new Date()) => discountDayStart(discountDayNumber(now) + 1);

  /* Kitaba o an uygulanacak indirim: vitrin indirimi varsa o; yoksa günün indirimi / yeni kitaptan yüksek olan */
  /* dealIds verilirse günün indirimleri yeniden hesaplanmaz (listelerde tek sefer hesap) */
  function getEffectiveDiscount(book, now = new Date(), dealIds = null) {
    // Kış Fırsatı / Özel Fırsat'taki kitap başka indirime girmez (günün indirimi o kitabı atlar)
    const winter = winterOfferOf(book);
    if (winter) return { rate: winter.rate, source: winter.source }; // paketteki yeni kitap: tek başına indirimsiz
    const custom = customDiscountOf(book, now);
    if (custom) return { rate: custom.rate, source: 'custom' };
    let rate = 0, source = null;
    if ((dealIds || getDailyDeals(now).ids).includes(book.id)) { rate = getDiscountRate(book.id); source = 'deal'; }
    if (isNewBook(book, now) && NEW_BOOK_DISCOUNT.rate > rate) {
      rate = NEW_BOOK_DISCOUNT.rate; source = 'new';
    }
    return { rate, source };
  }
  /* Özel Fırsat (eski adı Vitrin İndirimi): Admin'in kitaba elle verdiği indirim (belge adı = kitap numarası, kitap başına tek).
     %100 = bedava · bitiş anı (endsAt) geçince kendiliğinden düşer · Vitrin Ayarları'nda kapalıysa uygulanmaz. */
  const CUSTOM_DISCOUNT_MAX = 100;
  const isVitrineActive = (d, now = new Date()) => Number.isInteger(d.rate) && d.rate > 0 && (d.endsMs == null || d.endsMs > now.getTime());
  const customDiscountOf = (book, now = new Date()) => (showcaseOn('vitrine')
    && discounts.find((d) => d.bookId === book?.id && isVitrineActive(d, now))) || null;
  /* Kitap şu an başka bir indirimde mi (vitrine eklenemez): kış fırsatı, günün indirimi, yeni kitap, aktif özel teklif */
  function otherDiscountOf(book, now = new Date(), dealIds = getDailyDeals(now).ids) {
    const w = winterOfferOf(book);
    if (w) return w.pack ? `"${w.pack.title}" kış paketinde` : w.isNew ? `yeni kitap olarak Kış Fırsatında (%${WINTER_NEW_RATE})` : 'Kış Fırsatında';
    if (dealIds.includes(book.id)) return 'Günün İndiriminde';
    if (isNewBook(book, now)) return 'Yeni Kitap İndiriminde';
    if (offers.some((o) => isOfferActive(o, now) && o.items.some((it) => it.bookId === book.id))) return 'bir Özel Teklifte';
    return null;
  }
  /* 1 haftalık yeni kitap indirimi süren kitap */
  /* Yeni kitap indiriminin bitişi (ms). Kayıtlı değer ile çıkış tarihinden hesaplanan
     7. gün sonu karşılaştırılır, erken olan geçerlidir (eski kayıtlardaki 8 günlük hata düzelir). */
  function newDiscountEnd(book) {
    if (!book?.newDiscountUntil) return null;
    const stored = new Date(book.newDiscountUntil).getTime();
    const byRelease = isDateKey(book.releaseDate) ? newDiscountEndOf(book.releaseDate).getTime() : Infinity;
    return Math.min(stored, byRelease);
  }
  /* Vitrin Ayarları'nda Yeni Kitap kapalıysa hiçbir kitap yeni kitap indirimine girmez; açılınca süresi
     dolmamış kitaplar kalan süreleriyle girer */
  const isNewBook = (book, now = new Date()) => { const end = newDiscountEnd(book); return showcaseOn('newBooks') && activeSeason() !== 'winter' && !!end && end > now.getTime(); };
  const newDiscountLeftMs = (book, now = new Date()) => (newDiscountEnd(book) || 0) - now.getTime();
  const newBooksKey = (now = new Date()) => books.filter((b) => isNewBook(b, now) && isVisibleBook(b)).map((b) => b.id).join(',');
  const discountSourceLabel = (s) => ({ deal: 'Günün İndirimi', new: 'Yeni Kitap İndirimi', offer: 'Özel Teklif', custom: 'Özel Fırsat', winter: 'Kış Fırsatı', winterNew: 'Kış · Yeni Kitap', coupon: 'Kupon', cheque: 'Hediye Çeki' }[s] || 'İndirim');

  function formatCountdown(ms) {
    const t = Math.max(0, Math.floor(ms / 1000));
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(Math.floor(t / 3600))}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`;
  }

  /* ==========================================================
     5) VERİ İŞLEMLERİ (Firestore yazmaları)
     ----------------------------------------------------------
     Yazma sonrası arayüzü onSnapshot dinleyicileri günceller.
     run(): yazmayı bekler, kural reddini anlaşılır bir toast'a çevirir.
     ========================================================== */
  function fsErrorMsg(e) {
    const code = e?.code || '';
    if (code === 'permission-denied') return 'Bu işlem için yetkin yok (güvenlik kuralı reddetti).';
    if (code === 'unavailable') return 'Sunucuya ulaşılamıyor. İnternet bağlantını kontrol et.';
    if (code === 'failed-precondition' || code === 'aborted') return 'Veri bu arada değişti, lütfen tekrar dene.';
    return 'İşlem başarısız: ' + (e?.message || code || 'bilinmeyen hata');
  }

  async function run(promise, okMsg, okType = 'success') {
    try {
      await promise;
      if (okMsg) toast(okMsg, okType);
      return true;
    } catch (e) {
      console.error(e);
      toast(fsErrorMsg(e), 'error');
      return false;
    }
  }

  /* Çok sayıda yazmayı 450'lik batch'lere bölerek yazar (Firestore batch sınırı 500).
     ops: (batch) => void fonksiyonları */
  async function commitOps(ops) {
    for (let i = 0; i < ops.length; i += 450) {
      const batch = db.batch();
      ops.slice(i, i + 450).forEach((fn) => fn(batch));
      await batch.commit();
    }
  }

  /* Belgeye yazılacak veri: yerel 'id' alanını çıkarır (belge adı zaten id) */
  const docData = ({ id, ...rest }) => rest;

  /* Yeni kitap indirimi tam 7 gün: çıkış günü 1. gün sayılır, 7. günün sonunda biter
     (ör. 20 Ekim çıkış → 26 Ekim 23:59). */
  function newDiscountEndOf(releaseDate) {
    const end = dateFromKey(releaseDate);
    end.setDate(end.getDate() + NEW_BOOK_DISCOUNT.days - 1);
    end.setHours(23, 59, 59, 999);
    return end;
  }
  /* Çıkış tarihi son 7 gün içinde değilse indirim uygulanmaz → null */
  function newDiscountUntilFor(releaseDate, now = Date.now()) {
    if (!isDateKey(releaseDate)) return null;
    const end = newDiscountEndOf(releaseDate);
    return end.getTime() > now ? end.toISOString() : null;
  }

  /* Haber robotu: yeni kitap için şablon metin (tür adı o anki dinamik kategoriden alınır) */
  function newBookNewsBody(book) {
    const type = typeLabel(book.type);
    const facts = [
      `📚 Tür: ${type}`,
      `💰 Kiralama fiyatı: ${formatMoney(book.price)}`,
      book.place ? `📍 Yazıldığı yer: ${book.place}` : ''
    ].filter(Boolean).join(' · ');
    const daysLeft = Math.ceil(newDiscountLeftMs(book) / DAY_MS);
    const promo = isNewBook(book) && daysLeft > 0 ? `\n${daysLeft} gün boyunca %${NEW_BOOK_DISCOUNT.rate} yeni kitap indirimiyle yayında!` : '';
    return `Müjde! ${authorName(book)} tarafından yazılan "${book.title}" isimli yeni ${type} kitabımız kitaplığa eklendi!\n${facts}${promo}`;
  }

  /* Yeni kitap ekler. Çıkış tarihi son 7 gün içindeyse (yeni kitap) "Haberler"e
     otomatik duyuru basar (okunmamış → kırmızı rozet); daha eskiyse duyuru yazılmaz. */
  /* Haber robotunun duyuru belgesi */
  const newBookAnnouncement = (book) => ({
    type: 'news',
    category: 'Yeni Kitap',
    title: `Yeni kitap: ${book.title}`,
    body: newBookNewsBody(book),
    bookId: book.id,
    authorId: state.currentUserId,
    createdAt: isoAt(Date.now()),
    pinned: false,
    readBy: []
  });

  /* Haber robotu: Admin kitabın durumunu değiştirince otomatik duyuru.
     Liste dışı kitap üyelere görünmediği için duyuruya kitap bağlanmaz. */
  function statusAnnouncement(book, status) {
    const name = `"${book.title}"`;
    const special = isSpecialBook(book);
    const [title, body] = {
      kiralik: [`${book.title} artık kiralık`,
        `${name} artık kiralanabilir! 📚${hasPrice(book) ? `\n💰 Kiralama fiyatı: ${formatMoney(book.price)}` : ''}${book.rentalDays ? ` · ⏳ ${book.rentalDays} gün` : ''}${special && book.period ? `\n🔒 Bu özel kitap sadece ${book.period} okunabilir.` : ''}`],
      kiradisi: special
        ? [`${book.title} dönem dışında`, `${name} özel kitabı şu an dönem dışında, kiralanamaz.${book.period ? `\n🔒 Sadece ${book.period} okunabilir.` : ''}`]
        : [`${book.title} kira dışı`, `${name} şu an kira dışı. Kitaplıkta görünmeye devam eder ama bir süre kiralanamaz.`],
      listedisi: [`${book.title} listeden kaldırıldı`, `${name} kitaplık listesinden kaldırıldı ve şu an kiralanamaz.`],
      planlaniyor: [`${book.title} planlanıyor`, `${name} kitabının gelmesi planlanıyor! 🗓️\nBilgileri netleştikçe paylaşacağız.`],
      yakinda: [`${book.title} yakında`, `${name} yazılmaya başlandı, yakında kitaplıkta! ✍️`]
    }[status];
    return {
      type: 'news',
      category: 'Bilgilendirme',
      title, body,
      bookId: status === 'listedisi' ? null : book.id,
      authorId: state.currentUserId,
      createdAt: isoAt(Date.now()),
      pinned: false,
      readBy: []
    };
  }

  function addBook(data, announce = false) {
    const now = Date.now();
    const id = books.reduce((m, b) => Math.max(m, b.id), 0) + 1;
    const book = {
      id, authorId: state.currentUserId, ...data,
      addedAt: isoAt(now),
      // Planlanıyor / Yakında kitapta yeni kitap indirimi başlamaz
      newDiscountUntil: isDraftBook(data) ? null : newDiscountUntilFor(data.releaseDate, now),
      lockUntil: null, lockBy: null, lockRental: null
    };
    const batch = db.batch();
    batch.set(bookRef(id), book);
    if (book.newDiscountUntil && announce) batch.set(col('announcements').doc(), newBookAnnouncement(book));
    return { book, done: batch.commit() };
  }

  /* Fiyatı değiştirir + Fiyat Loguna otomatik kayıt düşer.
     batch verilirse işlemleri ona ekler (kitap düzenleme ile tek seferde yazılır). */
  /* Bir kitabın fiyat logları (eskiden yeniye) */
  const priceTimeline = (bookId) => priceLogs
    .filter((l) => l.bookId === Number(bookId))
    .sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt));

  /* Kitabın verilen andaki fiyatı (loglardan): o ana kadarki son değişimin yeni fiyatı;
     o andan önce değişim yoksa ilk değişimin eski fiyatı; hiç log yoksa güncel fiyat */
  function priceAt(book, ms) {
    const logs = priceTimeline(book.id);
    const before = logs.filter((l) => new Date(l.changedAt).getTime() <= ms);
    if (before.length) return before[before.length - 1].newPrice;
    if (logs.length) return logs[0].oldPrice;
    return book.price;
  }

  /* Gelecek tarihli (planlanan) log: tarihi gelene kadar fiyatı değiştirmez; tarihi gelince
     açık olan herhangi bir istemci kitabın fiyatını uygular (kural: books → isScheduledPrice) */
  const logEffMs = (l) => l.effectiveAt?.toMillis?.() ?? new Date(l.changedAt).getTime();
  const isFutureLog = (l, now = Date.now()) => !!l.scheduled && logEffMs(l) > now;
  const bookEffMs = (b) => b.priceEffectiveAt?.toMillis?.() ?? 0;

  /* Tarihi gelen planlı değişimleri uygular (kitap başına en son vadesi gelen; yalnızca bir kez) */
  function applyDuePrices(now = Date.now()) {
    books.forEach((b) => {
      const due = priceLogs
        .filter((l) => l.bookId === b.id && l.scheduled && l.effectiveAt && logEffMs(l) <= now && logEffMs(l) > bookEffMs(b))
        .sort((x, y) => logEffMs(y) - logEffMs(x))[0];
      if (!due || state.purgePending.has(`price:${due.id}`)) return;
      state.purgePending.add(`price:${due.id}`);
      bookRef(b.id).update({ price: due.newPrice, priceEffectiveAt: due.effectiveAt, appliedLog: due.id })
        .catch(() => {}); // başka bir istemci önce uyguladıysa kural reddeder; sorun değil
    });
  }

  /* Değişim yüzdesi: +%12 (zam) / −%10 (indirim) */
  const pricePct = (oldPrice, newPrice) => (oldPrice > 0 ? Math.round(((newPrice - oldPrice) / oldPrice) * 100) : 0);

  /* Fiyat Logu'ndan tarihli fiyat değişimi (yalnızca Fiyat Logu sayfası kullanır):
     • Bugün → kitabın fiyatı değişir + şu anki saatle log.
     • Geçmiş tarih → log o güne (12:00) yazılır; eski fiyat o günkü fiyattır.
       Sonraki ilk logun "eski fiyatı" yeni fiyata çekilir (zincir tutarlı kalır).
       O tarihten sonra başka (gerçekleşmiş) değişim yoksa kitabın güncel fiyatı da değişir.
     • Gelecek an → planlı log (seçilen tarih + saatte geçerli); kitabın fiyatı şimdi değişmez,
       zamanı gelince applyDuePrices() uygular. Zamanından önce silinirse hiçbir şey değişmez.
       Gelecek tarihte saat zorunlu; bugün saat boşsa hemen, ileri bir saatse o saatte uygulanır. */
  function priceChangeMoment(dateKey, timeKey = '') {
    const today = localDateKey();
    if (!isDateKey(dateKey)) return { error: 'Geçerli bir tarih seçin.' };
    if (dateKey < today) { const d = dateFromKey(dateKey); d.setHours(12, 0, 0, 0); return { at: d, kind: 'past' }; }
    if (!timeKey) {
      if (dateKey === today) return { at: new Date(), kind: 'now' };
      return { error: 'Gelecek tarihli değişim için saat girin.' };
    }
    if (!isTimeKey(timeKey)) return { error: 'Geçerli bir saat seçin.' };
    const d = dateFromKey(dateKey);
    d.setHours(...timeKey.split(':').map(Number), 0, 0);
    if (d.getTime() <= Date.now()) return { error: 'Bugün için ileri bir saat seç ya da saati boş bırak (hemen uygulanır).' };
    return { at: d, kind: 'future' };
  }

  function changeBookPrice(bookId, newPrice, dateKey = localDateKey(), oldPriceOverride = null, timeKey = '') {
    const book = getBook(bookId);
    if (!book) return { ok: false, reason: 'Kitap bulunamadı.' };
    newPrice = round2(newPrice);
    if (!(newPrice > 0)) return { ok: false, reason: 'Geçerli bir fiyat girin.' };
    const moment = priceChangeMoment(dateKey, timeKey);
    if (moment.error) return { ok: false, reason: moment.error };

    const { at } = moment;
    const isNow = moment.kind === 'now';
    const isFuture = moment.kind === 'future';
    // Geçmiş tarihte o günkü fiyatı Admin girebilir (zam/indirim buna göre hesaplanır)
    const override = round2(parseFloat(oldPriceOverride));
    const oldPrice = isNow ? book.price : isFuture ? priceAt(book, at.getTime()) : (override > 0 ? override : priceAt(book, at.getTime()));
    if (newPrice === oldPrice) return { ok: false, reason: `${isNow ? 'Yeni fiyat mevcut fiyatla' : 'Yeni fiyat o tarihteki fiyatla'} aynı.` };

    const later = priceTimeline(book.id).filter((l) => new Date(l.changedAt) > at);
    const laterDone = later.filter((l) => !isFutureLog(l));
    const updatesCurrent = isNow || (!isFuture && !laterDone.length);
    const batch = db.batch();
    batch.set(col('priceLogs').doc(), {
      bookId: book.id, oldPrice, newPrice,
      changedBy: state.currentUserId, changedAt: at.toISOString(), backdated: moment.kind === 'past',
      ...(isFuture ? { scheduled: true, effectiveAt: Timestamp.fromDate(at) } : {})
    });
    if (later.length) batch.update(col('priceLogs').doc(later[0].id), { oldPrice: newPrice });
    // Elle değişim de "en son geçerli an"ı ilerletir → daha eski planlı loglar bunu ezemez
    if (updatesCurrent) batch.update(bookRef(book.id), { price: newPrice, priceEffectiveAt: Timestamp.fromDate(isNow ? new Date() : at) });
    return { ok: true, book, oldPrice, newPrice, at, isToday: isNow, isFuture, updatesCurrent, pct: pricePct(oldPrice, newPrice), done: batch.commit() };
  }

  /* Kiralamayı tamamen siler (Admin). Paket (özel teklif) kiralamasında paketin
     tüm kitapları ve satın alım kaydı birlikte silinir; kitap kilitleri açılır.
     Bakiye iade edilmez. */
  function removeRental(rentalId) {
    const r = getRental(rentalId);
    if (!r) return { removed: [], done: Promise.resolve() };
    if (r.purchaseId) {
      return { removed: rentals.filter((x) => x.purchaseId === r.purchaseId), done: removePurchase(r.purchaseId) };
    }
    return { removed: [r], done: commitOps([...rentalDeleteOps([r]), ...ratingCleanupOps([r]),
      ...pointsSyncOps([r.userId], { rentals: new Set([r.id]) })]) };
  }

  /* Kiralama silme işlemleri: kayıtları sil + kitap kilidini (bu kiralamaya aitse) aç */
  function rentalDeleteOps(list) {
    const ops = [];
    list.forEach((x) => {
      ops.push((bt) => bt.delete(col('rentals').doc(x.id)));
      const b = getBook(x.bookId);
      if (b && b.lockRental === x.id) ops.push((bt) => bt.update(bookRef(b.id), { lockUntil: null, lockBy: null, lockRental: null }));
    });
    return ops;
  }

  /* Paket satın alımını ve paketin tüm kiralamalarını siler */
  function removePurchase(purchaseId) {
    const list = rentals.filter((r) => r.purchaseId === purchaseId);
    const owner = offerPurchases.find((p) => p.id === purchaseId)?.userId || list[0]?.userId;
    return commitOps([
      (bt) => bt.delete(col('offerPurchases').doc(purchaseId)),
      ...rentalDeleteOps(list),
      ...ratingCleanupOps(list),
      ...(owner ? pointsSyncOps([owner], { purchases: new Set([purchaseId]), rentals: new Set(list.map((r) => r.id)) }) : [])
    ]);
  }

  /* İstatistik kategorileri (sıfırlama): her biri kendi kayıtlarını seçer */
  const STAT_CATS = {
    normal: { label: '📚 İndirimsiz kiralamalar', pick: (r) => !r.purchaseId && !r.discountSource },
    deal:   { label: '🔥 Günün İndirimi kiralamaları', pick: (r) => !r.purchaseId && r.discountSource === 'deal' },
    new:    { label: '⭐ Yeni Kitap indirimi kiralamaları', pick: (r) => !r.purchaseId && r.discountSource === 'new' },
    custom: { label: '🏷️ Özel Fırsat kiralamaları', pick: (r) => !r.purchaseId && r.discountSource === 'custom' },
    winter: { label: '❄️ Kış Fırsatı kiralamaları', pick: (r) => !r.purchaseId && ['winter', 'winterNew'].includes(r.discountSource) },
    cheque: { label: '🎁 Hediye çekli kiralamalar', pick: (r) => !r.purchaseId && r.discountSource === 'cheque' },
    coupon: { label: '🎟️ Kuponlar ve kuponlu kiralamalar', pick: (r) => !r.purchaseId && r.discountSource === 'coupon' }, // + kupon kayıtları
    offer:  { label: '🎁 Özel teklif paketleri', pick: null } // satın alım + paket kiralamaları
  };

  /* Kullanıcının seçilen kategorilerdeki geçmişini siler; cats verilmezse tümü (bakiye değişmez) */
  function removeUserHistory(userId, cats = Object.keys(STAT_CATS)) {
    const mine = rentals.filter((r) => r.userId === userId);
    const singles = mine.filter((r) => cats.some((c) => STAT_CATS[c].pick?.(r)));
    const removed = [...singles];
    const ex = { rentals: new Set(), purchases: new Set(), coupons: new Set() };
    const ops = [...rentalDeleteOps(singles)];
    if (cats.includes('offer')) {
      const ps = offerPurchases.filter((p) => p.userId === userId);
      ps.forEach((p) => ex.purchases.add(p.id));
      ops.push(...ps.map((p) => (bt) => bt.delete(col('offerPurchases').doc(p.id))));
      const pkg = mine.filter((r) => r.purchaseId);
      removed.push(...pkg);
      ops.push(...rentalDeleteOps(pkg));
    }
    // Kupon kayıtları silinince harcanan puan geri döner
    if (cats.includes('coupon')) {
      const cs = coupons.filter((c) => c.userId === userId);
      cs.forEach((c) => ex.coupons.add(c.id));
      ops.push(...cs.map((c) => (bt) => bt.delete(col('coupons').doc(c.id))));
    }
    removed.forEach((r) => ex.rentals.add(r.id));
    // Kitaba hiç kiralaması kalmayan kullanıcının oyu da silinir · puan defteri yeniden hesaplanır
    ops.push(...ratingCleanupOps(removed), ...pointsSyncOps([userId], ex));
    return commitOps(ops);
  }

  /* Kitap türü ekle / düzenle / sil */
  function addBookType({ label, palette, inDeals, special = false }) {
    const order = bookTypes.reduce((m, t) => Math.max(m, t.order ?? 0), 0) + 1;
    return col('bookTypes').doc(uid('t')).set({ label, palette, inDeals, special, order });
  }

  /* Türü siler; o türdeki kitaplar indirim davranışı aynı olan ilk türe taşınır
     (günün indirimi döngüsünün sırası bozulmasın diye) */
  function removeBookType(typeId) {
    const t = getType(typeId);
    if (!t) return { ok: false, reason: 'Tür bulunamadı.' };
    if (bookTypes.length === 1) return { ok: false, reason: 'En az bir kitap türü kalmalı.' };
    const inUse = books.filter((b) => b.type === typeId);
    const target = bookTypes.find((x) => x.id !== typeId && x.inDeals === t.inDeals);
    if (inUse.length && !target) {
      return { ok: false, reason: `"${t.label}" türünde ${inUse.length} kitap var ve indirim ayarı aynı olan başka tür yok. Önce kitapları başka türe taşıyın.` };
    }
    const batch = db.batch();
    inUse.forEach((b) => batch.update(bookRef(b.id), { type: target.id }));
    batch.delete(col('bookTypes').doc(typeId));
    return { ok: true, moved: inUse.length, target, done: batch.commit() };
  }

  /* Okunmamış duyuru sayısı (kullanıcıya göre) */
  const unreadCount = (userId = state.currentUserId) =>
    announcements.filter((a) => !(a.readBy || []).includes(userId)).length;

  /* Duyurular sayfası açıldığında okunmamışları "okundu" yazar (yalnızca kendi uid'i eklenir) */
  function markAnnouncementsRead() {
    const id = state.currentUserId;
    const batch = db.batch();
    let n = 0;
    announcements.forEach((a) => {
      if ((a.readBy || []).includes(id) || state.readPending.has(a.id)) return;
      state.freshAnnIds.add(a.id);
      state.readPending.add(a.id);
      batch.update(col('announcements').doc(a.id), { readBy: FieldValue.arrayUnion(id) });
      n++;
    });
    if (n) batch.commit().catch((e) => console.error(e)).finally(() => state.readPending.clear());
    updateBadges();
  }

  /* Kullanıcı istatistikleri (liderlik tablosu + detay modalı) */
  function userStats(userId) {
    const rs = rentals.filter((r) => r.userId === userId);
    const singles = rs.filter((r) => !r.offerId);
    const purchases = offerPurchases.filter((p) => p.userId === userId)
      .sort((a, b) => new Date(b.purchasedAt) - new Date(a.purchasedAt));
    const discounted = singles.filter((r) => r.discount > 0)
      .sort((a, b) => new Date(b.rentedAt) - new Date(a.rentedAt));
    const saveOf = (r) => Math.max(0, (r.listPrice ?? r.price) - r.price);
    const savingDeal  = sum(discounted.filter((r) => r.discountSource === 'deal'), saveOf);
    const savingNew   = sum(discounted.filter((r) => r.discountSource === 'new'), saveOf);
    const savingCustom = sum(discounted.filter((r) => r.discountSource === 'custom'), saveOf);
    const savingWinter = sum(discounted.filter((r) => ['winter', 'winterNew'].includes(r.discountSource)), saveOf);
    const savingOffer = sum(purchases, (p) => Math.max(0, p.normalTotal - p.price));
    const savingCoupon = sum(discounted.filter((r) => r.discountSource === 'coupon'), saveOf);
    const total = round2(savingDeal + savingNew + savingCustom + savingWinter + savingOffer);
    return {
      count: rs.length,                                              // paket = paketteki kitap sayısı
      spent: round2(sum(singles, (r) => r.price) + sum(purchases, (p) => p.price)), // paket = +paket fiyatı
      purchases, discounted, saveOf,
      savings: { deal: savingDeal, new: savingNew, custom: savingCustom, winter: savingWinter, offer: savingOffer, coupon: round2(savingCoupon), total },
      points: userPoints(userId)
    };
  }

  /* Puan = indirimlerden kazanılan TL (1 ₺ = 1 puan). Kuponla yapılan indirim puan kazandırmaz.
     Harcanabilir puan = kazanılan − alınan kuponların bedeli (süresi dolan kuponun bedeli geri dönmez).
     Puan defteri: users/{id}.pointsEarned + pointsSpent · kural kupon alımında yeterliliği bununla denetler.
     • Kazanma: indirimli kiralama / paket ödemesiyle aynı batch'te artar (kural kazancı doğrular).
     • Harcama: kupon alımıyla aynı batch'te artar (kural: harcanan ≤ kazanılan).
     • Admin kayıt silince defter kayıtlardan yeniden hesaplanır; defteri olmayanınki Admin açınca kurulur.
     • pointsMult: Kış Fırsatı kiralamasında / kış paketinde o anki puan çarpanı kayda yazılır
       (çarpan sonradan değişse de eski kazançlar değişmez; kural çarpanı denetler). */
  const POINT_SOURCES = ['deal', 'new', 'custom', 'winter', 'winterNew'];
  const WINTER_SOURCES = ['winter', 'winterNew']; // puan çarpanı uygulanan kaynaklar
  const pointsMultOf = (x) => (Number.isInteger(x?.pointsMult) && x.pointsMult > 1 ? x.pointsMult : 1);
  const rentalGain = (r) => (!r.offerId && POINT_SOURCES.includes(r.discountSource) ? Math.max(0, round2(((r.listPrice ?? r.price) - r.price) * pointsMultOf(r))) : 0);
  const purchaseGain = (p) => Math.max(0, round2((p.normalTotal - p.price) * pointsMultOf(p)));
  const hasLedger = (u) => typeof u?.pointsEarned === 'number' && typeof u?.pointsSpent === 'number';
  /* Kayıtlardan puan · ex: silinmek üzere olan kayıtların kimlikleri (rentals / purchases / coupons Set) */
  function computePoints(userId, ex = {}) {
    const earned = sum(rentals.filter((r) => r.userId === userId && !ex.rentals?.has(r.id)), rentalGain)
      + sum(offerPurchases.filter((p) => p.userId === userId && !ex.purchases?.has(p.id)), purchaseGain);
    // Harcanan: alınan kuponlar + puanla açılan hediye çekleri
    const spent = sum(coupons.filter((c) => c.userId === userId && !ex.coupons?.has(c.id)), (c) => c.cost)
      + sum(giftCheques.filter((c) => c.userId === userId && c.openedAt && c.cost > 0 && !ex.cheques?.has(c.id)), (c) => c.cost);
    return { earned: round2(earned), spent: round2(spent) };
  }
  function userPoints(userId) {
    const u = getUser(userId);
    const p = hasLedger(u) ? { earned: u.pointsEarned, spent: u.pointsSpent } : computePoints(userId);
    return { earned: round2(p.earned), spent: round2(p.spent), available: Math.max(0, round2(p.earned - p.spent)) };
  }
  /* Admin: defteri kayıtlarla eşitleyen yazmalar (yalnızca farklı olanlar) */
  function pointsSyncOps(userIds, ex = {}) {
    return [...new Set(userIds)].map((id) => {
      const u = getUser(id);
      if (!u) return null;
      const p = computePoints(id, ex);
      if (hasLedger(u) && Math.abs(u.pointsEarned - p.earned) < 0.005 && Math.abs(u.pointsSpent - p.spent) < 0.005) return null;
      return (bt) => bt.update(col('users').doc(id), { pointsEarned: p.earned, pointsSpent: p.spent });
    }).filter(Boolean);
  }
  /* Admin açıkken defteri olmayan kullanıcıların defterini kur (bir kez) */
  function setupMissingLedgers() {
    if (!isRealAdmin()) return;
    const ids = users.filter((u) => !hasLedger(u) && !state.purgePending.has(`ledger:${u.id}`)).map((u) => u.id);
    if (!ids.length) return;
    ids.forEach((id) => state.purgePending.add(`ledger:${id}`));
    commitOps(pointsSyncOps(ids)).catch((e) => { console.error(e); ids.forEach((id) => state.purgePending.delete(`ledger:${id}`)); });
  }
  const formatPoints = (n) => `${(Math.round(n * 100) / 100).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} puan`;

  /* Kupon türü ve değeri (eski kayıtlar: yalnızca rate → yüzde kuponu) */
  const couponTypeOf = (c) => (COUPON_TYPES[c?.type] ? c.type : 'percent');
  const couponValueOf = (c) => Number(c?.value ?? c?.rate ?? 0);
  /* Al-Öde: bedava kitap sayısı (eski kayıtlar 1) */
  const couponFreeOf = (c) => Math.max(1, Number(c?.free ?? 1));
  /* Kısa rozet (%10 · ₺20 · 3 Al 2 Öde) ve uzun ad */
  function couponBadge(c) {
    const v = couponValueOf(c);
    return { percent: `%${v}`, amount: formatMoney(v), bogo: `${v} Al ${v - couponFreeOf(c)} Öde` }[couponTypeOf(c)];
  }
  function couponTitle(c) {
    const v = couponValueOf(c);
    const auto = { percent: `%${v} İndirim Kuponu`, amount: `${formatMoney(v)} İndirim Kuponu`, bogo: `${v} Al ${v - couponFreeOf(c)} Öde Kuponu` }[couponTypeOf(c)];
    return c?.name ? `${c.name} · ${auto}` : auto;
  }
  /* Al-Öde açıklaması: "3 kitap seç, en düşük fiyatlı 1 tanesi bedava" */
  const bogoText = (c) => `${couponValueOf(c)} kiralık kitap seç, en düşük fiyatlı ${couponFreeOf(c) > 1 ? `${couponFreeOf(c)} tanesi` : 'olan'} bedava`;
  /* Tek kitaplık kuponun (yüzde / ₺) uygulandığı fiyat */
  function couponPrice(c, price) {
    const v = couponValueOf(c);
    return couponTypeOf(c) === 'amount' ? Math.max(0, round2(price - v)) : round2(price * (1 - v / 100));
  }
  const COUPON_TONES = { percent: 'from-emerald-400 to-teal-500', amount: 'from-sky-400 to-indigo-500', bogo: 'from-fuchsia-500 to-rose-500' };

  /* Kupon durumu: aktif (kullanılmamış, süresi dolmamış) · kullanıldı · süresi doldu */
  /* Kış kuponu (season 'winter') yalnızca Kış sezonu boyunca kullanılabilir */
  const couponState = (c, now = Date.now()) => (c.usedAt ? 'used'
    : c.expiresMs > now && (c.season !== 'winter' || activeSeason() === 'winter') ? 'active' : 'expired');
  const activeCouponsOf = (userId, now = Date.now()) => coupons
    .filter((c) => c.userId === userId && couponState(c, now) === 'active')
    .sort((a, b) => a.expiresMs - b.expiresMs);
  /* Kupon yalnızca Kiralık, başka indirimi olmayan ve boştaki kitaba uygulanır */
  // (yeni kış paketindeki kitap tek başına indirimsiz görünse de pakete aittir → kupon / çek uygulanmaz)
  const couponEligible = (book, now = new Date()) => isRentableStatus(book) && hasPrice(book)
    && getEffectiveDiscount(book, now).rate === 0 && !winterOfferOf(book) && !isBookRented(book, now.getTime()) && !isBookLocked(book, now.getTime());

  /* --- Hediye çeki (₺) · Admin gönderir; ücretsizse hemen, puanlıysa sahibi puanıyla açınca kullanılır ---
     Kupon gibi tek kullanımlık, yalnızca Kiralık ve indirimsiz kitaba (couponEligible) · fiyat 0'ın altına inmez.
     Kış sezonunda gönderilen çek (season 'winter') yalnızca sezon boyunca geçerlidir. */
  const chequeExpired = (c, now = Date.now()) => (c.expiresMs || 0) <= now || (c.season === 'winter' && activeSeason() !== 'winter');
  const chequeState = (c, now = Date.now()) => (c.usedAt ? 'used' : chequeExpired(c, now) ? 'expired' : c.openedAt ? 'active' : 'locked');
  const chequesOf = (userId) => giftCheques.filter((c) => c.userId === userId);
  const activeChequesOf = (userId, now = Date.now()) => chequesOf(userId)
    .filter((c) => chequeState(c, now) === 'active').sort((a, b) => a.expiresMs - b.expiresMs);
  const chequePrice = (c, price) => Math.max(0, round2(price - c.amount));

  function couponCardHTML(c, now = Date.now(), withUse = false) {
    const st = couponState(c, now);
    const type = couponTypeOf(c);
    const usedBooks = (c.bookIds || (c.bookId ? [c.bookId] : [])).map(getBook).filter(Boolean);
    const tone = st === 'active' ? COUPON_TONES[type] : st === 'used' ? 'from-slate-300 to-slate-400' : 'from-rose-300 to-rose-400';
    const sub = st === 'active' ? `⏳ ${formatRemaining(c.expiresMs - now)} · son ${formatDate(new Date(c.expiresMs).toISOString(), true)}`
      : st === 'used' ? `✓ ${usedBooks.length ? usedBooks.map((b) => `"${escapeHTML(b.title)}"`).join(', ') : 'Kitap'} için kullanıldı · ${formatDate(c.usedAt, true)}`
      : `Süresi doldu · ${formatDate(new Date(c.expiresMs).toISOString(), true)}`;
    return `
      <li class="flex items-stretch rounded-2xl overflow-hidden border border-slate-100 bg-white ${st === 'active' ? '' : 'opacity-70'}">
        <div class="w-24 shrink-0 bg-gradient-to-br ${tone} text-white flex flex-col items-center justify-center py-2.5 px-1 relative text-center">
          <span class="${type === 'bogo' ? 'text-sm' : 'text-lg'} font-black leading-tight">${couponBadge(c)}</span>
          <span class="text-[8px] font-bold tracking-widest mt-1">KUPON</span>
          <span class="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white"></span>
        </div>
        <div class="flex-1 min-w-0 px-3 py-2.5 border-l-2 border-dashed border-slate-200">
          <p class="text-xs font-semibold text-slate-700">${escapeHTML(couponTitle(c))} <span class="text-[10px] font-medium text-slate-400">· ${formatPoints(c.cost)}</span></p>
          <p class="text-[10px] ${st === 'active' ? 'text-emerald-600' : 'text-slate-400'} mt-0.5 leading-snug">${sub}</p>
          ${withUse && st === 'active' ? (type === 'bogo'
            ? `<button type="button" data-use-bogo="${c.id}" class="${BTN_PRIMARY} !py-1.5 !text-[11px] mt-2">${c.value} kitap seç · Kullan</button>`
            : '<p class="text-[10px] text-slate-400 mt-1.5">Kullanmak için: kiralık bir kitabın detayında kuponu seç → Kirala</p>') : ''}
        </div>
      </li>`;
  }

  function computeLeaderboard() {
    return users
      .map((u) => ({ user: u, ...userStats(u.id) }))
      .sort((a, b) => b.spent - a.spent || b.count - a.count || a.user.name.localeCompare(b.user.name, 'tr'));
  }

