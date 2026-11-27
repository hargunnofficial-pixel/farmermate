import { STRINGS, CROPS, WEATHER_CODES } from './i18n.js';
import { CROP_DATA, STAGES, THREATS, STAGE_TASKS } from './engine/crops.js';
import { farmInsights, sprayWindow } from './engine/brain.js';
import { STATION, fetchReadings, fetchStationForecast, stationStatus, stationRisk, compareForecast, stationSummary } from './engine/station.js';

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
      return true;
    } catch {
      return false; // storage full or blocked: the app still works for this session
    }
  },
};

const state = {
  profile: store.get('km_profile', null), // { lang, location:{name,lat,lon}, crops:[ids], sown:{cropId:'YYYY-MM-DD'} }
  chat: store.get('km_chat', []), // [{ role, text, hasImage }]
  log: store.get('km_log', []), // scan history, newest first: [{ id, ts, crop, result, source, thumb }]
  checks: store.get('km_checks', {}), // ticked stage tasks: { 'tomato:peak': [true,false,...] }
  theme: store.get('km_theme', 'auto'),
  weather: null,
  weatherFor: '',
  weatherStale: false,
  view: 'home',
  cropId: null,
  draft: null,
  chatImage: null, // { mimeType, data, url }
  sending: false,
  sessionImages: {}, // chat index -> data URL (not saved, to keep storage small)
  station: null, // { readings, at } live sensor readings from the field station
  stationForecast: null, // forecast for the station's own location, to compare with
  stationError: false,
  fieldMetric: 'rh',
  fieldRange: 24,
};
if (state.profile && !state.profile.sown) state.profile.sown = {};

/* =========================================================
   Small helpers
   ========================================================= */
const $ = (sel) => document.querySelector(sel);
const lang = () => state.profile?.lang || state.draft?.lang || 'en';
const t = (key) => STRINGS[lang()][key] ?? STRINGS.en[key] ?? key;

/** Build a DOM element: h('div', { class: 'x', onclick: fn }, child, 'text') */
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'style') e.style.cssText = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid);
  return e;
}

// Icons are fixed strings written here (never user text), so innerHTML is safe for them.
const ICON = {
  warn: '<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
  check: '<path d="M5 13l4 4L19 7"/>',
  drop: '<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/>',
  spray: '<path d="M9 9h5v11H9z"/><path d="M9 9V6h4l2-2M17 4h3M17 7h3M17 10h2"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  sound: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M17 9a4 4 0 0 1 0 6"/>',
  stop: '<rect x="7" y="7" width="10" height="10" rx="2"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  scan: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/>',
  bug: '<ellipse cx="12" cy="13" rx="5" ry="6"/><path d="M12 7V4M5 9l2.500 2M19 9l-2.500 2M4 15h3M17 15h3M9 4l1.500 2M15 4l-1.500 2"/>',
};
function icon(name, cls = 'ic') {
  const span = document.createElement('span');
  span.innerHTML = `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name]}</svg>`;
  return span.firstChild;
}

function cropInfo(id) {
  return CROPS.find((x) => x.id === id);
}
function cropName(id, l = lang()) {
  const c = cropInfo(id);
  return c ? c[l] : id.charAt(0).toUpperCase() + id.slice(1);
}
const cropEnglish = (id) => cropInfo(id)?.en || id;
const cropEmoji = (id) => cropInfo(id)?.emoji || '🌱';
const stageName = (index, l = lang()) => STAGES[index][l];
const threatName = (id, l = lang()) => THREATS[id][l];

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2200);
}

/* ---------- time on the farm (the phone may be in another time zone) ---------- */
function farmNowISO() {
  const offsetMs = state.weather ? state.weather.utcOffset * 1000 : -new Date().getTimezoneOffset() * 60000;
  return new Date(Date.now() + offsetMs).toISOString().slice(0, 16); // 'YYYY-MM-DDTHH:MM'
}
const farmToday = () => farmNowISO().slice(0, 10);
const farmHour = () => Number(farmNowISO().slice(11, 13));

function dayWord(offset, dateISO) {
  if (offset === 0) return t('todayWord');
  if (offset === 1) return t('tomorrowWord');
  return t('days')[new Date(`${dateISO}T12:00:00`).getDay()];
}
function timeLabel(hour) {
  const h12 = hour % 12 || 12;
  return lang() === 'hi' ? `${hour < 12 ? t('am') : t('pm')} ${h12} बजे` : `${h12} ${hour < 12 ? t('am') : t('pm')}`;
}
function timeAgo(ts) {
  const rtf = new Intl.RelativeTimeFormat(lang() === 'hi' ? 'hi' : 'en', { numeric: 'auto' });
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 60) return rtf.format(-Math.max(mins, 0), 'minute');
  if (mins < 1440) return rtf.format(-Math.floor(mins / 60), 'hour');
  return rtf.format(-Math.floor(mins / 1440), 'day');
}

/* =========================================================
   Text, language, theme
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
  stopSpeaking();
  applyI18n();
  render();
}

function applyTheme() {
  const root = document.documentElement;
  if (state.theme === 'auto') delete root.dataset.theme;
  else root.dataset.theme = state.theme;
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
  document.querySelector('meta[name="theme-color"]').content = bg || '#F4F2E9';
  document.querySelectorAll('#theme-picker .option').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeOpt === state.theme)));
}

/* =========================================================
   Navigation
   ========================================================= */
const VIEWS = ['login', 'setup', 'home', 'field', 'crops', 'crop', 'chat', 'scan'];

function go(view, opts = {}) {
  if (state.locked) view = 'login';
  else if (view !== 'setup' && !state.profile) view = 'setup';
  if (view === 'crop') state.cropId = opts.crop;
  stopSpeaking();
  state.view = view;
  if (view === 'setup') startSetup();
  render();
  window.scrollTo(0, 0);
}

function render() {
  for (const v of VIEWS) $(`#view-${v}`).hidden = v !== state.view;
  $('#tabbar').hidden = !state.profile || state.view === 'login';
  const tab = state.view === 'crop' ? 'crops' : state.view === 'field' ? 'home' : state.view;
  document.querySelectorAll('#tabbar button').forEach((b) => {
    if (b.dataset.go === tab) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  if (state.view === 'setup') renderSetup();
  if (state.view === 'home') renderHome();
  if (state.view === 'field') renderField();
  if (state.view === 'crops') renderCrops();
  if (state.view === 'crop') renderCrop();
  if (state.view === 'chat') renderChat();
  if (state.view === 'scan') renderScanPick();
}

/* =========================================================
   Setup (first time + "My farm")
   ========================================================= */
function startSetup() {
  const p = state.profile;
  state.draft = p
    ? { lang: p.lang, location: p.location ? { ...p.location } : null, crops: [...p.crops], sown: { ...p.sown } }
    : { lang: 'en', location: null, crops: [], sown: {} };
  $('#place-results').replaceChildren();
  $('#setup-error').hidden = true;
}

function renderSetup() {
  const d = state.draft;
  document.querySelectorAll('#lang-picker .option').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === d.lang)));
  applyTheme();
  $('#about').hidden = !state.profile;

  const chosen = $('#place-chosen');
  chosen.hidden = !d.location;
  if (d.location) chosen.textContent = `${t('chosen')}: ${d.location.name}`;

  const picker = $('#crop-picker');
  picker.replaceChildren();
  const custom = d.crops.filter((c) => !cropInfo(c));
  for (const c of [...CROPS.map((x) => x.id), ...custom]) {
    picker.append(
      h('button', {
        type: 'button', class: 'chip', 'aria-pressed': String(d.crops.includes(c)),
        onclick: () => {
          d.crops = d.crops.includes(c) ? d.crops.filter((x) => x !== c) : [...d.crops, c];
          renderSetup();
        },
      }, h('span', { 'aria-hidden': 'true' }, cropEmoji(c)), cropName(c, d.lang))
    );
  }
  picker.append(
    h('button', {
      type: 'button', class: 'chip',
      onclick: () => {
        $('#other-crop-form').hidden = false;
        $('#other-crop').focus();
      },
    }, t('other'))
  );

  // Sowing dates, only for crops FarmerMate has growth data for.
  const dated = d.crops.filter((c) => CROP_DATA[c]);
  $('#sow-field').hidden = !dated.length;
  const list = $('#sow-list');
  list.replaceChildren();
  for (const c of dated) {
    const id = `sow-${c}`;
    list.append(
      h('div', { class: 'sow-row' },
        h('label', { for: id }, `${cropEmoji(c)} ${cropName(c, d.lang)}`),
        h('input', {
          id, type: 'date', class: 'input', value: d.sown[c] || '', max: farmToday(),
          onchange: (e) => {
            if (e.target.value) d.sown[c] = e.target.value;
            else delete d.sown[c];
          },
        })
      )
    );
  }
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
      list.append(
        h('li', null,
          h('button', {
            type: 'button',
            onclick: () => {
              state.draft.location = { name: [r.name, r.admin1].filter(Boolean).join(', '), lat: r.latitude, lon: r.longitude };
              list.replaceChildren();
              renderSetup();
            },
          }, [r.name, r.admin1, r.country].filter(Boolean).join(', '))
        )
      );
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

function saveProfile() {
  store.set('km_profile', state.profile);
}

function finishSetup() {
  const d = state.draft;
  if (!d.location) return setupError(t('needLocation'));
  if (!d.crops.length) return setupError(t('needCrop'));
  const locationChanged = state.profile?.location?.name !== d.location.name;
  const sown = Object.fromEntries(Object.entries(d.sown).filter(([c]) => d.crops.includes(c)));
  state.profile = { lang: d.lang, location: d.location, crops: d.crops, sown };
  saveProfile();
  if (locationChanged) state.weather = null;
  applyI18n();
  go('home');
}

/* =========================================================
   Weather (Open-Meteo, free, no key)
   ========================================================= */
async function loadWeather() {
  const loc = state.profile?.location;
  if (!loc) return null;
  const key = `${loc.lat},${loc.lon}`;
  // Fresh enough? Reuse what we have for 30 minutes.
  if (state.weather && state.weatherFor === key && !state.weatherStale && Date.now() - state.weather.at < 30 * 60000) return state.weather;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}` +
    '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day' +
    '&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration' +
    '&timezone=auto&forecast_days=7';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('weather');
    const d = await res.json();
    const cond = (code) => (WEATHER_CODES[code] || ['Unknown'])[0];
    state.weather = {
      at: Date.now(),
      utcOffset: d.utc_offset_seconds || 0,
      current: {
        temp: Math.round(d.current.temperature_2m),
        humidity: d.current.relative_humidity_2m,
        wind: Math.round(d.current.wind_speed_10m),
        code: d.current.weather_code,
        condition: cond(d.current.weather_code),
        isDay: d.current.is_day !== 0,
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
        et0: d.daily.et0_fao_evapotranspiration?.[i] ?? null,
      })),
      hourly: {
        time: d.hourly.time,
        temp: d.hourly.temperature_2m,
        rh: d.hourly.relative_humidity_2m,
        rain: d.hourly.precipitation,
        wind: d.hourly.wind_speed_10m,
      },
    };
    state.weatherFor = key;
    state.weatherStale = false;
    store.set('km_weather', { key, data: state.weather });
    return state.weather;
  } catch (err) {
    // No internet: fall back to the last forecast saved on this phone (up to 2 days old).
    const saved = store.get('km_weather', null);
    if (saved?.key === key && Date.now() - saved.data.at < 48 * 3600000) {
      state.weather = saved.data;
      state.weatherFor = key;
      state.weatherStale = true;
      return state.weather;
    }
    throw err;
  }
}

const W_ICONS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.900 4.900l1.400 1.400M17.700 17.700l1.400 1.400M4.900 19.100l1.400-1.400M17.700 6.300l1.400-1.400"/>',
  moon: '<path d="M20 14.500A8 8 0 0 1 9.500 4a8 8 0 1 0 10.500 10.500z"/>',
  partly: '<circle cx="9" cy="9" r="3.500"/><path d="M9 2.500v1.500M3.500 9H2M4.800 4.800l1 1M13.200 4.800l-1 1"/><path d="M8 20h9a3.500 3.500 0 0 0 0-7 5 5 0 0 0-9.600 1.600A2.700 2.700 0 0 0 8 20z"/>',
  cloud: '<path d="M7 19h10a4 4 0 0 0 0-8 6 6 0 0 0-11.500 2A3 3 0 0 0 7 19z"/>',
  rain: '<path d="M7 15h10a4 4 0 0 0 0-8 6 6 0 0 0-11.500 2A3 3 0 0 0 7 15z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
  storm: '<path d="M7 14h10a4 4 0 0 0 0-8 6 6 0 0 0-11.500 2A3 3 0 0 0 7 14z"/><path d="M12 14l-2 4h4l-2 4"/>',
  fog: '<path d="M4 9h16M4 13h16M6 17h12"/>',
  snow: '<path d="M12 3v18M4.200 7.500l15.600 9M4.200 16.500l15.600-9"/>',
};
const iconKey = (code) => (WEATHER_CODES[code] || [0, 0, 'cloud'])[2];

/* =========================================================
   The farm brain: insights for the screens and for the AI
   ========================================================= */
function insights() {
  if (!state.weather || !state.profile) return [];
  return farmInsights(state.profile, state.weather, farmToday());
}

// What the app sends to the AI (always in English).
function insightsPayload() {
  if (!state.weather) return {};
  const list = insights().map((x) => {
    const top = x.risk.top;
    return {
      crop: cropEnglish(x.crop),
      ...(x.stage ? { stage: stageName(x.stage.index, 'en'), day: x.stage.day, daysLeft: x.stage.daysLeft } : {}),
      ...(x.water ? { needMm: x.water.needMm, flooded: x.flooded } : {}),
      ...(top ? { threat: threatName(top.id, 'en'), level: ['', 'medium', 'high'][top.peak], when: dayWordEn(top.peakDay, x.risk.days[top.peakDay].date) } : {}),
    };
  });
  const s = sprayWindow(state.weather, farmNowISO());
  return { insights: list, spray: s ? `${dayWordEn(s.dayOffset, s.date)} at ${s.hour}:00` : 'no good window in the next 3 days' };
}
function dayWordEn(offset, dateISO) {
  if (offset === 0) return 'today';
  if (offset === 1) return 'tomorrow';
  return `on ${new Date(`${dateISO}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long' })}`;
}

function apiProfile() {
  const p = state.profile || {};
  const localTime = new Date(`${farmNowISO()}:00`).toLocaleString('en-GB', { weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: true });
  return { location: p.location?.name || '', crops: (p.crops || []).map(cropEnglish), lang: p.lang || 'en', localTime };
}
function apiContext() {
  const w = state.weather;
  return { profile: apiProfile(), weather: w ? { current: w.current, daily: w.daily } : null, ...insightsPayload(), station: stationPayload() };
}

/** The short list at the top of Home: what matters today, most urgent first. */
function buildPriorities(w, ins) {
  const list = [];
  const L = t('riskLevels');

  // 1. Disease or pest risk in the next 3 days
  ins
    .filter((x) => x.risk.top && x.risk.top.peakDay <= 2)
    .sort((a, b) => b.risk.top.peak - a.risk.top.peak || a.risk.top.peakDay - b.risk.top.peakDay)
    .slice(0, 2)
    .forEach((x) => {
      const top = x.risk.top;
      const [title, body] = t('pri_risk')(L[top.peak], threatName(top.id), cropName(x.crop), dayWord(top.peakDay, x.risk.days[top.peakDay].date));
      list.push({ kind: top.peak === 2 ? 'alert' : 'warn', icon: 'bug', title, body, crop: x.crop });
    });

  // 2. Weather warnings
  const days = w.daily.slice(0, 3);
  const rainDay = days.findIndex((d) => d.rainMm >= 5);
  if (rainDay >= 0) list.push({ kind: 'warn', icon: 'warn', text: t('adv_rain')(dayWord(rainDay, days[rainDay].date), Math.round(days[rainDay].rainMm)) });
  const hotDay = days.findIndex((d) => d.max >= 38);
  if (hotDay >= 0) list.push({ kind: 'warn', icon: 'warn', text: t('adv_heat')(dayWord(hotDay, days[hotDay].date), days[hotDay].max) });
  const coldDay = days.findIndex((d) => d.min <= 4);
  if (coldDay >= 0) list.push({ kind: 'warn', icon: 'warn', text: t('adv_cold')(dayWord(coldDay, days[coldDay].date), days[coldDay].min) });

  // 3. Water: the thirstiest crop
  const watered = ins.filter((x) => x.water && !x.flooded);
  if (watered.length) {
    const most = watered.reduce((a, b) => (b.water.needMm > a.water.needMm ? b : a));
    if (most.water.needMm >= 3) {
      const [title, body] = t('pri_water')(cropName(most.crop), Math.round(most.water.needMm));
      list.push({ kind: 'water', icon: 'drop', title, body, crop: most.crop });
    } else {
      list.push({ kind: 'good', icon: 'drop', text: t('pri_noWater') });
    }
  }

  // 4. Spray window
  const s = sprayWindow(w, farmNowISO());
  if (s) list.push({ kind: 'good', icon: 'spray', text: t('pri_spray')(dayWord(s.dayOffset, s.date), timeLabel(s.hour)) });
  else if (w.hourly) list.push({ kind: 'warn', icon: 'spray', text: t('pri_noSpray') });

  // 5. Nudge to add sowing dates
  const missing = ins.find((x) => x.known && !x.stage);
  if (missing) {
    const [title, body] = t('pri_dates');
    list.push({ kind: 'good', icon: 'calendar', title, body, crop: missing.crop });
  }

  for (const p of list) if (p.text) [p.title, p.body] = p.text;
  return list.slice(0, 5);
}

/* =========================================================
   Home
   ========================================================= */
async function renderHome() {
  const p = state.profile;
  $('#home-place').textContent = p.location.name;
  const hr = farmHour();
  $('#greeting').textContent = t(hr < 12 ? 'goodMorning' : hr < 17 ? 'goodAfternoon' : 'goodEvening');
  const card = $('#weather-card');
  if (!state.weather) {
    card.className = 'hero';
    card.replaceChildren(h('div', { class: 'hero-msg' }, t('loadingWeather')));
    $('#priorities').replaceChildren();
  }
  renderRail();
  renderFieldCard();
  try {
    const w = await loadWeather();
    if (state.view !== 'home') return;
    renderWeather(w);
    const ins = insights();
    renderPriorities(buildPriorities(w, ins));
    renderRail(ins);
  } catch {
    if (state.view !== 'home') return;
    card.className = 'hero rain';
    card.replaceChildren(
      h('div', { class: 'hero-msg' }, h('span', null, t('weatherError')), h('button', { type: 'button', class: 'btn-small', onclick: renderHome }, t('retry')))
    );
  }
}

function renderWeather(w) {
  const li = lang() === 'hi' ? 1 : 0;
  const condText = (code) => (WEATHER_CODES[code] || ['Unknown', 'अज्ञात'])[li];
  const today = w.daily[0];
  const key = iconKey(w.current.code);
  const sky = !w.current.isDay ? 'night' : ['rain', 'storm', 'snow', 'fog'].includes(key) ? 'rain' : w.current.temp >= 36 ? 'hot' : '';
  const nowIcon = !w.current.isDay && key === 'sun' ? 'moon' : key;
  const days = w.daily
    .slice(1, 6)
    .map(
      (d) =>
        `<div class="w-day"><span class="d">${t('days')[new Date(`${d.date}T12:00:00`).getDay()]}</span>` +
        `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${W_ICONS[iconKey(d.code)]}</svg>` +
        `<span class="t">${d.max}°</span><span class="r">${d.rainChance ?? 0}%</span></div>`
    )
    .join('');
  const card = $('#weather-card');
  card.className = `hero ${sky}`;
  // All values here are numbers from the weather API or our own strings, so innerHTML is safe.
  card.innerHTML = `
    <div class="w-top">
      <div class="w-now">
        <span class="w-label">${t('rightNow')}</span>
        <span class="w-temp">${w.current.temp}°</span>
        <span class="w-cond">${condText(w.current.code)} · ${today.min}° / ${today.max}°</span>
      </div>
      <svg class="w-icon" viewBox="0 0 24 24" aria-hidden="true">${W_ICONS[nowIcon]}</svg>
    </div>
    <div class="w-stats">
      <div class="w-stat"><span>${t('humidity')}</span><span>${w.current.humidity}%</span></div>
      <div class="w-stat"><span>${t('wind')}</span><span>${w.current.wind} km/h</span></div>
      <div class="w-stat"><span>${t('rainToday')}</span><span>${today.rainChance ?? 0}%</span></div>
    </div>
    <div class="w-days">${days}</div>
    <div class="w-stale" ${state.weatherStale ? '' : 'hidden'}></div>
    <svg class="hills" viewBox="0 0 400 46" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 30 C60 8 120 8 190 24 S330 40 400 14 V46 H0z" fill="rgba(255,255,255,.10)"/>
      <path d="M0 40 C80 20 150 34 220 30 S340 18 400 32 V46 H0z" fill="rgba(200,241,105,.28)"/>
    </svg>`;
  if (state.weatherStale) card.querySelector('.w-stale').textContent = t('savedWeather')(timeAgo(w.at));
}

function renderPriorities(list) {
  const box = $('#priorities');
  box.className = 'priorities stagger';
  box.replaceChildren(
    ...list.map((p) => {
      const inner = [
        h('span', { class: 'pri-ic' }, icon(p.icon)),
        h('span', { class: 'pri-text' }, h('strong', null, p.title), h('span', null, p.body)),
      ];
      if (!p.crop) return h('div', { class: `pri ${p.kind}` }, inner);
      return h('button', { type: 'button', class: `pri ${p.kind}`, onclick: () => go('crop', { crop: p.crop }) }, inner, icon('chevron', 'ic pri-go'));
    })
  );
}

/* ---------- crop cards ---------- */
function ring(cropId, progress, big = false) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const el = h('span', { class: `ring${big ? ' big' : ''}`, 'aria-hidden': 'true' });
  el.innerHTML =
    `<svg viewBox="0 0 52 52"><circle class="track" cx="26" cy="26" r="${r}"/>` +
    `<circle class="bar" cx="26" cy="26" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - (progress || 0))).toFixed(1)}"/></svg>`;
  el.append(h('span', { class: 'emoji' }, cropEmoji(cropId)));
  return el;
}

function riskStrip(days) {
  const strip = h('span', { class: 'strip', 'aria-hidden': 'true' });
  for (let i = 0; i < 7; i++) strip.append(h('i', { class: `l${days[i]?.level ?? 0}` }));
  return strip;
}

function cropCard(x, compact = false) {
  const sub = x.stage
    ? x.stage.done ? t('harvestNow') : compact ? stageName(x.stage.index) : `${stageName(x.stage.index)} · ${t('harvestIn')(x.stage.daysLeft)}`
    : x.known ? t('addSowDate') : t('stageUnknown');
  const top = x.risk.top;
  const label = !x.risk.days.length
    ? null
    : h('span', { class: 'strip-label' },
        h('span', null, h('i', { class: `dot l${x.risk.peak}` }), top ? t('riskShort')(t('riskLevels')[top.peak], threatName(top.id)) : t('riskClear'))
      );
  return h('button', { type: 'button', class: 'crop-card card-btn', onclick: () => go('crop', { crop: x.crop }) },
    h('span', { class: 'crop-head' }, ring(x.crop, x.stage?.progress), h('div', null, h('strong', null, cropName(x.crop)), h('span', { class: 'small muted' }, sub))),
    x.risk.days.length ? riskStrip(x.risk.days) : null,
    label
  );
}

// Before the weather arrives we can still show the crops (stage needs no weather).
function offlineInsights() {
  return farmInsights(state.profile, null, farmToday());
}

function renderRail(ins = state.weather ? insights() : offlineInsights()) {
  $('#crop-rail').replaceChildren(...ins.map((x) => cropCard(x, true)));
}

async function renderCrops() {
  const list = $('#crop-list');
  list.className = 'crop-list stagger';
  list.replaceChildren(...(state.weather ? insights() : offlineInsights()).map((x) => cropCard(x)));
  if (!state.weather || state.weatherStale) {
    try {
      await loadWeather();
      if (state.view === 'crops') list.replaceChildren(...insights().map((x) => cropCard(x)));
    } catch {
      /* cards without risk are still useful */
    }
  }
}

/* =========================================================
   Field station: live sensors on a real plant
   ========================================================= */
async function loadStation(force = false) {
  const fresh = state.station && Date.now() - state.station.at < 5 * 60000;
  if (!fresh || force) {
    try {
      state.station = { readings: await fetchReadings(168), at: Date.now() };
      state.stationError = false;
    } catch {
      state.stationError = true;
    }
  }
  if (!state.stationForecast || Date.now() - state.stationForecast.at > 30 * 60000) {
    try {
      state.stationForecast = { ...(await fetchStationForecast()), at: Date.now() };
    } catch {
      /* the comparison card just waits */
    }
  }
  return state.station;
}

function fieldData(rangeH = 24) {
  const readings = state.station?.readings || [];
  const status = stationStatus(readings);
  const risk = stationRisk(readings, state.profile?.crops || []);
  const f = state.stationForecast;
  const compare = f ? compareForecast(readings, f.hourly, f.utcOffset, Date.now(), 24) : null;
  const compareRange = f ? compareForecast(readings, f.hourly, f.utcOffset, Date.now(), rangeH) : null;
  return { readings, status, risk, compare, compareRange };
}

// What the AI gets: the latest measured values and the measured disease risk.
function stationPayload() {
  if (!state.station?.readings?.length) return undefined;
  const d = fieldData();
  return stationSummary(d.readings, d.risk, d.compare) || undefined;
}

const riskName = (id) => (THREATS[id] ? threatName(id) : lang() === 'hi' ? 'फफूंद रोग' : 'Fungal disease');
const fmt = (v, digits = 0) => (v == null ? '–' : Number(v).toFixed(digits));

function livePill(status) {
  return h('span', { class: `live-pill ${status.live ? 'on' : 'off'}` }, h('i'), status.live ? t('live') : t('offline'));
}

function stationTiles(last, compact = false) {
  const tile = (label, value, unit, extra) =>
    h('div', { class: 'tile' }, h('span', { class: 'tile-label' }, label), h('span', { class: 'tile-val' }, value, unit ? h('small', null, unit) : null), extra || null);
  const soilBar = compact ? null : h('div', { class: 'tile-bar', 'aria-hidden': 'true' }, h('i', { style: `width:${last.soil ?? 0}%` }));
  return h('div', { class: `tiles${compact ? ' compact' : ''}` },
    tile(t('temperature'), fmt(last.temp, 1), '°C'),
    tile(t('airHumidity'), fmt(last.rh), '%'),
    tile(t('soilMoisture'), fmt(last.soil), '%', soilBar),
    h('div', { class: `tile leaf ${last.leafFault ? 'fault' : last.leafWet ? 'wet' : 'dry'}` },
      h('span', { class: 'tile-label' }, t('leaf')),
      h('span', { class: 'tile-val' }, icon('drop', 'ic tile-ic'), last.leafFault ? t('leafFault') : last.leafWet ? t('leafWet') : t('leafDry')))
  );
}

/* ---- Home: small live card ---- */
async function renderFieldCard() {
  const box = $('#field-card');
  const draw = () => {
    const { readings, status, risk } = fieldData();
    if (!readings.length) {
      box.replaceChildren(state.stationError ? h('div', { class: 'field-card empty' }, t('stationError')) : '');
      return;
    }
    const L = t('riskLevels');
    box.replaceChildren(
      h('button', { type: 'button', class: 'field-card card-btn', onclick: () => go('field') },
        h('div', { class: 'fc-head' },
          h('span', { class: 'fc-title' }, h('strong', null, t('fieldStation')), h('span', { class: 'small muted' }, STATION.name[lang()])),
          livePill(status)),
        stationTiles(status.last, true),
        h('div', { class: 'fc-foot' },
          h('span', { class: `risk-chip l${risk.level}` }, h('i'), `${riskName(risk.threat)}: ${L[risk.level]}`),
          h('span', { class: 'link-ish' }, t('seeField'), icon('chevron', 'ic pri-go')))
      )
    );
  };
  draw();
  await loadStation();
  if (state.view === 'home') draw();
}

/* ---- My field page ---- */
async function renderField() {
  const wrap = $('#field-detail');
  const back = h('button', { type: 'button', class: 'back', onclick: () => go('home') }, icon('back'), t('back'));
  if (!state.station) wrap.replaceChildren(back, h('div', { class: 'card' }, h('p', { class: 'muted' }, t('loadingWeather'))));
  await loadStation();
  if (state.view !== 'field') return;
  const d = fieldData(state.fieldRange);
  const L = t('riskLevels');

  const head = h('div', { class: 'field-head' },
    h('div', null,
      h('h1', { class: 'display page-title' }, t('fieldTitle')),
      h('span', { class: 'muted' }, `${STATION.name[lang()]} · ${STATION.place.name}`)),
    d.readings.length ? livePill(d.status) : null);

  if (!d.readings.length) {
    wrap.replaceChildren(back, head, h('div', { class: 'card' }, h('p', { class: 'muted' }, state.stationError ? t('stationError') : t('noReadings'))));
    return;
  }

  const box = h('div', { class: 'detail stagger' });
  const last = d.status.last;

  /* live values */
  const liveCard = h('div', { class: 'card' },
    stationTiles(last),
    h('span', { class: 'small muted' }, d.status.live ? t('updated')(timeAgo(last.at)) : t('stationOff')(timeAgo(last.at))));
  box.append(liveCard);

  /* measured disease risk */
  const threat = riskName(d.risk.threat);
  const riskCard = h('div', { class: `card risk-card l${d.risk.level}` },
    h('div', { class: 'rc-top' },
      h('span', { class: 'rc-ic' }, icon(d.risk.level ? 'warn' : 'check')),
      h('div', null, h('span', { class: 'small' }, t('measuredRisk')), h('strong', { class: 'rc-level display' }, `${threat}: ${L[d.risk.level]}`))),
    h('div', { class: 'wet-bar', 'aria-hidden': 'true' }, h('i', { style: `width:${(d.risk.wetCount / 24) * 100}%` })),
    h('p', null, h('strong', null, t('wetHoursText')(d.risk.wetCount)), ' ', t('riskWhy')[d.risk.level]),
    d.risk.level && THREATS[d.risk.threat] ? h('p', { class: 'small' }, THREATS[d.risk.threat].do[lang()]) : null,
    h('button', { type: 'button', class: 'btn-small soft', style: 'align-self:flex-start', onclick: () => askAbout(t('askWhyQ')(L[d.risk.level].toLowerCase(), threat)) }, icon('chat'), t('askWhy'))
  );
  box.append(riskCard);

  /* field vs forecast */
  if (d.compare) {
    const g = d.compare.rhGap;
    const vs = h('div', { class: 'card vs-card' },
      h('h3', null, t('vsForecast')),
      h('div', { class: 'vs-big' }, h('span', { class: 'big-num' }, `${g > 0 ? '+' : ''}${g}`, h('small', null, '%')), h('span', null, g >= 0 ? t('moreHumid') : t('lessHumid'))),
      h('div', { class: 'vs-meta small muted' },
        d.compare.tGap != null ? h('span', null, t('tempGap')(d.compare.tGap)) : null,
        h('span', null, t('maxGap')(d.compare.maxRhGap))),
      h('p', { class: 'small muted' }, t('gapNote')));
    box.append(vs);
  }

  /* history chart */
  const chartCard = h('div', { class: 'card' });
  const metrics = [['rh', t('airHumidity')], ['temp', t('temperature')], ['soil', t('soilMoisture')]];
  const seg = (items, cur, onPick) =>
    h('div', { class: 'seg' }, ...items.map(([v, label]) => h('button', { type: 'button', 'aria-pressed': String(v === cur), onclick: () => onPick(v) }, label)));
  chartCard.append(
    h('div', { class: 'chart-head' }, h('h3', null, t('history')),
      seg([[24, t('range24')], [168, t('range7')]], state.fieldRange, (v) => { state.fieldRange = v; renderField(); })),
    seg(metrics, state.fieldMetric, (v) => { state.fieldMetric = v; renderField(); }),
    lineChart(d, state.fieldMetric, state.fieldRange),
    h('span', { class: 'small muted' }, t('readingsCount')(d.readings.length))
  );
  box.append(chartCard);

  wrap.replaceChildren(back, head, box);
}

/** Simple SVG line chart. Field readings as a solid line, the forecast as a dashed line. */
function lineChart(d, metric, rangeH) {
  const now = Date.now();
  const from = now - rangeH * 3600000;
  const key = { rh: 'rh', temp: 'temp', soil: 'soil' }[metric];
  const pts = d.readings.filter((r) => r.at >= from && r[key] != null).map((r) => [r.at, r[key]]);
  if (pts.length < 2) return h('p', { class: 'muted small' }, t('notEnough'));
  const fc = metric === 'soil' ? [] : (d.compareRange?.pairs || []).filter((p) => p.at >= from).map((p) => [p.at, metric === 'rh' ? p.forecastRh : p.forecastT]).filter((p) => p[1] != null);
  const vals = [...pts, ...fc].map((p) => p[1]);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (metric !== 'temp') { lo = Math.max(0, lo - 5); hi = Math.min(100, hi + 5); } else { lo -= 1; hi += 1; }
  if (hi - lo < 4) { lo -= 2; hi += 2; }
  const W = 320, H = 150, P = { l: 30, r: 8, t: 10, b: 22 };
  const x = (ts) => P.l + ((ts - from) / (now - from)) * (W - P.l - P.r);
  const y = (v) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
  const path = (arr) => arr.map(([ts, v], i) => `${i ? 'L' : 'M'}${x(ts).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const area = `${path(pts)} L${x(pts[pts.length - 1][0]).toFixed(1)} ${H - P.b} L${x(pts[0][0]).toFixed(1)} ${H - P.b} Z`;
  const unit = metric === 'temp' ? '°' : '%';
  const ticks = [lo, (lo + hi) / 2, hi].map((v) => `<text x="${P.l - 6}" y="${y(v) + 4}" text-anchor="end">${Math.round(v)}${unit}</text><line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}"/>`).join('');
  const offset = (state.stationForecast?.utcOffset ?? 14400) * 1000;
  const xl = (ts) => {
    const dte = new Date(ts + offset);
    return rangeH <= 24 ? `${String(dte.getUTCHours()).padStart(2, '0')}:00` : t('days')[dte.getUTCDay()];
  };
  const xTicks = [0, 0.5, 1].map((f) => { const ts = from + f * (now - from); return `<text x="${x(ts)}" y="${H - 6}" text-anchor="${f === 0 ? 'start' : f === 1 ? 'end' : 'middle'}">${xl(ts)}</text>`; }).join('');
  const lastPt = pts[pts.length - 1];
  const wrap = document.createElement('div');
  wrap.className = 'chart';
  // Numbers and our own strings only, so innerHTML is safe here.
  wrap.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${metric} chart">
      <g class="grid">${ticks}</g>
      <path class="area ${metric}" d="${area}"/>
      ${fc.length > 1 ? `<path class="fc" d="${path(fc)}"/>` : ''}
      <path class="line ${metric}" d="${path(pts)}"/>
      <circle class="end ${metric}" cx="${x(lastPt[0])}" cy="${y(lastPt[1])}" r="4"/>
      <g class="xl">${xTicks}</g>
    </svg>
    ${fc.length > 1 ? `<div class="legend chart-legend"><span class="lf ${metric}">${t('yourField')}</span><span class="fcl">${t('forecastWord')}</span></div>` : ''}`;
  return wrap;
}

/* =========================================================
   One crop: stage, water, risk, tasks, scans
   ========================================================= */
function askAbout(question) {
  go('chat');
  sendMessage(question);
}

async function renderCrop() {
  const id = state.cropId;
  if (!state.profile.crops.includes(id)) return go('crops');
  if (!state.weather) {
    try {
      await loadWeather();
    } catch {
      /* show what we can */
    }
    if (state.view !== 'crop' || state.cropId !== id) return;
  }
  const x = (state.weather ? insights() : offlineInsights()).find((i) => i.crop === id);
  const name = cropName(id);
  const box = h('div', { class: 'detail stagger' });

  /* ---- stage ---- */
  const stageCard = h('div', { class: 'card' });
  const head = h('div', { class: 'stage-top' }, ring(id, x.stage?.progress, true));
  const headText = h('div', null, h('h1', { class: 'display' }, name));
  if (x.stage) {
    headText.append(
      h('span', { class: 'muted' }, t('stageDay')(x.stage.day, x.stage.total)),
      h('strong', null, x.stage.done ? t('harvestNow') : t('harvestIn')(x.stage.daysLeft))
    );
  } else {
    headText.append(h('span', { class: 'muted' }, x.known ? t('waterNoDate') : t('riskNoModel')));
  }
  head.append(headText);
  stageCard.append(head);
  if (x.stage) {
    const steps = h('div', { class: 'steps' });
    const data = CROP_DATA[id];
    let start = 0;
    STAGES.forEach((s, i) => {
      const fill = Math.round(Math.max(0, Math.min(1, (x.stage.day - start) / data.days[i])) * 100);
      steps.append(h('div', { class: i < x.stage.index || x.stage.done ? 'done' : i === x.stage.index ? 'now' : '', style: `--fill:${fill}%` }, s[lang()]));
      start += data.days[i];
    });
    stageCard.append(steps);
  }
  if (x.known) {
    const input = h('input', { type: 'date', class: 'input', id: 'sow-date', value: state.profile.sown[id] || '', max: farmToday() });
    const save = h('button', {
      type: 'button', class: 'btn-small',
      onclick: () => {
        if (input.value) state.profile.sown[id] = input.value;
        else delete state.profile.sown[id];
        saveProfile();
        toast(t('savedOk'));
        renderCrop();
      },
    }, t('save'));
    const form = h('div', { class: 'field', hidden: Boolean(x.stage) },
      h('label', { class: 'label', for: 'sow-date' }, CROP_DATA[id].perennial ? t('sowQPrune') : t('sowQ')),
      h('div', { class: 'date-row' }, input, save)
    );
    stageCard.append(form);
    if (x.stage) stageCard.append(h('button', { type: 'button', class: 'link', style: 'align-self:flex-start', onclick: (e) => { form.hidden = false; e.target.remove(); } }, t('changeDate')));
  }
  box.append(stageCard);

  /* ---- water ---- */
  if (x.known) {
    const water = h('div', { class: 'card' }, h('h3', null, t('water3')));
    if (x.flooded) water.append(h('p', null, t('waterPaddy')));
    else if (!x.water) water.append(h('p', { class: 'muted' }, t('waterNoDate')));
    else {
      const wn = x.water;
      if (wn.needMm < 1) water.append(h('strong', { class: 'big-text' }, t('waterNone')), h('p', { class: 'muted' }, t('waterNoneSub')));
      else {
        const num = h('span', { class: 'big-num' }, String(Math.round(wn.needMm)), h('small', null, t('waterMm')));
        water.append(num);
      }
      const rainShare = wn.useMm ? Math.min(100, (wn.rainMm / wn.useMm) * 100) : 0;
      water.append(
        h('div', { class: 'meter', 'aria-hidden': 'true' }, h('i', { class: 'rain', style: `width:${rainShare}%` }), h('i', { style: `width:${100 - rainShare}%` })),
        h('div', { class: 'legend' }, h('span', null, t('waterUse')(wn.useMm)), h('span', { class: 'rain' }, t('waterRain')(wn.rainMm)))
      );
      if (wn.needMm >= 1) water.append(h('p', { class: 'small muted' }, t('perAcre')(Math.round(wn.needMm * 4047).toLocaleString(lang() === 'hi' ? 'hi-IN' : 'en-IN'))));
      water.append(h('button', { type: 'button', class: 'btn-small soft', style: 'align-self:flex-start', onclick: () => askAbout(t('q_water')(name)) }, icon('chat'), t('askFarmerMate')));
    }
    box.append(water);
  }

  /* ---- risk ---- */
  const risk = h('div', { class: 'card' }, h('h3', null, t('risk7')));
  if (!x.risk.threats.length) risk.append(h('p', { class: 'muted' }, t('riskNoModel')));
  else if (!x.risk.days.length) risk.append(h('p', { class: 'muted' }, t('weatherError')));
  else {
    const grid = h('div', { class: 'risk-grid' });
    grid.append(h('div', { class: 'risk-days' }, x.risk.days.map((d, i) => h('span', null, i === 0 ? t('todayWord') : t('days')[new Date(`${d.date}T12:00:00`).getDay()]))));
    for (const th of x.risk.threats) {
      grid.append(
        h('div', { class: 'risk-row' },
          h('span', null, threatName(th.id), h('span', { class: `badge l${th.peak}` }, t('riskLevels')[th.peak])),
          riskStrip(th.levels.map((level) => ({ level })))
        )
      );
    }
    risk.append(grid);
    const top = x.risk.top;
    if (top) {
      const when = dayWord(top.peakDay, x.risk.days[top.peakDay].date);
      risk.append(
        h('div', { class: `callout l${top.peak}` }, h('strong', null, `${threatName(top.id)}: `), THREATS[top.id].do[lang()]),
        h('button', { type: 'button', class: 'btn-primary', onclick: () => askAbout(t('q_risk')(threatName(top.id), name, when)) }, icon('chat'), t('askFarmerMate'))
      );
    } else risk.append(h('div', { class: 'callout' }, t('riskLowAll')));
    risk.append(h('p', { class: 'disclaimer' }, t('riskNote')));
  }
  box.append(risk);

  /* ---- stage tasks ---- */
  if (x.stage && !x.stage.done) {
    const key = `${id}:${x.stage.stage}`;
    const ticks = state.checks[key] || [];
    const tasks = h('div', { class: 'card' }, h('h3', null, `${t('stageFocus')} · ${stageName(x.stage.index)}`));
    STAGE_TASKS[x.stage.stage][lang()].forEach((task, i) => {
      tasks.append(
        h('label', { class: 'check' },
          h('input', {
            type: 'checkbox', checked: Boolean(ticks[i]),
            onchange: (e) => {
              const list = state.checks[key] || [];
              list[i] = e.target.checked;
              state.checks[key] = list;
              store.set('km_checks', state.checks);
            },
          }),
          h('span', null, task)
        )
      );
    });
    tasks.append(h('button', { type: 'button', class: 'btn-small soft', style: 'align-self:flex-start', onclick: () => askAbout(t('q_stage')(name, stageName(x.stage.index))) }, icon('chat'), t('askFarmerMate')));
    box.append(tasks);
  }

  /* ---- scans of this crop ---- */
  const scans = state.log.filter((e) => e.crop === id).slice(0, 4);
  const logCard = h('div', { class: 'card' }, h('h3', null, t('fieldLog')));
  if (scans.length) logCard.append(h('div', { class: 'log-list' }, scans.map(logItem)));
  else logCard.append(h('p', { class: 'muted' }, t('noLogCrop')));
  logCard.append(
    h('button', {
      type: 'button', class: 'btn-primary lime',
      onclick: () => {
        resetScan();
        go('scan');
        $('#scan-crop').value = id;
      },
    }, icon('scan'), t('scanThis'))
  );
  box.append(logCard);

  $('#crop-detail').replaceChildren(h('button', { type: 'button', class: 'back', onclick: () => go('crops') }, icon('back'), t('back')), box);
}

/* =========================================================
   API helper
   ========================================================= */
async function postJSON(url, body) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90000);
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
    const draw = (side, quality) => {
      const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', quality);
    };
    const dataUrl = draw(maxSide, 0.82);
    return { mimeType: 'image/jpeg', data: dataUrl.split(',')[1], url: dataUrl, thumb: draw(220, 0.7) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* =========================================================
   Voice: read answers aloud (free, built into the phone)
   ========================================================= */
let speakingBtn = null;
function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  if (speakingBtn) setSpeakBtn(speakingBtn, false);
  speakingBtn = null;
}
function setSpeakBtn(btn, on) {
  btn.classList.toggle('on', on);
  btn.replaceChildren(icon(on ? 'stop' : 'sound'), on ? t('stop') : t('listen'));
}
function speak(text, btn) {
  const wasThis = speakingBtn === btn;
  stopSpeaking();
  if (wasThis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang() === 'hi' ? 'hi-IN' : 'en-IN';
  u.rate = 0.95;
  u.onend = u.onerror = () => {
    if (speakingBtn === btn) {
      setSpeakBtn(btn, false);
      speakingBtn = null;
    }
  };
  speakingBtn = btn;
  setSpeakBtn(btn, true);
  window.speechSynthesis.speak(u);
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
  const el = h('div', { class: `msg ${m.role === 'user' ? 'user' : m.error ? 'err' : 'bot'}` });
  if (m.hasImage) {
    const src = state.sessionImages[index];
    if (src) el.append(h('img', { src, alt: t('photoSent') }));
    else el.append(h('span', { class: 'photo-note' }, `[${t('photoSent')}]`));
  }
  if (m.role === 'assistant' && !m.error) {
    const { body, sources } = splitSources(m.text);
    el.append(document.createTextNode(body));
    if (sources.length) el.append(h('span', { class: 'sources' }, `${t('source')}: ${sources.join(' · ')}`));
    const tools = h('div', { class: 'msg-tools' });
    if ('speechSynthesis' in window) {
      const btn = h('button', { type: 'button', class: 'tool' }, icon('sound'), t('listen'));
      btn.addEventListener('click', () => speak(body, btn));
      tools.append(btn);
    }
    if (navigator.clipboard) {
      tools.append(
        h('button', {
          type: 'button', class: 'tool',
          onclick: async () => {
            try {
              await navigator.clipboard.writeText(body);
              toast(t('copied'));
            } catch {
              /* clipboard blocked: nothing to do */
            }
          },
        }, icon('copy'), t('copy'))
      );
    }
    if (tools.children.length) el.append(tools);
  } else {
    el.append(document.createTextNode(m.text));
  }
  return el;
}

// Starter questions built from what is happening on the farm right now.
function suggestions() {
  const out = [];
  const ins = state.weather ? insights() : [];
  const risky = ins.filter((x) => x.risk.top).sort((a, b) => b.risk.top.peak - a.risk.top.peak)[0];
  if (risky) {
    const top = risky.risk.top;
    out.push(t('q_risk')(threatName(top.id), cropName(risky.crop), dayWord(top.peakDay, risky.risk.days[top.peakDay].date)));
  }
  const staged = ins.find((x) => x.stage && !x.stage.done);
  if (staged) out.push(t('q_stage')(cropName(staged.crop), stageName(staged.stage.index)));
  const firstCrop = cropName(state.profile.crops[0] || 'tomato');
  for (const q of t('suggestions')(lang() === 'en' ? firstCrop.toLowerCase() : firstCrop)) if (out.length < 4) out.push(q);
  return out;
}

function renderChat() {
  const box = $('#messages');
  box.replaceChildren();
  if (!state.chat.length) {
    box.append(
      h('div', { class: 'welcome' },
        h('h2', { class: 'display' }, t('welcomeTitle')),
        h('p', { class: 'muted' }, t('welcomeSub')),
        h('div', { class: 'suggestions stagger' }, suggestions().map((q) => h('button', { type: 'button', class: 'suggestion', onclick: () => sendMessage(q) }, q)))
      )
    );
  }
  state.chat.forEach((m, i) => box.append(messageEl(m, i)));
  if (state.sending) {
    const typing = h('div', { class: 'msg bot' });
    typing.innerHTML = '<span class="typing" aria-label="…"><i></i><i></i><i></i></span>';
    box.append(typing);
  }
  $('#send-btn').disabled = state.sending;
  box.scrollTop = box.scrollHeight;
}

function saveChat() {
  // Keep the last 40 messages, text only.
  state.chat = state.chat.slice(-40);
  store.set('km_chat', state.chat.filter((m) => !m.error).map(({ role, text, hasImage }) => ({ role, text, hasImage })));
}

async function sendMessage(text) {
  text = (text || '').trim();
  const image = state.chatImage;
  if ((!text && !image) || state.sending) return;
  stopSpeaking();

  state.chat = state.chat.filter((m) => !m.error);
  state.chat.push({ role: 'user', text, hasImage: !!image });
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
    if (!state.weather) await loadWeather().catch(() => null); // the AI answers better with the forecast
    const data = await postJSON('/api/chat', { messages: history, ...apiContext() });
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
    stopSpeaking();
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
   Scan + field log
   ========================================================= */
function renderScanPick() {
  if (!$('#scan-result').hidden) return; // showing a result
  const sel = $('#scan-crop');
  const current = sel.value;
  sel.replaceChildren();
  for (const c of state.profile.crops) sel.append(new Option(cropName(c), c));
  sel.append(new Option(t('notSure'), ''));
  if ([...sel.options].some((o) => o.value === current)) sel.value = current;
  const list = $('#log-list');
  if (state.log.length) list.replaceChildren(...state.log.map(logItem));
  else list.replaceChildren(h('div', { class: 'empty' }, t('noLog')));
}

function logItem(entry) {
  const r = entry.result;
  return h('button', { type: 'button', class: 'log-item card-btn', 'aria-label': `${t('openScan')}: ${r.issue}`, onclick: () => openLogEntry(entry) },
    entry.thumb ? h('img', { src: entry.thumb, alt: '' }) : h('span', { class: 'log-thumb' }),
    h('div', null, h('strong', null, r.issue), h('span', { class: 'small muted' }, `${entry.crop ? cropName(entry.crop) : r.plant} · ${timeAgo(entry.ts)}`)),
    h('span', { class: `badge ${r.severity}` }, t(`sev_${r.severity}`))
  );
}

function saveLog() {
  state.log = state.log.slice(0, 20);
  // If the phone's storage is full, drop the oldest photos until it fits.
  while (!store.set('km_log', state.log) && state.log.length > 1) state.log.pop();
}

function openLogEntry(entry) {
  if (state.view !== 'scan') go('scan');
  lastScanImage = { url: entry.thumb };
  $('#scan-pick').hidden = true;
  $('#scan-result').hidden = false;
  $('.scan-photo').classList.remove('busy');
  $('#scan-img').src = entry.thumb || '';
  renderScanResult(entry.result, entry.source, entry);
  window.scrollTo(0, 0);
}

let lastScanImage = null;

async function runScan(file) {
  let image;
  try {
    image = await compressImage(file);
  } catch {
    const p = h('p', { class: 'error' }, t('imgError'));
    $('#photo-drop').after(p);
    setTimeout(() => p.remove(), 5000);
    return;
  }
  lastScanImage = image;
  const cropId = $('#scan-crop').value;
  $('#scan-pick').hidden = true;
  $('#scan-result').hidden = false;
  $('.scan-photo').classList.add('busy');
  $('#scan-img').src = image.url;
  $('#scan-img').alt = cropId ? cropName(cropId) : '';
  const sheet = $('#scan-sheet');
  sheet.replaceChildren(h('div', { class: 'scanning' }, h('strong', null, t('analyzing')), h('span', { class: 'small muted' }, t('analyzingSub'))));
  window.scrollTo(0, 0);

  try {
    const data = await postJSON('/api/scan', {
      image: { mimeType: image.mimeType, data: image.data },
      crop: cropId ? cropEnglish(cropId) : '',
      ...apiContext(),
    });
    let entry = null;
    if (data.result.isPlant) {
      // Match the scan to one of the farmer's crops so it shows up on that crop's page.
      const plant = String(data.result.plant || '').toLowerCase();
      const crop = cropId || state.profile.crops.find((c) => cropEnglish(c).toLowerCase() === plant) || '';
      entry = { id: Date.now().toString(36), ts: Date.now(), crop, result: data.result, source: data.source, thumb: image.thumb };
      state.log.unshift(entry);
      saveLog();
    }
    renderScanResult(data.result, data.source, entry);
  } catch (err) {
    sheet.replaceChildren(
      h('h2', { class: 'display' }, t('scanError')),
      h('p', { class: 'muted' }, err.message),
      h('button', { type: 'button', class: 'btn-primary', onclick: () => runScan(file) }, t('tryAgain')),
      closeScanButton()
    );
  } finally {
    $('.scan-photo').classList.remove('busy');
  }
}

function closeScanButton() {
  return h('button', { type: 'button', class: 'btn-outline', onclick: resetScan }, t('scanAnother'));
}

function renderScanResult(r, source, entry) {
  const sheet = $('#scan-sheet');
  sheet.className = 'sheet stagger';
  if (!r.isPlant) {
    sheet.replaceChildren(h('h2', { class: 'display' }, t('notPlant')), h('p', { class: 'muted' }, t('notPlantSub')), closeScanButton());
    return;
  }
  const sub = h('span', { class: 'muted' }, r.plant);
  if (r.scientificName) sub.append(' · ', h('span', { class: 'sci' }, r.scientificName));

  const steps = h('div', { class: 'card' }, h('h3', null, t('treatment')));
  (r.steps || []).forEach((s, i) => steps.append(h('div', { class: 'step' }, h('span', { class: 'n' }, String(i + 1)), h('span', null, s))));

  const extra = h('div', { class: 'card' }, h('h3', null, t('prevention')), h('p', null, r.prevention));
  if (r.weatherNote) extra.append(h('h3', null, t('weatherNote')), h('p', null, r.weatherNote));

  const follow = h('button', {
    type: 'button', class: 'btn-primary',
    onclick: () => {
      state.chat.push({ role: 'user', text: t('scannedContext')(r), hasImage: true });
      state.sessionImages[state.chat.length - 1] = lastScanImage?.url;
      state.chat.push({ role: 'assistant', text: t('scanBotIntro')(r) + (source ? `\nSource: ${source.title}` : '') });
      saveChat();
      resetScan();
      go('chat');
      $('#chat-input').focus();
    },
  }, t('followUp'));

  sheet.replaceChildren(
    h('div', { class: 'sheet-meta' },
      h('span', { class: `badge ${r.severity}` }, t(`sev_${r.severity}`)),
      h('span', { class: 'small muted' }, `${t('confidence')}: ${t(`conf_${r.confidence}`)}${entry && Date.now() - entry.ts > 120000 ? ` · ${timeAgo(entry.ts)}` : ''}`)
    ),
    h('div', { style: 'display:flex;flex-direction:column;gap:4px' }, h('h2', { class: 'display' }, r.issue), sub),
    h('p', null, r.description),
    steps,
    extra,
    source ? h('span', { class: 'small muted' }, `${t('source')}: ${source.title}`) : null,
    h('div', { class: 'grid2' }, follow, closeScanButton()),
    entry
      ? h('button', {
          type: 'button', class: 'link', style: 'align-self:center',
          onclick: () => {
            state.log = state.log.filter((e) => e.id !== entry.id);
            saveLog();
            resetScan();
          },
        }, t('deleteScan'))
      : null,
    h('p', { class: 'disclaimer' }, t('scanDisclaimer'))
  );
}

function resetScan() {
  $('#scan-result').hidden = true;
  $('#scan-pick').hidden = false;
  $('#scan-file').value = '';
  $('#scan-gallery').value = '';
  if (state.profile) renderScanPick();
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
    if (state.profile) {
      state.profile.lang = b.dataset.lang;
      saveProfile();
    }
    applyI18n();
    renderSetup();
  })
);
document.querySelectorAll('#theme-picker .option').forEach((b) =>
  b.addEventListener('click', () => {
    state.theme = b.dataset.themeOpt;
    store.set('km_theme', state.theme);
    applyTheme();
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
  stopSpeaking();
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

/* ---------- start ---------- */
async function boot() {
  applyI18n();
  applyTheme();
  // Move scans saved by the first version of the app into the new field log format: nothing to move
  // (v1 only kept the last result per crop, without the details), so old entries are simply left behind.
  try {
    const s = await (await fetch('/api/login')).json();
    state.locked = s.required && !s.authed;
  } catch {
    state.locked = false; // offline: the API calls will ask again if needed
  }
  go(state.profile ? 'home' : 'setup');
  // Offline support: keep a copy of the app on the phone.
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
boot();
