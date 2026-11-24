// FarmerMate Field Station: live readings from the ESP32 sensor box on a real plant.
// The station sends one reading every 10 minutes to Supabase. This file reads them
// and turns them into the numbers the app shows: live values, wet hours, disease risk
// and "your field vs the forecast".

import { CROP_DATA, THREATS } from './crops.js';

// The publishable key is meant to live in front-end code. The database only lets it
// ADD readings (the station) and READ them (this app). It cannot edit or delete anything.
export const STATION = {
  id: 'mom-plants-01',
  name: { en: "Mom's plants", hi: 'माँ के पौधे' },
  place: { name: 'Dubai', lat: 25.2048, lon: 55.2708 },
  url: 'https://xfqgpwgarwcyjlbscpjv.supabase.co',
  key: 'sb_publishable_j0WW6W_a0nO82HJepc32ZQ_oAeC8w43',
  everyMin: 10,
};

/** Last `hours` of readings, oldest first. */
export async function fetchReadings(hours = 168) {
  const since = new Date(Date.now() - hours * 3600000).toISOString();
  const q =
    `${STATION.url}/rest/v1/readings?select=created_at,temperature,humidity,soil_pct,leaf_raw,leaf_wet` +
    `&station_id=eq.${encodeURIComponent(STATION.id)}&created_at=gte.${encodeURIComponent(since)}&order=created_at.asc&limit=2000`;
  const res = await fetch(q, { headers: { apikey: STATION.key } });
  if (!res.ok) throw new Error(`station ${res.status}`);
  const rows = await res.json();
  return rows.map((r) => ({
    at: Date.parse(r.created_at),
    temp: r.temperature,
    rh: r.humidity,
    soil: r.soil_pct,
    leafRaw: r.leaf_raw,
    leafWet: r.leaf_wet === true,
  }));
}

/** Is the station sending? Live = a reading in the last 25 minutes (2 missed sends allowed). */
export function stationStatus(readings, now = Date.now()) {
  const last = readings[readings.length - 1];
  if (!last) return { live: false, last: null, minsAgo: null };
  const minsAgo = Math.round((now - last.at) / 60000);
  return { live: minsAgo <= 25, last, minsAgo };
}

/**
 * Group readings into clock hours and mark each hour "wet":
 * the leaf sensor felt water, or the air was 90%+ humid (dew forms on leaves).
 */
export function wetHours(readings, now = Date.now(), windowH = 24) {
  const from = now - windowH * 3600000;
  const hours = new Map();
  for (const r of readings) {
    if (r.at < from) continue;
    const key = Math.floor(r.at / 3600000);
    if (!hours.has(key)) hours.set(key, { wet: false, temps: [] });
    const hr = hours.get(key);
    if (r.leafWet || (r.rh ?? 0) >= 90) hr.wet = true;
    if (r.temp != null) hr.temps.push(r.temp);
  }
  return [...hours.values()].map((h) => ({
    wet: h.wet,
    temp: h.temps.length ? h.temps.reduce((a, b) => a + b, 0) / h.temps.length : null,
  }));
}

// Used when none of the farmer's crops has a wet-weather disease in our list.
const GENERIC = { id: 'fungal', band: [15, 30], med: 6, high: 10 };

/**
 * Disease risk from what the sensors actually measured in the last 24 hours.
 * Same "infection period" rule as the forecast model, but with real leaf wetness.
 * @returns {{ level: 0|1|2, wetCount, threat, perThreat: [{id, level, count}] }}
 */
export function stationRisk(readings, cropIds = [], now = Date.now()) {
  const hours = wetHours(readings, now);
  const ids = [...new Set(cropIds.flatMap((c) => CROP_DATA[c]?.threats || []))].filter((id) => ['wet', 'rain'].includes(THREATS[id]?.kind));
  const rules = ids.length ? ids.map((id) => ({ id, ...THREATS[id] })) : [GENERIC];
  const perThreat = rules.map((r) => {
    const count = hours.filter((h) => h.wet && h.temp != null && h.temp >= r.band[0] && h.temp <= r.band[1]).length;
    return { id: r.id, count, level: count >= r.high ? 2 : count >= r.med ? 1 : 0 };
  });
  perThreat.sort((a, b) => b.level - a.level || b.count - a.count);
  const top = perThreat[0];
  return { level: top.level, wetCount: hours.filter((h) => h.wet).length, threat: top.id, perThreat };
}

/**
 * Field vs forecast: for every reading, find the forecast value for the same hour
 * and measure the gap. Positive = the field is more humid / hotter than forecast.
 * `hourly` is Open-Meteo hourly data (local times) and `utcOffset` its offset in seconds.
 */
export function compareForecast(readings, hourly, utcOffset, now = Date.now(), windowH = 24) {
  if (!hourly?.time?.length) return null;
  const index = new Map(hourly.time.map((t, i) => [t, i]));
  const pairs = [];
  for (const r of readings) {
    if (r.at < now - windowH * 3600000 || r.rh == null) continue;
    const local = new Date(r.at + utcOffset * 1000).toISOString().slice(0, 13) + ':00';
    const i = index.get(local);
    if (i == null || hourly.rh[i] == null) continue;
    pairs.push({ at: r.at, fieldRh: r.rh, forecastRh: hourly.rh[i], fieldT: r.temp, forecastT: hourly.temp[i] });
  }
  if (!pairs.length) return null;
  const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const tPairs = pairs.filter((p) => p.fieldT != null && p.forecastT != null);
  return {
    pairs,
    rhGap: Math.round(avg(pairs.map((p) => p.fieldRh - p.forecastRh))),
    tGap: tPairs.length ? Math.round(avg(tPairs.map((p) => p.fieldT - p.forecastT)) * 10) / 10 : null,
    maxRhGap: Math.round(Math.max(...pairs.map((p) => p.fieldRh - p.forecastRh))),
  };
}

/** Forecast for the station's own location, including the last day, so it can be compared. */
export async function fetchStationForecast() {
  const { lat, lon } = STATION.place;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&hourly=temperature_2m,relative_humidity_2m&past_days=7&forecast_days=1&timezone=auto';
  const res = await fetch(url);
  if (!res.ok) throw new Error('forecast');
  const d = await res.json();
  return {
    utcOffset: d.utc_offset_seconds || 0,
    hourly: { time: d.hourly.time, temp: d.hourly.temperature_2m, rh: d.hourly.relative_humidity_2m },
  };
}

/** Short English summary sent to the AI so it can explain the alert. */
export function stationSummary(readings, risk, compare, now = Date.now()) {
  const s = stationStatus(readings, now);
  if (!s.last) return null;
  const r = s.last;
  return {
    minsAgo: s.minsAgo,
    temp: r.temp,
    humidity: r.rh,
    soil: r.soil,
    leafWet: r.leafWet,
    wetHours: risk.wetCount,
    risk: ['low', 'medium', 'high'][risk.level],
    threat: THREATS[risk.threat]?.en || 'fungal disease',
    rhGap: compare?.rhGap ?? null,
  };
}
