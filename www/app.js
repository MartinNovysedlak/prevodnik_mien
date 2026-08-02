(function () {
  "use strict";

  // ====== PREDVOLBENÉ TÉMY ======
  const BG_THEMES = [
    { id: "dark",   bg: "#222222", fn: "#484848", num: "#636363", label: "Tmavá" },
    { id: "black",  bg: "#000000", fn: "#1c1c1e", num: "#2c2c2e", label: "Čierna" },
    { id: "navy",   bg: "#0f1b2d", fn: "#1d2d47", num: "#28405f", label: "Námorná" },
    { id: "graph",  bg: "#1a1a1a", fn: "#333333", num: "#4a4a4a", label: "Grafit" },
  ];
  const ACCENT_THEMES = [
    { id: "blue",   val: "#0052CC", press: "#003d99", label: "Modrá" },
    { id: "green",  val: "#2ecc71", press: "#25a85f", label: "Zelená" },
    { id: "orange", val: "#ff9f43", press: "#e08636", label: "Oranžová" },
    { id: "purple", val: "#9b59b6", press: "#7e4490", label: "Fialová" },
    { id: "red",    val: "#e74c3c", press: "#c0392b", label: "Červená" },
    { id: "teal",   val: "#1abc9c", press: "#16a085", label: "Tyrkysová" },
  ];
  const RESULT_COLORS = [
    { id: "accent",  val: "var(--accent)", label: "Akcent" },
    { id: "white",   val: "#ffffff",       label: "Biela" },
    { id: "green",   val: "#2ecc71",       label: "Zelená" },
    { id: "yellow",  val: "#ffcc00",       label: "Žltá" },
    { id: "orange",  val: "#ff9f43",       label: "Oranžová" },
    { id: "cyan",    val: "#00e5ff",       label: "Tyrkysová" },
  ];

  // ====== HAPTIKA (Capacitor plugin) ======
  let Haptics = null;
  try {
    Haptics = (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) || null;
    if (!Haptics && window.CapacitorHaptics) Haptics = window.CapacitorHaptics;
  } catch (e) {}

  // ====== STAV ======
  const DEFAULT_SETTINGS = {
    bg: "dark",
    accent: "blue",
    result: "accent",
    resultMode: "accent",  // accent | white | custom
    style: "classic",      // classic | rounded | flat | circle
    density: "comfortable",
    amount: "normal",      // small | normal | large
    weight: "bold",        // normal | medium | bold
    haptics: true,
    swap: true,            // zobrazovať šípky
    favorites: [],         // obľúbené meny (kódy)
    defaultFrom: "CZK",    // default zdrojová mena
    defaultTo: "EUR",      // default cieľová mena
    lastFrom: null,        // posledná zdrojová mena (perzistencia medzi spusteniami)
    lastTo: null,          // posledná cieľová mena
  };

  // Načítanie obľúbených z localStorage (mimo settings pre rýchly prístup)
  function loadFavorites() {
    try {
      return JSON.parse(localStorage.getItem("pm_favorites") || "[]");
    } catch (e) { return []; }
  }
  function saveFavorites() {
    try {
      localStorage.setItem("pm_favorites", JSON.stringify(state.settings.favorites));
    } catch (e) {}
  }

  const state = {
    from: "CZK",
    to: "EUR",
    rates: {},
    base: "EUR",
    updatedAt: null,
    online: navigator.onLine,
    settings: loadSettings(),
    selectTarget: null,
    // kalkulačka
    expr: "2850",       // aktuálne zadaný výraz (zdroj)
    operator: null,     // '+','-','×','÷'
    operand: null,      // predchádzajúci operand pre operáciu
    freshInput: true,   // či ďalšia číslica začína nové číslo
  };

  // ====== PERZISTENCIA NASTAVENÍ ======
  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem("pm_settings") || "null");
      const merged = Object.assign({}, DEFAULT_SETTINGS, s || {});
      // Načítanie obľúbených (pre spätnú kompatibilitu aj zo starého kľúča)
      merged.favorites = merged.favorites || loadFavorites();
      return merged;
    } catch (e) {
      return Object.assign({}, DEFAULT_SETTINGS, { favorites: loadFavorites() });
    }
  }
  function saveSettings() {
    try {
      localStorage.setItem("pm_settings", JSON.stringify(state.settings));
    } catch (e) {}
  }

  // ====== PERZISTENCIA POSLEDNÝCH MIEN ======
  function saveLastCurrencies() {
    try {
      localStorage.setItem("pm_last", JSON.stringify({ from: state.from, to: state.to }));
    } catch (e) {}
  }
  function loadLastCurrencies() {
    try {
      const data = JSON.parse(localStorage.getItem("pm_last") || "null");
      if (data && data.from && data.to) return data;
    } catch (e) {}
    return null;
  }

  // ====== APLIKÁCIA TÉMY ======
  function applyTheme() {
    const s = state.settings;
    const bg = BG_THEMES.find((t) => t.id === s.bg) || BG_THEMES[0];
    const ac = ACCENT_THEMES.find((t) => t.id === s.accent) || ACCENT_THEMES[0];
    const rc = RESULT_COLORS.find((t) => t.id === s.result) || RESULT_COLORS[0];
    const r = document.documentElement.style;
    r.setProperty("--bg", bg.bg);
    r.setProperty("--btn-fn", bg.fn);
    r.setProperty("--btn-num", bg.num);
    r.setProperty("--accent", ac.val);
    r.setProperty("--accent-press", ac.press);
    // Farba výsledku podľa režimu
    let resultColor = ac.val;
    if (s.resultMode === "white") resultColor = "#ffffff";
    else if (s.resultMode === "custom") resultColor = rc.val;
    r.setProperty("--result", resultColor);
    document.body.setAttribute("data-style", s.style);
    document.body.setAttribute("data-density", s.density);
    document.body.setAttribute("data-amount", s.amount);
    document.body.setAttribute("data-weight", s.weight);
    document.body.setAttribute("data-swap", s.swap ? "on" : "off");
    // meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", bg.bg);
  }

  // ====== CACHE KURZOV ======
  const CACHE_KEY = "pm_rates_cache_v1";
  function saveCache() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        rates: state.rates, base: state.base, updatedAt: state.updatedAt,
      }));
    } catch (e) {}
  }
  function loadCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data && data.rates) {
        state.rates = data.rates;
        state.base = data.base || "EUR";
        state.updatedAt = data.updatedAt || null;
        return true;
      }
    } catch (e) {}
    return false;
  }

  // ====== API ======
  async function fetchRatesErApi() {
    const res = await fetch("https://open.er-api.com/v6/latest/EUR", { cache: "no-store" });
    if (!res.ok) throw new Error("er-api " + res.status);
    const data = await res.json();
    if (!data || !data.rates) throw new Error("er-api no rates");
    return {
      rates: data.rates,
      base: data.base_code || "EUR",
      updatedAt: data.time_last_update_utc ? Date.parse(data.time_last_update_utc) : Date.now(),
    };
  }
  async function fetchRatesFrankfurter() {
    const res = await fetch("https://api.frankfurter.dev/v1/latest?from=EUR", { cache: "no-store" });
    if (!res.ok) throw new Error("frankfurter " + res.status);
    const data = await res.json();
    if (!data || !data.rates) throw new Error("frankfurter no rates");
    return {
      rates: Object.assign({ EUR: 1 }, data.rates),
      base: "EUR",
      updatedAt: data.date ? Date.parse(data.date) : Date.now(),
    };
  }
  async function refreshRates() {
    if (!navigator.onLine) { flashNetBadge(false); return false; }
    setRefreshSpin(true);
    try {
      let result;
      try { result = await fetchRatesErApi(); }
      catch (e) { result = await fetchRatesFrankfurter(); }
      result.rates[result.base] = result.rates[result.base] || 1;
      state.rates = result.rates;
      state.base = result.base;
      // Použijeme aktuálny čas (nie API timestamp, ktorý býva starý) → "Práve teraz"
      state.updatedAt = Date.now();
      saveCache();
      flashNetBadge(true);
      return true;
    } catch (e) {
      flashNetBadge(false);
      return false;
    } finally {
      setRefreshSpin(false);
    }
  }

  // ====== KURZY ======
  function rateBetween(from, to) {
    const a = state.rates[from], b = state.rates[to];
    if (!a || !b) return null;
    return b / a;
  }

  // ====== FORMÁT ======
  function fmtNum(v, d) {
    if (v === null || v === undefined || isNaN(v)) return "—";
    return Number(v).toLocaleString("sk-SK", {
      minimumFractionDigits: d === undefined ? 2 : d,
      maximumFractionDigits: d === undefined ? 2 : d,
    });
  }
  function fmtAmount(v, code) {
    const c = window.CURRENCY_MAP[code];
    return fmtNum(v, c ? c.decimals : 2);
  }

  // ====== PARSE VÝRAZU ======
  function parseExpr(str) {
    // Ak obsahuje operátor, vyhodnoť
    const s = String(str).replace(",", ".").trim();
    if (s === "" || s === ".") return 0;
    let v = parseFloat(s);
    return isNaN(v) ? 0 : v;
  }

  // ====== DOM ======
  const el = {
    fromFlag: document.getElementById("from-flag"),
    fromCode: document.getElementById("from-code"),
    fromAmount: document.getElementById("from-amount"),
    toFlag: document.getElementById("to-flag"),
    toCode: document.getElementById("to-code"),
    toAmount: document.getElementById("to-amount"),
    rateInfo: document.getElementById("rate-info"),
    updatedInfo: document.getElementById("updated-info"),
    swapBtn: document.getElementById("swap-btn"),
    keypad: document.getElementById("keypad"),
    mainScreen: document.getElementById("main-screen"),
    currencyScreen: document.getElementById("currency-screen"),
    settingsScreen: document.getElementById("settings-screen"),
    backBtn: document.getElementById("back-btn"),
    refreshBtn: document.getElementById("refresh-btn"),
    searchInput: document.getElementById("search-input"),
    currencyList: document.getElementById("currency-list"),
    netBadge: document.getElementById("net-badge"),
    barRefresh: document.getElementById("bar-refresh"),
    barInfo: document.getElementById("bar-info"),
    settingsBack: document.getElementById("settings-back-btn"),
    colorSwatches: document.getElementById("color-swatches"),
    accentSwatches: document.getElementById("accent-swatches"),
    styleOptions: document.getElementById("style-options"),
    densityOptions: document.getElementById("density-options"),
    amountOptions: document.getElementById("amount-options"),
    weightOptions: document.getElementById("weight-options"),
    resultModeOptions: document.getElementById("result-mode-options"),
    swapToggle: document.getElementById("swap-toggle"),
    defaultFromSelect: document.getElementById("default-from-select"),
    hapticsToggle: document.getElementById("haptics-toggle"),
    resultSwatches: document.getElementById("result-swatches"),
    dataSourceLine: document.getElementById("data-source-line"),
  };

  // ====== VIBRÁCIA (cez Capacitor Haptics plugin) ======
  function vibrate(ms) {
    if (!state.settings.haptics) return;
    try {
      if (Haptics && Haptics.impact) {
        Haptics.impact({ style: "LIGHT" });
        return;
      }
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) {}
  }

  // ====== RIPPLE ======
  function addRipple(e, target) {
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    const r = document.createElement("span");
    r.className = "ripple";
    r.style.width = r.style.height = size + "px";
    r.style.left = cx - size / 2 + "px";
    r.style.top = cy - size / 2 + "px";
    target.appendChild(r);
    setTimeout(() => r.remove(), 560);
  }

  // ====== KALKULAČKA ======
  function compute(a, op, b) {
    a = Number(a); b = Number(b);
    switch (op) {
      case "+": return a + b;
      case "−": return a - b;
      case "×": return a * b;
      case "÷": return b === 0 ? 0 : a / b;
    }
    return b;
  }

  function handleKey(key) {
    vibrate(8);
    let changed = true;

    if (key === "C") {
      state.expr = "0";
      state.operator = null;
      state.operand = null;
      state.freshInput = true;
    } else if (key === "⌫") {
      if (state.expr.length > 1) state.expr = state.expr.slice(0, -1);
      else state.expr = "0";
    } else if (key === ".") {
      if (state.expr.indexOf(",") === -1) state.expr += ",";
    } else if (key === "swap") {
      swap();
      changed = false;
    } else if (key === "=") {
      if (state.operator !== null && state.operand !== null) {
        const r = compute(state.operand, state.operator, parseExpr(state.expr));
        state.expr = cleanNumStr(r);
        state.operator = null;
        state.operand = null;
        state.freshInput = true;
      }
    } else if (key === "%") {
      // percento z operandu
      const v = parseExpr(state.expr);
      if (state.operator !== null && state.operand !== null &&
          (state.operator === "+" || state.operator === "−")) {
        const r = compute(state.operand, state.operator, state.operand * v / 100);
        state.expr = cleanNumStr(r);
      } else {
        state.expr = cleanNumStr(v / 100);
      }
      state.freshInput = true;
    } else if (["+", "−", "×", "÷"].indexOf(key) >= 0) {
      if (state.operator !== null && state.operand !== null && !state.freshInput) {
        // reťazový výpočet
        const r = compute(state.operand, state.operator, parseExpr(state.expr));
        state.operand = r;
        state.expr = cleanNumStr(r);
      } else {
        state.operand = parseExpr(state.expr);
      }
      state.operator = key;
      state.freshInput = true;
    } else if (/^[0-9]$/.test(key)) {
      if (state.freshInput || state.expr === "0") {
        state.expr = key;
        state.freshInput = false;
      } else {
        if (state.expr.length < 13) state.expr += key;
      }
    }

    if (changed) renderMain();
  }

  function cleanNumStr(v) {
    // formát výsledku operácie bez tisícov pre ďalšie zadávanie
    let s = String(Math.round(v * 1e8) / 1e8);
    return s.replace(".", ",");
  }

  // ====== ZOBRAZENIE VSTUPU ======
  function formatNumberStr(str) {
    if (!str || str === "0") return "0";
    const hasComma = str.indexOf(",") >= 0;
    const [intPart, decPart] = str.split(",");
    const intFmt = Number(intPart || "0").toLocaleString("sk-SK");
    if (hasComma) return intFmt + "," + (decPart || "");
    return intFmt;
  }
  function displayInput() {
    // Ak prebieha operácia, ukážeme celý výraz: "100 + 50 ×"
    if (state.operator !== null && state.operand !== null) {
      return formatNumberStr(cleanNumStr(state.operand)) + " " + state.operator + " " +
             (state.freshInput ? "" : formatNumberStr(state.expr));
    }
    return formatNumberStr(state.expr);
  }

  // ====== RENDER HLAVNÁ ======
  function renderMain() {
    const fc = window.CURRENCY_MAP[state.from];
    const tc = window.CURRENCY_MAP[state.to];
    el.fromFlag.style.backgroundImage = "url('flags/" + fc.cc + ".png')";
    el.fromCode.textContent = state.from;
    el.toFlag.style.backgroundImage = "url('flags/" + tc.cc + ".png')";
    el.toCode.textContent = state.to;

    const rate = rateBetween(state.from, state.to);
    // Aktuálna hodnota: ak prebieha operácia, ukážeme medzivýsledok
    let val;
    if (state.operator !== null && state.operand !== null) {
      if (state.freshInput) {
        val = state.operand; // len prvý operand zobrazený
      } else {
        val = compute(state.operand, state.operator, parseExpr(state.expr));
      }
    } else {
      val = parseExpr(state.expr);
    }
    const out = rate !== null ? val * rate : null;

    el.fromAmount.textContent = displayInput();
    el.toAmount.textContent = out !== null ? fmtAmount(out, state.to) : "—";

    if (rate !== null) {
      el.rateInfo.textContent = "1 " + state.from + " = " + fmtAmount(rate, state.to) + " " + state.to;
    } else {
      el.rateInfo.textContent = "Kurz nedostupný";
    }

    if (state.updatedAt) {
      el.updatedInfo.textContent = humanizeAge(Date.now() - state.updatedAt);
      el.updatedInfo.classList.toggle("offline", !state.online);
    } else {
      el.updatedInfo.textContent = "Načítavam…";
    }

    // Zvýrazniť aktívny operátor na klávesnici
    el.keypad.querySelectorAll(".key.key-op").forEach((k) => {
      k.classList.toggle("active-op", state.operator === k.getAttribute("data-key") && state.freshInput);
    });
  }

  function humanizeAge(ms) {
    const min = Math.floor(ms / 60000);
    if (min < 1) return "Práve teraz";
    if (min < 60) return "pred " + min + " min";
    const h = Math.floor(min / 60);
    if (h < 24) return "pred " + h + " h";
    const d = Math.floor(h / 24);
    return "pred " + d + " dňami";
  }

  // ====== SWAP ======
  function swap() {
    vibrate(12);
    const tmp = state.from; state.from = state.to; state.to = tmp;
    // výsledok sa stane novým vstupom
    const prevOutText = el.toAmount.textContent;
    const prevOut = parseFloat(String(prevOutText).replace(/\s/g, "").replace(",", "."));
    if (!isNaN(prevOut) && prevOut > 0) state.expr = cleanNumStr(prevOut);
    state.freshInput = true;
    saveLastCurrencies();
    el.swapBtn.classList.remove("flipped");
    void el.swapBtn.offsetWidth;
    el.swapBtn.classList.add("animating");
    setTimeout(() => {
      el.swapBtn.classList.remove("animating");
      el.swapBtn.classList.add("flipped");
    }, 200);
    renderMain();
  }

  // ====== OBRAZOVKY ======
  function show(screen) {
    el.mainScreen.classList.toggle("active", screen === "main");
    el.currencyScreen.classList.toggle("active", screen === "currency");
    el.settingsScreen.classList.toggle("active", screen === "settings");
  }

  function openCurrencySelect(target) {
    state.selectTarget = target;
    renderCurrencyList();
    show("currency");
    el.searchInput.value = "";
  }
  function openSettings() {
    renderSettings();
    show("settings");
  }

  function renderCurrencyList() {
    const q = el.searchInput.value.trim().toLowerCase();
    const favs = state.settings.favorites || [];
    // Default mena zdroja patrí tiež hore
    const priorityCodes = favs.slice();
    if (state.settings.defaultFrom && priorityCodes.indexOf(state.settings.defaultFrom) === -1) {
      priorityCodes.unshift(state.settings.defaultFrom);
    }

    let items = window.CURRENCIES.filter((c) =>
      !q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
    // Zoradiť: obľúbené + default hore, potom zvyšok abecedne
    items.sort((a, b) => {
      const ai = priorityCodes.indexOf(a.code);
      const bi = priorityCodes.indexOf(b.code);
      const aP = ai >= 0 ? ai : 999;
      const bP = bi >= 0 ? bi : 999;
      if (aP !== bP) return aP - bP;
      return a.code.localeCompare(b.code);
    });

    el.currencyList.innerHTML = items.map((c) => {
      const rate = rateBetween(state.from, c.code);
      let rateStr = "—";
      if (rate !== null) rateStr = fmtAmount(rate, c.code) + " " + state.from;
      else if (c.code === state.from) rateStr = "1,00 " + state.from;
      const sel =
        (state.selectTarget === "from" && c.code === state.from) ||
        (state.selectTarget === "to" && c.code === state.to);
      const isFav = favs.indexOf(c.code) >= 0;
      const isDefault = c.code === state.settings.defaultFrom;
      return (
        '<div class="list-item' + (sel ? " selected" : "") + (isFav || isDefault ? " is-fav" : "") + '" data-code="' + c.code + '">' +
          '<span class="flag-circle" style="background-image:url(\'flags/' + c.cc + '.png\')"></span>' +
          '<div class="list-item-text">' +
            '<div class="list-item-code">' + c.code +
              (isFav ? ' <span class="star">★</span>' : "") +
            "</div>" +
            '<div class="list-item-name">' + c.name + (isDefault ? " · predvolená" : "") + "</div>" +
          "</div>" +
          '<div class="list-item-rate">' + rateStr + "</div>" +
        "</div>"
      );
    }).join("") || '<div style="text-align:center;color:var(--text-sub);padding:30px;">Žiadne meny</div>';

    bindListItems();
  }

  // ====== OBĽÚBENÉ MENY ======
  function toggleFavorite(code) {
    const favs = state.settings.favorites || [];
    const idx = favs.indexOf(code);
    if (idx >= 0) favs.splice(idx, 1);
    else favs.push(code);
    state.settings.favorites = favs;
    saveSettings();
    saveFavorites();
    renderCurrencyList();
  }

  // ====== LONG-PRESS pre obľúbené + klik pre výber ======
  function bindListItems() {
    el.currencyList.querySelectorAll(".list-item").forEach((n) => {
      let pressTimer = null;
      let longPressed = false;

      const startPress = (e) => {
        longPressed = false;
        pressTimer = setTimeout(() => {
          longPressed = true;
          const code = n.getAttribute("data-code");
          toggleFavorite(code);
          vibrate(25);
        }, 500);
      };
      const cancelPress = () => {
        if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
      };

      n.addEventListener("touchstart", startPress, { passive: true });
      n.addEventListener("touchend", cancelPress);
      n.addEventListener("touchmove", cancelPress, { passive: true });
      n.addEventListener("mousedown", startPress);
      n.addEventListener("mouseup", cancelPress);
      n.addEventListener("mouseleave", cancelPress);

      n.addEventListener("click", () => {
        if (longPressed) return; // ignorovať klik po long-press
        const code = n.getAttribute("data-code");
        vibrate(10);
        if (state.selectTarget === "from") state.from = code;
        else if (state.selectTarget === "to") state.to = code;
        saveLastCurrencies();
        show("main");
        renderMain();
      });
    });
  }

  // ====== NASTAVENIA RENDER ======
  function renderSettings() {
    // Farby pozadia
    el.colorSwatches.innerHTML = BG_THEMES.map((t) =>
      '<div class="swatch' + (state.settings.bg === t.id ? " active" : "") + '" data-bg="' + t.id + '" title="' + t.label + '" style="background:linear-gradient(135deg,' + t.num + "," + t.bg + ')"></div>'
    ).join("");
    el.colorSwatches.querySelectorAll(".swatch").forEach((s) => {
      s.addEventListener("click", () => {
        state.settings.bg = s.getAttribute("data-bg");
        saveSettings(); applyTheme(); renderSettings();
        vibrate(8);
      });
    });
    // Akcenty
    el.accentSwatches.innerHTML = ACCENT_THEMES.map((t) =>
      '<div class="swatch' + (state.settings.accent === t.id ? " active" : "") + '" data-acc="' + t.id + '" title="' + t.label + '" style="background:' + t.val + '"></div>'
    ).join("");
    el.accentSwatches.querySelectorAll(".swatch").forEach((s) => {
      s.addEventListener("click", () => {
        state.settings.accent = s.getAttribute("data-acc");
        saveSettings(); applyTheme(); renderSettings(); renderMain();
        vibrate(8);
      });
    });
    // Farba výsledku: režim (podľa témy / biela / vlastná)
    el.resultModeOptions.querySelectorAll(".style-opt").forEach((o) => {
      o.classList.toggle("active", o.getAttribute("data-resultmode") === state.settings.resultMode);
    });
    // Custom swatches zobraziť len pri režime "custom"
    el.resultSwatches.style.display = state.settings.resultMode === "custom" ? "flex" : "none";
    el.resultSwatches.innerHTML = RESULT_COLORS.map((t) =>
      '<div class="swatch' + (state.settings.result === t.id ? " active" : "") + '" data-res="' + t.id + '" title="' + t.label + '" style="background:' + t.val + '"></div>'
    ).join("");
    el.resultSwatches.querySelectorAll(".swatch").forEach((s) => {
      s.addEventListener("click", () => {
        state.settings.result = s.getAttribute("data-res");
        saveSettings(); applyTheme(); renderSettings(); renderMain();
        vibrate(8);
      });
    });
    // Štýl
    el.styleOptions.querySelectorAll(".style-opt").forEach((o) => {
      o.classList.toggle("active", o.getAttribute("data-style") === state.settings.style);
    });
    // Hustota
    el.densityOptions.querySelectorAll(".style-opt").forEach((o) => {
      o.classList.toggle("active", o.getAttribute("data-density") === state.settings.density);
    });
    // Veľkosť čísel
    el.amountOptions.querySelectorAll(".style-opt").forEach((o) => {
      o.classList.toggle("active", o.getAttribute("data-amount") === state.settings.amount);
    });
    // Hrúbka písma
    el.weightOptions.querySelectorAll(".style-opt").forEach((o) => {
      o.classList.toggle("active", o.getAttribute("data-weight") === state.settings.weight);
    });
    // Haptika
    el.hapticsToggle.classList.toggle("on", state.settings.haptics);
    // Prepínač šípok
    el.swapToggle.classList.toggle("on", state.settings.swap);

    // Predvolená zdrojová mena (select)
    el.defaultFromSelect.innerHTML = window.CURRENCIES
      .map((c) => '<option value="' + c.code + '"' +
        (c.code === state.settings.defaultFrom ? " selected" : "") + ">" +
        c.code + " — " + c.name + "</option>")
      .join("");
  }

  // ====== SPIN / BADGE ======
  function setRefreshSpin(on) {
    el.refreshBtn.classList.toggle("spinning", on);
    el.barRefresh.classList.toggle("spinning", on);
  }
  let badgeTimer = null;
  function flashNetBadge(online) {
    // Žiadny vyskakovací badge — stačí informácia dole v lište (rate-info / updated-info)
    // Pri offline len jemne aktualizujeme text v spodnej lište cez renderMain.
  }

  // ====== EVENTY ======
  function bindEvents() {
    // Klávesnica
    el.keypad.querySelectorAll(".key").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        addRipple(e, btn);
        handleKey(btn.getAttribute("data-key"));
      });
    });
    el.swapBtn.addEventListener("click", swap);

    // Sekcie meny (s ripple efektom)
    ["from", "to"].forEach((slot) => {
      const sec = document.querySelector(
        '.currency-section.' + (slot === "from" ? "top-section" : "bottom-section")
      );
      sec.addEventListener("click", (e) => {
        addRipple(e, sec);
        openCurrencySelect(slot);
      });
    });

    // Navigácia (s ripple)
    const rippleClick = (btn, fn) => {
      btn.addEventListener("click", (e) => { addRipple(e, btn); fn(); });
    };
    rippleClick(el.backBtn, () => { vibrate(8); show("main"); });
    rippleClick(el.settingsBack, () => { vibrate(8); show("main"); });
    rippleClick(el.barInfo, () => { vibrate(8); openSettings(); });
    rippleClick(el.barRefresh, async () => { vibrate(10); await refreshRates(); renderMain(); });
    rippleClick(el.refreshBtn, async () => { vibrate(10); await refreshRates(); renderCurrencyList(); renderMain(); });

    // Vyhľadávanie
    el.searchInput.addEventListener("input", renderCurrencyList);

    // Štýly
    el.styleOptions.querySelectorAll(".style-opt").forEach((o) => {
      o.addEventListener("click", () => {
        state.settings.style = o.getAttribute("data-style");
        saveSettings(); applyTheme(); renderSettings(); vibrate(8);
      });
    });
    el.densityOptions.querySelectorAll(".style-opt").forEach((o) => {
      o.addEventListener("click", () => {
        state.settings.density = o.getAttribute("data-density");
        saveSettings(); applyTheme(); renderSettings(); vibrate(8);
      });
    });
    el.amountOptions.querySelectorAll(".style-opt").forEach((o) => {
      o.addEventListener("click", () => {
        state.settings.amount = o.getAttribute("data-amount");
        saveSettings(); applyTheme(); renderSettings(); renderMain(); vibrate(8);
      });
    });
    el.weightOptions.querySelectorAll(".style-opt").forEach((o) => {
      o.addEventListener("click", () => {
        state.settings.weight = o.getAttribute("data-weight");
        saveSettings(); applyTheme(); renderSettings(); renderMain(); vibrate(8);
      });
    });
    el.resultModeOptions.querySelectorAll(".style-opt").forEach((o) => {
      o.addEventListener("click", () => {
        state.settings.resultMode = o.getAttribute("data-resultmode");
        saveSettings(); applyTheme(); renderSettings(); renderMain(); vibrate(8);
      });
    });
    el.hapticsToggle.parentElement.addEventListener("click", () => {
      state.settings.haptics = !state.settings.haptics;
      saveSettings(); renderSettings(); vibrate(15);
    });
    el.swapToggle.parentElement.addEventListener("click", () => {
      state.settings.swap = !state.settings.swap;
      saveSettings(); applyTheme(); renderSettings(); vibrate(12);
    });
    el.defaultFromSelect.addEventListener("change", () => {
      state.settings.defaultFrom = el.defaultFromSelect.value;
      saveSettings(); vibrate(10);
    });

    // Online/offline
    window.addEventListener("online", async () => {
      state.online = true; flashNetBadge(true);
      await refreshRates(); renderMain();
      if (el.currencyScreen.classList.contains("active")) renderCurrencyList();
    });
    window.addEventListener("offline", () => {
      state.online = false; flashNetBadge(false); renderMain();
    });

    // Hardvér back
    document.addEventListener("backbutton", (e) => {
      if (el.currencyScreen.classList.contains("active") || el.settingsScreen.classList.contains("active")) {
        e.preventDefault(); show("main");
      }
    }, false);

    // Aktualizácia kurzov pri návrate z pozadia / opätovnom otvorení appky
    const AppPlugin = (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) || null;
    if (AppPlugin && AppPlugin.addListener) {
      AppPlugin.addListener("appStateChange", async (st) => {
        if (st.isActive) {
          if (navigator.onLine) { await refreshRates(); renderMain(); }
        }
      });
    }
    // Záloha: aktualizácia pri návrate na stránku (visibilitychange)
    document.addEventListener("visibilitychange", async () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        await refreshRates(); renderMain();
      }
    });
  }

  // ====== INIT ======
  async function init() {
    // Pri štarte: najprv posledne použité meny (priorita), inak predvolená
    const last = loadLastCurrencies();
    if (last && window.CURRENCY_MAP[last.from] && window.CURRENCY_MAP[last.to]) {
      state.from = last.from;
      state.to = last.to;
    } else if (state.settings.defaultFrom && window.CURRENCY_MAP[state.settings.defaultFrom]) {
      state.from = state.settings.defaultFrom;
    }
    applyTheme();
    bindEvents();
    // Najprv načítame cache a zobrazíme UI OKAMŽITE (bez čakania na sieť)
    loadCache();
    renderMain();
    // Aktualizácia kurzov na pozadí (nezdržuje štart appky)
    refreshRates().then(() => renderMain());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
