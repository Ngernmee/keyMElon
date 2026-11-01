// endpoint สาธารณะ ให้สคริปต์ใน Roblox เรียก
// GET /api/verify?api=<API_ID>            -> คืนชื่อ API
// GET /api/verify?api=<API_ID>&key=<KEY>  -> ตรวจคีย์ + เหลือกี่วัน
const { redis, parse, json, wrap, DAY, timeInfo } = require('../lib/common');

module.exports = wrap(async (req, res) => {
  const apiId = String(req.query.api || '').toLowerCase();
  const key = String(req.query.key || '').trim().toUpperCase();

  if (!/^[a-f0-9]{10}$/.test(apiId)) return json(res, 200, { found: false, valid: false, message: 'API ID ไม่ถูกต้อง' });
  const api = parse(await redis(['GET', 'api:' + apiId]));
  if (!api) return json(res, 200, { found: false, valid: false, message: 'ไม่พบ API นี้' });

  const base = { found: true, api_name: api.name };
  if (!key) return json(res, 200, base);

  if (!/^[A-Z0-9-]{10,30}$/.test(key)) return json(res, 200, { ...base, valid: false, message: 'รูปแบบคีย์ไม่ถูกต้อง' });
  const k = parse(await redis(['GET', 'key:' + key]));
  if (!k || k.apiId !== apiId) return json(res, 200, { ...base, valid: false, message: 'ไม่พบคีย์นี้ใน API นี้' });

  // ใช้ครั้งแรก -> เริ่มนับวัน
  if (!k.expiresAt) {
    const now = Date.now();
    k.activatedAt = now;
    k.expiresAt = now + k.days * DAY;
    await redis(['SET', 'key:' + key, JSON.stringify(k)]);
  }

  const t = timeInfo(k);
  if (t.state === 'expired') return json(res, 200, { ...base, valid: false, message: 'คีย์นี้หมดอายุแล้ว' });

  json(res, 200, {
    ...base,
    valid: true,
    days_left: t.days_left,
    hours_left: t.hours_left,
    expires_at: new Date(k.expiresAt).toISOString(),
    message: 'คีย์ถูกต้อง',
  });
});
