# 🚀 Quick Start Guide

Get Node Monitor up and running in 5 minutes!

---

## For Your Current DILab Deployment

### Option 1: Keep Current Setup ✅ **RECOMMENDED FOR NOW**

Your current deployment is **already configured and working**. The generalization changes are **backward compatible**.

```bash
cd /home/oem/dilab-monitor

# Deploy as usual
./deploy.sh

# That's it! Your app now uses the new environment variable system
# but keeps your existing configuration.
```

**What changed:**
- ✅ App is now configurable via environment variables
- ✅ All your current settings are preserved
- ✅ Node labels now come from `.env` instead of being hardcoded
- ✅ You can customize branding anytime by editing `backend/.env`

---

## For New Deployments on Other Systems

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/node-monitor.git
cd node-monitor
```

### 2. Configure Environment
```bash
cp backend/.env.example backend/.env
nano backend/.env
```

**Required changes in `.env`:**
- `JWT_SECRET` - Generate: `openssl rand -base64 64 | tr -d '\n'`
- `NODE1_HOST` - Your first node's hostname/IP
- `NODE1_LABEL` - Display name for first node
- `NODE2_HOST` - Your second node's hostname/IP
- `NODE2_LABEL` - Display name for second node
- `DOMAIN_NAME` - Your deployment domain
- `SSH_KEY_PATH` - Path to SSH key for monitor user
- `NODE_LOCAL_ID` - Which node runs the backend (node1, node2, or none)

### 3. Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4. Development Mode (Test First)
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev

# Open http://localhost:5173
# Login with any system user from your nodes
```

### 5. Production Deployment
```bash
# Build frontend
cd frontend
npm run build

# Configure nginx
cp nginx.conf.example nginx.conf
nano nginx.conf  # Replace all CHANGE_THIS placeholders

# Deploy nginx config
sudo cp nginx.conf /etc/nginx/sites-available/node-monitor
sudo ln -s /etc/nginx/sites-available/node-monitor /etc/nginx/sites-enabled/

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Create systemd service (see README.md for template)
sudo nano /etc/systemd/system/node-monitor.service

# Start services
sudo systemctl daemon-reload
sudo systemctl enable --now node-monitor
sudo nginx -t && sudo systemctl reload nginx
```

### 6. Verify
```bash
# Check backend
sudo systemctl status node-monitor

# Check frontend
curl https://your-domain.com
```

---

## Customization Examples

### Change Branding
```bash
nano backend/.env
```
```bash
APP_NAME="My Lab Monitor"
APP_SHORT_NAME="MyLab"
```
```bash
sudo systemctl restart dilab-monitor  # or node-monitor
```

### Change Node Labels
```bash
nano backend/.env
```
```bash
NODE1_LABEL="GPU-Beast-01"
NODE2_LABEL="GPU-Beast-02"
```
```bash
sudo systemctl restart dilab-monitor  # or node-monitor
```

### Add Third Node
Edit `backend/src/ssh/sshManager.js`:
```javascript
export const NODES = {
  node1: { ... },
  node2: { ... },
  node3: {
    id: 'node3',
    label: process.env.NODE3_LABEL || 'Node 3',
    host: process.env.NODE3_HOST || 'node3.example.com',
    // ... rest of config
  }
};
```

Add to `backend/.env`:
```bash
NODE3_HOST=node3.example.com
NODE3_LABEL=Server-03
NODE3_SSH_PORT=22
```

Restart backend - that's it!

---

## Common Use Cases

### Research Lab
```bash
APP_NAME="AI Research Lab Monitor"
NODE1_LABEL="Training-Server-A"
NODE2_LABEL="Training-Server-B"
```

### University Department
```bash
APP_NAME="CS Department GPU Cluster"
NODE1_LABEL="Teaching-Lab-01"
NODE2_LABEL="Research-Lab-01"
```

### Company
```bash
APP_NAME="ML Infrastructure Monitor"
NODE1_LABEL="Production-GPU-01"
NODE2_LABEL="Production-GPU-02"
```

### Homelab
```bash
APP_NAME="Homelab Monitor"
NODE1_LABEL="Gaming-PC"
NODE2_LABEL="ML-Server"
```

---

## File Reference

| File | Purpose |
|------|---------|
| **README.md** | Complete documentation |
| **QUICK_START.md** | This file - get started fast |
| **DEPLOYMENT_CHECKLIST.md** | Step-by-step deployment |
| **CURRENT_DEPLOYMENT.md** | Your specific setup (DILab) |
| **GENERALIZATION_SUMMARY.md** | What changed and why |
| **GITHUB_RENAME_INSTRUCTIONS.md** | Rename repository guide |
| **nginx.conf.example** | Nginx template to customize |
| **nginx.conf.filled-example** | Nginx reference example |
| **deploy.sh** | Deployment automation script |

---

## Need Help?

1. **Check logs:**
   ```bash
   # Backend
   sudo journalctl -u dilab-monitor -f  # or node-monitor

   # Nginx
   sudo tail -f /var/log/nginx/node-monitor.error.log
   ```

2. **Common issues:**
   - Backend won't start → Check `.env` file paths
   - 502 Bad Gateway → Backend not running on port 3001
   - Nodes not showing → SSH connection issues
   - Login fails → PAM auth or SSH to nodes failing

3. **Documentation:**
   - See README.md troubleshooting section
   - Check CURRENT_DEPLOYMENT.md for your setup
   - Review DEPLOYMENT_CHECKLIST.md

4. **Get support:**
   - Open GitHub issue
   - Check configuration in CURRENT_DEPLOYMENT.md

---

## Next Steps

After getting it running:

1. ✅ Test all features (dashboard, processes, terminal, storage, datasets)
2. ✅ Set up SSL if not using HTTPS
3. ✅ Configure backups (database + .env file)
4. ✅ Set up log rotation
5. ✅ Share access with team
6. ✅ Document any custom changes

---

**Enjoy your Node Monitor deployment!** 🎉

For your DILab deployment, everything is ready to go - just run `./deploy.sh` as usual!
