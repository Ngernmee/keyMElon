const { json, wrap, checkPassword, makeSession, isAuthed } = require('../lib/common');

module.exports = wrap(async (req, res) => {
  if (req.method === 'GET') return json(res, 200, { authed: isAuthed(req) });

  if (req.method === 'POST') {
    if (!process.env.ADMIN_PASSWORD) {
      return json(res, 500, { error: 'ยังไม่ได้ตั้ง ADMIN_PASSWORD ใน Environment Variables' });
    }
    const { password } = req.body || {};
    if (!password || !checkPassword(password)) {
      await new Promise((r) => setTimeout(r, 500));
      return json(res, 401, { error: 'รหัสผ่านไม่ถูกต้อง' });
    }
    res.setHeader('Set-Cookie', `session=${makeSession()}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`);
    return json(res, 200, { ok: true });
  }

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
    return json(res, 200, { ok: true });
  }
  json(res, 405, { error: 'method not allowed' });
});
