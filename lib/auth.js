// Simple password lock for the whole app.
// Set ACCESS_PASSWORD (e.g. on Vercel). If it's not set, the app is open (handy for local testing).
// After the right password, the browser gets a secure cookie, valid for 30 days.

import crypto from 'node:crypto';

const COOKIE = 'fm_auth';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export const passwordRequired = () => Boolean(process.env.ACCESS_PASSWORD);

function token() {
  // Changes whenever the password changes, so old cookies stop working.
  return crypto
    .createHmac('sha256', `${process.env.ACCESS_PASSWORD}|${process.env.GEMINI_API_KEY || ''}`)
    .update('farmermate-session-v1')
    .digest('hex');
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function readCookie(req, name) {
  const header = req.headers?.cookie || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return '';
}

export function isAuthed(req) {
  if (!passwordRequired()) return true;
  return safeEqual(readCookie(req, COOKIE), token());
}

export function checkPassword(attempt) {
  return passwordRequired() && safeEqual(String(attempt || '').trim().toLowerCase(), process.env.ACCESS_PASSWORD.trim().toLowerCase());
}

export function setAuthCookie(req, res) {
  const secure = (req.headers?.['x-forwarded-proto'] || '').includes('https') ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${token()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`);
}

export class Unauthorized extends Error {
  constructor() {
    super('Please enter the password first.');
    this.status = 401;
  }
}

export function requireAuth(req) {
  if (!isAuthed(req)) throw new Unauthorized();
}
