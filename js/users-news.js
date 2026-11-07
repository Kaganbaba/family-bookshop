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

  /* ==========================================================
     10.1) KULLANICI İSTATİSTİK PENCERESİ
     Tek pencere, üç sekme: Özet · Kiralamalar · Kupon & Çekler.
     Sekme / filtre / sayfa değişince pencere yeniden açılmaz, yalnızca #statsBody çizilir.
     Yalnızca okuma yapar (veritabanına yazmaz) · kayıt silme ve sıfırlama Admin'e özel.
     ========================================================== */
  const STATS_PAGE_SIZE = 10;
  const STATS_TABS = [
    { key: 'summary', label: 'Özet',           emoji: '📊' },
    { key: 'rentals', label: 'Kiralamalar',    emoji: '📚' },
    { key: 'coupons', label: 'Kupon & Çekler', emoji: '🎟️' }
  ];
  /* Tasarruf çubuğunun parçaları (userStats().savings anahtarları) · Kış yalnızca eski kayıtlarda, varsa görünür */
  const SAVING_PARTS = [
    { key: 'deal',   label: 'Günün İndirimi', color: 'bg-rose-500' },
    { key: 'new',    label: 'Yeni Kitap',     color: 'bg-amber-500' },
    { key: 'custom', label: 'Fırsat',         color: 'bg-indigo-500' },
    { key: 'offer',  label: 'Paket',          color: 'bg-violet-500' },
    { key: 'coupon', label: 'Kupon',          color: 'bg-emerald-500' },
    { key: 'winter', label: 'Kış Fırsatı',    color: 'bg-sky-500' }
  ];
  const VOUCHER_GROUPS = { active: 'Aktif', used: 'Kullanılan', expired: 'Süresi dolan' };

  const statsMonthLabel = (d) => new Date(d).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  const statsShortMonth = (d) => new Date(d).toLocaleDateString('tr-TR', { month: 'short' });
  const statsChip = (txt, tone) => `<span class="text-[10px] font-semibold px-1.5 py-px rounded-md ${tone} truncate max-w-full">${txt}</span>`;
  const statsMoreBtn = (tab) => `<button type="button" data-stats-tab="${tab}" class="text-[11px] font-semibold text-brand-600 hover:text-brand-700 shrink-0">Tümü →</button>`;
  const statsSection = (title, right, body) => `
    <section>
      <div class="flex items-center justify-between gap-2 mb-2.5">
        <h4 class="text-xs font-bold text-slate-700">${title}</h4>${right || ''}
      </div>
      ${body}
    </section>`;
  const statsMoneyHTML = (price, normal) => {
    const rate = normal > price ? Math.round((1 - price / normal) * 100) : 0;
    return `
      <span class="inline-flex items-baseline gap-1 whitespace-nowrap">
        ${rate ? `<span class="text-[11px] text-slate-400 line-through">${formatMoney(normal)}</span><span class="text-[10px] text-slate-300">→</span>` : ''}
        <span class="text-sm font-bold ${rate ? 'text-emerald-600' : 'text-brand-600'}">${price > 0 ? formatMoney(price) : 'Bedava'}</span>
        ${rate ? `<span class="text-[10px] font-extrabold text-rose-500">%${rate}</span>` : ''}
      </span>`;
  };

  /* Sayfalama · kind: 'rentals' | 'coupons' */
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

  /* --- Kiralamalar --- */
  const statsRentalsOf = (userId) => rentals.filter((r) => r.userId === userId)
    .sort((a, b) => new Date(b.rentedAt) - new Date(a.rentedAt));

  /* Kiralamalar → kayıtlar: tekli kiralama tek kayıt, aynı paket satın alımının kitapları tek kayıt */
  function statsRentalEntries(list) {
    const out = [];
    const pkgs = new Map();
    list.forEach((r) => {
      if (!r.offerId) return out.push({ kind: 'single', rs: [r], at: r.rentedAt });
      const key = r.purchaseId || `${r.offerId}|${r.rentedAt}`;
      let e = pkgs.get(key);
      if (!e) {
        e = { kind: 'package', rs: [], at: r.rentedAt, purchase: offerPurchases.find((p) => p.id === r.purchaseId) || null };
        pkgs.set(key, e);
        out.push(e);
      }
      e.rs.push(r);
    });
    return out;
  }

  const rentalStatusChip = (r, active) => active
    ? statsChip('Aktif', 'bg-emerald-50 text-emerald-600')
    : statsChip(endedLabel(r), 'bg-slate-100 text-slate-500');

  /* Kalan süre çubuğu (ana sayfadakiyle aynı · tick() her saniye günceller) */
  const statsBarHTML = (r) => `
    <div class="mt-2 flex items-center gap-2.5">
      <div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div data-rental-bar="${r.id}" class="h-full rounded-full transition-all duration-700 ease-out" style="width:0%"></div>
      </div>
      <span data-rental-left="${r.id}" class="text-[10px] font-semibold shrink-0 tabular-nums"></span>
    </div>`;

  function statsRentalRowHTML(r, nowMs) {
    const b = getBook(r.bookId);
    const active = isActiveRental(r, nowMs);
    const tag = rentalDiscountTag(r);
    return `
      <li class="p-2.5 rounded-xl ${active ? 'bg-emerald-50/30 border border-emerald-100' : 'bg-slate-50/80'}">
        <div class="flex items-center gap-3">
          ${coverHTML(b, 'xs')}
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-slate-700 truncate">${b ? escapeHTML(b.title) : 'Silinmiş kitap'}</p>
            <p class="flex items-center gap-1.5 mt-0.5 flex-wrap">${rentalStatusChip(r, active)}${tag ? statsChip(escapeHTML(tag.label), tag.tone) : ''}</p>
            <p class="text-[10px] text-slate-400 mt-0.5">Kiraladı: ${formatDate(r.rentedAt, true)} · Bitiş: ${formatDate(r.dueAt, true)}</p>
          </div>
          <div class="text-right shrink-0">${rentalPriceHTML(r, false)}</div>
          ${statsDeleteBtn('data-stats-del-rental', r.id)}
        </div>
        ${active ? statsBarHTML(r) : ''}
      </li>`;
  }

  /* Paket: kitapların kapakları yan yana tek kartta · silme paketin tamamını siler (deleteStatsRecord) */
  function statsPackageCardHTML(e, nowMs) {
    const first = e.rs[0];
    const activeR = e.rs.find((r) => isActiveRental(r, nowMs));
    const p = e.purchase;
    const title = p?.offerTitle || offers.find((o) => o.id === first.offerId)?.title || 'Özel teklif';
    const price = p ? p.price : sum(e.rs, (r) => r.price);
    const normal = p ? p.normalTotal : sum(e.rs, (r) => r.listPrice ?? r.price);
    const due = e.rs.reduce((m, r) => (new Date(r.dueAt) > new Date(m) ? r.dueAt : m), first.dueAt);
    return `
      <li class="p-3 rounded-xl ${activeR ? 'bg-violet-50/40 border border-violet-100' : 'bg-slate-50/80'}">
        <div class="flex items-start gap-2">
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-slate-700 truncate">🎁 ${escapeHTML(title)}</p>
            <p class="flex items-center gap-1.5 mt-0.5 flex-wrap">${rentalStatusChip(activeR || first, !!activeR)}${statsChip(`Paket · ${e.rs.length} kitap`, 'bg-violet-50 text-violet-600')}</p>
          </div>
          <div class="text-right shrink-0">${statsMoneyHTML(price, normal)}</div>
          ${statsDeleteBtn('data-stats-del-rental', first.id)}
        </div>
        <div class="flex flex-wrap gap-1.5 mt-2.5">${e.rs.map((r) => {
          const b = getBook(r.bookId);
          return `<span title="${escapeHTML(b?.title || 'Silinmiş kitap')}">${coverHTML(b, 'sm')}</span>`;
        }).join('')}</div>
        <p class="text-[10px] text-slate-400 mt-2">Kiraladı: ${formatDate(first.rentedAt, true)} · Bitiş: ${formatDate(due, true)}</p>
        ${activeR ? statsBarHTML(activeR) : ''}
      </li>`;
  }

  function statsRentalsTabHTML(userId) {
    const nowMs = Date.now();
    const all = statsRentalsOf(userId);
    if (!all.length) return emptyState('Henüz kiralama yok.', '!py-8');
    const nActive = all.filter((r) => isActiveRental(r, nowMs)).length;
    const counts = { all: all.length, active: nActive, ended: all.length - nActive };
    const f = counts[state.statsFilter] != null ? state.statsFilter : 'all';
    const filters = [['all', 'Tümü'], ['active', 'Aktif'], ['ended', 'Biten']].map(([k, l]) => `
      <button type="button" data-stats-filter="${k}"
        class="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-lg text-[11px] font-semibold transition ${f === k ? 'bg-white text-brand-700 shadow-soft' : 'text-slate-500 hover:text-brand-600'}">
        ${l} <span class="${f === k ? 'text-brand-500' : 'text-slate-400'} tabular-nums">${counts[k]}</span>
      </button>`).join('');
    const head = `<div class="flex gap-1 p-1 rounded-xl bg-slate-100 mb-3">${filters}</div>`;

    const entries = statsRentalEntries(all)
      .filter((e) => f === 'all' || e.rs.some((r) => isActiveRental(r, nowMs)) === (f === 'active'));
    if (!entries.length) return head + emptyState(f === 'active' ? 'Şu an aktif kiralama yok.' : 'Biten kiralama yok.', '!py-8');

    const { items, page, pages } = pageSlice(entries, 'rentals');
    let lastMonth = '';
    const rows = items.map((e) => {
      const m = statsMonthLabel(e.at);
      const monthHead = m !== lastMonth ? `
        <li class="flex items-center gap-2 ${lastMonth ? 'pt-2' : ''}">
          <span class="text-[11px] font-bold text-slate-500">${m}</span><span class="flex-1 h-px bg-slate-100"></span>
        </li>` : '';
      lastMonth = m;
      return monthHead + (e.kind === 'package' ? statsPackageCardHTML(e, nowMs) : statsRentalRowHTML(e.rs[0], nowMs));
    }).join('');
    return `${head}<ul class="space-y-2">${rows}</ul>${pagerHTML('rentals', page, pages, entries.length)}`;
  }

  /* --- Kupon & Çekler · kuponlar + hediye çekleri tek listede (aktif → kullanılan → süresi dolan) ---
     Puanla açılmayı bekleyen çek de aktif sayılır (kilit notuyla). */
  function statsVouchersOf(userId, now = Date.now()) {
    const ms = (d) => new Date(d).getTime() || 0;
    const cs = coupons.filter((c) => c.userId === userId)
      .map((c) => ({ kind: 'coupon', x: c, st: couponState(c, now) }));
    const qs = chequesOf(userId).map((c) => {
      const s = chequeState(c, now);
      return { kind: 'cheque', x: c, st: s === 'locked' ? 'active' : s, locked: s === 'locked' };
    });
    const order = { active: 0, used: 1, expired: 2 };
    const key = (v) => (v.st === 'active' ? v.x.expiresMs : v.st === 'used' ? -ms(v.x.usedAt) : -v.x.expiresMs);
    return [...cs, ...qs].sort((a, b) => order[a.st] - order[b.st] || key(a) - key(b));
  }
  const voucherBadge = (v) => (v.kind === 'coupon' ? couponBadge(v.x) : formatMoney(v.x.amount));
  const voucherTitle = (v) => (v.kind === 'coupon' ? couponTitle(v.x) : `${formatMoney(v.x.amount)} Hediye Çeki${v.x.name ? ` · ${v.x.name}` : ''}`);
  const voucherTone = (v) => (v.kind === 'coupon' ? `bg-gradient-to-br ${COUPON_TONES[couponTypeOf(v.x)]}` : 'cheque-card');
  const voucherSmall = (v) => v.kind === 'coupon' && couponTypeOf(v.x) === 'bogo';
  const voucherEnd = (v) => formatDate(new Date(v.x.expiresMs).toISOString(), true);
  const voucherLeft = (v, now) => (v.locked ? `🔒 ⭐ ${formatPoints(v.x.cost)} ile açılır` : `⏳ ${formatRemaining(v.x.expiresMs - now)}`);
  const voucherBooks = (v) => (v.kind === 'coupon'
    ? (v.x.bookIds || (v.x.bookId ? [v.x.bookId] : []))
    : [getRental(v.x.rentalId)?.bookId]).filter(Boolean).map(getBook).filter(Boolean);

  /* Aktif: Hediyelerim'deki gibi renkli bilet · kullanılan: soluk, kitap kapağıyla · süresi dolan: gri */
  function statsVoucherHTML(v, now) {
    if (v.st === 'active') return `
      <li class="flex rounded-2xl overflow-hidden bg-white shadow-soft border border-slate-100">
        <div class="relative w-24 sm:w-28 shrink-0 ${voucherTone(v)} text-white flex flex-col items-center justify-center text-center px-2 py-3 border-r-2 border-dashed border-white/70">
          <span class="absolute inset-0 offer-pattern opacity-50"></span>
          <span class="relative ${voucherSmall(v) ? 'text-sm' : 'text-xl'} font-black leading-tight">${escapeHTML(voucherBadge(v))}</span>
          <span class="relative text-[8px] font-bold tracking-widest mt-1">${v.kind === 'coupon' ? 'KUPON' : 'HEDİYE ÇEKİ'}</span>
        </div>
        <div class="flex-1 min-w-0 px-3 py-2.5">
          <p class="text-xs font-semibold text-slate-700 leading-snug">${escapeHTML(voucherTitle(v))}</p>
          <p class="text-[11px] font-bold ${v.locked ? 'text-amber-600' : 'text-rose-500'} tabular-nums mt-1">${voucherLeft(v, now)}</p>
          <p class="text-[10px] text-slate-400">${v.locked ? `⏳ ${formatRemaining(v.x.expiresMs - now)} · ` : ''}son ${voucherEnd(v)}</p>
        </div>
      </li>`;
    const used = v.st === 'used';
    const books = used ? voucherBooks(v) : [];
    return `
      <li class="flex items-center gap-3 p-2.5 rounded-xl ${used ? 'bg-slate-50/80 opacity-60' : 'bg-slate-50 opacity-70 grayscale'}">
        <span class="w-14 shrink-0 rounded-lg ${used ? voucherTone(v) : 'bg-slate-300'} text-white text-center py-1.5 px-1">
          <span class="block ${voucherSmall(v) ? 'text-[8px]' : 'text-[11px]'} font-black leading-tight">${escapeHTML(voucherBadge(v))}</span>
          <span class="block text-[7px] font-bold tracking-widest mt-0.5">${v.kind === 'coupon' ? 'KUPON' : 'ÇEK'}</span>
        </span>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-semibold text-slate-600 truncate">${escapeHTML(voucherTitle(v))}</p>
          <p class="text-[10px] text-slate-400 leading-snug">${used
            ? `✓ ${books.length ? books.map((b) => `"${escapeHTML(b.title)}"`).join(', ') : 'Kitap'} için kullanıldı · ${formatDate(v.x.usedAt, true)}`
            : `Süresi doldu · ${voucherEnd(v)}`}</p>
        </div>
        ${books.length ? `<div class="flex -space-x-3 shrink-0">${books.slice(0, 3).map((b) => coverHTML(b, 'xs')).join('')}</div>` : ''}
      </li>`;
  }

  function statsCouponsTabHTML(userId) {
    const now = Date.now();
    const list = statsVouchersOf(userId, now);
    if (!list.length) {
      return userId === state.currentUserId ? `
        <div class="text-center py-10 px-4 rounded-2xl border border-dashed border-amber-200 bg-amber-50/40">
          <div class="text-4xl">🎟️</div>
          <p class="text-xs font-semibold text-slate-600 mt-3">Puanınla Hediyelerim'den kupon alabilirsin</p>
          <a href="#gifts" data-modal-close class="${BTN_PRIMARY} mt-4 !px-5">🎁 Hediyelerim'e git</a>
        </div>` : emptyState('Henüz kupon ya da hediye çeki yok.', '!py-8');
    }
    const counts = { active: 0, used: 0, expired: 0 };
    list.forEach((v) => { counts[v.st]++; });
    const { items, page, pages } = pageSlice(list, 'coupons');
    // Sayfadaki kayıtlar grup grup (bir grup iki sayfaya bölünebilir · başlıkta grubun toplamı)
    const chunks = [];
    items.forEach((v) => {
      const last = chunks[chunks.length - 1];
      if (last && last.st === v.st) last.list.push(v); else chunks.push({ st: v.st, list: [v] });
    });
    const body = chunks.map((g) => `
      <div>
        <p class="flex items-center gap-2 mb-2">
          <span class="text-[11px] font-bold text-slate-500">${VOUCHER_GROUPS[g.st]}</span>
          <span class="text-[10px] font-semibold px-1.5 py-px rounded-full bg-slate-100 text-slate-500">${counts[g.st]}</span>
          <span class="flex-1 h-px bg-slate-100"></span>
        </p>
        <ul class="${g.st === 'active' ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5' : 'space-y-2'}">${g.list.map((v) => statsVoucherHTML(v, now)).join('')}</ul>
      </div>`).join('');
    return `<div class="space-y-4">${body}</div>${pagerHTML('coupons', page, pages, list.length)}`;
  }

  /* Admin'e özel kayıt silme butonu (istatistik modalı) */
  const statsDeleteBtn = (attr, id) => isAdmin()
    ? `<button type="button" ${attr}="${id}" title="Kaydı sil" aria-label="Kaydı sil" class="${BTN_ICON} shrink-0 text-slate-300 hover:text-rose-500 hover:bg-rose-50">${icon('trash', 'w-3.5 h-3.5')}</button>`
    : '';

  /* İstatistik kaydı sil (Admin) · onaydan sonra aynı kullanıcının istatistiklerine, aynı sekme ve sayfaya dönülür */
  function deleteStatsRecord(kind, id) {
    if (!requireAdmin()) return;
    const userId = state.statsUserId;
    const keep = { tab: state.statsTab, filter: state.statsFilter, pages: { ...state.statsPage } };
    const back = () => { if (userId) openUserStatsModal(userId, keep); };
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

  /* --- Özet sekmesi --- */
  function statsSummaryHTML(userId) {
    const u = getUser(userId);
    const self = userId === state.currentUserId;
    const now = Date.now();
    const rs = statsRentalsOf(userId);

    // Aktif kupon & çek önizlemesi (aktif yoksa bölüm yok)
    const activeV = statsVouchersOf(userId, now).filter((v) => v.st === 'active');
    const vouchersHTML = activeV.length ? statsSection(`🎟️ Aktif Kupon & Çekler <span class="text-slate-400 font-medium">· ${activeV.length}</span>`, statsMoreBtn('coupons'), `
      <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2">${activeV.slice(0, 4).map((v) => `
        <li class="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-100 shadow-soft">
          <span class="w-14 h-10 shrink-0 rounded-lg ${voucherTone(v)} text-white flex items-center justify-center text-center px-1 ${voucherSmall(v) ? 'text-[9px]' : 'text-xs'} font-black leading-tight">${escapeHTML(voucherBadge(v))}</span>
          <div class="min-w-0">
            <p class="text-[11px] font-semibold text-slate-700 truncate">${escapeHTML(voucherTitle(v))}</p>
            <p class="text-[10px] font-semibold ${v.locked ? 'text-amber-600' : 'text-rose-500'} tabular-nums truncate">${voucherLeft(v, now)}</p>
          </div>
        </li>`).join('')}</ul>`) : '';

    // Boş durum: sıfırlarla dolu kartlar yerine
    if (!rs.length) return `
      <div class="space-y-5">
        <div class="text-center py-10 px-4 rounded-2xl border border-dashed border-brand-200 bg-brand-50/40">
          <div class="text-5xl">📚</div>
          <p class="text-sm font-bold text-slate-700 mt-3">${self ? 'Henüz kitap kiralamadın' : 'Henüz kitap kiralamadı'}</p>
          <p class="text-[11px] text-slate-400 mt-1">${self ? 'İlk kitabını kiralayınca istatistiklerin burada görünecek.' : 'Kitap kiraladığında istatistikleri burada görünecek.'}</p>
          ${self ? `<a href="#books" data-modal-close class="${BTN_PRIMARY} mt-4 !px-5">📖 Kitaplara göz at</a>` : ''}
        </div>
        ${vouchersHTML}
      </div>`;

    const s = userStats(userId);
    const rank = computeLeaderboard().findIndex((x) => x.user.id === userId);
    const tiles = [
      { label: 'Kiralanan Kitap', value: `${s.count}`,           tone: 'text-brand-700',   bg: 'bg-brand-50/70' },
      { label: 'Toplam Harcama',  value: formatMoney(s.spent),   tone: 'text-slate-800',   bg: 'bg-slate-50' },
      { label: 'Güncel Bakiye',   value: formatMoney(u.balance), tone: 'text-emerald-600', bg: 'bg-emerald-50/70' },
      // Harcaması olmayan sıralamaya girmez
      { label: 'Sıralama',        value: s.spent > 0 ? `#${rank + 1}${rank < 3 ? ` ${MEDALS[rank]}` : ''}` : '—', tone: 'text-amber-600', bg: 'bg-amber-50/70' }
    ].map((t) => `
      <div class="rounded-2xl ${t.bg} px-3 py-3">
        <p class="text-[10px] text-slate-400 font-medium">${t.label}</p>
        <p class="text-sm sm:text-base font-bold ${t.tone} truncate">${t.value}</p>
      </div>`).join('');

    // Tasarruf: toplam + kaynaklara göre renkli çubuk (tasarruf yoksa kart yok)
    const parts = SAVING_PARTS.map((p) => ({ ...p, v: round2(s.savings[p.key] || 0) })).filter((p) => p.v > 0);
    const saved = round2(sum(parts, (p) => p.v));
    const savingsHTML = saved > 0 ? `
      <div class="rounded-2xl p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
        <p class="text-[11px] font-semibold text-emerald-700">💸 İndirimlerle toplam tasarruf</p>
        <p class="text-3xl font-black text-emerald-600 mt-0.5 tabular-nums">${formatMoney(saved)}</p>
        <div class="flex gap-0.5 h-2.5 rounded-full overflow-hidden bg-white mt-3">${parts.map((p) =>
          `<span class="${p.color} h-full" style="width:${(p.v / saved) * 100}%" title="${p.label}: ${formatMoney(p.v)}"></span>`).join('')}</div>
        <ul class="flex flex-wrap gap-x-3.5 gap-y-1 mt-2.5">${parts.map((p) => `
          <li class="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span class="w-2 h-2 rounded-full ${p.color}"></span>${p.label} <b class="text-slate-700 tabular-nums">${formatMoney(p.v)}</b>
          </li>`).join('')}</ul>
      </div>` : '';

    // Son 6 ay: aylık kiralanan kitap sayısı
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(1);
      d.setMonth(d.getMonth() - (5 - i));
      return d;
    });
    const monthCounts = months.map((d) => rs.filter((r) => {
      const x = new Date(r.rentedAt);
      return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth();
    }).length);
    const maxCount = Math.max(1, ...monthCounts);
    const chartHTML = statsSection('📈 Son 6 ay', `<span class="text-[10px] text-slate-400">${monthCounts.reduce((a, b) => a + b, 0)} kitap</span>`, `
      <div class="rounded-2xl bg-slate-50 px-3 pt-3 pb-2">
        <div class="grid grid-cols-6 gap-2 h-28">${monthCounts.map((n) => `
          <div class="flex flex-col items-center justify-end gap-1">
            <span class="text-[10px] font-bold ${n ? 'text-brand-700' : 'text-slate-300'} tabular-nums">${n}</span>
            <div class="w-full max-w-[2.25rem] rounded-t-lg ${n ? 'bg-gradient-to-t from-brand-400 to-brand-600' : 'bg-slate-200'}" style="height:${n ? Math.max(6, Math.round((n / maxCount) * 80)) : 3}px"></div>
          </div>`).join('')}
        </div>
        <div class="grid grid-cols-6 gap-2 mt-1.5 pt-1.5 border-t border-slate-200">${months.map((d, i) =>
          `<span class="text-center text-[10px] ${i === 5 ? 'font-bold text-brand-600' : 'text-slate-400'}">${statsShortMonth(d)}</span>`).join('')}
        </div>
      </div>`);

    // Puan kartı (eski haliyle)
    const pointsHTML = `
      <div class="rounded-2xl p-4 bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[11px] font-semibold text-amber-700">${self ? 'Puanın' : 'Puanı'} ⭐</p>
            <p class="text-2xl font-black ${s.points.available < 0 ? 'text-rose-500' : 'text-amber-600'} mt-0.5">${formatPoints(s.points.available)}</p>
          </div>
          ${self ? `<a href="#gifts" class="${BTN_SOFT} !py-1.5 shrink-0">🎟️ Hediyelerim</a>` : ''}
        </div>
        <div class="flex flex-wrap gap-1.5 mt-2.5">
          <span class="text-[10px] font-semibold px-2 py-1 rounded-lg bg-white text-emerald-600">Kazanılan: ${formatPoints(s.points.earned)}</span>
          <span class="text-[10px] font-semibold px-2 py-1 rounded-lg bg-white text-rose-500">Kupona harcanan: ${formatPoints(s.points.spent)}</span>
        </div>
        <p class="text-[10px] text-amber-700/70 mt-2">İndirimlerden kazanılan her 1 ₺ = 1 puan · kuponlu kiralamalar puan kazandırmaz${s.points.available < 0 ? ' · puan eksiye düştü: yeni kazanç önce açığı kapatır' : ''}</p>
      </div>`;

    // Son 3 kiralama
    const recentHTML = statsSection('📚 Son kiralamalar', statsMoreBtn('rentals'), `
      <ul class="space-y-1.5">${rs.slice(0, 3).map((r) => {
        const b = getBook(r.bookId);
        const active = isActiveRental(r, now);
        return `
          <li class="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50/80">
            ${coverHTML(b, 'xs')}
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-slate-700 truncate">${b ? escapeHTML(b.title) : 'Silinmiş kitap'}</p>
              <p class="text-[10px] text-slate-400">${formatDate(r.rentedAt, true)}</p>
            </div>
            ${active ? statsChip('Aktif', 'bg-emerald-50 text-emerald-600') : ''}
            <span class="text-xs font-bold ${(r.listPrice ?? r.price) > r.price ? 'text-emerald-600' : 'text-brand-600'} shrink-0 tabular-nums">${r.price > 0 ? formatMoney(r.price) : 'Bedava'}</span>
          </li>`;
      }).join('')}</ul>`);

    const first = rs[rs.length - 1];
    return `
      <div class="space-y-5">
        <p class="text-[11px] text-slate-500 flex items-center gap-1.5">📅 İlk kiralama: <b class="text-slate-700">${formatLongDate(first.rentedAt)}</b></p>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">${tiles}</div>
        ${savingsHTML}
        ${chartHTML}
        ${pointsHTML}
        ${recentHTML}
        ${vouchersHTML}
      </div>`;
  }

  /* --- Pencere --- */
  function statsTabsHTML() {
    return STATS_TABS.map((t) => {
      const on = state.statsTab === t.key;
      return `
        <button type="button" data-stats-tab="${t.key}" aria-selected="${on}" role="tab"
          class="relative flex-1 sm:flex-none px-2 sm:px-4 py-3 text-[11px] sm:text-xs font-semibold whitespace-nowrap transition ${on ? 'text-brand-700' : 'text-slate-400 hover:text-slate-600'}">
          <span class="hidden sm:inline">${t.emoji} </span>${t.label}
          <span class="absolute left-2 right-2 bottom-0 h-0.5 rounded-full ${on ? 'bg-brand-600' : 'bg-transparent'}"></span>
        </button>`;
    }).join('');
  }

  /* Seçili sekmeyi çizer (pencere açık kalır) */
  function renderStatsBody() {
    const body = $('#statsBody');
    const userId = state.statsUserId;
    if (!body || !userId) return;
    $('#statsTabs').innerHTML = statsTabsHTML();
    const tab = state.statsTab;
    body.innerHTML = tab === 'rentals' ? statsRentalsTabHTML(userId)
      : tab === 'coupons' ? statsCouponsTabHTML(userId)
      : statsSummaryHTML(userId);
    if (tab === 'rentals') {
      const nowMs = Date.now();
      requestAnimationFrame(() => body.querySelectorAll('[data-rental-bar]').forEach((el) => applyProgress(el.dataset.rentalBar, nowMs, body)));
    }
  }

  /* Aşağı kaydırılmışsa sekmelerin başına dön */
  function scrollStatsTop() {
    const panel = $('#modalPanel');
    const top = $('#statsHead')?.offsetHeight || 0;
    if (panel && panel.scrollTop > top) panel.scrollTo({ top, behavior: 'smooth' });
  }

  function setStatsTab(tab) {
    if (!$('#statsBody') || !STATS_TABS.some((t) => t.key === tab)) return;
    state.statsTab = tab;
    renderStatsBody();
    scrollStatsTop();
  }

  function setStatsFilter(f) {
    if (!$('#statsBody')) return;
    state.statsFilter = f;
    state.statsPage.rentals = 1;
    renderStatsBody();
  }

  function goStatsPage(kind, page) {
    if (!$('#statsBody') || !['rentals', 'coupons'].includes(kind)) return;
    state.statsPage[kind] = Number(page) || 1;
    renderStatsBody();
    scrollStatsTop();
  }

  /* Detaylı Aile Üyesi İstatistikleri · keep: { tab, filter, pages } (silme sonrası aynı yere dönmek için) */
  function openUserStatsModal(userId, keep = null) {
    const u = getUser(userId);
    if (!u) return;
    if (!canViewStats(userId)) return toast('Yalnızca kendi istatistiklerini görüntüleyebilirsin.', 'error');

    state.statsUserId = userId;
    state.statsTab = STATS_TABS.some((t) => t.key === keep?.tab) ? keep.tab : 'summary';
    state.statsFilter = keep?.filter || 'all';
    state.statsPage = { rentals: 1, coupons: 1, ...(keep?.pages || {}) };

    openModal(`
      <div id="statsHead" class="relative p-5 sm:p-6 bg-gradient-to-br from-brand-500 to-brand-700 text-white overflow-hidden">
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

      <div id="statsTabs" role="tablist" class="sticky top-0 z-10 flex bg-white border-b border-slate-100 px-2 sm:px-4"></div>
      <div id="statsBody" class="p-4 sm:p-6"></div>

      <div class="px-4 sm:px-6 pb-5 sm:pb-6 flex flex-wrap items-center justify-between gap-2">
        ${isAdmin() ? `<button type="button" data-stats-reset="${u.id}" class="${BTN_SOFT} !text-rose-500 !border-rose-100 hover:!border-rose-300">${icon('trash', 'w-3.5 h-3.5')}İstatistikleri Sıfırla</button>` : '<span></span>'}
        <button type="button" data-modal-close class="${BTN_SOFT}">Kapat</button>
      </div>`, 'lg');
    renderStatsBody();
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

