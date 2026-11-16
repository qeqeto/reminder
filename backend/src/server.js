const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool, init } = require('./db');
const { startBot } = require('./bot');
const { runReminders } = require('./cron');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || true }));
app.use(express.json());
const SECRET = process.env.JWT_SECRET || 'change-me';

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD)
    return res.json({ token: jwt.sign({ admin: true }, SECRET, { expiresIn: '7d' }) });
  res.status(401).json({ error: 'არასწორი მონაცემები' });
});

app.use('/api', (req, res, next) => {
  try { jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET); next(); }
  catch { res.status(401).json({ error: 'საჭიროა შესვლა' }); }
});

const wrap = fn => (req, res) => fn(req, res).catch(e => res.status(500).json({ error: e.message }));

// --- მომხმარებლები ---
app.get('/api/users', wrap(async (_, res) => {
  const { rows } = await pool.query('SELECT id,name,email,link_code,(telegram_chat_id IS NOT NULL) tg FROM users ORDER BY name');
  res.json({ users: rows, bot: process.env.TELEGRAM_BOT_USERNAME || null });
}));
app.post('/api/users', wrap(async (req, res) => {
  const { name, email } = req.body;
  const { rows } = await pool.query('INSERT INTO users (name,email,link_code) VALUES ($1,$2,$3) RETURNING *',
    [name, email || null, crypto.randomBytes(5).toString('hex')]);
  res.json(rows[0]);
}));
app.delete('/api/users/:id', wrap(async (req, res) => {
  await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]); res.json({ ok: true });
}));

// --- დოკუმენტები (ერთს რამდენიმე მომხმარებელი) ---
app.get('/api/documents', wrap(async (_, res) => {
  const { rows } = await pool.query(`
    SELECT d.id,d.title,d.deadline::text deadline,d.remind_days,
      COALESCE(array_agg(du.user_id) FILTER (WHERE du.user_id IS NOT NULL),'{}') user_ids
    FROM documents d LEFT JOIN document_users du ON du.document_id=d.id
    GROUP BY d.id ORDER BY d.deadline`);
  res.json(rows);
}));
async function save(id, { title, deadline, remind_days, user_ids = [] }) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    if (id) await c.query('UPDATE documents SET title=$1,deadline=$2,remind_days=$3 WHERE id=$4', [title, deadline, remind_days, id]);
    else id = (await c.query('INSERT INTO documents (title,deadline,remind_days) VALUES ($1,$2,$3) RETURNING id', [title, deadline, remind_days])).rows[0].id;
    await c.query('DELETE FROM document_users WHERE document_id=$1', [id]);
    for (const u of user_ids) await c.query('INSERT INTO document_users VALUES ($1,$2)', [id, u]);
    await c.query('COMMIT'); return id;
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}
app.post('/api/documents', wrap(async (req, res) => res.json({ id: await save(null, req.body) })));
app.put('/api/documents/:id', wrap(async (req, res) => res.json({ id: await save(req.params.id, req.body) })));
app.delete('/api/documents/:id', wrap(async (req, res) => {
  await pool.query('DELETE FROM documents WHERE id=$1', [req.params.id]); res.json({ ok: true });
}));

// ხელით გაშვება (ტესტისთვის)
app.post('/api/run-reminders', wrap(async (_, res) => res.json({ log: await runReminders() })));

init().then(() => {
  app.listen(process.env.PORT || 3000, () => console.log('API მზადაა'));
  startBot();
});
