#!/usr/bin/env bash
# One-time hardening + Docker install for a fresh Contabo Ubuntu VPS.
# Run this once, as root, right after first logging into the new VPS —
# before deploying anything. Re-running is safe (every step is idempotent),
# but it's meant to run once.
#
# Usage: ssh root@your-vps-ip, paste this file, then: bash setup-vps.sh
set -euo pipefail

echo "==> Updating the system and enabling unattended security updates"
apt-get update -y
apt-get upgrade -y
apt-get install -y unattended-upgrades ufw fail2ban curl
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "==> Configuring the firewall — only SSH, HTTP, and HTTPS reach this box"
# Nothing else should ever be exposed directly: the backend and frontend
# containers are only reachable through Caddy (see docker-compose.yml's
# `expose` vs `ports` — only caddy publishes ports to the host at all).
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Enabling fail2ban for SSH brute-force protection"
systemctl enable --now fail2ban

echo "==> Installing Docker Engine + Compose plugin"
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

echo ""
echo "==> Done. Before deploying:"
echo "  1. Create a non-root user for day-to-day use instead of staying as root:"
echo "     adduser botimi && usermod -aG docker,sudo botimi"
echo "  2. Copy your SSH key to that user and disable root SSH login + password auth"
echo "     in /etc/ssh/sshd_config (PermitRootLogin no, PasswordAuthentication no),"
echo "     then: systemctl restart sshd"
echo "  3. Point your domain's DNS A record at this VPS's IP address"
echo "  4. Clone the repo and follow DEPLOYMENT.md from here"
