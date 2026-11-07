  /* ==========================================================
     8) ANA SAYFA (DASHBOARD)
     ========================================================== */
  function renderDashboard() {
    const now = new Date();
    const u = currentUser();
    $('#page-dashboard [data-page-desc]').textContent = `Merhaba ${u.name.split(' ')[0]} 👋 Kitaplığın genel görünümü ve günün fırsatları.`;
    renderStats(now);
    renderShowcaseSettings();
    renderNewBooks(now);
    renderVitrine(now);
    renderMuseumShowcase(now);
    renderUpcoming();
    renderDeals(now);
    renderActiveRentals(now);
    renderExpiredRentals(now);
    state.lastDealDay = discountDayNumber(now);
  }

  /* --- 8.1 İstatistik kartları --- */
  function renderStats(now) {
    const nowMs = now.getTime();
    const shown = visibleBooks();
    const typeSummary = bookTypes
      .map((t) => `${shown.filter((b) => b.type === t.id).length} ${escapeHTML(t.label.toLocaleLowerCase('tr'))}`)
      .join(' · ');
    const active = rentals.filter((r) => isActiveRental(r, nowMs));
    const myActive = active.filter((r) => r.userId === state.currentUserId).length;
    const rentableNow = shown.filter((b) => isRentableStatus(b) && !isBookRented(b, nowMs)).length;
    const deals = getDailyDeals(now);
    const maxRate = deals.ids.length ? Math.max(...deals.ids.map(getDiscountRate)) : 0;
    const lastUpd = sortedUpdates()[0];

    // href: karta basınca o sayfa açılır
    const cards = [
      { label: 'Toplam Kitap',   value: shown.length,              sub: typeSummary, icon: 'books',   tone: 'bg-brand-50 text-brand-600', href: '#books' },
      { label: 'Kirada',         value: active.length,             sub: `Sende ${myActive} · ${rentableNow} kitap kiralık`,                   icon: 'rentals', tone: 'bg-emerald-50 text-emerald-600', href: '#rentals' },
      // Son sürüm notu · basınca o güncelleme açılır
      { label: 'Son Güncelleme', value: lastUpd ? escapeHTML(lastUpd.version) : '—',
        sub: lastUpd ? `${lastUpd.title ? `${escapeHTML(lastUpd.title)} · ` : ''}${relativeDay(lastUpd.createdAt || lastUpd.releaseDate)}` : 'Henüz sürüm notu yok',
        icon: 'sparkles', tone: 'bg-violet-50 text-violet-600', ann: lastUpd?.id, isNew: !!lastUpd && lastUpd.id === newUpdateId() },
      // Günün İndirimi vitrini kapalıysa kart hiç gösterilmez
      showcaseOn('deals') && { label: 'Günün İndirimi', value: deals.ids.length ? `%${maxRate}` : '—', sub: deals.ids.length ? `${deals.ids.length} kitapta · en yüksek` : 'Bugün fırsat yok', icon: 'tag', tone: 'bg-rose-50 text-rose-500' }
    ].filter(Boolean);

    // Mobilde yazılar kesilmesin: ikon küçülür, alt satır 2 satıra kadar kayar
    $('#dashStats').classList.toggle('lg:grid-cols-4', cards.length === 4);
    $('#dashStats').classList.toggle('lg:grid-cols-3', cards.length === 3);
    // href → bağlantı · ann → duyuruyu açan düğme · ikisi de yoksa düz kart
    $('#dashStats').innerHTML = cards.map((c) => {
      const tag = c.href ? 'a' : c.ann ? 'button' : 'div';
      const open = c.href ? `a href="${c.href}"` : c.ann ? `button type="button" data-open-ann="${c.ann}"` : 'div';
      return `
      <${open} class="bg-white rounded-2xl shadow-soft p-3 sm:p-4 flex items-start justify-between gap-2 sm:gap-3 hover:shadow-soft-lg transition min-w-0 text-left w-full${c.href || c.ann ? ' cursor-pointer hover:ring-1 hover:ring-brand-200' : ''}">
        <div class="min-w-0">
          <p class="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">${c.label}${c.isNew ? newUpdateBadge : ''}</p>
          <p class="text-base sm:text-xl font-bold text-slate-800 mt-1 truncate">${c.value}</p>
          <p class="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">${c.sub}</p>
        </div>
        <span class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${c.tone} flex items-center justify-center shrink-0">${icon(c.icon)}</span>
      </${tag}>`;
    }).join('');
  }

  /* --- 8.1.3 Ana Sayfa Ayarları (yalnızca Admin) · vitrinleri açar / kapatır ---
     Kapalı vitrin hiç yokmuş gibidir (bkz. showcaseOn). Günün İndirimi kapatılırken o anki grup saklanır;
     başka bir gün açılırsa o gruptan devam eder ve yine sonraki 10:00'a kadar sürer. */
  const SHOWCASES = [
    { key: 'vitrine',  icon: '🏷️', label: 'Fırsatlar',  desc: "Admin'in seçtiği kitap + yüzde indirimleri" },
    { key: 'deals',    icon: '🔥', label: 'Günün İndirimi',  desc: `Her gün ${String(DISCOUNT_SETTINGS.resetHour).padStart(2, '0')}:00'da değişen 3'lü seri indirimi` },
    { key: 'newBooks', icon: '★',  label: 'Yeni Kitap',      desc: `Yeni çıkan kitaplara ${NEW_BOOK_DISCOUNT.days} gün %${NEW_BOOK_DISCOUNT.rate} indirim` },
    { key: 'museum',   icon: '🏛️', label: 'Müze Vitrini',    desc: 'Müze\'deki kitaplar belirlenen süre ve fiyatla sergilenip kiralanır' },
    { key: 'upcoming', icon: '📖', label: 'Yakında Geliyor', desc: 'Yakında / Planlanıyor durumundaki kitaplar · Günün İndirimleri\'nin üstünde' }
  ];

  /* Ana Sayfa Ayarları: sayfa başlığının sağında tek buton (kapalı vitrin sayısıyla) ·
     pencerede vitrinlerin anahtarları */
  function renderShowcaseSettings() {
    if (!isAdmin()) { setPageActions('dashboard', ''); return; }
    const off = SHOWCASES.filter((s) => !showcaseOn(s.key)).length;
    setPageActions('dashboard', `
      <button type="button" data-open-showcase
        class="flex items-center gap-2 pl-3 pr-3.5 py-2 rounded-full bg-white shadow-soft border border-slate-100 hover:border-brand-200 hover:shadow-soft-lg text-xs font-semibold text-slate-700 transition">
        <span class="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[11px]">⚙️</span>
        Ana Sayfa Ayarları
        ${off ? `<span class="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">${off} vitrin kapalı</span>` : ''}
      </button>`);
  }

  function openShowcaseModal() {
    if (!requireAdmin()) return;
    openModal(`
      ${modalHeader('Ana Sayfa Ayarları ⚙️', 'Kapalı vitrin hiç yokmuş gibidir: kimse görmez, indirimi uygulanmaz.', 'tag', 'bg-slate-100 text-slate-700')}
      <div class="p-5 space-y-4">
        <div>
          <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Vitrinler</p>
          <div id="showcaseList" class="space-y-2"></div>
        </div>
        <button type="button" data-modal-close class="${BTN_SOFT} w-full !py-2.5">Kapat</button>
      </div>`);
    renderShowcaseList();
  }

  function renderShowcaseList() {
    const box = $('#showcaseList');
    if (!box) return;
    const sc = showcaseDoc();
    const size = DISCOUNT_SETTINGS.groupSize;
    const note = (key, on) => {
      if (on) return '';
      if (key === 'deals' && Number.isInteger(sc.dealsPausedGroup)) {
        const from = sc.dealsPausedGroup * size + 1;
        return `<span class="block text-[10px] font-semibold text-amber-600 mt-0.5">⏸ Duraklatıldı · açılınca Sıra ${from}–${from + size - 1}'den devam eder</span>`;
      }
      return '<span class="block text-[10px] font-semibold text-slate-400 mt-0.5">Kapalı · ana sayfada görünmez, indirimi uygulanmaz</span>';
    };
    const row = ({ key, icon: ic, label, desc }) => {
      const on = showcaseOn(key);
      return `
        <button type="button" data-showcase-toggle="${key}" aria-pressed="${on}"
          class="w-full flex items-center gap-3 p-2.5 rounded-2xl border text-left transition ${on ? 'bg-white border-brand-100 hover:border-brand-200' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}">
          <span class="w-9 h-9 rounded-xl ${on ? 'bg-brand-50 text-brand-600' : 'bg-slate-200 text-slate-400 grayscale'} flex items-center justify-center text-base shrink-0">${ic}</span>
          <span class="min-w-0 flex-1">
            <span class="block text-xs font-bold ${on ? 'text-slate-700' : 'text-slate-400'}">${label}</span>
            <span class="block text-[10px] text-slate-400">${desc}</span>
            ${note(key, on)}
          </span>
          <span class="relative w-9 h-5 rounded-full shrink-0 transition ${on ? 'bg-emerald-500' : 'bg-slate-300'}">
            <span class="absolute top-0.5 ${on ? 'left-[18px]' : 'left-0.5'} w-4 h-4 rounded-full bg-[#fff] shadow transition-all"></span>
          </span>
        </button>`;
    };
    box.innerHTML = SHOWCASES.map(row).join('');
  }

  function setShowcase(key, on) {
    if (!requireAdmin()) return;
    const sc = SHOWCASES.find((s) => s.key === key);
    if (!sc) return;
    const now = new Date();
    const today = discountDayNumber(now);
    const data = { [key]: !!on };
    const batch = db.batch();
    if (key === 'deals' && !on) {
      // Kapanırken o anki grup saklanır
      Object.assign(data, { dealsPausedDay: today, dealsPausedGroup: getDailyDeals(now).group });
    }
    const paused = showcaseDoc();
    if (key === 'deals' && on && Number.isInteger(paused.dealsPausedDay) && paused.dealsPausedDay !== today) {
      // Başka bir gün açıldı: döngü kapalıyken ilerlemesin, saklanan gruptan devam etsin
      batch.set(col('settings').doc('deals'), {
        pinDay: today, pinGroup: Number(paused.dealsPausedGroup) || 0, pinAt: now.toISOString(), pinBy: state.currentUserId, pinResume: true
      }, { merge: true });
    }
    batch.set(col('settings').doc('showcase'), data, { merge: true });
    run(batch.commit(), `${sc.icon} ${sc.label} ${on ? 'açıldı' : 'kapatıldı'}.`, on ? 'success' : 'info')
      .then(() => renderShowcaseList()); // pencere açıksa anahtarlar güncellenir
  }

  /* --- 8.1.5 Yeni Kitap vitrini (altın parıltılı, günün indirimlerinden ayrı) --- */
  function renderNewBooks(now) {
    const list = books
      .filter((b) => isNewBook(b, now) && isVisibleBook(b))
      .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    const box = $('#newBooksSection');
    state.lastNewKey = newBooksKey(now);
    if (!list.length) { box.innerHTML = ''; return; }

    const cards = list.map((b) => {
      const eff = getEffectiveDiscount(b, now);
      const newPrice = round2(b.price * (1 - eff.rate / 100));
      const rented = isBookRented(b, now.getTime());
      return `
        <button type="button" data-open-book="${b.id}"
          class="group relative text-left bg-white/90 backdrop-blur rounded-2xl border border-amber-200 p-4 shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 hover:border-amber-300 transition duration-200 focus:outline-none focus:ring-2 focus:ring-amber-300">
          <span class="absolute -top-2 -right-2 text-[10px] font-extrabold text-white bg-gradient-to-r from-amber-400 to-yellow-500 px-2.5 py-1 rounded-full shadow-soft">★ YENİ KİTAP</span>
          <div class="flex gap-3">
            <div class="relative shrink-0">
              ${coverHTML(b, 'md')}
              <span class="twinkle absolute -top-1.5 -left-1.5 text-amber-400 text-sm">✦</span>
              <span class="twinkle twinkle-d1 absolute -bottom-1 -right-1.5 text-yellow-400 text-xs">✦</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-[10px] font-semibold uppercase tracking-wider text-amber-600">${escapeHTML(seriesLabel(b))}</p>
              <p class="text-xs font-semibold text-slate-800 mt-0.5 line-clamp-2">${escapeHTML(b.title)}</p>
              <p class="text-[11px] text-slate-400 truncate">${escapeHTML(authorName(b))}</p>
              ${statusChipHTML(b, now.getTime(), 'mt-1.5')}
            </div>
          </div>
          <div class="flex items-end justify-between mt-3 pt-3 border-t border-dashed border-amber-200">
            <div>
              <div class="flex items-baseline gap-1">
                <span class="text-4xl font-black leading-none tracking-tight bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-500 bg-clip-text text-transparent">%${eff.rate}</span>
                <span class="text-[10px] font-extrabold text-amber-500 tracking-wider">İNDİRİM</span>
              </div>
              <p class="text-[10px] font-semibold text-amber-700 mt-1">⏳ ${formatRemaining(newDiscountLeftMs(b, now))}</p>
            </div>
            <div class="text-right">
              <p class="text-[11px] text-slate-400 line-through">${formatMoney(b.price)}</p>
              <p class="text-sm font-bold text-emerald-600">${formatMoney(newPrice)}</p>
            </div>
          </div>
        </button>`;
    }).join('');

    box.innerHTML = `
      <div class="new-glow rounded-3xl p-[2px] shadow-soft-lg mb-6">
        <div class="rounded-[22px] bg-gradient-to-br from-amber-50 via-white to-yellow-50 p-4 sm:p-5">
          <div class="flex items-center justify-between gap-3 mb-4">
            <div class="flex items-center gap-3">
              <span class="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-white flex items-center justify-center shadow-soft text-lg">★</span>
              <div>
                <h2 class="text-sm font-bold text-slate-800 flex items-center gap-1.5">Yeni Kitap <span class="twinkle text-amber-400">✨</span></h2>
                <p class="text-[11px] text-slate-500">Yeni çıkan kitaplar ${NEW_BOOK_DISCOUNT.days} gün boyunca %${NEW_BOOK_DISCOUNT.rate} indirimli</p>
              </div>
            </div>
            <span class="hidden sm:flex items-center gap-1 text-amber-400">
              <span class="twinkle">✦</span><span class="twinkle twinkle-d1 text-lg">✦</span><span class="twinkle twinkle-d2">✦</span>
            </span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">${cards}</div>
        </div>
      </div>`;
  }

  /* --- 8.1.7 Fırsatlar (eski adları Vitrin İndirimleri, Özel Fırsatlar) · Admin ekler / düzenler / siler ---
     Sitenin kart tarzında bölüm (ikon + başlık + alt yazı, sağda Admin butonu) · kartlar renkli ve canlı (sabit renk, light-scope). */

  /* Fırsat temaları · discounts/{id}.theme (alan yoksa 'normal') · yalnızca görünüm: indirim, fiyat ve süre kuralları aynı.
     Yeni tema eklemek: buraya bir kayıt (+ styles.css'te .deal-theme-<anahtar> zemini; süs/kar gerekiyorsa dealDecorHTML).
     section: true → bölümde bu temada fırsat varsa bölüm başlığı ve zemini de temaya geçer */
  const DEAL_THEMES = {
    normal: { label: 'Normal',        emoji: '🏷️', tag: 'Fırsat',          desc: 'Sitenin renkleriyle canlı fırsat kartı' },
    winter: { label: 'Yılbaşı / Kış', emoji: '❄️', tag: 'Yılbaşı Fırsatı', desc: 'Gece / buz mavisi, kar yağışı, kar birikintisi ve süsler',
      section: { icon: '❄️', iconTone: 'from-sky-400 to-indigo-600', title: 'Yılbaşı Fırsatları', sub: 'Kışa özel fırsatlar geldi · sınırlı süre ⛄',
        bg: 'bg-gradient-to-b from-sky-50 via-white to-white', ring: 'ring-1 ring-sky-100' } }
  };
  const dealThemeOf = (d) => (DEAL_THEMES[d?.theme] ? d.theme : 'normal');

  /* Temanın kart içi süsleri · mini: pencere önizlemesi (küçük) */
  function dealDecorHTML(theme, mini = false) {
    if (theme !== 'winter') return '<span class="absolute inset-0 offer-pattern opacity-40 pointer-events-none"></span>';
    return `
      <span class="deal-snow" aria-hidden="true"></span>
      <span class="deal-snowcap" aria-hidden="true"></span>
      <span class="deal-ornament spin ${mini ? 'right-1.5 top-3 text-xs' : 'right-3 top-5 text-lg'}" aria-hidden="true">❄️</span>
      ${mini ? '' : `<span class="deal-ornament left-2 bottom-2 text-base -rotate-12 opacity-90" aria-hidden="true">🌲</span>
      <span class="deal-ornament right-10 top-6 text-[10px] opacity-80" aria-hidden="true">✦</span>`}`;
  }

  /* Süresi biten fırsatlar: herkes için gizlenir, siteyi açan herkes Firestore'dan da siler
     (kural süre dolmuş mu denetler · reddedilirse bu oturumda yeniden denenmez) */
  function purgeExpiredVitrine(now = new Date()) {
    if (!currentUser()) return;
    discounts.filter((d) => d.endsMs != null && d.endsMs <= now.getTime()).forEach((d) => {
      const key = `vitrine:${d.id}`;
      if (state.purgePending.has(key)) return;
      state.purgePending.add(key);
      col('discounts').doc(d.id).delete().catch((e) => console.error(e));
    });
  }

  /* Fırsat kartı geri sayımı (2g 04:13:22) · cihaz saatiyle, veri harcamaz */
  function gsTimerText(ms) {
    if (ms <= 0) return '⏳ Süre doldu';
    const pad = (n) => String(n).padStart(2, '0');
    const d = Math.floor(ms / DAY_MS);
    const clock = `${pad(Math.floor((ms % DAY_MS) / HOUR_MS))}:${pad(Math.floor((ms % HOUR_MS) / 6e4))}:${pad(Math.floor((ms % 6e4) / 1e3))}`;
    return `⏳ ${d ? `${d}g ` : ''}${clock}`;
  }
  /* tick() her saniye çağırır · son 24 saatte kırmızı · süresi biten fırsat vitrinden düşsün diye vitrin yeniden çizilir */
  function updateVitrineTimers(now) {
    let expired = false;
    $$('#vitrineSection [data-gs-ends]').forEach((el) => {
      const left = Number(el.dataset.gsEnds) - now.getTime();
      el.textContent = gsTimerText(left);
      el.classList.toggle('deal-urgent', left < DAY_MS);
      if (left <= 0) expired = true;
    });
    if (expired) renderVitrine(now);
  }

  function renderVitrine(now) {
    const admin = isAdmin();
    purgeExpiredVitrine(now);
    const list = discounts
      .map((d) => ({ d, b: getBook(d.bookId) }))
      .filter(({ d, b }) => b && hasPrice(b) && isVisibleBook(b) && customDiscountOf(b, now) === d)
      .sort((x, y) => y.d.rate - x.d.rate || new Date(y.d.createdAt) - new Date(x.d.createdAt));
    const box = $('#vitrineSection');
    if (!showcaseOn('vitrine') || (!list.length && !admin)) { box.innerHTML = ''; return; }

    const cards = list.map(({ d, b }) => {
      const theme = dealThemeOf(d);
      const t = DEAL_THEMES[theme];
      const eff = getEffectiveDiscount(b, now);
      const newPrice = round2(b.price * (1 - eff.rate / 100));
      const free = newPrice <= 0;
      const rented = isBookRented(b, now.getTime()) || isBookLocked(b, now.getTime());
      const left = d.endsMs == null ? null : d.endsMs - now.getTime();
      return `
        <div data-open-book="${b.id}" role="button" tabindex="0"
          class="light-scope deal-card deal-theme-${theme} ${free ? 'is-free' : ''} ${rented ? 'is-rented' : ''} group relative overflow-hidden rounded-2xl text-white text-left shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 transition duration-200 cursor-pointer focus:outline-none focus:ring-4 focus:ring-brand-200">
          ${dealDecorHTML(theme)}
          <div class="relative z-[2] p-4 ${theme === 'winter' ? 'pt-6' : ''}">
            <!-- Üst satır: tema etiketi + kalan süre · Admin: düzenle / kaldır -->
            <div class="flex items-center justify-between gap-2">
              <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${theme === 'winter' ? 'bg-sky-50 text-sky-800' : 'bg-white/20 text-white'} truncate">${t.emoji} ${escapeHTML(t.tag)}</span>
              <span class="flex items-center gap-1.5 shrink-0">
                ${left == null ? '<span class="deal-timer">∞ Süresiz</span>'
                  : `<span class="deal-timer tabular-nums ${left < DAY_MS ? 'deal-urgent' : ''}" data-gs-ends="${d.endsMs}">${gsTimerText(left)}</span>`}
                ${admin ? `
                  <button type="button" data-edit-vitrine="${d.id}" title="Fırsatı düzenle" aria-label="Fırsatı düzenle"
                    class="w-7 h-7 rounded-full bg-white/20 hover:bg-[#fff] hover:text-brand-600 flex items-center justify-center transition">${icon('pencil', 'w-3.5 h-3.5 pointer-events-none')}</button>
                  <button type="button" data-delete-vitrine="${d.id}" title="Fırsatı kaldır" aria-label="Fırsatı kaldır"
                    class="w-7 h-7 rounded-full bg-white/20 hover:bg-rose-500 flex items-center justify-center transition">${icon('close', 'w-3.5 h-3.5 pointer-events-none')}</button>` : ''}
              </span>
            </div>

            <div class="flex gap-4 mt-3">
              <div class="deal-cover relative shrink-0">
                ${coverHTML(b, 'lg')}
                ${rented ? '<span class="absolute inset-x-0 bottom-2 mx-auto w-fit text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900/80 text-white">🔒 Kirada</span>' : ''}
              </div>
              <div class="flex-1 min-w-0 flex flex-col">
                <p class="text-[11px] font-semibold text-white/80 truncate">${escapeHTML(d.name || t.tag)}</p>
                <p class="text-sm sm:text-base font-bold leading-snug line-clamp-2 mt-0.5">${escapeHTML(b.title)}</p>
                <p class="text-[10px] font-semibold text-white/70 truncate mt-0.5">${escapeHTML(seriesLabel(b))}</p>
                <!-- İndirim: yüzde büyük · eski fiyat üstü çizili · yeni fiyat belirgin -->
                <div class="mt-auto pt-3 flex items-end justify-between gap-2">
                  <div class="flex items-baseline gap-1 leading-none">
                    ${free ? '<span class="text-3xl font-black tracking-tight">BEDAVA</span>' : `
                    <span class="text-4xl font-black tracking-tight">%${eff.rate}</span>
                    <span class="text-[10px] font-extrabold tracking-wider text-white/80">İNDİRİM</span>`}
                  </div>
                  <div class="text-right leading-tight">
                    <p class="text-[11px] text-white/65 line-through">${formatMoney(b.price)}</p>
                    <p class="text-lg font-black ${theme === 'winter' ? 'text-sky-100' : 'text-amber-200'}">${free ? 'Bedava' : formatMoney(newPrice)}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Kirala: sitedeki buton tarzı (beyaz zemin üstünde marka rengi) · kitap detayını açar -->
            <span class="mt-4 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-xs font-semibold shadow-soft transition ${rented
              ? 'bg-white/25 text-white/80'
              : 'bg-[#fff] text-brand-700 group-hover:bg-brand-50'}">${rented ? '🔒 Şu an kirada · detay' : `Kirala ${free ? '· bedava' : `· ${formatMoney(newPrice)}`} →`}</span>
          </div>
        </div>`;
    }).join('');

    // Tek fırsat: ortada dengeli genişlik · 2: iki sütun · 3+: üç sütun (telefonda hep alt alta)
    const gridCls = list.length === 1 ? 'grid-cols-1 max-w-md mx-auto'
      : list.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    // Bölüm teması: o temada (section tanımlı) en az bir fırsat varsa başlık ve zemin temaya geçer
    const secKey = Object.keys(DEAL_THEMES).find((k) => DEAL_THEMES[k].section && list.some(({ d }) => dealThemeOf(d) === k));
    const sec = secKey ? DEAL_THEMES[secKey].section : null;

    box.innerHTML = `
      <div class="relative overflow-hidden rounded-2xl shadow-soft p-4 sm:p-5 mb-6 ${sec ? `${sec.bg} ${sec.ring}` : 'bg-white ring-1 ring-amber-100'}">
        ${sec ? '<span class="deal-snow is-soft" aria-hidden="true"></span>' : ''}
        <div class="relative z-[2] flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div class="flex items-center gap-3">
            <span class="w-9 h-9 rounded-xl bg-gradient-to-br ${sec ? sec.iconTone : 'from-amber-400 to-rose-500'} text-white flex items-center justify-center shadow-soft text-base shrink-0">${sec ? sec.icon : '🏷️'}</span>
            <div>
              <h2 class="text-sm font-bold text-slate-800 flex items-center gap-1.5">${sec ? sec.title : 'Fırsatlar'}
                ${list.length ? `<span class="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">${list.length} fırsat</span>` : ''}</h2>
              <p class="text-[11px] text-slate-400">${sec ? sec.sub : 'Sınırlı süreli kitap fırsatları · kaçırma!'}</p>
            </div>
          </div>
          ${admin ? `<button type="button" data-add-vitrine class="${BTN_PRIMARY} self-start sm:self-auto">${icon('plus', 'w-3.5 h-3.5')}İndirim Ekle</button>` : ''}
        </div>
        ${list.length
          ? `<div class="relative z-[2] grid ${gridCls} gap-4">${cards}</div>`
          : emptyState('Henüz fırsat yok · <b>İndirim Ekle</b> ile kitap, yüzde ve tema seçerek ekleyebilirsin.<br/><span class="text-[10px]">Bu boş alanı yalnızca Adminler görür.</span>', 'relative z-[2] !py-8')}
      </div>`;
  }

  /* --- 8.1.8 Müze Vitrini · Müze'deki kitaplar camekânda sergilenir, sergi süresince kiralanabilir ---
     Loş müze salonu · kadife zeminli cam kutu, tepeden spot ışık, cam yansıması, ahşap kaide üstünde pirinç etiket */
  function renderMuseumShowcase(now) {
    const box = $('#museumShowcaseSection');
    const admin = isAdmin();
    const list = exhibitBooks(now.getTime());
    if (!showcaseOn('museum') || (!list.length && !admin)) { box.innerHTML = ''; return; }
    const canAdd = admin && museumBooks.some((b) => isExhibitable(b) && !isOnExhibit(b, now.getTime()));

    const caseHTML = (b) => {
      const rented = isBookRented(b, now.getTime());
      const end = exhibitEndMs(b);
      return `
        <div data-open-museum="${b.id}" role="button" tabindex="0" class="museum-case group cursor-pointer focus:outline-none">
          <div class="mc-glass">
            <div class="mc-back"></div>
            <div class="mc-floor"></div>
            <div class="mc-light"></div>
            <div class="mc-specimen">${museumCoverHTML(b, 'case')}</div>
            <span class="mc-tag">No. ${String(b.id).padStart(3, '0')}</span>
            ${rented ? '<span class="mc-rented">Ödünç verildi</span>' : ''}
            <div class="mc-shine"></div>
          </div>
          <div class="mc-plinth">
            <div class="mc-plaque">
              <p class="mc-plaque-title">${escapeHTML(b.title)}</p>
              <p class="mc-plaque-sub">${escapeHTML(museumStyle(b).label)}${isDateKey(b.releaseDate) ? ` · ${b.releaseDate.slice(0, 4)}` : ''}</p>
              <div class="mc-plaque-row">
                <span>⏳ ${formatRemaining(end - now.getTime())}</span>
                <b>${formatMoney(b.exhibitPrice)}</b>
              </div>
            </div>
          </div>
        </div>`;
    };

    box.innerHTML = `
      <div class="light-scope museum-hall relative rounded-3xl overflow-hidden shadow-soft-lg mb-6 p-4 sm:p-6">
        <div class="museum-hall-lamps absolute inset-x-0 top-0 pointer-events-none"></div>
        <div class="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div class="flex items-center gap-3">
            <span class="w-11 h-11 rounded-full bg-gradient-to-br from-amber-200 via-amber-500 to-amber-800 p-[1.5px] shadow-soft shrink-0">
              <span class="w-full h-full rounded-full bg-stone-900 flex items-center justify-center text-lg">🏛️</span>
            </span>
            <div>
              <h2 class="museum-gold text-lg sm:text-xl font-extrabold italic leading-tight" style="font-family:'Playfair Display',Georgia,serif">Müze Vitrini</h2>
              <p class="text-[11px] text-stone-400">Müzemizden seçilen eserler kısa bir süreliğine sergide · sergi bitince yeniden Müze'ye döner</p>
            </div>
          </div>
          ${admin ? `<button type="button" data-add-exhibit ${canAdd ? '' : 'disabled'}
            class="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-bold text-stone-900 bg-gradient-to-r from-amber-200 to-amber-400 hover:from-amber-100 hover:to-amber-300 shadow-soft transition disabled:opacity-40 disabled:cursor-not-allowed">${icon('plus', 'w-3.5 h-3.5')}Sergiye Koy</button>` : ''}
        </div>
        ${list.length
          ? `<div class="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-7 sm:gap-x-6">${list.map(caseHTML).join('')}</div>`
          : `<p class="relative text-center text-xs text-stone-400 py-8 border border-dashed border-amber-200/20 rounded-2xl">Şu an sergide eser yok · <b class="text-amber-300">Sergiye Koy</b> ile Müze'den sergilenebilir bir kitap seçebilirsin.<br/><span class="text-[10px] text-stone-500">Bu boş alanı yalnızca Adminler görür.</span></p>`}
      </div>`;
  }

  /* Admin: fırsat ekle / düzenle (aynı kitaba yeniden eklemek indirimi günceller).
     Başka bir indirimdeki kitap (günün indirimi, yeni kitap, aktif özel teklif) seçilemez.
     editId: düzenlenecek fırsat (kitap değiştirilemez; ad, yüzde, bitiş ve tema değişir) */
  function openVitrineModal(editId = null) {
    if (!requireAdmin()) return;
    const now = new Date();
    const edit = editId ? discounts.find((x) => x.id === editId) : null;
    const editBook = edit ? getBook(edit.bookId) : null;
    if (editId && !editBook) return toast('Fırsat bulunamadı.', 'error');
    let bookField;
    if (editBook) {
      bookField = field('Kitap', `
        <input type="hidden" name="bookId" id="vd-book" value="${editBook.id}" />
        <p class="${INPUT_CLS} !bg-slate-50 text-slate-500 truncate">${escapeHTML(seriesLabel(editBook))} · ${escapeHTML(editBook.title)} · ${formatMoney(editBook.price)}</p>`,
        'Düzenlerken kitap değiştirilemez; başka kitap için fırsatı kaldırıp yenisini ekle.');
    } else {
      const dealIds = getDailyDeals(now).ids;
      // Yalnızca Kiralık durumdaki kitaplar
      const pickable = books
        .filter((b) => hasPrice(b) && isRentableStatus(b))
        .map((b) => ({ b, other: customDiscountOf(b, now) ? null : otherDiscountOf(b, now, dealIds) }))
        .sort((x, y) => bySeriesThenTitle(x.b, y.b)); // seri sırasıyla (başka indirimdekiler yerinde, seçilemez)
      if (!pickable.some((x) => !x.other)) return toast('Fırsatlar\'a eklenebilecek kitap yok (Kiralık kitapların hepsi başka bir indirimde).', 'info');
      bookField = field('Kitap', `<select name="bookId" id="vd-book" required class="${INPUT_CLS}">
          ${pickable.map(({ b, other }) => {
            const cur = customDiscountOf(b, now);
            return `<option value="${b.id}" ${other ? 'disabled' : ''}>${escapeHTML(seriesLabel(b))} · ${escapeHTML(b.title)} · ${formatMoney(b.price)}${cur ? ` (fırsatta %${cur.rate})` : ''}${other ? ` — ${other}` : ''}</option>`;
          }).join('')}
        </select>`, 'Yalnızca Kiralık kitaplar listelenir; başka bir indirimdekiler seçilemez. Zaten fırsatta olan kitabı seçersen indirimi güncellenir.');
    }
    const end = edit?.endsMs ? new Date(edit.endsMs) : new Date(Date.now() + 7 * DAY_MS);
    const pad = (n) => String(n).padStart(2, '0');
    const theme = edit ? dealThemeOf(edit) : 'normal';
    // Tema seçimi: her seçenekte küçük önizleme (DEAL_THEMES'ten · yeni tema kendiliğinden listelenir)
    const themePicker = `
      <div>
        <span class="block text-[11px] font-medium text-slate-500 mb-1">Tema</span>
        <div class="grid grid-cols-2 gap-2.5">${Object.entries(DEAL_THEMES).map(([k, t]) => `
          <label class="cursor-pointer">
            <input type="radio" name="theme" value="${k}" ${k === theme ? 'checked' : ''} class="peer sr-only" />
            <span class="block rounded-2xl border-2 border-slate-100 p-1.5 transition peer-checked:border-brand-500 peer-checked:shadow-soft hover:border-brand-200">
              <span class="light-scope deal-theme-${k} relative block h-14 rounded-xl overflow-hidden">
                ${dealDecorHTML(k, true)}
                <span class="relative z-[3] flex h-full items-end justify-between p-2">
                  <span class="text-[9px] font-bold text-white bg-white/20 px-1.5 py-0.5 rounded-full">${t.emoji} ${t.tag}</span>
                  <span class="text-base font-black text-white leading-none">%30</span>
                </span>
              </span>
              <span class="block px-1 pt-1.5">
                <span class="block text-[11px] font-bold text-slate-700">${t.emoji} ${t.label}</span>
                <span class="block text-[10px] text-slate-400 leading-snug">${t.desc}</span>
              </span>
            </span>
          </label>`).join('')}
        </div>
        <p class="text-[10px] text-slate-400 mt-1">Tema yalnızca görünümü değiştirir · indirim, fiyat ve süre aynı kalır.</p>
      </div>`;
    openModal(`
      ${modalHeader(edit ? 'Fırsatı Düzenle ✏️' : 'Fırsat Ekle 🏷️', 'Ana sayfadaki Fırsatlar\'da görünür · bitiş anında kendiliğinden kalkar.', 'tag', 'bg-amber-50 text-amber-600')}
      <form data-form="saveVitrine" class="p-5 space-y-3.5" autocomplete="off">
        ${field('İndirim Adı', `<input name="name" maxlength="60" required ${edit ? '' : 'autofocus'} value="${escapeHTML(edit?.name || '')}" class="${INPUT_CLS}" placeholder="Örn. Hafta Sonu Fırsatı" />`)}
        ${bookField}
        ${field('İndirim Yüzdesi (%)', `<input name="rate" id="vd-rate" type="number" min="1" max="${CUSTOM_DISCOUNT_MAX}" step="1" required inputmode="numeric" value="${edit ? edit.rate : ''}" class="${INPUT_CLS}" placeholder="Örn. 30" />`,
          `1–${CUSTOM_DISCOUNT_MAX} arası tam sayı · %100 = bedava`)}
        <div class="grid grid-cols-[1fr_auto] gap-3">
          ${field('Bitiş Tarihi', `<input name="endDate" type="date" required min="${localDateKey(now)}" value="${localDateKey(end)}" class="${INPUT_CLS} min-w-0" />`)}
          ${field('Saat', `<input name="endTime" type="time" required value="${edit?.endsMs ? `${pad(end.getHours())}:${pad(end.getMinutes())}` : '23:59'}" class="${INPUT_CLS} w-[6.5rem]" />`)}
        </div>
        ${themePicker}
        <div id="vd-preview"></div>
        ${edit ? '' : announceCheckHTML('vd-announce', 'İndirim')}
        ${formFooter(edit ? 'Değişiklikleri Kaydet' : 'Fırsatlar\'a Ekle')}
      </form>`);
    updateVitrinePreview();
  }

  /* Pencerede fiyat önizlemesi · seçili temanın renkleriyle */
  function updateVitrinePreview() {
    const box = $('#vd-preview');
    if (!box) return;
    const b = getBook($('#vd-book')?.value);
    const rate = parseInt($('#vd-rate')?.value, 10);
    const theme = DEAL_THEMES[$('[data-form="saveVitrine"] input[name="theme"]:checked')?.value] ? $('[data-form="saveVitrine"] input[name="theme"]:checked').value : 'normal';
    if (!b) { box.innerHTML = ''; return; }
    const ok = rate >= 1 && rate <= CUSTOM_DISCOUNT_MAX;
    box.innerHTML = `
      <div class="light-scope deal-theme-${theme} ${ok && rate === 100 ? 'is-free' : ''} relative overflow-hidden rounded-2xl px-4 py-3 text-xs text-white">
        ${dealDecorHTML(theme, true)}
        <p class="relative z-[3] ${theme === 'winter' ? 'pt-1' : ''}">${ok
          ? `<span class="text-white/75">Fırsat fiyatı:</span> <span class="line-through text-white/60">${formatMoney(b.price)}</span> → <b class="text-base">${rate === 100 ? 'BEDAVA' : formatMoney(round2(b.price * (1 - rate / 100)))}</b> <span class="font-bold text-amber-200">(%${rate})</span>`
          : `<span class="text-white/80">Normal fiyat ${formatMoney(b.price)} · yüzde gir, yeni fiyat burada görünsün.</span>`}</p>
      </div>`;
  }

  function handleSaveVitrine(fd) {
    if (!requireAdmin()) return;
    const b = getBook(fd.bookId);
    const rate = parseInt(fd.rate, 10);
    const name = (fd.name || '').trim();
    const theme = DEAL_THEMES[fd.theme] ? fd.theme : 'normal';
    if (!name) return toast('İndirime bir ad verin.', 'error');
    if (!b || !hasPrice(b)) return toast('Fiyatı olan bir kitap seçin.', 'error');
    if (!isRentableStatus(b)) return toast('Fırsatlar\'a yalnızca Kiralık durumdaki kitaplar eklenebilir.', 'error');
    if (!(rate >= 1 && rate <= CUSTOM_DISCOUNT_MAX)) return toast(`İndirim yüzdesi 1–${CUSTOM_DISCOUNT_MAX} arası olmalı.`, 'error');
    if (!isDateKey(fd.endDate) || !isTimeKey(fd.endTime)) return toast('Geçerli bir bitiş tarihi ve saati seçin.', 'error');
    const end = dateFromKey(fd.endDate);
    end.setHours(...fd.endTime.split(':').map(Number), 0, 0);
    if (end.getTime() <= Date.now()) return toast('Bitiş anı geçmiş olamaz.', 'error');
    const prev = customDiscountOf(b);
    const other = prev ? null : otherDiscountOf(b);
    if (other) return toast(`"${b.title}" şu an ${other}; Fırsatlar'a eklenemez.`, 'error');

    const t = DEAL_THEMES[theme];
    const batch = db.batch();
    batch.set(col('discounts').doc(String(b.id)), {
      bookId: b.id, name, rate, theme, endsAt: Timestamp.fromDate(end),
      createdAt: prev?.createdAt || isoAt(Date.now()), createdBy: prev?.createdBy || state.currentUserId
    });
    if (fd.announce === 'on') {
      const newPrice = round2(b.price * (1 - rate / 100));
      batch.set(col('announcements').doc(), {
        type: 'news', category: 'İndirim',
        // Başlıkta yalnızca kitap + indirim (fırsat adı karışıklık yapıyordu · içerikte zaten yazıyor)
        title: `${b.title} ${rate === 100 ? 'bedava' : `%${rate} indirimli`}`,
        body: `${t.emoji} ${name}${theme !== 'normal' ? ` · ${t.tag}` : ''}\n"${b.title}" Fırsatlar'da! ${rate === 100 ? `${formatMoney(b.price)} yerine BEDAVA!` : `${formatMoney(b.price)} yerine ${formatMoney(newPrice)} · %${rate} indirim.`}\n⏳ Son: ${formatDate(end.toISOString(), true)} · kaçırma!`,
        bookId: b.id, authorId: state.currentUserId, createdAt: isoAt(Date.now()), pinned: false, readBy: []
      });
    }
    closeModal();
    run(batch.commit(), prev ? `"${b.title}" fırsatı güncellendi · ${name} %${rate}` : `"${b.title}" ${name} ile %${rate} indirimle Fırsatlar'a eklendi ${t.emoji}`);
  }

  function deleteVitrine(id) {
    if (!requireAdmin()) return;
    const d = discounts.find((x) => x.id === id);
    if (!d) return;
    const b = getBook(d.bookId);
    openConfirm({
      title: 'Fırsat kaldırılsın mı?',
      message: `"${escapeHTML(b?.title || 'Kitap')}" kitabındaki %${d.rate} fırsat indirimi kaldırılacak. <b>Kitap kitaplıkta kalır</b>, normal fiyatından kiralanabilir. Önceki kiralamalar etkilenmez.`,
      confirmLabel: 'Kaldır',
      onConfirm: () => {
        closeModal();
        run(col('discounts').doc(d.id).delete(), 'Fırsat kaldırıldı.', 'info');
      }
    });
  }

  /* --- 8.1.9 Yakında geliyor · Yakında / Planlanıyor durumundaki kitaplar (Günün İndirimleri'nin üstünde) ---
     Kitap yoksa ya da Ana Sayfa Ayarları'nda kapalıysa bölüm görünmez · karta basınca kitabın detayı açılır */
  function renderUpcoming() {
    const box = $('#upcomingSection');
    if (!box) return;
    const order = { yakinda: 0, planlaniyor: 1 };
    const list = showcaseOn('upcoming')
      ? books.filter((b) => isDraftBook(b) && isVisibleBook(b))
        .sort((a, b) => order[bookStatus(a)] - order[bookStatus(b)] || seriesRank(a) - seriesRank(b) || a.title.localeCompare(b.title, 'tr'))
      : [];
    if (!list.length) { box.innerHTML = ''; return; }
    const cards = list.map((b) => {
      const st = BOOK_STATUSES[bookStatus(b)];
      return `
        <button type="button" data-open-book="${b.id}"
          class="group text-left flex gap-3 p-3 rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-sky-50/60 hover:border-sky-200 hover:shadow-soft-lg hover:-translate-y-0.5 transition duration-200 focus:outline-none focus:ring-2 focus:ring-sky-200 min-w-0">
          ${coverHTML(b, 'md')}
          <div class="flex-1 min-w-0 flex flex-col">
            <p class="text-[10px] font-semibold uppercase tracking-wider text-sky-600 truncate">${escapeHTML(seriesLabel(b))}</p>
            <p class="text-xs font-semibold text-slate-800 mt-0.5 line-clamp-2 group-hover:text-brand-600 transition">${escapeHTML(b.title)}</p>
            <div class="mt-auto pt-2">
              <span class="inline-flex items-center gap-1.5 text-[10px] font-semibold leading-none px-2 py-1 rounded-full ${st.chip}">
                <span class="w-1.5 h-1.5 rounded-full ${st.dot}"></span>${st.label}
              </span>
            </div>
          </div>
        </button>`;
    }).join('');
    box.innerHTML = `
      <div class="bg-white rounded-2xl shadow-soft p-4 sm:p-5 mb-6">
        <div class="flex items-center justify-between gap-3 mb-4">
          <div class="flex items-center gap-3 min-w-0">
            <span class="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-violet-500 text-white flex items-center justify-center shadow-soft text-base shrink-0">📖</span>
            <div class="min-w-0">
              <h2 class="text-sm font-bold text-slate-800">Yakında geliyor</h2>
              <p class="text-[11px] text-slate-400">Yazılmakta ve planlanan kitaplar · detay için karta dokun</p>
            </div>
          </div>
          <span class="text-[11px] font-semibold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full shrink-0">${list.length} kitap</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">${cards}</div>
      </div>`;
  }

  /* --- 8.2 Günün indirimleri --- */
  function renderDeals(now) {
    // Vitrin Ayarları'nda kapalıysa bölüm hiç görünmez
    const on = showcaseOn('deals');
    $('#dealsSection').classList.toggle('hidden', !on);
    if (!on) return;
    const deals = getDailyDeals(now);

    $('#dealsMeta').textContent = deals.listSize
      ? `Grup ${deals.group + 1}/${deals.groupCount} · Sıra ${deals.fromPos}–${deals.toPos} / ${deals.listSize}${deals.pinned ? ' · ↻ Admin seçti' : ''}`
      : 'Henüz indirime uygun kitap yok';
    const size = DISCOUNT_SETTINGS.groupSize;
    const groupOptions = Array.from({ length: deals.groupCount }, (_, g) => {
      const from = g * size + 1, to = Math.min(g * size + size, deals.listSize);
      return `<option value="${g}" ${g === deals.group ? 'selected' : ''}>Sıra ${from === to ? from : `${from}–${to}`}</option>`;
    }).join('');
    $('#dealsActions').innerHTML = isAdmin() && deals.listSize
      ? `<span class="flex items-center gap-1.5 flex-wrap">
          <button type="button" data-refresh-deals title="Sıradaki 3'lüye geç (sonraki otomatik geçiş yine ${String(DISCOUNT_SETTINGS.resetHour).padStart(2, '0')}:00)"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition">↻ Sonraki 3'lü</button>
          <select data-deal-group aria-label="İndirim grubunu seç" title="Gösterilecek grubu seç"
            class="px-2.5 py-1.5 rounded-full text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-200">${groupOptions}</select>
        </span>`
      : '';
    updateCountdown(now);

    if (!deals.ids.length) {
      $('#dealsGrid').innerHTML = emptyState('Bugün için indirimli kitap bulunmuyor.', 'sm:col-span-3');
      return;
    }

    $('#dealsGrid').innerHTML = deals.ids.map((id) => {
      const b = getBook(id);
      const rate = getDiscountRate(b.id);
      const newPrice = round2(b.price * (1 - rate / 100));
      const rented = isBookRented(b, now.getTime());
      const tier = dealTier(rate);
      return `
        <div data-open-deal="${b.id}" role="button" tabindex="0"
          class="deal-shine ${tier ? `deal-${tier}` : ''} group cursor-pointer text-left bg-gradient-to-br from-white to-brand-50/70 rounded-2xl border border-brand-100 p-4
                 hover:shadow-soft-lg hover:-translate-y-0.5 hover:border-brand-200 transition duration-200 focus:outline-none focus:ring-2 focus:ring-brand-200">
          ${tier === 'mega' ? confettiHTML() : ''}
          ${isAdmin() ? `<button type="button" data-remove-deal="${b.id}" title="Bugünkü indirimden çıkar (kitap silinmez)" aria-label="İndirimden çıkar"
            class="absolute top-2 right-2 z-[3] w-8 h-8 rounded-full bg-white/90 shadow-soft text-slate-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center transition">${icon('close', 'w-4 h-4 pointer-events-none')}</button>` : ''}
          <div class="relative z-[1] flex gap-3 ${isAdmin() ? 'pr-7' : ''}">
            ${coverHTML(b, 'md')}
            <div class="flex-1 min-w-0">
              <p class="flex items-center gap-1.5 flex-wrap text-[10px] font-semibold uppercase tracking-wider text-brand-500">${escapeHTML(seriesLabel(b))} ${tierBadge(tier)}</p>
              <p class="text-xs font-semibold text-slate-800 mt-0.5 line-clamp-2">${escapeHTML(b.title)}</p>
              ${dealRatingHTML(b.id)}
              ${statusChipHTML(b, now.getTime(), 'mt-1.5')}
            </div>
          </div>
          <div class="relative z-[1] flex items-end justify-between mt-3 pt-3 border-t border-dashed border-brand-100">
            <div class="flex items-baseline gap-1">
              <span class="${tier === 'mega' ? 'rate-pop text-5xl bg-gradient-to-br from-rose-500 via-fuchsia-500 to-amber-500' : 'text-4xl bg-gradient-to-br from-rose-500 to-orange-400'} font-black leading-none tracking-tight bg-clip-text text-transparent">%${rate}</span>
              <span class="text-[10px] font-extrabold text-rose-400 tracking-wider">İNDİRİM</span>
            </div>
            <div class="text-right">
              <p class="text-[11px] text-slate-400 line-through">${formatMoney(b.price)}</p>
              <p class="text-sm font-bold text-emerald-600">${formatMoney(newPrice)}</p>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  /* Günün İndirimi kartında yazar yerine ortalama reyting (⭐ 4,5) · oylanmamış kitapta hiçbir şey */
  function dealRatingHTML(bookId) {
    const s = ratingSummary(bookId);
    return s ? `<p class="text-[11px] font-bold text-slate-600 mt-0.5" title="${s.count} oy">⭐ ${s.text}</p>` : '';
  }

  function updateCountdown(now = new Date()) {
    const el = $('#dealsCountdown');
    if (el) el.textContent = formatCountdown(nextDealReset(now).getTime() - now.getTime());
  }

  /* İndirim kutlama seviyesi: %50 ve üzeri "mega", %35 ve üzeri "sıcak" */
  const dealTier = (rate) => (rate >= 50 ? 'mega' : rate >= 35 ? 'hot' : '');
  const CONFETTI_COLORS = ['#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#facc15'];
  const confettiHTML = (count = 14) => `
    <span class="confetti-layer" aria-hidden="true">${Array.from({ length: count }, (_, i) =>
      `<i style="left:${(i * 37 + 7) % 100}%;background:${CONFETTI_COLORS[i % CONFETTI_COLORS.length]};animation-delay:${((i * 0.29) % 2.6).toFixed(2)}s;animation-duration:${(2.3 + (i % 5) * 0.35).toFixed(2)}s"></i>`).join('')}
    </span>`;
  const tierBadge = (tier) => tier === 'mega'
    ? '<span class="rate-pop text-[9px] font-extrabold text-white bg-gradient-to-r from-rose-500 via-fuchsia-500 to-amber-500 px-2 py-0.5 rounded-full shadow-soft">🎉 MEGA FIRSAT</span>'
    : tier === 'hot' ? '<span class="text-[9px] font-extrabold text-white bg-gradient-to-r from-rose-500 to-orange-400 px-2 py-0.5 rounded-full shadow-soft">🔥 SÜPER FIRSAT</span>' : '';

  /* Admin: bugünkü grubu belirle (o anki güncel kitaplarla) · sonraki günler buradan devam eder,
     10:00'daki otomatik geçiş değişmez. Bugün indirimden çıkarılanlar sıfırlanır. */
  function setDealGroup(group) {
    if (!requireAdmin()) return;
    const now = new Date();
    const list = dealList(discountDayNumber(now), now.getTime());
    const count = dealGroupCount(list);
    if (!count) return;
    const g = ((Number(group) % count) + count) % count;
    const size = DISCOUNT_SETTINGS.groupSize;
    const from = g * size + 1, to = Math.min(g * size + size, list.length);
    run(col('settings').doc('deals').set({
      pinDay: discountDayNumber(now), pinGroup: g, pinAt: now.toISOString(), pinBy: state.currentUserId, pinResume: false, removedIds: []
    }, { merge: true }), `Günün indirimleri güncellendi · Sıra ${from === to ? from : `${from}–${to}`}`);
  }
  /* Admin: sıradaki 3'lüye geç (son gruptan sonra baştan) */
  const refreshDeals = () => setDealGroup(getDailyDeals().group + 1);

  /* Admin: kitabı yalnızca bugünkü indirimden çıkar (kitap kitaplıkta kalır) */
  function removeFromDeals(bookId) {
    if (!requireAdmin()) return;
    const b = getBook(bookId);
    if (!b) return;
    openConfirm({
      title: 'İndirimden çıkarılsın mı?',
      message: `"${escapeHTML(b.title)}" bugünkü Günün İndirimleri'nden çıkarılacak. <b>Kitap kitaplıkta kalır</b>, normal fiyatından kiralanabilir. Yarın ${String(DISCOUNT_SETTINGS.resetHour).padStart(2, '0')}:00'da döngü normal devam eder.`,
      confirmLabel: 'İndirimden Çıkar',
      onConfirm: () => {
        const today = discountDayNumber();
        const ids = [...new Set([...dealsRemovedToday(), b.id])];
        closeModal();
        run(col('settings').doc('deals').set({ removedDay: today, removedIds: ids }, { merge: true }),
          `"${b.title}" bugünkü indirimden çıkarıldı.`, 'info');
      }
    });
  }

  /* Kiralama satırındaki fiyat alanı (paket kitaplarında özel ifade) */
  /* Paket (özel teklif) kiralaması: teklif adı · bu kitaba uygulanan indirim (paket toplamı değil) */
  function packageInfo(r) {
    const p = offerPurchases.find((x) => x.id === r.purchaseId);
    const title = p?.offerTitle || offers.find((o) => o.id === r.offerId)?.title || '';
    const rate = r.discount > 0 ? r.discount : r.listPrice > 0 ? Math.round((1 - r.price / r.listPrice) * 100) : 0;
    return { title, rate };
  }
  const packageLabel = (r) => { const pk = packageInfo(r); return `🎁 Özel teklifle${pk.rate > 0 ? ` · %${pk.rate} indirim` : ''}${pk.title ? ` · ${pk.title}` : ''}`; };

  /* Kuponla alınan kiralamanın etiketi: "Kuponla bedava" ya da "Kuponla · %20" / "Kuponla · 3 Al 2 Öde" */
  function couponRentalLabel(r) {
    const c = coupons.find((x) => x.id === r.couponId);
    if (r.price <= 0) return '🎟️ Kuponla bedava';
    return `🎟️ Kuponla alındı${c ? ` · ${couponBadge(c)}` : ''}`;
  }

  /* İndirim kaynağı etiketi + rengi (özel teklif / kupon / günün indirimi / yeni kitap / vitrin) */
  function rentalDiscountTag(r) {
    if (r.offerId) { const pk = packageInfo(r); return { label: `🎁 Özel teklifle${pk.title ? ` · ${pk.title}` : ''}`, tone: 'bg-violet-50 text-violet-600' }; }
    if (r.couponId) return { label: couponRentalLabel(r), tone: 'bg-emerald-50 text-emerald-600' };
    const map = {
      deal:   { label: '🔥 Günün İndirimi',      tone: 'bg-rose-50 text-rose-600' },
      new:    { label: '⭐ Yeni Kitap İndirimi', tone: 'bg-amber-50 text-amber-700' },
      custom: { label: '🏷️ Fırsat',         tone: 'bg-indigo-50 text-indigo-600' },
      museum: { label: '🏛️ Müze Vitrini',         tone: 'bg-amber-50 text-amber-700' },
      winter: { label: '❄️ Kış Fırsatı',          tone: 'bg-sky-50 text-sky-600' },
      winterNew: { label: '✨ Kış · Yeni Kitap',  tone: 'bg-cyan-50 text-cyan-700' },
      cheque: { label: '🎁 Hediye çekiyle',       tone: 'bg-emerald-50 text-emerald-600' }
    };
    return map[r.discountSource] || (r.discount > 0 ? { label: discountSourceLabel(r.discountSource), tone: 'bg-rose-50 text-rose-600' } : null);
  }

  /* Kiralama fiyatı tek satırda: [etiket] ₺25,00 → ₺7,25 %71 · withTag=false: etiketsiz (etiket başka yerde) */
  function rentalPriceHTML(r, withTag = true) {
    const list = r.listPrice ?? r.price;
    const discounted = list > r.price;
    const rate = discounted ? (r.discount > 0 ? r.discount : Math.round((1 - r.price / list) * 100)) : 0;
    const tag = withTag ? rentalDiscountTag(r) : null;
    return `
      <div class="flex items-center justify-end gap-x-1.5 gap-y-1 flex-wrap">
        ${tag ? `<span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${tag.tone} truncate max-w-[13rem]" title="${escapeHTML(tag.label)}">${escapeHTML(tag.label)}</span>` : ''}
        <span class="inline-flex items-baseline gap-1 whitespace-nowrap">
          ${discounted ? `<span class="text-[11px] text-slate-400 line-through">${formatMoney(list)}</span><span class="text-[10px] text-slate-300">→</span>` : ''}
          <span class="text-sm font-bold ${discounted ? 'text-emerald-600' : 'text-brand-600'}">${r.price > 0 ? formatMoney(r.price) : 'Bedava'}</span>
          ${rate ? `<span class="text-[10px] font-extrabold text-rose-500">%${rate}</span>` : ''}
        </span>
      </div>`;
  }

  /* Admin'e özel kırmızı "Kiralamayı İptal Et / Sil" butonu */
  const rentalDeleteBtn = (r) => isAdmin() ? `
    <button type="button" data-delete-rental="${r.id}" title="Kiralamayı iptal et / sil"
      class="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-500 hover:text-white hover:border-rose-500 px-2.5 py-1 rounded-full whitespace-nowrap transition">
      <span class="hidden sm:inline">Kiralamayı İptal Et /</span> Sil ❌
    </button>` : '';

  /* --- 8.3 Son alınan kitaplar (aktif) --- */
  function renderActiveRentals(now) {
    const nowMs = now.getTime();
    const list = rentals
      .filter((r) => isActiveRental(r, nowMs))
      .sort((a, b) => new Date(b.rentedAt) - new Date(a.rentedAt));

    $('#activeCount').textContent = `${list.length} aktif`;

    if (!list.length) {
      $('#activeRentals').innerHTML = `<li>${emptyState('Şu anda aktif kiralama yok.')}</li>`;
      return;
    }

    $('#activeRentals').innerHTML = list.map((r) => {
      const b = getBook(r.bookId);
      const usr = getUser(r.userId);
      if (!b || !usr) return '';
      const mine = r.userId === state.currentUserId;
      return `
        <li class="p-3 sm:p-4 rounded-xl border ${mine ? 'border-brand-200 bg-brand-50/40' : 'border-slate-100'} hover:border-brand-200 transition">
          <div class="flex gap-3">
            <button type="button" data-open-book="${b.id}" class="shrink-0">${coverHTML(b, 'sm')}</button>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex items-center gap-1.5">
                  <button type="button" data-open-book="${b.id}" class="min-w-0 text-left text-xs font-semibold text-slate-800 truncate hover:text-brand-600">${escapeHTML(b.title)}</button>
                  <span class="shrink-0 text-[9px] font-semibold px-1.5 py-px rounded-md ${typeStyle(b.type).chip}">${escapeHTML(seriesLabel(b))}</span>
                </div>
                <div class="text-right shrink min-w-0 max-w-[65%]">${rentalPriceHTML(r)}</div>
              </div>
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-slate-400">
                <span class="flex items-center gap-1.5">${avatarHTML(usr)}<span class="text-slate-600 font-medium">${escapeHTML(usr.name)}</span>${mine ? '<span class="text-[9px] font-bold text-brand-600 bg-white px-1.5 py-px rounded-full shadow-soft">SEN</span>' : ''}</span>
                <span>Kiralandı: ${formatDate(r.rentedAt, true)}</span>
                <span>Bitiş: ${formatDate(r.dueAt, true)}</span>
              </div>
              <div class="mt-2.5 flex items-center gap-3">
                <div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div data-rental-bar="${r.id}" class="h-full rounded-full transition-all duration-700 ease-out" style="width:0%"></div>
                </div>
                <span data-rental-left="${r.id}" class="text-[11px] font-semibold shrink-0 tabular-nums"></span>
                ${refundBtnHTML(r)}
              </div>
            </div>
          </div>
        </li>`;
    }).join('');

    // Çubukları bir sonraki karede doldur (soft animasyon)
    const root = $('#activeRentals');
    requestAnimationFrame(() => list.forEach((r) => applyProgress(r.id, nowMs, root)));
  }

  /* --- 8.4 Süresi dolan son 3 kitap (aynı kartın alt satırları) --- */
  function renderExpiredRentals(now) {
    const nowMs = now.getTime();
    const list = rentals
      .filter((r) => isExpiredRental(r, nowMs))
      .sort((a, b) => new Date(b.dueAt) - new Date(a.dueAt))
      .slice(0, 3);

    if (!list.length) {
      $('#expiredRentals').innerHTML = `<li class="text-[11px] text-slate-400 py-2">Süresi dolan kiralama yok.</li>`;
      return;
    }

    $('#expiredRentals').innerHTML = list.map((r) => {
      const b = getBook(r.bookId);
      const usr = getUser(r.userId);
      if (!b || !usr) return '';
      return `
        <li class="flex items-center gap-3 p-2.5 sm:px-3 rounded-xl bg-slate-50/70 border border-slate-100">
          <div class="opacity-60">${coverHTML(b, 'xs')}</div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-slate-500 truncate">${escapeHTML(b.title)}</p>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-slate-400">
              <span class="flex items-center gap-1.5">${avatarHTML(usr, 'w-4 h-4 text-[8px]')}${escapeHTML(usr.name)}</span>
              <span>Bitiş: ${formatDate(r.dueAt, true)}</span>
              ${r.offerId ? `<span class="text-violet-500">(${escapeHTML(packageLabel(r))})</span>` : ''}
              ${r.couponId ? `<span class="text-emerald-600">(${couponRentalLabel(r)})</span>` : ''}
            </div>
          </div>
          <span class="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-semibold text-rose-400 bg-rose-50/70 border border-rose-100 px-2.5 py-1 rounded-full">
            <span class="w-1.5 h-1.5 rounded-full bg-rose-300"></span>${endedLabel(r)}
          </span>
          ${refundBtnHTML(r)}
        </li>`;
    }).join('');
  }

