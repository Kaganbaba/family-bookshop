  /* ==========================================================
     12.5) HEDİYELERİM — PUAN & KUPONLAR
     ----------------------------------------------------------
     • Puan = indirimlerden kazanılan TL · kuponlar puanla alınır.
     • Kupon 7 gün geçerli, tek kullanımlık; yalnızca Kiralık ve başka
       indirimi olmayan kitaba (kitap detayında Kirala'dan) uygulanır.
     • Özel tekliflere kupon uygulanmaz.
     ========================================================== */
  /* season damgalı mağaza kuponu kaldırılan Kış Fırsatları'ndan kalmıştır: geçersiz sayılır (kural da alımı reddeder) */
  const isShopActive = (s, now = Date.now()) => (s.endsMs == null || s.endsMs > now) && !s.season;

  /* Süresi biten mağaza kuponları: herkes için gizlenir, siteyi açan herkes Firestore'dan da siler
     (kural süre dolmuş mu denetler · önceden alınmış kuponlar etkilenmez · reddedilirse bu oturumda yeniden denenmez) */
  function purgeExpiredShop(now = Date.now()) {
    if (!currentUser()) return;
    couponShop.filter((s) => !isShopActive(s, now)).forEach((s) => {
      const key = `shop:${s.id}`;
      if (state.purgePending.has(key)) return;
      state.purgePending.add(key);
      col('couponShop').doc(s.id).delete().catch((e) => console.error(e));
    });
  }

  function renderGifts() {
    const u = currentUser();
    const now = Date.now();
    const admin = isAdmin();
    purgeExpiredShop(now);
    const pts = userStats(u.id).points;
    const active = activeCouponsOf(u.id, now);
    const rentOk = canRent(u);
    setPageActions('gifts', admin
      ? `<span class="flex gap-2">
          <button type="button" data-send-cheque class="${BTN_SOFT}">🎁 Çek Gönder</button>
          <button type="button" data-add-shop-coupon class="${BTN_PRIMARY}">${icon('plus', 'w-3.5 h-3.5')}Kupon Ekle</button>
        </span>`
      : '');

    const items = couponShop.filter((s) => isShopActive(s, now))
      .sort((a, b) => a.cost - b.cost || new Date(b.createdAt) - new Date(a.createdAt));
    // Süreli kuponlar en başta, özel görünümle (en yakın bitiş önce); diğerleri türe göre gruplu
    const timed = items.filter((s) => s.endsMs).sort((a, b) => a.endsMs - b.endsMs);
    const regular = items.filter((s) => !s.endsMs);
    const adminBtns = (s, tone) => (admin ? `<div class="absolute top-2 right-2 z-[2] flex gap-1">
        <button type="button" data-edit-shop-coupon="${s.id}" title="Düzenle" aria-label="Kuponu düzenle"
          class="w-7 h-7 rounded-full ${tone} hover:bg-white hover:text-brand-600 flex items-center justify-center transition">${icon('pencil', 'w-3.5 h-3.5 pointer-events-none')}</button>
        <button type="button" data-delete-shop-coupon="${s.id}" title="Mağazadan kaldır" aria-label="Mağazadan kaldır"
          class="w-7 h-7 rounded-full ${tone} hover:bg-white hover:text-rose-500 flex items-center justify-center transition">${icon('close', 'w-3.5 h-3.5 pointer-events-none')}</button>
      </div>` : '');
    const buyBtn = (s, cls) => {
      const enough = pts.available >= s.cost;
      return `<button type="button" data-buy-coupon="${s.id}" ${rentOk && enough ? '' : 'disabled'} class="${BTN_PRIMARY} ${cls}">
        ${!rentOk ? 'Kiralama yetkin yok' : enough ? 'Kuponu Al' : `${formatPoints(round2(s.cost - pts.available))} eksik`}</button>`;
    };
    /* Süreli kupon: yatay bilet · solda renkli kupon kısmı, sağda puan / kalan süre / al */
    const timedCard = (s) => {
      const type = couponTypeOf(s);
      return `
        <div class="relative flex bg-white rounded-2xl shadow-soft overflow-hidden ring-2 ring-amber-300/70">
          <div class="relative w-36 sm:w-40 shrink-0 bg-gradient-to-br ${COUPON_TONES[type]} text-white px-3.5 py-3 flex flex-col justify-center border-r-2 border-dashed border-white/70">
            <span class="absolute inset-0 offer-pattern opacity-50"></span>
            <span class="relative self-start text-[9px] font-extrabold tracking-widest text-amber-950 bg-gradient-to-r from-amber-200 to-amber-400 px-2 py-0.5 rounded-full shadow-soft">⏳ SÜRELİ</span>
            <p class="relative text-[9px] font-bold tracking-[.18em] opacity-90 mt-2">${COUPON_TYPES[type].label.toLocaleUpperCase('tr')}</p>
            <p class="relative ${type === 'bogo' ? 'text-xl' : 'text-3xl'} font-black leading-none mt-1">${couponBadge(s)}</p>
            ${s.name ? `<p class="relative text-[10px] font-semibold mt-1 truncate">${escapeHTML(s.name)}</p>` : ''}
          </div>
          <div class="relative flex-1 min-w-0 p-3 flex flex-col gap-1.5 ${admin ? 'pr-20' : ''}">
            ${adminBtns(s, 'bg-slate-100 text-slate-500')}
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-bold text-amber-600">⭐ ${formatPoints(s.cost)}</span>
              <span class="text-[10px] text-slate-400">· ${COUPON_DAYS} gün geçerli</span>
            </div>
            ${type === 'bogo' ? `<p class="text-[10px] text-slate-500 leading-snug">${bogoText(s)}.</p>` : ''}
            <p class="text-[11px] font-extrabold text-rose-600 tabular-nums">⏳ ${formatRemaining(s.endsMs - now)}
              <span class="font-medium text-rose-400"> · son ${formatDate(new Date(s.endsMs).toISOString(), true)}</span></p>
            ${buyBtn(s, '!py-2 mt-auto self-start px-5')}
          </div>
        </div>`;
    };
    const shopCard = (s) => {
      const type = couponTypeOf(s);
      return `
        <div class="relative bg-white rounded-2xl shadow-soft overflow-hidden flex flex-col h-full">
          <div class="relative px-4 pt-4 pb-5 bg-gradient-to-br ${COUPON_TONES[type]} text-white">
            <span class="absolute inset-0 offer-pattern opacity-60"></span>
            ${adminBtns(s, 'bg-white/20')}
            <p class="relative text-[10px] font-bold tracking-[.2em] opacity-90 ${admin ? 'pr-16' : ''}">${COUPON_TYPES[type].label.toLocaleUpperCase('tr')}</p>
            <p class="relative ${type === 'bogo' ? 'text-2xl' : 'text-4xl'} font-black leading-none mt-1">${couponBadge(s)}</p>
            ${s.name ? `<p class="relative text-[11px] font-semibold mt-1.5 truncate">${escapeHTML(s.name)}</p>` : ''}
            <span class="absolute -bottom-2 left-0 right-0 h-4 bg-[radial-gradient(circle_at_8px_0,transparent_7px,#fff_7.5px)] bg-[length:16px_16px] bg-repeat-x"></span>
          </div>
          <div class="p-4 pt-3 flex-1 flex flex-col gap-2">
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-bold text-amber-600">⭐ ${formatPoints(s.cost)}</span>
              <span class="text-[10px] text-slate-400">${COUPON_DAYS} gün geçerli</span>
            </div>
            ${type === 'bogo' ? `<p class="text-[10px] text-slate-500 leading-snug">${bogoText(s)}.</p>` : ''}
            ${buyBtn(s, 'w-full !py-2.5 mt-auto')}
          </div>
        </div>`;
    };
    const grid = (list) => `<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">${list.map(shopCard).join('')}</div>`;
    // Süreli kuponlar en üstte: yatay bilet kartları (koyu zemin yok)
    const timedHTML = timed.length ? `
      <div class="mb-5">
        <div class="flex items-center gap-2 mb-2.5 px-1">
          <span class="text-sm">⏳</span>
          <h3 class="text-xs font-bold text-slate-700">Süreli Kuponlar</h3>
          <span class="text-[10px] font-semibold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">kısa süreliğine</span>
          <span class="flex-1 h-px bg-slate-200"></span>
          <span class="text-[10px] text-slate-400">${timed.length} kupon</span>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">${timed.map(timedCard).join('')}</div>
      </div>` : '';
    const groupsHTML = Object.entries(COUPON_TYPES).map(([k, t]) => {
      const list = regular.filter((s) => couponTypeOf(s) === k);
      return list.length ? `
        <div class="mb-5">
          <div class="flex items-center gap-2 mb-2.5 px-1">
            <span class="w-2.5 h-2.5 rounded-full bg-gradient-to-br ${COUPON_TONES[k]}"></span>
            <h3 class="text-xs font-bold text-slate-700">${t.label}</h3>
            <span class="flex-1 h-px bg-slate-200"></span>
            <span class="text-[10px] text-slate-400">${list.length} kupon</span>
          </div>
          ${grid(list)}
        </div>` : '';
    }).join('');

    $('#giftsContent').innerHTML = `
      <div class="relative overflow-hidden rounded-3xl p-5 sm:p-6 mb-6 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-500 text-white shadow-soft-lg">
        <span class="absolute inset-0 offer-pattern opacity-40"></span>
        <span class="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/15"></span>
        <div class="relative flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p class="text-xs font-semibold text-white/85">Harcanabilir puanın ⭐</p>
            <p class="text-4xl sm:text-5xl font-black leading-none mt-1.5 tabular-nums">${formatPoints(pts.available)}</p>
            <p class="text-[11px] text-white/85 mt-2">Kazanılan ${formatPoints(pts.earned)} · Kupona harcanan ${formatPoints(pts.spent)}</p>
          </div>
          <div class="text-[11px] leading-relaxed bg-white/15 backdrop-blur rounded-2xl px-3.5 py-2.5 sm:max-w-xs">
            İndirimli her kiralamada kazandığın her <b>1 ₺ = 1 puan</b>. Puanlarınla kupon al, ${COUPON_DAYS} gün içinde
            <b>Kiralık ve indirimsiz</b> kitaplara uygula. Özel tekliflere kupon uygulanmaz.
          </div>
        </div>
      </div>

      ${myChequesHTML(u.id, now)}
      ${admin ? sentChequesHTML(now) : ''}

      <div class="mb-6">
        <h2 class="text-sm font-bold text-slate-800 mb-3">🛍️ Kupon Mağazası</h2>
        ${items.length
          ? timedHTML + groupsHTML
          : emptyState(admin ? 'Mağazada kupon yok · sağ üstteki <b>Kupon Ekle</b> ile yüzde, ₺ ya da Al-Öde kuponu ekleyebilirsin.' : 'Mağazada şu an kupon yok. Yakında yeni kuponlar gelecek!')}
      </div>

      <div class="bg-white rounded-2xl shadow-soft p-4 sm:p-5">
        <div class="flex items-center justify-between gap-2 mb-3">
          <h2 class="text-sm font-bold text-slate-800">🎟️ Aktif Kuponlarım</h2>
          <button type="button" data-user-stats="${u.id}" class="text-[11px] font-semibold text-brand-600 hover:text-brand-700">Tüm kuponlar → İstatistiklerim</button>
        </div>
        ${active.length
          ? `<ul class="grid grid-cols-1 md:grid-cols-2 gap-2.5">${active.map((c) => couponCardHTML(c, now, true)).join('')}</ul>`
          : emptyState('Aktif kuponun yok. Puanların yetiyorsa mağazadan bir kupon alabilirsin.')}
      </div>`;
  }

  /* Kupon al: mağazadaki kuponun bir kopyası 7 gün geçerli olarak kullanıcıya yazılır */
  function buyCoupon(shopId) {
    const u = currentUser();
    const s = couponShop.find((x) => x.id === shopId);
    if (!u || !s) return;
    if (!isShopActive(s)) return toast('Bu kupon artık mağazada değil.', 'error');
    if (!canRent(u)) return toast('Gözlemci rolündeki kullanıcılar kupon alamaz.', 'error');
    if (!hasLedger(u)) return toast('Puanın henüz hesaplanıyor; bir Admin siteyi açınca kupon alabilirsin.', 'info');
    const pts = userPoints(u.id);
    if (pts.available < s.cost) return toast(`Yetersiz puan · ${formatPoints(round2(s.cost - pts.available))} eksik.`, 'error');
    openConfirm({
      title: `${escapeHTML(couponBadge(s))} kuponu alınsın mı?`,
      message: `${escapeHTML(couponTitle(s))}<br/>Puanından <b>${formatPoints(s.cost)}</b> düşecek (kalan ${formatPoints(round2(pts.available - s.cost))}).<br/>Kupon <b>${COUPON_DAYS} gün</b> geçerli; kullanılmazsa puan geri dönmez.`,
      confirmLabel: 'Kuponu Al',
      positive: true,
      iconKey: 'gifts',
      onConfirm: () => {
        closeModal();
        const now = Date.now();
        // Kupon + puan defteri (harcanan) tek batch'te · kural: harcanan ≤ kazanılan
        const me = getUser(u.id);
        const ref = col('coupons').doc();
        const batch = db.batch();
        batch.set(ref, {
          userId: u.id, shopId: s.id, type: couponTypeOf(s), value: couponValueOf(s), free: s.free ?? null, name: s.name || '', cost: s.cost,          boughtAt: isoAt(now),
          expiresAt: Timestamp.fromMillis(now + COUPON_DAYS * DAY_MS),
          usedAt: null, rentalIds: null, bookIds: null, freeBookIds: null, paidTotal: null
        });
        batch.update(col('users').doc(u.id), { pointsSpent: round2(me.pointsSpent + s.cost), lastTx: ref.id, lastTxType: 'couponBuy' });
        run(batch.commit(), `🎟️ ${couponBadge(s)} kuponu alındı · ${COUPON_DAYS} gün içinde kullan`);
      }
    });
  }

  /* Admin: mağazaya kupon ekle / düzenle (yüzde / ₺ / Al-Öde · isteğe bağlı mağaza bitişi).
     Düzenleme yalnızca bundan sonra alınacak kuponları etkiler; önceden alınanlar kendi kopyasını korur. */
  function openShopCouponModal(editId = null) {
    if (!requireAdmin()) return;
    const s = editId ? couponShop.find((x) => x.id === editId) : null;
    if (editId && !s) return toast('Kupon bulunamadı.', 'error');
    const type = s ? couponTypeOf(s) : 'percent';
    const end = s?.endsMs ? new Date(s.endsMs) : new Date(Date.now() + 7 * DAY_MS);
    const pad = (n) => String(n).padStart(2, '0');
    openModal(`
      ${modalHeader(s ? 'Kuponu Düzenle ✏️' : 'Mağazaya Kupon Ekle 🎟️',
        s ? 'Değişiklik bundan sonra alınacak kuponlara uygulanır · önceden alınanlar aynen kalır.' : 'Kullanıcılar puanlarıyla alır · istersen Duyurulara "Duyuru" haberi olarak at.', 'gifts', 'bg-amber-50 text-amber-600')}
      <form data-form="saveShopCoupon" data-edit-id="${s ? s.id : ''}" class="p-5 space-y-3.5" autocomplete="off">
        ${field('Kupon Türü', `<select name="type" id="sc-type" class="${INPUT_CLS}">
          ${Object.entries(COUPON_TYPES).map(([k, t]) => `<option value="${k}" ${k === type ? 'selected' : ''}>${t.label}</option>`).join('')}
        </select>`)}
        <div class="grid grid-cols-2 gap-3">
          <div id="sc-value-wrap">${field(COUPON_TYPES[type].hint, `<input name="value" id="sc-value" type="number" required value="${s ? couponValueOf(s) : ''}" class="${INPUT_CLS}" />`)}</div>
          <div id="sc-free-wrap" class="${type === 'bogo' ? '' : 'hidden'}">${field('Kaçı bedava', `<input name="free" id="sc-free" type="number" min="1" max="4" step="1" value="${s && type === 'bogo' ? couponFreeOf(s) : 1}" class="${INPUT_CLS}" />`)}</div>
          ${field('Bedeli (puan)', `<input name="cost" id="sc-cost" type="number" min="0.01" step="0.01" required value="${s ? s.cost : ''}" class="${INPUT_CLS}" placeholder="Örn. 10" />`)}
        </div>
        ${field('Kupon Adı (isteğe bağlı)', `<input name="name" maxlength="60" value="${escapeHTML(s?.name || '')}" class="${INPUT_CLS}" placeholder="Örn. Bayram Kuponu 🎉" />`)}
        <label class="flex items-center gap-2 text-[11px] text-slate-600">
          <input type="checkbox" name="timed" id="sc-timed" ${s?.endsMs ? 'checked' : ''} class="rounded border-slate-300 text-brand-600" /> ⏳ Süreli kupon (mağazadan belirli bir anda kalksın)
        </label>
        <div id="sc-end-wrap" class="hidden grid grid-cols-[1fr_auto] gap-3">
          ${field('Mağazada Son Gün', `<input name="endDate" type="date" min="${localDateKey()}" value="${localDateKey(end)}" class="${INPUT_CLS} min-w-0" />`)}
          ${field('Saat', `<input name="endTime" type="time" value="${s?.endsMs ? `${pad(end.getHours())}:${pad(end.getMinutes())}` : '23:59'}" class="${INPUT_CLS} w-[6.5rem]" />`)}
        </div>
        <div id="sc-preview" class="text-[11px] text-slate-500 bg-slate-50 rounded-xl px-3 py-2"></div>
        <p class="text-[10px] text-slate-400">Alınan her kupon ${COUPON_DAYS} gün geçerlidir; yalnızca Kiralık ve indirimsiz kitaplara uygulanır.</p>
        ${s ? '' : announceCheckHTML('sc-announce', 'Duyuru')}
        ${formFooter(s ? 'Değişiklikleri Kaydet' : 'Mağazaya Ekle')}
      </form>`);
    updateShopCouponForm();
  }

  function updateShopCouponForm() {
    const type = $('#sc-type')?.value;
    if (!type) return;
    const t = COUPON_TYPES[type];
    const input = $('#sc-value');
    const label = $('#sc-value-wrap label > span');
    if (label) label.textContent = t.hint;
    Object.assign(input, { min: t.min, max: t.max, step: t.step });
    input.placeholder = { percent: 'Örn. 20', amount: 'Örn. 15', bogo: 'Örn. 3' }[type];
    // Al-Öde: bedava sayısı 1 … (alınacak − 1)
    const bogo = type === 'bogo';
    $('#sc-free-wrap').classList.toggle('hidden', !bogo);
    const freeInput = $('#sc-free');
    freeInput.required = bogo;
    const v = Number(input.value);
    if (bogo && v >= 2) freeInput.max = v - 1;
    $('#sc-end-wrap').classList.toggle('hidden', !$('#sc-timed').checked);
    const free = Number(freeInput.value);
    const valid = v >= t.min && v <= t.max && (!bogo || (free >= 1 && free < v));
    $('#sc-preview').innerHTML = valid
      ? `Mağazada: <b class="text-slate-700">${escapeHTML(couponTitle({ type, value: type === 'amount' ? round2(v) : Math.round(v), free }))}</b>${bogo ? ` · ${bogoText({ value: v, free })}` : ''}`
      : bogo && v >= 2 ? `Bedava sayısı 1–${v - 1} arası olmalı.` : 'Değeri girince kuponun mağazadaki adı burada görünür.';
  }

  function handleSaveShopCoupon(fd, editId) {
    if (!requireAdmin()) return;
    const prev = editId ? couponShop.find((x) => x.id === editId) : null;
    if (editId && !prev) return toast('Kupon bulunamadı.', 'error');
    const type = COUPON_TYPES[fd.type] ? fd.type : null;
    if (!type) return toast('Kupon türü seçin.', 'error');
    const t = COUPON_TYPES[type];
    const value = type === 'amount' ? round2(parseFloat(fd.value)) : parseInt(fd.value, 10);
    if (!(value >= t.min && value <= t.max)) return toast(`${t.hint}: ${t.min}–${t.max} arası olmalı.`, 'error');
    let free = null;
    if (type === 'bogo') {
      free = parseInt(fd.free, 10);
      if (!(free >= 1 && free < value)) return toast(`Bedava kitap sayısı 1–${value - 1} arası olmalı.`, 'error');
    }
    const cost = round2(parseFloat(fd.cost));
    if (!(cost > 0)) return toast('Kupon bedeli (puan) 0\'dan büyük olmalı.', 'error');
    const name = (fd.name || '').trim();
    let endsAt = null;
    if (fd.timed === 'on') {
      if (!isDateKey(fd.endDate) || !isTimeKey(fd.endTime)) return toast('Geçerli bir bitiş tarihi ve saati seçin.', 'error');
      const end = dateFromKey(fd.endDate);
      end.setHours(...fd.endTime.split(':').map(Number), 0, 0);
      if (end.getTime() <= Date.now()) return toast('Bitiş anı geçmiş olamaz.', 'error');
      endsAt = Timestamp.fromDate(end);
    }
    const s = { type, value, free, name, cost };

    if (prev) {
      closeModal();
      run(col('couponShop').doc(prev.id).update({ ...s, endsAt, updatedAt: isoAt(Date.now()) }),
        `🎟️ Kupon güncellendi · ${couponBadge(s)} (önceden alınanlar aynen kalır)`);
      return;
    }

    const batch = db.batch();
    batch.set(col('couponShop').doc(), { ...s, endsAt, createdAt: isoAt(Date.now()), createdBy: state.currentUserId });
    // İşaretliyse "Duyuru" haberi
    if (fd.announce === 'on') batch.set(col('announcements').doc(), {
      type: 'news', category: 'Duyuru',
      title: `Yeni kupon: ${couponBadge(s)}${name ? ` · ${name}` : ''} 🎟️`,
      body: `Hediyelerim mağazasına yeni kupon geldi! 🎉\n🎟️ ${couponTitle(s)}\n⭐ Bedeli: ${formatPoints(cost)} · alındıktan sonra ${COUPON_DAYS} gün geçerli`
        + (type === 'bogo' ? `\n📚 ${bogoText(s)}!` : '')
        + (endsAt ? `\n⏳ Mağazada son: ${formatDate(endsAt.toDate().toISOString(), true)}` : '')
        + '\nPuanların yetiyorsa Hediyelerim sayfasından hemen al!',
      bookId: null, authorId: state.currentUserId, createdAt: isoAt(Date.now()), pinned: false, readBy: []
    });
    closeModal();
    run(batch.commit(), `🎟️ ${couponBadge(s)} kuponu mağazaya eklendi${fd.announce === 'on' ? ' · Duyurular\'a haber düştü 📣' : ''}`);
  }

  /* --- Hediye çekleri (₺) · Admin gönderir, sahibi Kiralık + indirimsiz kitabı kiralarken seçer --- */
  function chequeCardHTML(c, now = Date.now(), withAction = true) {
    const st = chequeState(c, now);
    const pts = userPoints(c.userId);
    const enough = hasLedger(getUser(c.userId)) && pts.available >= c.cost;
    return `
      <div class="cheque-card relative overflow-hidden rounded-2xl p-4 text-white shadow-soft">
        <span class="absolute inset-0 offer-pattern opacity-40"></span>
        <span class="cheque-notch left"></span><span class="cheque-notch right"></span>
        <div class="relative flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[9px] font-extrabold tracking-[.2em] opacity-90">🎁 HEDİYE ÇEKİ</p>
            <p class="text-3xl font-black leading-none mt-1.5 drop-shadow">${formatMoney(c.amount)}</p>
            ${c.name ? `<p class="text-[11px] font-semibold mt-1 truncate">${escapeHTML(c.name)}</p>` : ''}
          </div>
          <p class="text-[10px] text-right opacity-90 shrink-0">Son kullanma<br/><b>${formatDate(new Date(c.expiresMs).toISOString(), true)}</b></p>
        </div>
        <p class="relative text-[10px] opacity-90 mt-2.5 leading-snug">Kiralık ve indirimsiz bir kitabı kiralarken seç · tutar fiyattan düşülür.</p>
        ${withAction && st === 'locked' ? `
          <button type="button" data-open-cheque="${c.id}" ${enough ? '' : 'disabled'}
            class="relative mt-3 w-full py-2 rounded-xl text-xs font-bold text-emerald-800 bg-white hover:bg-white/90 shadow-soft transition disabled:opacity-60 disabled:cursor-not-allowed">
            ${enough ? `⭐ ${formatPoints(c.cost)} ile çeki aç` : `⭐ ${formatPoints(c.cost)} gerekiyor · ${formatPoints(Math.max(0, round2(c.cost - pts.available)))} eksik`}
          </button>`
          : st === 'active' ? '<span class="relative inline-flex mt-3 text-[10px] font-bold bg-white/20 px-2.5 py-1 rounded-full">✓ Kullanıma hazır</span>' : ''}
      </div>`;
  }

  /* Hediyelerim: kullanıcının açık (kullanılabilir) ve kilitli (puanla açılacak) çekleri */
  function myChequesHTML(userId, now = Date.now()) {
    const list = chequesOf(userId).filter((c) => ['active', 'locked'].includes(chequeState(c, now)))
      .sort((a, b) => (a.openedAt ? 1 : 0) - (b.openedAt ? 1 : 0) || a.expiresMs - b.expiresMs);
    if (!list.length) return '';
    return `
      <div class="mb-6">
        <h2 class="text-sm font-bold text-slate-800 mb-3">🎁 Hediye Çeklerim</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">${list.map((c) => chequeCardHTML(c, now)).join('')}</div>
      </div>`;
  }

  /* Admin: gönderilen çekler (son 30) · durum + sil */
  function sentChequesHTML(now = Date.now()) {
    const list = [...giftCheques].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (!list.length) return '';
    const label = { active: ['✓ Açık', 'bg-emerald-50 text-emerald-600'], locked: ['🔒 Puanla açılacak', 'bg-amber-50 text-amber-700'],
      used: ['Kullanıldı', 'bg-slate-100 text-slate-500'], expired: ['Süresi doldu', 'bg-rose-50 text-rose-500'] };
    return `
      <details class="mb-6 bg-white rounded-2xl shadow-soft p-4">
        <summary class="cursor-pointer text-xs font-bold text-slate-700">🛡️ Gönderilen Hediye Çekleri <span class="text-slate-400 font-medium">· ${list.length}</span></summary>
        <ul class="mt-3 space-y-1.5">${list.slice(0, 30).map((c) => {
          const u = getUser(c.userId);
          const [txt, tone] = label[chequeState(c, now)];
          return `
            <li class="flex items-center gap-2.5 p-2 rounded-xl border border-slate-100">
              ${u ? avatarHTML(u, 'w-6 h-6 text-[10px]') : ''}
              <span class="min-w-0 flex-1">
                <span class="block text-xs font-semibold text-slate-700 truncate">${escapeHTML(u?.name || 'Silinmiş kullanıcı')} · ${formatMoney(c.amount)}</span>
                <span class="block text-[10px] text-slate-400">${c.cost > 0 ? `⭐ ${formatPoints(c.cost)}` : 'Ücretsiz'} · ${relativeDay(c.createdAt)}${c.name ? ` · ${escapeHTML(c.name)}` : ''}</span>
              </span>
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${tone} shrink-0">${txt}</span>
              <button type="button" data-delete-cheque="${c.id}" title="Sil" aria-label="Çeki sil" class="${BTN_ICON} text-slate-300 hover:text-rose-500 hover:bg-rose-50 shrink-0">${icon('trash', 'w-3.5 h-3.5 pointer-events-none')}</button>
            </li>`;
        }).join('')}</ul>
      </details>`;
  }

  function openSendChequeModal() {
    if (!requireAdmin()) return;
    const defaultEnd = localDateKey(new Date(Date.now() + CHEQUE_DAYS * DAY_MS));
    openModal(`
      ${modalHeader('Hediye Çeki Gönder 🎁', 'Seçtiğin kişilerin önüne siteyi açınca çıkar · Kiralık ve indirimsiz kitaplarda kullanılır.', 'gifts', 'bg-emerald-50 text-emerald-600')}
      <form data-form="sendCheque" class="p-5 space-y-3.5" autocomplete="off">
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[11px] font-semibold text-slate-600">Kime</span>
            <label class="flex items-center gap-1.5 text-[11px] text-brand-600 font-semibold cursor-pointer"><input type="checkbox" id="chq-all" class="rounded border-slate-300 text-brand-600" /> Herkes</label>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            ${users.map((u) => `
              <label class="flex items-center gap-2 p-2 rounded-xl border border-slate-100 hover:border-brand-200 cursor-pointer text-xs">
                <input type="checkbox" name="to" value="${u.id}" data-chq-user class="rounded border-slate-300 text-brand-600" />
                ${avatarHTML(u, 'w-6 h-6 text-[10px]')}<span class="truncate">${escapeHTML(u.name)}</span>
              </label>`).join('')}
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          ${field('Tutar (₺)', `<input name="amount" type="number" min="1" max="10000" step="0.01" required inputmode="decimal" class="${INPUT_CLS}" placeholder="Örn. 20" />`)}
          ${field('Açma bedeli (puan)', `<input name="cost" type="number" min="0" step="0.01" value="0" class="${INPUT_CLS}" />`, '0 = ücretsiz · puanlıysa kişi kendi puanıyla açar')}
        </div>
        ${field('Çek Adı (isteğe bağlı)', `<input name="name" maxlength="60" class="${INPUT_CLS}" placeholder="Örn. Doğum Günü Hediyesi 🎂" />`)}
        <div class="grid grid-cols-[1fr_auto] gap-3">
          ${field('Son Kullanma Tarihi', `<input name="endDate" type="date" required min="${localDateKey()}" value="${defaultEnd}" class="${INPUT_CLS} min-w-0" />`)}
          ${field('Saat', `<input name="endTime" type="time" required value="23:59" class="${INPUT_CLS} w-[6.5rem]" />`)}
        </div>
        ${formFooter('Çeki Gönder')}
      </form>`);
  }

  function handleSendCheque(form) {
    if (!requireAdmin()) return;
    const fd = new FormData(form);
    const to = fd.getAll('to').filter((id) => getUser(id));
    const amount = round2(parseFloat(fd.get('amount')));
    const cost = round2(parseFloat(fd.get('cost')) || 0);
    const name = String(fd.get('name') || '').trim();
    if (!to.length) return toast('En az bir kişi seçin.', 'error');
    if (!(amount > 0 && amount <= 10000)) return toast('Tutar 0\'dan büyük olmalı.', 'error');
    if (!(cost >= 0)) return toast('Açma bedeli 0 ya da daha büyük olmalı.', 'error');
    const key = String(fd.get('endDate') || '');
    const time = String(fd.get('endTime') || '');
    if (!isDateKey(key) || !isTimeKey(time)) return toast('Geçerli bir son kullanma tarihi ve saati seçin.', 'error');
    const end = dateFromKey(key);
    end.setHours(...time.split(':').map(Number), 0, 0);
    if (end.getTime() <= Date.now()) return toast('Son kullanma anı geçmiş olamaz.', 'error');
    const now = isoAt(Date.now());
    const batch = db.batch();
    to.forEach((userId) => batch.set(col('giftCheques').doc(), {
      userId, amount, cost, name,
      createdAt: now, createdBy: state.currentUserId, expiresAt: Timestamp.fromDate(end),
      openedAt: cost > 0 ? null : now, seenAt: null, usedAt: null, rentalId: null
    }));
    closeModal();
    run(batch.commit(), `🎁 ${formatMoney(amount)} hediye çeki ${to.length} kişiye gönderildi${cost > 0 ? ` · ⭐ ${formatPoints(cost)} ile açılır` : ''}`);
  }

  /* Puanlı çeki aç: çek + puan defteri (harcanan) tek batch'te · kural: harcanan ≤ kazanılan */
  function openChequeWithPoints(id) {
    const u = currentUser();
    const c = giftCheques.find((x) => x.id === id);
    if (!u || !c || c.userId !== u.id || chequeState(c) !== 'locked') return toast('Bu çek açılamaz.', 'error');
    if (!hasLedger(u)) return toast('Puanın henüz hesaplanıyor; bir Admin siteyi açınca çeki açabilirsin.', 'info');
    const pts = userPoints(u.id);
    if (pts.available < c.cost) return toast(`Yetersiz puan · ${formatPoints(round2(c.cost - pts.available))} eksik.`, 'error');
    openConfirm({
      title: `${formatMoney(c.amount)} hediye çeki açılsın mı?`,
      message: `Puanından <b>${formatPoints(c.cost)}</b> düşecek (kalan ${formatPoints(round2(pts.available - c.cost))}).<br/>Çek açılınca Kiralık ve indirimsiz bir kitabı kiralarken kullanabilirsin.`,
      confirmLabel: 'Çeki Aç',
      positive: true,
      iconKey: 'gifts',
      onConfirm: () => {
        closeModal();
        const me = getUser(u.id);
        const batch = db.batch();
        batch.update(col('giftCheques').doc(c.id), { openedAt: isoAt(Date.now()) });
        batch.update(col('users').doc(u.id), { pointsSpent: round2(me.pointsSpent + c.cost), lastTx: c.id, lastTxType: 'chequeOpen' });
        run(batch.commit(), `🎁 ${formatMoney(c.amount)} hediye çeki açıldı · kiralarken seçebilirsin`);
      }
    });
  }

  /* Admin: çeki sil · puanla açılmışsa puan defteri yeniden hesaplanır (bedeli geri döner) */
  function deleteCheque(id) {
    if (!requireAdmin()) return;
    const c = giftCheques.find((x) => x.id === id);
    if (!c) return;
    const u = getUser(c.userId);
    openConfirm({
      title: 'Hediye çeki silinsin mi?',
      message: `${escapeHTML(u?.name || 'Kullanıcı')} kullanıcısının ${formatMoney(c.amount)} çeki silinecek.${c.openedAt && c.cost > 0 && !c.usedAt ? ` Açmak için harcadığı <b>${formatPoints(c.cost)}</b> geri döner.` : ''} Çekle yapılmış kiralama varsa korunur.`,
      onConfirm: () => {
        closeModal();
        run(commitOps([(bt) => bt.delete(col('giftCheques').doc(c.id)), ...(u ? pointsSyncOps([u.id], { cheques: new Set([c.id]) }) : [])]),
          'Hediye çeki silindi.', 'info');
      }
    });
  }

  /* Siteyi açınca: yeni gelen (görülmemiş) çekler kutlamalı bir pencerede gösterilir ve görüldü işaretlenir */
  function showChequePopup() {
    const u = currentUser();
    if (!u || state.modalOpen) return;
    const now = Date.now();
    const fresh = chequesOf(u.id).filter((c) => !c.seenAt && ['active', 'locked'].includes(chequeState(c, now))
      && !state.purgePending.has(`chqseen:${c.id}`));
    if (!fresh.length) return;
    fresh.forEach((c) => state.purgePending.add(`chqseen:${c.id}`));
    commitOps(fresh.map((c) => (bt) => bt.update(col('giftCheques').doc(c.id), { seenAt: isoAt(now) }))).catch((e) => console.error(e));
    openModal(`
      <div class="relative p-6 text-center bg-gradient-to-br from-emerald-400 via-teal-500 to-sky-500 text-white overflow-hidden">
        <span class="absolute inset-0 offer-pattern opacity-40"></span>
        ${confettiHTML(18)}
        <p class="relative text-4xl">🎁</p>
        <h3 class="relative text-lg font-black mt-2">${fresh.length > 1 ? `${fresh.length} hediye çeki geldi!` : 'Sana hediye çeki geldi!'}</h3>
        <p class="relative text-xs text-white/90 mt-1">Kiralık ve indirimsiz bir kitabı kiralarken kullanabilirsin.</p>
      </div>
      <div class="p-5 space-y-3">
        ${fresh.map((c) => chequeCardHTML(c, now)).join('')}
        <div class="grid grid-cols-2 gap-2.5 pt-1">
          <button type="button" data-modal-close class="${BTN_SOFT} !py-2.5">Kapat</button>
          <a href="#gifts" data-modal-close class="${BTN_PRIMARY} !py-2.5">Hediyelerim'e git</a>
        </div>
      </div>`);
  }

  function deleteShopCoupon(id) {
    if (!requireAdmin()) return;
    const s = couponShop.find((x) => x.id === id);
    if (!s) return;
    openConfirm({
      title: 'Kupon mağazadan kaldırılsın mı?',
      message: `"${escapeHTML(couponTitle(s))}" mağazadan kaldırılacak. <b>Daha önce alınmış kuponlar geçerliliğini korur.</b>`,
      confirmLabel: 'Kaldır',
      onConfirm: () => {
        closeModal();
        run(col('couponShop').doc(id).delete(), 'Kupon mağazadan kaldırıldı.', 'info');
      }
    });
  }

  /* --- Kupon kullanımı (tek ödeme kaydı: kullanıcı belgesinde lastTx = kupon, lastTxType 'coupon') ---
     Her kiralama kendi kitabını kilitler; kupon aynı batch'te usedAt + rentalIds + paidTotal ile kapanır. */
  function couponRentOps(batch, u, coupon, lines) {
    const now = Date.now();
    const rentalIds = [];
    lines.forEach(({ book: b, price }) => {
      const due = now + (b.rentalDays || DEFAULT_RENTAL_DAYS) * DAY_MS;
      const ref = col('rentals').doc();
      rentalIds.push(ref.id);
      batch.set(ref, {
        bookId: b.id, userId: u.id,
        listPrice: b.price, price,
        discount: b.price > 0 ? Math.round((1 - price / b.price) * 100) : 0, discountSource: 'coupon',
        offerId: null, purchaseId: null, offerPrice: null, couponId: coupon.id,
        rentedAt: isoAt(now), dueAt: isoAt(due), returnedAt: null
      });
      batch.update(bookRef(b.id), { lockUntil: Timestamp.fromMillis(due), lockBy: u.id, lockRental: ref.id });
    });
    const paidTotal = round2(sum(lines, (l) => l.price));
    batch.update(col('coupons').doc(coupon.id), {
      usedAt: isoAt(now), rentalIds, bookIds: lines.map((l) => l.book.id),
      freeBookIds: lines.filter((l) => l.free).map((l) => l.book.id), paidTotal
    });
    batch.update(col('users').doc(u.id), { balance: round2(u.balance - paidTotal), lastTx: coupon.id, lastTxType: 'coupon' });
    return paidTotal;
  }

  /* Al-Öde: N kitap seçilir, en düşük fiyatlı F tanesi bedava */
  function openBogoModal(couponId) {
    const u = currentUser();
    const c = coupons.find((x) => x.id === couponId);
    if (!u || !c || c.userId !== u.id || couponState(c) !== 'active' || couponTypeOf(c) !== 'bogo') return toast('Bu kupon kullanılamaz.', 'error');
    const n = couponValueOf(c);
    const nowD = new Date();
    const pool = visibleBooks().filter((b) => couponEligible(b, nowD)).sort((a, b) => a.title.localeCompare(b.title, 'tr'));
    if (pool.length < n) return toast(`Bu kupon için ${n} uygun kitap gerekiyor; şu an ${pool.length} kiralık ve indirimsiz boşta kitap var.`, 'info');
    const opts = pool.map((b) => `<option value="${b.id}">${escapeHTML(b.title)} · ${formatMoney(b.price)}</option>`).join('');
    openModal(`
      ${modalHeader(`${escapeHTML(couponBadge(c))} Kuponu 🎟️`, `${bogoText(c)}.`, 'gifts', 'bg-fuchsia-50 text-fuchsia-600')}
      <form data-form="useBogo" data-coupon-id="${c.id}" class="p-5 space-y-3" autocomplete="off">
        ${Array.from({ length: n }, (_, i) => field(`${i + 1}. kitap`, `<select name="b${i}" data-bogo-slot class="${INPUT_CLS}" required>
          <option value="">Kitap seç…</option>${opts}</select>`)).join('')}
        <div id="bogoSummary" class="text-xs bg-slate-50 rounded-xl px-3 py-2.5"></div>
        ${formFooter('Kuponla Kirala')}
      </form>`);
    updateBogoSummary();
  }

  /* Seçili kitaplar → satırlar: en düşük fiyatlı freeCount tanesi bedava (eşitse önce seçilen) */
  function bogoLines(ids, freeCount = 1) {
    const bs = ids.map(getBook).filter(Boolean);
    const freeIdx = new Set(bs.map((b, i) => i).sort((a, b) => bs[a].price - bs[b].price || a - b).slice(0, freeCount));
    return bs.map((b, i) => ({ book: b, price: freeIdx.has(i) ? 0 : b.price, free: freeIdx.has(i) }));
  }

  function updateBogoSummary() {
    const box = $('#bogoSummary');
    if (!box) return;
    const c = coupons.find((x) => x.id === box.closest('form')?.dataset.couponId);
    const ids = [...$$('[data-bogo-slot]')].map((s) => s.value).filter(Boolean).map(Number);
    if (!ids.length) { box.innerHTML = '<span class="text-slate-400">Kitapları seçince ödenecek tutar burada görünür.</span>'; return; }
    if (new Set(ids).size !== ids.length) { box.innerHTML = '<span class="text-rose-500">Aynı kitap iki kez seçilemez.</span>'; return; }
    const lines = bogoLines(ids, Math.min(couponFreeOf(c), ids.length));
    const total = sum(lines, (l) => l.price);
    const u = currentUser();
    box.innerHTML = `${lines.map((l) => `<p class="flex justify-between gap-2"><span class="truncate">${escapeHTML(l.book.title)}</span>
        <b class="${l.free ? 'text-emerald-600' : 'text-slate-700'} shrink-0">${l.free ? '🎁 BEDAVA' : formatMoney(l.price)}</b></p>`).join('')}
      <p class="flex justify-between gap-2 mt-1.5 pt-1.5 border-t border-slate-200"><span>Ödenecek</span><b class="text-brand-600">${formatMoney(total)}</b></p>
      ${u.balance < total ? `<p class="text-rose-500 mt-1">Yetersiz bakiye · ${formatMoney(round2(total - u.balance))} eksik.</p>` : ''}`;
  }

  async function handleUseBogo(form) {
    const u = currentUser();
    const c = coupons.find((x) => x.id === form.dataset.couponId);
    if (!u || !c || couponState(c) !== 'active') return toast('Bu kupon artık kullanılamaz.', 'error');
    const n = couponValueOf(c);
    const ids = [...$$('[data-bogo-slot]')].map((s) => Number(s.value)).filter(Boolean);
    if (ids.length !== n) return toast(`${n} kitap seçmelisin.`, 'error');
    if (new Set(ids).size !== n) return toast('Aynı kitap iki kez seçilemez.', 'error');
    const nowD = new Date();
    const bad = ids.map(getBook).find((b) => !b || !couponEligible(b, nowD));
    if (bad) return toast(`"${bad?.title || 'Kitap'}" artık uygun değil (kirada, indirimde ya da kiralık değil).`, 'error');
    const lines = bogoLines(ids, couponFreeOf(c));
    const total = round2(sum(lines, (l) => l.price));
    if (!canRent(u)) return toast('Gözlemci rolündeki kullanıcılar kiralama yapamaz.', 'error');
    if (u.balance < total) return toast(`Yetersiz bakiye. ${formatMoney(round2(total - u.balance))} eksik.`, 'error');
    const batch = db.batch();
    couponRentOps(batch, u, c, lines);
    closeModal();
    const freeTitles = lines.filter((l) => l.free).map((l) => `"${l.book.title}"`).join(', ');
    await run(batch.commit(), `🎟️ ${couponBadge(c)}: ${n} kitap kiralandı · ${freeTitles} bedava · ${formatMoney(total)}`);
  }

  /* ==========================================================
     13) ÖZEL TEKLİFLER — 1–3 KİTAPLI VİTRİN
     ========================================================== */
  const OFFER_MAX_BOOKS = 3;
  const offerCountLabel = (o) => `${o.items.length} kitap`;
  /* Son geçerlilik: validUntil (gün) + validTime ('SS:DD'); saati olmayan eski teklifler gün sonunda biter */
  const isTimeKey = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t || '');
  const offerEnd = (o) => {
    const d = dateFromKey(o.validUntil);
    if (isTimeKey(o.validTime)) { const [h, m] = o.validTime.split(':').map(Number); d.setHours(h, m, 0, 0); }
    else d.setHours(23, 59, 59, 999);
    return d;
  };
  /* season damgalı teklif kaldırılan Kış Fırsatları'nın tarihsiz paketidir: süresi dolmuş sayılır (Admin açınca silinir) */
  const isOfferActive = (o, now = new Date()) => !o.season && offerEnd(o) > now;
  const offerBooks = (o) => o.items.map((it) => getBook(it.bookId)).filter(Boolean);
  const offerNormalTotal = (o) => sum(offerBooks(o), (b) => b.price);
  /* Paket indirimi Admin'in girdiği yüzdedir (rate) · fiyat kitapların güncel fiyatından hesaplanır
     (kural aynı hesabı yapar) · yüzdesi olmayan eski tekliflerde kayıtlı fiyat geçerlidir */
  const hasOfferRate = (o) => Number.isInteger(o?.rate) && o.rate >= 0 && o.rate <= 100;
  const offerPrice = (o) => (hasOfferRate(o) ? round2(offerNormalTotal(o) * (100 - o.rate) / 100) : o.price);
  const offerRate = (o) => { if (hasOfferRate(o)) return o.rate; const n = offerNormalTotal(o); return n > 0 ? Math.max(0, Math.round((1 - o.price / n) * 100)) : 0; };
  const offerPurchaseCount = (o) => offerPurchases.filter((p) => p.offerId === o.id).length;

  /* Süresi biten teklifler vitrinden direkt silinir (kiralamalar ve istatistikler korunur).
     Herkes için yerel listeden çıkarılır; siteyi açan herkes Firestore'dan da siler (kural süre dolmuş mu denetler ·
     reddedilirse bu oturumda yeniden denenmez). */
  function purgeExpiredOffers(now = new Date()) {
    const before = offers.length;
    for (let i = offers.length - 1; i >= 0; i--) {
      const o = offers[i];
      if (isOfferActive(o, now)) continue;
      offers.splice(i, 1);
      if (currentUser() && !state.purgePending.has(o.id)) {
        state.purgePending.add(o.id);
        col('offers').doc(o.id).delete().catch((e) => console.error(e));
      }
    }
    return offers.length !== before;
  }

  /* Teklifin son anı (Timestamp) · kural, satın alımın bu andan önce olduğunu denetler */
  const offerEndsAt = (validUntil, validTime) => Timestamp.fromDate(offerEnd({ validUntil, validTime }));

  /* Kapaklar yan yana, hafif üst üste — 3D derinlikli vitrin (1, 2 veya 3 kapak) */
  function showcaseHTML(o, size = 'md') {
    const dims = size === 'lg' ? 'w-28 h-40 sm:w-32 sm:h-48' : 'w-24 h-36';
    const items = o.items.slice(0, OFFER_MAX_BOOKS);
    const pos = items.length === 1 ? ['sc-solo'] : items.length === 2 ? ['sc-duo-0', 'sc-duo-1'] : ['sc-0', 'sc-1', 'sc-2'];
    const covers = items.map((it, i) => {
      const b = getBook(it.bookId);
      return `<div class="sc ${pos[i]} rounded-xl overflow-hidden shadow-2xl ring-2 ring-white/70">${coverHTML(b, 'fill', it.cover)}</div>`;
    }).join('');
    return `
      <div class="showcase relative flex items-center justify-center">
        <div class="sc-stage relative ${dims}">${covers}</div>
        <div class="absolute -bottom-4 left-1/2 -translate-x-1/2 w-56 h-5 rounded-full bg-black/25 blur-md"></div>
      </div>`;
  }

  /* Vitrin şeması indirim yüzdesine göre: arka plan + yıldız rozetteki yüzde rengi + etiket */
  function offerScheme(rate) {
    if (rate >= 70) return { bg: 'offer-ultra-bg', text: 'from-indigo-700 via-fuchsia-600 to-amber-500', label: '⚡ ŞİMŞEK FIRSAT', spin: true, ultra: true };
    if (rate >= 50) return { bg: 'offer-mega-bg', text: 'from-fuchsia-600 via-rose-500 to-amber-500', label: '🎉 MEGA FIRSAT', spin: true };
    if (rate >= 35) return { bg: 'bg-gradient-to-br from-rose-500 via-orange-500 to-amber-400', text: 'from-rose-600 to-orange-500', label: '🔥 SÜPER FIRSAT' };
    if (rate >= 20) return { bg: 'bg-gradient-to-br from-violet-600 via-fuchsia-500 to-pink-500', text: 'from-violet-600 to-fuchsia-500', label: '💜 FIRSAT' };
    if (rate > 0)   return { bg: 'bg-gradient-to-br from-sky-500 via-brand-600 to-indigo-700', text: 'from-brand-600 to-indigo-600', label: '' };
    return { bg: 'bg-gradient-to-br from-slate-500 to-slate-700', text: 'from-slate-600 to-slate-800', label: '' };
  }

  /* %70+ vitrin: gökten inen, dallanan beyaz şimşekler + gökyüzü parlaması (offer-ultra-bg zemininde) */
  const ULTRA_BOLTS = [
    { cls: 'b1',
      main: 'M22 0 L25 8 L20 15 L27 23 L23 32 L30 40 L26 49 L32 57 L28 66 L31 72',
      branches: ['M20 15 L14 21 L12 28 L8 32', 'M23 32 L17 38 L15 44', 'M30 40 L37 45 L39 51 L44 55', 'M26 49 L21 55'] },
    { cls: 'b2',
      main: 'M77 0 L73 7 L79 14 L73 24 L80 32 L74 41 L81 50 L77 58',
      branches: ['M79 14 L85 19 L88 26', 'M73 24 L67 30 L66 36 L62 40', 'M80 32 L86 39 L87 45'] }
  ];
  const ultraBoltsHTML = () => `
    <span class="ultra-flash"></span><span class="ultra-flash f2"></span>
    <span class="ultra-bolts" aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        ${ULTRA_BOLTS.map((b) => `<g class="${b.cls}"><path class="main" d="${b.main}"/>${b.branches.map((d) => `<path class="branch" d="${d}"/>`).join('')}</g>`).join('')}
      </svg>
    </span>`;

  /* Köşedeki yıldız rozet: büyük, çarpıcı indirim yüzdesi (mega'da arka yıldız döner) */
  function offerBurstHTML(rate, size = 'md') {
    const sc = offerScheme(rate);
    const box = size === 'lg' ? 'w-24 h-24 sm:w-28 sm:h-28' : 'w-20 h-20 sm:w-[5.5rem] sm:h-[5.5rem]';
    const num = size === 'lg' ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-[1.7rem]';
    return `
      <div class="relative ${box} shrink-0 -rotate-[10deg] drop-shadow-xl ${rate >= 50 ? 'rate-pop' : ''}">
        <span class="absolute inset-0 offer-burst bg-white ${sc.spin ? 'burst-spin' : ''}"></span>
        <span class="absolute inset-[9%] offer-burst bg-gradient-to-br ${sc.text} opacity-10"></span>
        <span class="relative h-full flex flex-col items-center justify-center leading-none">
          <span class="${num} font-black tracking-tighter bg-gradient-to-br ${sc.text} bg-clip-text text-transparent">%${rate}</span>
          <span class="text-[9px] font-extrabold tracking-[0.15em] text-slate-700 mt-0.5">İNDİRİM</span>
        </span>
      </div>`;
  }

  function offerRentCheck(o, user) {
    if (!canRent(user)) return { ok: false, reason: 'Gözlemci rolündeki kullanıcılar kiralama yapamaz.' };
    if (!isOfferActive(o)) return { ok: false, reason: 'Bu teklifin süresi doldu.' };
    const bs = offerBooks(o);
    if (!bs.length || bs.length < o.items.length) return { ok: false, reason: 'Paketteki kitaplardan biri artık kitaplıkta yok.' };
    const notRentable = bs.find((b) => !isRentableStatus(b) || !hasPrice(b));
    if (notRentable) return { ok: false, reason: `"${notRentable.title}" şu an kiralanamaz (${statusView(notRentable).label}).` };
    const rented = bs.find((b) => isBookRented(b) || isBookLocked(b));
    if (rented) return { ok: false, reason: `"${rented.title}" şu an kirada.` };
    if (user.balance < offerPrice(o)) return { ok: false, reason: `Yetersiz bakiye. ${formatMoney(offerPrice(o) - user.balance)} eksik.` };
    return { ok: true };
  }

  function renderOffers() {
    const admin = isAdmin();
    setPageActions('offers', admin
      ? `<button type="button" data-quick="addOffer" class="${BTN_PRIMARY}">${icon('plus', 'w-3.5 h-3.5')}Teklif Ekle</button>`
      : '');

    const now = new Date();
    purgeExpiredOffers(now);
    const u = currentUser();
    const list = [...offers].sort((a, b) => offerEnd(a) - offerEnd(b));

    const notice = `
      <div class="flex items-start gap-2.5 bg-white/70 border border-brand-100 rounded-2xl px-4 py-3 mb-5 text-xs text-slate-500">
        <span class="text-brand-500 shrink-0 mt-px">${icon('info')}</span>
        <span>${admin
          ? 'Admin olarak 1–3 kitaplık paketler ekleyip düzenleyebilir ve silebilirsin. Süresi biten teklifler otomatik olarak silinir. Bir üye teklifi kiraladığında paketteki kitapların hepsi birden kiralık olur.'
          : 'Bir teklifi kiraladığında paketteki kitapların hepsi birden senin olur; bakiyenden sadece paket fiyatı düşer.'}</span>
      </div>`;

    if (!list.length) {
      $('#offersContent').innerHTML = notice + emptyState('Şu an aktif bir özel teklif bulunmuyor.');
      return;
    }

    $('#offersContent').innerHTML = notice + `
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        ${list.map((o) => {
          const daysLeft = Math.ceil((offerEnd(o) - now) / DAY_MS);
          const check = offerRentCheck(o, u);
          const bs = offerBooks(o);
          const rate = offerRate(o);
          const tier = dealTier(rate);
          const sc = offerScheme(rate);
          const saving = Math.max(0, round2(offerNormalTotal(o) - offerPrice(o)));
          return `
            <article class="showcase-host bg-white rounded-3xl shadow-soft overflow-hidden flex flex-col transition duration-300 hover:shadow-soft-lg hover:-translate-y-1 ${sc.ultra ? 'ultra-glow' : tier ? `deal-${tier}` : ''}">
              <div data-open-offer="${o.id}" class="offer-sheen relative h-60 sm:h-64 ${sc.bg} cursor-pointer overflow-hidden">
                <span class="absolute inset-0 offer-pattern"></span>
                ${sc.ultra ? ultraBoltsHTML() : ''}
                <span class="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-white/15"></span>
                <span class="absolute -left-10 -bottom-14 w-36 h-36 rounded-full bg-black/10"></span>
                ${tier === 'mega' && !sc.ultra ? confettiHTML(18) : ''}
                <div class="absolute top-2.5 left-2.5 z-10">${offerBurstHTML(rate)}</div>
                <div class="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5">
                  <span class="text-[10px] font-semibold text-white bg-black/20 backdrop-blur px-2 py-1 rounded-full">🎁 ${offerCountLabel(o)}</span>
                  ${sc.label ? `<span class="text-[10px] font-extrabold text-slate-800 bg-white px-2 py-1 rounded-full shadow-soft">${sc.label}</span>` : ''}
                </div>
                <div class="absolute inset-0 flex items-center justify-center pt-6 pb-8">${showcaseHTML(o)}</div>
                ${saving ? `<span class="absolute bottom-3 left-3 z-10 text-[11px] font-extrabold text-emerald-700 bg-white/95 px-2.5 py-1.5 rounded-xl shadow-soft">${formatMoney(saving)} kazanç</span>` : ''}
                <div class="absolute bottom-3 right-3 z-10 text-right bg-white/95 backdrop-blur rounded-2xl px-3 py-1.5 sm:px-3.5 sm:py-2 shadow-soft-lg">
                  <p class="text-[10px] text-slate-400 line-through leading-none">${formatMoney(offerNormalTotal(o))}</p>
                  <p class="text-xl sm:text-2xl font-black text-slate-800 leading-tight">${formatMoney(offerPrice(o))}</p>
                </div>
              </div>
              <div class="p-4 flex-1 flex flex-col">
                <div class="flex items-start justify-between gap-2">
                  <h3 class="text-sm font-bold text-slate-800 leading-snug">${escapeHTML(o.title)}</h3>
                  ${admin ? `
                    <div class="flex gap-1 shrink-0 -mt-1 -mr-1">
                      <button type="button" data-edit-offer="${o.id}" title="Düzenle" class="${BTN_ICON} text-slate-400 hover:text-brand-600 hover:bg-brand-50">${icon('pencil', 'w-3.5 h-3.5')}</button>
                      <button type="button" data-delete-offer="${o.id}" title="Sil" class="${BTN_ICON} text-slate-400 hover:text-rose-500 hover:bg-rose-50">${icon('trash', 'w-3.5 h-3.5')}</button>
                    </div>` : ''}
                </div>
                <p class="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">${escapeHTML(o.description)}</p>
                <div class="flex flex-wrap gap-1 mt-2.5">${bs.map((b) => `<span class="text-[10px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full truncate max-w-[10rem]">${escapeHTML(b.title)}</span>`).join('')}</div>
                <div class="mt-auto pt-4 space-y-2">
                  <p class="flex items-center gap-1 text-[10px] font-semibold ${daysLeft <= 3 ? 'text-rose-500' : 'text-brand-600'}">${icon('rentals', 'w-3 h-3')}Son: ${formatDate(offerEnd(o).toISOString(), true)} · ${formatRemaining(offerEnd(o) - now)}</p>
                  <div class="grid grid-cols-2 gap-2">
                    <button type="button" data-open-offer="${o.id}" class="${BTN_SOFT}">Detay</button>
                    <button type="button" data-rent-offer="${o.id}" ${check.ok ? '' : 'disabled'} class="${BTN_PRIMARY}">Teklifi Kirala</button>
                  </div>
                  ${!check.ok ? `<p class="text-[10px] text-rose-400 text-center">${escapeHTML(check.reason)}</p>` : ''}
                </div>
              </div>
            </article>`;
        }).join('')}
      </div>`;
  }

  /* Teklif detay modalı (vitrin + paketteki kitaplar) */
  function openOfferDetail(offerId) {
    const now = new Date();
    if (purgeExpiredOffers(now)) renderCurrentPage();
    const o = getOffer(offerId);
    if (!o) return toast('Bu teklifin süresi doldu ve silindi.', 'info');
    const u = currentUser();
    const sc = offerScheme(offerRate(o));
    const check = offerRentCheck(o, u);
    const normal = offerNormalTotal(o);

    const bookRows = o.items.map((it) => {
      const b = getBook(it.bookId);
      if (!b) return '<li class="text-[11px] text-slate-400 bg-slate-50 rounded-xl px-3 py-2.5">Silinmiş kitap</li>';
      const rented = isBookRented(b, now.getTime());
      return `
        <li>
          <button type="button" data-open-book="${b.id}" data-back-offer="${o.id}"
            class="w-full text-left flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50/40 transition">
            ${coverHTML(b, 'sm', it.cover)}
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-slate-800 truncate">${escapeHTML(b.title)}</p>
              <p class="flex items-center gap-1.5 mt-0.5">${typeChip(b.type)}<span class="text-[10px] text-slate-400">${b.rentalDays} gün</span></p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-[11px] text-slate-400">${formatMoney(b.price)}</p>
              <p class="mt-0.5">${statusChipHTML(b, now.getTime())}</p>
            </div>
            <span class="text-slate-300">${icon('chevron', 'w-4 h-4')}</span>
          </button>
        </li>`;
    }).join('');

    openModal(`
      <div class="showcase-host offer-sheen relative h-72 sm:h-80 ${sc.bg} overflow-hidden">
        <span class="absolute inset-0 offer-pattern"></span>
        ${sc.ultra ? ultraBoltsHTML() : ''}
        <span class="absolute -right-12 -top-12 w-52 h-52 rounded-full bg-white/15"></span>
        <span class="absolute -left-10 -bottom-14 w-44 h-44 rounded-full bg-black/10"></span>
        ${dealTier(offerRate(o)) === 'mega' && !sc.ultra ? confettiHTML(22) : ''}
        <button type="button" data-modal-close aria-label="Kapat" class="absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 text-white flex items-center justify-center transition">${icon('close', 'w-5 h-5 pointer-events-none')}</button>
        <div class="absolute top-3 left-3 z-10">${offerBurstHTML(offerRate(o), 'lg')}</div>
        ${sc.label ? `<span class="absolute bottom-3 left-3 z-10 text-[11px] font-extrabold text-slate-800 bg-white px-2.5 py-1 rounded-full shadow-soft">${sc.label}</span>` : ''}
        <div class="absolute inset-0 flex items-center justify-center pt-6 pb-6">${showcaseHTML(o, 'lg')}</div>
      </div>
      <div class="p-5 sm:p-6 space-y-5">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <h3 class="text-base sm:text-lg font-bold text-slate-800 leading-snug">${escapeHTML(o.title)}</h3>
            <p class="text-xs text-slate-500 mt-1 leading-relaxed whitespace-pre-line">${escapeHTML(o.description)}</p>
          </div>
          <div class="text-right shrink-0">
            <p class="text-[11px] text-slate-400 line-through">${formatMoney(normal)}</p>
            <p class="text-2xl font-black text-slate-800 leading-none">${formatMoney(offerPrice(o))}</p>
            <p class="text-[10px] font-bold text-emerald-600 mt-1">${formatMoney(Math.max(0, normal - offerPrice(o)))} kazanç</p>
          </div>
        </div>

        <div class="flex flex-wrap gap-1.5">
          <span class="text-[10px] font-semibold px-2 py-1 rounded-full bg-brand-50 text-brand-600">Son: ${formatDate(offerEnd(o).toISOString(), true)}</span>
          <span class="text-[10px] font-semibold px-2 py-1 rounded-full bg-violet-50 text-violet-600">${offerPurchaseCount(o)} kez kiralandı</span>
          <span class="text-[10px] font-semibold px-2 py-1 rounded-full bg-slate-50 text-slate-500">Tek kiralamada ${offerCountLabel(o)}</span>
        </div>

        <div>
          <h4 class="text-xs font-bold text-slate-700 mb-2.5">Paketteki Kitaplar</h4>
          <ul class="space-y-2">${bookRows}</ul>
        </div>

        <div class="space-y-3">
          ${canRent(u) ? `
            <div class="flex items-center justify-between rounded-xl border border-brand-100 px-3 py-2.5 text-xs">
              <span class="flex items-center gap-2 text-slate-500">${avatarHTML(u, 'w-6 h-6 text-[10px]')} Bakiyen</span>
              <span class="font-semibold text-slate-700">${formatMoney(u.balance)}${check.ok ? `<span class="text-slate-300 mx-1">→</span><span class="text-brand-600">${formatMoney(round2(u.balance - offerPrice(o)))}</span>` : ''}</span>
            </div>` : ''}
          ${check.ok ? '' : `<p class="text-[11px] font-medium text-rose-500 bg-rose-50 rounded-xl px-3 py-2">${escapeHTML(check.reason)}</p>`}
          <div class="grid ${isAdmin() ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'} gap-2.5">
            ${isAdmin() ? `
              <button type="button" data-edit-offer="${o.id}" class="${BTN_SOFT}">${icon('pencil', 'w-3.5 h-3.5')}Düzenle</button>
              <button type="button" data-delete-offer="${o.id}" class="${BTN_SOFT} !text-rose-500 !border-rose-100">${icon('trash', 'w-3.5 h-3.5')}Sil</button>` : ''}
            <button type="button" data-modal-close class="py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition">Kapat</button>
            <button type="button" data-rent-offer="${o.id}" ${check.ok ? '' : 'disabled'} class="${BTN_PRIMARY} !py-2.5">Teklifi Kirala</button>
          </div>
        </div>
      </div>`, 'lg');
  }

  /* Teklifi kirala: 1 işlemde paketteki tüm kitaplar kiralanır, bakiyeden paket fiyatı düşer */
  /* Paket kiralama: satın alım + her kitap için kiralama ve kilit + bakiye düşüşü tek batch'te.
     Kural: satın alım fiyatı = teklif fiyatı, teklif süresi dolmamış, bakiye paket fiyatı kadar düşer. */
  async function rentOffer(offerId) {
    if (purgeExpiredOffers()) { closeModal(); renderCurrentPage(); }
    const o = getOffer(offerId);
    const u = currentUser();
    if (!o) return toast('Bu teklifin süresi doldu ve silindi.', 'error');
    if (!u) return;
    const check = offerRentCheck(o, u);
    if (!check.ok) return toast(check.reason, 'error');

    const now = Date.now();
    const bs = offerBooks(o);
    const normal = offerNormalTotal(o);
    const rate = offerRate(o);
    const purchaseRef = col('offerPurchases').doc();
    const purchaseId = purchaseRef.id;

    // Paket fiyatını kitaplara normal fiyat oranında paylaştır (kuruş farkı son kitaba)
    let allocated = 0;
    const shares = bs.map((b, i) => {
      if (i === bs.length - 1) return round2(offerPrice(o) - allocated);
      const share = round2(offerPrice(o) * (b.price / normal));
      allocated = round2(allocated + share);
      return share;
    });

    const batch = db.batch();
    batch.set(purchaseRef, {
      offerId: o.id, offerTitle: o.title, userId: u.id,
      price: offerPrice(o), normalTotal: normal, bookIds: bs.map((b) => b.id), purchasedAt: isoAt(now)
    });
    bs.forEach((b, i) => {
      const due = now + (b.rentalDays || DEFAULT_RENTAL_DAYS) * DAY_MS;
      const ref = col('rentals').doc();
      batch.set(ref, {
        bookId: b.id, userId: u.id,
        listPrice: b.price, price: shares[i], discount: rate, discountSource: 'offer',
        offerId: o.id, purchaseId, offerPrice: offerPrice(o),
        rentedAt: isoAt(now), dueAt: isoAt(due), returnedAt: null
      });
      batch.update(bookRef(b.id), { lockUntil: Timestamp.fromMillis(due), lockBy: u.id, lockRental: ref.id });
    });
    // Paket indirimi puan kazandırır (normal toplam − paket fiyatı)
    const gain = purchaseGain({ normalTotal: normal, price: offerPrice(o) });
    batch.update(col('users').doc(u.id), {
      balance: round2(u.balance - offerPrice(o)), lastTx: purchaseId, lastTxType: 'package',
      ...(hasLedger(u) && gain > 0 ? { pointsEarned: round2(u.pointsEarned + gain) } : {})
    });

    closeModal();
    await run(batch.commit(), `🎁 "${o.title}" kiralandı · ${bs.length} kitap · ${formatMoney(offerPrice(o))}${gain > 0 ? ` · ⭐ +${formatPoints(gain)}` : ''}`);
  }

