# Physiq Deploy Configurations

This directory contains reference configurations for deploying the Physiq app.

## Server: oracle@158.180.60.61
## Domain: physiq.lkohl.duckdns.org

### What's already configured on the server:
- SSL via Let's Encrypt (auto-renew via certbot)
- nginx with security headers (HSTS, CSP, X-Frame-Options, etc.)
- PM2 process management for backend
- Daily SQLite backup at 2 AM (7-day retention)
- nginx log rotation
- PM2 log rotation

### Auto-deploy
- Cron every 5 min: `/home/ubuntu/physiq-deploy.sh` pulls from main and rebuilds
- Auto-deploy triggers on every `git push origin main`
