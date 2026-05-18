const express  = require("express");
const Database = require("better-sqlite3");

const app  = express();
const FLAG = process.env.FLAG ?? "prehackFlag{test}";

app.use(express.urlencoded({ extended: false }));

// قاعدة بيانات في الذاكرة — نفس الشيء لكل المستخدمين
const db = new Database(":memory:");
db.exec(`
  CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, role TEXT);
  CREATE TABLE secrets (id INTEGER PRIMARY KEY, flag TEXT);
  INSERT INTO users VALUES (1,'admin','supersecret123','admin');
  INSERT INTO users VALUES (2,'guest','guest','user');
  INSERT INTO secrets VALUES (1,'${FLAG}');
`);

const page = (body) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>SecureBank</title>
<style>
  body{font-family:sans-serif;background:#f0f4f8;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
  .box{background:#fff;padding:40px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.1);width:340px}
  h2{margin:0 0 20px;text-align:center}
  input{width:100%;padding:10px;border:1.5px solid #ddd;border-radius:8px;margin-bottom:12px;font-size:14px;box-sizing:border-box}
  button{width:100%;padding:11px;background:#4f46e5;color:#fff;border:none;border-radius:8px;font-size:15px;cursor:pointer}
  .err{background:#fff0f0;color:#c62828;padding:10px;border-radius:8px;margin-bottom:12px;font-size:13px}
  .ok{background:#f0fff4;color:#276749;padding:12px;border-radius:8px;margin-bottom:12px;font-size:13px;word-break:break-all}
  .hint{font-size:11px;color:#999;text-align:center;margin-top:12px}
</style></head>
<body><div class="box"><h2>🏦 SecureBank</h2>${body}</div></body></html>`;

app.get("/", (_req, res) => res.send(page(`
  <form method="POST">
    <input name="username" placeholder="Username" autocomplete="off"/>
    <input type="password" name="password" placeholder="Password"/>
    <button>Login</button>
  </form>
  <p class="hint">Hint: something is hidden in the database…</p>
`)));

app.post("/", (req, res) => {
  const { username, password } = req.body;

  // VULNERABLE — SQL Injection
  let user;
  try {
    user = db.prepare(`SELECT * FROM users WHERE username='${username}' AND password='${password}'`).get();
  } catch (e) {
    res.send(page(`<div class="err">SQL Error: ${e.message}</div><a href="/">← Back</a>`));
    return;
  }

  if (!user) {
    res.send(page(`<div class="err">❌ Wrong credentials.</div><a href="/">← Back</a>`));
    return;
  }

  if (user.role === "admin") {
    const row = db.prepare("SELECT flag FROM secrets LIMIT 1").get();
    res.send(page(`<div class="ok">✅ Welcome Admin!<br><br><strong>Flag:</strong><br><code>${row?.flag}</code></div><a href="/">← Back</a>`));
  } else {
    res.send(page(`<div class="ok">Welcome ${user.username} — but you're not admin.</div><a href="/">← Back</a>`));
  }
});

app.listen(process.env.PORT ?? 3000, () => console.log("web-sqli running"));
