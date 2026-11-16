// End-to-end tests for the API routes, using a fake Gemini server.
// Run: npm test
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { resetCooldowns } from '../lib/gemini.js';

let fake;
let lastRequest = null;
let lastModel = '';
let mode = 'ok';

before(async () => {
  fake = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      lastRequest = JSON.parse(raw);
      lastModel = req.url;
      modelsCalled.push(req.url.split('/models/')[1].split(':')[0]);
      res.setHeader('Content-Type', 'application/json');
      if (mode === '404' && req.url.includes(PRIMARY)) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ error: { message: 'model not found' } }));
      }
      if ((mode === '503-primary' && req.url.includes(PRIMARY)) || mode === '503-all') {
        res.statusCode = 503;
        return res.end(JSON.stringify({ error: { message: 'This model is currently experiencing high demand.' } }));
      }
      if (mode === '429' || (mode === '429-lite' && req.url.includes('lite'))) {
        res.statusCode = 429;
        return res.end(JSON.stringify({ error: { message: 'quota' } }));
      }
      if (mode === '429-daily') {
        res.statusCode = 429;
        return res.end(JSON.stringify({ error: { message: 'Quota exceeded', details: [{ violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] }, { retryDelay: '40s' }] } }));
      }
      if (mode === 'bad-key') {
        res.statusCode = 403;
        return res.end(JSON.stringify({ error: { message: 'Your API key was reported as leaked. Please use another API key.' } }));
      }
      if (mode === 'thoughts') {
        return res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'secret reasoning', thought: true }, { text: 'Real answer.' }] } }] }));
      }
      const text = lastRequest.generationConfig.responseMimeType
        ? JSON.stringify({
            isPlant: true, plant: 'Tomato', issue: 'Early blight', scientificName: 'Alternaria solani', category: 'fungus',
            severity: 'action', confidence: 'high', description: 'Ringed spots.', steps: ['Remove leaves', 'Spray'], prevention: 'Mulch.',
          })
        : 'Sounds like early blight.\nSource: Tomato: early blight';
      res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }));
    });
  });
  await new Promise((r) => fake.listen(0, r));
  process.env.GEMINI_BASE_URL = `http://127.0.0.1:${fake.address().port}`;
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.GEMINI_RETRY_DELAY_MS = '0';
});
const modelsCalled = [];
after(() => fake.close());
beforeEach(() => resetCooldowns());
const PRIMARY = 'gemini-3.5-flash-lite';

function call(handler, body, method = 'POST') {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      end(s) { resolve({ status: this.statusCode, body: JSON.parse(s) }); },
    };
    handler({ method, body }, res);
  });
}

const weather = {
  current: { temp: 29, humidity: 85, wind: 8, condition: 'Partly cloudy' },
  daily: [{ date: '2026-11-04', min: 20, max: 30, condition: 'Rain', rainMm: 12, rainChance: 80, wind: 10 }],
};
const profile = { location: 'Nashik, Maharashtra', crops: ['Tomato'], lang: 'en' };

test('chat: answers, adds weather + matching guide to the hidden prompt', async () => {
  mode = 'ok';
  const { default: chat } = await import('../api/chat.js');
  const r = await call(chat, {
    messages: [{ role: 'user', text: 'My tomato leaves have brown spots with rings' }],
    profile,
    weather,
  });
  assert.equal(r.status, 200);
  assert.match(r.body.reply, /early blight/);
  assert.equal(r.body.sources[0].id, 'tomato-early-blight');
  const sys = lastRequest.systemInstruction.parts[0].text;
  assert.match(sys, /Nashik/);
  assert.match(sys, /rain 12 mm/);
  assert.match(sys, /Alternaria solani/); // guide text was injected (RAG)
  assert.equal(lastRequest.contents[0].role, 'user');
});

test('chat: Hindi mode tells Gemini to answer in Hindi', async () => {
  const { default: chat } = await import('../api/chat.js');
  await call(chat, { messages: [{ role: 'user', text: 'टमाटर की पत्तियां पीली' }], profile: { ...profile, lang: 'hi' }, weather });
  assert.match(lastRequest.systemInstruction.parts[0].text, /Devanagari/);
});

test('chat: sends photo to Gemini and maps assistant turns to "model"', async () => {
  const { default: chat } = await import('../api/chat.js');
  const r = await call(chat, {
    messages: [
      { role: 'user', text: 'hi' },
      { role: 'assistant', text: 'hello' },
      { role: 'user', text: 'look', image: { mimeType: 'image/jpeg', data: 'aGVsbG8=' } },
    ],
    profile,
  });
  assert.equal(r.status, 200);
  assert.deepEqual(lastRequest.contents.map((c) => c.role), ['user', 'model', 'user']);
  assert.equal(lastRequest.contents[2].parts[0].inline_data.data, 'aGVsbG8=');
});

test('chat: rejects bad input', async () => {
  const { default: chat } = await import('../api/chat.js');
  assert.equal((await call(chat, {})).status, 400);
  assert.equal((await call(chat, { messages: [{ role: 'user', text: '  ' }] })).status, 400);
  assert.equal((await call(chat, { messages: [{ role: 'user', text: 'x', image: { mimeType: 'text/html', data: 'aa' } }] })).status, 400);
  assert.equal((await call(chat, {}, 'GET')).status, 405);
});

test('scan: returns structured diagnosis + source guide', async () => {
  mode = 'ok';
  const { default: scan } = await import('../api/scan.js');
  const r = await call(scan, { image: { mimeType: 'image/jpeg', data: 'aGVsbG8=' }, crop: 'Tomato', profile, weather });
  assert.equal(r.status, 200);
  assert.equal(r.body.result.issue, 'Early blight');
  assert.equal(r.body.source.id, 'tomato-early-blight');
  assert.ok(lastRequest.generationConfig.responseSchema);
});

test('scan: needs a photo', async () => {
  const { default: scan } = await import('../api/scan.js');
  assert.equal((await call(scan, { crop: 'Tomato' })).status, 400);
});

test('retired model: moves on to the next model in the list', async () => {
  mode = '404';
  const { default: chat } = await import('../api/chat.js');
  const r = await call(chat, { messages: [{ role: 'user', text: 'hello' }], profile });
  assert.equal(r.status, 200);
  assert.match(lastModel, /gemini-3\.1-flash-lite/);
});

test('out of quota on one model: the next model answers, and the empty one is skipped next time', async () => {
  mode = '429-lite';
  modelsCalled.length = 0;
  const { default: chat } = await import('../api/chat.js');
  const msg = { messages: [{ role: 'user', text: 'hello' }], profile };
  assert.equal((await call(chat, msg)).status, 200);
  assert.deepEqual(modelsCalled, ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash']);
  modelsCalled.length = 0;
  assert.equal((await call(chat, msg)).status, 200);
  assert.deepEqual(modelsCalled, ['gemini-3.8-flash']); // cooling-down models were not asked again
});

test('friendly message when every model is rate-limited', async () => {
  mode = '429';
  const { default: chat } = await import('../api/chat.js');
  const r = await call(chat, { messages: [{ role: 'user', text: 'hello' }], profile });
  assert.equal(r.status, 429);
  assert.match(r.body.error, /wait a minute/i);
});

test('daily quota used up: says so and when it resets', async () => {
  mode = '429-daily';
  const { default: chat } = await import('../api/chat.js');
  const r = await call(chat, { messages: [{ role: 'user', text: 'hello' }], profile });
  assert.equal(r.status, 429);
  assert.equal(r.body.dailyLimit, true);
  assert.match(r.body.error, /for today/);
});

test('blocked API key: one clear message, no pointless retries', async () => {
  mode = 'bad-key';
  modelsCalled.length = 0;
  const { default: chat } = await import('../api/chat.js');
  const r = await call(chat, { messages: [{ role: 'user', text: 'hello' }], profile });
  assert.equal(r.status, 500);
  assert.match(r.body.error, /rejected the Gemini API key/);
  assert.equal(modelsCalled.length, 1);
});

test('hides the model\'s private thinking from the answer', async () => {
  mode = 'thoughts';
  const { default: chat } = await import('../api/chat.js');
  const r = await call(chat, { messages: [{ role: 'user', text: 'hello' }], profile });
  assert.equal(r.body.reply, 'Real answer.');
});

test('leaf scans and photo questions use the vision model list', async () => {
  mode = 'ok';
  const { default: scan } = await import('../api/scan.js');
  const { default: chat } = await import('../api/chat.js');
  await call(scan, { image: { mimeType: 'image/jpeg', data: 'aGVsbG8=' }, crop: 'Tomato', profile });
  assert.match(lastModel, /gemini-3\.8-flash/);
  await call(chat, { messages: [{ role: 'user', text: 'look', image: { mimeType: 'image/jpeg', data: 'aGVsbG8=' } }], profile });
  assert.match(lastModel, /gemini-3\.8-flash/);
  await call(chat, { messages: [{ role: 'user', text: 'hello' }], profile });
  assert.match(lastModel, /gemini-3\.5-flash-lite/);
});

test('health check: reports which models work', async () => {
  mode = '404';
  const { default: health } = await import('../api/health.js');
  const quick = await callWith(health, { method: 'GET', url: '/api/health' });
  assert.equal(quick.body.keySet, true);
  assert.equal(quick.body.models, undefined);
  const deep = await callWith(health, { method: 'GET', url: '/api/health?deep=1' });
  assert.equal(deep.body.ok, true);
  assert.deepEqual(deep.body.models[0], { model: 'gemini-3.5-flash-lite', works: false, status: 404, message: 'model not found' });
  assert.equal(deep.body.models[1].works, true);
  mode = 'ok';
});

test('password lock: API refuses without the password, works after login', async () => {
  mode = 'ok';
  process.env.ACCESS_PASSWORD = 'farmer';
  try {
    const { default: chat } = await import('../api/chat.js');
    const { default: scan } = await import('../api/scan.js');
    const { default: login } = await import('../api/login.js');
    const msg = { messages: [{ role: 'user', text: 'hello' }], profile };

    const blocked = await call(chat, msg);
    assert.equal(blocked.status, 401);
    assert.equal(blocked.body.needLogin, true);
    assert.equal((await call(scan, { image: { mimeType: 'image/jpeg', data: 'aGVsbG8=' } })).status, 401);

    // wrong password
    const bad = await callWith(login, { method: 'POST', body: { password: 'nope' } });
    assert.equal(bad.status, 401);
    assert.equal(bad.headers['Set-Cookie'], undefined);

    // right password (any capitalisation) -> cookie
    const ok = await callWith(login, { method: 'POST', body: { password: 'Farmer' } });
    assert.equal(ok.status, 200);
    const cookie = ok.headers['Set-Cookie'].split(';')[0];
    assert.match(ok.headers['Set-Cookie'], /HttpOnly/);

    // fake cookie still blocked, real cookie works
    assert.equal((await callWith(chat, { method: 'POST', body: msg, headers: { cookie: 'fm_auth=abc' } })).status, 401);
    const allowed = await callWith(chat, { method: 'POST', body: msg, headers: { cookie } });
    assert.equal(allowed.status, 200);

    // session check endpoint
    const s1 = await callWith(login, { method: 'GET', body: {} });
    assert.deepEqual(s1.body, { required: true, authed: false });
    const s2 = await callWith(login, { method: 'GET', body: {}, headers: { cookie } });
    assert.deepEqual(s2.body, { required: true, authed: true });
  } finally {
    delete process.env.ACCESS_PASSWORD;
  }
});

function callWith(handler, req) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      end(s) { resolve({ status: this.statusCode, headers: this.headers, body: JSON.parse(s) }); },
    };
    handler({ headers: {}, ...req }, res);
  });
}

test('busy model: retries once, then switches to a backup model', async () => {
  mode = '503-primary';
  modelsCalled.length = 0;
  const { default: chat } = await import('../api/chat.js');
  const r = await call(chat, { messages: [{ role: 'user', text: 'hello' }], profile });
  assert.equal(r.status, 200);
  assert.deepEqual(modelsCalled, [PRIMARY, PRIMARY, 'gemini-3.1-flash-lite']);
});

test('all models busy: friendly "try again" message', async () => {
  mode = '503-all';
  modelsCalled.length = 0;
  const { default: chat } = await import('../api/chat.js');
  const r = await call(chat, { messages: [{ role: 'user', text: 'hello' }], profile });
  assert.equal(r.status, 503);
  assert.match(r.body.error, /very busy/);
  assert.equal(modelsCalled.length, 12); // 6 models x (try + 1 retry)
  mode = 'ok';
});
