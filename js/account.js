  /* ==========================================================
     16) ROL YÖNETİMİ (hesaplar Firebase Auth'tan gelir)
     ========================================================== */
  const isOwnerUser = (u) => (u?.email || '').toLowerCase() === OWNER_EMAIL;

  async function setRole(userId, role) {
    const u = getUser(userId);
    if (!u || !ROLES[role]) return;
    if (!isAdmin()) { toast('Rol değiştirme yalnızca Admin yetkisindedir.', 'error'); return renderProfile(); }
    if (u.role === role) return;
    if (isOwnerUser(u) && role !== 'admin') {
      toast('Ana Admin hesabının rolü değiştirilemez.', 'error');
      return renderProfile();
    }
    const ok = await run(col('users').doc(u.id).update({ role }), `${u.name} artık ${ROLES[role].label}.`);
    if (!ok) renderProfile();
  }

  /* ==========================================================
     17) PROFİL MENÜSÜ, BAKİYE & ROL PANELİ
     ========================================================== */
  function renderProfile() {
    const u = currentUser();
    if (!u) return;

    // Navbar
    const nav = $('#navAvatar');
    nav.className = `w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold bg-gradient-to-br ${u.color}`;
    nav.textContent = initials(u.name);
    $('#navName').textContent = u.name;
    $('#navBalance').textContent = formatMoney(u.balance);

    // Kimlik kartı
    const pa = $('#panelAvatar');
    pa.className = `w-12 h-12 rounded-2xl ring-2 ring-white/40 flex items-center justify-center text-sm font-semibold shrink-0 shadow-soft bg-gradient-to-br ${u.color}`;
    pa.textContent = initials(u.name);
    $('#panelName').textContent = u.name;
    $('#panelRole').textContent = state.memberView && isRealAdmin() ? '👁️ Üye görünümü' : (u.role === 'admin' ? '★ ' : '') + ROLES[u.role].label;
    $('#panelEmail').textContent = u.email || state.authUser?.email || '';
    $('#panelStatsBtn').dataset.userStats = u.id;

    // Hızlı özet
    const s = userStats(u.id);
    const activeCount = rentals.filter((r) => r.userId === u.id && isActiveRental(r)).length;
    $('#panelQuick').innerHTML = [
      { icon: '💰', label: 'Bakiye', value: formatMoney(u.balance) },
      { icon: '📖', label: 'Aktif Kiralık', value: `${activeCount} kitap` },
      { icon: '🧾', label: 'Harcama', value: formatMoney(s.spent) }
    ].map((c) => `
      <div class="rounded-2xl bg-white/15 ring-1 ring-white/10 px-2.5 py-2 min-w-0">
        <p class="text-[9px] uppercase tracking-wider text-brand-100">${c.icon} ${c.label}</p>
        <p class="text-xs font-bold truncate mt-0.5">${c.value}</p>
      </div>`).join('');

    renderAdminPanel();
    // Geri bildirim rozeti (panel butonu + profil düğmesindeki nokta)
    const fbCount = feedbackBadgeCount();
    const fbBadge = $('#fbBadge');
    fbBadge.textContent = fbCount > 9 ? '9+' : fbCount;
    fbBadge.classList.toggle('hidden', !fbCount);
    fbBadge.classList.toggle('flex', !!fbCount);
    // İade rozeti: Admin → bekleyen talep · üye → sonuçlanan talep
    const rfCount = refundBadgeCount();
    const rfBadge = $('#rfBadge');
    rfBadge.textContent = rfCount > 9 ? '9+' : rfCount;
    rfBadge.classList.toggle('hidden', !rfCount);
    rfBadge.classList.toggle('flex', !!rfCount);
    $('#panelRefundLabel').textContent = isAdmin() ? '⏳ Onay Bekleyenler' : '↩️ İadelerim';
    $('#fbDot').classList.toggle('hidden', !fbCount && !rfCount);
    // Sezonlar butonu yalnızca Admin'de (Üye Görünümü'nde gizli) · açık sezon yazılır
    const season = activeSeason();
    $('#panelSeasonsBtn').classList.toggle('hidden', !isAdmin());
    $('#panelSeasonsBtn').classList.toggle('flex', isAdmin());
    $('#panelSeasonsLabel').textContent = season ? `${SEASONS[season].icon} Sezonlar · ${SEASONS[season].label} açık` : '🗓️ Sezonlar';
    // Üye Görünümü şeridi yalnızca gerçek Admin'de ve mod açıkken
    const banner = $('#memberViewBanner');
    const showBanner = isRealAdmin() && state.memberView;
    banner.classList.toggle('hidden', !showBanner);
    banner.classList.toggle('flex', showBanner);
  }

  /* Admin: Üye Görünümü aç / kapat · siteyi bir üyenin gözünden görür (Admin araçları gizlenir).
     Yalnızca arayüzü etkiler; yetkiler ve veriler değişmez. Bu cihazda hatırlanır. */
  function setMemberView(on) {
    if (!isRealAdmin()) return;
    state.memberView = !!on;
    try { localStorage.setItem('fb.memberView', on ? '1' : '0'); } catch { /* gizli sekme vb. */ }
    closeModal();
    state.panelUser = null;
    renderProfile();
    renderCurrentPage();
    toast(on ? '👁️ Üye görünümüne geçtin · siteyi bir üyenin gözünden görüyorsun.' : '🛡️ Admin görünümüne döndün.', 'info');
  }

  /* Kullanıcı (Admin olmayan) için panel: aktif kiralamalar + bilgi */
  function memberPanelHTML(u) {
    const nowMs = Date.now();
    const active = rentals.filter((r) => r.userId === u.id && isActiveRental(r, nowMs))
      .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
    const rows = active.slice(0, 4).map((r) => {
      const b = getBook(r.bookId);
      const { remainingMs, ratio } = rentalProgress(r, nowMs);
      return `
        <li class="flex items-center gap-2.5 p-2 rounded-2xl bg-white border border-slate-100">
          ${coverHTML(b, 'xs')}
          <div class="flex-1 min-w-0">
            <p class="text-[11px] font-semibold text-slate-700 truncate">${b ? escapeHTML(b.title) : 'Silinmiş kitap'}</p>
            <p class="text-[10px] font-semibold" style="color:${progressColor(ratio)}">${formatRemaining(remainingMs)}</p>
          </div>
        </li>`;
    }).join('');
    return `
      <div class="flex items-center justify-between mb-2 px-1">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Aktif Kiralamaların</p>
        ${active.length ? `<a href="#rentals" class="text-[10px] font-semibold text-brand-600 hover:text-brand-700">Tümü →</a>` : ''}
      </div>
      ${active.length
        ? `<ul class="space-y-1.5">${rows}</ul>${active.length > 4 ? `<p class="text-[10px] text-slate-400 mt-1.5 px-1">+${active.length - 4} kiralama daha</p>` : ''}`
        : '<p class="text-[11px] text-slate-400 bg-white border border-dashed border-slate-200 rounded-2xl px-3 py-2.5">Şu an kiraladığın kitap yok. Günün İndirimleri\'ne göz at! 📚</p>'}
      <p class="text-[10px] text-slate-400 flex items-center gap-1.5 px-1 mt-2.5">
        <span class="text-brand-300">${icon('lock', 'w-3 h-3')}</span>Bakiye yükleme ve yönetim işlemleri Admin'e aittir.
      </p>`;
  }

  function renderAdminPanel() {
    const box = $('#adminPanel');

    // Gerçek Admin: Üye Görünümü anahtarı (iki modda da görünür)
    const viewSwitch = isRealAdmin() ? `
      <button type="button" data-toggle-member-view
        class="w-full mb-3 flex items-center gap-3 p-2.5 rounded-2xl border transition text-left ${state.memberView
          ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100' : 'bg-white border-slate-100 hover:border-brand-200'}">
        <span class="w-9 h-9 rounded-xl ${state.memberView ? 'bg-emerald-500 text-white' : 'bg-brand-50 text-brand-600'} flex items-center justify-center text-base shrink-0">${state.memberView ? '🛡️' : '👁️'}</span>
        <span class="min-w-0 flex-1">
          <span class="block text-xs font-bold text-slate-700">${state.memberView ? "Admin'e dön" : 'Üye Görünümü'}</span>
          <span class="block text-[10px] text-slate-400">${state.memberView ? 'Şu an siteyi bir üyenin gözünden görüyorsun' : 'Siteyi bir üyenin gözünden gör · Admin araçları gizlenir'}</span>
        </span>
        <span class="relative w-9 h-5 rounded-full shrink-0 transition ${state.memberView ? 'bg-emerald-500' : 'bg-slate-200'}">
          <span class="absolute top-0.5 ${state.memberView ? 'left-[18px]' : 'left-0.5'} w-4 h-4 rounded-full bg-white shadow transition-all"></span>
        </span>
      </button>` : '';

    if (!isAdmin()) {
      box.innerHTML = viewSwitch + memberPanelHTML(currentUser());
      return;
    }

    // Canlı güncellemede yazılmakta olan tutar kaybolmasın (aynı kullanıcı açıkken)
    const prevAmount = $('#bmAmount')?.dataset.user === state.panelUser ? $('#bmAmount').value : '';
    if (state.panelUser && !getUser(state.panelUser)) state.panelUser = null;

    // Tek liste: her kullanıcı bir satır · dokununca bakiye + rol ayarı aynı yerde açılır
    const row = (u) => {
      const open = state.panelUser === u.id;
      const owner = isOwnerUser(u);
      return `
        <li class="rounded-2xl border transition ${open ? 'border-brand-200 bg-brand-50/50 shadow-soft' : 'border-slate-100 bg-white hover:border-brand-100'}">
          <button type="button" data-panel-user="${u.id}" aria-expanded="${open}" class="w-full flex items-center gap-2.5 p-2.5 text-left">
            ${avatarHTML(u, 'w-8 h-8 text-[11px]')}
            <span class="min-w-0 flex-1">
              <span class="block text-xs font-semibold text-slate-700 truncate">${escapeHTML(u.name)}${u.id === state.currentUserId ? ' <span class="text-[9px] text-brand-600">(sen)</span>' : ''}</span>
              <span class="inline-flex mt-0.5 text-[9px] font-semibold px-1.5 py-px rounded-full ${ROLES[u.role]?.chip || ''}">${owner ? '★ ' : ''}${ROLES[u.role]?.label || u.role}</span>
              <span class="block mt-0.5 text-[9px] text-slate-400 truncate">🕒 Son giriş: ${u.lastLoginAt ? `${relativeDay(u.lastLoginAt)} ${formatTime(u.lastLoginAt)}` : 'Kayıt yok'}</span>
            </span>
            <span class="text-xs font-bold text-emerald-600 tabular-nums shrink-0">${formatMoney(u.balance)}</span>
            <svg class="w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/></svg>
          </button>
          ${open ? `
            <div class="px-2.5 pb-3 space-y-3">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">💰 Bakiye</p>
                <div class="flex gap-1.5 mb-1.5">
                  ${[10, 25, 50, 100].map((v) => `<button type="button" data-quick-amount="${v}" class="flex-1 py-1 rounded-lg text-[10px] font-semibold bg-white border border-brand-100 text-brand-600 hover:bg-brand-50 transition">₺${v}</button>`).join('')}
                </div>
                <input id="bmAmount" data-user="${u.id}" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Tutar (₺)" value="${escapeHTML(prevAmount)}"
                  class="w-full text-xs rounded-xl border border-brand-100 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-200" />
                <div class="grid grid-cols-3 gap-1.5 mt-1.5">
                  <button type="button" data-balance-action="add" data-user="${u.id}" class="py-2 rounded-xl text-[11px] font-semibold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition">+ Ekle</button>
                  <button type="button" data-balance-action="subtract" data-user="${u.id}" class="py-2 rounded-xl text-[11px] font-semibold bg-rose-50 text-rose-500 hover:bg-rose-100 transition">− Azalt</button>
                  <button type="button" data-balance-action="set" data-user="${u.id}" class="py-2 rounded-xl text-[11px] font-semibold bg-brand-600 text-white hover:bg-brand-700 transition">Eşitle</button>
                </div>
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">⚙️ Rol & Yetki</p>
                ${owner
                  ? '<p class="text-[10px] text-slate-500 bg-white rounded-xl border border-slate-100 px-3 py-2">★ Ana Admin · rolü değiştirilemez.</p>'
                  : `<div class="grid grid-cols-${Object.keys(ROLES).length} gap-1 p-1 bg-white rounded-xl border border-brand-100">
                      ${Object.entries(ROLES).map(([k, r]) => `
                        <button type="button" data-set-role="${k}" data-user="${u.id}" title="${escapeHTML(r.desc)}"
                          class="py-1.5 rounded-lg text-[10px] font-semibold transition ${u.role === k ? 'bg-brand-600 text-white shadow-soft' : 'text-slate-500 hover:text-brand-600 hover:bg-brand-50'}">${r.label}</button>`).join('')}
                    </div>
                    <p class="text-[10px] text-slate-400 mt-1 px-1">${ROLES[u.role]?.desc || ''}</p>`}
              </div>
            </div>` : ''}
        </li>`;
    };
    const waiting = ALLOWED_EMAILS.filter((e) => !users.some((u) => (u.email || '').toLowerCase() === e));
    const body = `
      <ul class="space-y-1.5">${users.map(row).join('')}</ul>
      ${waiting.length ? `
        <p class="px-1 mt-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">İzinli · henüz giriş yapmadı</p>
        <ul class="space-y-1">
          ${waiting.map((e) => `<li class="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white border border-dashed border-brand-100 text-[11px] text-slate-500 truncate">⏳ ${escapeHTML(e)}</li>`).join('')}
        </ul>` : ''}`;

    // Firestore boşsa (ilk kurulum): örnek kataloğu taşıma kartı
    const seedCard = !bookTypes.length && !books.length ? `
      <div class="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
        <p class="text-[11px] font-bold text-amber-800">🗄️ İlk kurulum · Firestore boş</p>
        <p class="text-[10px] text-amber-700 mt-0.5 leading-relaxed">Örnek katalog: türler, ${SEED_BOOKS.length} kitap, fiyat logu, duyurular ve özel teklifler. Kullanıcı ve kiralama verisi taşınmaz.</p>
        <div class="grid grid-cols-2 gap-2 mt-2">
          <button type="button" data-seed="catalog" class="py-1.5 rounded-lg text-[11px] font-semibold bg-amber-500 text-white hover:bg-amber-600 transition">Kataloğu Yükle</button>
          <button type="button" data-seed="types" class="py-1.5 rounded-lg text-[11px] font-semibold bg-white text-amber-700 border border-amber-200 hover:bg-amber-100 transition">Sadece Türler</button>
        </div>
      </div>` : '';

    box.innerHTML = `
      ${viewSwitch}
      ${seedCard}
      <div class="rounded-3xl bg-white border border-brand-100 shadow-soft p-3">
        <div class="flex items-center justify-between gap-2 px-1 mb-2.5">
          <p class="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">🛡️ Kullanıcı Yönetimi</p>
          <span class="text-[10px] text-slate-400">${users.length} kişi · toplam ${formatMoney(sum(users, (u) => u.balance))}</span>
        </div>
        <p class="px-1 mb-2 text-[10px] text-slate-400">Bakiye ve rolü ayarlamak için kullanıcıya dokun.</p>
        ${body}
      </div>`;
  }

  async function handleBalanceAction(action, userId) {
    if (!isAdmin()) return toast('Bu işlem için yetkiniz yok.', 'error');

    const target = getUser(userId);
    const amount = parseFloat($('#bmAmount')?.value);

    if (!target) return toast('Kullanıcı bulunamadı.', 'error');
    if (isNaN(amount) || amount < 0) return toast('Lütfen geçerli bir tutar girin.', 'error');

    let newBalance = target.balance;
    if (action === 'add')      newBalance = target.balance + amount;
    if (action === 'subtract') newBalance = target.balance - amount;
    if (action === 'set')      newBalance = amount;

    if (newBalance < 0) return toast('Bakiye sıfırın altına düşemez.', 'error');

    newBalance = round2(newBalance);
    $('#bmAmount').value = '';
    const labels = { add: 'eklendi', subtract: 'düşüldü', set: 'eşitlendi' };
    await run(col('users').doc(target.id).update({ balance: newBalance }),
      `${target.name}: bakiye ${labels[action]} → ${formatMoney(newBalance)}`);
  }

  /* ==========================================================
     17.05) GERİ BİLDİRİM · herkes yazar, Admin okur ve cevaplar; yazan cevabı görür
     ========================================================== */
  /* Herkes geri bildirim yazar (Admin de bir kullanıcıdır) · Adminler ayrıca hepsini okur ve cevaplar */
  const canSendFeedback = () => !!currentUser();
  const isoMs = (iso) => (iso ? new Date(iso).getTime() : 0);
  const fbReplyUnread = (f) => !!f.lastReplyAt && isoMs(f.lastReplyAt) > isoMs(f.userSeenAt);
  /* Yeni mi? Admin → başkasının okunmamış geri bildirimi · herkes → cevabı okunmamış kendi geri bildirimi.
     (Admin'in kendi geri bildirimi adminSeen ile işaretlenmez ki diğer Adminler de yeni görsün.) */
  const fbUnseen = (f) => (f.userId === state.currentUserId ? fbReplyUnread(f) : isAdmin() && !f.adminSeen);
  const feedbackBadgeCount = () => feedbacks.filter(fbUnseen).length;

  /* Pencerede yazma kutusu yok: geri bildirim yalnızca sayfanın en altındaki kutudan gönderilir.
     Üye → gönderdikleri ve cevaplar · Admin → hepsi (filtre + cevap) */
  function openFeedbackModal() {
    const admin = isAdmin();
    state.feedbackOpen = true;
    // Pencere açıldığında "yeni" olanlar vurgulanır (görüldü işareti hemen yazılsa da vurgu kalır)
    state.fbFresh = new Set(feedbacks.filter(fbUnseen).map((f) => f.id));
    const filterBtn = (k, label, n) => `
      <button type="button" data-fb-filter="${k}" class="px-3 py-1.5 rounded-full text-[11px] font-semibold transition ${state.fbFilter === k ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}">
        ${label} <span class="opacity-70">${n}</span></button>`;
    const count = (s) => feedbacks.filter((f) => (f.status || 'open') === s).length;
    openModal(`
      ${modalHeader(admin ? 'Geri Bildirimler 💬' : 'Geri Bildirimlerim 💬',
        admin ? 'Geri bildirimleri oku ve cevapla.' : 'Gönderdiğin geri bildirimler ve Admin\'in cevapları.', 'announcements')}
      <div class="p-5 space-y-4">
        ${admin ? `<div class="flex gap-1.5 flex-wrap">
            ${filterBtn('open', '⏳ Bekleyen', count('open'))}${filterBtn('answered', '✓ Cevaplanan', count('answered'))}${filterBtn('all', 'Tümü', feedbacks.length)}
          </div>` : ''}
        <div id="fbList"></div>
        <p class="text-[10px] text-slate-400 text-center">💬 Yeni geri bildirimi sayfanın en altındaki <b class="text-slate-500">Geri Bildirim</b> kutusundan gönderebilirsin.</p>
        <button type="button" data-modal-close class="${BTN_SOFT} w-full !py-2.5">Kapat</button>
      </div>`, 'lg');
    renderFeedbackList();
  }

  function renderFeedbackList() {
    const box = $('#fbList');
    if (!box) return;
    const admin = isAdmin();
    // Yazılmakta olan cevap taslakları korunur
    const drafts = {};
    box.querySelectorAll('[data-reply-input]').forEach((t) => { drafts[t.dataset.replyInput] = t.value; });
    let list = admin ? [...feedbacks] : feedbacks.filter((f) => f.userId === state.currentUserId);
    if (admin && state.fbFilter !== 'all') list = list.filter((f) => (f.status || 'open') === state.fbFilter);
    list.sort((a, b) => isoMs(b.createdAt) - isoMs(a.createdAt));

    const card = (f) => {
      const usr = getUser(f.userId);
      const answered = (f.status || 'open') === 'answered';
      const fresh = state.fbFresh?.has(f.id);
      return `
        <li class="rounded-2xl border p-3.5 ${fresh ? 'border-brand-200 bg-brand-50/40' : 'border-slate-100 bg-white'}">
          <div class="flex items-center gap-2 flex-wrap">
            ${admin && usr ? `<span class="flex items-center gap-1.5 text-xs font-semibold text-slate-700">${avatarHTML(usr, 'w-5 h-5 text-[9px]')}${escapeHTML(usr.name)}</span>` : ''}
            <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${answered ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}">${answered ? '✓ Cevaplandı' : '⏳ Bekliyor'}</span>
            ${fresh ? '<span class="text-[9px] font-bold text-white bg-rose-500 px-1.5 py-px rounded-full">YENİ</span>' : ''}
            <span class="ml-auto text-[10px] text-slate-400">${relativeDay(f.createdAt)} · ${formatTime(f.createdAt)}</span>
            ${admin ? `<button type="button" data-delete-feedback="${f.id}" title="Sil" aria-label="Geri bildirimi sil"
              class="${BTN_ICON} text-slate-300 hover:text-rose-500 hover:bg-rose-50">${icon('trash', 'w-3.5 h-3.5 pointer-events-none')}</button>` : ''}
          </div>
          <p class="text-xs text-slate-700 leading-relaxed whitespace-pre-line mt-2">${escapeHTML(f.message)}</p>
          ${(f.replies || []).map((r) => `
            <div class="mt-2.5 ml-3 pl-3 border-l-2 border-emerald-200">
              <p class="text-[10px] font-semibold text-emerald-700">🛡️ ${escapeHTML(getUser(r.by)?.name || 'Admin')} · ${relativeDay(r.at)} ${formatTime(r.at)}</p>
              <p class="text-xs text-slate-700 leading-relaxed whitespace-pre-line mt-0.5">${escapeHTML(r.text)}</p>
            </div>`).join('')}
          ${admin ? `
            <div class="mt-3 flex gap-2 items-end">
              <textarea data-reply-input="${f.id}" rows="2" maxlength="1000" class="${INPUT_CLS} flex-1 min-w-0 resize-y !text-xs" placeholder="${answered ? 'Yeni cevap ekle…' : 'Cevap yaz…'}"></textarea>
              <button type="button" data-send-reply="${f.id}" class="${BTN_PRIMARY} !py-2 shrink-0">Cevapla</button>
            </div>`
            : (f.replies || []).length ? '' : '<p class="text-[10px] text-slate-400 mt-2">⏳ Henüz cevap yok · Admin cevaplayınca burada görünecek.</p>'}
        </li>`;
    };
    box.innerHTML = list.length
      ? `<ul class="space-y-3">${list.map(card).join('')}</ul>`
      : emptyState(admin ? 'Bu filtrede geri bildirim yok.' : 'Henüz geri bildirim göndermedin.');
    box.querySelectorAll('[data-reply-input]').forEach((t) => { if (drafts[t.dataset.replyInput]) t.value = drafts[t.dataset.replyInput]; });
    markFeedbackSeen();
  }

  /* Görüldü: kendi geri bildirimi → userSeenAt (cevabı okudu) · Admin, başkasınınki → adminSeen */
  function markFeedbackSeen() {
    const todo = feedbacks.filter((f) => fbUnseen(f) && !state.purgePending.has(`fbseen:${f.id}:${f.lastReplyAt || ''}`));
    if (!todo.length) return;
    const now = isoAt(Date.now());
    todo.forEach((f) => state.purgePending.add(`fbseen:${f.id}:${f.lastReplyAt || ''}`));
    commitOps(todo.map((f) => (bt) => bt.update(col('feedback').doc(f.id),
      f.userId === state.currentUserId ? { userSeenAt: now } : { adminSeen: true })))
      .catch((e) => console.error(e));
  }

  /* Alt bilgideki kutudan gönderilir · gönderince form temizlenir */
  function handleSendFeedback(fd, form) {
    const u = currentUser();
    const message = (fd.message || '').trim();
    if (!u) return;
    if (message.length < 3) return toast('Biraz daha yazar mısın? (en az 3 karakter)', 'error');
    run(col('feedback').add({
      userId: u.id, message, createdAt: isoAt(Date.now()),
      status: 'open', replies: [], adminSeen: false, lastReplyAt: null, userSeenAt: null
    }), 'Geri bildirimin gönderildi, teşekkürler! 💬').then((ok) => {
      if (ok) form?.reset();
    });
  }

  function sendFeedbackReply(id) {
    if (!requireAdmin()) return;
    const input = document.querySelector(`[data-reply-input="${id}"]`);
    const text = (input?.value || '').trim();
    if (!text) return toast('Cevap boş olamaz.', 'error');
    const at = isoAt(Date.now());
    run(col('feedback').doc(id).update({
      replies: FieldValue.arrayUnion({ by: state.currentUserId, text, at }),
      status: 'answered', lastReplyAt: at, adminSeen: true
    }), 'Cevap gönderildi ✓').then((ok) => { if (ok && input) input.value = ''; });
  }

  function deleteFeedback(id) {
    if (!requireAdmin()) return;
    const f = feedbacks.find((x) => x.id === id);
    if (!f) return;
    openConfirm({
      title: 'Geri bildirim silinsin mi?',
      message: `${escapeHTML(getUser(f.userId)?.name || 'Üye')} kullanıcısının geri bildirimi ve cevapları kalıcı olarak silinecek.`,
      onConfirm: async () => {
        await run(col('feedback').doc(id).delete(), 'Geri bildirim silindi.', 'info');
        openFeedbackModal();
      }
    });
  }

  /* ==========================================================
     17.06) İADE · kiralandığı gün (gece 00:00'a kadar) açıklamayla talep → Admin onaylar / reddeder
     • Yalnızca indirimsiz tekli kiralama (indirimli, kuponlu, özel teklif/paket ve 👑 sınırlı kitap iade edilemez).
     • Onay: ödenen tutar bakiyeye döner, kiralama kaydı silinir (istatistikler ve o kitaba oyu da gider),
       kitap boşa çıkar. Talep belgesi kayıt olarak kalır (belge adı = kiralama → kiralama başına tek talep).
     ========================================================== */
  const refundOf = (rentalId) => refunds.find((x) => x.id === rentalId) || null;
  const sameLocalDay = (a, b) => localDateKey(a) === localDateKey(b);
  /* Talep edildiği gün içinde onaylanmayan talep → süresi geçti, reddedilmiş sayılır */
  const refundExpired = (f, now = new Date()) => f?.status === 'pending' && !sameLocalDay(f.createdAt, now);
  const refundStatus = (f) => (refundExpired(f) ? 'rejected' : f?.status);
  const REFUND_EXPIRED_NOTE = 'Talep gün içinde onaylanmadığı için otomatik reddedildi.';
  /* Süresi geçen bekleyen talepleri kalıcı olarak reddeder · Admin hepsini, üye kendi talebini (kural gün bitişini denetler)
     · reddedilirse bu oturumda yeniden denenmez */
  function expireStaleRefunds() {
    if (!currentUser()) return;
    const admin = isRealAdmin();
    const stale = refunds.filter((f) => refundExpired(f) && (admin || f.userId === state.currentUserId) && !state.purgePending.has(`rfexp:${f.id}`));
    if (!stale.length) return;
    stale.forEach((f) => state.purgePending.add(`rfexp:${f.id}`));
    const now = isoAt(Date.now());
    commitOps(stale.map((f) => (bt) => bt.update(col('refunds').doc(f.id), {
      status: 'rejected', decidedAt: now, decidedBy: admin ? state.currentUserId : 'auto', adminNote: REFUND_EXPIRED_NOTE
    }))).catch((e) => console.error(e));
  }
  /* Neden iade edilemez? (boş = edilebilir) */
  function refundBlockReason(r, now = new Date()) {
    if (!r || r.userId !== state.currentUserId) return 'Yalnızca kendi kiralamanı iade edebilirsin.';
    if (!isActiveRental(r, now.getTime()) || r.cancelledAt) return 'Bu kiralama artık aktif değil.';
    if (r.purchaseId || r.offerId) return 'Özel teklifle alınan kitaplar iade edilemez.';
    if (r.discountSource === 'museum' || getBook(r.bookId)?.museum) return '🏛️ Müze\'deki kitaplar iade edilemez.';
    if (r.couponId || r.discountSource || r.discount > 0) return 'İndirimle alınan kitaplar iade edilemez.';
    if (!sameLocalDay(r.rentedAt, now)) return 'İade yalnızca kiralandığı gün (gece 00:00\'a kadar) yapılabilir.';
    return '';
  }
  /* Kiralama satırındaki iade butonu / durum rozeti (yalnızca kiralamanın sahibine) */
  function refundBtnHTML(r) {
    if (r.userId !== state.currentUserId) return '';
    const req = refundOf(r.id);
    const st = refundStatus(req);
    if (st === 'pending') return '<span class="shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100 whitespace-nowrap">⏳ İade bekliyor</span>';
    if (st === 'rejected') return '<span class="shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 whitespace-nowrap">İade reddedildi</span>';
    if (refundBlockReason(r)) return '';
    return `<button type="button" data-refund-rental="${r.id}" title="Bugün 23:59'a kadar iade talebi gönderebilirsin"
      class="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-sky-600 bg-sky-50 border border-sky-200 hover:bg-sky-500 hover:text-white hover:border-sky-500 px-2.5 py-1 rounded-full whitespace-nowrap transition">↩️ İade</button>`;
  }

  /* Üye: iade talebi penceresi (açıklama zorunlu) */
  function openRefundRequest(rentalId) {
    const r = getRental(rentalId);
    const why = refundBlockReason(r);
    if (why) return toast(why, 'error');
    if (refundOf(r.id)) return toast('Bu kiralama için zaten bir iade talebin var.', 'info');
    const b = getBook(r.bookId);
    openModal(`
      ${modalHeader('İade Talebi ↩️', 'Admin onaylayınca ödediğin tutar bakiyene geri yüklenir.', 'back', 'bg-sky-50 text-sky-600')}
      <form data-form="sendRefund" data-rental-id="${r.id}" class="p-5 space-y-3.5" autocomplete="off">
        <div class="flex items-center gap-3 p-3 rounded-2xl bg-slate-50">
          ${coverHTML(b, 'sm')}
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-slate-700 truncate">${escapeHTML(b?.title || 'Kitap')}</p>
            <p class="text-[10px] text-slate-400">Kiralandı: ${formatDate(r.rentedAt, true)}</p>
          </div>
          <span class="text-sm font-bold text-emerald-600 shrink-0">${formatMoney(r.price)}</span>
        </div>
        ${field('Açıklama', `<textarea name="reason" rows="3" required minlength="3" maxlength="500" autofocus class="${INPUT_CLS} resize-y leading-relaxed" placeholder="Neden iade etmek istiyorsun?"></textarea>`)}
        <p class="text-[10px] text-slate-400 leading-relaxed">⏳ Talep bugün 23:59'a kadar gönderilebilir. Onaylanırsa kiralama ve bu kiralamaya ait istatistikler (ve varsa bu kitaba verdiğin oy) silinir; kitap boşa çıkar.</p>
        ${formFooter('Talebi Gönder')}
      </form>`);
  }

  function handleSendRefund(fd, form) {
    const r = getRental(form.dataset.rentalId);
    const why = refundBlockReason(r);
    if (why) return toast(why, 'error');
    const reason = (fd.reason || '').trim();
    if (reason.length < 3) return toast('Lütfen kısa bir açıklama yaz.', 'error');
    closeModal();
    run(col('refunds').doc(r.id).set({
      userId: r.userId, rentalId: r.id, bookId: r.bookId, amount: r.price, reason,
      createdAt: isoAt(Date.now()), status: 'pending', decidedAt: null, decidedBy: null, adminNote: null, userSeenAt: null
    }), 'İade talebin gönderildi · Admin onayı bekleniyor ⏳');
  }

  /* Rozet: Admin → bekleyen talep · üye → sonuçlanıp görülmemiş kendi talebi */
  const refundBadgeCount = () => (isAdmin()
    ? refunds.filter((f) => refundStatus(f) === 'pending').length
    : refunds.filter((f) => f.userId === state.currentUserId && f.status !== 'pending' && !f.userSeenAt).length);

  /* Admin: Onay Bekleyenler · üye: İadelerim */
  function openRefundsModal() {
    state.refundsOpen = true;
    const admin = isAdmin();
    const filterBtn = (k, label, n) => `
      <button type="button" data-refund-filter="${k}" class="px-3 py-1.5 rounded-full text-[11px] font-semibold transition ${state.refundFilter === k ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}">
        ${label} <span class="opacity-70">${n}</span></button>`;
    const n = (s) => refunds.filter((f) => refundStatus(f) === s).length;
    openModal(`
      ${modalHeader(admin ? 'Onay Bekleyenler ⏳' : 'İadelerim ↩️',
        admin ? 'İade taleplerini onayla ya da reddet · açıklama yazmak isteğe bağlı.' : 'İade taleplerin ve Admin\'in kararı.', 'back', 'bg-sky-50 text-sky-600')}
      <div class="p-5 space-y-4">
        ${admin ? `<div class="flex gap-1.5 flex-wrap">
          ${filterBtn('pending', '⏳ Bekleyen', n('pending'))}${filterBtn('approved', '✓ Onaylanan', n('approved'))}${filterBtn('rejected', '✕ Reddedilen', n('rejected'))}
        </div>` : ''}
        <div id="refundList"></div>
        <button type="button" data-modal-close class="${BTN_SOFT} w-full !py-2.5">Kapat</button>
      </div>`, 'lg');
    renderRefundList();
  }

  function renderRefundList() {
    const box = $('#refundList');
    if (!box) return;
    const admin = isAdmin();
    const drafts = {};
    box.querySelectorAll('[data-refund-note]').forEach((t) => { drafts[t.dataset.refundNote] = t.value; });
    let list = admin ? refunds.filter((f) => refundStatus(f) === state.refundFilter) : refunds.filter((f) => f.userId === state.currentUserId);
    list = [...list].sort((a, b) => isoMs(b.createdAt) - isoMs(a.createdAt));
    const statusChip = (s) => ({
      pending: '<span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">⏳ Bekliyor</span>',
      approved: '<span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">✓ Onaylandı · bakiyeye yüklendi</span>',
      rejected: '<span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">✕ Reddedildi</span>'
    }[s] || '');
    const card = (f) => {
      const usr = getUser(f.userId);
      const b = getBook(f.bookId);
      const r = getRental(f.rentalId);
      const inTime = r ? sameLocalDay(r.rentedAt, f.createdAt) : true;
      return `
        <li class="rounded-2xl border border-slate-100 bg-white p-3.5">
          <div class="flex items-center gap-3">
            ${coverHTML(b, 'sm')}
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                ${admin && usr ? `<span class="flex items-center gap-1.5 text-xs font-semibold text-slate-700">${avatarHTML(usr, 'w-5 h-5 text-[9px]')}${escapeHTML(usr.name)}</span>` : ''}
                ${statusChip(refundStatus(f))}
                ${admin && refundStatus(f) !== 'pending' ? `<button type="button" data-delete-refund="${f.id}" title="Geçmişten sil" aria-label="İade kaydını sil"
                  class="${BTN_ICON} ml-auto text-slate-300 hover:text-rose-500 hover:bg-rose-50">${icon('trash', 'w-3.5 h-3.5 pointer-events-none')}</button>` : ''}
              </div>
              <p class="text-xs font-semibold text-slate-700 truncate mt-1">${escapeHTML(b?.title || 'Silinmiş kitap')}</p>
              <p class="text-[10px] text-slate-400">${r ? `Kiralandı: ${formatDate(r.rentedAt, true)} · ` : ''}Talep: ${formatDate(f.createdAt, true)}${admin && r ? ` · ${inTime ? '<b class="text-emerald-600">aynı gün ✓</b>' : '<b class="text-rose-500">farklı gün ✕</b>'}` : ''}</p>
            </div>
            <span class="text-sm font-bold text-emerald-600 shrink-0">${formatMoney(f.amount)}</span>
          </div>
          <p class="text-xs text-slate-700 leading-relaxed whitespace-pre-line mt-2.5 bg-slate-50 rounded-xl px-3 py-2"><span class="text-[10px] font-semibold text-slate-400 block">Açıklama</span>${escapeHTML(f.reason)}</p>
          ${!f.adminNote && refundExpired(f) ? `<p class="text-[10px] text-rose-500 mt-2">⌛ ${REFUND_EXPIRED_NOTE}</p>` : ''}
          ${f.adminNote ? `<p class="text-xs text-slate-700 leading-relaxed whitespace-pre-line mt-2 ml-3 pl-3 border-l-2 border-emerald-200"><span class="text-[10px] font-semibold text-emerald-700 block">🛡️ ${escapeHTML(getUser(f.decidedBy)?.name || 'Admin')}</span>${escapeHTML(f.adminNote)}</p>` : ''}
          ${admin && refundStatus(f) === 'pending' ? `
            <textarea data-refund-note="${f.id}" rows="2" maxlength="500" class="${INPUT_CLS} mt-3 resize-y !text-xs" placeholder="Açıklama (isteğe bağlı)"></textarea>
            <div class="grid grid-cols-2 gap-2 mt-2">
              <button type="button" data-refund-decide="reject" data-refund="${f.id}" class="py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100 transition">✕ Reddet</button>
              <button type="button" data-refund-decide="approve" data-refund="${f.id}" class="py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition">✓ Onayla · ${formatMoney(f.amount)} iade</button>
            </div>` : ''}
        </li>`;
    };
    // Admin: sonuçlanan talepler filtresinde geçmişi topluca temizleme
    const clearAll = admin && state.refundFilter !== 'pending' && list.length ? `
      <div class="flex justify-end mb-2">
        <button type="button" data-delete-refund="all" class="text-[11px] font-semibold text-rose-500 hover:text-rose-600 hover:underline">🗑️ Bu listedeki ${list.length} kaydı sil</button>
      </div>` : '';
    box.innerHTML = list.length
      ? `${clearAll}<ul class="space-y-3">${list.map(card).join('')}</ul>`
      : emptyState(admin ? 'Bu filtrede iade talebi yok.' : 'Henüz iade talebin yok. Kiraladığın gün, indirimsiz bir kitabı "↩️ İade" ile iade edebilirsin.');
    box.querySelectorAll('[data-refund-note]').forEach((t) => { if (drafts[t.dataset.refundNote]) t.value = drafts[t.dataset.refundNote]; });
    // Üye: sonuçlanan talepleri gördü olarak işaretle
    if (!admin) {
      const todo = refunds.filter((f) => f.userId === state.currentUserId && f.status !== 'pending' && !f.userSeenAt && !state.purgePending.has(`rfseen:${f.id}`));
      if (todo.length) {
        todo.forEach((f) => state.purgePending.add(`rfseen:${f.id}`));
        const now = isoAt(Date.now());
        commitOps(todo.map((f) => (bt) => bt.update(col('refunds').doc(f.id), { userSeenAt: now }))).catch((e) => console.error(e));
      }
    }
  }

  /* Admin: onayla (bakiye iadesi + kiralama ve istatistik silme) / reddet */
  async function decideRefund(id, decision) {
    if (!requireAdmin()) return;
    const f = refunds.find((x) => x.id === id);
    if (!f || f.status !== 'pending') return;
    if (refundExpired(f)) { expireStaleRefunds(); return toast('Bu talebin süresi geçti · gün içinde onaylanmadığı için reddedildi.', 'info'); }
    const adminNote = (document.querySelector(`[data-refund-note="${id}"]`)?.value || '').trim() || null;
    const decided = { decidedAt: isoAt(Date.now()), decidedBy: state.currentUserId, adminNote };
    if (decision === 'reject') {
      await run(col('refunds').doc(id).update({ status: 'rejected', ...decided }), 'İade talebi reddedildi.', 'info');
      return;
    }
    const r = getRental(f.rentalId);
    const u = getUser(f.userId);
    if (!r || !u) return toast('Kiralama ya da kullanıcı bulunamadı; talep onaylanamaz.', 'error');
    const ops = [
      ...rentalDeleteOps([r]),          // kiralama silinir + kitap kilidi açılır
      ...ratingCleanupOps([r]),         // o kitaba başka kiralaması yoksa oyu da silinir
      ...pointsSyncOps([u.id], { rentals: new Set([r.id]) }),
      (bt) => bt.update(col('users').doc(u.id), { balance: round2(u.balance + f.amount) }),
      (bt) => bt.update(col('refunds').doc(id), { status: 'approved', ...decided })
    ];
    await run(commitOps(ops), `✓ İade onaylandı · ${u.name} bakiyesine ${formatMoney(f.amount)} yüklendi.`);
  }

  /* Admin: sonuçlanan iade kayıtlarını geçmişten siler (id = 'all' → açık filtredeki hepsi).
     Bekleyen talepler silinmez; bakiye ve kiralamalar değişmez, yalnızca kayıt kalkar. */
  function deleteRefunds(id) {
    if (!requireAdmin()) return;
    const list = refunds.filter((f) => refundStatus(f) !== 'pending'
      && (id === 'all' ? refundStatus(f) === state.refundFilter : f.id === id));
    if (!list.length) return;
    const one = list.length === 1 ? list[0] : null;
    openConfirm({
      title: one ? 'İade kaydı silinsin mi?' : `${list.length} iade kaydı silinsin mi?`,
      message: one
        ? `${escapeHTML(getUser(one.userId)?.name || 'Üye')} · ${escapeHTML(getBook(one.bookId)?.title || 'Silinmiş kitap')} iade kaydı geçmişten kalıcı olarak silinecek. Bakiye değişmez.`
        : 'Bu listedeki iade kayıtları geçmişten kalıcı olarak silinecek. Bakiyeler değişmez.',
      onConfirm: async () => {
        await run(commitOps(list.map((f) => (bt) => bt.delete(col('refunds').doc(f.id)))),
          one ? 'İade kaydı silindi.' : `${list.length} iade kaydı silindi.`, 'info');
        openRefundsModal();
      }
    });
  }

  /* ==========================================================
     17.0) PROFİLİM · ad, giriş yöntemleri, şifre belirle / değiştir / sıfırla
     ========================================================== */
  const authProviders = () => (auth.currentUser?.providerData || []).map((p) => p.providerId);
  function googleProvider() {
    const p = new firebase.auth.GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    return p;
  }

  /* Hassas işlemler (şifre, hesap bağlama) yakın zamanda giriş ister: gerekirse yeniden doğrular */
  async function withRecentLogin(fn) {
    try {
      return await fn();
    } catch (e) {
      if (e.code !== 'auth/requires-recent-login' || !authProviders().includes('google.com')) throw e;
      await auth.currentUser.reauthenticateWithPopup(googleProvider());
      return fn();
    }
  }

  function openProfileModal() {
    const u = currentUser();
    if (!u) return;
    toggleProfile(false);
    const prov = authProviders();
    const hasGoogle = prov.includes('google.com');
    const hasPassword = prov.includes('password');
    const s = userStats(u.id);
    const activeCount = rentals.filter((r) => r.userId === u.id && isActiveRental(r)).length;

    const method = (on, emoji, title, desc, action = '') => `
      <li class="flex items-center gap-3 p-3 rounded-xl border ${on ? 'border-emerald-100 bg-emerald-50/40' : 'border-slate-100 bg-white'}">
        <span class="w-9 h-9 rounded-xl bg-white shadow-soft flex items-center justify-center shrink-0 text-base">${emoji}</span>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-semibold text-slate-700">${title}</p>
          <p class="text-[10px] ${on ? 'text-emerald-600' : 'text-slate-400'}">${desc}</p>
        </div>
        ${action}
      </li>`;
    const pwInput = (name, label, auto) => field(label,
      `<input name="${name}" type="password" minlength="6" required autocomplete="${auto}" class="${INPUT_CLS}" placeholder="••••••" />`);

    openModal(`
      <div class="relative p-5 sm:p-6 bg-gradient-to-br from-brand-500 to-brand-700 text-white overflow-hidden">
        <span class="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10"></span>
        <span class="absolute right-20 -bottom-12 w-28 h-28 rounded-full bg-white/10"></span>
        <button type="button" data-modal-close aria-label="Kapat" class="absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 flex items-center justify-center transition">${icon('close', 'w-5 h-5 pointer-events-none')}</button>
        <p class="relative text-[11px] font-semibold text-brand-100">Ayarlar ⚙️</p>
        <div class="relative flex items-center gap-3.5 mt-3">
          ${avatarHTML(u, 'w-16 h-16 text-lg ring-4 ring-white/25')}
          <div class="min-w-0">
            <h3 class="text-lg font-bold truncate">${escapeHTML(u.name)}</h3>
            <p class="text-[11px] text-brand-100 truncate">${escapeHTML(u.email || '')}</p>
            <div class="flex items-center gap-1.5 flex-wrap mt-1">
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20">${u.role === 'admin' ? '★ ' : ''}${ROLES[u.role]?.label}</span>
              ${u.joinedAt ? `<span class="text-[10px] text-brand-100">Üyelik: ${formatLongDate(dateFromKey(u.joinedAt))}</span>` : ''}
            </div>
          </div>
        </div>
      </div>

      <div class="p-5 sm:p-6 space-y-5">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          ${[
            { label: 'Bakiye', value: formatMoney(u.balance), tone: 'text-emerald-600', bg: 'bg-emerald-50/70' },
            { label: 'Aktif Kiralık', value: `${activeCount} kitap`, tone: 'text-brand-700', bg: 'bg-brand-50/70' },
            { label: 'Toplam Harcama', value: formatMoney(s.spent), tone: 'text-slate-800', bg: 'bg-slate-50' },
            { label: 'Puan ⭐', value: formatPoints(s.points.available), tone: 'text-amber-600', bg: 'bg-amber-50/70' }
          ].map((t) => `
            <div class="rounded-2xl ${t.bg} px-3 py-3">
              <p class="text-[10px] text-slate-400 font-medium">${t.label}</p>
              <p class="text-sm font-bold ${t.tone} truncate">${t.value}</p>
            </div>`).join('')}
        </div>

        <form data-form="saveName" class="space-y-2" autocomplete="off">
          <h4 class="text-xs font-bold text-slate-700">Ad Soyad</h4>
          <div class="flex gap-2">
            <input name="name" required minlength="2" maxlength="60" value="${escapeHTML(u.name)}" class="${INPUT_CLS} flex-1 min-w-0" />
            <button type="submit" class="${BTN_PRIMARY} shrink-0">Kaydet</button>
          </div>
        </form>

        <div>
          <h4 class="text-xs font-bold text-slate-700 mb-2">Giriş Yöntemleri</h4>
          <ul class="space-y-2">
            ${method(hasGoogle, '🟢', 'Google', hasGoogle ? 'Bağlı · Google ile tek tıkla giriş' : 'Bağlı değil',
              hasGoogle ? '<span class="text-[10px] font-semibold text-emerald-600 shrink-0">✓</span>'
                : `<button type="button" data-link-google class="${BTN_SOFT} !py-1.5 shrink-0">Bağla</button>`)}
            ${method(hasPassword, '🔑', 'E-posta & Şifre', hasPassword ? 'Şifre belirlendi · e-posta + şifre ile de girebilirsin' : 'Henüz şifre belirlenmedi',
              hasPassword ? '<span class="text-[10px] font-semibold text-emerald-600 shrink-0">✓</span>' : '')}
          </ul>
        </div>

        <form data-form="setPassword" class="p-4 rounded-2xl bg-brand-50/40 border border-brand-100 space-y-3" autocomplete="off">
          <div>
            <h4 class="text-xs font-bold text-slate-700">${hasPassword ? 'Şifreyi Değiştir' : 'Şifre Belirle'}</h4>
            <p class="text-[10px] text-slate-400 mt-0.5">${hasPassword
              ? 'Güvenlik için önce eski şifreni gir. Yeni şifren en az 6 karakter olmalı. Eski şifreni unuttuysan aşağıdan sıfırlama bağlantısı iste.'
              : 'Şifre belirlersen giriş ekranında e-posta + şifre ile de girebilirsin. Google girişin aynen kalır.'}</p>
          </div>
          ${hasPassword ? pwInput('current', 'Eski Şifre', 'current-password') : ''}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${pwInput('password', 'Yeni Şifre', 'new-password')}
            ${pwInput('repeat', 'Yeni Şifre (tekrar)', 'new-password')}
          </div>
          <button type="submit" class="${BTN_PRIMARY} w-full !py-2.5">${hasPassword ? 'Şifreyi Güncelle' : 'Şifreyi Kaydet'}</button>
        </form>

        <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80">
          <span class="text-base">✉️</span>
          <p class="flex-1 min-w-0 text-[11px] text-slate-500">Şifreni mi unuttun? <b class="text-slate-600">${escapeHTML(u.email || '')}</b> adresine sıfırlama bağlantısı gönderelim.</p>
          <button type="button" data-send-reset class="${BTN_SOFT} !py-1.5 shrink-0">Gönder</button>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button type="button" data-sign-out class="${BTN_SOFT} !text-rose-500 !border-rose-100 hover:!border-rose-300">Çıkış Yap</button>
          <div class="flex gap-2">
            <button type="button" data-user-stats="${u.id}" class="${BTN_SOFT}">📊 İstatistiklerim</button>
            <button type="button" data-modal-close class="${BTN_PRIMARY}">Kapat</button>
          </div>
        </div>
      </div>`, 'lg');
  }

  async function handleSaveName(fd) {
    const name = String(fd.name || '').trim();
    if (name.length < 2) return toast('Ad en az 2 karakter olmalı.', 'error');
    const u = currentUser();
    if (!u || name === u.name) return;
    const ok = await run(col('users').doc(u.id).update({ name }), 'Adın güncellendi.');
    if (ok) {
      auth.currentUser?.updateProfile({ displayName: name }).catch(() => {});
      if (state.modalOpen) openProfileModal();
    }
  }

  async function handleSetPassword(fd) {
    const user = auth.currentUser;
    if (!user) return;
    const hasPassword = authProviders().includes('password');
    if (hasPassword && !fd.current) return toast('Eski şifreni girmelisin.', 'error');
    if ((fd.password || '').length < 6) return toast('Şifre en az 6 karakter olmalı.', 'error');
    if (fd.password !== fd.repeat) return toast('Şifreler birbiriyle aynı değil.', 'error');
    if (hasPassword && fd.password === fd.current) return toast('Yeni şifre eskisiyle aynı olamaz.', 'error');
    try {
      // Şifre zaten varsa değişiklik yalnızca eski şifre doğrulanınca yapılır
      if (hasPassword) {
        try {
          await user.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(user.email, fd.current));
        } catch (e) {
          if (['auth/invalid-credential', 'auth/wrong-password'].includes(e?.code)) return toast('Eski şifre hatalı.', 'error');
          throw e;
        }
      }
      if (hasPassword) await withRecentLogin(() => user.updatePassword(fd.password));
      else await withRecentLogin(() => user.linkWithCredential(firebase.auth.EmailAuthProvider.credential(user.email, fd.password)));
      await user.reload();
      state.authUser = auth.currentUser;
      toast(hasPassword ? 'Şifren güncellendi 🔑' : 'Şifren belirlendi 🔑 Artık e-posta + şifre ile de girebilirsin.', 'success');
      openProfileModal();
    } catch (e) {
      toast(authErrorMsg(e), 'error');
    }
  }

  async function linkGoogle() {
    try {
      await withRecentLogin(() => auth.currentUser.linkWithPopup(googleProvider()));
      await auth.currentUser.reload();
      state.authUser = auth.currentUser;
      toast('Google hesabın bağlandı.', 'success');
      openProfileModal();
    } catch (e) {
      toast(authErrorMsg(e), 'error');
    }
  }

  async function sendResetFromProfile() {
    const email = auth.currentUser?.email;
    if (!email) return;
    try {
      await auth.sendPasswordResetEmail(email);
      toast(`Sıfırlama bağlantısı ${email} adresine gönderildi.`, 'success');
    } catch (e) {
      toast(authErrorMsg(e), 'error');
    }
  }

