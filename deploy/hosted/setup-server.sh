#!/usr/bin/env bash
# Provision a fresh Ubuntu 24.04 (arm64 or x64) host to run the full guided tour
# (`pnpm demo` in hosted mode) behind the Vercel proxy projects. Run as root
# (EC2 user-data, or `sudo bash setup-server.sh`). Idempotent.
#
#   DEMO_PUBLIC_ORIGINS  JSON map of public origins (see deploy/hosted/origins.json)
#   DEMO_REF             git ref to deploy (default: main)
set -euo pipefail

DEMO_REF="${DEMO_REF:-main}"
NODE_VERSION="25.1.0"
APP_USER="demo"
APP_DIR="/opt/solid-mortgage"

arch="$(uname -m)"; case "$arch" in aarch64|arm64) node_arch=arm64 ;; x86_64) node_arch=x64 ;; *) echo "unsupported arch $arch"; exit 1 ;; esac

# Next.js builds need more memory than a small instance has: add swap once.
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q /swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

apt-get update -y
apt-get install -y git curl ca-certificates xz-utils libatomic1

if ! command -v node >/dev/null || [ "$(node -v)" != "v${NODE_VERSION}" ]; then
  curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${node_arch}.tar.xz" -o /tmp/node.tar.xz
  tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1
fi
# Node 25 no longer bundles corepack: install the repo's pinned pnpm directly.
npm install -g pnpm@10.4.1

id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone https://github.com/jeswr/solid-mortgage.git "$APP_DIR"
fi
git -C "$APP_DIR" fetch --depth 1 origin "$DEMO_REF"
git -C "$APP_DIR" checkout -f FETCH_HEAD
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

sudo -u "$APP_USER" -H bash -lc "cd $APP_DIR && CI=1 pnpm install --frozen-lockfile && pnpm exec turbo run build --concurrency=1"

install -m 0644 "$APP_DIR/deploy/hosted/solid-mortgage-demo.service" /etc/systemd/system/solid-mortgage-demo.service
mkdir -p /etc/solid-mortgage
if [ ! -f /etc/solid-mortgage/demo.env ]; then
  origins="${DEMO_PUBLIC_ORIGINS:-$(tr -d '\n ' < "$APP_DIR/deploy/hosted/origins.json")}"
  printf 'DEMO_PUBLIC_ORIGINS=%s\n' "$origins" > /etc/solid-mortgage/demo.env
fi
systemctl daemon-reload
systemctl enable --now solid-mortgage-demo
systemctl restart solid-mortgage-demo
