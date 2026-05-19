const express    = require("express");
const httpProxy  = require("http-proxy");
const { execFileSync, execFile } = require("child_process");
const crypto     = require("crypto");

const app        = express();
const proxyApp   = express();
const proxy      = httpProxy.createProxyServer({ timeout: 10000, proxyTimeout: 10000 });

const PORT       = process.env.PORT        || 8888;
const PROXY_PORT = process.env.PROXY_PORT  || 80;
const SECRET     = process.env.SECRET      || "change-me";
const HOST       = process.env.HOST        || "localhost";
const FLAG_SECRET = process.env.FLAG_SECRET || "prehack-secret";

const TTL_MS      = 30 * 60 * 1000;
const EXTEND_MS   = 10 * 60 * 1000;
const EXTEND_WIN  = 5 * 60;
const PORTS       = { min: 10000, max: 20000 };

const ALLOWED = new Set([
  "web-cookie", "web-sqli", "web-ua", "web-robots",
  "web-osint", "web-hard", "web-pwn"
]);

const used       = new Set();
const sessions   = new Map();
const userMap    = new Map();
const userActive = new Map();
const tokenMap   = new Map();

app.use(express.json());

app.use((req, res, next) => {
  if (req.headers["x-spawner-secret"] !== SECRET)
    return res.status(401).json({ error: "Unauthorized" });
  next();
});

proxy.on("error", (err, req, res) => {
  res.writeHead(502, { "Content-Type": "text/html" });
  res.end("<html><body style='font-family:monospace;background:#0d0d0d;color:#0f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0'><div style='text-align:center'><div style='font-size:40px;margin-bottom:16px'>⏳</div><p>Container is starting... refresh in a moment.</p></div></body></html>");
});

proxyApp.use("/lab/:token", (req, res) => {
  const port = tokenMap.get(req.params.token);
  if (!port) {
    return res.status(404).send("<html><body style='font-family:monospace;background:#0d0d0d;color:#f85149;display:flex;align-items:center;justify-content:center;height:100vh;margin:0'><div style='text-align:center'><div style='font-size:40px;margin-bottom:16px'>🔒</div><p>Session not found or expired.</p></div></body></html>");
  }
  req.url = req.url.replace(`/lab/${req.params.token}`, "") || "/";
  proxy.web(req, res, { target: `http://127.0.0.1:${port}` });
});

proxyApp.use("/lab/:token/*", (req, res) => {
  const port = tokenMap.get(req.params.token);
  if (!port) return res.status(404).end();
  proxy.web(req, res, { target: `http://127.0.0.1:${port}` });
});

function makeFlag(userId, challengeId) {
  return "prehackFlag{" + crypto
    .createHmac("sha256", FLAG_SECRET)
    .update(userId + ":" + challengeId)
    .digest("hex").slice(0, 16) + "}";
}

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
  execFile("docker", ["stop", s.containerId], () => {
    execFile("docker", ["rm", s.containerId], () => {});
  });
  used.delete(s.port);
  userMap.delete(s.userKey);
  userActive.delete(s.userId);
  tokenMap.delete(s.accessToken);
  sessions.delete(sid);
  console.log(`[kill] ${sid} port=${s.port}`);
}

app.post("/spawn", (req, res) => {
  const { user_id, challenge_id } = req.body;
  if (!user_id || !challenge_id)
    return res.status(400).json({ error: "user_id and challenge_id required" });

  if (!ALLOWED.has(challenge_id))
    return res.status(400).json({ error: "Unknown challenge" });

  try { execFileSync("docker", ["image", "inspect", `prehack-${challenge_id}`], { stdio: "ignore" }); }
  catch { return res.status(400).json({ error: "Unknown challenge" }); }

  const existingActive = userActive.get(user_id);
  if (existingActive) {
    const s = sessions.get(existingActive);
    if (s && s.userKey === `${user_id}:${challenge_id}`) {
      return res.json({
        session_id: existingActive,
        url: `http://${HOST}/lab/${s.accessToken}`,
        expires_at: s.expiresAt,
        extensions: s.extensions,
        reused: true,
      });
    }
    killSession(existingActive);
  }

  const flag  = makeFlag(user_id, challenge_id);
  const port  = freePort();
  let containerId;
  try {
    containerId = execFileSync("docker", [
      "run", "-d", "--rm",
      "--memory=128m", "--cpus=0.5",
      "--cap-drop=ALL", "--security-opt", "no-new-privileges",
      "--network=bridge",
      "-p", `127.0.0.1:${port}:3000`,
      "-e", `FLAG=${flag}`,
      `prehack-${challenge_id}`,
    ]).toString().trim();
  } catch {
    used.delete(port);
    return res.status(500).json({ error: "Failed to start container" });
  }

  const sid         = crypto.randomBytes(16).toString("hex");
  const accessToken = crypto.randomBytes(24).toString("hex");
  const expiresAt   = Math.floor(Date.now() / 1000) + TTL_MS / 1000;
  const userKey     = `${user_id}:${challenge_id}`;
  const timer       = setTimeout(() => killSession(sid), TTL_MS);

  sessions.set(sid, { containerId, port, timer, expiresAt, extensions: 0, userKey, userId: user_id, accessToken });
  userMap.set(userKey, sid);
  userActive.set(user_id, sid);
  tokenMap.set(accessToken, port);

  console.log(`[spawn] ${challenge_id} port=${port} user=${user_id.slice(0, 8)}`);
  res.status(201).json({
    session_id: sid,
    url: `http://${HOST}/lab/${accessToken}`,
    expires_at: expiresAt,
    extensions: 0,
    reused: false,
  });
});

app.post("/terminate", (req, res) => {
  killSession(req.body.session_id);
  res.json({ ok: true });
});

app.post("/extend", (req, res) => {
  const s = sessions.get(req.body.session_id);
  if (!s) return res.status(404).json({ error: "Not found" });
  if (s.extensions >= 2) return res.status(400).json({ error: "Max extensions reached" });

  const remaining = s.expiresAt - Math.floor(Date.now() / 1000);
  if (remaining > EXTEND_WIN)
    return res.status(400).json({ error: "Extension only allowed in last 5 minutes" });

  clearTimeout(s.timer);
  s.expiresAt  += EXTEND_MS / 1000;
  s.extensions += 1;
  s.timer = setTimeout(() => killSession(req.body.session_id),
    (s.expiresAt - Math.floor(Date.now() / 1000)) * 1000);

  res.json({ expires_at: s.expiresAt, extensions: s.extensions });
});

app.get("/session/:id", (req, res) => {
  const s = sessions.get(req.params.id);
  if (!s) return res.status(404).json({ error: "Not found" });
  res.json({ url: `http://${HOST}/lab/${s.accessToken}`, expires_at: s.expiresAt, extensions: s.extensions });
});

app.listen(PORT, () => console.log(`[spawner] API ready on :${PORT}`));
proxyApp.listen(PROXY_PORT, () => console.log(`[proxy]   ready on :${PROXY_PORT}`));
