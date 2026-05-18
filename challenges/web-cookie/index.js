const express = require("express");
const app  = express();
const FLAG = process.env.FLAG ?? "prehackFlag{test}";

app.use(express.urlencoded({ extended: false }));

const page = (body) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>DevPanel</title>
<style>
  body{font-family:monospace;background:#1a1a2e;color:#e0e0e0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
  .box{background:#16213e;border:1px solid #0f3460;padding:36px;border-radius:10px;width:400px}
  h2{color:#e94560;margin:0 0 16px}
  .info{background:#0f3460;padding:12px;border-radius:6px;margin-bottom:12px;font-size:13px}
  .info span{color:#64b5f6}
  .flag{background:#0d2700;border:1px solid #2e7d32;padding:14px;border-radius:6px;color:#69f0ae;word-break:break-all;margin-bottom:12px}
  .deny{background:#2d0000;border:1px solid #7d2020;padding:12px;border-radius:6px;color:#ef9a9a;font-size:13px;margin-bottom:12px}
  code{background:#0f3460;padding:2px 6px;border-radius:4px;font-size:11px}
  a{color:#e94560;font-size:13px}
</style></head>
<body><div class="box"><h2>👤 DevPanel</h2>${body}</div></body></html>`;

app.get("/", (req, res) => {
  const raw = req.headers.cookie?.match(/role=([^;]+)/)?.[1];
  let role = "guest";
  if (raw) { try { role = Buffer.from(raw, "base64").toString(); } catch {} }
  if (!raw) res.setHeader("Set-Cookie", `role=${Buffer.from("user").toString("base64")}; Path=/`);

  if (role === "admin") {
    res.send(page(`<div class="flag">🚩 Flag: ${FLAG}</div><a href="/logout">← Logout</a>`));
  } else {
    res.send(page(`
      <div class="info">Role: <span>${role}</span></div>
      <div class="deny">🔒 Admins only.</div>
      <p style="font-size:12px;color:#555;margin-bottom:12px">Cookie: <code>role=${Buffer.from(role).toString("base64")}</code></p>
      <a href="/logout">Logout</a>
    `));
  }
});

app.get("/logout", (_req, res) => {
  res.setHeader("Set-Cookie", "role=; Max-Age=0; Path=/");
  res.redirect("/");
});

app.listen(process.env.PORT ?? 3000, () => console.log("web-cookie running"));
