const express = require("express");
const app  = express();
const FLAG = process.env.FLAG ?? "prehackFlag{test}";

// موقع شركة وهمي — الفلاق مخفي في source code الصفحة الخفية
app.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send("User-agent: *\nDisallow: /old-site\nDisallow: /backup-2019\n");
});

app.get("/", (_req, res) => res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>NovaTech Solutions</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:system-ui,sans-serif;background:#0a0a0a;color:#e0e0e0}
  nav{display:flex;justify-content:space-between;align-items:center;padding:20px 60px;background:#111;border-bottom:1px solid #222}
  nav h1{color:#6c63ff;font-size:22px;font-weight:800}
  nav a{color:#888;text-decoration:none;margin-left:24px;font-size:14px}
  .hero{text-align:center;padding:100px 40px;background:linear-gradient(135deg,#6c63ff11,#00000000)}
  .hero h2{font-size:48px;font-weight:800;margin-bottom:16px}
  .hero p{color:#888;font-size:18px}
  .team{max-width:900px;margin:60px auto;padding:0 20px;display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
  .card{background:#111;border:1px solid #222;border-radius:12px;padding:24px;text-align:center}
  .card h3{margin-bottom:6px;font-size:16px}
  .card p{color:#666;font-size:13px}
  footer{text-align:center;padding:40px;color:#444;font-size:12px;border-top:1px solid #111}
</style></head>
<body>
<nav><h1>NovaTech</h1><div><a href="/">Home</a><a href="/about">About</a><a href="/team">Team</a></div></nav>
<div class="hero"><h2>Building the Future</h2><p>Innovative cybersecurity solutions for modern enterprises.</p></div>
<div class="team">
  <div class="card"><h3>Sarah Chen</h3><p>CEO & Co-Founder</p></div>
  <div class="card"><h3>Marcus Webb</h3><p>CTO</p></div>
  <div class="card"><h3>Aisha Patel</h3><p>Head of Security</p></div>
</div>
<!-- TODO: remove old backup before going live -->
<footer>© 2024 NovaTech Solutions. All rights reserved.</footer>
</body></html>`));

app.get("/backup-2019", (_req, res) => res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>NovaTech — Archive</title>
<style>body{font-family:monospace;background:#fff;padding:40px;color:#333}.warn{color:red;font-size:12px}</style>
</head><body>
<h2>NovaTech Internal Archive — 2019</h2>
<p class="warn">⚠️ This page was supposed to be deleted. If you're seeing this, please contact IT.</p>
<hr style="margin:20px 0">
<h3>Internal Notes</h3>
<pre>
Project codename: NOVA-INTERNAL
Auth token (deprecated): ${FLAG}
Status: ARCHIVED
</pre>
</body></html>`));

app.get("/about", (_req, res) => res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>About — NovaTech</title>
<style>body{font-family:system-ui;background:#0a0a0a;color:#e0e0e0;display:flex;align-items:center;justify-content:center;height:100vh}</style>
</head><body><h2>About NovaTech — Coming Soon</h2></body></html>`));

app.get("/team", (_req, res) => res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Team — NovaTech</title>
<style>body{font-family:system-ui;background:#0a0a0a;color:#e0e0e0;display:flex;align-items:center;justify-content:center;height:100vh}</style>
</head><body><h2>Our Team — Coming Soon</h2></body></html>`));

app.listen(process.env.PORT ?? 3000, () => console.log("web-osint running"));
