# NoRisk Scraper Deployment Guide

## Overview

Deploy the NoRisk scraper on a VPS alongside an existing Laravel project without touching it. The scraper runs in an isolated Docker container on a different port.

## Architecture

```
┌─────────────────┐         ┌─────────────────────────────────────┐
│   WordPress     │ ──────► │              VPS                    │
│ (other hosting) │  HTTP   │  ┌─────────────┐  ┌─────────────┐   │
│                 │         │  │   Laravel   │  │   Scraper   │   │
└─────────────────┘         │  │   :80/443   │  │   :3000     │   │
                            │  │  (untouched)│  │  (Docker)   │   │
                            │  └─────────────┘  └─────────────┘   │
                            └─────────────────────────────────────┘
```

## Prerequisites

- VPS with Docker installed
- Port 3000 available (or any free port)
- WordPress site able to make HTTP requests

## Quick Deploy

### 1. Upload Scraper to VPS

```bash
# SSH into your VPS
ssh user@YOUR_VPS_IP

# Create directory for scraper (outside Laravel path)
mkdir -p /opt/norisk-scraper
cd /opt/norisk-scraper
```

Upload files via SCP, FTP, or git clone:

```bash
# Option 1: Git clone
git clone YOUR_REPO_URL .

# Option 2: SCP from local machine
scp -r C:\Users\puddu\Documents\Github\norisk-scraper\* user@YOUR_VPS_IP:/opt/norisk-scraper/
```

### 2. Build and Run

```bash
# Build Docker image
docker build -t norisk-scraper .

# Run container
docker run -d \
  --name norisk-scraper \
  -p 3000:3000 \
  -e PORT=3000 \
  -e NODE_ENV=production \
  -e DOMAIN=https://your-wordpress-site.com \
  -e HEADLESS=true \
  -e COMPLETED=true \
  --restart unless-stopped \
  norisk-scraper
```

### 3. Verify

```bash
# Check container is running
docker ps

# Test health endpoint
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "uptime": 123
}
```

### 4. Open Firewall

```bash
# UFW (Ubuntu/Debian)
sudo ufw allow 3000/tcp

# Or iptables
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
```

## WordPress Configuration

Configure your WordPress plugin/form to call:

```
http://YOUR_VPS_IP:3000/api/quote
```

Or with a domain:

```
http://api.yourdomain.com:3000/api/quote
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/quote` | POST | Submit form data, get quote |
| `/api/quote/send` | POST | Email PDF to user |
| `/api/quote/:key/status` | GET | Check quote status |

### Example Request

```javascript
fetch('http://YOUR_VPS_IP:3000/api/quote', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eventType: 'concerto',
    country: 'it',
    email: 'user@example.com',
    // ... other fields
  })
})
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | Server port |
| `NODE_ENV` | No | development | production/development |
| `DOMAIN` | Yes | - | WordPress domain for CORS |
| `HEADLESS` | No | true | Run browser headless |
| `COMPLETED` | No | false | Auto-submit forms |
| `SMTP_HOST` | No | - | Email server host |
| `IMAP_HOST` | No | - | IMAP for receiving emails |

## Production Setup

### Using Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  scraper:
    build: .
    container_name: norisk-scraper
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NODE_ENV=production
      - DOMAIN=${DOMAIN}
      - HEADLESS=true
      - COMPLETED=true
    volumes:
      - ./quotes:/app/quotes
      - ./screenshots:/app/screenshots
    restart: unless-stopped
```

Run:

```bash
docker-compose up -d
```

### Auto-Start on Reboot

Create systemd service at `/etc/systemd/system/norisk-scraper.service`:

```ini
[Unit]
Description=NoRisk Scraper
Requires=docker.service
After=docker.service

[Service]
Restart=always
WorkingDirectory=/opt/norisk-scraper
ExecStart=/usr/bin/docker-compose up
ExecStop=/usr/bin/docker-compose down

[Install]
WantedBy=multi-user.target
```

Enable:

```bash
sudo systemctl enable norisk-scraper
sudo systemctl start norisk-scraper
```

## Monitoring

### View Logs

```bash
# Docker logs
docker logs -f norisk-scraper

# Or with docker-compose
docker-compose logs -f
```

### Restart

```bash
docker restart norisk-scraper
```

### Update

```bash
cd /opt/norisk-scraper

# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

## Troubleshooting

### Port Already in Use

```bash
# Check what's using port 3000
sudo netstat -tlnp | grep 3000

# Use different port
docker run -d -p 3001:3000 --name norisk-scraper norisk-scraper
```

### Container Won't Start

```bash
# Check logs
docker logs norisk-scraper

# Check if port is available
sudo lsof -i :3000
```

### CORS Errors

Ensure `DOMAIN` env var matches your WordPress domain exactly:

```bash
# Correct
DOMAIN=https://www.yoursite.com

# Wrong (trailing slash)
DOMAIN=https://www.yoursite.com/
```

## Security Considerations

1. **Firewall**: Only open port 3000, nothing else
2. **CORS**: `DOMAIN` restricts which origins can call the API
3. **No Laravel Access**: Scraper runs in isolated container, cannot access Laravel files
4. **No Port Conflicts**: Laravel uses 80/443, scraper uses 3000

## Laravel is Untouched

✅ No files modified
✅ No configuration changed
✅ No services restarted
✅ No database migrations
✅ Complete isolation via Docker
