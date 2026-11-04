import { STRINGS, CROPS, WEATHER_CODES } from './i18n.js';

/* =========================================================
   Storage (saved on this phone only)
   ========================================================= */
const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or blocked: app still works for this session */
    }
  },
};

const state = {
  profile: store.get('km_profile', null), // { lang, location:{name,lat,lon}, crops:[...] }
  chat: store.get('km_chat', []), // [{ role, text, hasImage, sources }]
  scans: store.get('km_scans', {}), // { cropId: { issue, severity, ts } }
  weather: null,
  weatherFor: '',
  view: 'home',
  draft: null,
  chatImage: null, // { mimeType, data, url }
  sending: false,
  sessionImages: {}, // chat index -> data URL (not saved, to keep storage small)
};

const $ = (sel) => document.querySelector(sel);
const lang = () => (state.profile?.lang || state.draft?.lang || 'en');
const t = (key) => STRINGS[lang()][key] ?? STRINGS.en[key] ?? key;

function cropName(id, l = lang()) {
  const c = CROPS.find((x) => x.id === id);
  return c ? c[l] : id.charAt(0).toUpperCase() + id.slice(1);
}
function cropEnglish(id) {
  const c = CROPS.find((x) => x.id === id);
  return c ? c.en : id;
}
function apiProfile() {
  const p = state.profile || {};
  const localTime = new Date().toLocaleString('en-GB', { weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: true });
  return { location: p.location?.name || '', crops: (p.crops || []).map(cropEnglish), lang: p.lang || 'en', localTime };
}

/* =========================================================
   Text + language
   ========================================================= */
function applyI18n() {
  document.documentElement.lang = lang();
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const v = t(el.dataset.i18n);
    if (typeof v === 'string') el.textContent = v;
  });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
  document.querySelectorAll('[data-i18n-label]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nLabel));
    el.title = t(el.dataset.i18nLabel);
  });
  $('#setup-done').textContent = state.profile ? t('save') : t('continue');
}

function toggleLang() {
  state.profile.lang = lang() === 'en' ? 'hi' : 'en';
  store.set('km_profile', state.profile);
  applyI18n();
  render();
}

/* =========================================================
   Navigation
   ========================================================= */
function go(view) {
  if (state.locked) view = 'login';
  else if (view !== 'setup' && !state.profile) view = 'setup';
  state.view = view;
  if (view === 'setup') startSetup();
  render();
  window.scrollTo(0, 0);
}

function render() {
  for (const v of ['login', 'setup', 'home', 'chat', 'scan']) $(`#view-${v}`).hidden = v !== state.view;
  $('#tabbar').hidden = !state.profile || state.view === 'login';
  document.querySelectorAll('#tabbar button').forEach((b) => {
    if (b.dataset.go === state.view) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  if (state.view === 'setup') renderSetup();
  if (state.view === 'home') renderHome();
  if (state.view === 'chat') renderChat();
  if (state.view === 'scan') renderScanPick();
}

/* =========================================================
   Setup (first time + "My farm")
   ========================================================= */
function startSetup() {
  const p = state.profile;
  state.draft = p
    ? { lang: p.lang, location: p.location ? { ...p.location } : null, crops: [...p.crops] }
    : { lang: 'en', location: null, crops: [] };
  $('#place-results').replaceChildren();
  $('#setup-error').hidden = true;
}

function renderSetup() {
  const d = state.draft;
  document.querySelectorAll('#lang-picker .option').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === d.lang)));

  const chosen = $('#place-chosen');
  chosen.hidden = !d.location;
  if (d.location) chosen.textContent = `${t('chosen')}: ${d.location.name}`;

  const picker = $('#crop-picker');
  picker.replaceChildren();
  const custom = d.crops.filter((c) => !CROPS.some((x) => x.id === c));
  for (const c of [...CROPS.map((x) => x.id), ...custom]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = cropName(c, d.lang);
    b.setAttribute('aria-pressed', String(d.crops.includes(c)));
    b.addEventListener('click', () => {
      d.crops = d.crops.includes(c) ? d.crops.filter((x) => x !== c) : [...d.crops, c];
      renderSetup();
    });
    picker.append(b);
  }
  const other = document.createElement('button');
  other.type = 'button';
  other.className = 'chip';
  other.textContent = t('other');
  other.addEventListener('click', () => {
    $('#other-crop-form').hidden = false;
    $('#other-crop').focus();
  });
  picker.append(other);
}

function setupError(msg) {
  const el = $('#setup-error');
  el.textContent = msg;
  el.hidden = !msg;
}

async function searchPlaces(name) {
  const list = $('#place-results');
  list.replaceChildren();
  setupError('');
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=en&format=json`;
    const data = await (await fetch(url)).json();
    if (!data.results?.length) return setupError(t('noPlaces'));
    for (const r of data.results) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      const label = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
      b.textContent = label;
      b.addEventListener('click', () => {
        state.draft.location = { name: [r.name, r.admin1].filter(Boolean).join(', '), lat: r.latitude, lon: r.longitude };
        list.replaceChildren();
        renderSetup();
      });
      li.append(b);
      list.append(li);
    }
  } catch {
    setupError(t('netError'));
  }
}

function useMyLocation() {
  if (!navigator.geolocation) return setupError(t('locError'));
  setupError('');
  const btn = $('#use-location span');
  btn.textContent = t('locating');
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      let name = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
      try {
        const r = await (
          await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`)
        ).json();
        const place = r.city || r.locality;
        if (place) name = [place, r.principalSubdivision].filter(Boolean).join(', ');
      } catch {
        /* keep coordinates as the name */
      }
      state.draft.location = { name, lat, lon };
      btn.textContent = t('useMyLocation');
      renderSetup();
    },
    () => {
      btn.textContent = t('useMyLocation');
      setupError(t('locError'));
    },
    { timeout: 15000, maximumAge: 600000 }
  );
}

function finishSetup() {
  const d = state.draft;
  if (!d.location) return setupError(t('needLocation'));
  if (!d.crops.length) return setupError(t('needCrop'));
  const locationChanged = state.profile?.location?.name !== d.location.name;
  state.profile = { lang: d.lang, location: d.location, crops: d.crops };
  store.set('km_profile', state.profile);
  if (locationChanged) state.weather = null;
  applyI18n();
  go('home');
}

/* =========================================================
   Weather (Open-Meteo, free, no key)
   ========================================================= */
async function loadWeather(force = false) {
  const loc = state.profile?.location;
  if (!loc) return null;
  const key = `${loc.lat},${loc.lon}`;
  if (!force && state.weather && state.weatherFor === key) return state.weather;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}` +
    '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max' +
    '&timezone=auto&forecast_days=7';
  const res = await fetch(url);
  if (!res.ok) throw new Error('weather');
  const d = await res.json();
  const cond = (code) => (WEATHER_CODES[code] || ['Unknown', 'अज्ञात', 'cloud'])[0];
  state.weather = {
    current: {
      temp: Math.round(d.current.temperature_2m),
      humidity: d.current.relative_humidity_2m,
      wind: Math.round(d.current.wind_speed_10m),
      code: d.current.weather_code,
      condition: cond(d.current.weather_code),
    },
    daily: d.daily.time.map((date, i) => ({
      date,
      code: d.daily.weather_code[i],
      condition: cond(d.daily.weather_code[i]),
      max: Math.round(d.daily.temperature_2m_max[i]),
      min: Math.round(d.daily.temperature_2m_min[i]),
      rainMm: Math.round((d.daily.precipitation_sum[i] ?? 0) * 10) / 10,
      rainChance: d.daily.precipitation_probability_max?.[i] ?? null,
      wind: Math.round(d.daily.wind_speed_10m_max[i]),
    })),
  };
  state.weatherFor = key;
  return state.weather;
}

const ICONS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  partly: '<circle cx="9" cy="9" r="3.5"/><path d="M9 2.5v1.5M3.5 9H2M4.8 4.8l1 1M13.2 4.8l-1 1"/><path d="M8 20h9a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6 1.6A2.7 2.7 0 0 0 8 20z"/>',
  cloud: '<path d="M7 19h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 2A3 3 0 0 0 7 19z"/>',
  rain: '<path d="M7 15h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 2A3 3 0 0 0 7 15z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
  storm: '<path d="M7 14h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 2A3 3 0 0 0 7 14z"/><path d="M12 14l-2 4h4l-2 4"/>',
  fog: '<path d="M4 9h16M4 13h16M6 17h12"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/>',
};
const iconFor = (code) => ICONS[(WEATHER_CODES[code] || [0, 0, 'cloud'])[2]];

function dayLabel(i, date) {
  if (i === 0) return t('todayWord');
  if (i === 1) return t('tomorrowWord');
  return t('days')[new Date(`${date}T12:00:00`).getDay()];
}

// Simple farm rules on top of the forecast (same rules as the irrigation guide).
function buildAdvice(w) {
  const tips = [];
  const days = w.daily.slice(0, 3);
  const rainDay = days.findIndex((d) => d.rainMm >= 5);
  if (rainDay >= 0) tips.push(['warn', ...t('adv_rain')(dayLabel(rainDay, days[rainDay].date), Math.round(days[rainDay].rainMm))]);
  const windDay = days.findIndex((d) => d.wind >= 20);
  if (windDay >= 0) tips.push(['warn', ...t('adv_wind')(dayLabel(windDay, days[windDay].date))]);
  if (w.current.humidity >= 80 && w.current.temp >= 18 && w.current.temp <= 32) tips.push(['warn', ...t('adv_fungal')]);
  const hotDay = days.findIndex((d) => d.max >= 38);
  if (hotDay >= 0) tips.push(['warn', ...t('adv_heat')(dayLabel(hotDay, days[hotDay].date), days[hotDay].max)]);
  const coldDay = days.findIndex((d) => d.min <= 4);
  if (coldDay >= 0) tips.push(['warn', ...t('adv_cold')(dayLabel(coldDay, days[coldDay].date), days[coldDay].min)]);
  const sprayDay = w.daily.slice(0, 4).findIndex((d, i, arr) => d.rainMm < 1 && d.wind < 15 && (arr[i + 1]?.rainMm ?? 0) < 5);
  if (sprayDay >= 0) tips.push(['good', ...t('adv_spray')(dayLabel(sprayDay, w.daily[sprayDay].date))]);
  if (!tips.length) tips.push(['good', ...t('adv_good')]);
  return tips.slice(0, 3);
}

/* =========================================================
   Home
   ========================================================= */
async function renderHome() {
  const p = state.profile;
  $('#home-place').textContent = p.location.name;
  renderCropList();
  const card = $('#weather-card');
  const advice = $('#advice');
  if (!state.weather) {
    card.innerHTML = `<div class="weather-loading">${t('loadingWeather')}</div>`;
    advice.hidden = true;
  }
  try {
    const w = await loadWeather();
    if (state.view !== 'home') return;
    renderWeather(w);
  } catch {
    card.innerHTML = '';
    const msg = document.createElement('div');
    msg.textContent = t('weatherError');
    const retry = document.createElement('button');
    retry.className = 'btn-small';
    retry.type = 'button';
    retry.textContent = t('retry');
    retry.addEventListener('click', renderHome);
    card.append(msg, retry);
  }
}

function renderWeather(w) {
  const l = lang() === 'hi' ? 1 : 0;
  const condText = (code) => (WEATHER_CODES[code] || ['Unknown', 'अज्ञात'])[l];
  const today = w.daily[0];
  const days = w.daily
    .slice(1, 6)
    .map(
      (d) =>
        `<div class="w-day"><span class="d">${t('days')[new Date(`${d.date}T12:00:00`).getDay()]}</span>` +
        `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${iconFor(d.code)}</svg>` +
        `<span class="t">${d.max}°</span><span class="r">${d.rainChance ?? 0}%</span></div>`
    )
    .join('');
  // All values here are numbers from the weather API or our own strings, so innerHTML is safe.
  $('#weather-card').innerHTML = `
    <div class="w-top">
      <div class="w-now">
        <span class="small" style="opacity:.88">${t('rightNow')}</span>
        <span class="w-temp">${w.current.temp}°</span>
        <span class="w-cond">${condText(w.current.code)}</span>
      </div>
      <svg class="w-icon" viewBox="0 0 24 24" aria-hidden="true">${iconFor(w.current.code)}</svg>
    </div>
    <div class="w-stats">
      <div class="w-stat"><span>${t('humidity')}</span><span>${w.current.humidity}%</span></div>
      <div class="w-stat"><span>${t('wind')}</span><span>${w.current.wind} km/h</span></div>
      <div class="w-stat"><span>${t('rainToday')}</span><span>${today.rainChance ?? 0}%</span></div>
    </div>
    <div class="w-days">${days}</div>`;

  const advice = $('#advice');
  advice.replaceChildren();
  for (const [kind, title, body] of buildAdvice(w)) {
    const tip = document.createElement('div');
    tip.className = `tip ${kind}`;
    tip.innerHTML =
      kind === 'warn'
        ? '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/></svg>'
        : '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>';
    const txt = document.createElement('div');
    const s = document.createElement('strong');
    s.textContent = title;
    const sp = document.createElement('span');
    sp.textContent = body;
    txt.append(s, sp);
    tip.append(txt);
    advice.append(tip);
  }
  advice.hidden = false;
}

function renderCropList() {
  const list = $('#crop-list');
  list.replaceChildren();
  for (const c of state.profile.crops) {
    const row = document.createElement('div');
    row.className = 'crop-row';
    const info = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = cropName(c);
    const sub = document.createElement('span');
    sub.className = 'small muted';
    const scan = state.scans[c];
    sub.textContent = scan ? `${t('lastScan')}: ${scan.issue} · ${timeAgo(scan.ts)}` : t('noScanYet');
    info.append(name, sub);
    row.append(info);
    if (scan) {
      const badge = document.createElement('span');
      badge.className = `badge ${scan.severity}`;
      badge.textContent = t(`sev_${scan.severity}`);
      row.append(badge);
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-small';
    btn.textContent = t('scan');
    btn.addEventListener('click', () => {
      resetScan();
      go('scan');
      $('#scan-crop').value = c;
    });
    row.append(btn);
    list.append(row);
  }
}

function timeAgo(ts) {
  const days = Math.floor((Date.now() - ts) / 86400000);
  const rtf = new Intl.RelativeTimeFormat(lang() === 'hi' ? 'hi' : 'en', { numeric: 'auto' });
  if (days < 1) {
    const hours = Math.floor((Date.now() - ts) / 3600000);
    return rtf.format(-Math.max(hours, 0), 'hour');
  }
  return rtf.format(-days, 'day');
}

/* =========================================================
   API helper
   ========================================================= */
async function postJSON(url, body) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && data.needLogin) {
      state.locked = true;
      go('login');
    }
    if (!res.ok) throw new Error(data.error || t('netError'));
    return data;
  } catch (err) {
    if (err.name === 'AbortError' || err instanceof TypeError) throw new Error(t('netError'));
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/* =========================================================
   Photos: shrink before sending (faster + stays in free limits)
   ========================================================= */
async function compressImage(file, maxSide = 1024) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    return { mimeType: 'image/jpeg', data: dataUrl.split(',')[1], url: dataUrl };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* =========================================================
   Chat
   ========================================================= */
function splitSources(text) {
  // Make sure a "Source:" glued to the end of a sentence gets its own line.
  const lines = String(text)
    .replace(/\*\*/g, '')
    .replace(/^#+\s*/gm, '')
    .replace(/([^\n])\s*((?:Sources?|स्रोत)\s*[:：])/g, '$1\n$2')
    .split('\n');
  const body = [];
  const sources = [];
  for (const line of lines) {
    const m = line.match(/^\s*(source|sources|स्रोत)\s*[:：]\s*(.+)$/i);
    if (m) sources.push(m[2].trim());
    else body.push(line);
  }
  return { body: body.join('\n').trim(), sources };
}

function messageEl(m, index) {
  const el = document.createElement('div');
  el.className = `msg ${m.role === 'user' ? 'user' : m.error ? 'err' : 'bot'}`;
  if (m.hasImage) {
    const src = state.sessionImages[index];
    if (src) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = t('photoSent');
      el.append(img);
    } else {
      const note = document.createElement('span');
      note.className = 'photo-note';
      note.textContent = `[${t('photoSent')}]`;
      el.append(note);
    }
  }
  if (m.role === 'assistant' && !m.error) {
    const { body, sources } = splitSources(m.text);
    el.append(document.createTextNode(body));
    if (sources.length) {
      const s = document.createElement('span');
      s.className = 'sources';
      s.textContent = `${t('source')}: ${sources.join(' · ')}`;
      el.append(s);
    }
  } else {
    el.append(document.createTextNode(m.text));
  }
  return el;
}

function renderChat() {
  const box = $('#messages');
  box.replaceChildren();
  if (!state.chat.length) {
    const w = document.createElement('div');
    w.className = 'welcome';
    const h = document.createElement('h2');
    h.className = 'display';
    h.textContent = t('welcomeTitle');
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = t('welcomeSub');
    const sug = document.createElement('div');
    sug.className = 'suggestions';
    const firstCrop = cropName(state.profile.crops[0] || 'tomato');
    for (const q of t('suggestions')(lang() === 'en' ? firstCrop.toLowerCase() : firstCrop)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'suggestion';
      b.textContent = q;
      b.addEventListener('click', () => sendMessage(q));
      sug.append(b);
    }
    w.append(h, p, sug);
    box.append(w);
  }
  state.chat.forEach((m, i) => box.append(messageEl(m, i)));
  if (state.sending) {
    const typing = document.createElement('div');
    typing.className = 'msg bot';
    typing.innerHTML = '<span class="typing" aria-label="…"><i></i><i></i><i></i></span>';
    box.append(typing);
  }
  $('#send-btn').disabled = state.sending;
  box.scrollTop = box.scrollHeight;
}

function saveChat() {
  // Keep the last 40 messages, text only.
  state.chat = state.chat.slice(-40);
  store.set(
    'km_chat',
    state.chat.filter((m) => !m.error).map(({ role, text, hasImage }) => ({ role, text, hasImage }))
  );
}

async function sendMessage(text) {
  text = (text || '').trim();
  const image = state.chatImage;
  if ((!text && !image) || state.sending) return;

  state.chat = state.chat.filter((m) => !m.error);
  const userMsg = { role: 'user', text, hasImage: !!image };
  state.chat.push(userMsg);
  if (image) state.sessionImages[state.chat.length - 1] = image.url;
  clearAttachment();
  $('#chat-input').value = '';
  autoGrow();
  state.sending = true;
  renderChat();
  saveChat();

  const history = state.chat.map((m, i) => ({
    role: m.role,
    text: m.text,
    ...(i === state.chat.length - 1 && image ? { image: { mimeType: image.mimeType, data: image.data } } : {}),
  }));

  try {
    const data = await postJSON('/api/chat', { messages: history, profile: apiProfile(), weather: state.weather });
    state.chat.push({ role: 'assistant', text: data.reply });
    saveChat();
  } catch (err) {
    state.chat.push({ role: 'assistant', text: err.message, error: true });
  } finally {
    state.sending = false;
    if (state.view === 'chat') renderChat();
  }
}

function clearAttachment() {
  state.chatImage = null;
  $('#attach-preview').hidden = true;
  $('#chat-file').value = '';
}

function autoGrow() {
  const ta = $('#chat-input');
  ta.style.height = 'auto';
  ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
}

function setupVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  const btn = $('#mic-btn');
  btn.hidden = false;
  let rec = null;
  btn.addEventListener('click', () => {
    if (rec) return rec.stop();
    rec = new SR();
    rec.lang = lang() === 'hi' ? 'hi-IN' : 'en-IN';
    rec.interimResults = false;
    rec.onresult = (e) => {
      const said = Array.from(e.results).map((r) => r[0].transcript).join(' ');
      const ta = $('#chat-input');
      ta.value = `${ta.value} ${said}`.trim();
      autoGrow();
    };
    rec.onend = () => {
      rec = null;
      btn.classList.remove('listening');
    };
    rec.onerror = rec.onend;
    btn.classList.add('listening');
    rec.start();
  });
}

/* =========================================================
   Scan
   ========================================================= */
function renderScanPick() {
  if (!$('#scan-result').hidden) return; // showing a result
  const sel = $('#scan-crop');
  const current = sel.value;
  sel.replaceChildren();
  for (const c of state.profile.crops) sel.append(new Option(cropName(c), c));
  sel.append(new Option(t('notSure'), ''));
  if ([...sel.options].some((o) => o.value === current)) sel.value = current;
}

let lastScanImage = null;

async function runScan(file) {
  let image;
  try {
    image = await compressImage(file);
  } catch {
    alertInline(t('imgError'));
    return;
  }
  lastScanImage = image;
  const cropId = $('#scan-crop').value;
  $('#scan-pick').hidden = true;
  $('#scan-result').hidden = false;
  $('#scan-img').src = image.url;
  $('#scan-img').alt = cropId ? cropName(cropId) : '';
  const sheet = $('#scan-sheet');
  sheet.innerHTML = `<div class="scanning"><div class="spinner" aria-hidden="true"></div><strong>${t('analyzing')}</strong><span class="small muted">${t('analyzingSub')}</span></div>`;

  try {
    const data = await postJSON('/api/scan', {
      image: { mimeType: image.mimeType, data: image.data },
      crop: cropId ? cropEnglish(cropId) : '',
      profile: apiProfile(),
      weather: state.weather,
    });
    renderScanResult(data.result, data.source, cropId);
  } catch (err) {
    sheet.replaceChildren();
    const h = document.createElement('h2');
    h.className = 'display';
    h.textContent = t('scanError');
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = err.message;
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'btn-primary';
    retry.textContent = t('tryAgain');
    retry.addEventListener('click', () => runScan(file));
    sheet.append(h, p, retry, closeScanButton());
  }
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function closeScanButton() {
  const b = el('button', 'btn-outline', t('scanAnother'));
  b.type = 'button';
  b.addEventListener('click', resetScan);
  return b;
}

function renderScanResult(r, source, cropId) {
  const sheet = $('#scan-sheet');
  sheet.replaceChildren();

  if (!r.isPlant) {
    sheet.append(el('h2', 'display', t('notPlant')), el('p', 'muted', t('notPlantSub')), closeScanButton());
    return;
  }

  const meta = el('div', 'sheet-meta');
  meta.append(el('span', `badge ${r.severity}`, t(`sev_${r.severity}`)), el('span', 'small muted', `${t('confidence')}: ${t(`conf_${r.confidence}`)}`));

  const titleWrap = el('div');
  titleWrap.style.cssText = 'display:flex;flex-direction:column;gap:4px';
  const sub = el('span', 'muted');
  sub.append(document.createTextNode(r.plant));
  if (r.scientificName) {
    sub.append(document.createTextNode(' · '));
    sub.append(el('span', 'sci', r.scientificName));
  }
  titleWrap.append(el('h2', 'display', r.issue), sub);

  const steps = el('div', 'card');
  steps.append(el('strong', '', t('treatment')));
  r.steps.forEach((s, i) => {
    const row = el('div', 'step');
    row.append(el('span', 'n', String(i + 1)), el('span', '', s));
    steps.append(row);
  });

  const extra = el('div', 'card');
  extra.append(el('strong', '', t('prevention')), el('span', '', r.prevention));
  if (r.weatherNote) extra.append(el('strong', '', t('weatherNote')), el('span', '', r.weatherNote));

  const buttons = el('div', 'grid2');
  const follow = el('button', 'btn-primary', t('followUp'));
  follow.type = 'button';
  follow.addEventListener('click', () => {
    state.chat.push({ role: 'user', text: t('scannedContext')(r), hasImage: true });
    state.sessionImages[state.chat.length - 1] = lastScanImage?.url;
    state.chat.push({ role: 'assistant', text: t('scanBotIntro')(r) + (source ? `\nSource: ${source.title}` : '') });
    saveChat();
    resetScan();
    go('chat');
    $('#chat-input').focus();
  });
  buttons.append(follow, closeScanButton());

  sheet.append(meta, titleWrap, el('p', '', r.description), steps, extra);
  if (source) sheet.append(el('span', 'small muted', `${t('source')}: ${source.title}`));
  sheet.append(buttons, el('p', 'disclaimer', t('scanDisclaimer')));

  const key = cropId || r.plant.toLowerCase();
  if (state.profile.crops.includes(key)) {
    state.scans[key] = { issue: r.issue, severity: r.severity, ts: Date.now() };
    store.set('km_scans', state.scans);
  }
}

function resetScan() {
  $('#scan-result').hidden = true;
  $('#scan-pick').hidden = false;
  $('#scan-file').value = '';
  $('#scan-gallery').value = '';
  renderScanPick();
}

function alertInline(msg) {
  const p = el('p', 'error', msg);
  $('#scan-pick').append(p);
  setTimeout(() => p.remove(), 5000);
}

/* =========================================================
   Wire up events
   ========================================================= */
document.addEventListener('click', (e) => {
  const goBtn = e.target.closest('[data-go]');
  if (goBtn) {
    if (goBtn.dataset.go === 'scan') resetScan();
    go(goBtn.dataset.go);
  }
  if (e.target.closest('[data-action="toggle-lang"]')) toggleLang();
});

document.querySelectorAll('#lang-picker .option').forEach((b) =>
  b.addEventListener('click', () => {
    state.draft.lang = b.dataset.lang;
    if (state.profile) state.profile.lang = b.dataset.lang;
    applyI18n();
    renderSetup();
  })
);
$('#use-location').addEventListener('click', useMyLocation);
$('#place-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = $('#place-input').value.trim();
  if (q) searchPlaces(q);
});
$('#other-crop-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = $('#other-crop').value.trim().toLowerCase().slice(0, 30);
  if (v && !state.draft.crops.includes(v)) state.draft.crops.push(v);
  $('#other-crop').value = '';
  $('#other-crop-form').hidden = true;
  renderSetup();
});
$('#setup-done').addEventListener('click', finishSetup);

$('#composer').addEventListener('submit', (e) => {
  e.preventDefault();
  sendMessage($('#chat-input').value);
});
$('#chat-input').addEventListener('input', autoGrow);
$('#chat-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    sendMessage(e.target.value);
  }
});
$('#chat-file').addEventListener('change', async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  try {
    state.chatImage = await compressImage(f);
    $('#attach-img').src = state.chatImage.url;
    $('#attach-preview').hidden = false;
  } catch {
    state.chat.push({ role: 'assistant', text: t('imgError'), error: true });
    renderChat();
  }
});
$('#remove-attach').addEventListener('click', clearAttachment);
$('#clear-chat').addEventListener('click', () => {
  state.chat = [];
  state.sessionImages = {};
  saveChat();
  renderChat();
});

for (const id of ['#scan-file', '#scan-gallery']) {
  $(id).addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    if (f) runScan(f);
  });
}
$('#scan-close').addEventListener('click', resetScan);

setupVoice();
/* ---------- password gate ---------- */
$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#login-btn');
  const err = $('#login-error');
  err.hidden = true;
  btn.disabled = true;
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: $('#login-password').value }),
    });
    if (!res.ok) {
      err.textContent = res.status === 401 ? t('wrongPassword') : t('netError');
      err.hidden = false;
      return;
    }
    state.locked = false;
    $('#login-password').value = '';
    go(state.profile ? 'home' : 'setup');
  } catch {
    err.textContent = t('netError');
    err.hidden = false;
  } finally {
    btn.disabled = false;
  }
});

async function boot() {
  applyI18n();
  try {
    const s = await (await fetch('/api/login')).json();
    state.locked = s.required && !s.authed;
  } catch {
    state.locked = false; // offline: the API calls will ask again if needed
  }
  go(state.profile ? 'home' : 'setup');
}
boot();
