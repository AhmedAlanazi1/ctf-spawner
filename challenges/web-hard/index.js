const express = require("express");
const jwt     = require("jsonwebtoken");
const app     = express();
const FLAG    = process.env.FLAG ?? "prehackFlag{test}";

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const PUBKEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Z3VS5JJcds3xHn/ygWep4
mTjTJNeZMRmtRMiADpAQFMh4hRqFfJSfuNLWKJqkL5aVMqBc6VWmTmVGi7YkdOn1
yNDPCLmPGAkxgcLomyV6MEPfqZSoMLz3FBGXPFG8lNk2qJp8nHp9hQF/fake==
-----END PUBLIC KEY-----`;

const page = (body, token = "") => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>SecureVault</title>
<style>
  body{font-family:monospace;background:#0d1117;color:#c9d1d9;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
  .box{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:40px;width:480px}
  h2{color:#58a6ff;margin-bottom:20px}
  input{width:100%;padding:10px;background:#0d1117;border:1px solid #30363d;border-radius:6px;color:#c9d1d9;margin-bottom:12px;font-family:monospace;box-sizing:border-box}
  button{width:100%;padding:11px;background:#238636;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:15px}
  .token{background:#0d1117;border:1px solid #30363d;padding:10px;border-radius:6px;word-break:break-all;font-size:11px;margin:12px 0;color:#8b949e}
  .flag{background:#0d2700;border:1px solid #2ea043;padding:16px;border-radius:8px;color:#3fb950;word-break:break-all;margin-top:12px;font-size:15px}
  .deny{color:#f85149;margin-top:12px}
  .hint{font-size:11px;color:#484f58;margin-top:16px}
</style></head>
<body><div class="box">
<h2>🔐 SecureVault</h2>
${body}
${token ? `<div class="token">Your JWT: ${token}</div>` : ""}
<p class="hint">RS256 signed tokens — only admins see the vault.</p>
</div></body></html>`;

app.get("/", (req, res) => {
  const token = req.headers.cookie?.match(/token=([^;]+)/)?.[1];
  if (!token) {
    return res.send(page(`
      <form method="POST" action="/login">
        <input name="username" placeholder="Username"/>
        <input type="password" name="password" placeholder="Password"/>
        <button>Login</button>
      </form>`));
  }
  // التحقق — قابل للاختراق عبر algorithm confusion (RS256 → HS256)
  try {
    const decoded = jwt.verify(token, PUBKEY, { algorithms: ["RS256", "HS256"] });
    if (decoded.role === "admin") {
      return res.send(page(`<div class="flag">🚩 ${FLAG}</div>`));
    }
    return res.send(page(`<div class="deny">Access denied — admins only.</div><br><a href="/logout" style="color:#58a6ff">Logout</a>`, token));
  } catch {
    res.clearCookie("token");
    return res.redirect("/");
  }
});

app.post("/login", (req, res) => {
  const { username } = req.body;
  if (!username) return res.redirect("/");
  // يعطي token بـ RS256 مع role=user
  // لكن الـ verify يقبل HS256 أيضاً — والـ public key معروف
  const token = jwt.sign({ username, role: "user" }, PUBKEY, { algorithm: "RS256" });
  res.setHeader("Set-Cookie", `token=${token}; Path=/`);
  res.redirect("/");
});

app.get("/logout", (_req, res) => {
  res.setHeader("Set-Cookie", "token=; Max-Age=0; Path=/");
  res.redirect("/");
});

app.get("/.well-known/jwks.json", (_req, res) => {
  res.json({ keys: [{ kty: "RSA", use: "sig", alg: "RS256", n: "fake", e: "AQAB" }] });
});

app.listen(process.env.PORT ?? 3000, () => console.log("web-hard running"));
