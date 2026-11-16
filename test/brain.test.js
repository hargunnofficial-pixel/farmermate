// Tests for the farm brain (crop stage, water need, disease risk, spray window).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cropStage, waterNeed, threatLevel, riskOutlook, sprayWindow, farmInsights } from '../public/engine/brain.js';

// Build 24 hours of the same weather.
const day = (temp, rh, rain = 0, wind = 5) => Array.from({ length: 24 }, (_, hour) => ({ hour, temp, rh, rain, wind }));
function hourly(days) {
  const out = { time: [], temp: [], rh: [], rain: [], wind: [] };
  days.forEach((hours, d) =>
    hours.forEach((h) => {
      out.time.push(`2026-11-${String(16 + d).padStart(2, '0')}T${String(h.hour).padStart(2, '0')}:00`);
      out.temp.push(h.temp); out.rh.push(h.rh); out.rain.push(h.rain); out.wind.push(h.wind);
    })
  );
  return out;
}

test('crop stage: tomato moves through the four stages', () => {
  assert.equal(cropStage('tomato', '2026-11-16', '2026-11-16').stage, 'establish');
  const mid = cropStage('tomato', '2026-09-01', '2026-11-16'); // day 76
  assert.equal(mid.day, 76);
  assert.equal(mid.stage, 'peak');
  assert.equal(mid.kc, 1.15);
  assert.equal(mid.daysLeft, 145 - 76);
  const done = cropStage('tomato', '2026-01-01', '2026-11-16');
  assert.equal(done.done, true);
  assert.equal(done.progress, 1);
});

test('crop stage: Kc climbs during the growing stage', () => {
  const early = cropStage('wheat', '2026-11-01', '2026-11-17'); // day 16, just into "grow"
  const late = cropStage('wheat', '2026-11-01', '2026-12-09'); // day 38, near the end of "grow"
  assert.equal(early.stage, 'grow');
  assert.ok(early.kc < late.kc && late.kc < 1.15);
});

test('crop stage: unknown crop, missing or future date gives null', () => {
  assert.equal(cropStage('dragonfruit', '2026-11-01', '2026-11-16'), null);
  assert.equal(cropStage('tomato', '', '2026-11-16'), null);
  assert.equal(cropStage('tomato', '2026-12-01', '2026-11-16'), null);
});

test('water need: ET0 x Kc minus useful rain', () => {
  const w = { daily: [{ et0: 5, rainMm: 0 }, { et0: 5, rainMm: 1 }, { et0: 4, rainMm: 8 }] };
  const n = waterNeed(w, 1.0);
  assert.equal(n.useMm, 14);
  assert.equal(n.rainMm, 6); // only the 8 mm day counts, at 75%
  assert.equal(n.needMm, 8);
  assert.equal(waterNeed({ daily: [{ et0: 2, rainMm: 30 }] }, 1).needMm, 0); // never negative
  assert.equal(waterNeed({ daily: [] }, 1), null);
});

test('late blight: cool and wet is high risk, hot or dry is low', () => {
  assert.equal(threatLevel('lateBlight', day(16, 95)), 2);
  assert.equal(threatLevel('lateBlight', day(16, 60)), 0);
  assert.equal(threatLevel('lateBlight', day(33, 95)), 0);
  const eightWetHours = day(16, 60).map((h) => (h.hour < 8 ? { ...h, rh: 93 } : h));
  assert.equal(threatLevel('lateBlight', eightWetHours), 1);
});

test('powdery mildew likes dry days, whitefly likes hot dry days, downy needs rain', () => {
  assert.equal(threatLevel('powdery', day(24, 78)), 1); // warm, dry, fairly humid: medium
  const humidNights = day(24, 60).map((h) => (h.hour < 6 ? { ...h, rh: 85 } : h));
  assert.equal(threatLevel('powdery', humidNights), 2);
  assert.equal(threatLevel('powdery', day(24, 82, 1)), 0); // rain washes it off
  assert.equal(threatLevel('whitefly', day(35, 40)), 2);
  assert.equal(threatLevel('whitefly', day(26, 40)), 0);
  assert.equal(threatLevel('downy', day(18, 70, 0.6)), 2); // 14 mm of rain at 18 C
});

test('risk outlook: picks the worst threat per day and the top threat overall', () => {
  const w = { hourly: hourly([day(30, 40), day(16, 95), day(16, 95)]) };
  const r = riskOutlook('tomato', w);
  assert.deepEqual(r.days.map((d) => d.level), [1, 2, 2]);
  assert.equal(r.days[0].threat, 'whitefly');
  assert.equal(r.top.id, 'lateBlight');
  assert.equal(r.top.peakDay, 1);
  assert.equal(riskOutlook('dragonfruit', w).peak, 0);
});

test('spray window: skips windy and rainy slots, only mornings and evenings', () => {
  const calm = day(22, 60);
  const windy = day(22, 60, 0, 25);
  const w = { hourly: hourly([windy, calm]) };
  const s = sprayWindow(w, '2026-11-16T05:00');
  assert.deepEqual({ date: s.date, hour: s.hour, dayOffset: s.dayOffset }, { date: '2026-11-17', hour: 6, dayOffset: 1 });
  // Rain at 08:00 rules out 06:00 and 07:00 (must stay dry for 6 hours); evening is fine.
  const rainAt8 = calm.map((h) => (h.hour === 8 ? { ...h, rain: 3 } : h));
  assert.equal(sprayWindow({ hourly: hourly([rainAt8]) }, '2026-11-16T05:00').hour, 9);
  assert.equal(sprayWindow({ hourly: hourly([windy]) }, '2026-11-16T05:00'), null);
  assert.equal(sprayWindow({ hourly: hourly([calm]) }, '2026-11-16T12:00').hour, 16); // past slots are skipped
});

test('farm insights: one entry per crop, with water only when the sowing date is known', () => {
  const w = { daily: [{ et0: 5, rainMm: 0 }], hourly: hourly([day(16, 95)]) };
  const out = farmInsights({ crops: ['tomato', 'rice', 'dragonfruit'], sown: { tomato: '2026-09-01' } }, w, '2026-11-16');
  assert.equal(out[0].water.needMm, 5.8); // 5 x 1.15
  assert.equal(out[0].risk.peak, 2);
  assert.equal(out[1].stage, null);
  assert.equal(out[1].flooded, true);
  assert.equal(out[2].known, false);
});
