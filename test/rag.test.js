import { test } from 'node:test';
import assert from 'node:assert/strict';
import { retrieve } from '../lib/rag.js';

const top = (q, opts) => retrieve(q, opts)[0]?.id;

test('finds the right guide for common questions', () => {
  assert.equal(top('my tomato leaves have yellow patches with brown rings'), 'tomato-early-blight');
  assert.equal(top('white powder on grape leaves'), 'powdery-downy-mildew');
  assert.equal(top('holes in maize whorl caterpillar'), 'maize-fall-armyworm');
  assert.equal(top('pink worms inside cotton bolls'), 'cotton-pink-bollworm');
  assert.equal(top('should I spray before rain, when to irrigate'), 'irrigation-weather');
  assert.equal(top('yellow stripes powder on wheat leaves'), 'wheat-rust');
  assert.equal(top('rice plants drying in circles hopper burn'), 'rice-bph');
});

test('understands Hindi crop words', () => {
  assert.ok(retrieve('टमाटर झुलसा रोग').some((g) => g.id.startsWith('tomato')));
  assert.equal(top('प्याज पर कीट'), 'onion-thrips-blotch');
});

test('returns nothing for off-topic questions', () => {
  assert.deepEqual(retrieve('what is the capital of france'), []);
});
