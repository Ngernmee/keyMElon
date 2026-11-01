const crypto = require('crypto');

const DB_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const DB_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const DAY = 86400000;

/* ---------- Redis (Upstash REST) ---------- */
async function call(path, body) {
  if (!DB_URL || !DB_TOKEN) throw new Error('ยังไม่ได้ตั้งค่าฐานข้อมูล (UPSTASH_REDIS_REST_URL / TOKEN)');
  const r = await fetch(DB_URL + path, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + DB_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok || (j && j.error)) throw new Error((j && j.error) || 'database error');
  return j;
}
async function redis(cmd) { return (await call('', cmd)).result; }
async function pipeline(cmds) {
  if (!cmds.length) return [];
  const res = await call('/pipeline', cmds);
  return res.map((x) => {
    if (x.error) throw new Error(x.error);
    return x.result;
  });
}
const parse = (v) => { try { return v ? JSON.parse(v) : null; } catch { return null; } };

/* ---------- Response helpers ---------- */
function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(obj));
}
function wrap(fn) {
  return async (req, res) => {
    try { await fn(req, res); }
    catch (e) { json(res, 500, { error: e.message || 'server error' }); }
  };
}

/* ---------- Auth (admin cookie) ---------- */
const secret = () => process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || '';
const sign = (v) => crypto.createHmac('sha256', secret()).update(v).digest('hex');
const sha = (v) => crypto.createHash('sha256').update(String(v)).digest();

function checkPassword(input) {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) return false;
  return crypto.timingSafeEqual(sha(input), sha(real));
}
function makeSession() {
  const exp = String(Date.now() + 7 * DAY);
  return exp + '.' + sign(exp);
}
function cookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function isAuthed(req) {
  if (!secret()) return false;
  const c = cookies(req).session;
  if (!c) return false;
  const [exp, sig] = c.split('.');
  if (!exp || !sig) return false;
  const good = sign(exp);
  if (sig.length !== good.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return false;
  return Number(exp) > Date.now();
}
function requireAuth(req, res) {
  if (isAuthed(req)) return true;
  json(res, 401, { error: 'กรุณาเข้าสู่ระบบ' });
  return false;
}

/* ---------- Keys ---------- */
function genKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () => Array.from({ length: 4 }, () => chars[crypto.randomInt(chars.length)]).join('');
  return [part(), part(), part(), part()].join('-');
}
const genId = () => crypto.randomBytes(5).toString('hex');

// สถานะของคีย์: ยังไม่ใช้ (ยังไม่เริ่มนับ) / ใช้งานอยู่ / หมดอายุ
function timeInfo(k, now = Date.now()) {
  if (!k.expiresAt) return { state: 'unused', days_left: k.days, hours_left: k.days * 24 };
  const ms = k.expiresAt - now;
  if (ms <= 0) return { state: 'expired', days_left: 0, hours_left: 0 };
  return { state: 'active', days_left: Math.ceil(ms / DAY), hours_left: Math.ceil(ms / 3600000) };
}

module.exports = {
  DAY, redis, pipeline, parse, json, wrap, checkPassword, makeSession,
  isAuthed, requireAuth, genKey, genId, timeInfo,
};
