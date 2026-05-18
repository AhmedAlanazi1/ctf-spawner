const express = require("express");
const app  = express();
const FLAG = process.env.FLAG ?? "prehackFlag{test}";

const page = (body) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Restricted</title>
<style>
  body{font-family:'Courier New',monospace;background:#0d0d0d;color:#00ff41;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
  .term{background:#111;border:1px solid #00ff41;padding:32px;border-radius:4px;width:500px;max-width:95vw;line-height:2;font-size:13px}
  .r{color:#ff6b6b}.y{color:#ffff00}.d{color:#444}
  .blink{animation:b 1s step-end infinite}@keyframes b{50%{opacity:0}}
</style></head>
<body><div class="term">${body}<span class="blink">█</span></div></body></html>`;

app.get("/", (req, res) => {
  const ua = req.headers["user-agent"] ?? "";
  if (ua === "HackerBrowser/1.0") {
    res.send(page(`
      <div><span class="d">$</span> cat /flag.txt</div>
      <div class="y" style="font-size:15px;font-weight:bold">${FLAG}</div>
      <div><span class="d">$</span>&nbsp;</div>
    `));
  } else {
    res.send(page(`
      <div><span class="r">[DENIED]</span> Unauthorized browser.</div>
      <div><span class="d">[UA]</span> ${String(ua).substring(0,80) || "(empty)"}</div>
      <div><span class="d">[hint]</span> Try a different User-Agent…</div>
    `));
  }
});

app.listen(process.env.PORT ?? 3000, () => console.log("web-ua running"));
