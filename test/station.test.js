// Tests for the field station maths (wet hours, measured disease risk, field vs forecast).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stationStatus, wetHours, stationRisk, compareForecast, stationSummary } from '../public/engine/station.js';

const NOW = Date.parse('2026-11-23T16:00:00Z');
// One reading every 10 minutes for `hours` hours, ending now.
function series(hours, fn) {
  const out = [];
  for (let m = hours * 60; m >= 0; m -= 10) {
    const at = NOW - m * 60000;
    out.push({ at, ...fn(at) });
  }
  return out;
}

test('status: live when the last reading is recent, offline when old', () => {
  const r = series(1, () => ({ temp: 26, rh: 60, soil: 40, leafWet: false }));
  assert.equal(stationStatus(r, NOW).live, true);
  assert.equal(stationStatus(r, NOW + 60 * 60000).live, false);
  assert.equal(stationStatus([], NOW).last, null);
});

test('wet hours: leaf sensor OR 90%+ humidity marks the hour wet', () => {
  const r = series(24, (at) => {
    const hoursAgo = (NOW - at) / 3600000;
    return { temp: 20, rh: hoursAgo < 3 ? 95 : 60, soil: 40, leafWet: hoursAgo >= 10 && hoursAgo < 12 };
  });
  const wet = wetHours(r, NOW).filter((h) => h.wet).length;
  assert.ok(wet >= 5 && wet <= 7, `expected ~5-6 wet hours, got ${wet}`);
});

test('risk: dry field is low, long wet spell in the right temperature is high', () => {
  const dry = series(24, () => ({ temp: 26, rh: 55, soil: 30, leafWet: false }));
  assert.equal(stationRisk(dry, ['tomato'], NOW).level, 0);

  const wet = series(24, () => ({ temp: 18, rh: 96, soil: 70, leafWet: true }));
  const risk = stationRisk(wet, ['tomato'], NOW);
  assert.equal(risk.level, 2);
  assert.equal(risk.threat, 'lateBlight'); // 18°C is in the late blight band, not early blight's 22-30
});

test('risk: crops with no wet-weather disease fall back to a generic fungal rule', () => {
  const wet = series(24, () => ({ temp: 22, rh: 95, soil: 60, leafWet: true }));
  const risk = stationRisk(wet, ['cotton'], NOW);
  assert.equal(risk.threat, 'fungal');
  assert.equal(risk.level, 2);
});

test('field vs forecast: measures the humidity gap hour by hour', () => {
  const r = series(3, () => ({ temp: 27, rh: 85, soil: 40, leafWet: false }));
  // Forecast in local time (UTC+4), 60% humidity, 25°C for the whole day.
  const time = [], rh = [], temp = [];
  for (let h = 0; h < 24; h++) {
    time.push(`2026-11-23T${String(h).padStart(2, '0')}:00`);
    rh.push(60);
    temp.push(25);
  }
  const c = compareForecast(r, { time, rh, temp }, 4 * 3600, NOW);
  assert.equal(c.rhGap, 25);
  assert.equal(c.tGap, 2);
  assert.ok(c.pairs.length > 10);
});

test('summary for the AI has the measured values', () => {
  const r = series(2, () => ({ temp: 26.2, rh: 88.9, soil: 12, leafWet: false }));
  const s = stationSummary(r, stationRisk(r, ['tomato'], NOW), null, NOW);
  assert.equal(s.humidity, 88.9);
  assert.equal(s.risk, 'low');
  assert.equal(s.minsAgo, 0);
});
