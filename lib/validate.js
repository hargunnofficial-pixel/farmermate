// Input checks so nobody can send huge or broken requests to the API.

const MAX_TEXT = 2000;
const MAX_MESSAGES = 12;
const MAX_IMAGE_BASE64 = 4_000_000; // ~3 MB image; the app compresses photos well below this
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export class BadRequest extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

export function cleanProfile(p) {
  p = p && typeof p === 'object' ? p : {};
  return {
    location: typeof p.location === 'string' ? p.location.slice(0, 120) : '',
    crops: Array.isArray(p.crops) ? p.crops.filter((c) => typeof c === 'string').slice(0, 10).map((c) => c.slice(0, 40)) : [],
    lang: p.lang === 'hi' ? 'hi' : 'en',
  };
}

export function cleanImage(img) {
  if (!img) return null;
  if (typeof img !== 'object' || typeof img.data !== 'string' || !IMAGE_TYPES.has(img.mimeType)) {
    throw new BadRequest('Image must be a JPEG, PNG or WebP.');
  }
  const data = img.data.replace(/^data:[^,]+,/, '');
  if (data.length > MAX_IMAGE_BASE64) throw new BadRequest('Image is too large. Try a smaller photo.');
  if (!/^[A-Za-z0-9+/=]+$/.test(data)) throw new BadRequest('Image data is not valid.');
  return { mimeType: img.mimeType, data };
}

export function cleanMessages(messages) {
  if (!Array.isArray(messages) || !messages.length) throw new BadRequest('No message sent.');
  const recent = messages.slice(-MAX_MESSAGES);
  const out = recent.map((m, i) => {
    if (!m || typeof m !== 'object') throw new BadRequest('Bad message format.');
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const text = typeof m.text === 'string' ? m.text.slice(0, MAX_TEXT) : '';
    // Only the newest message may carry a photo, to keep requests small.
    const image = i === recent.length - 1 ? cleanImage(m.image) : null;
    if (!text.trim() && !image) throw new BadRequest('Message is empty.');
    return { role, text, image };
  });
  if (out[out.length - 1].role !== 'user') throw new BadRequest('Last message must be from the user.');
  // Gemini wants the conversation to start with a user turn.
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}
