  /* ==========================================================
     9) KİTAPLAR SAYFASI
     ========================================================== */
  const manageTypesBtn = () =>
    `<button type="button" data-quick="manageTypes" class="${BTN_SOFT}">Kategorileri Yönet 📁</button>`;

  /* Dinamik tür sekmeleri (Kitaplar + Kiralananlar ortak). attr: data-* adı, current: seçili tür */
  /* Kitaplar listesinde çarpıcı, mavi tonlu fiyat etiketi (indirimde eski fiyat + yüzde rozeti) */
  function priceTagHTML(b, eff) {
    if (!hasPrice(b)) return '<span class="text-[11px] font-semibold italic text-slate-400 whitespace-nowrap">Fiyat yakında</span>';
    const final = round2(b.price * (1 - (eff?.rate || 0) / 100));
    return `
      <span class="flex items-center gap-1.5">
        ${eff?.rate ? `<span class="text-[10px] font-extrabold text-white bg-gradient-to-r ${eff.source === 'new' ? 'from-amber-400 to-yellow-500' : 'from-rose-500 to-orange-400'} px-1.5 py-0.5 rounded-lg shadow-soft">%${eff.rate}</span>` : ''}
        <span class="flex flex-col items-end leading-none">
          ${eff?.rate ? `<span class="text-[10px] text-slate-400 line-through mb-0.5">${formatMoney(b.price)}</span>` : ''}
          <span class="text-[15px] sm:text-lg font-black tracking-tight tabular-nums whitespace-nowrap bg-gradient-to-r from-sky-500 via-brand-600 to-indigo-600 bg-clip-text text-transparent">${formatMoney(final)}</span>
        </span>
      </span>`;
  }

  function typeTabBar(attr, current, countOf, extraCls = 'mb-5', includeAll = true) {
    const tabs = includeAll ? [{ id: 'all', label: 'Tümü' }, ...bookTypes] : [...bookTypes];
    return `
      <div class="flex gap-1 p-1 bg-white rounded-2xl shadow-soft ${extraCls} overflow-x-auto soft-scroll w-full sm:w-auto sm:inline-flex">
        ${tabs.map((t) => {
          const active = current === t.id;
          return `
            <button type="button" ${attr}="${t.id}"
              class="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${active ? 'bg-gradient-to-r from-brand-500 to-brand-700 text-white shadow-soft' : 'text-slate-500 hover:text-brand-600 hover:bg-brand-50/60'}">
              ${t.id !== 'all' ? `<span class="w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : typeStyle(t.id).dot}"></span>` : ''}
              ${escapeHTML(t.label)}
              <span class="text-[10px] px-1.5 py-px rounded-full ${active ? 'bg-white/25' : 'bg-brand-50 text-brand-600'}">${countOf(t.id)}</span>
            </button>`;
        }).join('')}
      </div>`;
  }

  /* Kitaplar filtre türleri: options(kitaplar) → [{ value, label, count }], match(kitap, değer) */
  const RATING_FILTERS = [
    { value: '5', label: '★ 5,0', test: (a) => a >= 5 },
    { value: '4.5', label: '★ 4,5 ve üzeri', test: (a) => a >= 4.5 },
    { value: '4', label: '★ 4,0 ve üzeri', test: (a) => a >= 4 },
    { value: '3', label: '★ 3,0 ve üzeri', test: (a) => a >= 3 },
    { value: '2', label: '★ 2,0 ve üzeri', test: (a) => a >= 2 },
    { value: 'low', label: '★ 2,0 altı', test: (a) => a < 2 },
    { value: 'none', label: 'Henüz oy yok', test: null }
  ];
  const bookPlaceOf = (b) => (b.place || '').trim();
  const bookYearOf = (b) => (b.releaseDate || '').slice(0, 4);
  const distinctOptions = (list, keyOf, sort) => {
    const counts = new Map();
    list.forEach((b) => { const k = keyOf(b); if (k) counts.set(k, (counts.get(k) || 0) + 1); });
    return [...counts.entries()].sort(sort).map(([value, count]) => ({ value, label: value, count }));
  };
  const matchRating = (b, v) => {
    const s = ratingSummary(b.id);
    const f = RATING_FILTERS.find((x) => x.value === v);
    return f?.test ? !!s && f.test(s.avg) : !s;
  };
  const BOOK_FILTERS = {
    place: {
      label: '📍 Yazıldığı Mekan', allLabel: 'Tüm mekanlar',
      options: (list) => distinctOptions(list, bookPlaceOf, (a, b) => a[0].localeCompare(b[0], 'tr')),
      match: (b, v) => bookPlaceOf(b) === v
    },
    year: {
      label: '📅 Çıkış Yılı', allLabel: 'Tüm yıllar',
      options: (list) => distinctOptions(list, bookYearOf, (a, b) => b[0].localeCompare(a[0])),
      match: (b, v) => bookYearOf(b) === v
    },
    status: {
      label: '🏷️ Durum', allLabel: 'Tüm durumlar',
      options: (list) => Object.entries(BOOK_STATUSES)
        .map(([k, s]) => ({ value: k, label: s.label, count: list.filter((b) => bookStatus(b) === k).length }))
        .filter((o) => o.count),
      match: (b, v) => bookStatus(b) === v
    },
    rating: {
      label: '⭐ Reyting', allLabel: 'Tüm reytingler',
      options: (list) => RATING_FILTERS
        .map((f) => ({ value: f.value, label: f.label, count: list.filter((b) => matchRating(b, f.value)).length }))
        .filter((o) => o.count),
      match: matchRating
    }
  };

  function renderBooks() {
    setPageActions('books', isAdmin()
      ? `${manageTypesBtn()}<button type="button" data-quick="addBook" class="${BTN_PRIMARY}">${icon('plus', 'w-3.5 h-3.5')}Kitap Ekle</button>`
      : '');

    const now = Date.now();
    // "Tümü" sekmesi yok: yalnızca kategoriler (varsayılan ilk kategori)
    if (!getType(state.bookTab)) state.bookTab = defaultTypeId();
    const shown = visibleBooks(); // Liste dışı kitapları yalnızca Adminler görür
    const countOf = (k) => shown.filter((b) => b.type === k).length;
    // Sıra: Planlanıyor → Yakında → diğerleri (çıkış tarihi yeni → eski)
    const statusRank = (b) => ({ planlaniyor: 0, yakinda: 1 }[bookStatus(b)] ?? 2);
    const inTab = shown.filter((b) => b.type === state.bookTab);

    // Filtre: solda tür (Mekan · Yıl · Durum · Reyting), sağda o türün seçenekleri (bu kategorideki kitaplardan)
    const f = kindValueFilter('bookFilter', BOOK_FILTERS, inTab);
    const filtered = f.active;

    const list = f.apply(inTab)
      // aynı çıkış tarihinde seri numarası büyük olan (daha yeni seri) üstte
      .sort((a, b) => statusRank(a) - statusRank(b) || (b.releaseDate || '').localeCompare(a.releaseDate || '')
        || (b.seriesNo || 0) - (a.seriesNo || 0) || b.id - a.id);
    const rentableCount = list.filter((b) => isRentableStatus(b) && !isBookRented(b, now)).length;

    const tabBar = typeTabBar('data-book-tab', state.bookTab, countOf, 'mb-5', false);
    const filterBar = inTab.length ? f.html : '';

    if (!list.length) {
      $('#booksContent').innerHTML = tabBar + filterBar
        + emptyState(filtered ? 'Bu filtreye uyan kitap yok.' : 'Bu kategoride henüz kitap yok.');
      return;
    }

    const nowDate = new Date(now);
    const dealIds = getDailyDeals(nowDate).ids;
    const rows = list.map((b) => {
      const rented = isBookRented(b, now);
      const fresh = isNewBook(b, nowDate);
      const eff = getEffectiveDiscount(b, nowDate, dealIds);
      return `
        <li>
          <button type="button" data-open-book="${b.id}"
            class="relative w-full text-left flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3 focus:outline-none transition ${fresh
              ? 'bg-gradient-to-r from-amber-50 via-yellow-50/80 to-white border-l-4 border-amber-400 hover:from-amber-100/80 focus:from-amber-100'
              : 'hover:bg-brand-50/40 focus:bg-brand-50/60'}">
            <div class="relative shrink-0">
              ${coverHTML(b, 'sm')}
              ${ratingBadgeHTML(b.id)}
              ${fresh ? `
                <span class="twinkle absolute -top-1.5 -left-1.5 text-amber-400 text-xs">✦</span>
                <span class="twinkle twinkle-d1 absolute -bottom-1 -right-1.5 text-yellow-400 text-[10px]">✦</span>` : ''}
            </div>
            <div class="flex-1 sm:flex-none min-w-0 sm:max-w-[42%]">
              <p class="flex items-center gap-1.5 min-w-0">
                <span class="text-xs sm:text-sm font-semibold text-slate-800 truncate">${escapeHTML(b.title)}</span>
                ${fresh ? '<span class="shrink-0 text-[9px] font-extrabold text-white bg-gradient-to-r from-amber-400 to-yellow-500 px-1.5 py-0.5 rounded-full shadow-soft">★ YENİ</span>' : ''}              </p>
              <p class="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 flex-wrap">${Number.isInteger(b.seriesNo) && getType(b.type)?.inDeals ? `<span class="font-semibold text-brand-500">#${b.seriesNo}</span> ·` : ''}${icon('calendar', 'w-3 h-3')}${releasedAgo(b.releaseDate)}${fresh
                ? `<span class="hidden sm:inline text-amber-600 font-semibold">· %${NEW_BOOK_DISCOUNT.rate} yeni kitap indirimi · ${formatRemaining(newDiscountLeftMs(b, nowDate))}</span>` : ''}</p>
            </div>
            <!-- Orta boşluk: şeffaf, eğik, parıldayan kitap adı (tablet/masaüstü) · satırın tam ortasına sabit
                 (sol bilgi uzasa da — ör. yeni kitap indirimi — kaymaz) -->
            <span class="hidden sm:block flex-1 min-w-0" aria-hidden="true"></span>
            <span class="hidden sm:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[26%] pointer-events-none" aria-hidden="true">
              <span class="ghost-title ${fresh ? 'is-new' : ''} block truncate text-center text-xl lg:text-2xl px-3 select-none">${escapeHTML(b.title)}</span>
            </span>
            <!-- Sağ: çarpıcı mavi fiyat (indirim varsa eski fiyat + yüzde) · durum -->
            <div class="shrink-0 flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-3">
              ${priceTagHTML(b, eff)}
              <div class="flex flex-col items-end gap-1">
                ${statusChipHTML(b, now)}
                ${isSpecialBook(b) && b.period ? `<span class="hidden sm:inline text-[9px] font-semibold text-rose-500 max-w-[9rem] truncate">🔒 ${escapeHTML(b.period)}</span>` : ''}
              </div>
            </div>
            <span class="hidden sm:block text-slate-300">${icon('chevron', 'w-4 h-4')}</span>
          </button>
        </li>`;
    }).join('');

    $('#booksContent').innerHTML = tabBar + filterBar + `
      <div class="bg-white rounded-2xl shadow-soft overflow-hidden">
        <div class="px-4 sm:px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-2 text-[11px] text-slate-400">
          <span><b class="text-slate-700">${list.length}</b> kitap · <span class="text-emerald-600 font-semibold">${rentableCount} kiralık</span></span>
          <span class="hidden sm:inline">Sıralama: Planlanıyor · Yakında · Çıkış tarihi (yeni → eski)</span>
        </div>
        <ul class="divide-y divide-slate-100">${rows}</ul>
      </div>`;
  }

  /* ==========================================================
     9.1) KİRALANANLAR SAYFASI (aktif + geçmiş, tür ve durum filtresi)
     ========================================================== */
  function renderRentals() {
    const admin = isAdmin();
    setPageActions('rentals', admin ? manageTypesBtn() : '');

    const nowMs = Date.now();
    if (state.rentTab !== 'all' && !getType(state.rentTab)) state.rentTab = 'all';
    // Durum filtresi yalnızca Aktif / Süresi Dolan
    if (!['active', 'past'].includes(state.rentStatus)) state.rentStatus = 'active';
    const statusOk = (r) => (state.rentStatus === 'active' ? isActiveRental(r, nowMs) : !isActiveRental(r, nowMs));
    const typeOf = (r) => getBook(r.bookId)?.type;
    const byStatus = rentals.filter(statusOk);
    const countOf = (k) => (k === 'all' ? byStatus.length : byStatus.filter((r) => typeOf(r) === k).length);

    const list = byStatus
      .filter((r) => state.rentTab === 'all' || typeOf(r) === state.rentTab)
      .sort((a, b) =>
        (isActiveRental(b, nowMs) - isActiveRental(a, nowMs)) ||
        (isActiveRental(a, nowMs) ? new Date(b.rentedAt) - new Date(a.rentedAt) : new Date(b.dueAt) - new Date(a.dueAt)));
    const activeTotal = rentals.filter((r) => isActiveRental(r, nowMs)).length;

    const statusBtn = (key, label, count) => {
      const active = state.rentStatus === key;
      return `
        <button type="button" data-rent-status="${key}"
          class="flex-1 sm:flex-none px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition ${active ? 'bg-gradient-to-r from-brand-500 to-brand-700 text-white shadow-soft' : 'text-slate-500 hover:text-brand-600'}">
          ${label} <span class="text-[10px] px-1.5 py-px rounded-full ${active ? 'bg-white/25' : 'bg-brand-50 text-brand-600'}">${count}</span>
        </button>`;
    };

    const filters = `
      <div class="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 mb-5">
        <div class="flex p-1 bg-white rounded-full shadow-soft w-full sm:w-auto">
          ${statusBtn('active', 'Aktif', activeTotal)}
          ${statusBtn('past', 'Süresi Dolan', rentals.length - activeTotal)}
        </div>
        ${typeTabBar('data-rent-tab', state.rentTab, countOf, '')}
      </div>`;

    if (!list.length) {
      $('#rentalsContent').innerHTML = filters + emptyState('Bu filtreye uyan kiralama kaydı yok.');
      return;
    }

    const rows = list.map((r) => {
      const b = getBook(r.bookId);
      const usr = getUser(r.userId);
      const active = isActiveRental(r, nowMs);
      const mine = r.userId === state.currentUserId;
      return `
        <li class="px-3 sm:px-5 py-3 ${active ? '' : 'bg-slate-50/50'}">
          <div class="flex gap-3">
            ${b ? `<button type="button" data-open-book="${b.id}" class="shrink-0 ${active ? '' : 'opacity-60'}">${coverHTML(b, 'sm')}</button>` : coverHTML(null, 'sm')}
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="flex items-center gap-1.5 min-w-0">
                    <span class="text-xs font-semibold ${active ? 'text-slate-800' : 'text-slate-500'} truncate">${b ? escapeHTML(b.title) : 'Silinmiş kitap'}</span>
                    ${active ? '' : `<span class="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-50/70 border border-rose-100 px-2 py-0.5 rounded-full"><span class="w-1.5 h-1.5 rounded-full bg-rose-300"></span>${endedLabel(r)}</span>`}
                  </p>
                  <p class="flex items-center gap-1.5 mt-0.5 flex-wrap">${b ? typeChip(b.type) : ''}</p>
                </div>
                <div class="text-right shrink min-w-0 max-w-[65%]">${rentalPriceHTML(r)}</div>
              </div>
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-slate-400">
                ${usr ? `<span class="flex items-center gap-1.5">${avatarHTML(usr, 'w-4 h-4 text-[8px]')}<span class="text-slate-600 font-medium">${escapeHTML(usr.name)}</span>${mine ? '<span class="text-[9px] font-bold text-brand-600 bg-white px-1.5 py-px rounded-full shadow-soft">SEN</span>' : ''}</span>` : ''}
                <span>Kiralandı: ${formatDate(r.rentedAt, true)}</span>
                <span>Bitiş: ${formatDate(r.dueAt, true)}</span>
                ${active ? '' : `<span class="ml-auto">${rentalDeleteBtn(r)}</span>`}
              </div>
              ${active ? `
                <div class="mt-2 flex items-center gap-3">
                  <div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div data-rental-bar="${r.id}" class="h-full rounded-full transition-all duration-700 ease-out" style="width:0%"></div>
                  </div>
                  <span data-rental-left="${r.id}" class="text-[11px] font-semibold shrink-0 tabular-nums"></span>
                  ${refundBtnHTML(r)}${rentalDeleteBtn(r)}
                </div>` : ''}
            </div>
          </div>
        </li>`;
    }).join('');

    $('#rentalsContent').innerHTML = filters + `
      <div class="bg-white rounded-2xl shadow-soft overflow-hidden">
        <div class="px-4 sm:px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-2 text-[11px] text-slate-400">
          <span><b class="text-slate-700">${list.length}</b> kayıt · <span class="text-emerald-600 font-semibold">${list.filter((r) => isActiveRental(r, nowMs)).length} aktif</span></span>
          <span class="hidden sm:inline">Aktifler önce · en yeni en üstte</span>
        </div>
        <ul class="divide-y divide-slate-100">${rows}</ul>
      </div>`;

    const root = $('#rentalsContent');
    requestAnimationFrame(() => list.filter((r) => isActiveRental(r, nowMs)).forEach((r) => applyProgress(r.id, nowMs, root)));
  }

  /* Kitap detay modalı (iki sütun + fiyat geçmişi zaman çizelgesi) */
  function openBookModal(bookId, opts = {}) {
    const b = getBook(bookId);
    if (!isVisibleBook(b)) return; // Liste dışı: yalnızca Admin açabilir
    const u = currentUser();
    const now = new Date();
    const { rate, source } = getEffectiveDiscount(b, now);
    const price = hasPrice(b) ? round2(b.price * (1 - rate / 100)) : 0;
    const active = activeRentalOf(b, now.getTime());
    const holder = active ? getUser(active.userId) : null;
    const check = bookRentCheck(b, u, price);
    // Kupon: yalnızca Kiralık + indirimsiz + boştaki kitapta, kullanıcının aktif kuponlarıyla
    // (Al-Öde kuponları birden çok kitap ister → Hediyelerim'den kullanılır)
    const myCoupons = canRent(u) && !active && couponEligible(b, now)
      ? activeCouponsOf(u.id, now.getTime()).filter((c) => couponTypeOf(c) !== 'bogo') : [];
    // Hediye çeki: kuponla aynı koşullar (Kiralık + indirimsiz + boşta) · açılmış ve geçerli çekler
    const myCheques = canRent(u) && !active && couponEligible(b, now) ? activeChequesOf(u.id, now.getTime()) : [];
    const admin = isAdmin();
    const backOfferId = opts.backOfferId || '';
    const logs = priceLogs.filter((l) => l.bookId === b.id).sort((x, y) => new Date(y.changedAt) - new Date(x.changedAt));

    const info = (label, value, iconKey) => `
      <div class="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl bg-slate-50/80">
        <span class="hidden sm:flex w-8 h-8 rounded-lg bg-white text-brand-500 shadow-soft items-center justify-center shrink-0">${icon(iconKey)}</span>
        <div class="min-w-0">
          <p class="text-[10px] text-slate-400">${label}</p>
          <p class="text-xs font-semibold text-slate-700 truncate">${value}</p>
        </div>
      </div>`;

    // Fiyat geçmişi: ilk 5 kayıt; fazlası "Tümünü gör" penceresinde (filtreli)
    const timeline = logs.length
      ? `<ol class="relative border-l-2 border-brand-100 ml-1.5 space-y-2.5">
          ${logs.slice(0, PRICE_LOG_PREVIEW).map((l) => priceLogItemHTML(l, b, admin, backOfferId)).join('')}
        </ol>
        ${logs.length > PRICE_LOG_PREVIEW ? `<button type="button" data-all-logs="${b.id}" data-back-offer="${backOfferId}"
          class="${BTN_SOFT} w-full !py-2 mt-3">Tümünü gör · ${logs.length} kayıt →</button>` : ''}`
      : '<p class="text-[11px] text-slate-400 bg-slate-50 rounded-xl px-3 py-2.5">Bu kitabın fiyatı henüz değişmedi.</p>';

    // Kiralama / düzenleme alanı: fiyatın hemen altında (fiyat geçmişi uzasa da yer değiştirmez)
    const rentBlock = `
        <div class="space-y-3">
          ${active && holder ? `
            <div class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-amber-50/70 border border-amber-100 text-[11px] text-amber-700">
              ${avatarHTML(holder, 'w-6 h-6 text-[10px]')}
              <span class="flex-1 min-w-0"><b>${escapeHTML(holder.name)}</b> kiraladı · ${formatRemaining(new Date(active.dueAt) - now)}</span>
              ${refundBtnHTML(active)}
            </div>` : ''}
          ${myCoupons.length || myCheques.length ? `
            <label class="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-xs">
              <span class="text-emerald-700 font-semibold shrink-0">${myCheques.length && !myCoupons.length ? '🎁 Çek' : myCheques.length ? '🎟️ Kupon / Çek' : '🎟️ Kupon'}</span>
              <select id="rentCoupon" data-book="${b.id}" class="flex-1 min-w-0 bg-white rounded-lg border border-emerald-100 text-xs py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-emerald-200">
                <option value="">${myCheques.length && !myCoupons.length ? 'Çek kullanma' : 'Kullanma'}</option>
                ${myCoupons.map((c) => `<option value="${c.id}">${escapeHTML(couponBadge(c))} kupon${c.name ? ` (${escapeHTML(c.name)})` : ''} · ${formatRemaining(c.expiresMs - now.getTime())}</option>`).join('')}
                ${myCheques.map((c) => `<option value="chq:${c.id}">🎁 ${formatMoney(c.amount)} hediye çeki${c.name ? ` (${escapeHTML(c.name)})` : ''}</option>`).join('')}
              </select>
            </label>` : ''}
          ${canRent(u) ? `
            <div class="flex items-center justify-between rounded-xl border border-brand-100 px-3 py-2.5 text-xs">
              <span class="flex items-center gap-2 text-slate-500">${avatarHTML(u, 'w-6 h-6 text-[10px]')} Bakiyen</span>
              <span class="font-semibold text-slate-700">
                ${formatMoney(u.balance)}
                <span id="rentBalAfter" class="${check.ok ? '' : 'hidden'}"><span class="text-slate-300 mx-1">→</span><span class="text-brand-600">${formatMoney(round2(u.balance - price))}</span></span>
              </span>
            </div>` : ''}
          <p id="rentReason" class="${check.ok ? 'hidden' : ''} text-[11px] font-medium text-rose-500 bg-rose-50 rounded-xl px-3 py-2">${check.ok ? '' : check.reason}</p>
          <div class="grid grid-cols-2 gap-2.5">
            ${admin
              ? `<button type="button" data-edit-book="${b.id}" class="${BTN_SOFT} !py-2.5">${icon('pencil', 'w-3.5 h-3.5')}Düzenle</button>`
              : `<button type="button" data-modal-close class="py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition">Kapat</button>`}
            <button type="button" id="rentBtn" data-rent-book="${b.id}" ${check.ok ? '' : 'disabled'} class="${BTN_PRIMARY} !py-2.5">
              ${isRentableStatus(b) && hasPrice(b) ? `${formatMoney(price)} · ${b.rentalDays} gün Kirala` : `${statusView(b, now.getTime()).label} · Kiralanamaz`}
            </button>
          </div>
        </div>`;

    openModal(`
      <div class="relative p-5 sm:p-6 bg-gradient-to-br from-brand-50 via-white to-white">
        <span class="sm:hidden absolute left-1/2 -translate-x-1/2 top-2 w-10 h-1 rounded-full bg-slate-200"></span>
        <div class="absolute top-3 right-3 flex gap-1.5">
          ${backOfferId ? `<button type="button" data-open-offer="${backOfferId}" class="h-8 px-3 rounded-full bg-white shadow-soft text-[11px] font-semibold text-brand-600 hover:bg-brand-50 flex items-center gap-1 transition">${icon('back', 'w-3.5 h-3.5')}Pakete dön</button>` : ''}
          ${admin ? `<button type="button" data-delete-book="${b.id}" title="Kitabı sil" aria-label="Kitabı sil" class="w-8 h-8 rounded-full bg-white shadow-soft text-slate-400 hover:text-rose-500 flex items-center justify-center transition">${icon('trash', 'w-3.5 h-3.5')}</button>` : ''}
          <button type="button" data-modal-close aria-label="Kapat" class="w-9 h-9 rounded-full bg-white shadow-soft text-slate-400 hover:text-slate-600 flex items-center justify-center transition">${icon('close', 'w-4 h-4 pointer-events-none')}</button>
        </div>
        <div class="flex gap-4 sm:gap-5 ${backOfferId ? 'pt-6 sm:pt-0' : ''}">
          ${b.cover ? `<button type="button" data-zoom-cover title="Kapağı büyüt" aria-label="Kapağı büyüt" class="relative shrink-0 self-start cursor-zoom-in rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-300 group">
              ${coverHTML(b, 'lg')}
              <span class="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-white/90 shadow-soft text-slate-600 text-xs flex items-center justify-center group-hover:scale-110 transition">🔍</span>
            </button>` : coverHTML(b, 'lg')}
          <div class="min-w-0 flex-1 pt-1 pr-2 sm:pr-24">
            <div class="flex items-center gap-1.5 flex-wrap">
              ${typeChip(b.type)}
              ${Number.isInteger(b.seriesNo) && getType(b.type)?.inDeals ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-white">#${b.seriesNo}. seri</span>` : ''}
              ${statusChipHTML(b, now.getTime())}
            </div>
            <h3 class="text-base sm:text-lg font-bold text-slate-800 leading-snug mt-1.5">${escapeHTML(b.title)}</h3>
            <p class="flex items-center gap-1 text-[11px] text-slate-400 mt-1">${icon('calendar', 'w-3 h-3')}${releasedAgo(b.releaseDate)}</p>
            <div class="mt-3 flex items-end gap-2 flex-wrap">
              ${hasPrice(b) ? `
                ${rate ? `<span class="text-xs text-slate-400 line-through">${formatMoney(b.price)}</span>` : ''}
                <span class="text-xl font-black leading-none bg-gradient-to-r from-sky-500 via-brand-600 to-indigo-600 bg-clip-text text-transparent">${formatMoney(price)}</span>
                ${rate ? `<span class="text-[10px] font-extrabold text-white bg-gradient-to-r from-rose-500 to-orange-400 px-2 py-1 rounded-lg">%${rate} · ${discountSourceLabel(source)}</span>` : ''}`
                : '<span class="text-sm font-semibold italic text-slate-400">Fiyat yakında</span>'}
            </div>
          </div>
        </div>
        ${admin ? `
          <label class="mt-4 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
            Durum:
            <select data-quick-status="${b.id}" class="flex-1 sm:flex-none text-[11px] rounded-lg border border-brand-100 bg-white px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-200">
              ${Object.entries(BOOK_STATUSES).map(([k, s]) => `<option value="${k}" ${bookStatus(b) === k ? 'selected' : ''}>${s.label}</option>`).join('')}
            </select>
          </label>
          <label class="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
            <input type="checkbox" id="statusAnnounce" class="rounded border-slate-300 text-brand-600" />
            📣 Durum değişince duyuruya at <span class="text-[10px] font-semibold px-1.5 py-px rounded-full ${newsChipCls('Bilgilendirme')}">Bilgilendirme</span>
          </label>` : ''}
      </div>

      <div class="p-5 sm:p-6 pt-4 space-y-5">
        ${rentBlock}
        ${isSpecialBook(b) ? `
          <div class="flex gap-3 p-3.5 rounded-2xl bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-100">
            <span class="text-xl leading-none">🔒</span>
            <p class="text-xs text-rose-700 leading-relaxed">Bu kitap <b>özel kitaptır</b> ve sadece <b>${escapeHTML(b.period || 'belirli dönemlerde')}</b> okunabilir.${bookStatus(b) === 'kiradisi' && !active ? ' Şu an dönem dışında olduğu için kiralanamaz.' : ''}</p>
          </div>` : ''}
        ${isDraftBook(b) ? `
          <div class="flex gap-3 p-3.5 rounded-2xl ${bookStatus(b) === 'planlaniyor' ? 'bg-violet-50 border-violet-100 text-violet-700' : 'bg-sky-50 border-sky-100 text-sky-700'} border">
            <span class="text-xl leading-none">${bookStatus(b) === 'planlaniyor' ? '🗓️' : '✍️'}</span>
            <p class="text-xs leading-relaxed">${bookStatus(b) === 'planlaniyor' ? 'Bu kitabın gelmesi <b>planlanıyor</b>.' : 'Bu kitap <b>yazılmaya başlandı</b>, yakında geliyor.'} Bazı bilgiler henüz belli değil; şimdilik kiralanamaz.</p>
          </div>` : ''}
        ${b.description ? `<p class="text-xs text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50/80 rounded-2xl px-4 py-3">${escapeHTML(b.description)}</p>` : ''}
        <div class="grid grid-cols-2 gap-2.5">
          <div class="space-y-2.5">
            ${info('Türü', typeLabel(b.type), 'tag')}
            ${info('Fiyatı', hasPrice(b) ? formatMoney(b.price) : '—', 'wallet')}
            ${info('Sayfa Sayısı', b.pages ? `${b.pages} sayfa` : '—', 'pages')}
            ${info('Kira Süresi', b.rentalDays ? `${b.rentalDays} gün` : '—', 'rentals')}
          </div>
          <div class="space-y-2.5">
            ${info('Yazıldığı Mekan', escapeHTML(b.place || '—'), 'pin')}
            ${info('Çıkış Tarihi', isDateKey(b.releaseDate) ? formatLongDate(dateFromKey(b.releaseDate)) : '—', 'calendar')}
            ${info('Çıkış Yılı', isDateKey(b.releaseDate) ? b.releaseDate.slice(0, 4) : '—', 'calendar')}
            ${info('Yazar', escapeHTML(authorName(b)), 'pencil')}
          </div>
        </div>
        <button type="button" data-book-rentals="${b.id}" class="w-full text-left rounded-xl hover:ring-2 hover:ring-brand-100 transition">
          ${info('Kiralanma Sayısı', `${bookRentCount(b.id)} kez kiralandı${bookRentCount(b.id) ? ' · kimler kiraladı →' : ''}`, 'books')}
        </button>

        <div id="ratingBox">${ratingBoxHTML(b)}</div>

        <div>
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-xs font-bold text-slate-700">Fiyat Değişim Geçmişi</h4>
            <span class="text-[10px] text-slate-400">${logs.length > PRICE_LOG_PREVIEW ? `son ${PRICE_LOG_PREVIEW} / ` : ''}${logs.length} kayıt${admin && logs.length ? ' · silmek için 🗑' : ''}</span>
          </div>
          ${timeline}
        </div>
      </div>`, 'lg');
  }

  /* Kiralanma geçmişi: kimin, ne zaman, ne kadara kiraladığı · 10'arlı sayfa, en yeni üstte */
  function openBookRentalsModal(bookId, page = 1) {
    const b = getBook(bookId);
    if (!b) return;
    const all = rentals.filter((r) => r.bookId === b.id).sort((x, y) => new Date(y.rentedAt) - new Date(x.rentedAt));
    const pages = Math.max(1, Math.ceil(all.length / ANN_PER_PAGE));
    page = Math.min(Math.max(1, page), pages);
    const list = all.slice((page - 1) * ANN_PER_PAGE, page * ANN_PER_PAGE);
    const nowMs = Date.now();
    const how = (r) => (r.couponId ? couponRentalLabel(r)
      : r.offerId ? packageLabel(r)
      : r.discount > 0 ? `%${r.discount} ${discountSourceLabel(r.discountSource)}` : 'İndirimsiz');
    const pageBtn = (p, label, disabled = false, active = false) => `
      <button type="button" data-book-rentals="${b.id}" data-rpage="${p}" ${disabled ? 'disabled' : ''}
        class="min-w-[2rem] h-8 px-2.5 rounded-xl text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed
          ${active ? 'bg-brand-600 text-white shadow-soft' : 'bg-white border border-slate-200 text-slate-600 hover:text-brand-600'}">${label}</button>`;
    openModal(`
      ${modalHeader(`Kiralanma Geçmişi · ${escapeHTML(b.title)}`, `${all.length} kez kiralandı`, 'books')}
      <div class="p-5 space-y-3">
        ${list.length ? `<ul class="divide-y divide-slate-100 rounded-2xl border border-slate-100 overflow-hidden">${list.map((r) => {
          const usr = getUser(r.userId);
          const active = isActiveRental(r, nowMs);
          return `
            <li class="flex items-center gap-3 px-3 py-2.5 bg-white">
              ${usr ? avatarHTML(usr, 'w-8 h-8 text-[11px]') : '<span class="w-8 h-8 rounded-full bg-slate-200 shrink-0"></span>'}
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-slate-700 truncate">${escapeHTML(usr?.name || 'Silinmiş kullanıcı')}</p>
                <p class="text-[10px] text-slate-400 truncate">${formatLongDate(r.rentedAt)} · Saat ${formatTime(r.rentedAt)} · ${how(r)}</p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-xs font-bold ${r.price > 0 ? 'text-slate-800' : 'text-emerald-600'}">${r.price > 0 ? formatMoney(r.price) : 'Bedava'}</p>
                ${r.listPrice > r.price ? `<p class="text-[10px] text-slate-400 line-through">${formatMoney(r.listPrice)}</p>` : ''}
              </div>
              <span class="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}">${active ? 'Aktif' : endedLabel(r)}</span>
            </li>`;
        }).join('')}</ul>` : '<p class="text-[11px] text-slate-400 bg-slate-50 rounded-xl px-3 py-2.5">Bu kitap henüz kiralanmadı.</p>'}
        ${pages > 1 ? `
          <div class="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            ${pageBtn(page - 1, '‹ Daha yeni', page <= 1)}
            ${Array.from({ length: pages }, (_, i) => pageBtn(i + 1, i + 1, false, i + 1 === page)).join('')}
            ${pageBtn(page + 1, 'Daha eski ›', page >= pages)}
          </div>
          <p class="text-center text-[10px] text-slate-400">Sayfa ${page}/${pages}</p>` : ''}
        <div class="grid grid-cols-2 gap-2.5 pt-1">
          <button type="button" data-open-book="${b.id}" class="${BTN_SOFT} !py-2.5">${icon('back', 'w-3.5 h-3.5')}Kitaba dön</button>
          <button type="button" data-modal-close class="${BTN_PRIMARY} !py-2.5">Kapat</button>
        </div>
      </div>`, 'lg');
  }

  /* Kitap detayında gösterilen fiyat kaydı sayısı (fazlası "Tümünü gör") */
  const PRICE_LOG_PREVIEW = 5;

  /* Fiyat geçmişi satırı (kitap detayı + Tümünü gör penceresi) · planlı log mor, kesikli */
  function priceLogItemHTML(l, b, admin, backOfferId = '') {
    const diff = round2(l.newPrice - l.oldPrice);
    const up = diff > 0;
    const future = isFutureLog(l);
    return `
      <li class="relative pl-5">
        <span class="absolute -left-[7px] top-3 w-3 h-3 rounded-full bg-white border-2 ${future ? 'border-violet-400 border-dashed' : up ? 'border-rose-400' : 'border-emerald-400'}"></span>
        <div class="flex items-center gap-2 p-2.5 rounded-xl ${future ? 'bg-violet-50/60 border border-dashed border-violet-200' : 'bg-slate-50/80'}">
          <div class="flex-1 min-w-0">
            <p class="text-[10px] ${future ? 'text-violet-600 font-semibold' : 'text-slate-400'}">${future
              ? `⏳ Planlandı · ${formatLongDate(l.changedAt)} ${formatTime(l.changedAt)} · ${formatRemaining(logEffMs(l) - Date.now())}`
              : `${formatLongDate(l.changedAt)} · ${formatTime(l.changedAt)}`}</p>
            <p class="text-xs flex items-center gap-1.5 flex-wrap mt-0.5">
              <span class="text-slate-400 line-through">${formatMoney(l.oldPrice)}</span>
              <span class="text-slate-300">${icon('arrow', 'w-3 h-3')}</span>
              <b class="text-slate-800">${formatMoney(l.newPrice)}</b>
              <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-md ${up ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-600'}">${up ? '▲' : '▼'} ${formatMoney(Math.abs(diff))} · ${pctText(pricePct(l.oldPrice, l.newPrice))}</span>
            </p>
          </div>
          ${admin ? `<button type="button" data-delete-log="${l.id}" data-book-id="${b.id}" data-back-offer="${backOfferId}" title="Bu kaydı sil"
              class="${BTN_ICON} text-slate-300 hover:text-rose-500 hover:bg-rose-50 shrink-0">${icon('trash', 'w-3.5 h-3.5')}</button>` : ''}
        </div>
      </li>`;
  }

  /* Fiyat logu filtreleri (Fiyat Logu sayfası + kitabın Tümünü gör penceresi): solda tür, sağda değer */
  const logYearOf = (l) => String(new Date(l.changedAt).getFullYear());
  const PRICE_LOG_FILTERS = {
    change: {
      label: '↕️ Zam / İndirim', allLabel: 'Zam ve indirim',
      options: (list) => [
        { value: 'up', label: '▲ Zam', count: list.filter((l) => l.newPrice > l.oldPrice).length },
        { value: 'down', label: '▼ İndirim', count: list.filter((l) => l.newPrice < l.oldPrice).length }
      ].filter((o) => o.count),
      match: (l, v) => (v === 'up' ? l.newPrice > l.oldPrice : l.newPrice < l.oldPrice)
    },
    year: {
      label: '📅 Yıl', allLabel: 'Tüm yıllar',
      options: (list) => distinctOptions(list, logYearOf, (a, b) => b[0].localeCompare(a[0])),
      match: (l, v) => logYearOf(l) === v
    },
    book: {
      label: '📚 Kitap', allLabel: 'Tüm kitaplar', pageOnly: true,
      options: (list) => distinctOptions(list, (l) => String(l.bookId), (a, b) => (getBook(a[0])?.title || '').localeCompare(getBook(b[0])?.title || '', 'tr'))
        .map((o) => ({ ...o, label: getBook(o.value)?.title || 'Silinmiş kitap' })),
      match: (l, v) => String(l.bookId) === v
    }
  };

  /* Ortak "solda tür, sağda değer" filtre çubuğu · prefix: element kimlikleri ve state alanları */
  function kindValueFilter(prefix, filters, list, opts = {}) {
    const kinds = Object.entries(filters).filter(([, f]) => !(opts.inModal && f.pageOnly));
    const kind = kinds.some(([k]) => k === state[`${prefix}Kind`]) ? state[`${prefix}Kind`] : 'none';
    const options = kind === 'none' ? [] : filters[kind].options(list);
    if (!options.some((o) => o.value === state[`${prefix}Value`])) state[`${prefix}Value`] = 'all';
    state[`${prefix}Kind`] = kind;
    const value = state[`${prefix}Value`];
    const active = kind !== 'none' && value !== 'all';
    const html = `
      <div class="${opts.inModal ? 'bg-slate-50' : 'bg-white shadow-soft'} rounded-2xl p-3 grid grid-cols-2 sm:flex sm:items-center gap-2.5 ${opts.cls ?? 'mb-5'}">
        <select data-filter-kind="${prefix}" aria-label="Filtre türü" class="${INPUT_CLS} min-w-0 sm:w-52 font-semibold">
          <option value="none">🔎 Filtre türü seç</option>
          ${kinds.map(([k, f]) => `<option value="${k}" ${kind === k ? 'selected' : ''}>${f.label}</option>`).join('')}
        </select>
        <select data-filter-value="${prefix}" aria-label="Filtre değeri" ${kind === 'none' ? 'disabled' : ''} class="${INPUT_CLS} min-w-0 sm:flex-1 disabled:opacity-50">
          ${kind === 'none'
            ? '<option value="all">Önce soldan bir filtre türü seç</option>'
            : `<option value="all">${filters[kind].allLabel}</option>
               ${options.map((o) => `<option value="${escapeHTML(o.value)}" ${value === o.value ? 'selected' : ''}>${escapeHTML(o.label)} (${o.count})</option>`).join('')}`}
        </select>
        ${kind !== 'none' ? `<button type="button" data-filter-clear="${prefix}" class="${BTN_SOFT} col-span-2 sm:col-span-1 shrink-0">Filtreyi Temizle</button>` : ''}
      </div>`;
    return { html, active, apply: (items) => (active ? items.filter((x) => filters[kind].match(x, value)) : items) };
  }

  /* Filtre değişince ilgili görünümü yeniden çiz (pencere içindeyse pencereyi, değilse sayfayı) */
  function rerenderFilter(prefix) {
    if (prefix === 'bookLogFilter' && state.bookLogsOpen) return openBookPriceLogsModal(state.bookLogsOpen.bookId, state.bookLogsOpen.backOfferId);
    // Filtre değişince sayfalı listeler ilk (en yeni) sayfaya döner
    if (prefix === 'newsFilter') state.newsPage = 1;
    if (prefix === 'updFilter') state.updPage = 1;
    renderCurrentPage();
  }

  /* Kitabın tüm fiyat geçmişi (5'ten fazlaysa) · Zam/İndirim ve Yıl filtresi */
  function openBookPriceLogsModal(bookId, backOfferId = '') {
    const b = getBook(bookId);
    if (!b) return;
    const admin = isAdmin();
    const all = priceLogs.filter((l) => l.bookId === b.id).sort((x, y) => new Date(y.changedAt) - new Date(x.changedAt));
    const f = kindValueFilter('bookLogFilter', PRICE_LOG_FILTERS, all, { inModal: true, cls: '' });
    const list = f.apply(all);
    state.bookLogsOpen = { bookId: b.id, backOfferId };
    openModal(`
      ${modalHeader(`Fiyat Değişim Geçmişi · ${escapeHTML(b.title)}`, `${all.length} kayıt${f.active ? ` · filtreye uyan ${list.length}` : ''}`, 'price-logs')}
      <div class="p-5 space-y-4">
        ${f.html}
        ${list.length
          ? `<ol class="relative border-l-2 border-brand-100 ml-1.5 space-y-2.5">${list.map((l) => priceLogItemHTML(l, b, admin, backOfferId)).join('')}</ol>`
          : '<p class="text-[11px] text-slate-400 bg-slate-50 rounded-xl px-3 py-2.5">Bu filtreye uyan kayıt yok.</p>'}
        <div class="grid grid-cols-2 gap-2.5 pt-1">
          <button type="button" data-open-book="${b.id}" data-back-offer="${backOfferId}" class="${BTN_SOFT} !py-2.5">${icon('back', 'w-3.5 h-3.5')}Kitaba dön</button>
          <button type="button" data-modal-close class="${BTN_PRIMARY} !py-2.5">Kapat</button>
        </div>
      </div>`, 'lg');
  }

  /* Admin: kitap durumunu hızlı değiştir (kitap detayındaki seçimden) */
  async function setBookStatus(bookId, status) {
    if (!requireAdmin()) return;
    const b = getBook(bookId);
    if (!b || !BOOK_STATUSES[status] || bookStatus(b) === status) return;
    const toDraft = ['planlaniyor', 'yakinda'].includes(status);
    const goingLive = isDraftBook(b) && !toDraft;
    if (goingLive && (!hasPrice(b) || !b.rentalDays || !b.pages)) {
      toast('Önce eksik bilgileri tamamlayın (fiyat, sayfa, kira süresi) → Düzenle.', 'error');
      return openBookModal(b.id);
    }
    if (status === 'kiralik' && !isDateKey(b.releaseDate)) {
      toast('Kiralık yapmadan önce çıkış tarihini girin → Düzenle.', 'error');
      return openBookModal(b.id);
    }
    // Duyuru yalnızca Admin "Duyuruya at"ı işaretlediyse
    const announce = !!$('#statusAnnounce')?.checked;
    const batch = db.batch();
    const patch = { status };
    let extra = '';
    if (toDraft) { patch.newDiscountUntil = null; patch.releaseDate = null; } // Planlanıyor / Yakında kitapta çıkış tarihi tutulmaz
    if (goingLive) {
      // Taslaktan yayına: döngüye sonraki turda girer; son 7 günde çıktıysa yeni kitap indirimi (+ istenirse duyuru)
      patch.addedAt = isoAt(Date.now());
      patch.newDiscountUntil = newDiscountUntilFor(b.releaseDate);
      if (patch.newDiscountUntil && announce) { batch.set(col('announcements').doc(), newBookAnnouncement({ ...b, ...patch })); extra = ' · Duyurular\'a haber düştü 📣'; }
    }
    // Yeni kitap duyurusu atılmadıysa durum değişikliği duyurusu (Bilgilendirme)
    if (announce && !extra) { batch.set(col('announcements').doc(), statusAnnouncement(b, status)); extra = ' · Duyurular\'a haber düştü 📣'; }
    batch.update(bookRef(b.id), patch);
    await run(batch.commit(), `"${b.title}" → ${BOOK_STATUSES[status].label}${extra}`);
    if (state.modalOpen) openBookModal(b.id);
  }

  /* Kitap kilidi hâlâ geçerli mi (güvenlik kuralı da aynı alanı denetler) */
  const isBookLocked = (book, now = Date.now()) => !!book.lockUntil && book.lockUntil.toMillis() > now;

  /* Özel kitap mı (kitap kaydındaki bayrak ya da türü) */
  const isSpecialBook = (b) => b?.special === true || isSpecialType(b?.type);

  function bookRentCheck(book, user, price) {
    if (!canRent(user)) return { ok: false, reason: 'Gözlemci rolündeki kullanıcılar kiralama yapamaz.' };
    if (isBookRented(book) || isBookLocked(book)) return { ok: false, reason: 'Bu kitap şu an kirada.' };
    const blocked = statusBlockReason(book);
    if (blocked) return { ok: false, reason: blocked };
    if (!hasPrice(book)) return { ok: false, reason: 'Bu kitabın fiyatı henüz belirlenmedi.' };
    if (user.balance < price) return { ok: false, reason: `Yetersiz bakiye. ${formatMoney(price - user.balance)} eksik.` };
    return { ok: true };
  }

  /* Kitap detayında seçili kupon / hediye çeki (yoksa null) · çek seçenekleri "chq:<id>" */
  function selectedRentOption(bookId) {
    const sel = $('#rentCoupon');
    if (!sel || sel.dataset.book !== String(bookId) || !sel.value) return '';
    return sel.value;
  }
  function selectedCoupon(bookId) {
    const v = selectedRentOption(bookId);
    return v && !v.startsWith('chq:') ? coupons.find((c) => c.id === v) || null : null;
  }
  function selectedCheque(bookId) {
    const v = selectedRentOption(bookId);
    return v.startsWith('chq:') ? giftCheques.find((c) => c.id === v.slice(4)) || null : null;
  }

  /* Kupon / çek seçimi değişince fiyat, kalan bakiye ve Kirala butonu güncellenir */
  function updateRentCoupon() {
    const sel = $('#rentCoupon');
    const b = sel && getBook(sel.dataset.book);
    const u = currentUser();
    if (!b || !u) return;
    const coupon = selectedCoupon(b.id);
    const cheque = selectedCheque(b.id);
    const price = coupon ? couponPrice(coupon, b.price) : cheque ? chequePrice(cheque, b.price)
      : round2(b.price * (1 - getEffectiveDiscount(b).rate / 100));
    const check = bookRentCheck(b, u, price);
    $('#rentBtn').disabled = !check.ok;
    $('#rentBtn').textContent = `${price > 0 ? formatMoney(price) : 'Bedava'} · ${b.rentalDays} gün Kirala${coupon ? ` (${couponBadge(coupon)} kupon)` : cheque ? ` (${formatMoney(cheque.amount)} çek)` : ''}`;
    $('#rentBalAfter')?.classList.toggle('hidden', !check.ok);
    const after = $('#rentBalAfter .text-brand-600');
    if (after) after.textContent = formatMoney(round2(u.balance - price));
    $('#rentReason').classList.toggle('hidden', check.ok);
    $('#rentReason').textContent = check.ok ? '' : check.reason;
  }

  /* Kirala: kiralama kaydı + kitap kilidi + bakiye düşüşü tek batch'te yazılır.
     Kurallar: kayıt kendi uid'inle, kitap boşta, bakiye tam fiyat kadar düşmeli.
     Kupon seçildiyse kupon akışı (couponRentOps) kullanılır: ödeme kuponun paidTotal'ı üzerinden. */
  async function rentBook(bookId) {
    const b = getBook(bookId);
    const u = currentUser();
    if (!b || !u) return;

    const coupon = selectedCoupon(b.id);
    if (coupon) {
      if (coupon.userId !== u.id || couponState(coupon) !== 'active' || couponTypeOf(coupon) === 'bogo') return toast('Bu kupon artık kullanılamaz (süresi dolmuş ya da kullanılmış).', 'error');
      if (!couponEligible(b)) return toast('Kupon yalnızca Kiralık ve başka indirimi olmayan kitaba uygulanır.', 'error');
      const cPrice = couponPrice(coupon, b.price);
      const cCheck = bookRentCheck(b, u, cPrice);
      if (!cCheck.ok) return toast(cCheck.reason, 'error');
      const cBatch = db.batch();
      couponRentOps(cBatch, u, coupon, [{ book: b, price: cPrice, free: false }]);
      closeModal();
      await run(cBatch.commit(), `"${b.title}" kiralandı · ${cPrice > 0 ? formatMoney(cPrice) : 'bedava'} · 🎟️ ${couponBadge(coupon)} kupon kullanıldı`);
      return;
    }
    // Hediye çeki: tekli kiralama (ödeme bakiyeden) + çek aynı batch'te kullanılmış olur (kural çeki ve tutarı denetler)
    const cheque = selectedCheque(b.id);
    if (cheque) {
      if (cheque.userId !== u.id || chequeState(cheque) !== 'active') return toast('Bu hediye çeki artık kullanılamaz.', 'error');
      if (!couponEligible(b)) return toast('Hediye çeki yalnızca Kiralık ve indirimsiz kitaba uygulanır.', 'error');
      const qPrice = chequePrice(cheque, b.price);
      const qCheck = bookRentCheck(b, u, qPrice);
      if (!qCheck.ok) return toast(qCheck.reason, 'error');
      const nowMs = Date.now();
      const due = nowMs + (b.rentalDays || DEFAULT_RENTAL_DAYS) * DAY_MS;
      const ref = col('rentals').doc();
      const qBatch = db.batch();
      qBatch.set(ref, {
        bookId: b.id, userId: u.id,
        listPrice: b.price, price: qPrice, discount: Math.min(100, Math.round((1 - qPrice / b.price) * 100)), discountSource: 'cheque',
        offerId: null, purchaseId: null, offerPrice: null, couponId: null, chequeId: cheque.id,
        rentedAt: isoAt(nowMs), dueAt: isoAt(due), returnedAt: null
      });
      qBatch.update(bookRef(b.id), { lockUntil: Timestamp.fromMillis(due), lockBy: u.id, lockRental: ref.id, ...(isSpecialBook(b) ? { status: 'kiradisi' } : {}) });
      qBatch.update(col('users').doc(u.id), { balance: round2(u.balance - qPrice), lastTx: ref.id, lastTxType: 'rental' });
      qBatch.update(col('giftCheques').doc(cheque.id), { usedAt: isoAt(nowMs), rentalId: ref.id });
      closeModal();
      await run(qBatch.commit(), `"${b.title}" kiralandı · ${qPrice > 0 ? formatMoney(qPrice) : 'bedava'} · 🎁 ${formatMoney(cheque.amount)} hediye çeki kullanıldı`);
      return;
    }
    const { rate, source } = getEffectiveDiscount(b);
    const price = round2(b.price * (1 - rate / 100));
    const check = bookRentCheck(b, u, price);
    if (!check.ok) return toast(check.reason, 'error');

    const now = Date.now();
    const due = now + (b.rentalDays || DEFAULT_RENTAL_DAYS) * DAY_MS;
    const ref = col('rentals').doc();
    const batch = db.batch();
    batch.set(ref, {
      bookId: b.id, userId: u.id,
      listPrice: b.price, price, discount: rate, discountSource: rate ? source : null,
      offerId: null, purchaseId: null, offerPrice: null, couponId: null,
      rentedAt: isoAt(now), dueAt: isoAt(due), returnedAt: null
    });
    // Özel kitap: kiralandığı an "Kira dışı"; kiradayken "Kirada" görünür, süre bitince Kira dışı kalır
    batch.update(bookRef(b.id), { lockUntil: Timestamp.fromMillis(due), lockBy: u.id, lockRental: ref.id, ...(isSpecialBook(b) ? { status: 'kiradisi' } : {}) });
    // İndirimli kiralama puan kazandırır (defter varsa aynı batch'te; kural kazancı doğrular)
    const gain = rentalGain({ discountSource: rate ? source : null, listPrice: b.price, price });
    batch.update(col('users').doc(u.id), {
      balance: round2(u.balance - price), lastTx: ref.id, lastTxType: 'rental',
      ...(hasLedger(u) && gain > 0 ? { pointsEarned: round2(u.pointsEarned + gain) } : {})
    });

    closeModal();
    await run(batch.commit(), `"${b.title}" kiralandı · ${formatMoney(price)}${gain > 0 ? ` · ⭐ +${formatPoints(gain)}` : ''}`);
  }

  /* Kitabı sil (Admin) · her yerden temizlenir: duyurular, kiralamalar (ana sayfa +
     Kiralananlar + istatistikler), fiyat logu ve özel teklifler. Bakiye iade edilmez. */
  function deleteBook(bookId) {
    if (!requireAdmin()) return;
    const b = getBook(bookId);
    if (!b) return;
    const anns = announcements.filter((a) => a.bookId === b.id);
    const rs = rentals.filter((r) => r.bookId === b.id);
    const logs = priceLogs.filter((l) => l.bookId === b.id);
    const inOffers = offers.filter((o) => o.items.some((it) => it.bookId === b.id));
    // Özel Fırsatlar kapalı olsa da kayıt silinsin
    const vitrine = discounts.find((d) => d.bookId === b.id);
    const parts = [
      anns.length && `${anns.length} duyuru`,
      rs.length && `${rs.length} kiralama kaydı`,
      logs.length && `${logs.length} fiyat logu`,
      inOffers.length && `${inOffers.length} özel teklif`,
      vitrine && 'özel fırsat'
    ].filter(Boolean);
    openConfirm({
      title: 'Kitap silinsin mi?',
      message: `"${escapeHTML(b.title)}" kitaplıktan kalıcı olarak silinecek.${activeRentalOf(b) ? ' <b>Kitap şu an kirada.</b>' : ''}
        ${parts.length ? `Birlikte silinecekler: <b>${parts.join(', ')}</b>.` : ''} Bakiye iade edilmez.
        ${announceCheckHTML('delAnnounce', 'Bilgilendirme')}`,
      onConfirm: () => {
        const announce = $('#delAnnounce')?.checked;
        const ops = [(bt) => bt.delete(bookRef(b.id))];
        if (announce) ops.push((bt) => bt.set(col('announcements').doc(), {
          type: 'news', category: 'Bilgilendirme',
          title: `${b.title} kitaplıktan kaldırıldı`,
          body: `"${b.title}" kitaplıktan kaldırıldı ve artık kiralanamaz.`,
          bookId: null, authorId: state.currentUserId, createdAt: isoAt(Date.now()), pinned: false, readBy: []
        }));
        anns.forEach((a) => ops.push((bt) => bt.delete(col('announcements').doc(a.id))));
        rs.forEach((r) => ops.push((bt) => bt.delete(col('rentals').doc(r.id))));
        logs.forEach((l) => ops.push((bt) => bt.delete(col('priceLogs').doc(l.id))));
        if (vitrine) ops.push((bt) => bt.delete(col('discounts').doc(vitrine.id)));
        bookRatings(b.id).forEach((x) => ops.push((bt) => bt.delete(col('ratings').doc(x.id))));
        // Silinen kiralamalar puan kazandırmış olabilir → etkilenen kullanıcıların defteri yeniden hesaplanır
        ops.push(...pointsSyncOps(rs.map((r) => r.userId), { rentals: new Set(rs.map((r) => r.id)) }));
        // Teklif paketinden çıkarılır; paket boşalırsa teklif silinir
        inOffers.forEach((o) => {
          const items = o.items.filter((it) => it.bookId !== b.id);
          ops.push((bt) => items.length
            ? bt.update(col('offers').doc(o.id), { items, bookIds: items.map((it) => it.bookId) })
            : bt.delete(col('offers').doc(o.id)));
        });
        closeModal();
        run(commitOps(ops), `"${b.title}" silindi${parts.length ? ` · ${parts.join(', ')} temizlendi` : ''}.`, 'info');
      }
    });
  }

  async function deletePriceLog(logId, bookId, backOfferId) {
    if (!requireAdmin()) return;
    if (!priceLogs.some((l) => l.id === logId)) return;
    const inAllLogs = !!$('[data-filter-kind="bookLogFilter"]');
    const ok = await run(col('priceLogs').doc(logId).delete(), 'Fiyat geçmişi kaydı silindi.', 'info');
    if (ok && state.modalOpen) inAllLogs ? openBookPriceLogsModal(bookId, backOfferId) : openBookModal(bookId, { backOfferId });
  }

  /* Fiyat Logu sayfasından kayıt silme (onaylı) */
  function deletePriceLogFromPage(logId) {
    if (!requireAdmin()) return;
    const l = priceLogs.find((x) => x.id === logId);
    if (!l) return;
    const b = getBook(l.bookId);
    openConfirm({
      title: 'Fiyat kaydı silinsin mi?',
      message: `${b ? `"${escapeHTML(b.title)}" · ` : ''}${formatMoney(l.oldPrice)} → ${formatMoney(l.newPrice)} ${isFutureLog(l)
        ? `planlı değişimi iptal edilecek. ${formatLongDate(l.changedAt)} ${formatTime(l.changedAt)} geldiğinde fiyat <b>değişmeyecek</b>.`
        : 'değişimi logdan kaldırılacak. Kitabın güncel fiyatı değişmez.'}`,
      onConfirm: () => {
        closeModal();
        run(col('priceLogs').doc(l.id).delete(), 'Fiyat geçmişi kaydı silindi.', 'info');
      }
    });
  }

  /* ==========================================================
     11) FİYAT DEĞİŞİMLERİ LOGU
     ========================================================== */
  function renderPriceLogs() {
    setPageActions('price-logs', isAdmin()
      ? `<button type="button" data-quick="changePrice" class="${BTN_PRIMARY}">${icon('pencil', 'w-3.5 h-3.5')}Fiyat Güncelle</button>`
      : '');

    const admin = isAdmin();
    const nowMs = Date.now();
    // Filtre: solda tür (Zam/İndirim · Yıl · Kitap), sağda değeri
    const filter = kindValueFilter('logFilter', PRICE_LOG_FILTERS, priceLogs);
    const source = filter.apply(priceLogs);
    // Planlı (tarihi gelmemiş) değişimler ayrı bölümde; tarihi gelince normal loga karışır
    const planned = source.filter((l) => isFutureLog(l, nowMs)).sort((a, b) => logEffMs(a) - logEffMs(b));
    const logs = source.filter((l) => !isFutureLog(l, nowMs)).sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));
    const ups = logs.filter((l) => l.newPrice > l.oldPrice).length;
    const downs = logs.length - ups;
    const plannedHTML = planned.length ? `
      <div class="mb-6 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 p-3 sm:p-4">
        <div class="flex items-center gap-2 mb-2.5 px-1">
          <span class="text-xs font-bold text-violet-700">⏳ Planlanan Değişimler</span>
          <span class="flex-1 h-px bg-violet-200"></span>
          <span class="text-[10px] text-violet-500">${planned.length} planlı · tarihi gelince uygulanır</span>
        </div>
        <ul class="space-y-2">${planned.map((l) => {
          const b = getBook(l.bookId);
          const up = l.newPrice > l.oldPrice;
          return `
            <li class="flex items-stretch bg-white rounded-xl border border-violet-100 overflow-hidden">
              <button type="button" ${b ? `data-open-book="${b.id}"` : 'disabled'} class="flex-1 min-w-0 text-left flex items-center gap-3 px-3 py-2.5 hover:bg-violet-50/50 transition">
                ${coverHTML(b, 'sm')}
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-semibold text-slate-800 truncate">${b ? escapeHTML(b.title) : 'Silinmiş kitap'}</p>
                  <p class="text-[11px] text-violet-600 font-semibold">${formatLongDate(l.changedAt)} ${formatTime(l.changedAt)} · ${formatRemaining(logEffMs(l) - nowMs)}</p>
                </div>
                <div class="shrink-0 text-right">
                  <p class="text-xs"><span class="text-slate-400 line-through">${formatMoney(l.oldPrice)}</span> → <b class="text-slate-800">${formatMoney(l.newPrice)}</b></p>
                  <p class="text-[10px] font-bold ${up ? 'text-rose-500' : 'text-emerald-600'}">%${Math.abs(pricePct(l.oldPrice, l.newPrice))} ${up ? 'zam' : 'indirim'} · planlandı</p>
                </div>
              </button>
              ${admin ? `<button type="button" data-delete-page-log="${l.id}" title="Planı iptal et" aria-label="Planı iptal et"
                class="shrink-0 w-10 flex items-center justify-center border-l border-violet-100 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition">${icon('trash', 'w-4 h-4')}</button>` : ''}
            </li>`;
        }).join('')}</ul>
      </div>` : '';

    const summary = `
      <div class="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
        ${[
          { label: 'Toplam Değişim', value: logs.length, tone: 'text-slate-800' },
          { label: 'Fiyat Artışı',   value: ups,         tone: 'text-rose-500' },
          { label: 'Fiyat Düşüşü',   value: downs,       tone: 'text-emerald-600' }
        ].map((c) => `
          <div class="bg-white rounded-2xl shadow-soft p-3 sm:p-4">
            <p class="text-[10px] sm:text-[11px] text-slate-400 font-medium">${c.label}</p>
            <p class="text-lg font-bold ${c.tone}">${c.value}</p>
          </div>`).join('')}
      </div>`;

    const filterBar = priceLogs.length ? filter.html : '';
    if (!logs.length) {
      $('#priceLogsContent').innerHTML = summary + filterBar + plannedHTML
        + emptyState(filter.active ? 'Bu filtreye uyan fiyat değişikliği yok.' : 'Henüz fiyat değişikliği yapılmadı.');
      return;
    }

    // Tarihe göre grupla (yerel gün)
    const groups = new Map();
    logs.forEach((l) => {
      const key = localDateKey(l.changedAt);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(l);
    });

    const groupsHTML = [...groups.entries()].map(([key, items]) => {
      const rel = relativeDay(dateFromKey(key));
      const relChip = (rel === 'Bugün' || rel === 'Dün')
        ? `<span class="text-[10px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">${rel}</span>` : '';
      const rows = items.map((l) => {
        const b = getBook(l.bookId);
        const by = getUser(l.changedBy);
        const diff = round2(l.newPrice - l.oldPrice);
        const up = diff > 0;
        const pct = Math.abs(pricePct(l.oldPrice, l.newPrice));
        const diffChip = `<span class="inline-flex flex-col items-end px-2 py-1 rounded-lg text-[11px] font-bold tabular-nums leading-tight ${up ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-600'}">
          <span>${up ? '▲' : '▼'} ${formatMoney(Math.abs(diff))}</span>
          <span class="text-[9px] font-extrabold">%${pct} ${up ? 'ZAM' : 'İNDİRİM'}</span>
        </span>`;
        const priceFlow = `
          <span class="text-slate-400 line-through">${formatMoney(l.oldPrice)}</span>
          <span class="text-slate-300">${icon('arrow', 'w-3 h-3')}</span>
          <span class="font-semibold text-slate-800">${formatMoney(l.newPrice)}</span>`;
        return `
          <li class="flex items-stretch">
            <button type="button" ${b ? `data-open-book="${b.id}"` : 'disabled'} class="flex-1 min-w-0 text-left flex items-center gap-3 px-3 sm:px-4 py-3 hover:bg-slate-50/70 transition">
              ${coverHTML(b, 'sm')}
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-slate-800 truncate">${b ? escapeHTML(b.title) : 'Silinmiş kitap'}</p>
                <p class="text-[11px] text-slate-400 truncate">${b ? escapeHTML(seriesLabel(b)) : ''}${by ? ` · ${escapeHTML(by.name)}` : ''}</p>
                <p class="sm:hidden flex items-center gap-1.5 text-[11px] mt-1">${priceFlow}</p>
              </div>
              <div class="hidden sm:flex items-center gap-2 text-xs shrink-0">${priceFlow}</div>
              <div class="shrink-0 text-right flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-3">
                ${diffChip}
                <span class="text-[11px] font-medium text-slate-400 tabular-nums sm:w-10">${formatTime(l.changedAt)}</span>
              </div>
            </button>
            ${admin ? `<button type="button" data-delete-page-log="${l.id}" title="Bu kaydı sil" aria-label="Bu kaydı sil"
              class="shrink-0 w-10 sm:w-12 flex items-center justify-center border-l border-slate-100 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition">${icon('trash', 'w-4 h-4')}</button>` : ''}
          </li>`;
      }).join('');

      return `
        <div>
          <div class="flex items-center gap-2.5 mb-2.5 px-1">
            <span class="text-xs font-bold text-slate-700">${formatLongDate(dateFromKey(key))}</span>
            ${relChip}
            <span class="flex-1 h-px bg-brand-100"></span>
            <span class="text-[10px] text-slate-400">${items.length} değişim</span>
          </div>
          <ul class="bg-white rounded-2xl shadow-soft divide-y divide-slate-100 overflow-hidden">${rows}</ul>
        </div>`;
    }).join('');

    $('#priceLogsContent').innerHTML = summary + filterBar + plannedHTML + `<div class="space-y-6">${groupsHTML}</div>`;
  }

