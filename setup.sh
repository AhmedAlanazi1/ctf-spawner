#!/bin/bash
# Run on fresh Ubuntu 24.04 Hetzner VPS as root
set -e

# ── Install Docker ────────────────────────────────────────────────────────────
apt-get update -y
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io
systemctl enable --now docker

# ── Install Node.js 20 ───────────────────────────────────────────────────────
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# ── Clone repo ───────────────────────────────────────────────────────────────
# Edit REPO_URL to your actual GitHub repo
REPO_URL="https://github.com/AhmedAlanazi1/ctf-spawner"
DEST="/opt/ctf-spawner"

if [ -d "$DEST" ]; then
  git -C "$DEST" pull
else
  git clone "$REPO_URL" "$DEST"
fi

cd "$DEST"
npm install --production

# ── Build Docker images ───────────────────────────────────────────────────────
for challenge in challenges/*/; do
  name=$(basename "$challenge")
  echo "Building prehack-${name}..."
  docker build -t "prehack-${name}" "$challenge"
done

# ── Write .env ───────────────────────────────────────────────────────────────
if [ ! -f "$DEST/.env" ]; then
  cat > "$DEST/.env" <<EOF
PORT=8888
SECRET=$(openssl rand -hex 32)
FLAG_SECRET=$(openssl rand -hex 32)
HOST=$(curl -s ifconfig.me)
EOF
  echo ""
  echo "========================================="
  echo ".env created. Copy SECRET and FLAG_SECRET"
  echo "to your Railway env vars!"
  echo "========================================="
  cat "$DEST/.env"
fi

# ── Systemd service ───────────────────────────────────────────────────────────
cat > /etc/systemd/system/ctf-spawner.service <<EOF
[Unit]
Description=CTF Spawner
After=docker.service network.target
Requires=docker.service

[Service]
WorkingDirectory=$DEST
EnvironmentFile=$DEST/.env
ExecStart=/usr/bin/node spawner.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now ctf-spawner

echo ""
echo "✅ Done! Spawner running on port 8888."
echo "Open firewall: ufw allow 8888 && ufw allow 10000:20000/tcp"
