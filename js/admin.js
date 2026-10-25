  /* ==========================================================
     15) KONTROLCÜ FORMLARI
     ========================================================== */

  /* --- Kitap ekle / düzenle (kapak: FileReader → base64) --- */
  function openBookFormModal(editId) {
    if (!requireAdmin()) return;
    const b = editId ? getBook(editId) : null;
    state.bookDraftCover = b ? b.cover : '';
    const today = localDateKey();
    const selType = b && getType(b.type) ? b.type : (getType(state.bookTab) ? state.bookTab : defaultTypeId());
    const typeOptions = bookTypes
      .map((t) => `<option value="${t.id}" ${selType === t.id ? 'selected' : ''}>${escapeHTML(t.label)}${t.inDeals ? '' : ' (indirime girmez)'}</option>`).join('');

    openModal(`
      ${modalHeader(b ? 'Kitabı Düzenle' : 'Yeni Kitap Ekle',
        b ? 'Buradan fiyat değişikliği Fiyat Logu\'na yazılmaz · loglu değişim için Fiyat Logu → Fiyat Güncelle.'
          : `Son ${NEW_BOOK_DISCOUNT.days} gün içinde çıktıysa Haberler'e duyuru düşer ve %${NEW_BOOK_DISCOUNT.rate} yeni kitap indirimi başlar.`, 'books')}
      <form data-form="saveBook" data-edit-id="${b ? b.id : ''}" class="p-5 space-y-3.5" autocomplete="off">
        <div class="flex gap-4 items-center p-3 rounded-2xl bg-brand-50/50 border border-brand-100">
          <div id="bookCoverPreview">${coverHTML({ title: b ? b.title : 'Yeni Kitap', type: selType, cover: state.bookDraftCover }, 'md')}</div>
          <div class="flex-1 min-w-0 space-y-1.5">
            <p class="text-[11px] font-semibold text-slate-600">Kapak Fotoğrafı</p>
            <div class="flex flex-wrap gap-1.5">
              <label class="${BTN_SOFT} !py-1.5 cursor-pointer">${icon('photo', 'w-3.5 h-3.5')}Dosya Seç
                <input type="file" accept="image/*" data-cover-input="book" class="sr-only" />
              </label>
              <button type="button" id="removeBookCover" data-remove-cover="book" class="${BTN_SOFT} !py-1.5 !text-rose-500 !border-rose-100 ${state.bookDraftCover ? '' : 'hidden'}">Kaldır</button>
            </div>
            <p class="text-[10px] text-slate-400">Seçilmezse türüne göre şık bir degrade kapak atanır.</p>
          </div>
        </div>
        ${field('Kitap Adı', `<input name="title" id="bf-title" required maxlength="80" ${b ? '' : 'autofocus'} value="${b ? escapeHTML(b.title) : ''}" class="${INPUT_CLS}" placeholder="Örn. Gece Yolcusu IV" />`)}
        <div class="grid grid-cols-2 gap-3">
          ${field('Türü', `<select name="type" id="bf-type" class="${INPUT_CLS}">${typeOptions}</select>`)}
          ${field('Durum', `<select name="status" id="bf-status" class="${INPUT_CLS}">${Object.entries(BOOK_STATUSES).map(([k, s]) =>
            `<option value="${k}" ${bookStatus(b || {}) === k ? 'selected' : ''}>${s.label}</option>`).join('')}</select>`)}
        </div>
        <p id="bf-status-hint" class="text-[10px] text-slate-400 -mt-1.5">${BOOK_STATUSES[bookStatus(b || {})].desc}</p>
        <div id="bf-special-wrap" class="${isSpecialType(selType) ? '' : 'hidden'} p-3 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-2">
          <p class="text-[11px] font-semibold text-rose-600">🔒 Özel kitap · yalnızca belirli dönemde okunabilir</p>
          ${field('Dönem', `<input name="period" maxlength="80" value="${escapeHTML(b?.period || '')}" class="${INPUT_CLS}" placeholder='Örn. Sadece yağmurlu günlerde' />`,
            'Kitapta "Bu kitap özel kitaptır ve sadece … okunabilir" olarak görünür. Kiralanınca otomatik Kira dışı olur.')}
        </div>
        <div class="grid grid-cols-2 gap-3">
          ${field('Kiralama Fiyatı (₺)', `<input name="price" type="number" min="0.01" step="0.01" value="${hasPrice(b) ? b.price : ''}" class="${INPUT_CLS}" placeholder="25" />`)}
          ${field('Sayfa Sayısı', `<input name="pages" type="number" min="1" step="1" value="${b?.pages ?? ''}" class="${INPUT_CLS}" placeholder="200" />`)}
        </div>
        <div class="grid grid-cols-2 gap-3">
          ${field('Kira Süresi (gün)', `<input name="rentalDays" type="number" min="1" max="90" step="1" value="${b ? (b.rentalDays ?? '') : DEFAULT_RENTAL_DAYS}" class="${INPUT_CLS}" />`)}
          ${field('Yazıldığı Mekan', `<input name="place" maxlength="60" value="${escapeHTML(b?.place || '')}" class="${INPUT_CLS}" placeholder="Örn. Ankara – Çankaya" />`)}
        </div>
        <div class="grid grid-cols-2 gap-3">
          ${field('Çıkış Tarihi', `<input name="releaseDate" id="bf-date" type="date" value="${b && !isDraftBook(b) && isDateKey(b.releaseDate) ? b.releaseDate : b ? '' : today}" ${b ? '' : 'data-auto="1"'} ${b && isDraftBook(b) ? 'disabled' : ''} class="${INPUT_CLS} disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed" />`,
            `Yalnızca Kiralık kitapta zorunlu · Planlanıyor / Yakında kitaba girilemez · son ${NEW_BOOK_DISCOUNT.days} gündeyse %${NEW_BOOK_DISCOUNT.rate} yeni kitap indirimi`)}
          <div id="bf-series-wrap" class="${getType(selType)?.inDeals ? '' : 'hidden'}">
            ${field('Seri No', `<input name="seriesNo" id="bf-series" type="number" min="1" step="1" inputmode="numeric" value="${b?.seriesNo ?? (b ? '' : nextSeriesNo())}" class="${INPUT_CLS}" placeholder="Kaçıncı seri?" />`,
              'Günün İndirimleri bu sıraya göre döner (1-2-3, 4-5-6…)')}
          </div>
        </div>
        ${field('Açıklama', `<textarea name="description" rows="3" maxlength="1000" class="${INPUT_CLS} resize-y leading-relaxed" placeholder="Kitap hakkında kısa bilgi (isteğe bağlı)">${escapeHTML(b?.description || '')}</textarea>`)}
        <p class="text-[10px] text-slate-400 -mt-1.5">Planlanıyor / Yakında durumunda yalnızca ad ve tür zorunludur; diğer bilgiler boş kalabilir. Kiralık olmayan kitaplarda çıkış tarihi boş kalabilir.</p>
        <label class="flex items-center gap-2 text-[11px] text-slate-600">
          <input type="checkbox" name="announce" class="rounded border-slate-300 text-brand-600" />
          📣 Duyuruya at <span class="text-[10px] text-slate-400">(yeni kitap → Yeni Kitap · durum değişikliği → Bilgilendirme)</span>
        </label>
        <p class="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 rounded-xl px-3 py-2">${icon('pencil', 'w-3.5 h-3.5')}Yazar: <b class="text-slate-700">${escapeHTML(b ? authorName(b) : currentUser().name)}</b></p>
        ${formFooter(b ? 'Değişiklikleri Kaydet' : `${icon('plus', 'w-3.5 h-3.5')}Kitabı Ekle`)}
      </form>`);
  }

  function updateBookFormPreview() {
    const box = $('#bookCoverPreview');
    if (!box) return;
    box.innerHTML = coverHTML({
      title: $('#bf-title')?.value || 'Yeni Kitap',
      type: $('#bf-type')?.value || defaultTypeId(),
      cover: state.bookDraftCover
    }, 'md');
    $('#removeBookCover')?.classList.toggle('hidden', !state.bookDraftCover);
    // Seri No yalnızca indirim döngüsüne giren türlerde; Dönem yalnızca özel türlerde
    $('#bf-series-wrap')?.classList.toggle('hidden', !getType($('#bf-type')?.value)?.inDeals);
    $('#bf-special-wrap')?.classList.toggle('hidden', !isSpecialType($('#bf-type')?.value));
    const st = $('#bf-status')?.value;
    if (st && $('#bf-status-hint')) $('#bf-status-hint').textContent = BOOK_STATUSES[st]?.desc || '';
    // Planlanıyor / Yakında: çıkış tarihi silinir ve girilemez · yeni kitapta kendiliğinden gelen
    // bugünün tarihi yalnızca Kiralık durumda kalır (elle seçilen tarihe dokunulmaz)
    const date = $('#bf-date');
    if (st && date) {
      const draft = ['planlaniyor', 'yakinda'].includes(st);
      date.disabled = draft;
      if (draft) date.value = '';
      else if (date.dataset.auto) date.value = st === 'kiralik' ? localDateKey() : '';
    }
  }

  /* Sıradaki seri numarası (en büyük + 1) */
  const nextSeriesNo = () => books.reduce((m, b) => (Number.isInteger(b.seriesNo) ? Math.max(m, b.seriesNo) : m), 0) + 1;

  function handleSaveBook(fd, editId) {
    if (!requireAdmin()) return;
    if (state.coverBusy) return toast('Kapak hâlâ yükleniyor, bir saniye…', 'info');
    const title = fd.title.trim();
    const type = getType(fd.type) ? fd.type : defaultTypeId();
    if (!type) return toast('Önce en az bir kitap türü tanımlayın.', 'error');
    if (!title) return toast('Kitap adı zorunlu.', 'error');
    const status = BOOK_STATUSES[fd.status] ? fd.status : 'kiralik';
    const draft = ['planlaniyor', 'yakinda'].includes(status); // Planlanıyor / Yakında: bilgiler eksik olabilir
    const pos = (v, int = false) => { const n = int ? parseInt(v, 10) : round2(parseFloat(v)); return n > 0 ? n : null; };
    const price = pos(fd.price);
    const pages = pos(fd.pages, true);
    const rentalDays = pos(fd.rentalDays, true);
    const releaseDate = !draft && isDateKey(fd.releaseDate) ? fd.releaseDate : null; // taslakta tarih tutulmaz
    if (!draft) {
      if (!price) return toast('Geçerli bir fiyat girin.', 'error');
      if (!pages) return toast('Geçerli bir sayfa sayısı girin.', 'error');
      if (!rentalDays) return toast('Geçerli bir kira süresi girin.', 'error');
      if (releaseDate && releaseDate > localDateKey()) return toast('Çıkış tarihi ileri bir gün olamaz (henüz çıkmadıysa durumu Yakında yapın).', 'error');
    }
    // Çıkış tarihi yalnızca Kiralık kitapta zorunlu
    if (status === 'kiralik' && !releaseDate) return toast('Kiralık kitap için çıkış tarihini girin.', 'error');

    // Seri No: indirim türlerinde zorunlu ve benzersiz (taslakta isteğe bağlı); diğer türlerde tutulmaz
    let seriesNo = null;
    if (getType(type)?.inDeals) {
      seriesNo = pos(fd.seriesNo, true);
      if (!seriesNo && !draft) return toast('Kaçıncı seri olduğunu (Seri No) girin.', 'error');
      const clash = seriesNo && books.find((x) => x.seriesNo === seriesNo && String(x.id) !== String(editId) && getType(x.type)?.inDeals);
      if (clash) return toast(`Seri #${seriesNo} zaten "${clash.title}" kitabında.`, 'error');
    }

    const special = isSpecialType(type);
    const announce = fd.announce === 'on'; // yeni kitap / durum duyurusu yalnızca işaretliyse
    const data = {
      title, type, status, special, seriesNo, price, pages, rentalDays, releaseDate,
      place: (fd.place || '').trim(),
      period: special ? (fd.period || '').trim() : '',
      description: (fd.description || '').trim(),
      cover: state.bookDraftCover || ''
    };

    if (editId) {
      const b = getBook(editId);
      if (!b) return;
      // Buradan yapılan fiyat değişikliği Fiyat Logu'na ve fiyat geçmişine YAZILMAZ
      // (loglu değişim yalnızca Fiyat Logu sayfasındaki "Fiyat Güncelle" ile yapılır)
      const batch = db.batch();
      let extra = '';
      if (draft) {
        data.newDiscountUntil = null;
      } else if (isDraftBook(b)) {
        // Planlanıyor/Yakında → yayında: döngüye sonraki turda girer; son 7 günde çıktıysa duyuru + indirim
        data.addedAt = isoAt(Date.now());
        data.newDiscountUntil = newDiscountUntilFor(releaseDate);
        if (data.newDiscountUntil && announce) {
          batch.set(col('announcements').doc(), newBookAnnouncement({ ...b, ...data }));
          extra = ' · Duyurular\'a haber düştü 📣';
        }
      } else if (releaseDate !== b.releaseDate) {
        // Çıkış tarihi değiştiyse yeni kitap indirimi yeniden hesaplanır
        data.newDiscountUntil = newDiscountUntilFor(releaseDate);
      }
      // Elle fiyat değişimi: daha eski planlı loglar bu fiyatı ezmesin
      if (price !== b.price) data.priceEffectiveAt = Timestamp.now();
      // Durum değiştiyse (ve yeni kitap duyurusu atılmadıysa) işaretliyse durum duyurusu
      if (announce && status !== bookStatus(b) && !extra) {
        batch.set(col('announcements').doc(), statusAnnouncement({ ...b, ...data }, status));
        extra = ' · Duyurular\'a haber düştü 📣';
      }
      batch.update(bookRef(b.id), data);
      closeModal();
      run(batch.commit(), `"${title}" güncellendi · ${BOOK_STATUSES[status].label}${extra}.`);
      return;
    }

    const { book, done } = addBook(data, announce);
    if (state.bookTab !== type) state.bookTab = type;
    closeModal();
    run(done, draft
      ? `"${book.title}" ${BOOK_STATUSES[status].label} olarak eklendi.`
      : book.newDiscountUntil
        ? `"${book.title}" eklendi${announce ? ' · Duyurular\'a haber düştü 📣' : ''} · ${NEW_BOOK_DISCOUNT.days} gün %${NEW_BOOK_DISCOUNT.rate} indirim`
        : `"${book.title}" eklendi · son ${NEW_BOOK_DISCOUNT.days} gün içinde çıkmadığı için yeni kitap indirimi yok`);
  }

  /* --- Hızlı fiyat güncelleme (Fiyat Logu sayfası) --- */
  function openChangePriceModal(preselectId) {
    if (!requireAdmin()) return;
    const sorted = [...books].sort(bySeriesThenTitle); // seri kitaplar üstte, diğerleri altta
    const sel = getBook(preselectId) || sorted[0];
    if (!sel) return toast('Önce kitap eklemelisin.', 'error');
    const today = localDateKey();
    openModal(`
      ${modalHeader('Fiyat Güncelle', 'Tarih seç → kitap seç → yeni fiyatı yaz. Değişim Fiyat Logu\'na kaydedilir.', 'price-logs')}
      <form data-form="changePrice" class="p-5 space-y-3.5" autocomplete="off">
        <div class="grid grid-cols-[1fr_auto] gap-3">
          ${field('Tarih', `<input name="date" id="cpDate" type="date" required value="${today}" class="${INPUT_CLS} min-w-0" />`)}
          <div id="cpTimeWrap">${field('Saat', `<input name="time" id="cpTime" type="time" class="${INPUT_CLS} w-[6.5rem]" />`)}</div>
        </div>
        <p id="cpTimeHint" class="text-[10px] text-slate-400 -mt-2"></p>
        ${field('Kitap', `<select name="bookId" id="cpBook" class="${INPUT_CLS}">
          ${sorted.map((b) => `<option value="${b.id}" ${b.id === sel.id ? 'selected' : ''}>${escapeHTML(seriesLabel(b))} · ${escapeHTML(b.title)}</option>`).join('')}
        </select>`)}
        <div class="grid grid-cols-2 gap-3">
          <div>
            <span id="cpCurrentLabel" class="block text-[11px] font-medium text-slate-500 mb-1">Mevcut Fiyat</span>
            <p id="cpCurrent" class="text-sm font-bold text-slate-700 bg-slate-50 rounded-xl px-3 py-2">${formatMoney(sel.price)}</p>
            <!-- Geçmiş tarihte: o günkü fiyat yazılabilir -->
            <input name="oldPrice" id="cpOld" type="number" min="0.01" step="0.01" class="${INPUT_CLS} hidden" placeholder="0,00" />
          </div>
          ${field('Yeni Fiyat (₺)', `<input name="newPrice" id="cpNew" type="number" min="0.01" step="0.01" required autofocus class="${INPUT_CLS}" placeholder="0,00" />`)}
        </div>
        <div id="cpPreview" class="text-[11px] text-slate-500 bg-slate-50 rounded-xl px-3 py-2 leading-relaxed"></div>
        ${formFooter('Fiyatı Kaydet')}
      </form>`);
    updateChangePricePreview();
  }

  /* Fiyat Güncelle formu: seçilen tarihteki fiyat + zam/indirim önizlemesi.
     resetOld: tarih/kitap değişince geçmiş fiyat kutusu o günkü kayıtlı fiyatla yeniden doldurulur */
  function updateChangePricePreview(resetOld = false) {
    const b = getBook($('#cpBook')?.value);
    const box = $('#cpPreview');
    if (!b || !box) return;
    const dateKey = $('#cpDate')?.value || localDateKey();
    const timeKey = $('#cpTime')?.value || '';
    const pastDay = dateKey < localDateKey();
    // Saat: geçmiş tarihte gizli · gelecek tarihte zorunlu · bugün isteğe bağlı (boş = hemen)
    $('#cpTimeWrap').classList.toggle('hidden', pastDay);
    $('#cpTime').required = dateKey > localDateKey();
    $('#cpTimeHint').textContent = pastDay ? 'Geçmiş tarih: kayıt o güne yazılır.'
      : dateKey > localDateKey() ? 'Gelecek tarih: saat zorunlu · o an geldiğinde fiyat değişir.'
        : 'Bugün: saati boş bırakırsan fiyat hemen değişir · ileri bir saat seçersen o saatte değişir.';
    const moment = priceChangeMoment(dateKey, timeKey);
    const isFuture = moment.kind === 'future';
    const isToday = moment.kind === 'now';
    const at = moment.at ? moment.at.getTime() : Date.now();
    const oldInput = $('#cpOld');
    // Geçmiş tarihte o günkü fiyat elle yazılabilir; gelecekte o anki (planlı dahil) fiyat kullanılır
    if (pastDay && (resetOld || !oldInput.value)) oldInput.value = priceAt(b, at) || '';
    oldInput.classList.toggle('hidden', !pastDay);
    oldInput.required = pastDay;
    $('#cpCurrent').classList.toggle('hidden', pastDay);
    const typedOld = parseFloat(oldInput.value);
    const oldPrice = isToday ? b.price : isFuture ? priceAt(b, at) : (typedOld > 0 ? typedOld : priceAt(b, at));
    $('#cpCurrentLabel').textContent = isToday ? 'Mevcut Fiyat' : `${formatDate(dateKey + 'T12:00:00')} tarihindeki fiyat`;
    $('#cpCurrent').textContent = formatMoney(oldPrice);
    const np = parseFloat($('#cpNew')?.value);
    const later = pastDay && priceTimeline(b.id).some((l) => new Date(l.changedAt).getTime() > at && !isFutureLog(l));
    const note = moment.error ? `⚠️ ${moment.error}`
      : isToday ? 'Kitabın fiyatı hemen değişir.'
      : isFuture ? `⏳ Planlı değişim: ${formatLongDate(moment.at.toISOString())} saat ${formatTime(moment.at.toISOString())} geldiğinde kitabın fiyatı otomatik değişir. O andan önce kaydı silersen hiçbir şey değişmez.`
      : later ? 'Geçmişe kayıt: bu tarihten sonra başka değişim olduğu için kitabın güncel fiyatı değişmez.'
        : 'Geçmişe kayıt: sonrasında başka değişim olmadığı için kitabın güncel fiyatı da bu fiyata geçer.';
    if (!(np > 0)) { box.textContent = note; return; }
    const pct = pricePct(oldPrice, np);
    box.innerHTML = `${formatMoney(oldPrice)} → <b class="text-slate-700">${formatMoney(np)}</b> · ${pctChipHTML(pct)}<br><span class="text-slate-400">${note}</span>`;
  }

  /* Zam / indirim yüzdesi: işaretsiz ("%20 indirim", "%12 zam") */
  const pctText = (pct) => (pct === 0 ? 'değişim yok' : `%${Math.abs(pct)} ${pct > 0 ? 'zam' : 'indirim'}`);
  const pctChipHTML = (pct) => pct === 0 ? '<span class="text-slate-400">değişim yok</span>'
    : `<b class="${pct > 0 ? 'text-rose-500' : 'text-emerald-600'}">${pctText(pct)}</b>`;

  function handleChangePrice(fd) {
    if (!requireAdmin()) return;
    const res = changeBookPrice(fd.bookId, parseFloat(fd.newPrice), fd.date, fd.oldPrice, fd.time || '');
    if (!res.ok) return toast(res.reason, 'error');
    closeModal();
    const pctTxt = pctText(res.pct);
    run(res.done, `"${res.book.title}": ${formatMoney(res.oldPrice)} → ${formatMoney(res.newPrice)} (${pctTxt})${res.isToday ? ''
      : res.isFuture ? ` · ⏳ ${formatLongDate(res.at.toISOString())} ${formatTime(res.at.toISOString())} itibarıyla uygulanacak`
      : res.updatesCurrent ? ' · geçmişe kaydedildi, güncel fiyat da değişti' : ' · geçmişe kaydedildi'}`);
  }

  /* --- Sürüm notu ekle / düzenle / sil --- */
  function openUpdateModal(editId) {
    if (!requireAdmin()) return;
    const a = editId ? getAnn(editId) : null;
    const today = localDateKey();
    openModal(`
      ${modalHeader(a ? 'Sürüm Notunu Düzenle' : 'Yeni Sürüm Notu', 'Güncellemeler sekmesinde yayınlanır.', 'sparkles')}
      <form data-form="saveUpdate" data-edit-id="${a ? a.id : ''}" class="p-5 space-y-3.5" autocomplete="off">
        <div class="grid grid-cols-2 gap-3">
          ${field('Sürüm', `<input name="version" required autofocus value="${a ? escapeHTML(a.version) : ''}" class="${INPUT_CLS}" placeholder="v1.5.0" />`, 'Biçim: v1.5.0')}
          ${field('Başlık (isteğe bağlı)', `<input name="title" maxlength="80" value="${a ? escapeHTML(a.title) : ''}" class="${INPUT_CLS}" placeholder="Kısa özet" />`)}
        </div>
        <div class="grid grid-cols-2 gap-3">
          ${field('Yayın Tarihi', `<input name="releaseDate" id="updDateInput" type="date" required value="${a ? a.releaseDate : today}" class="${INPUT_CLS}" />`)}
          ${field('Yayın Yılı', `<input name="year" id="updYearInput" type="number" min="2000" max="2100" required value="${a ? a.year : today.slice(0, 4)}" class="${INPUT_CLS}" />`, 'Tarihe göre otomatik dolar')}
        </div>
        ${field('Yenilikler', `<textarea name="items" rows="5" required class="${INPUT_CLS} resize-y leading-relaxed" placeholder="Her satıra bir yenilik yazın">${a ? escapeHTML(a.items.join('\n')) : ''}</textarea>`, 'Her satır ayrı bir madde olarak listelenir.')}
        ${formFooter(a ? 'Değişiklikleri Kaydet' : 'Yayınla')}
      </form>`);
  }

  function handleSaveUpdate(fd, editId) {
    if (!requireAdmin()) return;
    const version = normalizeVersion(fd.version);
    if (!version) return toast('Sürüm biçimi geçersiz. Örnek: v1.5.0', 'error');
    if (announcements.some((a) => a.type === 'update' && a.version === version && a.id !== editId))
      return toast(`${version} zaten mevcut.`, 'error');
    const items = fd.items.split('\n').map((s) => s.trim()).filter(Boolean);
    if (!items.length) return toast('En az bir yenilik girin.', 'error');
    if (!isDateKey(fd.releaseDate)) return toast('Geçerli bir tarih seçin.', 'error');
    const year = parseInt(fd.year, 10) || Number(fd.releaseDate.slice(0, 4));

    const data = { version, title: fd.title.trim(), releaseDate: fd.releaseDate, year, items };
    const done = editId
      ? col('announcements').doc(editId).update(data)
      : col('announcements').add({ type: 'update', ...data, authorId: state.currentUserId, createdAt: new Date().toISOString(), readBy: [] });
    state.annTab = 'update';
    closeModal();
    if (state.route !== 'announcements') location.hash = '#announcements';
    else renderCurrentPage();
    run(done, editId ? `${version} güncellendi.` : `${version} yayınlandı.`);
  }

  function deleteUpdate(id) {
    if (!requireAdmin()) return;
    const a = getAnn(id);
    if (!a) return;
    openConfirm({
      title: `${escapeHTML(a.version)} silinsin mi?`,
      message: 'Bu sürüm notu kalıcı olarak silinecek.',
      onConfirm: () => {
        closeModal();
        run(col('announcements').doc(a.id).delete(), `${a.version} silindi.`, 'info');
      }
    });
  }

  /* --- Kiralamayı iptal et (istatistik kalır) / iptal et + istatistikleri sil (kayıt silinir) ---
     Kitap ve kullanıcı istatistikleri kiralama kayıtlarından hesaplanır:
     • İptal Et: kayıt kalır, "iptal edildi" olarak hemen biter, kitap boşa çıkar.
     • İstatistikleri de sil: kayıt kalıcı olarak silinir (kiralanma sayısı, harcama, puan vb. düşer).
     Paket (özel teklif) kiralamasında işlem paketin tüm kitaplarına uygulanır. Bakiye iade edilmez. */
  const rentalGroup = (r) => (r.purchaseId ? rentals.filter((x) => x.purchaseId === r.purchaseId) : [r]);

  function deleteRental(id) {
    if (!requireAdmin()) return;
    const r = getRental(id);
    if (!r) return;
    const b = getBook(r.bookId);
    const usr = getUser(r.userId);
    const group = rentalGroup(r);
    const anyActive = group.some((x) => isActiveRental(x));
    const what = group.length > 1
      ? `Bu kitap bir özel teklif paketine ait; işlem paketteki <b>${group.length} kiralamanın hepsine</b> uygulanır.`
      : `<b>${escapeHTML(usr?.name || 'Kullanıcı')}</b> · "${escapeHTML(b?.title || 'kitap')}" kiralaması.`;
    const option = (attr, tone, label, desc) => `
      <button type="button" ${attr}="${r.id}" class="w-full text-left rounded-2xl border px-4 py-3 transition ${tone}">
        <span class="block text-xs font-bold">${label}</span>
        <span class="block text-[10px] mt-0.5 opacity-80 leading-snug">${desc}</span>
      </button>`;
    openModal(`
      <div class="p-6">
        <div class="text-center">
          <span class="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">${icon('close', 'w-6 h-6')}</span>
          <h3 class="text-sm font-bold text-slate-800 mt-3">${anyActive ? 'Kiralama iptal edilsin mi?' : 'Kiralama kaydı silinsin mi?'}</h3>
          <p class="text-xs text-slate-500 mt-1.5 leading-relaxed">${what} Bakiye iade edilmez.</p>
        </div>
        <div class="space-y-2.5 mt-5">
          ${anyActive ? option('data-cancel-rental', 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
            'İptal Et · istatistikler kalsın',
            'Kiralama hemen biter, kitap boşa çıkar. Kullanıcının ve kitabın istatistiklerinde (kiralanma sayısı, harcama, puan) kalır.') : ''}
          ${option('data-wipe-rental', 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
            `${anyActive ? 'İptal Et + ' : ''}İstatistikleri de Sil`,
            'Kayıt kalıcı olarak silinir; bu kiralama kullanıcının ve kitabın istatistiklerinden tamamen düşer.')}
          <button type="button" data-modal-close class="w-full py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition">Vazgeç</button>
        </div>
      </div>`);
  }

  /* İptal (istatistik korunur): aktif kayıtlar "iptal edildi" ile hemen biter, kitap kilitleri açılır */
  function cancelRental(id) {
    if (!requireAdmin()) return;
    const r = getRental(id);
    if (!r) return;
    const nowIso = isoAt(Date.now());
    const list = rentalGroup(r).filter((x) => isActiveRental(x));
    const ops = [];
    list.forEach((x) => {
      ops.push((bt) => bt.update(col('rentals').doc(x.id), { returnedAt: nowIso, cancelledAt: nowIso, dueAt: nowIso }));
      const b = getBook(x.bookId);
      if (b && b.lockRental === x.id) ops.push((bt) => bt.update(bookRef(b.id), { lockUntil: null, lockBy: null, lockRental: null }));
      // Bekleyen iade talebi varsa iptalle birlikte reddedilir
      if (refundOf(x.id)?.status === 'pending') ops.push((bt) => bt.update(col('refunds').doc(x.id), {
        status: 'rejected', decidedAt: nowIso, decidedBy: state.currentUserId,
        adminNote: 'Kiralama iptal edildiği için talep otomatik reddedildi.'
      }));
    });
    closeModal();
    run(commitOps(ops), list.length > 1 ? `Paket kiralaması iptal edildi · ${list.length} kitap boşa çıktı · istatistikler korundu.`
      : `Kiralama iptal edildi · "${getBook(r.bookId)?.title || 'Kitap'}" boşa çıktı · istatistikler korundu.`, 'info');
  }

  /* İptal + istatistikleri sil: kayıt(lar) kalıcı olarak silinir */
  function wipeRental(id) {
    if (!requireAdmin()) return;
    const r = getRental(id);
    if (!r) return;
    const { removed, done } = removeRental(id);
    closeModal();
    run(done, removed.length > 1 ? `Paket kiralaması ve istatistikleri silindi · ${removed.length} kitap.`
      : `Kiralama ve istatistikleri silindi · "${getBook(r.bookId)?.title || 'Kitap'}".`, 'info');
  }

  /* Biten kiralamanın etiketi: Admin iptal ettiyse "İptal Edildi", yoksa "Süresi Doldu" */
  const endedLabel = (r) => (r.cancelledAt ? 'İptal Edildi' : 'Süresi Doldu');

  /* --- Kategorileri (kitap türlerini) yönet --- */
  const paletteOptions = (sel) => Object.entries(TYPE_PALETTES)
    .map(([k, p]) => `<option value="${k}" ${sel === k ? 'selected' : ''}>${p.label}</option>`).join('');

  function openTypeManager() {
    if (!requireAdmin()) return;
    const rows = bookTypes.map((t) => {
      const count = books.filter((b) => b.type === t.id).length;
      return `
        <li class="flex items-center gap-2.5 p-2.5 pl-3.5 rounded-xl border border-slate-100">
          <span class="w-2.5 h-2.5 rounded-full shrink-0 ${typeStyle(t.id).dot}"></span>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-slate-700 truncate">${escapeHTML(t.label)}</p>
            <p class="flex items-center gap-1.5 flex-wrap mt-0.5 text-[10px] text-slate-400">
              <span>${count} kitap</span>
              ${t.inDeals ? '' : '<span class="px-1.5 rounded-full bg-slate-100 text-slate-500" title="Günün indirimi döngüsüne girmez">indirimsiz</span>'}
              ${isSpecialType(t.id) ? '<span class="px-1.5 rounded-full bg-rose-50 text-rose-500 font-semibold" title="Döneme özel: dönem alanı, kiralanınca otomatik Kira dışı, kapakta 👑 SINIRLI işareti, iade edilemez">🔒 Döneme özel</span>' : ''}
            </p>
          </div>
          <button type="button" data-edit-type="${t.id}" title="Ayarlar" aria-label="${escapeHTML(t.label)} ayarları" class="${BTN_ICON} text-slate-400 hover:text-brand-600 hover:bg-brand-50">${icon('cog', 'w-4 h-4')}</button>
          <button type="button" data-delete-type="${t.id}" title="Sil" class="${BTN_ICON} text-slate-400 hover:text-rose-500 hover:bg-rose-50">${icon('trash', 'w-4 h-4')}</button>
        </li>`;
    }).join('');

    openModal(`
      ${modalHeader('Kategorileri Yönet 📁', 'Kitap türleri · değişiklikler tüm sekmelere anında yansır.', 'tag')}
      <div class="p-5 space-y-4">
        <ul class="space-y-2">${rows || `<li>${emptyState('Henüz tür yok.')}</li>`}</ul>
        <form data-form="saveType" class="p-3 rounded-2xl bg-brand-50/50 border border-brand-100 space-y-2.5" autocomplete="off">
          <p class="text-[11px] font-semibold text-slate-600">Yeni Tür Ekle</p>
          <div class="flex gap-2">
            <input name="label" required maxlength="24" class="${INPUT_CLS} !py-1.5 flex-1 min-w-0" placeholder="Örn. Şiir" />
            <select name="palette" aria-label="Renk" class="${INPUT_CLS} !py-1.5 !w-24 shrink-0">${paletteOptions('emerald')}</select>
          </div>
          <label class="flex items-center gap-2 text-[11px] text-slate-500">
            <input type="checkbox" name="inDeals" class="rounded border-slate-300 text-brand-600" />
            Günün indirimi döngüsüne girsin
          </label>
          <label class="flex items-center gap-2 text-[11px] text-slate-500">
            <input type="checkbox" name="special" class="rounded border-slate-300 text-rose-500" />
            🔒 Döneme özel tür (Dönem alanı, kiralanınca otomatik Kira dışı, kapakta 👑 SINIRLI, iade edilemez)
          </label>
          <button type="submit" class="${BTN_PRIMARY} w-full !py-2">${icon('plus', 'w-3.5 h-3.5')}Türü Ekle</button>
        </form>
        <p class="text-[10px] text-slate-400 leading-relaxed">Ad, renk ve "Döneme özel" ayarı için türün yanındaki ⚙️ simgesine bas. İndirim ayarı tür oluşturulurken seçilir ve sonra değişmez; böylece sıralı indirim döngüsü bozulmaz. Silinen türdeki kitaplar indirim ayarı aynı olan ilk türe taşınır.</p>
      </div>`);
  }

  /* Tür ayarları: ad, renk, Döneme özel (kaydedince / geri dönünce yönetim listesine döner) */
  function openTypeEditor(id) {
    if (!requireAdmin()) return;
    const t = getType(id);
    if (!t) return;
    const count = books.filter((b) => b.type === id).length;
    openModal(`
      ${modalHeader(`${escapeHTML(t.label)} · Ayarlar ⚙️`, `${count} kitap · ${t.inDeals ? 'günün indirimi döngüsünde' : 'indirimsiz'} (indirim ayarı değişmez)`, 'cog')}
      <form data-form="saveType" data-edit-id="${t.id}" class="p-5 space-y-3.5" autocomplete="off">
        ${field('Tür adı', `<input name="label" required maxlength="24" value="${escapeHTML(t.label)}" autofocus class="${INPUT_CLS}" />`)}
        ${field('Renk', `<select name="palette" class="${INPUT_CLS}">${paletteOptions(t.palette)}</select>`)}
        <label class="flex items-start gap-2.5 p-3 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition">
          <input type="checkbox" name="special" ${isSpecialType(t.id) ? 'checked' : ''} class="mt-0.5 rounded border-slate-300 text-rose-500" />
          <span class="text-xs text-slate-600 leading-relaxed"><b class="text-rose-500">🔒 Döneme özel</b><br>
            <span class="text-[11px] text-slate-400">Dönem alanı, kiralanınca otomatik Kira dışı, kapakta 👑 SINIRLI, iade edilemez. Bu türdeki tüm kitaplara uygulanır.</span></span>
        </label>
        <div class="grid grid-cols-2 gap-2.5 pt-2">
          <button type="button" data-quick="manageTypes" class="py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition">← Geri</button>
          <button type="submit" class="${BTN_PRIMARY} !py-2.5">Kaydet</button>
        </div>
      </form>`);
  }

  async function handleSaveType(fd, editId) {
    if (!requireAdmin()) return;
    const label = (fd.label || '').trim();
    if (!label) return toast('Tür adı boş olamaz.', 'error');
    if (bookTypes.some((t) => t.id !== editId && t.label.toLocaleLowerCase('tr') === label.toLocaleLowerCase('tr')))
      return toast(`"${label}" adında bir tür zaten var.`, 'error');
    const palette = TYPE_PALETTES[fd.palette] ? fd.palette : 'slate';
    let done;
    if (editId) {
      const t = getType(editId);
      if (!t) return;
      const special = fd.special === 'on';
      const batch = db.batch();
      batch.update(col('bookTypes').doc(editId), { label, palette, special });
      // "Döneme özel" değişince bu türdeki kitapların bayrağı da eşitlenir (kural kiralamada kitaptaki bayrağa bakar)
      if (special !== isSpecialType(editId)) {
        books.filter((b) => b.type === editId && (b.special === true) !== special)
          .forEach((b) => batch.update(bookRef(b.id), { special }));
      }
      done = batch.commit();
    } else {
      done = addBookType({ label, palette, inDeals: fd.inDeals === 'on', special: fd.special === 'on' });
    }
    const ok = await run(done, editId ? `"${label}" güncellendi.` : `"${label}" türü eklendi.`);
    if (ok && state.modalOpen) openTypeManager();
  }

  function deleteType(id) {
    if (!requireAdmin()) return;
    const t = getType(id);
    if (!t) return;
    const count = books.filter((b) => b.type === id).length;
    const target = bookTypes.find((x) => x.id !== id && x.inDeals === t.inDeals);
    openConfirm({
      title: `"${escapeHTML(t.label)}" silinsin mi?`,
      message: count
        ? (target ? `Bu türdeki ${count} kitap <b>${escapeHTML(target.label)}</b> türüne taşınacak.` : `Bu türde ${count} kitap var.`)
        : 'Bu türde kitap yok, güvenle silinebilir.',
      onConfirm: async () => {
        const res = removeBookType(id);
        if (!res.ok) { toast(res.reason, 'error'); return openTypeManager(); }
        await run(res.done, res.moved ? `"${t.label}" silindi · ${res.moved} kitap "${res.target.label}" türüne taşındı.` : `"${t.label}" silindi.`, 'info');
        if (state.modalOpen) openTypeManager();
      }
    });
  }

  /* --- Duyuru / haber ekle, düzenle & sil --- */
  function openNewsModal(editId) {
    if (!requireAdmin()) return;
    const a = editId ? getAnn(editId) : null;
    if (editId && !a) return;
    const cats = Object.keys(NEWS_CATEGORIES);
    openModal(`
      ${modalHeader(a ? 'Haberi Düzenle ✏️' : 'Duyuru/Haber Ekle 📣', a ? 'Değişiklik herkes için anında güncellenir.' : 'Haberler sekmesinde yayınlanır · herkese bildirim rozeti düşer.', 'announcements')}
      <form data-form="saveNews" data-edit-id="${a ? a.id : ''}" class="p-5 space-y-3.5" autocomplete="off">
        ${field('Başlık', `<input name="title" required autofocus maxlength="100" value="${a ? escapeHTML(a.title) : ''}" class="${INPUT_CLS}" placeholder="Örn. Hafta sonu kitap okuma etkinliği" />`)}
        ${field('İçerik', `<textarea name="body" rows="6" required maxlength="2000" class="${INPUT_CLS} resize-y leading-relaxed" placeholder="Duyuru metni">${a ? escapeHTML(a.body) : ''}</textarea>`, 'Her satır ayrı paragraf olarak gösterilir.')}
        <div class="grid grid-cols-2 gap-3 items-end">
          ${field('Tür', `<select name="category" class="${INPUT_CLS}">${cats.map((c) => `<option value="${escapeHTML(c)}" ${(a ? newsCategoryOf(a) : 'Duyuru') === c ? 'selected' : ''}>${escapeHTML(c)}</option>`).join('')}</select>`)}
          <label class="flex items-center gap-2 text-[11px] text-slate-500 pb-2.5">
            <input type="checkbox" name="pinned" ${a?.pinned ? 'checked' : ''} class="rounded border-slate-300 text-brand-600" /> 📌 En üste sabitle
          </label>
        </div>
        ${formFooter(a ? 'Değişiklikleri Kaydet' : 'Yayınla')}
      </form>`);
  }

  function handleSaveNews(fd, editId) {
    if (!requireAdmin()) return;
    const title = (fd.title || '').trim(), body = (fd.body || '').trim();
    if (!title || !body) return toast('Başlık ve içerik zorunlu.', 'error');
    const prev = editId ? getAnn(editId) : null;
    const category = NEWS_CATEGORIES[fd.category] ? fd.category : newsCategoryOf(prev);
    const fields = { category, title, body, pinned: fd.pinned === 'on' };
    const done = editId
      ? col('announcements').doc(editId).update({ ...fields, editedAt: new Date().toISOString() })
      : col('announcements').add({
          type: 'news', ...fields, bookId: null,
          authorId: state.currentUserId, createdAt: new Date().toISOString(), readBy: []
        });
    state.annTab = 'news';
    closeModal();
    if (state.route !== 'announcements') location.hash = '#announcements';
    else renderCurrentPage();
    run(done, editId ? 'Haber güncellendi.' : 'Duyuru yayınlandı 📣');
  }

  /* Admin: haberleri toplu sil · tür (Tümü / Duyuru / İndirim / Bilgilendirme / Etkinlik) + zaman (tümü / bugün) */
  const bulkNewsTargets = (cat, scope) => {
    const today = localDateKey();
    return announcements.filter((a) => a.type === 'news'
      && (cat === 'all' || newsCategoryOf(a) === cat)
      && (scope === 'all' || localDateKey(a.createdAt) === today));
  };

  function openBulkNewsModal() {
    if (!requireAdmin()) return;
    const cats = ['all', ...Object.keys(NEWS_CATEGORIES)];
    openModal(`
      ${modalHeader('Haberleri Toplu Sil 🗑️', 'Tür ve zaman seç · sürüm notları (Güncellemeler) etkilenmez.', 'trash', 'bg-rose-50 text-rose-500')}
      <form data-form="bulkNews" class="p-5 space-y-3.5" autocomplete="off">
        ${field('Tür', `<select name="cat" id="bn-cat" class="${INPUT_CLS}">
          ${cats.map((c) => `<option value="${c}" ${(state.newsFilterKind === 'category' ? state.newsFilterValue : 'all') === c ? 'selected' : ''}>${c === 'all' ? 'Tümü (bütün türler)' : c}</option>`).join('')}
        </select>`)}
        <div class="grid grid-cols-2 gap-2">
          ${[['all', 'Tüm tarihler'], ['today', 'Sadece bugün']].map(([v, l], i) => `
            <label class="flex items-center gap-2 p-3 rounded-xl border border-slate-100 hover:border-rose-200 cursor-pointer text-xs text-slate-600">
              <input type="radio" name="scope" value="${v}" ${i === 0 ? 'checked' : ''} data-bn-scope class="text-rose-500" /> ${l}
            </label>`).join('')}
        </div>
        <p id="bn-preview" class="text-[11px] font-semibold text-rose-600 bg-rose-50 rounded-xl px-3 py-2"></p>
        <div class="grid grid-cols-2 gap-2.5 pt-2">
          <button type="button" data-modal-close class="py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition">Vazgeç</button>
          <button type="submit" class="py-2.5 rounded-xl text-xs font-semibold bg-rose-500 text-white hover:bg-rose-600 transition">Sil</button>
        </div>
      </form>`);
    updateBulkNewsPreview();
  }

  function updateBulkNewsPreview() {
    const box = $('#bn-preview');
    if (!box) return;
    const cat = $('#bn-cat').value;
    const scope = document.querySelector('[data-bn-scope]:checked')?.value || 'all';
    const n = bulkNewsTargets(cat, scope).length;
    box.textContent = n ? `${n} haber kalıcı olarak silinecek.` : 'Bu seçime uyan haber yok.';
  }

  function handleBulkNews(fd) {
    if (!requireAdmin()) return;
    const list = bulkNewsTargets(fd.cat, fd.scope);
    if (!list.length) return toast('Bu seçime uyan haber yok.', 'info');
    const label = `${fd.cat === 'all' ? 'Tüm türlerdeki' : `"${fd.cat}" türündeki`} ${fd.scope === 'today' ? 'bugünkü ' : ''}haberler`;
    openConfirm({
      title: 'Haberler silinsin mi?',
      message: `${label} (<b>${list.length} haber</b>) kalıcı olarak silinecek.`,
      confirmLabel: `${list.length} Haberi Sil`,
      onConfirm: () => {
        closeModal();
        run(commitOps(list.map((a) => (bt) => bt.delete(col('announcements').doc(a.id)))), `${list.length} haber silindi.`, 'info');
      }
    });
  }

  function deleteNews(id) {
    if (!requireAdmin()) return;
    const a = getAnn(id);
    if (!a) return;
    openConfirm({
      title: 'Haber silinsin mi?',
      message: `"${escapeHTML(a.title)}" kalıcı olarak silinecek.`,
      onConfirm: () => {
        closeModal();
        run(col('announcements').doc(a.id).delete(), 'Haber silindi.', 'info');
      }
    });
  }

  /* --- Özel teklif ekle / düzenle / sil (1–3 kitap + isteğe bağlı kapaklar) ---
     season: 'winter' → Kış Fırsatları paketi (tarihsiz, sezon boyunca · Özel Teklifler'de görünmez) */
  function openOfferFormModal(editId, season = null) {
    if (!requireAdmin()) return;
    if (editId && purgeExpiredOffers()) renderCurrentPage();
    const o = editId ? getOffer(editId) : null;
    if (editId && !o) return toast('Bu teklifin süresi doldu ve silindi.', 'info');
    const seasonKey = o ? o.season || null : season;
    state.offerDraftCovers = o ? [0, 1, 2].map((i) => o.items[i]?.cover || '') : ['', '', ''];
    const defaultEnd = localDateKey(new Date(Date.now() + 14 * DAY_MS));
    // Planlanıyor / Yakında (fiyatı olmayabilir) kitaplar pakete eklenemez
    const sorted = books.filter((b) => !isDraftBook(b) && hasPrice(b)).sort((a, b) => a.id - b.id);

    const slot = (i) => {
      const selId = o?.items[i]?.bookId || '';
      return `
        <div class="rounded-2xl border border-brand-100 bg-brand-50/30 p-2.5 flex flex-col items-center gap-2 min-w-0">
          <span class="text-[10px] font-bold text-brand-500">${i + 1}. Kitap${i ? ' <span class="font-medium text-slate-400">(isteğe bağlı)</span>' : ''}</span>
          <div id="offerSlotPreview-${i}">${slotPreviewHTML(i, selId)}</div>
          <select name="book${i}" data-offer-slot="${i}" ${i ? '' : 'required'} class="${INPUT_CLS} !px-2 !py-1.5 !text-[11px]">
            <option value="">${i ? '— Boş —' : 'Kitap seç…'}</option>
            ${sorted.map((b) => `<option value="${b.id}" ${String(b.id) === String(selId) ? 'selected' : ''}>${escapeHTML(b.title)}</option>`).join('')}
          </select>
          <div class="flex items-center gap-2">
            <label class="text-[10px] font-semibold text-brand-600 hover:text-brand-700 cursor-pointer flex items-center gap-1">${icon('photo', 'w-3 h-3')}Kapak
              <input type="file" accept="image/*" data-cover-input="offer-${i}" class="sr-only" />
            </label>
            <button type="button" data-remove-cover="offer-${i}" id="offerSlotRemove-${i}" class="text-[10px] font-semibold text-rose-400 hover:text-rose-500 ${state.offerDraftCovers[i] ? '' : 'hidden'}">Kaldır</button>
          </div>
        </div>`;
    };

    openModal(`
      ${seasonKey
        ? modalHeader(o ? 'Kış Paketini Düzenle ❄️' : 'Yeni Kış Paketi ❄️', 'Kış Fırsatları vitrininde görünür · kış boyunca geçerli, puan çarpanı uygulanır.', 'offers', 'bg-sky-50 text-sky-600')
        : modalHeader(o ? 'Teklifi Düzenle' : 'Yeni Özel Teklif', '1–3 kitap seç, kapakları dosyadan yükle, paket fiyatını belirle.', 'offers')}
      <form data-form="saveOffer" data-edit-id="${o ? o.id : ''}" class="p-5 space-y-3.5" autocomplete="off">
        <input type="hidden" name="season" value="${seasonKey || ''}" />
        <div class="grid grid-cols-3 gap-2">${slot(0)}${slot(1)}${slot(2)}</div>
        <p class="text-[10px] text-slate-400 -mt-1">Kapak seçilmezse kitabın kendi kapağı (veya degrade kutusu) vitrinde gösterilir.</p>
        ${field('Teklif Başlığı', `<input name="title" required maxlength="80" value="${o ? escapeHTML(o.title) : ''}" class="${INPUT_CLS}" placeholder="Örn. 3 Seri Kitap Alana Albüm Hediye" />`)}
        ${field('Açıklama', `<textarea name="description" rows="3" required maxlength="400" class="${INPUT_CLS} resize-y leading-relaxed" placeholder="Teklifin detayları">${o ? escapeHTML(o.description) : ''}</textarea>`)}
        <div class="grid ${seasonKey ? 'grid-cols-1' : 'grid-cols-2'} gap-3">
          ${field('Paket İndirimi (%)', `<input name="rate" id="of-rate" type="number" min="0" max="100" step="1" required inputmode="numeric" value="${o ? offerRate(o) : ''}" class="${INPUT_CLS}" placeholder="Örn. 30" />`, 'Paket fiyatı kitapların güncel fiyat toplamından hesaplanır · %100 = bedava')}
          ${seasonKey ? '' : `<div class="grid grid-cols-[1fr_auto] gap-2">
            ${field('Son Geçerlilik', `<input name="validUntil" type="date" required min="${localDateKey(new Date())}" value="${o ? o.validUntil : defaultEnd}" class="${INPUT_CLS} min-w-0" />`)}
            ${field('Saat', `<input name="validTime" type="time" required value="${o && isTimeKey(o.validTime) ? o.validTime : '23:59'}" class="${INPUT_CLS} w-[6.5rem]" />`)}
          </div>`}
        </div>
        <div id="offerCalc" class="text-[11px] text-slate-500 bg-slate-50 rounded-xl px-3 py-2"></div>
        ${seasonKey
          ? `<p class="text-[10px] text-slate-400 leading-relaxed">❄️ Kış paketinin bitiş tarihi yok: Kış sezonu ve Kış Fırsatları vitrini açık olduğu sürece kiralanabilir. Kış sezonu kapatılınca silinir.</p>`
          : `<p class="text-[10px] text-slate-400 leading-relaxed">🎨 Vitrin rengi indirim yüzdesine göre otomatik: %1–19 mavi · %20–34 mor · %35–49 turuncu (Süper Fırsat) · %50–69 hareketli renkler + konfeti (Mega Fırsat) · %70+ fırtına zemini + çakan şimşekler (⚡ Şimşek Fırsat).</p>`}
        ${o ? '' : announceCheckHTML('of-announce', 'İndirim')}
        ${formFooter(o ? 'Değişiklikleri Kaydet' : 'Teklifi Yayınla')}
      </form>`);
    updateOfferCalc();
  }

  function slotPreviewHTML(i, bookId) {
    const b = getBook(bookId);
    const cover = state.offerDraftCovers[i];
    if (!b && !cover) {
      return `<div class="w-14 h-20 rounded-xl border-2 border-dashed border-brand-200 flex items-center justify-center text-brand-300">${icon('photo', 'w-5 h-5')}</div>`;
    }
    return coverHTML(b || { title: 'Kapak', type: defaultTypeId() }, 'md', cover);
  }

  function updateOfferSlotPreview(i) {
    const sel = document.querySelector(`[data-offer-slot="${i}"]`);
    const box = $(`#offerSlotPreview-${i}`);
    if (box) box.innerHTML = slotPreviewHTML(i, sel?.value);
    $(`#offerSlotRemove-${i}`)?.classList.toggle('hidden', !state.offerDraftCovers[i]);
  }

  function updateOfferCalc() {
    const box = $('#offerCalc');
    if (!box) return;
    const ids = [0, 1, 2].map((i) => document.querySelector(`[data-offer-slot="${i}"]`)?.value).filter(Boolean);
    const normal = sum(ids.map(getBook).filter(Boolean), (b) => b.price);
    const rate = parseInt($('#of-rate')?.value, 10);
    if (!ids.length) { box.textContent = 'Kitapları seçince normal toplam ve paket fiyatı burada görünecek.'; return; }
    const valid = rate >= 0 && rate <= 100;
    // Kış paketi: hepsi yeni → YENİ paket · karışık → kaydedilemez
    if (document.querySelector('[data-form="saveOffer"] [name="season"]')?.value === 'winter') {
      const fresh = ids.filter((id) => isWinterNewBook(getBook(id))).length;
      if (fresh && fresh !== ids.length) {
        box.innerHTML = '<span class="text-rose-500 font-semibold">⚠️ Yeni ve eski kitap aynı kış paketine eklenemez · ya hepsi yeni ya hepsi eski olmalı.</span>';
        return;
      }
      if (fresh) {
        box.innerHTML = `✨ <b class="text-cyan-700">Yeni kış paketi</b> · bu ${ids.length} yeni kitap vitrinde yalnızca paket olarak görünür · Normal toplam <b class="text-slate-700">${formatMoney(normal)}</b>${valid ? ` → <b class="text-emerald-600">${rate === 100 ? 'BEDAVA' : formatMoney(round2(normal * (100 - rate) / 100))}</b> <span class="text-rose-500 font-bold">(%${rate})</span>` : ''}`;
        return;
      }
    }
    const tier = valid ? dealTier(rate) : '';
    box.innerHTML = `${ids.length} kitap · Normal toplam: <b class="text-slate-700">${formatMoney(normal)}</b>${valid
      ? ` · Paket fiyatı: <b class="text-emerald-600">${rate === 100 ? 'BEDAVA' : formatMoney(round2(normal * (100 - rate) / 100))}</b> <span class="text-rose-500 font-bold">(%${rate})</span>` : ''}${tier
      ? ` · ${tier === 'mega' ? '🎉 vitrin konfetili "Mega Fırsat" olur' : '🔥 vitrin "Süper Fırsat" olur'}` : ''}`;
  }

  function handleSaveOffer(fd, editId) {
    if (!requireAdmin()) return;
    if (state.coverBusy) return toast('Kapak hâlâ yükleniyor, bir saniye…', 'info');
    // Dolu slotlar (kapak, slotun kendi kapağıyla eşleşir)
    const slots = [0, 1, 2]
      .map((i) => ({ bookId: Number(fd[`book${i}`]), cover: state.offerDraftCovers[i] || '' }))
      .filter((s) => s.bookId);
    if (!slots.length) return toast('En az 1 kitap seçin.', 'error');
    if (slots.some((s) => !getBook(s.bookId))) return toast('Seçilen kitaplardan biri bulunamadı.', 'error');
    const ids = slots.map((s) => s.bookId);
    if (new Set(ids).size !== ids.length) return toast('Aynı kitap pakete iki kez eklenemez.', 'error');
    const title = fd.title.trim(), description = fd.description.trim();
    if (!title || !description) return toast('Başlık ve açıklama zorunlu.', 'error');
    const rate = parseInt(fd.rate, 10);
    if (!(rate >= 0 && rate <= 100)) return toast('Paket indirimi 0–100 arası tam sayı olmalı (%100 = bedava).', 'error');
    // Kayıtlı fiyat yalnızca bilgi içindir; geçerli fiyat her an güncel kitap fiyatlarından hesaplanır
    const price = round2(sum(ids.map(getBook).filter(Boolean), (b) => b.price) * (100 - rate) / 100);
    const season = SEASONS[fd.season] ? fd.season : null;
    // Kış paketi: ya hepsi kışın yeni kitabı ya hepsi eski (yeni paket, içindeki kitapları vitrinde tek başına göstermez)
    if (season === 'winter') {
      const fresh = ids.filter((id) => isWinterNewBook(getBook(id))).length;
      if (fresh && fresh !== ids.length) return toast('Kış paketinde ya hepsi yeni ya hepsi eski kitap olmalı (yeni ve eski karıştırılamaz).', 'error');
    }
    if (!season) {
      if (!isDateKey(fd.validUntil)) return toast('Geçerli bir tarih seçin.', 'error');
      if (!isTimeKey(fd.validTime)) return toast('Geçerli bir saat seçin.', 'error');
      if (!isOfferActive({ validUntil: fd.validUntil, validTime: fd.validTime })) return toast('Son geçerlilik anı geçmiş olamaz.', 'error');
    }
    if (editId && !getOffer(editId)) { closeModal(); renderCurrentPage(); return toast('Bu teklifin süresi doldu ve silindi.', 'error'); }

    // Sezon paketi tarihsizdir (kural sezonun açık olmasını denetler)
    const data = season
      ? { title, description, price, rate, season, validUntil: null, validTime: null, endsAt: null, items: slots, bookIds: ids }
      : {
        title, description, price, rate, validUntil: fd.validUntil, validTime: fd.validTime,
        endsAt: offerEndsAt(fd.validUntil, fd.validTime),
        items: slots,
        bookIds: ids
      };
    let done;
    const announce = !editId && fd.announce === 'on';
    if (editId) {
      done = col('offers').doc(editId).update(data);
    } else {
      const batch = db.batch();
      batch.set(col('offers').doc(), { ...data, createdAt: new Date().toISOString() });
      // İşaretliyse "İndirim" duyurusu
      if (announce) {
        const normal = sum(ids.map(getBook).filter(Boolean), (b) => b.price);
        batch.set(col('announcements').doc(), {
          type: 'news', category: 'İndirim',
          title: `${season ? 'Yeni kış paketi' : 'Yeni özel teklif'}: ${title}${rate ? ` · %${rate}` : ''} ${season ? '❄️' : '🎁'}`,
          body: `${description}\n📚 ${ids.map((id) => getBook(id)?.title).filter(Boolean).join(', ')}`
            + `\n💰 ${normal > price ? `${formatMoney(normal)} yerine ` : ''}${price > 0 ? formatMoney(price) : 'BEDAVA'}`
            + (season ? `\n❄️ Kış boyunca Kış Fırsatları'nda${winterMult() > 1 ? ` · ⭐ ${winterMult()}x puan` : ''}`
              : `\n⏳ Son: ${formatDate(offerEnd({ validUntil: fd.validUntil, validTime: fd.validTime }).toISOString(), true)}`),
          bookId: null, authorId: state.currentUserId, createdAt: isoAt(Date.now()), pinned: false, readBy: []
        });
      }
      done = batch.commit();
    }
    closeModal();
    // Kış paketi ana sayfadaki Kış Fırsatları'nda, özel teklif kendi sayfasında görünür
    const page = season ? 'dashboard' : 'offers';
    if (state.route !== page) location.hash = `#${page}`;
    else renderCurrentPage();
    run(done, editId ? (season ? 'Kış paketi güncellendi.' : 'Teklif güncellendi.')
      : `${season ? 'Kış paketi eklendi ❄️' : 'Teklif yayınlandı 🎉'}${announce ? ' · Duyurular\'a haber düştü 📣' : ''}`);
  }

  function deleteOffer(id) {
    if (!requireAdmin()) return;
    const o = getOffer(id);
    if (!o) return;
    openConfirm({
      title: 'Teklif silinsin mi?',
      message: `"${escapeHTML(o.title)}" vitrinden kaldırılacak. Daha önce yapılan kiralamalar ve istatistikler korunur.`,
      onConfirm: () => {
        closeModal();
        run(col('offers').doc(o.id).delete(), 'Teklif silindi.', 'info');
      }
    });
  }

  /* --- Kapak dosyası seçimi / kaldırma --- */
  async function handleCoverInput(input) {
    const file = input.files?.[0];
    if (!file) return;
    const target = input.dataset.coverInput;
    state.coverBusy = true;
    try {
      const data = await readImageFile(file);
      if (target === 'book') { state.bookDraftCover = data; updateBookFormPreview(); }
      else { const i = Number(target.split('-')[1]); state.offerDraftCovers[i] = data; updateOfferSlotPreview(i); }
    } catch (err) {
      toast(err.message || 'Görsel yüklenemedi.', 'error');
    } finally {
      state.coverBusy = false;
      input.value = '';
    }
  }

  function removeDraftCover(target) {
    if (target === 'book') { state.bookDraftCover = ''; updateBookFormPreview(); return; }
    const i = Number(target.split('-')[1]);
    state.offerDraftCovers[i] = '';
    updateOfferSlotPreview(i);
  }

  /* --- Sezonlar (profil paneli → Sezonlar) · settings/season: { active, startedAt, endsAt } ---
     Sezon açıkken arayüz temalanır (kar yağışı vb.) ve sezonun vitrini Vitrin Ayarları'nda görünür.
     Süreli açılabilir: endsAt gelince sezon kendiliğinden kapanır (Admin istemcisi kayıtları temizler).
     Kış kapanınca silinir: Kış Fırsatları indirimleri, kış paketleri, kış kuponları (mağaza) ve
     kullanılmamış kış hediye çekleri (puanla açılıp kullanılmamış olanlar yalnızca aktiflikten çıkar, puan geri dönmez).
     Puan çarpanı ayarı, önceki kiralamalar ve kazanılan puanlar korunur. */
  function openSeasonModal() {
    if (!requireAdmin()) return;
    const cur = activeSeason();
    const end = seasonEndsMs();
    const endDate = end ? new Date(end) : new Date(Date.now() + 30 * DAY_MS);
    const pad = (n) => String(n).padStart(2, '0');
    const opt = (key, ic, label, desc) => `
      <label class="cursor-pointer block">
        <input type="radio" name="season" value="${key || ''}" ${cur === key ? 'checked' : ''} class="peer sr-only" />
        <span class="flex items-center gap-3 p-3 rounded-2xl border transition border-slate-100 bg-white hover:border-sky-200 peer-checked:bg-sky-50 peer-checked:border-sky-300 peer-checked:ring-2 peer-checked:ring-sky-200">
          <span class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg shrink-0">${ic}</span>
          <span class="min-w-0 flex-1">
            <span class="block text-xs font-bold text-slate-700">${label}</span>
            <span class="block text-[10px] text-slate-400">${desc}</span>
          </span>
          ${cur === key ? '<span class="text-[10px] font-bold text-sky-600 bg-white px-2 py-0.5 rounded-full border border-sky-200 shrink-0">✓ Şu an</span>' : ''}
        </span>
      </label>`;
    openModal(`
      ${modalHeader('Sezonlar 🗓️', 'Seçtiğin sezon herkeste anında açılır · istersen süreli aç, süre bitince kendiliğinden kapanır.', 'calendar', 'bg-sky-50 text-sky-600')}
      <form data-form="saveSeason" class="p-5 space-y-2.5" autocomplete="off">
        ${cur ? `<p class="text-[11px] text-sky-700 bg-sky-50 rounded-xl px-3 py-2">${SEASONS[cur].icon} ${SEASONS[cur].label} sezonu açık · ${end ? `<b>${formatDate(new Date(end).toISOString(), true)}</b>'da kapanacak (${formatRemaining(end - Date.now())})` : 'süresiz'}</p>` : ''}
        ${opt(null, '🌤️', 'Sezon yok', 'Normal görünüm · sezon vitrini kapalı')}
        ${Object.entries(SEASONS).map(([k, s]) => opt(k, s.icon, `${s.label} Sezonu`, s.desc)).join('')}
        <label class="flex items-center gap-2 text-[11px] text-slate-600 pt-1">
          <input type="checkbox" name="timed" ${end ? 'checked' : ''} class="rounded border-slate-300 text-sky-600" /> ⏳ Süreli (bu tarihte kendiliğinden kapansın)
        </label>
        <div class="grid grid-cols-[1fr_auto] gap-3">
          ${field('Bitiş Tarihi', `<input name="endDate" type="date" min="${localDateKey()}" value="${localDateKey(endDate)}" class="${INPUT_CLS} min-w-0" />`)}
          ${field('Saat', `<input name="endTime" type="time" value="${end ? `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}` : '23:59'}" class="${INPUT_CLS} w-[6.5rem]" />`)}
        </div>
        <p class="text-[10px] text-slate-400 leading-relaxed">Kış kapanınca (elle ya da süre bitince) Kış Fırsatları indirimleri, kış paketleri, kış kuponları ve kullanılmamış kış hediye çekleri silinir. Önceki kiralamalar ve puanlar korunur.</p>
        ${formFooter('Kaydet')}
      </form>`);
  }

  /* Sezon kapanırken silinecekler (yalnızca Kış'a özel kayıtlar) */
  function seasonCloseOps(prev) {
    if (prev !== 'winter') return [];
    const unusedCheque = (c) => c.season === 'winter' && !c.usedAt && (!c.openedAt || !(c.cost > 0));
    return [
      ...winterDeals.map((d) => (bt) => bt.delete(col('winterDeals').doc(d.id))),
      ...offers.filter((o) => o.season === 'winter').map((o) => (bt) => bt.delete(col('offers').doc(o.id))),
      ...couponShop.filter((s) => s.season === 'winter').map((s) => (bt) => bt.delete(col('couponShop').doc(s.id))),
      ...giftCheques.filter(unusedCheque).map((c) => (bt) => bt.delete(col('giftCheques').doc(c.id)))
    ];
  }

  function handleSaveSeason(fd) {
    if (!requireAdmin()) return;
    const season = SEASONS[fd.season] ? fd.season : null;
    const prev = activeSeason();
    let endsAt = null;
    if (season && fd.timed === 'on') {
      if (!isDateKey(fd.endDate) || !isTimeKey(fd.endTime)) return toast('Geçerli bir bitiş tarihi ve saati seçin.', 'error');
      const end = dateFromKey(fd.endDate);
      end.setHours(...fd.endTime.split(':').map(Number), 0, 0);
      if (end.getTime() <= Date.now()) return toast('Bitiş anı geçmiş olamaz.', 'error');
      endsAt = Timestamp.fromDate(end);
    }
    // Aynı sezon: yalnızca bitiş değişir (başlangıç ve kışın yeni kitapları korunur)
    const data = season === prev
      ? { endsAt, changedAt: isoAt(Date.now()), changedBy: state.currentUserId, ...(season && !seasonDoc().startedAt ? { startedAt: Timestamp.now() } : {}) }
      : { active: season, startedAt: season ? Timestamp.now() : null, endsAt, changedAt: isoAt(Date.now()), changedBy: state.currentUserId };
    const msg = season === prev
      ? (season ? `${SEASONS[season].icon} Sezon süresi güncellendi${endsAt ? ` · ${formatDate(endsAt.toDate().toISOString(), true)}'da kapanacak` : ' · süresiz'}.` : 'Sezon zaten kapalı.')
      : season ? `${SEASONS[season].icon} ${SEASONS[season].label} sezonu açıldı!${endsAt ? ` · ${formatDate(endsAt.toDate().toISOString(), true)}'da kapanacak` : ''}` : '🌤️ Sezon kapatıldı.';
    // Kışta Günün İndirimi yoktur: kış açılırken döngü duraklar, kış kapanınca kaldığı gruptan sürer (vitrin anahtarı açıksa)
    const dealsOn = showcaseDoc().deals !== false;
    const dealOps = [];
    if (season === 'winter' && prev !== 'winter' && dealsOn) dealOps.push(dealsPauseOp());
    if (prev === 'winter' && season !== 'winter' && dealsOn) { const op = dealsResumeOp(); if (op) dealOps.push(op); }
    const write = (ops = []) => {
      closeModal();
      return run(commitOps([...ops, ...dealOps, (bt) => bt.set(col('settings').doc('season'), data, { merge: true })]), msg, season ? 'success' : 'info');
    };
    const ops = season !== prev ? seasonCloseOps(prev) : [];
    if (!ops.length) return write();
    // Kış kapanıyor: neyin silineceği söylenip onay istenir
    const n = (arr) => arr.length;
    const deals = n(winterDeals), packs = n(offers.filter((o) => o.season === 'winter'));
    const shop = n(couponShop.filter((s) => s.season === 'winter'));
    const chq = n(giftCheques.filter((c) => c.season === 'winter' && !c.usedAt && (!c.openedAt || !(c.cost > 0))));
    openConfirm({
      title: 'Kış sezonu kapatılsın mı?',
      message: `Kalıcı olarak silinecek: ${[deals && `<b>${deals} kış indirimi</b>`, packs && `<b>${packs} kış paketi</b>`, shop && `<b>${shop} kış kuponu</b>`, chq && `<b>${chq} kullanılmamış kış çeki</b>`].filter(Boolean).join(', ')}.<br/>Sezon yeniden açılınca vitrin boş başlar. Önceki kiralamalar, puanlar ve puan çarpanı korunur.`,
      confirmLabel: 'Kapat ve Sil',
      onConfirm: () => write(ops)
    });
  }

  /* Süreli sezon bittiyse (Admin istemcisi) kayıtları temizler ve sezonu kapatır · bir kez */
  function expireSeason() {
    if (!isRealAdmin()) return;
    const d = seasonDoc();
    const end = seasonEndsMs();
    if (!SEASONS[d.active] || end == null || end > Date.now() || state.purgePending.has(`seasonexp:${end}`)) return;
    state.purgePending.add(`seasonexp:${end}`);
    const resume = d.active === 'winter' && showcaseDoc().deals !== false ? dealsResumeOp() : null;
    commitOps([...seasonCloseOps(d.active), ...(resume ? [resume] : []),
      (bt) => bt.set(col('settings').doc('season'), { active: null, startedAt: null, endsAt: null, changedAt: isoAt(Date.now()), changedBy: 'auto' }, { merge: true })])
      .then(() => toast(`${SEASONS[d.active].icon} ${SEASONS[d.active].label} sezonunun süresi doldu · sezon kapatıldı.`, 'info'))
      .catch((e) => { console.error(e); state.purgePending.delete(`seasonexp:${end}`); });
  }

  function runQuick(action) {
    if (action === 'addBook') return openBookFormModal();
    if (action === 'changePrice') return openChangePriceModal();
    if (action === 'addUpdate') return openUpdateModal();
    if (action === 'addOffer') return openOfferFormModal();
    if (action === 'addNews') return openNewsModal();
    if (action === 'manageTypes') return openTypeManager();
  }

  /* ==========================================================
     17.1) İLK KURULUM: ÖRNEK KATALOĞU FIRESTORE'A TAŞI (Admin)
     ========================================================== */
  async function seedCatalog(mode) {
    if (!requireAdmin()) return;
    if (bookTypes.length || books.length) return toast('Firestore zaten dolu; taşıma yapılmadı.', 'info');
    const me = state.currentUserId;
    const batch = db.batch();
    SEED_TYPES.forEach((t, i) => batch.set(col('bookTypes').doc(t.id), { ...docData(t), order: i + 1 }));
    if (mode === 'catalog') {
      SEED_BOOKS.forEach((b) => batch.set(bookRef(b.id), { ...b, authorId: me, lockUntil: null, lockBy: null, lockRental: null }));
      SEED_PRICE_LOGS.forEach((l) => batch.set(col('priceLogs').doc(l.id), { ...docData(l), changedBy: me }));
      SEED_ANNOUNCEMENTS.forEach((a) => batch.set(col('announcements').doc(a.id), { ...docData(a), authorId: me, readBy: [] }));
      SEED_OFFERS.filter((o) => isOfferActive(o)).forEach((o) => batch.set(col('offers').doc(o.id), {
        ...docData(o), endsAt: offerEndsAt(o.validUntil), bookIds: o.items.map((it) => it.bookId)
      }));
    }
    await run(batch.commit(), mode === 'catalog' ? 'Örnek katalog Firestore\'a yüklendi 🗄️' : 'Kitap türleri oluşturuldu.');
  }

