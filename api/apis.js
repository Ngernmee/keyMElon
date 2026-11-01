const { redis, pipeline, parse, json, wrap, requireAuth, genId } = require('../lib/common');

module.exports = wrap(async (req, res) => {
  if (!requireAuth(req, res)) return;

  if (req.method === 'GET') {
    const ids = await redis(['SMEMBERS', 'apis']);
    if (!ids.length) return json(res, 200, { apis: [] });
    const rows = await pipeline([
      ['MGET', ...ids.map((i) => 'api:' + i)],
      ...ids.map((i) => ['SCARD', 'apikeys:' + i]),
    ]);
    const apis = rows[0]
      .map((v, idx) => {
        const a = parse(v);
        return a ? { ...a, keyCount: rows[idx + 1] } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.createdAt - a.createdAt);
    return json(res, 200, { apis });
  }

  if (req.method === 'POST') {
    const name = String((req.body || {}).name || '').trim();
    if (!name || name.length > 40) return json(res, 400, { error: 'ชื่อ API ต้องยาว 1–40 ตัวอักษร' });
    const api = { id: genId(), name, createdAt: Date.now() };
    await pipeline([
      ['SET', 'api:' + api.id, JSON.stringify(api)],
      ['SADD', 'apis', api.id],
    ]);
    return json(res, 200, { api: { ...api, keyCount: 0 } });
  }

  if (req.method === 'PATCH') {
    const { id } = req.body || {};
    const name = String((req.body || {}).name || '').trim();
    if (!name || name.length > 40) return json(res, 400, { error: 'ชื่อ API ต้องยาว 1–40 ตัวอักษร' });
    const api = parse(await redis(['GET', 'api:' + id]));
    if (!api) return json(res, 404, { error: 'ไม่พบ API' });
    api.name = name;
    await redis(['SET', 'api:' + id, JSON.stringify(api)]);
    return json(res, 200, { api });
  }

  if (req.method === 'DELETE') {
    const id = String(req.query.id || '');
    const keys = await redis(['SMEMBERS', 'apikeys:' + id]);
    await pipeline([
      ...keys.map((k) => ['DEL', 'key:' + k]),
      ['DEL', 'apikeys:' + id],
      ['DEL', 'api:' + id],
      ['SREM', 'apis', id],
    ]);
    return json(res, 200, { ok: true });
  }

  json(res, 405, { error: 'method not allowed' });
});
