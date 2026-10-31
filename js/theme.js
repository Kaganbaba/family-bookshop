  /* ==========================================================
     T) TEMA · Tailwind yapılandırması + koyu mod
     <head> içinde, Tailwind CDN'den hemen sonra, defer OLMADAN yüklenir (sayfa çizilmeden tema uygulanır).
     Tüm Tailwind renkleri CSS değişkenlerine bağlıdır: açık modda değerler Tailwind'in kendi paletidir
     (görünüm birebir aynı), koyu modda (html.dark) değişkenler koyu karşılıklarıyla değişir. Böylece
     hover:, sm:, /opaklık ve degradeler dahil her sınıf kendiliğinden uyar; yeni kodda ayrıca bir şey gerekmez.
     Zemin, yazı ve çerçeve için ayrı değişkenler var: bg-slate-50 koyulaşırken text-slate-800 açılır.
     .light-scope: altındaki her şey koyu modda da açık renklerle kalır (sabit renkli vitrinler, alt bilgi).
     ========================================================== */
  const THEME_KEY = 'fb.theme';
  const DARK_META = '#0e1626', LIGHT_META = '#2563eb';

  /* Tailwind v3 paleti (50 → 950) · brand = blue */
  const TW_PALETTE = {
    slate:   'f8fafc f1f5f9 e2e8f0 cbd5e1 94a3b8 64748b 475569 334155 1e293b 0f172a 020617',
    gray:    'f9fafb f3f4f6 e5e7eb d1d5db 9ca3af 6b7280 4b5563 374151 1f2937 111827 030712',
    zinc:    'fafafa f4f4f5 e4e4e7 d4d4d8 a1a1aa 71717a 52525b 3f3f46 27272a 18181b 09090b',
    neutral: 'fafafa f5f5f5 e5e5e5 d4d4d4 a3a3a3 737373 525252 404040 262626 171717 0a0a0a',
    stone:   'fafaf9 f5f5f4 e7e5e4 d6d3d1 a8a29e 78716c 57534e 44403c 292524 1c1917 0c0a09',
    red:     'fef2f2 fee2e2 fecaca fca5a5 f87171 ef4444 dc2626 b91c1c 991b1b 7f1d1d 450a0a',
    orange:  'fff7ed ffedd5 fed7aa fdba74 fb923c f97316 ea580c c2410c 9a3412 7c2d12 431407',
    amber:   'fffbeb fef3c7 fde68a fcd34d fbbf24 f59e0b d97706 b45309 92400e 78350f 451a03',
    yellow:  'fefce8 fef9c3 fef08a fde047 facc15 eab308 ca8a04 a16207 854d0e 713f12 422006',
    lime:    'f7fee7 ecfccb d9f99d bef264 a3e635 84cc16 65a30d 4d7c0f 3f6212 365314 1a2e05',
    green:   'f0fdf4 dcfce7 bbf7d0 86efac 4ade80 22c55e 16a34a 15803d 166534 14532d 052e16',
    emerald: 'ecfdf5 d1fae5 a7f3d0 6ee7b7 34d399 10b981 059669 047857 065f46 064e3b 022c22',
    teal:    'f0fdfa ccfbf1 99f6e4 5eead4 2dd4bf 14b8a6 0d9488 0f766e 115e59 134e4a 042f2e',
    cyan:    'ecfeff cffafe a5f3fc 67e8f9 22d3ee 06b6d4 0891b2 0e7490 155e75 164e63 083344',
    sky:     'f0f9ff e0f2fe bae6fd 7dd3fc 38bdf8 0ea5e9 0284c7 0369a1 075985 0c4a6e 082f49',
    blue:    'eff6ff dbeafe bfdbfe 93c5fd 60a5fa 3b82f6 2563eb 1d4ed8 1e40af 1e3a8a 172554',
    indigo:  'eef2ff e0e7ff c7d2fe a5b4fc 818cf8 6366f1 4f46e5 4338ca 3730a3 312e81 1e1b4b',
    violet:  'f5f3ff ede9fe ddd6fe c4b5fd a78bfa 8b5cf6 7c3aed 6d28d9 5b21b6 4c1d95 2e1065',
    purple:  'faf5ff f3e8ff e9d5ff d8b4fe c084fc a855f7 9333ea 7e22ce 6b21a8 581c87 3b0764',
    fuchsia: 'fdf4ff fae8ff f5d0fe f0abfc e879f9 d946ef c026d3 a21caf 86198f 701a75 4a044e',
    pink:    'fdf2f8 fce7f3 fbcfe8 f9a8d4 f472b6 ec4899 db2777 be185d 9d174d 831843 500724',
    rose:    'fff1f2 ffe4e6 fecdd3 fda4af fb7185 f43f5e e11d48 be123c 9f1239 881337 4c0519'
  };
  TW_PALETTE.brand = TW_PALETTE.blue;
  const TW_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const NEUTRAL_HUES = ['slate', 'gray', 'zinc', 'neutral', 'stone'];

  /* Koyu modun iki temel tonu: sayfa zemini ve kart yüzeyi (bg-white) */
  const DARK_PAGE = [14, 22, 38];      // #0e1626
  const DARK_SURFACE = [24, 34, 53];   // #182235

  const hexRgb = (h) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mixRgb = (a, b, t) => a.map((v, i) => Math.round(v * t + b[i] * (1 - t)));  // t: a'nın payı
  const rgbVar = (c) => c.join(' ');

  /* Koyu karşılıklar · s: ton sırası (0 = 50 … 10 = 950) */
  function darkBg(hue, s, pal) {
    const mid = pal[5], neutral = NEUTRAL_HUES.includes(hue);
    if (neutral) {
      if (s === 0) return mixRgb(mid, DARK_PAGE, 0.08);          // bg-slate-50: yüzeyden biraz koyu iç alan
      if (s <= 3) return mixRgb(mid, DARK_SURFACE, [0, 0.18, 0.26, 0.38][s]);
      if (s === 8) return pal[7];                                 // bg-slate-800 koyu rozetler yüzeyden ayrışsın
      return pal[s];
    }
    if (s <= 3) return mixRgb(mid, DARK_SURFACE, [0.14, 0.22, 0.32, 0.45][s]);  // açık pastel zeminler → koyu renkli ton
    return pal[s];
  }
  function darkText(hue, s, pal) {
    if (NEUTRAL_HUES.includes(hue)) {
      if (s <= 2) return pal[s];
      // 300 soluk süs → 600 · 400 ikincil yazı aynen · 500 biraz açılır · 600+ açık tonlara döner
      return [null, null, null, pal[6], pal[4], mixRgb(pal[3], pal[4], 0.4), pal[3], pal[2], pal[1], pal[0], pal[0]][s];
    }
    if (s <= 4) return pal[s];
    return [mixRgb(pal[5], pal[4], 0.5), pal[4], pal[3], pal[2], pal[1], pal[0]][s - 5];
  }
  function darkBorder(hue, s, pal) {
    const mid = pal[5];
    if (s > 3) return pal[s];
    return mixRgb(mid, DARK_SURFACE, (NEUTRAL_HUES.includes(hue) ? [0.14, 0.22, 0.3, 0.42] : [0.18, 0.26, 0.36, 0.5])[s]);
  }

  /* Değişkenler: --bg-*, --tx-*, --bd-* (ör. --bg-rose-50: "255 241 242") */
  function buildThemeVars() {
    const light = [], dark = [];
    Object.entries(TW_PALETTE).forEach(([hue, str]) => {
      const pal = str.split(' ').map(hexRgb);
      TW_SHADES.forEach((shade, s) => {
        const name = `${hue}-${shade}`, c = rgbVar(pal[s]);
        light.push(`--bg-${name}:${c};--tx-${name}:${c};--bd-${name}:${c}`);
        dark.push(`--bg-${name}:${rgbVar(darkBg(hue, s, pal))};--tx-${name}:${rgbVar(darkText(hue, s, pal))};--bd-${name}:${rgbVar(darkBorder(hue, s, pal))}`);
      });
    });
    const lightBase = '--bg-white:255 255 255;--bd-white:255 255 255;--mix-paper:#fff;--mix-ink:#0f172a;'
      + '--sh-soft:0 2px 12px -2px rgba(30,64,175,.08),0 1px 3px rgba(15,23,42,.04);'
      + '--sh-soft-lg:0 12px 40px -8px rgba(30,64,175,.18),0 2px 6px rgba(15,23,42,.05);';
    const darkBase = `--bg-white:${rgbVar(DARK_SURFACE)};--bd-white:${rgbVar(DARK_SURFACE)};--mix-paper:rgb(${rgbVar(DARK_SURFACE)});--mix-ink:#fff;`
      + '--sh-soft:0 2px 12px -2px rgba(0,0,0,.45),0 1px 3px rgba(0,0,0,.3);'
      + '--sh-soft-lg:0 12px 40px -8px rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35);';
    const lightCss = lightBase + light.join(';');
    return `:root,.light-scope{${lightCss}}\nhtml.dark{color-scheme:dark;${darkBase}${dark.join(';')}}\nhtml.dark .light-scope{color-scheme:light;${lightCss}}`;
  }

  /* Tailwind renk ölçekleri: her rol kendi değişkenini kullanır */
  function twScale(prefix) {
    const out = { transparent: 'transparent', current: 'currentColor', inherit: 'inherit', black: '#000' };
    Object.keys(TW_PALETTE).forEach((hue) => {
      out[hue] = {};
      TW_SHADES.forEach((shade) => { out[hue][shade] = `rgb(var(--${prefix}-${hue}-${shade}) / <alpha-value>)`; });
    });
    return out;
  }
  /* Beyaz: koyu modda kart yüzeyi olur; renkli zemin üstündeki yarı saydam beyaz parıltılar beyaz kalır.
     Eşik: zeminde %50 altı (bg-white/20 parıltı · bg-white/60 boş durum kutusu = yüzey),
     çerçeve/halkada %75 altı (border-white/70, ring-white/40 renkli zeminde ayraç) */
  const twWhite = (prefix, limit) => ({ opacityValue }) => {
    const n = Number(opacityValue);
    if (opacityValue !== undefined && !Number.isNaN(n) && n < limit) return `rgb(255 255 255 / ${opacityValue})`;
    return `rgb(var(--${prefix}-white) / ${opacityValue ?? 1})`;
  };

  const bgColors = { ...twScale('bg'), white: twWhite('bg', 0.5) };
  const bdColors = { ...twScale('bd'), white: twWhite('bd', 0.75) };
  tailwind.config = {
    darkMode: 'class',
    theme: {
      colors: { ...twScale('tx'), white: '#fff' },
      backgroundColor: bgColors,
      gradientColorStops: bgColors,
      borderColor: { ...bdColors, DEFAULT: 'rgb(var(--bd-gray-200) / <alpha-value>)' },  // Tailwind varsayılanı
      divideColor: bdColors,
      ringColor: { ...bdColors, DEFAULT: 'rgb(var(--bd-blue-500) / <alpha-value>)' },
      ringOffsetColor: bdColors,
      extend: {
        fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
        boxShadow: { soft: 'var(--sh-soft)', 'soft-lg': 'var(--sh-soft-lg)' }
      }
    }
  };

  /* Değişkenleri sayfaya yaz + kayıtlı tercihi uygula (sayfa çizilmeden: beyaz parlama olmaz) */
  (function initTheme() {
    const style = document.createElement('style');
    style.id = 'themeVars';
    style.textContent = buildThemeVars();
    document.head.appendChild(style);
    applyTheme(readThemePref());
  })();

  function readThemePref() {
    try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  }
  const isDarkMode = () => document.documentElement.classList.contains('dark');
  function applyTheme(mode) {
    const dark = mode === 'dark';
    document.documentElement.classList.toggle('dark', dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? DARK_META : LIGHT_META);
  }
  /* Tercih bu tarayıcıda saklanır (Liste / Vitrin seçimi gibi) */
  function setThemePref(mode) {
    try { localStorage.setItem(THEME_KEY, mode); } catch { /* gizli sekme: yalnızca bu oturum */ }
    applyTheme(mode);
  }
