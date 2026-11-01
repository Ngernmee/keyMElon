const { redis, pipeline, parse, json, wrap, requireAuth, genKey, timeInfo } = require('../lib/common');

module.exports = wrap(async (req, res) => {
  if (!requireAuth(req, res)) return;

  if (req.method === 'GET') {
    const apiId = String(req.query.apiId || '');
    const api = parse(await redis(['GET', 'api:' + apiId]));
    if (!api) return json(res, 404, { error: 'ไม่พบ API' });
    const ids = await redis(['SMEMBERS', 'apikeys:' + apiId]);
    let keys = [];
    if (ids.length) {
      const rows = await redis(['MGET', ...ids.map((k) => 'key:' + k)]);
      keys = rows.map(parse).filter(Boolean).map((k) => ({ ...k, ...timeInfo(k) }));
      keys.sort((a, b) => b.createdAt - a.createdAt);
    }
    return json(res, 200, { api, keys });
  }

  if (req.method === 'POST') {
    const { apiId } = req.body || {};
    const days = Math.floor(Number((req.body || {}).days));
    const count = Math.floor(Number((req.body || {}).count || 1));
    if (!(days >= 1 && days <= 36500)) return json(res, 400, { error: 'จำนวนวันต้องอยู่ระหว่าง 1–36500' });
    if (!(count >= 1 && count <= 50)) return json(res, 400, { error: 'สร้างได้ครั้งละ 1–50 คีย์' });
    const api = parse(await redis(['GET', 'api:' + apiId]));
    if (!api) return json(res, 404, { error: 'ไม่พบ API' });

    const now = Date.now();
    const keys = Array.from({ length: count }, () => ({
      key: genKey(), apiId, days, createdAt: now, activatedAt: null, expiresAt: null,
    }));
    await pipeline([
      ...keys.map((k) => ['SET', 'key:' + k.key, JSON.stringify(k)]),
      ['SADD', 'apikeys:' + apiId, ...keys.map((k) => k.key)],
    ]);
    return json(res, 200, { keys: keys.map((k) => ({ ...k, ...timeInfo(k) })) });
  }

  if (req.method === 'DELETE') {
    const key = String(req.query.key || '');
    const k = parse(await redis(['GET', 'key:' + key]));
    if (!k) return json(res, 404, { error: 'ไม่พบคีย์' });
    await pipeline([['DEL', 'key:' + key], ['SREM', 'apikeys:' + k.apiId, key]]);
    return json(res, 200, { ok: true });
  }

  json(res, 405, { error: 'method not allowed' });
});
