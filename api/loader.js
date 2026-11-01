// GET /api/loader?api=<API_ID>  -> สคริปต์ Lua ที่ใส่ API_ID และ SERVER ให้แล้ว
const { wrap, json } = require('../lib/common');
const template = require('../lib/luaTemplate');

module.exports = wrap(async (req, res) => {
  const apiId = String(req.query.api || '').toLowerCase();
  if (!/^[a-f0-9]{10}$/.test(apiId)) return json(res, 400, { error: 'API ID ไม่ถูกต้อง' });
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const lua = template
    .replace('PUT_API_ID_HERE', apiId)
    .replace('https://YOUR-SITE.vercel.app', 'https://' + host);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(lua);
});
