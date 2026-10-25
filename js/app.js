  /* ==========================================================
     20) OLAY DİNLEYİCİLERİ & BAŞLATMA
     ========================================================== */
  function bindEvents() {
    $('#profileBtn').addEventListener('click', (e) => { e.stopPropagation(); toggleProfile(); });
    $('#mobileMenuBtn').addEventListener('click', (e) => { e.stopPropagation(); toggleMobileMenu(); });

    // Profil paneli (event delegation)
    $('#profilePanel').addEventListener('click', (e) => {
      e.stopPropagation();
      const t = e.target;
      let m;
      if ((m = t.closest('[data-sign-out]')))        return signOut();
      if ((m = t.closest('[data-open-profile]')))    return openProfileModal();
      if (t.closest('a[href^="#"]'))                 return toggleProfile(false);
      if ((m = t.closest('[data-seed]')))            return seedCatalog(m.dataset.seed);
      if ((m = t.closest('[data-balance-action]')))  return handleBalanceAction(m.dataset.balanceAction, m.dataset.user);
      if ((m = t.closest('[data-set-role]')))        return setRole(m.dataset.user, m.dataset.setRole);
      if ((m = t.closest('[data-toggle-member-view]'))) return setMemberView(!state.memberView);
      if ((m = t.closest('[data-open-feedback]')))   { toggleProfile(false); return openFeedbackModal(m.dataset.openFeedback === 'list'); }
      if ((m = t.closest('[data-open-refunds]')))    { toggleProfile(false); return openRefundsModal(); }
      if ((m = t.closest('[data-quick-amount]')))    { const i = $('#bmAmount'); if (i) { i.value = m.dataset.quickAmount; i.focus(); } return; }
      if ((m = t.closest('[data-panel-user]')))      { state.panelUser = state.panelUser === m.dataset.panelUser ? null : m.dataset.panelUser; return renderAdminPanel(); }
      if ((m = t.closest('[data-user-stats]')))      return openUserStatsModal(m.dataset.userStats);
    });

    // Sayfa geneli tıklamalar (tek merkezden event delegation)
    document.addEventListener('click', (e) => {
      const t = e.target;
      if (!t.closest('#profileWrapper')) toggleProfile(false);
      if (!t.closest('header')) toggleMobileMenu(false);

      const el = (sel) => t.closest(sel);
      let m;
      if ((m = el('#coverLightbox')))          return closeCoverLightbox();
      if ((m = el('[data-zoom-cover]')))       return openCoverLightbox(m.querySelector('img'));
      if ((m = el('[data-exit-member-view]'))) return setMemberView(false);
      if ((m = el('[data-open-feedback]')))    return openFeedbackModal(m.dataset.openFeedback === 'list');
      if ((m = el('[data-fb-filter]')))        { state.fbFilter = m.dataset.fbFilter; return openFeedbackModal(); }
      if ((m = el('[data-send-reply]')))       return sendFeedbackReply(m.dataset.sendReply);
      if ((m = el('[data-delete-feedback]')))  return deleteFeedback(m.dataset.deleteFeedback);
      if ((m = el('[data-refund-rental]')))    return openRefundRequest(m.dataset.refundRental);
      if ((m = el('[data-refund-filter]')))    { state.refundFilter = m.dataset.refundFilter; return openRefundsModal(); }
      if ((m = el('[data-refund-decide]')))    return decideRefund(m.dataset.refund, m.dataset.refundDecide);
      if ((m = el('[data-modal-close]')))      return closeModal();
      if ((m = el('[data-confirm-yes]')))      { const fn = state.confirmAction; state.confirmAction = null; return fn?.(); }
      if ((m = el('[data-sign-out]')))         return signOut();
      if ((m = el('[data-open-profile]')))     return openProfileModal();
      if ((m = el('[data-link-google]')))      return linkGoogle();
      if ((m = el('[data-send-reset]')))       return sendResetFromProfile();
      if ((m = el('[data-stats-page]')))       return goStatsPage(m.dataset.statsPage, m.dataset.page);
      if ((m = el('[data-stats-del-rental]'))) return deleteStatsRecord('rental', m.dataset.statsDelRental);
      if ((m = el('[data-stats-reset]')))      return resetUserStats(m.dataset.statsReset);
      if ((m = el('[data-reset-all]')))        return confirmResetStats(m.dataset.resetAll, null);
      if ((m = el('[data-refresh-deals]')))    return refreshDeals();
      if ((m = el('[data-delete-page-log]')))  return deletePriceLogFromPage(m.dataset.deletePageLog);
      if ((m = el('[data-delete-log]')))       return deletePriceLog(m.dataset.deleteLog, m.dataset.bookId, m.dataset.backOffer);
      if ((m = el('[data-remove-cover]')))     return removeDraftCover(m.dataset.removeCover);
      if ((m = el('[data-rent-book]')))        return m.disabled ? null : rentBook(m.dataset.rentBook);
      if ((m = el('[data-rent-offer]')))       return m.disabled ? null : rentOffer(m.dataset.rentOffer);
      if ((m = el('[data-quick]')))            return runQuick(m.dataset.quick);
      if ((m = el('[data-edit-book]')))        return openBookFormModal(m.dataset.editBook);
      if ((m = el('[data-delete-book]')))      return deleteBook(m.dataset.deleteBook);
      if ((m = el('[data-remove-deal]')))      return removeFromDeals(m.dataset.removeDeal);
      if ((m = el('[data-add-vitrine]')))      return openVitrineModal();
      if ((m = el('[data-buy-coupon]')))       return m.disabled ? null : buyCoupon(m.dataset.buyCoupon);
      if ((m = el('[data-add-shop-coupon]')))  return openShopCouponModal();
      if ((m = el('[data-delete-shop-coupon]'))) return deleteShopCoupon(m.dataset.deleteShopCoupon);
      if ((m = el('[data-edit-shop-coupon]'))) return openShopCouponModal(m.dataset.editShopCoupon);
      if ((m = el('[data-use-bogo]')))         return openBogoModal(m.dataset.useBogo);
      if ((m = el('[data-bulk-news]')))        return openBulkNewsModal();
      if ((m = el('[data-rate-book]')))        return rateBook(m.dataset.rateBook, m.dataset.score);
      if ((m = el('[data-unrate-book]')))      return unrateBook(m.dataset.unrateBook);
      if ((m = el('[data-rating-info]')))      return openRatingInfoModal(m.dataset.ratingInfo);
      if ((m = el('[data-delete-rating]')))    return deleteRating(m.dataset.deleteRating, m.dataset.book);
      if ((m = el('[data-delete-vitrine]')))   return deleteVitrine(m.dataset.deleteVitrine);
      if ((m = el('[data-open-deal]')))        return openBookModal(m.dataset.openDeal);
      if ((m = el('[data-delete-rental]')))    return deleteRental(m.dataset.deleteRental);
      if ((m = el('[data-cancel-rental]')))    return cancelRental(m.dataset.cancelRental);
      if ((m = el('[data-wipe-rental]')))      return wipeRental(m.dataset.wipeRental);
      if ((m = el('[data-delete-type]')))      return deleteType(m.dataset.deleteType);
      if ((m = el('[data-edit-type]')))        return openTypeEditor(m.dataset.editType);
      if ((m = el('[data-delete-news]')))      return deleteNews(m.dataset.deleteNews);
      if ((m = el('[data-edit-news]')))        return openNewsModal(m.dataset.editNews);
      if ((m = el('[data-book-tab]')))         { state.bookTab = m.dataset.bookTab; return renderCurrentPage(); }
      if ((m = el('[data-filter-clear]')))     { const p = m.dataset.filterClear; state[`${p}Kind`] = 'none'; state[`${p}Value`] = 'all'; return rerenderFilter(p); }
      if ((m = el('[data-all-logs]')))         return openBookPriceLogsModal(m.dataset.allLogs, m.dataset.backOffer || '');
      if ((m = el('[data-stats-all-rentals]'))) return openStatsRentalsModal(m.dataset.statsAllRentals);
      if ((m = el('[data-book-rentals]')))     return m.disabled ? null : openBookRentalsModal(m.dataset.bookRentals, Number(m.dataset.rpage) || 1);
      if ((m = el('[data-rent-tab]')))         { state.rentTab = m.dataset.rentTab; return renderCurrentPage(); }
      if ((m = el('[data-rent-status]')))      { state.rentStatus = m.dataset.rentStatus; return renderCurrentPage(); }
      if ((m = el('[data-ann-tab]')))          { state.annTab = m.dataset.annTab; return renderCurrentPage(); }
      if ((m = el('[data-ann-page]')))         {
        const [key, p] = m.dataset.annPage.split(':');
        state[key] = Number(p) || 1;
        renderCurrentPage();
        return $('#annBody')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if ((m = el('[data-edit-update]')))      return openUpdateModal(m.dataset.editUpdate);
      if ((m = el('[data-delete-update]')))    return deleteUpdate(m.dataset.deleteUpdate);
      if ((m = el('[data-open-ann]')))         return openAnnouncementModal(m.dataset.openAnn);
      if ((m = el('[data-edit-offer]')))       return openOfferFormModal(m.dataset.editOffer);
      if ((m = el('[data-delete-offer]')))     return deleteOffer(m.dataset.deleteOffer);
      if ((m = el('[data-open-book]')))        return openBookModal(m.dataset.openBook, { backOfferId: m.dataset.backOffer || '' });
      if ((m = el('[data-open-offer]')))       return openOfferDetail(m.dataset.openOffer);
      if ((m = el('[data-user-stats]')))       return openUserStatsModal(m.dataset.userStats);
    });

    // Modal backdrop
    $('#modalBackdrop').addEventListener('click', closeModal);

    // Form gönderimleri
    $('#modalPanel').addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target;
      const fd = Object.fromEntries(new FormData(form).entries());
      const editId = form.dataset.editId || null;
      switch (form.dataset.form) {
        case 'saveBook':    return handleSaveBook(fd, editId);
        case 'changePrice': return handleChangePrice(fd);
        case 'saveUpdate':  return handleSaveUpdate(fd, editId);
        case 'saveOffer':   return handleSaveOffer(fd, editId);
        case 'saveType':    return handleSaveType(fd, editId);
        case 'saveNews':    return handleSaveNews(fd, editId);
        case 'saveName':    return handleSaveName(fd);
        case 'resetStats':  return handleResetStats(form);
        case 'setPassword': return handleSetPassword(fd);
        case 'saveVitrine': return handleSaveVitrine(fd);
        case 'saveShopCoupon': return handleSaveShopCoupon(fd, editId);
        case 'bulkNews':    return handleBulkNews(fd);
        case 'sendFeedback': return handleSendFeedback(fd);
        case 'sendRefund':  return handleSendRefund(fd, form);
        case 'useBogo':     return handleUseBogo(form);
      }
    });

    // Canlı form alanları ve filtreler
    document.addEventListener('input', (e) => {
      const t = e.target;
      if (t.id === 'bf-title') updateBookFormPreview();
      if (t.id === 'of-price') updateOfferCalc();
      if (t.id === 'cpNew' || t.id === 'cpOld') updateChangePricePreview();
      if (t.id === 'vd-rate') updateVitrinePreview();
      if (t.id === 'sc-value' || t.id === 'sc-free') updateShopCouponForm();
    });
    document.addEventListener('change', (e) => {
      const t = e.target;
      if (t.matches('[data-cover-input]')) return handleCoverInput(t);
      if (t.matches('[data-quick-status]')) return setBookStatus(t.dataset.quickStatus, t.value);
      if (t.matches('[data-deal-group]')) return setDealGroup(t.value);
      if (t.matches('[data-offer-slot]')) { updateOfferSlotPreview(Number(t.dataset.offerSlot)); return updateOfferCalc(); }
      if (t.id === 'bf-type' || t.id === 'bf-status') return updateBookFormPreview();
      if (t.id === 'bf-date') delete t.dataset.auto;
      if (t.id === 'vd-book') updateVitrinePreview();
      if (t.id === 'rentCoupon') updateRentCoupon();
      if (t.id === 'sc-type' || t.id === 'sc-timed') updateShopCouponForm();
      if (t.matches('[data-bogo-slot]')) updateBogoSummary();
      if (t.id === 'bn-cat' || t.matches('[data-bn-scope]')) updateBulkNewsPreview();
      if (t.matches('[data-filter-kind]')) { const p = t.dataset.filterKind; state[`${p}Kind`] = t.value; state[`${p}Value`] = 'all'; return rerenderFilter(p); }
      if (t.matches('[data-filter-value]')) { const p = t.dataset.filterValue; state[`${p}Value`] = t.value; return rerenderFilter(p); }
      if (t.id === 'cpBook' || t.id === 'cpDate') updateChangePricePreview(true);
      if (t.id === 'cpTime') updateChangePricePreview();
      if (t.id === 'updDateInput' && t.value) $('#updYearInput').value = t.value.slice(0, 4);
    });

    // Klavye: ESC kapatır, Enter/Space div-butonları açar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('#coverLightbox').classList.contains('hidden')) return closeCoverLightbox();
      if (e.key === 'Escape') { closeModal(); toggleProfile(false); toggleMobileMenu(false); }
      const card = e.target.closest?.('[data-open-ann]');
      if (card && (e.key === 'Enter' || e.key === ' ') && e.target === card) {
        e.preventDefault();
        openAnnouncementModal(card.dataset.openAnn);
      }
      const deal = e.target.closest?.('div[data-open-deal]');
      if (deal && (e.key === 'Enter' || e.key === ' ') && e.target === deal) {
        e.preventDefault();
        openBookModal(deal.dataset.openDeal);
      }
      const bookCard = e.target.closest?.('div[data-open-book]');
      if (bookCard && (e.key === 'Enter' || e.key === ' ') && e.target === bookCard) {
        e.preventDefault();
        openBookModal(bookCard.dataset.openBook);
      }
    });

    // Ekran büyüdüğünde mobil menüyü kapat
    window.addEventListener('resize', () => { if (window.innerWidth >= 1024) toggleMobileMenu(false); });

    window.addEventListener('hashchange', router);
  }

  /* ==========================================================
     21) KİMLİK DOĞRULAMA (Google + e-posta/şifre) & CANLI SENKRON
     ========================================================== */
  const USER_COLORS = [
    'from-brand-500 to-brand-700', 'from-sky-400 to-cyan-500', 'from-indigo-400 to-violet-500',
    'from-teal-400 to-emerald-500', 'from-rose-400 to-orange-400', 'from-amber-400 to-orange-500'
  ];
  const colorFor = (uid) => USER_COLORS[[...uid].reduce((s, c) => s + c.charCodeAt(0), 0) % USER_COLORS.length];

  /* Koleksiyon → yerel dizi eşlemesi (belge adı id olur; kitapta sayısal id alanı korunur) */
  const SYNC = [
    ['users', users],
    ['bookTypes', bookTypes, (q) => q.orderBy('order')],
    ['books', books, null, (d) => ({ ...d.data(), id: Number(d.data().id ?? d.id) })],
    ['rentals', rentals],
    ['offerPurchases', offerPurchases],
    ['priceLogs', priceLogs],
    ['announcements', announcements],
    ['offers', offers],
    ['discounts', discounts, null, (d) => ({ id: d.id, ...d.data(), bookId: Number(d.data().bookId), endsMs: d.data().endsAt?.toMillis?.() ?? null })],
    ['ratings', ratings, null, (d) => ({ id: d.id, ...d.data(), bookId: Number(d.data().bookId) })],
    ['couponShop', couponShop, null, (d) => ({ id: d.id, ...d.data(), endsMs: d.data().endsAt?.toMillis?.() ?? null })],
    ['coupons', coupons, null, (d) => ({ id: d.id, ...d.data(), expiresMs: d.data().expiresAt?.toMillis?.() ?? 0 })],
    ['settings', appSettings]
  ];
  let unsubscribers = [];
  let renderQueued = false;

  /* Snapshot'lar art arda gelince tek karede çiz */
  function scheduleRender() {
    if (!state.ready || renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      if (!state.ready || !currentUser()) return;
      applyDuePrices();
      setupMissingLedgers();
      ensureFeedbackSync();
      expireStaleRefunds();
      renderProfile();
      renderCurrentPage();
    });
  }

  /* Geri bildirim dinleyicisi: gerçek Admin hepsini, diğerleri yalnızca kendininkini dinler
     (kural, üyenin başkasının geri bildirimini okumasına izin vermez). Rol değişince yeniden kurulur. */
  let feedbackUnsub = null;
  let refundUnsub = null;
  let feedbackMode = null;
  function ensureFeedbackSync() {
    if (!state.currentUserId || !currentUser()) return;
    const mode = isRealAdmin() ? 'all' : 'mine';
    if (mode === feedbackMode) return;
    feedbackUnsub?.();
    refundUnsub?.();
    feedbackMode = mode;
    const scoped = (name) => (mode === 'all' ? col(name) : col(name).where('userId', '==', state.currentUserId));
    feedbackUnsub = scoped('feedback').onSnapshot((snap) => {
      feedbacks.splice(0, feedbacks.length, ...snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      scheduleRender();
      if (state.feedbackOpen) renderFeedbackList(); // açık pencerede yalnızca liste (yazılan taslaklar korunur)
    }, (err) => console.error('[feedback]', err));
    // İade talepleri: aynı kapsam (Admin hepsi · üye kendininki)
    refundUnsub = scoped('refunds').onSnapshot((snap) => {
      refunds.splice(0, refunds.length, ...snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      scheduleRender();
      if (state.refundsOpen) renderRefundList(); // açık pencerede yalnızca liste (Admin notu taslakları korunur)
    }, (err) => console.error('[refunds]', err));
  }

  /* Tüm koleksiyonları dinler. Bir koleksiyon okunamazsa (örn. kuralı henüz yüklenmemiş)
     uygulama yine açılır; okunamayanların listesiyle çözülür → oturum asla kapatılmaz.
     Tarayıcı önbelleğinden gelen (eski olabilecek) ilk veriyle açılmaz: açılıştaki otomatik yazmalar
     (applyDuePrices vb.) sunucu verisini görsün diye sunucu onayı beklenir · bağlantı yoksa 10 sn sonra açılır. */
  function startSync() {
    const waiting = new Set(SYNC.map(([name]) => name));
    const failed = [];
    return new Promise((resolve) => {
      const settle = (name) => { if (waiting.delete(name) && !waiting.size) resolve(failed); };
      setTimeout(() => { if (waiting.size) { waiting.clear(); resolve(failed); } }, 10000);
      SYNC.forEach(([name, arr, query, map]) => {
        const q = query ? query(col(name)) : col(name);
        // includeMetadataChanges: önbellekteki veri sunucuyla aynıysa da "sunucudan geldi" bildirimi alınır
        unsubscribers.push(q.onSnapshot({ includeMetadataChanges: true }, (snap) => {
          arr.splice(0, arr.length, ...snap.docs.map(map || ((d) => ({ id: d.id, ...d.data() }))));
          if (!snap.metadata.fromCache) settle(name);
          scheduleRender();
        }, (err) => {
          console.error(`[${name}]`, err);
          if (waiting.has(name)) { failed.push(name); settle(name); }
          else toast(`Canlı bağlantı koptu (${name}): ${fsErrorMsg(err)}`, 'error');
        }));
      });
    });
  }

  function stopSync() {
    unsubscribers.forEach((fn) => fn());
    unsubscribers = [];
    SYNC.forEach(([, arr]) => { arr.length = 0; });
    feedbackUnsub?.();
    refundUnsub?.();
    feedbackUnsub = null;
    refundUnsub = null;
    feedbackMode = null;
    feedbacks.length = 0;
    refunds.length = 0;
  }

  /* İlk girişte users/{uid} belgesi oluşturulur (bakiye 0; ana Admin e-postası → Admin) */
  async function ensureUserDoc(user) {
    const ref = col('users').doc(user.uid);
    const snap = await ref.get();
    if (snap.exists) return;
    const email = (user.email || '').toLowerCase();
    const owner = email === OWNER_EMAIL && user.emailVerified;
    await ref.set({
      name: (state.pendingName || user.displayName || email.split('@')[0] || 'Aile Üyesi').trim(),
      email,
      photoURL: user.photoURL || null,
      role: owner ? 'admin' : 'member',
      balance: 0,
      color: colorFor(user.uid),
      joinedAt: localDateKey(),
      lastTx: null,
      lastTxType: null
    });
  }

  /* Son giriş zamanı (Adminler profil panelindeki Kullanıcı Yönetimi'nde görür) · site her açılışta/yenilemede yazılır */
  function recordLogin() {
    col('users').doc(state.currentUserId).update({ lastLoginAt: new Date().toISOString() })
      .catch((e) => console.error('[lastLoginAt]', e));
  }

  async function handleAuthState(user) {
    stopSync();
    state.ready = false;
    state.authUser = user;
    state.currentUserId = user?.uid || null;
    if (!user) { closeModal(); toggleProfile(false); return showAuth('form'); }

    // İzinli liste dışındaki hesaplar içeri alınmaz (kurallar da tüm erişimi reddeder)
    if (!isAllowedEmail(user.email)) {
      const email = user.email || 'Bu hesap';
      await auth.signOut().catch(() => {});
      showAuth('form');
      return showAuthError(`${email} hesabının bu siteye erişim izni yok. Yalnızca aile üyelerinin hesapları girebilir.`);
    }
    // Şifreyle açılmış ve henüz doğrulanmamış e-posta → doğrulama ekranı (oturum açık kalır)
    if (!user.emailVerified) return showAuth('verify', user.email);

    showAuth('loading', 'Veriler yükleniyor…');
    try {
      await ensureUserDoc(user);
      state.pendingName = '';
    } catch (e) {
      // Profil okunamadı/oluşturulamadı: oturumu KAPATMA, tekrar denet
      console.error(e);
      return showAuth('retry', fsErrorMsg(e));
    }
    const failed = await startSync();
    if (auth.currentUser?.uid !== user.uid) return; // bu arada çıkış/hesap değişimi olduysa
    if (!currentUser()) {
      stopSync();
      return showAuth('retry', 'Kullanıcı profili okunamadı. Firestore kurallarının yüklü olduğundan emin ol.');
    }
    state.ready = true;
    state.freshAnnIds = new Set();
    recordLogin();
    hideAuth();
    router();
    renderProfile();
    if (failed.length) toast(`Bazı veriler okunamadı (${failed.join(', ')}). Firestore kurallarını deploy etmeyi unutma.`, 'error');
  }

  /* --- E-posta doğrulama --- */
  function setVerifyMsg(msg, ok = false) {
    const el = $('#authVerifyMsg');
    el.textContent = msg;
    el.className = `${msg ? '' : 'hidden '}text-[11px] font-medium rounded-xl px-3 py-2 ${ok ? 'text-emerald-700 bg-emerald-50' : 'text-rose-500 bg-rose-50'}`;
  }

  /* Doğrulandı mı? Kullanıcıyı ve kimlik belirtecini yenile (kurallar email_verified'ı belirteçten okur) */
  async function checkVerified() {
    const user = auth.currentUser;
    if (!user) return showAuth('form');
    try {
      await user.reload();
      if (!auth.currentUser.emailVerified) return setVerifyMsg('Henüz doğrulanmamış. E-postandaki bağlantıya tıkladıktan sonra tekrar dene (spam klasörüne de bak).');
      await auth.currentUser.getIdToken(true);
      handleAuthState(auth.currentUser);
    } catch (e) {
      setVerifyMsg(authErrorMsg(e));
    }
  }

  async function resendVerification() {
    try {
      await auth.currentUser?.sendEmailVerification();
      setVerifyMsg('Doğrulama e-postası tekrar gönderildi.', true);
    } catch (e) {
      setVerifyMsg(authErrorMsg(e));
    }
  }

  /* Yükleme hatasından sonra aynı oturumla yeniden dene */
  function retryLoad() {
    if (auth.currentUser) handleAuthState(auth.currentUser);
    else showAuth('form');
  }

  /* --- Giriş ekranı --- */
  let authMode = 'signin';

  function showAuth(view, text = '') {
    $('#authScreen').hidden = false;
    $('#authLoading').classList.toggle('hidden', view !== 'loading');
    $('#authCard').classList.toggle('hidden', view !== 'form');
    $('#authRetry').classList.toggle('hidden', view !== 'retry');
    $('#authVerify').classList.toggle('hidden', view !== 'verify');
    if (view === 'retry') $('#authRetryText').textContent = text;
    else if (view === 'verify') { $('#authVerifyEmail').textContent = text; setVerifyMsg(''); }
    else if (text) $('#authLoadingText').textContent = text;
    if (view === 'form') setAuthMode(authMode);
  }
  function hideAuth() { $('#authScreen').hidden = true; showAuthError(''); }

  function showAuthError(msg) {
    const el = $('#authError');
    el.textContent = msg;
    el.classList.toggle('hidden', !msg);
  }

  function setAuthMode(mode) {
    authMode = mode;
    const signup = mode === 'signup';
    $$('[data-auth-mode]').forEach((b) => {
      const on = b.dataset.authMode === mode;
      b.classList.toggle('bg-white', on);
      b.classList.toggle('shadow-soft', on);
      b.classList.toggle('text-brand-600', on);
      b.classList.toggle('text-slate-400', !on);
    });
    $('#authName').classList.toggle('hidden', !signup);
    $('#authPassword').autocomplete = signup ? 'new-password' : 'current-password';
    $('#authSubmit').textContent = signup ? 'Hesap Oluştur' : 'Giriş Yap';
    $('#authReset').classList.toggle('hidden', signup);
    showAuthError('');
  }

  function authErrorMsg(e) {
    const map = {
      'auth/invalid-credential': 'E-posta veya şifre hatalı.',
      'auth/wrong-password': 'E-posta veya şifre hatalı.',
      'auth/user-not-found': 'Bu e-postayla kayıtlı hesap yok.',
      'auth/invalid-email': 'Geçerli bir e-posta girin.',
      'auth/email-already-in-use': 'Bu e-posta zaten kayıtlı. Giriş Yap sekmesini kullan.',
      'auth/weak-password': 'Şifre en az 6 karakter olmalı.',
      'auth/too-many-requests': 'Çok fazla deneme yapıldı. Biraz sonra tekrar dene.',
      'auth/popup-closed-by-user': 'Google penceresi kapatıldı.',
      'auth/cancelled-popup-request': 'Google penceresi kapatıldı.',
      'auth/network-request-failed': 'İnternet bağlantısı yok.',
      'auth/requires-recent-login': 'Güvenlik için yeniden giriş gerekiyor. Çıkış yapıp tekrar girdikten sonra dene.',
      'auth/provider-already-linked': 'Bu giriş yöntemi hesabına zaten bağlı.',
      'auth/credential-already-in-use': 'Bu Google hesabı başka bir kullanıcıya bağlı.',
      'auth/popup-blocked': 'Tarayıcı açılır pencereyi engelledi. İzin verip tekrar dene.',
      'auth/missing-password': 'Şifre girmelisin.',
      'auth/operation-not-allowed': 'Bu giriş yöntemi Firebase konsolunda açık değil (Authentication → Sign-in method).',
      'auth/unauthorized-domain': `Bu adres (${location.hostname || 'file://'}) Firebase'de yetkili değil. Authentication → Settings → Authorized domains listesine ekle.`
    };
    return map[e?.code] || ('Giriş başarısız: ' + (e?.message || e?.code || 'bilinmeyen hata'));
  }

  async function signInGoogle() {
    if (location.protocol === 'file:') return showAuthError('Google girişi dosyadan (file://) açılınca çalışmaz. Sayfayı http://localhost üzerinden aç.');
    const provider = googleProvider();
    showAuthError('');
    try {
      await auth.signInWithPopup(provider);
    } catch (e) {
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
        return auth.signInWithRedirect(provider);
      }
      showAuthError(authErrorMsg(e));
    }
  }

  async function handleEmailAuth(e) {
    e.preventDefault();
    const email = $('#authEmail').value.trim();
    const password = $('#authPassword').value;
    const name = $('#authName').value.trim();
    if (!email || !password) return showAuthError('E-posta ve şifre zorunlu.');
    if (authMode === 'signup' && !name) return showAuthError('Ad Soyad zorunlu.');
    if (!isAllowedEmail(email)) return showAuthError('Bu e-postanın siteye erişim izni yok. Yalnızca aile üyelerinin hesapları girebilir.');
    const btn = $('#authSubmit');
    btn.disabled = true;
    try {
      if (authMode === 'signup') {
        state.pendingName = name;
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName: name });
        await cred.user.sendEmailVerification();
        showAuth('verify', cred.user.email);
      } else {
        await auth.signInWithEmailAndPassword(email, password);
      }
    } catch (err) {
      state.pendingName = '';
      showAuthError(authErrorMsg(err));
    } finally {
      btn.disabled = false;
    }
  }

  async function resetPassword() {
    const email = $('#authEmail').value.trim();
    if (!email) return showAuthError('Önce e-posta adresini yaz.');
    try {
      await auth.sendPasswordResetEmail(email);
      showAuthError('');
      toast('Şifre sıfırlama bağlantısı e-postana gönderildi.', 'success');
    } catch (err) {
      showAuthError(authErrorMsg(err));
    }
  }

  function signOut() {
    closeModal();
    toggleProfile(false);
    auth.signOut();
  }

  function bindAuthEvents() {
    $('#googleSignIn').addEventListener('click', signInGoogle);
    $('#emailAuthForm').addEventListener('submit', handleEmailAuth);
    $('#authReset').addEventListener('click', resetPassword);
    $('#authRetryBtn').addEventListener('click', retryLoad);
    $('#authRetrySignOut').addEventListener('click', signOut);
    $('#authVerifyDone').addEventListener('click', checkVerified);
    $('#authVerifyResend').addEventListener('click', resendVerification);
    $('#authVerifySignOut').addEventListener('click', signOut);
    $$('[data-auth-mode]').forEach((b) => b.addEventListener('click', () => setAuthMode(b.dataset.authMode)));
  }

  /* Alt bilgi: iletişim e-postası (Ana Admin) + telif yılı (2026'dan bugüne) */
  function renderFooter() {
    const mail = $('#footerEmail');
    mail.href = `mailto:${OWNER_EMAIL}`;
    mail.querySelector('span').textContent = OWNER_EMAIL;
    const y = new Date().getFullYear();
    $('#footerCopy').textContent = `© ${y > 2026 ? `2026–${y}` : '2026'} Family Bookshop. Tüm hakları saklıdır.`;
    // Alt bilgideki geri bildirim kutusu: doğrudan gönderir (Geri Bildirim sistemiyle aynı kayıt)
    $('#footerFeedback').addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      handleSendFeedback(Object.fromEntries(new FormData(form).entries()), form);
    });
  }

  function init() {
    renderMenus();
    renderFooter();
    bindEvents();
    bindAuthEvents();
    setInterval(tick, 1000);
    auth.getRedirectResult().catch((e) => showAuthError(authErrorMsg(e)));
    // Oturum tarayıcıda kalıcıdır: sayfa yenilense de (Live Server dahil) açık kalır
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .catch((e) => console.error(e))
      .finally(() => auth.onAuthStateChanged(handleAuthState));
  }

  document.addEventListener('DOMContentLoaded', init);
