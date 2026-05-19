const express = require("express");
const app  = express();
const FLAG = process.env.FLAG ?? "prehackFlag{test}";

app.use(express.urlencoded({ extended: false }));

const page = (result = "") => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>MathEngine</title>
<style>
  body{font-family:'Courier New',monospace;background:#1a1a2e;color:#e0e0e0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
  .box{background:#16213e;border:1px solid #0f3460;border-radius:10px;padding:40px;width:500px}
  h2{color:#e94560;margin-bottom:6px}
  p{color:#666;font-size:13px;margin-bottom:20px}
  input{width:100%;padding:10px;background:#0f3460;border:1px solid #1a4a8a;border-radius:6px;color:#e0e0e0;font-family:monospace;box-sizing:border-box;margin-bottom:12px}
  button{width:100%;padding:11px;background:#e94560;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:15px}
  .result{background:#0f3460;padding:16px;border-radius:8px;margin-top:16px;word-break:break-all;min-height:40px}
  .hint{font-size:11px;color:#444;margin-top:16px}
</style></head>
<body><div class="box">
  <h2>⚙️ MathEngine</h2>
  <p>Advanced expression evaluator for power users.</p>
  <form method="POST" action="/calc">
    <input name="expr" placeholder="Enter expression... e.g. 2+2" autocomplete="off"/>
    <button>Evaluate</button>
  </form>
  ${result ? `<div class="result">${result}</div>` : ""}
  <p class="hint">Supports basic math operations.</p>
</div></body></html>`;

app.get("/", (_req, res) => res.send(page()));

app.post("/calc", (req, res) => {
  const expr = String(req.body.expr ?? "").slice(0, 200);
  let result;
  try {
    // VULNERABLE — eval injection
    const fn = new Function("FLAG", `"use strict"; return (${expr})`);
    result = fn(FLAG);
  } catch (e) {
    result = `Error: ${e.message}`;
  }
  const safe = String(result).replace(/</g, "&lt;").replace(/>/g, "&gt;");
  res.send(page(`<code>${safe}</code>`));
});

app.listen(process.env.PORT ?? 3000, () => console.log("web-pwn running"));
