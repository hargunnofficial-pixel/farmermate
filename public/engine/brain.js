// FarmerMate's "farm brain": turns the weather forecast + sowing dates into
// crop stage, water need, disease risk and the best spray window.
// Pure functions only (no browser or server APIs), so they are easy to test.

import { CROP_DATA, STAGES, THREATS } from './crops.js';

const DAY_MS = 86_400_000;
const round1 = (n) => Math.round(n * 10) / 10;
const between = (v, [lo, hi]) => v >= lo && v <= hi;

/* ---------------------------------------------------------
   Crop stage
   --------------------------------------------------------- */
/**
 * Where a crop is in its season.
 * @param {string} cropId
 * @param {string} sownISO  - 'YYYY-MM-DD' sowing / transplanting / pruning date
 * @param {string} todayISO - 'YYYY-MM-DD'
 * @returns null if we have no data for this crop or no valid date
 */
export function cropStage(cropId, sownISO, todayISO) {
  const data = CROP_DATA[cropId];
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(sownISO || '')) return null;
  const day = Math.round((Date.parse(`${todayISO}T00:00:00Z`) - Date.parse(`${sownISO}T00:00:00Z`)) / DAY_MS);
  if (!Number.isFinite(day) || day < 0) return null;
  const total = data.days.reduce((a, b) => a + b, 0);
  let start = 0;
  let index = 3;
  let into = 1;
  for (let i = 0; i < 4; i++) {
    if (day < start + data.days[i]) {
      index = i;
      into = (day - start) / data.days[i];
      break;
    }
    start += data.days[i];
  }
  // FAO-56 crop coefficient: flat in stage 1, climbs in stage 2, flat in stage 3, falls in stage 4.
  const [kIni, kMid, kEnd] = data.kc;
  const kc = [kIni, kIni + (kMid - kIni) * into, kMid, kMid + (kEnd - kMid) * Math.min(into, 1)][index];
  return {
    day,
    total,
    index,
    stage: STAGES[index].id,
    progress: Math.min(1, day / total),
    daysLeft: Math.max(0, total - day),
    done: day >= total,
    kc: Math.round(kc * 100) / 100,
  };
}

/* ---------------------------------------------------------
   Water need (FAO-56: crop water use = reference evapotranspiration x Kc)
   --------------------------------------------------------- */
/**
 * @param {object} weather - { daily: [{ date, et0, rainMm }] }
 * @param {number} kc
 * @param {number} [days]
 * @returns {{ useMm, rainMm, needMm, days } | null}  mm is the same as litres per square metre
 */
export function waterNeed(weather, kc, days = 3) {
  const list = (weather?.daily || []).slice(0, days).filter((d) => typeof d.et0 === 'number');
  if (!list.length || !kc) return null;
  const use = list.reduce((s, d) => s + d.et0 * kc, 0);
  // Light showers mostly evaporate; count 75% of rain on days with 2 mm or more.
  const rain = list.reduce((s, d) => s + (d.rainMm >= 2 ? d.rainMm * 0.75 : 0), 0);
  return { useMm: round1(use), rainMm: round1(rain), needMm: round1(Math.max(0, use - rain)), days: list.length };
}

/* ---------------------------------------------------------
   Disease and pest risk from the hourly forecast
   --------------------------------------------------------- */
/** Group Open-Meteo hourly arrays into days. */
export function hoursByDay(hourly) {
  const out = new Map();
  if (!hourly?.time) return out;
  hourly.time.forEach((stamp, i) => {
    const date = stamp.slice(0, 10);
    if (!out.has(date)) out.set(date, []);
    out.get(date).push({
      hour: Number(stamp.slice(11, 13)),
      temp: hourly.temp[i],
      rh: hourly.rh[i],
      rain: hourly.rain[i] ?? 0,
      wind: hourly.wind[i] ?? 0,
    });
  });
  return out;
}

/** Risk level 0 (low), 1 (medium) or 2 (high) for one threat on one day's hours. */
export function threatLevel(threatId, hours) {
  const th = THREATS[threatId];
  if (!th || !hours?.length) return 0;
  const temps = hours.map((h) => h.temp);
  const mean = temps.reduce((a, b) => a + b, 0) / temps.length;
  const tMax = Math.max(...temps);
  const tMin = Math.min(...temps);
  const rain = hours.reduce((s, h) => s + h.rain, 0);
  const rhMean = hours.reduce((s, h) => s + h.rh, 0) / hours.length;
  const rhMax = Math.max(...hours.map((h) => h.rh));

  if (th.kind === 'wet' || th.kind === 'rain') {
    if (th.kind === 'rain' && rain >= th.rainMm && tMin >= th.band[0] && mean <= th.band[1]) return 2;
    // Leaf wetness: we can't measure it, so we use "very humid or raining" as a stand-in.
    const wet = hours.filter((h) => (h.rh >= 90 || h.rain >= 0.2) && between(h.temp, th.band)).length;
    return wet >= th.high ? 2 : wet >= th.med ? 1 : 0;
  }
  if (th.kind === 'dry') {
    if (rain >= 1 || !between(mean, th.band) || rhMax < 70 || rhMean >= 85) return 0;
    return between(mean, [21, 27]) && rhMax >= 80 ? 2 : 1;
  }
  if (th.kind === 'hotdry') {
    if (rain >= 1 || tMax < 30 || rhMean >= 60) return 0;
    return tMax >= 34 && rhMean < 50 ? 2 : 1;
  }
  return 0;
}

/**
 * 7-day risk outlook for one crop.
 * @returns {{ days: [{date, level, threat}], threats: [{id, levels:[...], peak, peakDay}], peak, top }}
 */
export function riskOutlook(cropId, weather) {
  const ids = CROP_DATA[cropId]?.threats || [];
  const byDay = hoursByDay(weather?.hourly);
  const dates = [...byDay.keys()].slice(0, 7);
  const threats = ids.map((id) => {
    const levels = dates.map((d) => threatLevel(id, byDay.get(d)));
    const peak = Math.max(0, ...levels);
    return { id, levels, peak, peakDay: peak ? levels.indexOf(peak) : -1 };
  });
  const days = dates.map((date, i) => {
    let level = 0;
    let threat = null;
    for (const t of threats) if (t.levels[i] > level) [level, threat] = [t.levels[i], t.id];
    return { date, level, threat };
  });
  const peak = Math.max(0, ...days.map((d) => d.level));
  // The threat to talk about: highest level, then the one arriving soonest.
  const top = [...threats].filter((t) => t.peak).sort((a, b) => b.peak - a.peak || a.peakDay - b.peakDay)[0] || null;
  return { days, threats, peak, top };
}

/* ---------------------------------------------------------
   Best time to spray
   --------------------------------------------------------- */
/**
 * First good spray slot in the next 3 days: calm, not hot, and dry for the next 6 hours.
 * Only early morning (6-10) and evening (16-19) count.
 * @param {string} nowISO - local time like '2026-11-16T15:00'
 * @returns {{ date, hour, dayOffset, wind, temp } | null}
 */
export function sprayWindow(weather, nowISO) {
  const h = weather?.hourly;
  if (!h?.time) return null;
  const today = nowISO.slice(0, 10);
  for (let i = 0; i < h.time.length; i++) {
    const stamp = h.time[i];
    if (stamp < nowISO.slice(0, 13)) continue;
    const dayOffset = Math.round((Date.parse(`${stamp.slice(0, 10)}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
    if (dayOffset > 2) break;
    const hour = Number(stamp.slice(11, 13));
    if (!((hour >= 6 && hour <= 9) || (hour >= 16 && hour <= 18))) continue;
    if (h.wind[i] > 12 || h.temp[i] > 32) continue;
    let rainAhead = 0;
    for (let j = i; j < Math.min(i + 6, h.time.length); j++) rainAhead += h.rain[j] ?? 0;
    if (rainAhead > 0.3) continue;
    return { date: stamp.slice(0, 10), hour, dayOffset, wind: Math.round(h.wind[i]), temp: Math.round(h.temp[i]) };
  }
  return null;
}

/* ---------------------------------------------------------
   Everything together, for the home screen and for the AI
   --------------------------------------------------------- */
/**
 * @param {object} farm - { crops: [ids], sown: { cropId: 'YYYY-MM-DD' } }
 * @returns {Array<{ crop, stage, water, risk }>}
 */
export function farmInsights(farm, weather, todayISO) {
  return (farm.crops || []).map((crop) => {
    const stage = cropStage(crop, farm.sown?.[crop], todayISO);
    return {
      crop,
      known: Boolean(CROP_DATA[crop]),
      flooded: Boolean(CROP_DATA[crop]?.flooded),
      stage,
      water: stage && !stage.done ? waterNeed(weather, stage.kc) : null,
      risk: riskOutlook(crop, weather),
    };
  });
}
