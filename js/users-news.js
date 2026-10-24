  /* ==========================================================
     10) KULLANICILAR — LİDERLİK TABLOSU
     ========================================================== */
  const RANK_TONES = ['bg-amber-100 text-amber-700', 'bg-slate-100 text-slate-600', 'bg-orange-100 text-orange-700'];
  const rankTone = (i) => RANK_TONES[i] || 'bg-brand-50 text-brand-600';

  function renderUsers() {
    setPageActions('users', '');
    const board = computeLeaderboard();
    const maxSpent = Math.max(1, ...board.map((x) => x.spent));
    const totalSpent = sum(board, (x) => x.spent);
    const totalCount = board.reduce((s, x) => s + x.count, 0);
    const totalBalance = sum(users, (u) => u.balance);
    const medal = (i, row) => (i < 3 && row.spent > 0 ? MEDALS[i] : '');
    const meTag = (u) => u.id === state.currentUserId
      ? '<span class="text-[9px] font-bold text-brand-600 bg-brand-50 px-1.5 py-px rounded-full">SEN</span>' : '';
    const lockTag = (u) => canViewStats(u.id)
      ? `<span class="text-brand-300 group-hover:text-brand-500 transition">${icon('chart', 'w-3.5 h-3.5')}</span>`
      : `<span class="text-slate-300" title="Yalnızca kendi istatistiklerini görebilirsin">${icon('lock', 'w-3.5 h-3.5')}</span>`;

    /* Özet kartlar */
    const summary = [
      { label: 'Toplam Harcama',  value: formatMoney(totalSpent),   icon: 'tag',    tone: 'bg-rose-50 text-rose-500' },
      { label: 'Toplam Kiralama', value: `${totalCount} kitap`,     icon: 'books',  tone: 'bg-brand-50 text-brand-600' },
      { label: 'Aile Bakiyesi',   value: formatMoney(totalBalance), icon: 'wallet', tone: 'bg-emerald-50 text-emerald-600' }
    ].map((c) => `
      <div class="bg-white rounded-2xl shadow-soft p-3 sm:p-4 flex items-center gap-3">
        <span class="w-9 h-9 rounded-xl ${c.tone} hidden sm:flex items-center justify-center shrink-0">${icon(c.icon)}</span>
        <div class="min-w-0">
          <p class="text-[10px] sm:text-[11px] text-slate-400 font-medium">${c.label}</p>
          <p class="text-xs sm:text-sm font-bold text-slate-800 truncate">${c.value}</p>
        </div>
      </div>`).join('');

    /* Podyum (2 - 1 - 3) */
    const podiumOrder = [1, 0, 2].filter((i) => board[i]);
    const stepCls = { 0: 'h-16 from-amber-300 to-amber-400', 1: 'h-11 from-slate-200 to-slate-300', 2: 'h-8 from-orange-200 to-orange-300' };
    const podium = podiumOrder.map((i) => {
      const row = board[i];
      return `
        <div class="flex flex-col items-center min-w-0">
          <button type="button" data-user-stats="${row.user.id}"
            class="group w-full bg-white rounded-2xl shadow-soft p-3 sm:p-4 text-center flex flex-col items-center hover:shadow-soft-lg hover:-translate-y-0.5 transition ${i === 0 ? 'ring-2 ring-amber-200' : ''}">
            <span class="text-2xl sm:text-3xl leading-none mb-2">${MEDALS[i]}</span>
            ${avatarHTML(row.user, i === 0 ? 'w-12 h-12 sm:w-14 sm:h-14 text-sm' : 'w-10 h-10 sm:w-12 sm:h-12 text-xs')}
            <p class="text-[11px] sm:text-xs font-semibold text-slate-800 mt-2 truncate max-w-full">${escapeHTML(row.user.name)}</p>
            <p class="text-xs sm:text-sm font-bold text-brand-600">${formatMoney(row.spent)}</p>
            <p class="text-[10px] text-slate-400">${row.count} kitap</p>
          </button>
          <div class="w-4/5 mt-2 rounded-t-xl bg-gradient-to-b ${stepCls[i]} flex items-start justify-center pt-1 text-white text-sm font-black">${i + 1}</div>
        </div>`;
    }).join('');

    /* Masaüstü tablo */
    const tableRows = board.map((row, i) => {
      const u = row.user;
      const mine = u.id === state.currentUserId;
      const pct = Math.round((row.spent / maxSpent) * 100);
      return `
        <tr data-user-stats="${u.id}" class="group cursor-pointer ${mine ? 'bg-brand-50/50' : ''} hover:bg-brand-50/40 transition">
          <td class="pl-5 pr-2 py-3.5"><span class="w-7 h-7 rounded-full ${rankTone(i)} text-[11px] font-bold flex items-center justify-center">${i + 1}</span></td>
          <td class="px-2 py-3.5">
            <div class="flex items-center gap-3">
              ${avatarHTML(u, 'w-9 h-9 text-xs')}
              <div class="min-w-0">
                <p class="text-xs font-semibold text-slate-800 flex items-center gap-1.5 group-hover:text-brand-600 transition">${escapeHTML(u.name)} ${medal(i, row) ? `<span class="text-base leading-none">${medal(i, row)}</span>` : ''} ${meTag(u)} ${lockTag(u)}</p>
                <p class="mt-0.5">${roleChip(u.role)}</p>
              </div>
            </div>
          </td>
          <td class="px-2 py-3.5 text-center">
            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-[11px] font-semibold">${icon('books', 'w-3 h-3')}${row.count}</span>
          </td>
          <td class="px-2 py-3.5 text-right">
            <p class="text-xs font-bold text-slate-800">${formatMoney(row.spent)}</p>
            <div class="ml-auto mt-1.5 w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div class="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600" style="width:${pct}%"></div>
            </div>
          </td>
          <td class="pl-2 pr-5 py-3.5 text-right text-xs font-semibold text-emerald-600">${formatMoney(u.balance)}</td>
        </tr>`;
    }).join('');

    /* Mobil kartlar */
    const mobileRows = board.map((row, i) => {
      const u = row.user;
      const mine = u.id === state.currentUserId;
      return `
        <li>
          <button type="button" data-user-stats="${u.id}" class="group w-full text-left bg-white rounded-2xl shadow-soft p-3.5 ${mine ? 'ring-1 ring-brand-200' : ''} active:scale-[.99] transition">
            <div class="flex items-center gap-3">
              <span class="w-7 h-7 rounded-full ${rankTone(i)} text-[11px] font-bold flex items-center justify-center shrink-0">${i + 1}</span>
              ${avatarHTML(u, 'w-10 h-10 text-xs')}
              <div class="min-w-0 flex-1">
                <p class="text-xs font-semibold text-slate-800 flex items-center gap-1.5 flex-wrap">${escapeHTML(u.name)} ${medal(i, row) ? `<span class="text-base leading-none">${medal(i, row)}</span>` : ''} ${meTag(u)}</p>
                <p class="mt-0.5">${roleChip(u.role)}</p>
              </div>
              ${lockTag(u)}
            </div>
            <div class="grid grid-cols-3 gap-2 mt-3">
              <div class="rounded-xl bg-brand-50/70 px-2.5 py-2"><p class="text-[10px] text-slate-400">Kiralanan</p><p class="text-xs font-bold text-brand-700">${row.count} kitap</p></div>
              <div class="rounded-xl bg-slate-50 px-2.5 py-2"><p class="text-[10px] text-slate-400">Harcama</p><p class="text-xs font-bold text-slate-800">${formatMoney(row.spent)}</p></div>
              <div class="rounded-xl bg-emerald-50/70 px-2.5 py-2"><p class="text-[10px] text-slate-400">Bakiye</p><p class="text-xs font-bold text-emerald-600">${formatMoney(u.balance)}</p></div>
            </div>
          </button>
        </li>`;
    }).join('');

    $('#usersContent').innerHTML = `
      <div class="grid grid-cols-3 gap-2 sm:gap-4 mb-6">${summary}</div>

      ${board.length >= 3 ? `<div class="grid grid-cols-3 gap-2 sm:gap-6 items-end max-w-2xl mx-auto mb-6">${podium}</div>` : ''}

      <div class="hidden md:block bg-white rounded-2xl shadow-soft overflow-hidden">
        <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 class="text-sm font-bold text-slate-800">Liderlik Tablosu</h2>
            <p class="text-[11px] text-slate-400">Kitaplar için en çok bakiye harcayanlar · detaylı istatistik için satıra tıkla</p>
          </div>
          <span class="text-[10px] font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">Sıralama: Toplam Harcama ↓</span>
        </div>
        <table class="w-full">
          <thead class="bg-brand-50/50 text-[10px] uppercase tracking-wider text-slate-400">
            <tr>
              <th class="pl-5 pr-2 py-3 text-left font-semibold w-16">Sıra</th>
              <th class="px-2 py-3 text-left font-semibold">Kullanıcı</th>
              <th class="px-2 py-3 text-center font-semibold">Kiralanan Kitap</th>
              <th class="px-2 py-3 text-right font-semibold">Toplam Harcama</th>
              <th class="pl-2 pr-5 py-3 text-right font-semibold">Güncel Bakiye</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">${tableRows}</tbody>
        </table>
      </div>

      <div class="md:hidden">
        <h2 class="text-sm font-bold text-slate-800 mb-1 px-1">Liderlik Tablosu</h2>
        <p class="text-[11px] text-slate-400 mb-3 px-1">Detaylı istatistik için karta dokun</p>
        <ul class="space-y-2.5">${mobileRows}</ul>
      </div>`;
  }

  /* İstatistik modalı listeleri: sayfa başına kayıt + sayfalama */
  const STATS_PAGE_SIZE = 5;

  function pageSlice(list, kind, size = STATS_PAGE_SIZE) {
    const pages = Math.max(1, Math.ceil(list.length / size));
    const page = Math.min(Math.max(1, state.statsPage[kind] || 1), pages);
    state.statsPage[kind] = page;
    return { items: list.slice((page - 1) * size, page * size), page, pages };
  }

  function pagerHTML(kind, page, pages, total, size = STATS_PAGE_SIZE) {
    if (pages <= 1) return '';
    const btn = (p, label, disabled, active = false) => `
      <button type="button" data-stats-page="${kind}" data-page="${p}" ${disabled ? 'disabled' : ''}
        class="min-w-[2rem] h-8 px-2 rounded-lg text-[11px] font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${active
          ? 'bg-gradient-to-r from-brand-500 to-brand-700 text-white shadow-soft'
          : 'bg-white border border-brand-100 text-slate-600 hover:border-brand-300'}">${label}</button>`;
    const nums = Array.from({ length: pages }, (_, i) => i + 1)
      .filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1);
    const parts = [];
    nums.forEach((p, i) => {
      if (i && p - nums[i - 1] > 1) parts.push('<span class="text-[11px] text-slate-300 px-0.5">…</span>');
      parts.push(btn(p, p, false, p === page));
    });
    return `
      <div class="flex items-center justify-between gap-2 mt-3">
        <span class="text-[10px] text-slate-400">${(page - 1) * size + 1}–${Math.min(page * size, total)} / ${total}</span>
        <div class="flex items-center gap-1">
          ${btn(page - 1, '‹', page === 1)}${parts.join('')}${btn(page + 1, '›', page === pages)}
        </div>
      </div>`;
  }

  /* Geçmiş kiralamalar · istatistik penceresinde en yeni 5 (fazlası "Tümünü gör"),
     full: Tümünü gör penceresinde 10'arlı sayfa */
  const STATS_RENTALS_PREVIEW = 5;
  const STATS_RENTALS_PAGE = 10;
  function statsRentalsHTML(userId, full = false) {
    const nowMs = Date.now();
    const list = rentals.filter((r) => r.userId === userId)
      .sort((a, b) => new Date(b.rentedAt) - new Date(a.rentedAt));
    if (!list.length) return '<p class="text-[11px] text-slate-400 bg-slate-50 rounded-xl px-3 py-2.5">Henüz kiralama yok.</p>';
    const { items, page, pages } = full ? pageSlice(list, 'rentals', STATS_RENTALS_PAGE)
      : { items: list.slice(0, STATS_RENTALS_PREVIEW), page: 1, pages: 1 };
    const rows = items.map((r) => {
      const b = getBook(r.bookId);
      const active = isActiveRental(r, nowMs);
      const statusChip = active
        ? '<span class="text-[10px] font-semibold px-1.5 py-px rounded-md bg-emerald-50 text-emerald-600">Aktif</span>'
        : `<span class="text-[10px] font-semibold px-1.5 py-px rounded-md bg-slate-100 text-slate-500">${endedLabel(r)}</span>`;
      const tag = rentalDiscountTag(r);
      const discChip = tag ? `<span class="text-[10px] font-semibold px-1.5 py-px rounded-md ${tag.tone} truncate max-w-full">${escapeHTML(tag.label)}</span>` : '';
      return `
        <li class="flex items-center gap-3 p-2.5 rounded-xl ${active ? 'bg-emerald-50/30 border border-emerald-100' : 'bg-slate-50/80'}">
          ${coverHTML(b, 'xs')}
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-slate-700 truncate">${b ? escapeHTML(b.title) : 'Silinmiş kitap'}</p>
            <p class="flex items-center gap-1.5 mt-0.5 flex-wrap">${statusChip}${discChip}</p>
            <p class="text-[10px] text-slate-400 mt-0.5">Kiraladı: ${formatDate(r.rentedAt, true)} · Bitiş: ${formatDate(r.dueAt, true)}</p>
          </div>
          <div class="text-right shrink-0">
            ${rentalPriceHTML(r, false)}
          </div>
          ${statsDeleteBtn('data-stats-del-rental', r.id)}
        </li>`;
    }).join('');
    const footer = full ? pagerHTML('rentals', page, pages, list.length, STATS_RENTALS_PAGE)
      : list.length > STATS_RENTALS_PREVIEW ? `<button type="button" data-stats-all-rentals="${userId}"
          class="${BTN_SOFT} w-full !py-2 mt-3">Tümünü gör · ${list.length} kayıt →</button>` : '';
    return `<ul class="space-y-2">${rows}</ul>${footer}`;
  }

  /* Tümünü gör: kullanıcının bütün kiralamaları · 10'arlı sayfa */
  function openStatsRentalsModal(userId) {
    const u = getUser(userId);
    if (!u || !canViewStats(userId)) return;
    state.statsUserId = userId;
    state.statsPage = { ...state.statsPage, rentals: 1 };
    const total = rentals.filter((r) => r.userId === userId).length;
    openModal(`
      ${modalHeader(`Geçmiş Kiralamalar · ${escapeHTML(u.name)}`, `${total} kayıt · aktif + süresi dolan`, 'rentals')}
      <div class="p-5 space-y-4">
        <div id="statsRentalsAll">${statsRentalsHTML(userId, true)}</div>
        <div class="grid grid-cols-2 gap-2.5">
          <button type="button" data-user-stats="${userId}" class="${BTN_SOFT} !py-2.5">${icon('back', 'w-3.5 h-3.5')}İstatistiklere dön</button>
          <button type="button" data-modal-close class="${BTN_PRIMARY} !py-2.5">Kapat</button>
        </div>
      </div>`, 'lg');
  }

  /* Admin'e özel kayıt silme butonu (istatistik modalı) */
  const statsDeleteBtn = (attr, id) => isAdmin()
    ? `<button type="button" ${attr}="${id}" title="Kaydı sil" aria-label="Kaydı sil" class="${BTN_ICON} shrink-0 text-slate-300 hover:text-rose-500 hover:bg-rose-50">${icon('trash', 'w-3.5 h-3.5')}</button>`
    : '';

  /* İstatistik kaydı sil (Admin) · onaydan sonra aynı kullanıcının istatistiklerine dönülür */
  function deleteStatsRecord(kind, id) {
    if (!requireAdmin()) return;
    const userId = state.statsUserId;
    const pages = { ...state.statsPage };
    const back = () => { if (userId) openUserStatsModal(userId, pages); };
    const r = kind === 'rental' ? getRental(id) : null;
    const p = kind === 'purchase' ? offerPurchases.find((x) => x.id === id) : null;
    if (!r && !p) return;
    const pkg = p || (r.purchaseId && offerPurchases.find((x) => x.id === r.purchaseId));
    const b = r && getBook(r.bookId);
    openConfirm({
      title: 'Kayıt silinsin mi?',
      message: pkg
        ? `"${escapeHTML(pkg.offerTitle)}" paket satın alımı ve paketin tüm kiralamaları silinecek.`
        : `"${escapeHTML(b?.title || 'Silinmiş kitap')}" kiralaması silinecek.`,
      onConfirm: async () => {
        const done = pkg ? removePurchase(pkg.id) : removeRental(r.id).done;
        await run(done, 'Kayıt silindi · istatistikler güncellendi.', 'info');
        back();
      }
    });
  }

  /* Kullanıcının tüm istatistiklerini sıfırla (Admin) · kiralamalar + satın alımlar silinir */
  /* Kategori özetleri: kayıt sayısı + harcama (sıfırlama penceresi) */
  function statCatSummary(userId) {
    const mine = rentals.filter((r) => r.userId === userId);
    const out = {};
    Object.entries(STAT_CATS).forEach(([k, c]) => {
      if (k === 'offer') {
        const ps = offerPurchases.filter((p) => p.userId === userId);
        out[k] = { count: ps.length, unit: 'paket', spent: sum(ps, (p) => p.price) };
      } else if (k === 'coupon') {
        const rs = mine.filter(c.pick);
        out[k] = { count: rs.length + coupons.filter((x) => x.userId === userId).length, unit: 'kayıt', spent: sum(rs, (r) => r.price) };
      } else {
        const rs = mine.filter(c.pick);
        out[k] = { count: rs.length, unit: 'kiralama', spent: sum(rs, (r) => r.price) };
      }
    });
    return out;
  }

  /* İstatistik sıfırlama penceresi (Admin): kategori kategori ya da tümü */
  function resetUserStats(userId) {
    if (!requireAdmin()) return;
    const u = getUser(userId);
    if (!u) return;
    const sm = statCatSummary(userId);
    if (!Object.values(sm).some((x) => x.count)) return toast('Bu kullanıcının silinecek istatistiği yok.', 'info');
    openModal(`
      ${modalHeader(`${escapeHTML(u.name)} · İstatistik Sıfırla`, 'Kategori seçerek ayrı ayrı ya da hepsini birden sıfırlayabilirsin. Bakiye değişmez.', 'chart', 'bg-rose-50 text-rose-500')}
      <form data-form="resetStats" data-user-id="${u.id}" class="p-5 space-y-3" autocomplete="off">
        <ul class="space-y-2">
          ${Object.entries(STAT_CATS).map(([k, c]) => `
            <li>
              <label class="flex items-center gap-3 p-3 rounded-xl border ${sm[k].count ? 'border-slate-100 hover:border-rose-200 cursor-pointer' : 'border-slate-100 opacity-50'} transition">
                <input type="checkbox" name="cat" value="${k}" ${sm[k].count ? '' : 'disabled'} class="w-4 h-4 rounded border-slate-300 text-rose-500" />
                <span class="flex-1 min-w-0">
                  <span class="block text-xs font-semibold text-slate-700">${c.label}</span>
                  <span class="block text-[10px] text-slate-400">${sm[k].count} ${sm[k].unit} · ${formatMoney(sm[k].spent)} harcama</span>
                </span>
              </label>
            </li>`).join('')}
        </ul>
        <p class="text-[10px] text-slate-400 leading-relaxed">Silinen kayıtlar harcama, kazanç ve sıralamadan düşer; aktif kiralamalardaki kitaplar yeniden kiralanabilir olur.</p>
        <div class="grid grid-cols-2 gap-2.5 pt-1">
          <button type="button" data-reset-all="${u.id}" class="py-2.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition">Tümünü Sıfırla</button>
          <button type="submit" class="py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 transition">Seçilenleri Sıfırla</button>
        </div>
      </form>`);
  }

  /* cats: sıfırlanacak kategori anahtarları (boş/yok → tümü) */
  function confirmResetStats(userId, cats) {
    if (!requireAdmin()) return;
    const u = getUser(userId);
    if (!u) return;
    const all = !cats || cats.length === Object.keys(STAT_CATS).length;
    const keys = all ? Object.keys(STAT_CATS) : cats;
    const sm = statCatSummary(userId);
    openConfirm({
      title: all ? `${escapeHTML(u.name)} tamamen sıfırlansın mı?` : 'Seçilen istatistikler sıfırlansın mı?',
      message: `${keys.map((k) => `<b>${STAT_CATS[k].label}</b> (${sm[k].count})`).join('<br>')}<br>kalıcı olarak silinecek. Bakiye değişmez.`,
      confirmLabel: 'Sıfırla',
      onConfirm: async () => {
        await run(removeUserHistory(userId, keys), all ? `${u.name} istatistikleri tamamen sıfırlandı.` : `${u.name}: seçilen istatistikler sıfırlandı.`, 'info');
        openUserStatsModal(userId);
      }
    });
  }

  function handleResetStats(form) {
    const cats = [...form.querySelectorAll('input[name="cat"]:checked')].map((i) => i.value);
    if (!cats.length) return toast('En az bir kategori seç.', 'error');
    confirmResetStats(form.dataset.userId, cats);
  }

  /* Sayfa değişimi yalnızca "Tümünü gör" penceresinde (istatistik penceresi en yeni 5'i gösterir) */
  function goStatsPage(kind, page) {
    if (!state.statsUserId || kind !== 'rentals') return;
    state.statsPage.rentals = Number(page) || 1;
    const box = $('#statsRentalsAll');
    if (box) box.innerHTML = statsRentalsHTML(state.statsUserId, true);
  }

  /* İstatistiklerde kuponlar: aktif → kullanılan → süresi dolan */
  function statsCouponsHTML(userId) {
    const now = Date.now();
    const mine = coupons.filter((c) => c.userId === userId);
    if (!mine.length) return '<p class="text-[11px] text-slate-400 bg-slate-50 rounded-xl px-3 py-2.5">Henüz kupon yok.</p>';
    const group = (st, title) => {
      const list = mine.filter((c) => couponState(c, now) === st)
        .sort((a, b) => (st === 'active' ? a.expiresMs - b.expiresMs : b.expiresMs - a.expiresMs));
      return list.length ? `
        <p class="text-[10px] font-semibold text-slate-400 mt-2 mb-1.5">${title} (${list.length})</p>
        <ul class="space-y-2">${list.map((c) => couponCardHTML(c, now)).join('')}</ul>` : '';
    };
    return group('active', 'Aktif kuponlar') + group('used', 'Kullanılan kuponlar') + group('expired', 'Süresi dolan kuponlar');
  }

  /* Detaylı Aile Üyesi İstatistikleri modalı */
  function openUserStatsModal(userId, keepPages = null) {
    const u = getUser(userId);
    if (!u) return;
    if (!canViewStats(userId)) return toast('Yalnızca kendi istatistiklerini görüntüleyebilirsin.', 'error');

    const s = userStats(userId);
    const board = computeLeaderboard();
    const rank = board.findIndex((x) => x.user.id === userId);
    const self = userId === state.currentUserId;

    const tiles = [
      { label: 'Kiralanan Kitap', value: `${s.count}`,             tone: 'text-brand-700', bg: 'bg-brand-50/70' },
      { label: 'Toplam Harcama',  value: formatMoney(s.spent),     tone: 'text-slate-800', bg: 'bg-slate-50' },
      { label: 'Güncel Bakiye',   value: formatMoney(u.balance),   tone: 'text-emerald-600', bg: 'bg-emerald-50/70' },
      { label: 'Sıralama',        value: `#${rank + 1} ${rank < 3 && s.spent > 0 ? MEDALS[rank] : ''}`, tone: 'text-amber-600', bg: 'bg-amber-50/70' }
    ].map((t) => `
      <div class="rounded-2xl ${t.bg} px-3 py-3">
        <p class="text-[10px] text-slate-400 font-medium">${t.label}</p>
        <p class="text-sm sm:text-base font-bold ${t.tone} truncate">${t.value}</p>
      </div>`).join('');

    state.statsUserId = userId;
    state.statsPage = keepPages || { rentals: 1 };

    openModal(`
      <div class="relative p-5 sm:p-6 bg-gradient-to-br from-brand-500 to-brand-700 text-white overflow-hidden">
        <span class="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10"></span>
        <span class="absolute right-20 -bottom-12 w-28 h-28 rounded-full bg-white/10"></span>
        <button type="button" data-modal-close aria-label="Kapat" class="absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 flex items-center justify-center transition">${icon('close', 'w-5 h-5 pointer-events-none')}</button>
        <p class="relative text-[11px] font-semibold text-brand-100">Detaylı Aile Üyesi İstatistikleri 📊</p>
        <div class="relative flex items-center gap-3.5 mt-3">
          ${avatarHTML(u, 'w-14 h-14 text-base ring-4 ring-white/25')}
          <div class="min-w-0">
            <h3 class="text-lg font-bold truncate">${escapeHTML(u.name)}</h3>
            <div class="flex items-center gap-1.5 flex-wrap mt-0.5">
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20">${ROLES[u.role]?.label}</span>
              <span class="text-[11px] text-brand-100 truncate">${u.email ? '🔗 ' + escapeHTML(u.email) : 'Bağlı hesap yok'}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="p-5 sm:p-6 space-y-5">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">${tiles}</div>

        <div class="rounded-2xl p-4 bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-[11px] font-semibold text-amber-700">${self ? 'Puanın' : 'Puanı'} ⭐</p>
              <p class="text-2xl font-black text-amber-600 mt-0.5">${formatPoints(s.points.available)}</p>
            </div>
            ${self ? `<a href="#gifts" class="${BTN_SOFT} !py-1.5 shrink-0">🎟️ Hediyelerim</a>` : ''}
          </div>
          <div class="flex flex-wrap gap-1.5 mt-2.5">
            <span class="text-[10px] font-semibold px-2 py-1 rounded-lg bg-white text-emerald-600">Kazanılan: ${formatPoints(s.points.earned)}</span>
            <span class="text-[10px] font-semibold px-2 py-1 rounded-lg bg-white text-rose-500">Kupona harcanan: ${formatPoints(s.points.spent)}</span>
          </div>
          <p class="text-[10px] text-amber-700/70 mt-2">İndirimlerden kazanılan her 1 ₺ = 1 puan · kuponlu kiralamalar puan kazandırmaz</p>
        </div>

        <div>
          <div class="flex items-center justify-between mb-2.5">
            <h4 class="text-xs font-bold text-slate-700">🎟️ Kuponlar</h4>
            <span class="text-[10px] text-slate-400">${activeCouponsOf(userId).length} aktif · ${coupons.filter((c) => c.userId === userId).length} toplam</span>
          </div>
          ${statsCouponsHTML(userId)}
        </div>

        <div>
          <div class="flex items-center justify-between mb-2.5">
            <h4 class="text-xs font-bold text-slate-700">📚 Geçmiş Kiralamalar</h4>
            <span class="text-[10px] text-slate-400">Aktif + süresi dolan · ${rentals.filter((r) => r.userId === userId).length} kayıt</span>
          </div>
          <div id="statsRentals">${statsRentalsHTML(userId)}</div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2">
          ${isAdmin() ? `<button type="button" data-stats-reset="${u.id}" class="${BTN_SOFT} !text-rose-500 !border-rose-100 hover:!border-rose-300">${icon('trash', 'w-3.5 h-3.5')}İstatistikleri Sıfırla</button>` : '<span></span>'}
          <button type="button" data-modal-close class="${BTN_SOFT}">Kapat</button>
        </div>
      </div>`, 'lg');
  }

  /* ==========================================================
     12) DUYURULAR (Haberler + Güncellemeler)
     ========================================================== */
  const versionParts = (v) => (String(v).match(/\d+/g) || []).map(Number);
  const compareVersions = (a, b) => {
    const pa = versionParts(a), pb = versionParts(b);
    for (let i = 0; i < 3; i++) { const d = (pb[i] || 0) - (pa[i] || 0); if (d) return d; }
    return 0;
  };
  const normalizeVersion = (v) => {
    const m = String(v).trim().match(/^v?(\d+)\.(\d+)(?:\.(\d+))?$/i);
    return m ? `v${m[1]}.${m[2]}.${m[3] || 0}` : null;
  };

  const sortedNews = () => announcements
    .filter((a) => a.type === 'news')
    .sort((a, b) => (b.pinned - a.pinned) || (new Date(b.createdAt) - new Date(a.createdAt)));

  const sortedUpdates = () => announcements
    .filter((a) => a.type === 'update')
    .sort((a, b) => (new Date(b.releaseDate) - new Date(a.releaseDate)) || compareVersions(a.version, b.version));

  /* "YENİ" yalnızca en son gönderilen güncellemede, gönderildikten sonra 7 gün boyunca.
     7 gün dolmadan yeni güncelleme gelirse etiket ona geçer. */
  const NEW_UPDATE_DAYS = 7;
  function newUpdateId(now = Date.now()) {
    const latest = announcements.filter((a) => a.type === 'update')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    return latest && now - new Date(latest.createdAt).getTime() < NEW_UPDATE_DAYS * DAY_MS ? latest.id : null;
  }
  const newUpdateBadge = '<span class="text-[9px] font-extrabold text-white bg-gradient-to-r from-rose-500 to-orange-400 px-1.5 py-0.5 rounded-full shadow-soft animate-pulse">YENİ</span>';
  /* Güncelleme tarihi + gönderildiği saat */
  const updateWhen = (a) => `${isDateKey(a.releaseDate) ? formatLongDate(dateFromKey(a.releaseDate)) : formatLongDate(a.createdAt)}${a.createdAt ? ` · ${formatTime(a.createdAt)}` : ''}`;

  function renderAnnouncements() {
    markAnnouncementsRead();   // sayfa açıldığı an rozet sıfırlanır

    const admin = isAdmin();
    setPageActions('announcements', admin
      ? (state.annTab === 'news'
          ? `<button type="button" data-bulk-news class="${BTN_SOFT} !text-rose-500 !border-rose-100 hover:!border-rose-300">${icon('trash', 'w-3.5 h-3.5')}Toplu Sil</button>
             <button type="button" data-quick="addNews" class="${BTN_PRIMARY}">${icon('plus', 'w-3.5 h-3.5')}Duyuru/Haber Ekle 📣</button>`
          : `<button type="button" data-quick="addUpdate" class="${BTN_PRIMARY}">${icon('plus', 'w-3.5 h-3.5')}Yeni Sürüm Notu</button>`)
      : '');

    const newsCount = announcements.filter((a) => a.type === 'news').length;
    const updCount = announcements.filter((a) => a.type === 'update').length;
    const tabBtn = (key, label, count, iconKey) => {
      const active = state.annTab === key;
      return `
        <button type="button" data-ann-tab="${key}"
          class="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition ${active ? 'bg-gradient-to-r from-brand-500 to-brand-700 text-white shadow-soft' : 'text-slate-500 hover:text-brand-600'}">
          ${icon(iconKey, 'w-3.5 h-3.5')}${label}
          <span class="text-[10px] px-1.5 py-px rounded-full ${active ? 'bg-white/25' : 'bg-brand-50 text-brand-600'}">${count}</span>
        </button>`;
    };

    $('#annContent').innerHTML = `
      <div class="inline-flex p-1 bg-white rounded-full shadow-soft mb-5">
        ${tabBtn('news', 'Haberler', newsCount, 'news')}
        ${tabBtn('update', 'Güncellemeler', updCount, 'sparkles')}
      </div>
      <div id="annBody" class="page-enter"></div>`;

    if (state.annTab === 'news') renderNewsTab();
    else renderUpdatesTab();
  }

  const freshChip = (id) => state.freshAnnIds.has(id)
    ? '<span class="text-[9px] font-bold text-white bg-rose-500 px-1.5 py-px rounded-full">YENİ</span>' : '';

  function renderNewsTab() {
    const all = sortedNews();
    if (!all.length) { $('#annBody').innerHTML = emptyState('Henüz haber yok.'); return; }

    // Standart filtre: solda tür (Tür · Yıl), sağda değeri · 10'arlı sayfa (1. sayfa en yeni)
    const f = kindValueFilter('newsFilter', NEWS_FILTERS, all);
    const catBar = f.html;
    const filtered = f.apply(all);
    if (!filtered.length) { $('#annBody').innerHTML = catBar + emptyState('Bu filtreye uyan haber yok.'); return; }
    const { items: list, page, pages } = annPage(filtered, 'newsPage');

    const admin = isAdmin();
    // Liste görünümü: sabitlenenler en üstte, sonra gün gün (Bugün · Dün · tarih) gruplu satırlar
    const row = (a) => {
      const cat = newsCategoryOf(a);
      const book = a.bookId ? getBook(a.bookId) : null;
      const author = getUser(a.authorId);
      const ic = NEWS_ICONS[cat] || NEWS_ICONS.Duyuru;
      return `
        <li data-open-ann="${a.id}" role="button" tabindex="0"
          class="group flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3 cursor-pointer hover:bg-brand-50/40 focus:bg-brand-50/60 focus:outline-none transition">
          ${book ? coverHTML(book, 'sm')
            : `<span class="w-10 h-10 rounded-xl bg-gradient-to-br ${ic.bg} flex items-center justify-center text-lg shrink-0">${ic.emoji}</span>`}
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${newsChipCls(cat)}">${escapeHTML(cat)}</span>
              ${a.pinned ? '<span class="shrink-0 text-[10px]" title="Sabitlenmiş">📌</span>' : ''}
              ${freshChip(a.id)}
              <p class="text-sm font-semibold text-slate-800 truncate">${escapeHTML(a.title)}</p>
            </div>
            <p class="text-xs text-slate-500 mt-0.5 truncate">${escapeHTML(a.body.replace(/\s+/g, ' '))}</p>
          </div>
          <div class="hidden sm:flex items-center gap-1.5 shrink-0 text-[11px] text-slate-400">
            ${author ? avatarHTML(author, 'w-5 h-5 text-[8px]') : ''}
          </div>
          <span class="shrink-0 text-[11px] font-medium text-slate-400 tabular-nums">${formatTime(a.createdAt)}</span>
          ${admin ? `
            <div class="shrink-0 flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition">
              <button type="button" data-edit-news="${a.id}" title="Düzenle" aria-label="Düzenle" class="${BTN_ICON} text-slate-300 hover:text-brand-600 hover:bg-brand-50">${icon('pencil', 'w-3.5 h-3.5 pointer-events-none')}</button>
              <button type="button" data-delete-news="${a.id}" title="Sil" aria-label="Sil" class="${BTN_ICON} text-slate-300 hover:text-rose-500 hover:bg-rose-50">${icon('trash', 'w-3.5 h-3.5 pointer-events-none')}</button>
            </div>` : ''}
          <span class="hidden sm:block text-slate-300 shrink-0">${icon('chevron', 'w-4 h-4')}</span>
        </li>`;
    };
    const groups = new Map();
    list.forEach((a) => {
      const key = a.pinned ? 'pinned' : localDateKey(a.createdAt);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(a);
    });
    const groupTitle = (key) => {
      if (key === 'pinned') return '📌 Sabitlenenler';
      const rel = relativeDay(dateFromKey(key));
      return rel === 'Bugün' || rel === 'Dün' ? `${rel} · ${formatLongDate(dateFromKey(key))}` : formatLongDate(dateFromKey(key));
    };
    $('#annBody').innerHTML = catBar + `<div class="space-y-5">${[...groups.entries()].map(([key, items]) => `
      <div>
        <div class="flex items-center gap-2.5 mb-2 px-1">
          <span class="text-xs font-bold text-slate-700">${groupTitle(key)}</span>
          <span class="flex-1 h-px bg-brand-100"></span>
          <span class="text-[10px] text-slate-400">${items.length} haber</span>
        </div>
        <ul class="bg-white rounded-2xl shadow-soft divide-y divide-slate-100 overflow-hidden">${items.map(row).join('')}</ul>
      </div>`).join('')}</div>${annPagerHTML('newsPage', page, pages, filtered.length, 'haber')}`;
  }

  /* Haberler + Güncellemeler: filtreler (standart "solda tür, sağda değer") */
  const annYearOf = (a) => String(a.year ?? new Date(a.createdAt).getFullYear());
  const NEWS_FILTERS = {
    category: {
      label: '🏷️ Tür', allLabel: 'Tüm türler',
      options: (list) => Object.keys(NEWS_CATEGORIES)
        .map((c) => ({ value: c, label: c, count: list.filter((a) => newsCategoryOf(a) === c).length }))
        .filter((o) => o.count),
      match: (a, v) => newsCategoryOf(a) === v
    },
    year: {
      label: '📅 Yıl', allLabel: 'Tüm yıllar',
      options: (list) => distinctOptions(list, (a) => String(new Date(a.createdAt).getFullYear()), (x, y) => y[0].localeCompare(x[0])),
      match: (a, v) => String(new Date(a.createdAt).getFullYear()) === v
    }
  };
  const updateMajor = (a) => `v${String(a.version || '').replace(/^v/, '').split('.')[0] || '0'}.x`;
  const UPDATE_FILTERS = {
    year: {
      label: '📅 Yıl', allLabel: 'Tüm yıllar',
      options: (list) => distinctOptions(list, annYearOf, (x, y) => y[0].localeCompare(x[0])),
      match: (a, v) => annYearOf(a) === v
    },
    series: {
      label: '🔢 Sürüm', allLabel: 'Tüm sürümler',
      options: (list) => distinctOptions(list, updateMajor, (x, y) => y[0].localeCompare(x[0], 'tr', { numeric: true })),
      match: (a, v) => updateMajor(a) === v
    }
  };

  /* Sayfalama: 10'arlı · 1. sayfa en yeni; sayfa sayısı küçülürse son sayfaya çekilir */
  const ANN_PER_PAGE = 10;
  function annPage(list, key) {
    const pages = Math.max(1, Math.ceil(list.length / ANN_PER_PAGE));
    const page = Math.min(Math.max(1, state[key] || 1), pages);
    state[key] = page;
    return { items: list.slice((page - 1) * ANN_PER_PAGE, page * ANN_PER_PAGE), page, pages };
  }
  function annPagerHTML(key, page, pages, total, unit) {
    if (pages <= 1) return '';
    const btn = (p, label, disabled = false, active = false) => `
      <button type="button" data-ann-page="${key}:${p}" ${disabled ? 'disabled' : ''}
        class="min-w-[2rem] h-8 px-2.5 rounded-xl text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed
          ${active ? 'bg-brand-600 text-white shadow-soft' : 'bg-white text-slate-600 shadow-soft hover:text-brand-600'}">${label}</button>`;
    return `
      <div class="flex flex-wrap items-center justify-center gap-1.5 mt-5">
        ${btn(page - 1, '‹ Daha yeni', page <= 1)}
        ${Array.from({ length: pages }, (_, i) => btn(i + 1, i + 1, false, i + 1 === page)).join('')}
        ${btn(page + 1, 'Daha eski ›', page >= pages)}
      </div>
      <p class="text-center text-[10px] text-slate-400 mt-2">Sayfa ${page}/${pages} · toplam ${total} ${unit}</p>`;
  }

  function renderUpdatesTab() {
    // Standart filtre: solda tür (Yıl · Sürüm), sağda değeri · 10'arlı sayfa (1. sayfa en yeni)
    const all = sortedUpdates();
    const f = kindValueFilter('updFilter', UPDATE_FILTERS, all);
    $('#annBody').innerHTML = `${all.length ? f.html : ''}<div id="updList"></div>`;
    renderUpdateList(f.apply(all), f.active);
  }

  function renderUpdateList(filtered, filterActive) {
    if (!filtered.length) { $('#updList').innerHTML = emptyState(filterActive ? 'Filtreye uyan sürüm notu bulunamadı.' : 'Henüz sürüm notu yok.'); return; }
    const { items: list, page, pages } = annPage(filtered, 'updPage');

    const admin = isAdmin();
    const freshUpdate = newUpdateId();
    $('#updList').innerHTML = `
      <p class="text-[11px] text-slate-400 mb-3 px-1">${filtered.length} sürüm notu</p>
      <ol class="relative border-l-2 border-brand-100 ml-2 sm:ml-3 space-y-4">
        ${list.map((a, idx) => `
          <li class="relative pl-5 sm:pl-6">
            <span class="absolute -left-[9px] top-5 w-4 h-4 rounded-full bg-white border-2 ${idx === 0 ? 'border-brand-500' : 'border-brand-200'}"></span>
            <div data-open-ann="${a.id}" role="button" tabindex="0"
              class="bg-white rounded-2xl shadow-soft p-4 sm:p-5 cursor-pointer border border-transparent hover:border-brand-100 hover:shadow-soft-lg transition focus:outline-none focus:ring-2 focus:ring-brand-200">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-brand-700 px-2.5 py-1 rounded-lg">${escapeHTML(a.version)}</span>
                  ${a.id === freshUpdate ? newUpdateBadge
                    : a.id === sortedUpdates()[0]?.id ? '<span class="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Güncel</span>' : ''}
                  <span class="text-[11px] text-slate-400">🕘 ${updateWhen(a)}</span>
                </div>
                ${admin ? `
                  <div class="flex gap-1 shrink-0">
                    <button type="button" data-edit-update="${a.id}" title="Düzenle" class="${BTN_ICON} text-slate-400 hover:text-brand-600 hover:bg-brand-50">${icon('pencil', 'w-3.5 h-3.5')}</button>
                    <button type="button" data-delete-update="${a.id}" title="Sil" class="${BTN_ICON} text-slate-400 hover:text-rose-500 hover:bg-rose-50">${icon('trash', 'w-3.5 h-3.5')}</button>
                  </div>` : ''}
              </div>
              ${a.title ? `<p class="text-sm font-semibold text-slate-800 mt-2">${escapeHTML(a.title)}</p>` : ''}
              <ul class="mt-2 space-y-1">
                ${a.items.slice(0, 3).map((it) => `
                  <li class="flex items-start gap-2 text-xs text-slate-500">
                    <span class="mt-0.5 text-emerald-500 shrink-0">${icon('check', 'w-3.5 h-3.5')}</span><span>${escapeHTML(it)}</span>
                  </li>`).join('')}
              </ul>
              ${a.items.length > 3 ? `<p class="text-[11px] font-medium text-brand-600 mt-2">+${a.items.length - 3} yenilik daha</p>` : ''}
            </div>
          </li>`).join('')}
      </ol>${annPagerHTML('updPage', page, pages, filtered.length, 'sürüm notu')}`;
  }

  /* Geniş okuma modalı */
  function openAnnouncementModal(id) {
    const a = getAnn(id);
    if (!a) return;
    const author = getUser(a.authorId);

    if (a.type === 'news') {
      const book = a.bookId ? getBook(a.bookId) : null;
      let bookBox = '';
      if (book) {
        const now = new Date();
        const eff = getEffectiveDiscount(book, now);
        const price = round2(book.price * (1 - eff.rate / 100));
        const leftMs = newDiscountLeftMs(book, now);
        bookBox = `
          <div class="mt-6 flex gap-4 p-4 rounded-2xl bg-gradient-to-br from-brand-50 to-white border border-brand-100">
            ${coverHTML(book, 'md')}
            <div class="min-w-0 flex-1">
              <p class="text-[10px] font-semibold uppercase tracking-wider text-brand-500">${escapeHTML(seriesLabel(book))}</p>
              <p class="text-sm font-bold text-slate-800">${escapeHTML(book.title)}</p>
              <p class="text-xs text-slate-400">${escapeHTML(authorName(book))}</p>
              <div class="flex items-center gap-2 mt-2 flex-wrap">
                ${eff.rate ? `<span class="text-[11px] text-slate-400 line-through">${formatMoney(book.price)}</span>` : ''}
                <span class="text-sm font-bold ${eff.rate ? 'text-emerald-600' : 'text-slate-800'}">${formatMoney(price)}</span>
                ${eff.rate ? `<span class="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">%${eff.rate} ${discountSourceLabel(eff.source)}</span>` : ''}
              </div>
              ${eff.source === 'new' && leftMs > 0 ? `<p class="text-[11px] text-slate-400 mt-1">Yeni kitap indirimi için ${formatRemaining(leftMs)}</p>` : ''}
              <button type="button" data-open-book="${book.id}" class="mt-2.5 ${BTN_SOFT} !py-1.5">Kitabı İncele ${icon('arrow', 'w-3.5 h-3.5')}</button>
            </div>
          </div>`;
      }

      openModal(`
        <div class="relative p-6 sm:p-8 bg-gradient-to-br from-brand-500 to-brand-700 text-white overflow-hidden">
          <span class="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10"></span>
          <span class="absolute right-16 -bottom-12 w-28 h-28 rounded-full bg-white/10"></span>
          <button type="button" data-modal-close aria-label="Kapat" class="absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 flex items-center justify-center transition">${icon('close', 'w-5 h-5 pointer-events-none')}</button>
          <span class="relative inline-block text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white/20">${escapeHTML(newsCategoryOf(a))}</span>
          <h3 class="relative text-lg sm:text-xl font-bold mt-3 pr-8 leading-snug">${escapeHTML(a.title)}</h3>
          <div class="relative flex items-center gap-2 mt-3 text-[11px] text-brand-100">
            ${author ? avatarHTML(author, 'w-5 h-5 text-[9px] ring-2 ring-white/40') + `<span class="text-white font-medium">${escapeHTML(author.name)}</span> ·` : ''}
            <span>${formatLongDate(a.createdAt)}, ${formatTime(a.createdAt)}</span>
          </div>
        </div>
        <div class="p-6 sm:p-8">
          <div class="space-y-3 text-sm text-slate-600 leading-relaxed">
            ${a.body.split('\n').filter(Boolean).map((p) => `<p>${escapeHTML(p)}</p>`).join('')}
          </div>
          ${bookBox}
          <div class="mt-6 flex flex-wrap justify-end gap-2">
            ${isAdmin() ? `
              <button type="button" data-delete-news="${a.id}" class="${BTN_SOFT} !text-rose-500 !border-rose-100 hover:!border-rose-300">${icon('trash', 'w-3.5 h-3.5')}Sil</button>
              <button type="button" data-edit-news="${a.id}" class="${BTN_SOFT}">${icon('pencil', 'w-3.5 h-3.5')}Düzenle</button>` : ''}
            <button type="button" data-modal-close class="${BTN_SOFT}">Kapat</button>
          </div>
        </div>`, 'lg');
      return;
    }

    // Güncelleme (sürüm notu)
    openModal(`
      <div class="relative p-6 sm:p-8 bg-gradient-to-br from-brand-500 to-brand-700 text-white overflow-hidden">
        <span class="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10"></span>
        <button type="button" data-modal-close aria-label="Kapat" class="absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 flex items-center justify-center transition">${icon('close', 'w-5 h-5 pointer-events-none')}</button>
        <p class="relative text-[11px] text-brand-100 font-medium">Sürüm Notu</p>
        <p class="relative text-3xl sm:text-4xl font-black tracking-tight mt-1">${escapeHTML(a.version)}</p>
        ${a.title ? `<p class="relative text-sm font-semibold mt-2 pr-8">${escapeHTML(a.title)}</p>` : ''}
        <div class="relative flex flex-wrap gap-2 mt-4">
          ${a.id === newUpdateId() ? newUpdateBadge.replace('text-[9px]', 'text-[10px] !py-1 !px-2') : ''}
          <span class="text-[11px] px-2.5 py-1 rounded-full bg-white/20">📅 ${updateWhen(a)}</span>
          <span class="text-[11px] px-2.5 py-1 rounded-full bg-white/20">Yayın yılı: ${a.year}</span>
        </div>
      </div>
      <div class="p-6 sm:p-8">
        <p class="text-xs font-semibold text-slate-500 mb-3">Yenilikler (${a.items.length})</p>
        <ol class="space-y-2.5">
          ${a.items.map((it, i) => `
            <li class="flex items-start gap-3 p-3 rounded-xl bg-slate-50/70">
              <span class="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 text-[11px] font-bold flex items-center justify-center shrink-0">${i + 1}</span>
              <span class="text-sm text-slate-600 leading-relaxed">${escapeHTML(it)}</span>
            </li>`).join('')}
        </ol>
        <div class="mt-6 flex flex-wrap justify-end gap-2">
          ${isAdmin() ? `
            <button type="button" data-delete-update="${a.id}" class="${BTN_SOFT} !text-rose-500 !border-rose-100 hover:!border-rose-300">${icon('trash', 'w-3.5 h-3.5')}Sil</button>
            <button type="button" data-edit-update="${a.id}" class="${BTN_SOFT}">${icon('pencil', 'w-3.5 h-3.5')}Düzenle</button>` : ''}
          <button type="button" data-modal-close class="${BTN_PRIMARY}">Kapat</button>
        </div>
      </div>`, 'lg');
  }

