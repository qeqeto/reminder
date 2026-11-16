// Telegram long-polling: მომხმარებელი წერს /start <კოდი> და ბოტი აკავშირებს მის ანგარიშს
const { pool } = require('./db');
const { sendTelegram, TG } = require('./notify');

async function startBot() {
  if (!process.env.TELEGRAM_BOT_TOKEN) return console.log('ბოტი გამორთულია (ტოკენი არ არის)');
  let offset = 0;
  while (true) {
    try {
      const r = await fetch(`${TG()}/getUpdates?timeout=30&offset=${offset}`);
      const { result = [] } = await r.json();
      for (const u of result) {
        offset = u.update_id + 1;
        const m = u.message;
        if (!m?.text) continue;
        const code = (m.text.match(/^\/start\s+(\S+)/) || [])[1];
        if (!code) { await sendTelegram(m.chat.id, 'გამარჯობა! გამოიყენე ბმული ადმინისგან: /start <კოდი>'); continue; }
        const { rows } = await pool.query(
          'UPDATE users SET telegram_chat_id=$1 WHERE link_code=$2 RETURNING name', [m.chat.id, code]);
        await sendTelegram(m.chat.id, rows[0]
          ? `${rows[0].name}, წარმატებით დაგაკავშირეთ ✅ შეხსენებებს აქ მიიღებ.`
          : 'კოდი ვერ მოიძებნა.');
      }
    } catch (e) { console.error('bot error', e.message); await new Promise(r => setTimeout(r, 5000)); }
  }
}
module.exports = { startBot };
