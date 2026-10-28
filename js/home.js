  /* ==========================================================
     8) ANA SAYFA (DASHBOARD)
     ========================================================== */
  function renderDashboard() {
    const now = new Date();
    const u = currentUser();
    $('#page-dashboard [data-page-desc]').textContent = `Merhaba ${u.name.split(' ')[0]} 👋 Kitaplığın genel görünümü ve günün fırsatları.`;
    renderStats(now);
    renderShowcaseSettings();
    renderGiftBoxFab(now);
    renderWinter(now);
    renderNewBooks(now);
    renderVitrine(now);
    renderMuseumShowcase(now);
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
    const totalBalance = sum(users, (u) => u.balance);
    const deals = getDailyDeals(now);
    const maxRate = deals.ids.length ? Math.max(...deals.ids.map(getDiscountRate)) : 0;

    const cards = [
      { label: 'Toplam Kitap',   value: shown.length,              sub: typeSummary, icon: 'books',   tone: 'bg-brand-50 text-brand-600' },
      { label: 'Kirada',         value: active.length,             sub: `Sende ${myActive} · ${rentableNow} kitap kiralık`,                   icon: 'rentals', tone: 'bg-emerald-50 text-emerald-600' },
      { label: 'Toplam Bakiye',  value: formatMoney(totalBalance), sub: `Senin: ${formatMoney(currentUser().balance)}`,                                                 icon: 'wallet',  tone: 'bg-indigo-50 text-indigo-600' },
      // Günün İndirimi vitrini kapalıysa kart hiç gösterilmez
      showcaseLive('deals') && { label: 'Günün İndirimi', value: deals.ids.length ? `%${maxRate}` : '—', sub: deals.ids.length ? `${deals.ids.length} kitapta · en yüksek` : 'Bugün fırsat yok', icon: 'tag', tone: 'bg-rose-50 text-rose-500' }
    ].filter(Boolean);

    // Mobilde yazılar kesilmesin: ikon küçülür, alt satır 2 satıra kadar kayar
    $('#dashStats').classList.toggle('lg:grid-cols-4', cards.length === 4);
    $('#dashStats').classList.toggle('lg:grid-cols-3', cards.length === 3);
    $('#dashStats').innerHTML = cards.map((c) => `
      <div class="bg-white rounded-2xl shadow-soft p-3 sm:p-4 flex items-start justify-between gap-2 sm:gap-3 hover:shadow-soft-lg transition min-w-0">
        <div class="min-w-0">
          <p class="text-[11px] font-medium text-slate-400">${c.label}</p>
          <p class="text-base sm:text-xl font-bold text-slate-800 mt-1 truncate">${c.value}</p>
          <p class="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">${c.sub}</p>
        </div>
        <span class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${c.tone} flex items-center justify-center shrink-0">${icon(c.icon)}</span>
      </div>`).join('');
  }

  /* --- 8.1.3 Vitrin Ayarları (yalnızca Admin) · vitrinleri açar / kapatır ---
     Kapalı vitrin hiç yokmuş gibidir (bkz. showcaseOn). Günün İndirimi kapatılırken o anki grup saklanır;
     başka bir gün açılırsa o gruptan devam eder ve yine sonraki 10:00'a kadar sürer. */
  const SHOWCASES = [
    { key: 'vitrine',  icon: '🏷️', label: 'Fırsatlar',  desc: "Admin'in seçtiği kitap + yüzde indirimleri" },
    { key: 'deals',    icon: '🔥', label: 'Günün İndirimi',  desc: `Her gün ${String(DISCOUNT_SETTINGS.resetHour).padStart(2, '0')}:00'da değişen 3'lü seri indirimi` },
    { key: 'newBooks', icon: '★',  label: 'Yeni Kitap',      desc: `Yeni çıkan kitaplara ${NEW_BOOK_DISCOUNT.days} gün %${NEW_BOOK_DISCOUNT.rate} indirim` },
    { key: 'museum',   icon: '🏛️', label: 'Müze Vitrini',    desc: 'Müze\'deki kitaplar belirlenen süre ve fiyatla sergilenip kiralanır' },
    { key: 'winter',   icon: '❄️', label: 'Kış Fırsatları',  desc: 'Kış Sezonu temalı kitaplar · indirimsiz, %15, %25 ya da %50' }
  ];
  /* Kış sezonunda: Kış Fırsatları görünür, Günün İndirimi ve Fırsatlar listede yok · normal sezonda Kış Fırsatları yok */
  const shownShowcases = () => SHOWCASES.filter((s) => (winterOn() ? !WINTER_PAUSED.includes(s.key) : s.key !== 'winter'));

  /* Ana sayfada yalnızca küçük bir buton (kapalı vitrin sayısıyla) · ayarlar pencerede */
  function renderShowcaseSettings() {
    const box = $('#showcaseSettings');
    if (!isAdmin()) { box.innerHTML = ''; return; }
    const off = shownShowcases().filter((s) => !showcaseOn(s.key)).length;
    const live = giftBoxLive();
    box.innerHTML = `
      <div class="flex justify-end flex-wrap gap-2 mb-4">
        <button type="button" data-open-giftbox-settings
          class="flex items-center gap-2 pl-3 pr-3.5 py-2 rounded-full bg-white shadow-soft border border-slate-100 hover:border-brand-200 hover:shadow-soft-lg text-xs font-semibold text-slate-700 transition">
          <span class="w-6 h-6 rounded-full bg-gradient-to-br from-rose-400 to-amber-400 text-white flex items-center justify-center text-[11px]">🎁</span>
          Hediye Kutusu
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${live ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-100'}">${live ? `${giftDayAt()}/${GIFT_DAYS}. gün` : 'kapalı'}</span>
        </button>
        <button type="button" data-open-showcase
          class="flex items-center gap-2 pl-3 pr-3.5 py-2 rounded-full bg-white shadow-soft border border-slate-100 hover:border-brand-200 hover:shadow-soft-lg text-xs font-semibold text-slate-700 transition">
          <span class="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[11px]">⚙️</span>
          Vitrin Ayarları
          ${off ? `<span class="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">${off} kapalı</span>` : ''}
        </button>
      </div>`;
  }

  function openShowcaseModal() {
    if (!requireAdmin()) return;
    openModal(`
      ${modalHeader('Vitrin Ayarları ⚙️', 'Kapalı vitrin hiç yokmuş gibidir: kimse görmez, indirimi uygulanmaz.', 'tag', 'bg-slate-100 text-slate-700')}
      <div class="p-5 space-y-4">
        <div id="showcaseList" class="space-y-2"></div>
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
            <span class="absolute top-0.5 ${on ? 'left-[18px]' : 'left-0.5'} w-4 h-4 rounded-full bg-white shadow transition-all"></span>
          </span>
        </button>`;
    };
    box.innerHTML = shownShowcases().map(row).join('');
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

  /* --- 8.1.35 Hediye Kutusu · sağ altta hafifçe sallanan kutu + kutunun kapanmasına kalan süre ---
     7 gün · her gün 10:00'da yeni hediye · gelecek günler herkese "?" · kaçırılan günün hediyesi geri gelmez */
  const giftFabKey = (now = Date.now()) => `${giftBoxLive(now)}|${giftDayAt(now)}|${giftClaimable(now)}`;

  function renderGiftBoxFab(now = new Date()) {
    const box = $('#giftBoxFab');
    const ms = now.getTime();
    state.lastGiftKey = giftFabKey(ms);
    if (!giftBoxLive(ms)) { box.innerHTML = ''; return; }
    const ready = giftClaimable(ms);
    box.innerHTML = `
      <div class="fixed right-3 sm:right-6 bottom-6 sm:bottom-8 z-30 flex flex-col items-center gap-1">
        <button type="button" data-open-giftbox title="Hediye Kutusu" aria-label="Hediye Kutusu${ready ? ' · bugünün hediyesi hazır' : ''}"
          class="gift-fab ${ready ? 'is-ready' : ''} relative w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-2xl bg-gradient-to-br from-rose-400 via-pink-500 to-amber-400 shadow-soft-lg flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-rose-200">
          <span class="gift-bob text-4xl sm:text-[2.6rem] leading-none drop-shadow">🎁</span>
          ${ready ? '<span class="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-black ring-2 ring-white flex items-center justify-center animate-bounce">!</span>' : ''}
        </button>
        <span id="giftBoxTimer" class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/95 shadow-soft text-slate-700 tabular-nums whitespace-nowrap">⏳ ${formatRemaining(giftBoxTimes().end - ms)}</span>
      </div>`;
  }

  /* Her saniye: sayaç güncellenir · gün değiştiyse / hediye alındıysa kutu yeniden çizilir */
  function updateGiftBoxFab(now) {
    const ms = now.getTime();
    if (giftFabKey(ms) !== state.lastGiftKey) return renderGiftBoxFab(now);
    const timer = $('#giftBoxTimer');
    if (timer && giftBoxTimes()) timer.textContent = `⏳ ${formatRemaining(giftBoxTimes().end - ms)}`;
  }

  /* Hediye Kutusu penceresi: 7 gün · alınan ✓, bugün açık, kaçırılan soluk, gelecek "?" */
  function openGiftBoxModal() {
    const now = Date.now();
    if (!giftBoxLive(now)) return toast('Hediye kutusu şu an kapalı.', 'info');
    const today = giftDayAt(now);
    const rewards = giftRewards();
    const t = giftBoxTimes();
    const tile = (r, i) => {
      const day = i + 1;
      const claim = giftClaimOf(day);
      const base = 'relative rounded-2xl p-2.5 text-center flex flex-col items-center justify-center min-h-[6.5rem] border transition';
      const head = `<span class="text-[10px] font-bold ${day === today ? 'text-rose-600' : 'text-slate-400'}">${day}. gün${day === today ? ' · Bugün' : ''}</span>`;
      if (claim) return `
        <div class="${base} bg-emerald-50 border-emerald-200">
          ${head}
          <span class="text-2xl mt-1">${GIFT_REWARD_TYPES[claim.reward.type]?.icon || '🎁'}</span>
          <span class="text-[10px] font-semibold text-emerald-700 leading-tight mt-1">${escapeHTML(giftRewardLabel(claim.reward))}</span>
          <span class="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center">✓</span>
        </div>`;
      if (day > today) return `
        <div class="${base} bg-gradient-to-br from-slate-100 to-slate-50 border-slate-200">
          ${head}
          <span class="text-3xl font-black text-slate-300 mt-1">?</span>
          <span class="text-[9px] text-slate-400 mt-1">${formatDate(new Date(giftDayStart(day)).toISOString(), true)}</span>
        </div>`;
      if (day < today) return `
        <div class="${base} bg-slate-50 border-slate-100 opacity-60">
          ${head}
          <span class="text-2xl mt-1 grayscale">${GIFT_REWARD_TYPES[r.type]?.icon || '—'}</span>
          <span class="text-[10px] text-slate-500 leading-tight mt-1">${r.type === 'none' ? 'Ödül yoktu' : 'Kaçırıldı'}</span>
        </div>`;
      return `
        <div class="${base} bg-gradient-to-br from-rose-50 via-amber-50 to-white border-rose-300 ring-2 ring-rose-200 gift-today">
          ${head}
          <span class="gift-bob text-3xl mt-1">${GIFT_REWARD_TYPES[r.type]?.icon || '🎁'}</span>
          <span class="text-[10px] font-bold text-rose-700 leading-tight mt-1">${escapeHTML(giftRewardLabel(r))}</span>
        </div>`;
    };
    const claimedToday = !!giftClaimOf(today);
    const next = today < GIFT_DAYS ? giftDayStart(today + 1) : null;
    const todayReward = rewards[today - 1];
    openModal(`
      <div class="relative p-5 sm:p-6 bg-gradient-to-br from-rose-50 via-amber-50 to-white">
        <button type="button" data-modal-close aria-label="Kapat" class="absolute top-3 right-3 w-9 h-9 rounded-full bg-white shadow-soft text-slate-400 hover:text-slate-600 flex items-center justify-center transition">${icon('close', 'w-4 h-4 pointer-events-none')}</button>
        <div class="flex items-center gap-3 pr-10">
          <span class="gift-bob text-4xl">🎁</span>
          <div>
            <h3 class="text-base font-extrabold text-slate-800">Hediye Kutusu</h3>
            <p class="text-[11px] text-slate-500">Her gün ${String(DISCOUNT_SETTINGS.resetHour).padStart(2, '0')}:00'da yeni hediye · kaçırılan günün hediyesi geri gelmez</p>
          </div>
        </div>
      </div>
      <div class="p-5 sm:p-6 pt-4 space-y-4">
        <div class="grid grid-cols-4 sm:grid-cols-7 gap-2">${rewards.map(tile).join('')}</div>
        ${todayReward.type === 'none'
          ? '<p class="text-[11px] text-slate-500 bg-slate-50 rounded-xl px-3 py-2.5 text-center">Bugün için hediye yok.</p>'
          : claimedToday
            ? `<p class="text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2.5 text-center">✓ Bugünün hediyesini aldın${next ? ` · sıradaki hediye ${formatRemaining(next - now)} sonra` : ''}</p>`
            : `<button type="button" data-claim-gift class="w-full py-3 rounded-xl text-sm font-extrabold text-white bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 hover:shadow-soft-lg transition">🎁 Bugünün Hediyesini Al · ${escapeHTML(giftRewardLabel(todayReward))}</button>`}
        <p class="text-[10px] text-slate-400 text-center">⏳ Kutu ${formatRemaining(t.end - now)} sonra kapanır · ${formatDate(new Date(t.end).toISOString(), true)}</p>
        ${isAdmin() ? `<button type="button" data-open-giftbox-settings class="${BTN_SOFT} w-full !py-2.5">⚙️ Hediye Kutusu Ayarları</button>` : ''}
      </div>`);
  }

  async function claimGiftFromModal() {
    const ok = await claimGift();
    if (ok && state.modalOpen) openGiftBoxModal();
  }

  /* --- Admin: Hediye Kutusu Ayarları · açık / kapalı, kış sezonunda kendiliğinden başlama, 7 günün ödülleri --- */
  function openGiftBoxSettings() {
    if (!requireAdmin()) return;
    const g = giftBoxDoc();
    const live = giftBoxLive();
    const t = giftBoxTimes();
    const rewards = giftRewards();
    const row = (r, i) => `
      <div class="p-3 rounded-2xl border border-slate-100 bg-white space-y-2" data-gift-row="${i}">
        <div class="flex items-center gap-2">
          <span class="text-[11px] font-bold text-slate-700 w-12 shrink-0">${i + 1}. gün</span>
          <select name="type_${i}" data-gift-type="${i}" class="${INPUT_CLS} !py-1.5 flex-1 min-w-0">
            ${Object.entries(GIFT_REWARD_TYPES).map(([k, x]) => `<option value="${k}" ${r.type === k ? 'selected' : ''}>${x.icon} ${x.label}</option>`).join('')}
          </select>
        </div>
        <div class="grid grid-cols-2 gap-2" data-gift-fields>
          <label data-gift-show="balance cheque"><span class="block text-[10px] text-slate-500 mb-0.5">Tutar (₺)</span>
            <input name="amount_${i}" type="number" min="0.01" max="10000" step="0.01" value="${r.amount ?? ''}" class="${INPUT_CLS} !py-1.5" /></label>
          <label data-gift-show="coupon"><span class="block text-[10px] text-slate-500 mb-0.5">Kupon türü</span>
            <select name="ctype_${i}" class="${INPUT_CLS} !py-1.5">${Object.entries(COUPON_TYPES).map(([k, x]) => `<option value="${k}" ${r.couponType === k ? 'selected' : ''}>${x.label}</option>`).join('')}</select></label>
          <label data-gift-show="coupon"><span class="block text-[10px] text-slate-500 mb-0.5">Değer (%, ₺ ya da kitap sayısı)</span>
            <input name="value_${i}" type="number" min="0.01" step="0.01" value="${r.value ?? ''}" class="${INPUT_CLS} !py-1.5" /></label>
          <label data-gift-show="coupon"><span class="block text-[10px] text-slate-500 mb-0.5">Bedava (yalnızca Al-Öde)</span>
            <input name="free_${i}" type="number" min="1" max="4" step="1" value="${r.free ?? 1}" class="${INPUT_CLS} !py-1.5" /></label>
          <label data-gift-show="cheque coupon" class="col-span-2"><span class="block text-[10px] text-slate-500 mb-0.5">Adı (isteğe bağlı)</span>
            <input name="name_${i}" maxlength="40" value="${escapeHTML(r.name || '')}" class="${INPUT_CLS} !py-1.5" placeholder="Örn. Kış Kuponu ❄️" /></label>
        </div>
      </div>`;
    openModal(`
      ${modalHeader('Hediye Kutusu Ayarları 🎁', `${GIFT_DAYS} günlük ödül havuzu · her gün ${String(DISCOUNT_SETTINGS.resetHour).padStart(2, '0')}:00'da yeni hediye.`, 'gifts', 'bg-rose-50 text-rose-600')}
      <form data-form="saveGiftBox" class="p-5 space-y-3.5" autocomplete="off">
        <p class="text-[11px] rounded-xl px-3 py-2 ${live ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-50'}">${live
          ? `🎁 Kutu açık · ${giftDayAt()}/${GIFT_DAYS}. gün · ${formatRemaining(t.end - Date.now())} sonra kapanır`
          : t && Date.now() >= t.end ? `Son kutu ${formatDate(new Date(t.end).toISOString(), true)}'da kapandı.` : 'Kutu kapalı.'}</p>
        <label class="flex items-center gap-2 text-[11px] text-slate-600">
          <input type="checkbox" name="enabled" ${g.enabled === true ? 'checked' : ''} class="rounded border-slate-300 text-rose-600" /> Hediye Kutusu açık (kapatırsan herkesten hemen kalkar)
        </label>
        <label class="flex items-center gap-2 text-[11px] text-slate-600">
          <input type="checkbox" name="restart" ${live ? '' : 'checked'} class="rounded border-slate-300 text-rose-600" /> Kaydedince yeni ${GIFT_DAYS} gün şimdi başlasın${live ? ' (süren kutu sıfırlanır)' : ''}
        </label>
        <label class="flex items-center gap-2 text-[11px] text-sky-700">
          <input type="checkbox" name="autoWinter" ${g.autoWinter === false ? '' : 'checked'} class="rounded border-sky-300 text-sky-600" /> ❄️ Kış sezonu açılınca kendiliğinden başlasın
        </label>
        <div class="space-y-2">${rewards.map(row).join('')}</div>
        <p class="text-[10px] text-slate-400 leading-relaxed">Kutu kapatılıp açılınca ya da kış sezonu yeniden açılınca kutu yeni ${GIFT_DAYS} günle baştan başlar (herkes 1. günden); buradaki ödüller korunur. Bakiye hemen hesaba geçer · hediye çeki ${CHEQUE_DAYS} gün, kupon ${COUPON_DAYS} gün geçerlidir (Kiralık ve indirimsiz kitaplara). Kullanıcılar gelecek günlerin hediyesini "?" olarak görür.</p>
        ${formFooter('Kaydet')}
      </form>`);
    updateGiftRows();
  }

  /* Ödül türüne göre ilgili alanlar görünür */
  function updateGiftRows() {
    $$('[data-gift-row]').forEach((row) => {
      const type = row.querySelector('[data-gift-type]').value;
      row.querySelector('[data-gift-fields]').classList.toggle('hidden', type === 'none');
      row.querySelectorAll('[data-gift-show]').forEach((el) => el.classList.toggle('hidden', !el.dataset.giftShow.split(' ').includes(type)));
    });
  }

  function handleSaveGiftBox(fd) {
    if (!requireAdmin()) return;
    const rewards = [];
    for (let i = 0; i < GIFT_DAYS; i++) {
      const type = GIFT_REWARD_TYPES[fd[`type_${i}`]] ? fd[`type_${i}`] : 'none';
      const day = `${i + 1}. gün`;
      if (type === 'none') { rewards.push({ type }); continue; }
      if (type === 'balance' || type === 'cheque') {
        const amount = round2(parseFloat(fd[`amount_${i}`]));
        if (!(amount > 0 && amount <= 10000)) return toast(`${day}: geçerli bir tutar girin (₺0–10.000).`, 'error');
        rewards.push(type === 'balance' ? { type, amount } : { type, amount, name: (fd[`name_${i}`] || '').trim() });
        continue;
      }
      const couponType = COUPON_TYPES[fd[`ctype_${i}`]] ? fd[`ctype_${i}`] : 'percent';
      const t = COUPON_TYPES[couponType];
      const value = couponType === 'amount' ? round2(parseFloat(fd[`value_${i}`])) : parseInt(fd[`value_${i}`], 10);
      if (!(value >= t.min && value <= t.max)) return toast(`${day}: ${t.hint} ${t.min}–${t.max} arası olmalı.`, 'error');
      let free = null;
      if (couponType === 'bogo') {
        free = parseInt(fd[`free_${i}`], 10);
        if (!(free >= 1 && free < value)) return toast(`${day}: bedava kitap sayısı 1–${value - 1} arası olmalı.`, 'error');
      }
      rewards.push({ type, couponType, value, free, name: (fd[`name_${i}`] || '').trim() });
    }
    const enabled = fd.enabled === 'on';
    // Kapalıyken açılırsa kutu her zaman yeni 7 günle baştan başlar (ödül ayarları korunur)
    const restart = enabled && (giftBoxDoc().enabled !== true || fd.restart === 'on');
    if (restart && rewards.every((r) => r.type === 'none')) return toast('Kutuyu başlatmak için en az bir güne ödül koy.', 'error');
    const data = { enabled, rewards, autoWinter: fd.autoWinter === 'on', updatedAt: isoAt(Date.now()), updatedBy: state.currentUserId, ...(restart ? newGiftBoxData() : {}) };
    closeModal();
    run(col('settings').doc('giftBox').set(data, { merge: true }),
      restart ? `🎁 Hediye Kutusu başladı · ${GIFT_DAYS} gün` : enabled ? '🎁 Hediye Kutusu ayarları kaydedildi.' : '🎁 Hediye Kutusu kapatıldı.', enabled ? 'success' : 'info');
  }

  /* --- 8.1.4 Kış Fırsatları (yalnızca Kış sezonunda · buz mavisi, kar taneleri, karlı kartlar) ---
     Kış Sezonu temalı her kitap kendiliğinden burada · Admin indirimini seçer (indirimsiz / %15 / %25 / %50) ·
     bu sezon gelen kış kitabı sezon boyunca indirimsiz (indirimi değiştirilemez) */
  const winterList = () => visibleBooks()
    .filter((b) => hasWinterTheme(b) && !isDraftBook(b))
    .map((b) => ({ b, rate: winterRateOf(b), fresh: isWinterNewBook(b) }))
    .sort((x, y) => y.fresh - x.fresh || y.rate - x.rate || (x.b.seriesNo ?? 1e9) - (y.b.seriesNo ?? 1e9) || x.b.title.localeCompare(y.b.title, 'tr'));

  function renderWinter(now) {
    const admin = isAdmin();
    const box = $('#winterSection');
    const list = winterList();
    if (!winterShowcaseOn() || (!list.length && !admin)) { box.innerHTML = ''; return; }
    const themeLabel = escapeHTML(getTheme(WINTER_THEME_ID).label);

    const cards = list.map(({ b, rate, fresh }) => {
      const price = hasPrice(b) ? round2(b.price * (1 - rate / 100)) : 0;
      return `
        <div data-open-book="${b.id}" role="button" tabindex="0"
          class="winter-card group relative cursor-pointer rounded-2xl p-4 pt-5 text-left transition duration-300 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-sky-300">
          <span class="winter-card-flake absolute right-2 bottom-12 text-5xl pointer-events-none select-none" aria-hidden="true">❄</span>
          <span class="winter-drift absolute right-[5.5rem] top-3 text-sky-200 text-sm pointer-events-none select-none" aria-hidden="true">❅</span>
          ${fresh
            ? '<span class="absolute -top-2.5 right-3 z-[2] text-[10px] font-bold text-sky-700 bg-white px-2.5 py-1 rounded-full shadow-soft ring-1 ring-sky-200">❄️ Bu Kışın Kitabı</span>'
            : rate
              ? `<div class="winter-tag absolute -top-px right-4 w-[4.25rem] pt-2 pb-4 text-center z-[2]">
                  <p class="text-[8px] font-extrabold tracking-[.2em] text-sky-900/70">KIŞ</p>
                  <p class="text-xl font-black text-white leading-none mt-0.5 drop-shadow">%${rate}</p>
                  <span class="absolute left-1/2 -translate-x-1/2 bottom-1.5 text-[10px] text-white/90" aria-hidden="true">❄</span>
                </div>`
              : ''}
          ${admin && !fresh ? `
            <button type="button" data-edit-winter="${b.id}" title="İndirimi değiştir" aria-label="İndirimi değiştir"
              class="absolute top-2 left-2 z-[3] w-7 h-7 rounded-full bg-white/90 text-sky-600 hover:bg-sky-500 hover:text-white shadow-soft flex items-center justify-center transition">${icon('pencil', 'w-3.5 h-3.5 pointer-events-none')}</button>` : ''}
          <div class="relative z-[1] flex gap-3 ${admin && !fresh ? 'pt-5' : ''} ${rate && !fresh ? 'pr-16' : ''}">
            <div class="shrink-0 self-start rounded-xl ring-1 ring-sky-200 shadow-[0_10px_25px_-12px_rgba(14,165,233,.6)]">${coverHTML(b, 'md')}</div>
            <div class="flex-1 min-w-0">
              ${Number.isInteger(b.seriesNo) && getType(b.type)?.inDeals ? `<p class="text-[11px] font-bold text-sky-600">#${b.seriesNo}</p>` : `<p class="text-[10px] font-semibold uppercase tracking-wider text-sky-500 truncate">${escapeHTML(typeLabel(b.type))}</p>`}
              <p class="text-sm font-semibold text-slate-800 mt-0.5 line-clamp-2 leading-snug">${escapeHTML(b.title)}</p>
              ${statusChipHTML(b, now.getTime(), 'mt-1.5')}
            </div>
          </div>
          <div class="relative z-[1] flex items-end justify-between mt-4 pt-3 border-t border-dashed border-sky-200">
            ${rate ? '<p class="text-[10px] font-bold text-sky-700 leading-snug min-w-0">❄️ Kış Fırsatı · kış boyunca</p>' : '<span></span>'}
            <div class="text-right shrink-0">
              ${rate && hasPrice(b) ? `<p class="text-[11px] text-slate-400 line-through">${formatMoney(b.price)}</p>` : ''}
              <p class="text-xl font-black leading-none tracking-tight bg-gradient-to-r from-sky-500 to-blue-700 bg-clip-text text-transparent">${hasPrice(b) ? formatMoney(price) : 'Fiyat yakında'}</p>
            </div>
          </div>
        </div>`;
    }).join('');

    box.innerHTML = `
      <div class="winter-rim rounded-3xl p-[2px] shadow-soft-lg mb-6">
        <div class="winter-bg relative rounded-[22px] overflow-hidden p-4 sm:p-5">
          <div class="winter-flakes absolute inset-0 pointer-events-none"></div>
          <span class="winter-drift absolute right-6 top-3 text-3xl text-sky-200 pointer-events-none select-none" aria-hidden="true">❄</span>
          <span class="winter-drift winter-drift-d1 absolute right-24 top-10 text-lg text-sky-200 pointer-events-none select-none" aria-hidden="true">❅</span>
          <div class="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div class="flex items-center gap-3">
              <span class="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center text-lg shadow-soft shrink-0">❄️</span>
              <div>
                <h2 class="text-lg font-extrabold italic leading-tight bg-gradient-to-r from-sky-600 to-blue-800 bg-clip-text text-transparent" style="font-family:'Playfair Display',Georgia,serif">Kış Fırsatları</h2>
                <p class="text-[11px] text-sky-800/70">${themeLabel} kitapları · kış sezonu boyunca</p>
              </div>
            </div>
          </div>
          ${list.length
            ? `<div class="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">${cards}</div>`
            : `<p class="relative text-center text-xs text-sky-800/70 py-8 border border-dashed border-sky-300 rounded-2xl bg-white/50">Henüz "${themeLabel}" temalı kitap yok · kitaba temayı Düzenle'den eklediğinde burada kendiliğinden görünür.<br/><span class="text-[10px] text-sky-800/50">Bu boş alanı yalnızca Adminler görür.</span></p>`}
        </div>
      </div>`;
  }

  /* Admin: Kış Fırsatı indirimini seç · bu sezon gelen kış kitabı sezon boyunca indirimsiz kalır */
  function openWinterDealModal(bookId) {
    if (!requireAdmin()) return;
    if (!winterShowcaseOn()) return toast('Kış Fırsatları yalnızca Kış sezonunda ve Vitrin Ayarları\'nda açıkken kullanılır.', 'info');
    const fixed = getBook(bookId);
    if (!fixed || !hasWinterTheme(fixed)) return;
    if (isWinterNewBook(fixed)) return toast('Bu kışın kitabı · sezon boyunca indirimsiz kalır.', 'info');
    const sel = winterRateOf(fixed);
    openModal(`
      ${modalHeader('Kış Fırsatı İndirimi ❄️', 'Kış sezonu boyunca geçerli · sezon bitince indirim de biter.', 'tag', 'bg-sky-50 text-sky-600')}
      <form data-form="saveWinterDeal" data-edit-id="${fixed.id}" class="p-5 space-y-3.5" autocomplete="off">
        <div class="flex items-center gap-3 p-3 rounded-2xl bg-sky-50/60 border border-sky-100">${coverHTML(fixed, 'sm')}<div class="min-w-0"><p class="text-xs font-bold text-slate-800 truncate">${escapeHTML(fixed.title)}</p><p class="text-[11px] text-slate-400">${escapeHTML(seriesLabel(fixed))}${hasPrice(fixed) ? ` · ${formatMoney(fixed.price)}` : ''}</p></div></div>
        <div>
          <span class="block text-[11px] font-medium text-slate-500 mb-1.5">İndirim</span>
          <div class="grid grid-cols-4 gap-2">
            ${WINTER_RATES.map((r) => `
              <label class="cursor-pointer">
                <input type="radio" name="rate" value="${r}" ${r === sel ? 'checked' : ''} class="peer sr-only" />
                <span class="block text-center py-2 rounded-xl border text-xs font-bold transition border-slate-200 text-slate-500 peer-checked:border-sky-400 peer-checked:bg-sky-50 peer-checked:text-sky-700">${r ? `%${r}` : 'İndirimsiz'}</span>
              </label>`).join('')}
          </div>
        </div>
        ${formFooter('Kaydet')}
      </form>`);
  }

  function handleSaveWinterDeal(fd, editId) {
    if (!requireAdmin()) return;
    const b = getBook(editId);
    if (!b || !hasWinterTheme(b)) return toast('Kitap bulunamadı.', 'error');
    if (isWinterNewBook(b)) return toast('Bu kışın kitabı · sezon boyunca indirimsiz kalır.', 'info');
    const rate = Number(fd.rate);
    if (!WINTER_RATES.includes(rate)) return toast('Bir indirim seçin.', 'error');
    closeModal();
    run(col('winterDeals').doc(String(b.id)).set({ bookId: b.id, rate, updatedAt: isoAt(Date.now()), updatedBy: state.currentUserId }),
      `❄️ "${b.title}" · ${rate ? `%${rate} Kış Fırsatı indirimi` : 'indirimsiz'}`);
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

  /* --- 8.1.7 Fırsatlar (eski adları Vitrin İndirimleri, Özel Fırsatlar · açık çivit mavisi + altın) · Admin ekler/siler --- */
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
  const vitrineEndText = (d, now = new Date()) => (d.endsMs == null ? 'Kaldırılana kadar geçerli'
    : `⏳ ${formatRemaining(d.endsMs - now.getTime())} · ${formatDate(new Date(d.endsMs).toISOString(), true)}`);

  function renderVitrine(now) {
    const admin = isAdmin();
    purgeExpiredVitrine(now);
    const list = discounts
      .map((d) => ({ d, b: getBook(d.bookId) }))
      .filter(({ d, b }) => b && hasPrice(b) && isVisibleBook(b) && customDiscountOf(b, now) === d)
      .sort((x, y) => y.d.rate - x.d.rate || new Date(y.d.createdAt) - new Date(x.d.createdAt));
    const box = $('#vitrineSection');
    if (!showcaseLive('vitrine') || (!list.length && !admin)) { box.innerHTML = ''; return; }

    const cards = list.map(({ d, b }) => {
      const eff = getEffectiveDiscount(b, now);
      const newPrice = round2(b.price * (1 - eff.rate / 100));
      const free = newPrice <= 0;
      return `
        <div data-open-book="${b.id}" role="button" tabindex="0"
          class="vitrine-card vitrine-sheen group relative cursor-pointer rounded-2xl p-4 pt-5 text-left transition duration-300 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-amber-300/60">
          <div class="vitrine-tag absolute -top-px right-4 w-[4.25rem] pt-2 pb-4 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 text-center shadow-lg z-[2]">
            <p class="text-[8px] font-extrabold tracking-[.2em] text-amber-900/80">${free ? 'BEDAVA' : 'İNDİRİM'}</p>
            <p class="text-xl font-black text-amber-950 leading-none mt-0.5">%${eff.rate}</p>
          </div>
          <p class="relative z-[1] vitrine-gold text-base font-extrabold italic leading-tight truncate pr-20 ${admin ? 'pl-7' : ''} mb-3" style="font-family:'Playfair Display',Georgia,serif">${escapeHTML(d.name || 'Fırsat')}</p>
          ${admin ? `<button type="button" data-delete-vitrine="${d.id}" title="Fırsatı kaldır" aria-label="Fırsatı kaldır"
            class="absolute top-2 left-2 z-[3] w-7 h-7 rounded-full bg-white/20 text-white hover:bg-rose-500 hover:text-white flex items-center justify-center transition">${icon('close', 'w-3.5 h-3.5 pointer-events-none')}</button>` : ''}
          <div class="relative z-[1] flex gap-3">
            <div class="shrink-0 self-start rounded-xl ring-1 ring-amber-300/40 shadow-[0_10px_25px_-10px_rgba(251,191,36,.5)]">${coverHTML(b, 'md')}</div>
            <div class="flex-1 min-w-0">
              <p class="text-[10px] font-semibold uppercase tracking-[.18em] text-amber-200 truncate">${escapeHTML(typeLabel(b.type))}</p>
              <p class="text-sm font-semibold text-white mt-0.5 line-clamp-2 leading-snug">${escapeHTML(b.title)}</p>
              ${Number.isInteger(b.seriesNo) && getType(b.type)?.inDeals ? `<p class="text-[11px] font-bold text-amber-200 mt-0.5">#${b.seriesNo}</p>` : ''}
              ${statusChipHTML(b, now.getTime(), 'mt-1.5')}
            </div>
          </div>
          <div class="relative z-[1] flex items-end justify-between mt-4 pt-3 border-t border-white/25">
            <p class="text-[10px] text-indigo-50/90 leading-snug min-w-0">${vitrineEndText(d, now)}</p>
            <div class="text-right shrink-0">
              <p class="text-[11px] text-indigo-100/75 line-through">${formatMoney(b.price)}</p>
              <p class="vitrine-gold text-2xl font-black leading-none tracking-tight">${free ? 'BEDAVA' : formatMoney(newPrice)}</p>
            </div>
          </div>
        </div>`;
    }).join('');

    box.innerHTML = `
      <div class="vitrine-rim rounded-3xl p-[1.5px] shadow-soft-lg mb-6">
        <div class="vitrine-bg relative rounded-[22px] overflow-hidden p-4 sm:p-5">
          <div class="vitrine-dots absolute inset-0 pointer-events-none"></div>
          <div class="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div class="flex items-center gap-3">
              <span class="vitrine-rim w-10 h-10 rounded-full p-[1.5px] shadow-soft shrink-0">
                <span class="w-full h-full rounded-full bg-indigo-600 flex items-center justify-center text-lg">🏷️</span>
              </span>
              <div>
                <h2 class="vitrine-gold text-lg font-extrabold italic leading-tight" style="font-family:'Playfair Display',Georgia,serif">Fırsatlar</h2>
                <p class="text-[11px] text-indigo-50/90">Admin'in seçtiği fırsatlar · süreleri dolunca kendiliğinden kalkar</p>
              </div>
            </div>
            ${admin ? `<button type="button" data-add-vitrine
              class="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-bold text-amber-950 bg-gradient-to-r from-amber-200 to-amber-400 hover:from-amber-100 hover:to-amber-300 shadow-soft transition">${icon('plus', 'w-3.5 h-3.5')}İndirim Ekle</button>` : ''}
          </div>
          ${list.length
            ? `<div class="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">${cards}</div>`
            : `<p class="relative text-center text-xs text-indigo-50/90 py-8 border border-dashed border-amber-300/25 rounded-2xl">Henüz fırsat yok · <b class="text-amber-300">İndirim Ekle</b> ile kitap ve yüzde seçerek ekleyebilirsin.<br/><span class="text-[10px] text-indigo-100/75">Bu boş alanı yalnızca Adminler görür.</span></p>`}
        </div>
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
      <div class="museum-hall relative rounded-3xl overflow-hidden shadow-soft-lg mb-6 p-4 sm:p-6">
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

  /* Admin: fırsat ekle (aynı kitaba yeniden eklemek indirimi günceller).
     Başka bir indirimdeki kitap (günün indirimi, yeni kitap, aktif özel teklif) seçilemez. */
  function openVitrineModal() {
    if (!requireAdmin()) return;
    const now = new Date();
    const dealIds = getDailyDeals(now).ids;
    // Yalnızca Kiralık durumdaki kitaplar
    const pickable = books
      .filter((b) => hasPrice(b) && isRentableStatus(b))
      .map((b) => ({ b, other: customDiscountOf(b, now) ? null : otherDiscountOf(b, now, dealIds) }))
      .sort((x, y) => !!x.other - !!y.other || x.b.title.localeCompare(y.b.title, 'tr'));
    if (!pickable.some((x) => !x.other)) return toast('Fırsatlar\'a eklenebilecek kitap yok (Kiralık kitapların hepsi başka bir indirimde).', 'info');
    const defaultEnd = localDateKey(new Date(Date.now() + 7 * DAY_MS));
    openModal(`
      ${modalHeader('Fırsat Ekle 🏷️', 'Ana sayfadaki Fırsatlar\'da görünür · bitiş anında kendiliğinden kalkar.', 'tag', 'bg-amber-50 text-amber-600')}
      <form data-form="saveVitrine" class="p-5 space-y-3.5" autocomplete="off">
        ${field('İndirim Adı', `<input name="name" maxlength="60" required autofocus class="${INPUT_CLS}" placeholder="Örn. Kış Fırsatı ❄️" />`)}
        ${field('Kitap', `<select name="bookId" id="vd-book" required class="${INPUT_CLS}">
          ${pickable.map(({ b, other }) => {
            const cur = customDiscountOf(b, now);
            return `<option value="${b.id}" ${other ? 'disabled' : ''}>${escapeHTML(b.title)} · ${formatMoney(b.price)}${cur ? ` (fırsatta %${cur.rate})` : ''}${other ? ` — ${other}` : ''}</option>`;
          }).join('')}
        </select>`, 'Yalnızca Kiralık kitaplar listelenir; başka bir indirimdekiler seçilemez. Zaten fırsatta olan kitabı seçersen indirimi güncellenir.')}
        ${field('İndirim Yüzdesi (%)', `<input name="rate" id="vd-rate" type="number" min="1" max="${CUSTOM_DISCOUNT_MAX}" step="1" required inputmode="numeric" class="${INPUT_CLS}" placeholder="Örn. 30" />`,
          `1–${CUSTOM_DISCOUNT_MAX} arası tam sayı · %100 = bedava`)}
        <div class="grid grid-cols-[1fr_auto] gap-3">
          ${field('Bitiş Tarihi', `<input name="endDate" type="date" required min="${localDateKey(now)}" value="${defaultEnd}" class="${INPUT_CLS} min-w-0" />`)}
          ${field('Saat', `<input name="endTime" type="time" required value="23:59" class="${INPUT_CLS} w-[6.5rem]" />`)}
        </div>
        <div id="vd-preview" class="rounded-2xl bg-gradient-to-br from-indigo-950 to-slate-900 text-white px-4 py-3 text-xs"></div>
        ${announceCheckHTML('vd-announce', 'İndirim')}
        ${formFooter('Fırsatlar\'a Ekle')}
      </form>`);
    updateVitrinePreview();
  }

  function updateVitrinePreview() {
    const box = $('#vd-preview');
    if (!box) return;
    const b = getBook($('#vd-book')?.value);
    const rate = parseInt($('#vd-rate')?.value, 10);
    if (!b) { box.innerHTML = ''; return; }
    box.innerHTML = rate >= 1 && rate <= CUSTOM_DISCOUNT_MAX
      ? `<span class="text-indigo-200/70">Fırsat fiyatı:</span> <span class="line-through text-indigo-200/50">${formatMoney(b.price)}</span> → <b class="vitrine-gold text-base">${rate === 100 ? 'BEDAVA' : formatMoney(round2(b.price * (1 - rate / 100)))}</b> <span class="text-amber-300 font-bold">(%${rate})</span>`
      : `<span class="text-indigo-200/70">Normal fiyat ${formatMoney(b.price)} · yüzde gir, yeni fiyat burada görünsün.</span>`;
  }

  function handleSaveVitrine(fd) {
    if (!requireAdmin()) return;
    const b = getBook(fd.bookId);
    const rate = parseInt(fd.rate, 10);
    const name = (fd.name || '').trim();
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

    const batch = db.batch();
    batch.set(col('discounts').doc(String(b.id)), {
      bookId: b.id, name, rate, endsAt: Timestamp.fromDate(end),
      createdAt: isoAt(Date.now()), createdBy: state.currentUserId
    });
    if (fd.announce === 'on') {
      const newPrice = round2(b.price * (1 - rate / 100));
      batch.set(col('announcements').doc(), {
        type: 'news', category: 'İndirim',
        title: `${name}: ${b.title} ${rate === 100 ? 'bedava' : `%${rate} indirimli`}`,
        body: `🏷️ ${name}\n"${b.title}" Fırsatlar'da! ${rate === 100 ? `${formatMoney(b.price)} yerine BEDAVA!` : `${formatMoney(b.price)} yerine ${formatMoney(newPrice)} · %${rate} indirim.`}\n⏳ Son: ${formatDate(end.toISOString(), true)} · kaçırma!`,
        bookId: b.id, authorId: state.currentUserId, createdAt: isoAt(Date.now()), pinned: false, readBy: []
      });
    }
    closeModal();
    run(batch.commit(), prev ? `"${b.title}" fırsatı güncellendi · ${name} %${rate}` : `"${b.title}" ${name} ile %${rate} indirimle Fırsatlar'a eklendi 🏷️`);
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

  /* --- 8.2 Günün indirimleri --- */
  function renderDeals(now) {
    // Vitrin Ayarları'nda kapalıysa (ya da kış sezonundaysa) bölüm hiç görünmez
    const on = showcaseLive('deals');
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
              <p class="text-[11px] text-slate-400 truncate">${escapeHTML(authorName(b))}</p>
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
                <div class="min-w-0">
                  <button type="button" data-open-book="${b.id}" class="block max-w-full text-left text-xs font-semibold text-slate-800 truncate hover:text-brand-600">${escapeHTML(b.title)}</button>
                  <p class="text-[11px] text-slate-400 truncate">${typeLabel(b.type)}</p>
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
                ${refundBtnHTML(r)}${rentalDeleteBtn(r)}
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
          ${refundBtnHTML(r)}${rentalDeleteBtn(r)}
        </li>`;
    }).join('');
  }

