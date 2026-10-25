  /* ==========================================================
     8) ANA SAYFA (DASHBOARD)
     ========================================================== */
  function renderDashboard() {
    const now = new Date();
    const u = currentUser();
    $('#page-dashboard [data-page-desc]').textContent = `Merhaba ${u.name.split(' ')[0]} 👋 Kitaplığın genel görünümü ve günün fırsatları.`;
    renderStats(now);
    renderShowcaseSettings();
    renderWinter(now);
    renderNewBooks(now);
    renderVitrine(now);
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
      showcaseOn('deals') && { label: 'Günün İndirimi', value: deals.ids.length ? `%${maxRate}` : '—', sub: deals.ids.length ? `${deals.ids.length} kitapta · en yüksek` : 'Bugün fırsat yok', icon: 'tag', tone: 'bg-rose-50 text-rose-500' }
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
    { key: 'vitrine',  icon: '🏷️', label: 'Özel Fırsatlar',  desc: "Admin'in seçtiği kitap + yüzde indirimleri" },
    { key: 'deals',    icon: '🔥', label: 'Günün İndirimi',  desc: `Her gün ${String(DISCOUNT_SETTINGS.resetHour).padStart(2, '0')}:00'da değişen 3'lü seri indirimi` },
    { key: 'newBooks', icon: '★',  label: 'Yeni Kitap',      desc: `Yeni çıkan kitaplara ${NEW_BOOK_DISCOUNT.days} gün %${NEW_BOOK_DISCOUNT.rate} indirim` },
    // Sezon vitrini: yalnızca o sezon açıkken listelenir
    { key: 'winter',   icon: '❄️', label: 'Kış Fırsatları',  desc: 'Kış boyunca indirimli kitaplar ve paketler · puan çarpanlı', season: 'winter' }
  ];
  const visibleShowcases = () => SHOWCASES.filter((s) => !s.season || s.season === activeSeason());

  /* Ana sayfada yalnızca küçük bir buton (kapalı vitrin sayısıyla) · ayarlar pencerede */
  function renderShowcaseSettings() {
    const box = $('#showcaseSettings');
    if (!isAdmin()) { box.innerHTML = ''; return; }
    const off = visibleShowcases().filter((s) => !showcaseOn(s.key)).length;
    box.innerHTML = `
      <div class="flex justify-end mb-4">
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
    box.innerHTML = visibleShowcases().map(row).join('');
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

  /* --- 8.1.4 Kış Fırsatları (yalnızca Kış sezonunda ve vitrin açıkken) ---
     Admin kitap + yüzde ekler; sezon boyunca indirimde kalır (bitiş yok, döngü yok).
     Kış paketleri: season 'winter' özel teklifleri · bu fırsatlardan kazanılan puan çarpanla çarpılır. */
  const winterPackages = () => offers.filter((o) => o.season === 'winter');

  function renderWinter(now) {
    const box = $('#winterSection');
    const admin = isAdmin();
    if (!winterOn()) { box.innerHTML = ''; return; }
    const deals = winterDeals
      .map((d) => ({ d, b: getBook(d.bookId) }))
      .filter(({ b }) => b && hasPrice(b) && isVisibleBook(b) && winterDealOf(b))
      .sort((x, y) => y.d.rate - x.d.rate || x.b.title.localeCompare(y.b.title, 'tr'));
    const packs = winterPackages();
    if (!deals.length && !packs.length && !admin) { box.innerHTML = ''; return; }
    const mult = winterMult();

    const dealCard = ({ d, b }) => {
      const newPrice = round2(b.price * (1 - d.rate / 100));
      return `
        <div data-open-book="${b.id}" role="button" tabindex="0"
          class="winter-card group relative cursor-pointer rounded-2xl p-4 pt-5 text-left transition duration-300 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-sky-200/70">
          ${admin ? `<button type="button" data-delete-winter="${b.id}" title="Kış Fırsatı'ndan çıkar" aria-label="Kış Fırsatı'ndan çıkar"
            class="absolute top-2 right-2 z-[4] w-7 h-7 rounded-full bg-white/15 text-sky-100 hover:bg-rose-500 hover:text-white flex items-center justify-center transition">${icon('close', 'w-3.5 h-3.5 pointer-events-none')}</button>` : ''}
          <div class="relative z-[1] flex gap-3">
            <div class="shrink-0 pt-1 pl-1">${coverHTML(b, 'md')}</div>
            <div class="flex-1 min-w-0 ${admin ? 'pr-6' : ''}">
              <p class="text-[10px] font-semibold uppercase tracking-[.18em] text-sky-200/90 truncate">${escapeHTML(seriesLabel(b))}</p>
              <p class="text-sm font-semibold text-white mt-0.5 line-clamp-2 leading-snug">${escapeHTML(b.title)}</p>
              <p class="text-[11px] text-sky-100/70 truncate mt-0.5">${escapeHTML(authorName(b))}</p>
              ${statusChipHTML(b, now.getTime(), 'mt-1.5')}
            </div>
          </div>
          <div class="relative z-[1] flex items-end justify-between mt-4 pt-3 border-t border-white/15">
            <div class="flex items-baseline gap-1">
              <span class="text-3xl font-black leading-none tracking-tight text-white drop-shadow">%${d.rate}</span>
              <span class="text-[10px] font-extrabold text-sky-200 tracking-wider">KIŞ</span>
            </div>
            <div class="text-right">
              <p class="text-[11px] text-sky-100/60 line-through">${formatMoney(b.price)}</p>
              <p class="text-lg font-black text-white leading-none">${newPrice <= 0 ? 'BEDAVA' : formatMoney(newPrice)}</p>
            </div>
          </div>
        </div>`;
    };

    const packCard = (o) => {
      const bs = offerBooks(o);
      const normal = offerNormalTotal(o);
      const rate = offerRate(o);
      return `
        <div data-open-offer="${o.id}" role="button" tabindex="0"
          class="winter-card group relative cursor-pointer rounded-2xl p-4 text-left transition duration-300 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-sky-200/70">
          <div class="relative z-[1] flex items-center justify-between gap-2">
            <span class="text-[10px] font-extrabold tracking-[.16em] text-sky-200">🎁 KIŞ PAKETİ · ${bs.length} KİTAP</span>
            ${rate ? `<span class="text-[11px] font-black text-sky-950 bg-gradient-to-r from-white to-sky-200 px-2 py-0.5 rounded-full shadow">%${rate}</span>` : ''}
          </div>
          <div class="relative z-[1] flex items-center gap-2 mt-3 pl-1 pt-1">${bs.map((b) => coverHTML(b, 'sm')).join('')}</div>
          <p class="relative z-[1] text-sm font-semibold text-white mt-3 line-clamp-1">${escapeHTML(o.title)}</p>
          <div class="relative z-[1] flex items-end justify-between mt-2 pt-2 border-t border-white/15">
            <p class="text-[10px] text-sky-100/70">Kış boyunca geçerli</p>
            <div class="text-right">
              ${normal > o.price ? `<p class="text-[11px] text-sky-100/60 line-through">${formatMoney(normal)}</p>` : ''}
              <p class="text-lg font-black text-white leading-none">${o.price > 0 ? formatMoney(o.price) : 'BEDAVA'}</p>
            </div>
          </div>
        </div>`;
    };

    box.innerHTML = `
      <div class="winter-rim rounded-3xl p-[1.5px] shadow-soft-lg mb-6">
        <div class="winter-bg relative rounded-[22px] overflow-hidden p-4 sm:p-5 pt-6 sm:pt-7">
          <div class="winter-flakes absolute inset-0 pointer-events-none"></div>
          <div class="winter-snow absolute inset-0 pointer-events-none" aria-hidden="true">${snowflakesHTML(22)}</div>
          <div class="winter-cap absolute inset-x-0 top-0 pointer-events-none"></div>
          <div class="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div class="flex items-center gap-3">
              <span class="w-11 h-11 rounded-full bg-white/15 ring-1 ring-white/40 flex items-center justify-center text-xl shadow-soft shrink-0">❄️</span>
              <div>
                <h2 class="text-lg font-extrabold italic leading-tight text-white" style="font-family:'Playfair Display',Georgia,serif">Kış Fırsatları</h2>
                <p class="text-[11px] text-sky-100/80">Kış boyunca indirimde${mult > 1 ? ` · bu fırsatlardan <b class="text-amber-200">⭐ ${mult}x puan</b> kazanırsın` : ''}</p>
              </div>
            </div>
            ${admin ? `<div class="self-start sm:self-auto flex items-center gap-2">
              <button type="button" data-winter-settings
                class="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-bold text-white bg-white/15 hover:bg-white/25 ring-1 ring-white/30 transition">⚙️ Ayarlar</button>
              <button type="button" data-add-winter
                class="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-bold text-sky-950 bg-gradient-to-r from-white to-sky-200 hover:to-sky-100 shadow-soft transition">${icon('plus', 'w-3.5 h-3.5')}Kitap Ekle</button>
            </div>` : ''}
          </div>
          ${deals.length ? `<div class="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">${deals.map(dealCard).join('')}</div>` : ''}
          ${packs.length ? `
            <p class="relative text-[11px] font-bold uppercase tracking-[.16em] text-sky-100/80 mt-5 mb-2.5 px-1">🎁 Kış Paketleri</p>
            <div class="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">${packs.map(packCard).join('')}</div>` : ''}
          ${!deals.length && !packs.length ? `
            <p class="relative text-center text-xs text-sky-100/80 py-8 border border-dashed border-white/25 rounded-2xl">Henüz kış fırsatı yok · <b class="text-white">Kitap Ekle</b> ile kitap ve yüzde, <b class="text-white">Ayarlar</b>'dan paket ekleyebilirsin.<br/><span class="text-[10px] text-sky-100/60">Bu boş alanı yalnızca Adminler görür.</span></p>` : ''}
        </div>
      </div>`;
  }

  /* Admin: kitabı Kış Fırsatı'na ekle (aynı kitap yeniden eklenirse yüzdesi güncellenir) */
  function openWinterDealModal() {
    if (!requireAdmin()) return;
    const now = new Date();
    const dealIds = getDailyDeals(now).ids;
    const pickable = books
      .filter((b) => hasPrice(b) && isRentableStatus(b))
      .map((b) => ({ b, other: winterDealOf(b) ? null : customDiscountOf(b, now) ? 'Özel Fırsatta' : otherDiscountOf(b, now, dealIds) }))
      .sort((x, y) => !!x.other - !!y.other || x.b.title.localeCompare(y.b.title, 'tr'));
    if (!pickable.some((x) => !x.other)) return toast('Kış Fırsatı\'na eklenebilecek kitap yok (Kiralık kitapların hepsi başka bir indirimde).', 'info');
    openModal(`
      ${modalHeader('Kış Fırsatı Ekle ❄️', 'Kış boyunca indirimde kalır · Kış Fırsatları vitrininde görünür.', 'tag', 'bg-sky-50 text-sky-600')}
      <form data-form="saveWinterDeal" class="p-5 space-y-3.5" autocomplete="off">
        ${field('Kitap', `<select name="bookId" id="wd-book" required class="${INPUT_CLS}">
          ${pickable.map(({ b, other }) => {
            const cur = winterDealOf(b);
            return `<option value="${b.id}" ${other ? 'disabled' : ''}>${escapeHTML(b.title)} · ${formatMoney(b.price)}${cur ? ` (kışta %${cur.rate})` : ''}${other ? ` — ${other}` : ''}</option>`;
          }).join('')}
        </select>`, 'Yalnızca Kiralık kitaplar · başka bir indirimdekiler seçilemez. Zaten Kış Fırsatı\'nda olan kitabı seçersen yüzdesi güncellenir.')}
        ${field('İndirim Yüzdesi (%)', `<input name="rate" id="wd-rate" type="number" min="1" max="100" step="1" required inputmode="numeric" class="${INPUT_CLS}" placeholder="Örn. 30" />`, '1–100 arası tam sayı · %100 = bedava')}
        <div id="wd-preview" class="rounded-2xl bg-gradient-to-br from-sky-900 to-indigo-950 text-white px-4 py-3 text-xs"></div>
        ${announceCheckHTML('wd-announce', 'İndirim')}
        ${formFooter('Kış Fırsatı\'na Ekle')}
      </form>`);
    updateWinterPreview();
  }

  function updateWinterPreview() {
    const box = $('#wd-preview');
    if (!box) return;
    const b = getBook($('#wd-book')?.value);
    const rate = parseInt($('#wd-rate')?.value, 10);
    if (!b) { box.innerHTML = ''; return; }
    const mult = winterMult();
    box.innerHTML = rate >= 1 && rate <= 100
      ? `<span class="text-sky-100/70">Kış fiyatı:</span> <span class="line-through text-sky-100/50">${formatMoney(b.price)}</span> → <b class="text-base">${rate === 100 ? 'BEDAVA' : formatMoney(round2(b.price * (1 - rate / 100)))}</b> <span class="text-sky-200 font-bold">(%${rate})</span>
         <span class="block text-[10px] text-sky-100/70 mt-1">⭐ Kiralayan ${formatPoints(round2(b.price * rate / 100 * mult))} kazanır${mult > 1 ? ` (${mult}x)` : ''}</span>`
      : `<span class="text-sky-100/70">Normal fiyat ${formatMoney(b.price)} · yüzde gir, kış fiyatı burada görünsün.</span>`;
  }

  function handleSaveWinterDeal(fd) {
    if (!requireAdmin()) return;
    const b = getBook(fd.bookId);
    const rate = parseInt(fd.rate, 10);
    if (!b || !hasPrice(b)) return toast('Fiyatı olan bir kitap seçin.', 'error');
    if (!isRentableStatus(b)) return toast('Kış Fırsatı\'na yalnızca Kiralık kitaplar eklenebilir.', 'error');
    if (!(rate >= 1 && rate <= 100)) return toast('İndirim yüzdesi 1–100 arası olmalı.', 'error');
    const prev = winterDealOf(b);
    const other = prev ? null : customDiscountOf(b) ? 'Özel Fırsatta' : otherDiscountOf(b);
    if (other) return toast(`"${b.title}" şu an ${other}; Kış Fırsatı'na eklenemez.`, 'error');

    const batch = db.batch();
    batch.set(col('winterDeals').doc(String(b.id)), { bookId: b.id, rate, createdAt: isoAt(Date.now()), createdBy: state.currentUserId });
    if (fd.announce === 'on') {
      const mult = winterMult();
      batch.set(col('announcements').doc(), {
        type: 'news', category: 'İndirim',
        title: `Kış Fırsatı: ${b.title} ${rate === 100 ? 'bedava' : `%${rate} indirimli`} ❄️`,
        body: `❄️ Kış Fırsatları\n"${b.title}" kış boyunca ${rate === 100 ? `${formatMoney(b.price)} yerine BEDAVA!` : `${formatMoney(b.price)} yerine ${formatMoney(round2(b.price * (1 - rate / 100)))} · %${rate} indirim.`}${mult > 1 ? `\n⭐ Bu fırsattan ${mult}x puan kazanırsın!` : ''}`,
        bookId: b.id, authorId: state.currentUserId, createdAt: isoAt(Date.now()), pinned: false, readBy: []
      });
    }
    closeModal();
    run(batch.commit(), prev ? `"${b.title}" kış indirimi %${rate} olarak güncellendi.` : `"${b.title}" %${rate} indirimle Kış Fırsatları'na eklendi ❄️`);
  }

  function deleteWinterDeal(bookId) {
    if (!requireAdmin()) return;
    const d = winterDeals.find((x) => x.bookId === Number(bookId));
    if (!d) return;
    const b = getBook(d.bookId);
    openConfirm({
      title: 'Kış Fırsatı\'ndan çıkarılsın mı?',
      message: `"${escapeHTML(b?.title || 'Kitap')}" kitabındaki %${d.rate} kış indirimi kaldırılacak. <b>Kitap kitaplıkta kalır</b>, normal fiyatından kiralanabilir. Önceki kiralamalar etkilenmez.`,
      confirmLabel: 'Çıkar',
      onConfirm: () => {
        closeModal();
        run(col('winterDeals').doc(d.id).delete(), 'Kitap Kış Fırsatları\'ndan çıkarıldı.', 'info');
      }
    });
  }

  /* Kış Fırsatları ayarları: puan çarpanı + kış paketleri (ekle / düzenle / sil) */
  function openWinterSettingsModal() {
    if (!requireAdmin()) return;
    const mult = winterMult();
    const packs = winterPackages();
    openModal(`
      ${modalHeader('Kış Fırsatları Ayarları ❄️', 'Puan çarpanı ve kış paketleri · değişiklik bundan sonraki kiralamalara uygulanır.', 'cog', 'bg-sky-50 text-sky-600')}
      <div class="p-5 space-y-5">
        <form data-form="saveWinterSettings" class="space-y-2.5" autocomplete="off">
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">⭐ Puan Çarpanı</p>
          <div class="grid grid-cols-5 gap-1.5">
            ${Array.from({ length: WINTER_MULT_MAX }, (_, i) => i + 1).map((m) => `
              <label class="cursor-pointer">
                <input type="radio" name="multiplier" value="${m}" ${m === mult ? 'checked' : ''} class="peer sr-only" />
                <span class="block text-center py-2 rounded-xl text-xs font-bold border transition peer-checked:bg-sky-600 peer-checked:text-white peer-checked:border-sky-600 border-slate-200 text-slate-600 hover:border-sky-300">${m}x</span>
              </label>`).join('')}
          </div>
          <p class="text-[10px] text-slate-400">Kış Fırsatı kiralamalarında ve kış paketlerinde kazanılan puan bu sayıyla çarpılır (1x = normal). Önceki kiralamaların puanı değişmez.</p>
          <button type="submit" class="${BTN_PRIMARY} w-full !py-2.5">Çarpanı Kaydet</button>
        </form>
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">🎁 Kış Paketleri</p>
            <button type="button" data-add-winter-package class="${BTN_SOFT} !py-1.5">${icon('plus', 'w-3.5 h-3.5')}Paket Ekle</button>
          </div>
          ${packs.length ? `<ul class="space-y-2">${packs.map((o) => `
            <li class="flex items-center gap-3 p-2.5 rounded-2xl border border-slate-100 bg-white">
              <div class="flex -space-x-2 shrink-0">${offerBooks(o).map((b) => coverHTML(b, 'xs')).join('')}</div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-slate-700 truncate">${escapeHTML(o.title)}</p>
                <p class="text-[10px] text-slate-400">${o.items.length} kitap · ${o.price > 0 ? formatMoney(o.price) : 'Bedava'}${offerRate(o) ? ` · %${offerRate(o)}` : ''}</p>
              </div>
              <button type="button" data-edit-offer="${o.id}" title="Düzenle" class="${BTN_ICON} text-slate-400 hover:text-brand-600 hover:bg-brand-50">${icon('pencil', 'w-3.5 h-3.5 pointer-events-none')}</button>
              <button type="button" data-delete-offer="${o.id}" title="Sil" class="${BTN_ICON} text-slate-400 hover:text-rose-500 hover:bg-rose-50">${icon('trash', 'w-3.5 h-3.5 pointer-events-none')}</button>
            </li>`).join('')}</ul>`
            : '<p class="text-[11px] text-slate-400 bg-slate-50 rounded-xl px-3 py-2.5">Henüz kış paketi yok · 1–3 kitaplık paketler ekleyebilirsin.</p>'}
        </div>
        <button type="button" data-modal-close class="${BTN_SOFT} w-full !py-2.5">Kapat</button>
      </div>`);
  }

  function handleSaveWinterSettings(fd) {
    if (!requireAdmin()) return;
    const m = parseInt(fd.multiplier, 10);
    if (!(m >= 1 && m <= WINTER_MULT_MAX)) return toast(`Çarpan 1–${WINTER_MULT_MAX} arası olmalı.`, 'error');
    closeModal();
    run(col('settings').doc('winter').set({ multiplier: m }, { merge: true }), `⭐ Kış Fırsatları puan çarpanı ${m}x olarak kaydedildi.`);
  }

  /* --- 8.1.5 Yeni Kitap vitrini (altın parıltılı, günün indirimlerinden ayrı) --- */
  function renderNewBooks(now) {
    const list = books
      .filter((b) => isNewBook(b, now) && isVisibleBook(b) && !winterDealOf(b)) // Kış Fırsatı'ndaki kitap kış vitrininde
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

  /* --- 8.1.7 Özel Fırsatlar (eski adı Vitrin İndirimleri · gece mavisi + altın) · Admin ekler/siler --- */
  /* Süresi biten özel fırsatlar: herkes için gizlenir, Admin açıksa Firestore'dan da silinir */
  function purgeExpiredVitrine(now = new Date()) {
    if (!isAdmin()) return;
    discounts.filter((d) => d.endsMs != null && d.endsMs <= now.getTime()).forEach((d) => {
      const key = `vitrine:${d.id}`;
      if (state.purgePending.has(key)) return;
      state.purgePending.add(key);
      col('discounts').doc(d.id).delete().catch((e) => { console.error(e); state.purgePending.delete(key); });
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
    if (!showcaseOn('vitrine') || (!list.length && !admin)) { box.innerHTML = ''; return; }

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
          <p class="relative z-[1] vitrine-gold text-base font-extrabold italic leading-tight truncate pr-20 ${admin ? 'pl-7' : ''} mb-3" style="font-family:'Playfair Display',Georgia,serif">${escapeHTML(d.name || 'Özel Fırsat')}</p>
          ${admin ? `<button type="button" data-delete-vitrine="${d.id}" title="Özel fırsatı kaldır" aria-label="Özel fırsatı kaldır"
            class="absolute top-2 left-2 z-[3] w-7 h-7 rounded-full bg-white/10 text-indigo-200 hover:bg-rose-500 hover:text-white flex items-center justify-center transition">${icon('close', 'w-3.5 h-3.5 pointer-events-none')}</button>` : ''}
          <div class="relative z-[1] flex gap-3">
            <div class="shrink-0 rounded-xl ring-1 ring-amber-300/40 shadow-[0_10px_25px_-10px_rgba(251,191,36,.5)]">${coverHTML(b, 'md')}</div>
            <div class="flex-1 min-w-0">
              <p class="text-[10px] font-semibold uppercase tracking-[.18em] text-amber-300/80 truncate">${escapeHTML(typeLabel(b.type))}</p>
              <p class="text-sm font-semibold text-white mt-0.5 line-clamp-2 leading-snug">${escapeHTML(b.title)}</p>
              <p class="text-[11px] text-indigo-200/70 truncate mt-0.5">${escapeHTML(authorName(b))}</p>
              ${statusChipHTML(b, now.getTime(), 'mt-1.5')}
            </div>
          </div>
          <div class="relative z-[1] flex items-end justify-between mt-4 pt-3 border-t border-white/10">
            <p class="text-[10px] text-indigo-200/70 leading-snug min-w-0">${vitrineEndText(d, now)}</p>
            <div class="text-right shrink-0">
              <p class="text-[11px] text-indigo-200/50 line-through">${formatMoney(b.price)}</p>
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
                <span class="w-full h-full rounded-full bg-indigo-950 flex items-center justify-center text-lg">🏷️</span>
              </span>
              <div>
                <h2 class="vitrine-gold text-lg font-extrabold italic leading-tight" style="font-family:'Playfair Display',Georgia,serif">Özel Fırsatlar</h2>
                <p class="text-[11px] text-indigo-200/70">Admin'in seçtiği özel fırsatlar · süreleri dolunca kendiliğinden kalkar</p>
              </div>
            </div>
            ${admin ? `<button type="button" data-add-vitrine
              class="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-bold text-amber-950 bg-gradient-to-r from-amber-200 to-amber-400 hover:from-amber-100 hover:to-amber-300 shadow-soft transition">${icon('plus', 'w-3.5 h-3.5')}İndirim Ekle</button>` : ''}
          </div>
          ${list.length
            ? `<div class="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">${cards}</div>`
            : `<p class="relative text-center text-xs text-indigo-200/70 py-8 border border-dashed border-amber-300/25 rounded-2xl">Henüz özel fırsat yok · <b class="text-amber-300">İndirim Ekle</b> ile kitap ve yüzde seçerek ekleyebilirsin.<br/><span class="text-[10px] text-indigo-200/50">Bu boş alanı yalnızca Adminler görür.</span></p>`}
        </div>
      </div>`;
  }

  /* Admin: özel fırsat ekle (aynı kitaba yeniden eklemek indirimi günceller).
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
    if (!pickable.some((x) => !x.other)) return toast('Özel Fırsatlar\'a eklenebilecek kitap yok (Kiralık kitapların hepsi başka bir indirimde).', 'info');
    const defaultEnd = localDateKey(new Date(Date.now() + 7 * DAY_MS));
    openModal(`
      ${modalHeader('Özel Fırsat Ekle 🏷️', 'Ana sayfadaki Özel Fırsatlar\'da görünür · bitiş anında kendiliğinden kalkar.', 'tag', 'bg-amber-50 text-amber-600')}
      <form data-form="saveVitrine" class="p-5 space-y-3.5" autocomplete="off">
        ${field('İndirim Adı', `<input name="name" maxlength="60" required autofocus class="${INPUT_CLS}" placeholder="Örn. Kış Fırsatı ❄️" />`)}
        ${field('Kitap', `<select name="bookId" id="vd-book" required class="${INPUT_CLS}">
          ${pickable.map(({ b, other }) => {
            const cur = customDiscountOf(b, now);
            return `<option value="${b.id}" ${other ? 'disabled' : ''}>${escapeHTML(b.title)} · ${formatMoney(b.price)}${cur ? ` (özel fırsatta %${cur.rate})` : ''}${other ? ` — ${other}` : ''}</option>`;
          }).join('')}
        </select>`, 'Yalnızca Kiralık kitaplar listelenir; başka bir indirimdekiler seçilemez. Zaten özel fırsatta olan kitabı seçersen indirimi güncellenir.')}
        ${field('İndirim Yüzdesi (%)', `<input name="rate" id="vd-rate" type="number" min="1" max="${CUSTOM_DISCOUNT_MAX}" step="1" required inputmode="numeric" class="${INPUT_CLS}" placeholder="Örn. 30" />`,
          `1–${CUSTOM_DISCOUNT_MAX} arası tam sayı · %100 = bedava`)}
        <div class="grid grid-cols-[1fr_auto] gap-3">
          ${field('Bitiş Tarihi', `<input name="endDate" type="date" required min="${localDateKey(now)}" value="${defaultEnd}" class="${INPUT_CLS} min-w-0" />`)}
          ${field('Saat', `<input name="endTime" type="time" required value="23:59" class="${INPUT_CLS} w-[6.5rem]" />`)}
        </div>
        <div id="vd-preview" class="rounded-2xl bg-gradient-to-br from-indigo-950 to-slate-900 text-white px-4 py-3 text-xs"></div>
        ${announceCheckHTML('vd-announce', 'İndirim')}
        ${formFooter('Özel Fırsatlar\'a Ekle')}
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
    if (!isRentableStatus(b)) return toast('Özel Fırsatlar\'a yalnızca Kiralık durumdaki kitaplar eklenebilir.', 'error');
    if (!(rate >= 1 && rate <= CUSTOM_DISCOUNT_MAX)) return toast(`İndirim yüzdesi 1–${CUSTOM_DISCOUNT_MAX} arası olmalı.`, 'error');
    if (!isDateKey(fd.endDate) || !isTimeKey(fd.endTime)) return toast('Geçerli bir bitiş tarihi ve saati seçin.', 'error');
    const end = dateFromKey(fd.endDate);
    end.setHours(...fd.endTime.split(':').map(Number), 0, 0);
    if (end.getTime() <= Date.now()) return toast('Bitiş anı geçmiş olamaz.', 'error');
    const prev = customDiscountOf(b);
    const other = prev ? null : otherDiscountOf(b);
    if (other) return toast(`"${b.title}" şu an ${other}; Özel Fırsatlar'a eklenemez.`, 'error');

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
        body: `🏷️ ${name}\n"${b.title}" Özel Fırsatlar'da! ${rate === 100 ? `${formatMoney(b.price)} yerine BEDAVA!` : `${formatMoney(b.price)} yerine ${formatMoney(newPrice)} · %${rate} indirim.`}\n⏳ Son: ${formatDate(end.toISOString(), true)} · kaçırma!`,
        bookId: b.id, authorId: state.currentUserId, createdAt: isoAt(Date.now()), pinned: false, readBy: []
      });
    }
    closeModal();
    run(batch.commit(), prev ? `"${b.title}" özel fırsatı güncellendi · ${name} %${rate}` : `"${b.title}" ${name} ile %${rate} indirimle Özel Fırsatlar'a eklendi 🏷️`);
  }

  function deleteVitrine(id) {
    if (!requireAdmin()) return;
    const d = discounts.find((x) => x.id === id);
    if (!d) return;
    const b = getBook(d.bookId);
    openConfirm({
      title: 'Özel fırsat kaldırılsın mı?',
      message: `"${escapeHTML(b?.title || 'Kitap')}" kitabındaki %${d.rate} özel fırsat indirimi kaldırılacak. <b>Kitap kitaplıkta kalır</b>, normal fiyatından kiralanabilir. Önceki kiralamalar etkilenmez.`,
      confirmLabel: 'Kaldır',
      onConfirm: () => {
        closeModal();
        run(col('discounts').doc(d.id).delete(), 'Özel fırsat kaldırıldı.', 'info');
      }
    });
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
      custom: { label: '🏷️ Özel Fırsat',         tone: 'bg-indigo-50 text-indigo-600' },
      winter: { label: '❄️ Kış Fırsatı',          tone: 'bg-sky-50 text-sky-600' }
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

