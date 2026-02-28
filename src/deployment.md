# Deployment Guide - Native Node.js + Systemd

Deploy the NoRisk scraper to a Linux VPS alongside an existing Laravel project without interference.

---

## Prerequisites

- Linux VPS with root/sudo access
- Laravel project already running (will not be touched)
- Subdomain DNS pointing to VPS (e.g., `api.yourdomain.com`)

---

## 1. Install System Dependencies

Install Playwright with all dependencies automatically:

```bash
# Install NodeJS
sudo apt-get install nodejs

# Install Playwright browsers with system dependencies
npx playwright install chromium --with-deps
```

---

## 2. Create Isolated Directory Structure

```bash
# Create isolated application directory
sudo mkdir -p /opt/norisk-scraper
cd /opt/norisk-scraper

# Set ownership to current user
sudo chown -R $USER:$USER /opt/norisk-scraper
```

---

## 3. Deploy Application

```bash
cd /opt/norisk-scraper

# Copy files (from local or git)
# Option A: rsync from local
rsync -avz --exclude=node_modules --exclude=.env \
    /local/path/to/norisk-scraper/ /opt/norisk-scraper/

# Option B: git clone
git clone <your-repo-url> .

# Install dependencies
npm install --omit=dev

# Verify Playwright browsers are installed
npx playwright install chromium
```

---

## 4. Configure Environment

```bash
cp .env.example .env
nano .env
```

**Critical settings:**

```bash
NODE_ENV=production
PORT=3000
DOMAIN=https://your-wordpress-site.com

# NoRisk portal credentials
NORISK_EMAIL=your-email@example.com
NORISK_PASSWORD=your-password

# Run headless in production
HEADLESS=true
COMPLETED=true

# Admin dashboard
ADMIN_ENABLED=true
ADMIN_PASSWORD_HASH=<generate with: node scripts/hash-password.js>
ADMIN_SESSION_SECRET=<random-32-char-string>
```

---

## 5. Systemd Service (Recommended)

Create a systemd service for automatic startup and process management:

```bash
sudo nano /etc/systemd/system/norisk-scraper.service
```

Add:

```ini
[Unit]
Description=NoRisk Scraper Node.js Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/norisk-scraper
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

# Resource limits (prevents starving Laravel)
MemoryMax=2G
CPUQuota=80%

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable norisk-scraper
sudo systemctl start norisk-scraper
```

**What this does:**
- **Auto-start on boot**: Service starts automatically when VPS reboots
- **Auto-restart on crash**: If the scraper fails, systemd restarts it
- **Resource limits**: Caps memory at 2GB and CPU at 80% so Laravel keeps running smoothly
- **Logging**: Output goes to journald (`journalctl -u norisk-scraper`)

---

## 6. Verify Deployment

```bash
# Check service status
sudo systemctl status norisk-scraper

# View logs
sudo journalctl -u norisk-scraper -f

# Test health endpoint
curl http://localhost:3000/health
```

---

## 7. Firewall Configuration

```bash
# If accessing directly on port 3000
sudo ufw allow 3000/tcp

# If using Nginx reverse proxy (see Appendix A)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 3000/tcp  # Block external access to port 3000
```

---

## 8. Maintenance Commands

```bash
# Restart service
sudo systemctl restart norisk-scraper

# Stop service
sudo systemctl stop norisk-scraper

# Update (after code changes)
cd /opt/norisk-scraper
git pull
npm install --omit=dev
sudo systemctl restart norisk-scraper

# View recent logs
sudo journalctl -u norisk-scraper --since "1 hour ago"

# Follow live logs
sudo journalctl -u norisk-scraper -f

# Backup database
cp /opt/norisk-scraper/database/submissions.db \
   /backup/submissions-$(date +%Y%m%d).db
```

---

## Isolation Guarantees

| Aspect | Protection |
|--------|------------|
| **Filesystem** | All scraper files in `/opt/norisk-scraper/` only |
| **Process** | systemd manages scraper independently from Laravel's PHP-FPM |
| **Port** | Port 3000 is separate from Laravel's 80/443 |
| **Database** | SQLite in isolated directory, no MySQL/PostgreSQL conflicts |
| **Resources** | systemd MemoryMax/CPUQuota prevents runaway usage |
| **Startup** | systemd handles auto-start, Laravel unaffected by scraper restarts |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 3000 in use | `lsof -i :3000` then kill or change PORT in .env |
| Chrome launch fails | Re-run `npx playwright install chromium --with-deps` |
| Permission denied on database | `chmod 755 /opt/norisk-scraper/database` |
| Laravel slows down | Check `MemoryMax` in service file, increase VPS RAM |
| Service won't start | `sudo journalctl -u norisk-scraper -n 50` for errors |

---

## Appendix A: Nginx Reverse Proxy (Optional)

If you want clean URLs without `:3000` in the address:

```bash
sudo apt-get install nginx
sudo nano /etc/nginx/sites-available/norisk-scraper
```

Add:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/norisk-scraper \
    /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Then update firewall to block direct port 3000 access (see section 7).

---

## Appendix B: PM2 Alternative (If you prefer)

**What is PM2?** PM2 is a Node.js process manager. It does the same thing as systemd (auto-restart, logging, resource limits) but is specific to Node.js apps. It adds a dependency but has nicer features for Node developers.

If you prefer PM2 over systemd:

```bash
# Install PM2
sudo npm install -g pm2

# Create ecosystem file
cat > /opt/norisk-scraper/ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'norisk-scraper',
    script: './src/index.js',
    cwd: '/opt/norisk-scraper',
    env: { NODE_ENV: 'production' },
    max_memory_restart: '2G',
    autorestart: true,
    log_file: '/opt/norisk-scraper/logs/pm2.log'
  }]
};
EOF

# Start
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd

# Commands
pm2 restart norisk-scraper    # restart
pm2 logs norisk-scraper       # view logs
pm2 monit                     # resource monitor
```

**Recommendation:** Stick with systemd (section 5) unless you manage many Node.js apps and want a unified interface.

---

## Quick Reference

```bash
# Check if running
sudo systemctl is-active norisk-scraper

# Check status
curl -s http://localhost:3000/health | jq

# Live logs
sudo journalctl -u norisk-scraper -f

# Full restart
sudo systemctl restart norisk-scraper

# Stop completely
sudo systemctl stop norisk-scraper
sudo systemctl disable norisk-scraper
```
