# დედლაინის შემხსენებელი (Email + Telegram)

სტრუქტურა: `backend/` (API + ბოტი + cron), `frontend/` (ადმინის პანელი). ცვლადების ნიმუში: `backend/.env.example`, `frontend/.env.example`.

## GitHub-ზე ატვირთვა
```
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<შენი-სახელი>/<repo>.git
git push -u origin main
```
`.env` ფაილები არ ატვირთება (`.gitignore`). საიდუმლოებები მხოლოდ Railway Variables-ში შეინახე.

## Railway-ზე გაშვება (ერთი პროექტი, 4 სერვისი)
1. **PostgreSQL** — New → Database → PostgreSQL.
2. **backend** — New → GitHub Repo, Root Directory: `backend`. Variables:
   `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
   `FRONTEND_URL` (frontend-ის ბმული), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`,
   `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Generate Domain.
3. **frontend** — Root Directory: `frontend`, Variable: `API_URL=https://<backend-domain>`. Generate Domain.
4. **cron** — იგივე repo, Root Directory: `backend`, იგივე Variables, Start Command: `npm run cron`,
   Cron Schedule: `0 5 * * *` (09:00 თბილისის დროით).

## Telegram
@BotFather → /newbot → ტოკენი. ადმინის პანელში თითო მომხმარებელს აქვს ბმული; მომხმარებელი აჭერს და ბოტი ავტომატურად აკავშირებს.

## ლოკალურად
backend: `DATABASE_URL=... ADMIN_EMAIL=a@a.ge ADMIN_PASSWORD=123 npm i && npm start`
frontend: `npm i && npm start`
