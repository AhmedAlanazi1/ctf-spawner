// prehack CTF Spawner — بسيط وخفيف
const express = require("express");
const { execSync, exec } = require("child_process");
const crypto = require("crypto");

const app    = express();
const PORT   = process.env.PORT   || 8888;
const SECRET = process.env.SECRET || "change-me";
const HOST   = process.env.HOST   || "localhost";      // IP الـ VPS
const FLAG_SECRET = process.env.FLAG_SECRET || "prehack-secret";

const TTL_MS  = 30 * 60 * 1000;  // 30 دقيقة
const PORTS   = { min: 10000, max: 20000 };
const used    = new Set();
const sessions = new Map(); // sessionId → { containerId, port, timer }
const userMap  = new Map(); // userId:challengeId → sessionId

app.use(express.json());

// Auth
app.use((req, res, next) => {
  if (req.headers["x-spawner-secret"] !== SECRET)
    return res.status(401).json({ error: "Unauthorized" });
  next();
});

// توليد فلاق خاص لكل يوزر
function makeFlag(userId, challengeId) {
  return "prehackFlag{" + crypto
    .createHmac("sha256", FLAG_SECRET)
    .update(userId + ":" + challengeId)
    .digest("hex").slice(0, 16) + "}";
}

// اختيار port حر عشوائي
function freePort() {
  for (let i = 0; i < 500; i++) {
    const p = PORTS.min + Math.floor(Math.random() * (PORTS.max - PORTS.min));
    if (!used.has(p)) { used.add(p); return p; }
  }
  throw new Error("No free ports");
}

function killSession(sid) {
  const s = sessions.get(sid);
  if (!s) return;
  clearTimeout(s.timer);
  exec(`docker stop ${s.containerId} && docker rm ${s.containerId}`, () => {});
  used.delete(s.port);
  userMap.delete(s.userKey);
  sessions.delete(sid);
  console.log(`[kill] ${sid} port=${s.port}`);
}

// ── POST /spawn ───────────────────────────────────────────────────────────────
app.post("/spawn", (req, res) => {
  const { user_id, challenge_id } = req.body;
  if (!user_id || !challenge_id)
    return res.status(400).json({ error: "user_id and challenge_id required" });

  const image = `prehack-${challenge_id}`;
  // تحقق الصورة موجودة
  try { execSync(`docker image inspect ${image}`, { stdio: "ignore" }); }
  catch { return res.status(400).json({ error: `Unknown challenge: ${challenge_id}` }); }

  // أرجع session موجودة إذا كانت شغّالة
  const userKey = `${user_id}:${challenge_id}`;
  const existId = userMap.get(userKey);
  if (existId && sessions.has(existId)) {
    const s = sessions.get(existId);
    return res.json({ session_id: existId, url: `http://${HOST}:${s.port}`, expires_at: s.expiresAt, extensions: s.extensions, reused: true });
  }

  // شغّل container جديد
  const flag = makeFlag(user_id, challenge_id);
  const port = freePort();
  let containerId;
  try {
    containerId = execSync(
      `docker run -d --rm --memory=128m --cpus=0.5 ` +
      `--cap-drop=ALL --security-opt no-new-privileges ` +
      `-p ${port}:3000 -e FLAG="${flag}" ${image}`
    ).toString().trim();
  } catch (e) {
    used.delete(port);
    return res.status(500).json({ error: e.message });
  }

  const sid       = crypto.randomBytes(12).toString("hex");
  const expiresAt = Math.floor(Date.now() / 1000) + TTL_MS / 1000;
  const timer     = setTimeout(() => killSession(sid), TTL_MS);

  sessions.set(sid, { containerId, port, timer, expiresAt, extensions: 0, userKey });
  userMap.set(userKey, sid);

  console.log(`[spawn] ${challenge_id} port=${port} user=${user_id}`);
  res.status(201).json({ session_id: sid, url: `http://${HOST}:${port}`, expires_at: expiresAt, extensions: 0, reused: false });
});

// ── POST /terminate ───────────────────────────────────────────────────────────
app.post("/terminate", (req, res) => {
  killSession(req.body.session_id);
  res.json({ ok: true });
});

// ── POST /extend ──────────────────────────────────────────────────────────────
app.post("/extend", (req, res) => {
  const s = sessions.get(req.body.session_id);
  if (!s) return res.status(404).json({ error: "Not found" });
  if (s.extensions >= 2) return res.status(400).json({ error: "Max extensions reached" });

  clearTimeout(s.timer);
  s.expiresAt  += 10 * 60;
  s.extensions += 1;
  s.timer       = setTimeout(() => killSession(req.body.session_id), (s.expiresAt - Math.floor(Date.now() / 1000)) * 1000);

  res.json({ expires_at: s.expiresAt, extensions: s.extensions });
});

// ── GET /session/:id ──────────────────────────────────────────────────────────
app.get("/session/:id", (req, res) => {
  const s = sessions.get(req.params.id);
  if (!s) return res.status(404).json({ error: "Not found" });
  res.json({ url: `http://${HOST}:${s.port}`, expires_at: s.expiresAt, extensions: s.extensions });
});

app.listen(PORT, () => console.log(`[spawner] ready on :${PORT}`));
