// Retrieval for RAG (retrieval-augmented generation).
// Finds the guides most relevant to a question using BM25, the classic ranking
// formula behind search engines. Runs locally, free, no extra API calls.

import { GUIDES } from './knowledge.js';

const STOPWORDS = new Set(
  'a an and are as at be but by can do does for from has have how i in is it its my of on or so that the their them then there these they this to was what when where which who why will with you your me we our should would could there my'.split(' ')
);

// Common Hindi farm words mapped to English so Hindi questions still find guides.
const HINDI_MAP = {
  'टमाटर': 'tomato', 'आलू': 'potato', 'गेहूं': 'wheat', 'गेहूँ': 'wheat', 'धान': 'rice', 'चावल': 'rice',
  'प्याज': 'onion', 'कपास': 'cotton', 'मक्का': 'maize', 'पत्ती': 'leaf', 'पत्ते': 'leaves', 'पत्तियां': 'leaves',
  'पत्तियाँ': 'leaves', 'पीली': 'yellow', 'पीले': 'yellow', 'धब्बे': 'spots', 'कीड़े': 'pest insect', 'कीट': 'pest insect',
  'पानी': 'water irrigation', 'सिंचाई': 'irrigation', 'बारिश': 'rain', 'खाद': 'fertilizer', 'मिट्टी': 'soil',
  'रोग': 'disease', 'बीमारी': 'disease', 'छिड़काव': 'spray', 'दवा': 'pesticide spray', 'फफूंद': 'fungus fungal',
  'सुंडी': 'caterpillar larva', 'इल्ली': 'caterpillar larva', 'झुलसा': 'blight', 'सफेद': 'white', 'मक्खी': 'fly whitefly',
};

export function tokenize(text) {
  let t = String(text || '').toLowerCase();
  for (const [hi, en] of Object.entries(HINDI_MAP)) t = t.split(hi).join(` ${en} `);
  return t
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map(stem);
}

// Very light stemming so "leaves"/"leaf", "spots"/"spot", "spraying"/"spray" match.
function stem(w) {
  if (w === 'leaves') return 'leaf';
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 3 && w.endsWith('es') && !w.endsWith('ses')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

// Build the index once when the server starts.
const DOCS = GUIDES.map((g) => {
  const tokens = tokenize(`${g.title} ${g.title} ${g.crops.join(' ')} ${g.text}`);
  const tf = new Map();
  for (const tok of tokens) tf.set(tok, (tf.get(tok) || 0) + 1);
  return { guide: g, tf, len: tokens.length };
});
const AVG_LEN = DOCS.reduce((s, d) => s + d.len, 0) / DOCS.length;
const DF = new Map();
for (const d of DOCS) for (const tok of d.tf.keys()) DF.set(tok, (DF.get(tok) || 0) + 1);

function bm25(queryTokens, doc, k1 = 1.4, b = 0.75) {
  let score = 0;
  for (const q of new Set(queryTokens)) {
    const f = doc.tf.get(q);
    if (!f) continue;
    const n = DF.get(q) || 0;
    const idf = Math.log(1 + (DOCS.length - n + 0.5) / (n + 0.5));
    score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * doc.len) / AVG_LEN)));
  }
  return score;
}

/**
 * Return the top guides for a question.
 * @param {string} query
 * @param {object} [opts]
 * @param {string[]} [opts.crops] - the farmer's crops; matching guides get a boost
 * @param {number} [opts.k]
 */
export function retrieve(query, { crops = [], k = 3, minScore = 1.0 } = {}) {
  const q = tokenize(query);
  if (!q.length) return [];
  const cropSet = new Set(crops.map((c) => String(c).toLowerCase()));
  return DOCS.map((d) => {
    let score = bm25(q, d);
    if (score > 0 && d.guide.crops.some((c) => cropSet.has(c))) score *= 1.25;
    return { guide: d.guide, score };
  })
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((r) => ({ ...r.guide, score: Number(r.score.toFixed(2)) }));
}
