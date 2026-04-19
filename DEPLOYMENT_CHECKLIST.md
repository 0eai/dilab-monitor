# 🚀 Node Monitor Deployment Checklist

Use this checklist when deploying Node Monitor to a new environment.

---

## 📋 Pre-Deployment Preparation

### Environment Setup
- [ ] Linux system with Ubuntu 20.04+ or similar
- [ ] Node.js 18+ installed
- [ ] npm installed
- [ ] Nginx installed
- [ ] Python 3.8+ with `crypt-r` package
- [ ] Domain name configured (if using SSL)
- [ ] SSH access to all nodes you want to monitor

### On Each Node to Monitor
- [ ] Create `monitor` user: `sudo useradd -r -m -s /bin/bash monitor`
- [ ] Install monitoring tools: `sudo apt install lm-sensors nvidia-utils tmux`
- [ ] Configure sudoers for monitor user (see README.md)
- [ ] Set up SSH key authentication for monitor user
- [ ] Test SSH access: `ssh monitor@nodeX.example.com`

---

## 🔧 Configuration

### 1. Clone and Setup
```bash
- [ ] git clone https://github.com/yourusername/node-monitor.git
- [ ] cd node-monitor
- [ ] cp backend/.env.example backend/.env
```

### 2. Configure Backend Environment (`backend/.env`)

**Application Settings:**
- [ ] Set `APP_NAME="Your Lab Name"`
- [ ] Set `APP_SHORT_NAME="Lab"`
- [ ] Set `DOMAIN_NAME=your-domain.com`

**Security:**
- [ ] Generate and set `JWT_SECRET` (64+ random characters)
  ```bash
  # Generate: openssl rand -base64 64 | tr -d '\n'
  ```

**Node Configuration:**
- [ ] Set `NODE_LOCAL_ID=node2` (or node1, or none)

**Node 1:**
- [ ] Set `NODE1_HOST=actual-hostname-or-ip`
- [ ] Set `NODE1_LABEL=Display-Name-1`
- [ ] Set `NODE1_SSH_PORT=22`

**Node 2:**
- [ ] Set `NODE2_HOST=actual-hostname-or-ip`
- [ ] Set `NODE2_LABEL=Display-Name-2`
- [ ] Set `NODE2_SSH_PORT=22`

**SSH Settings:**
- [ ] Set `SSH_USER=monitor`
- [ ] Set `SSH_KEY_PATH=/path/to/ssh/key`

**Database:**
- [ ] Verify `DB_PATH=./data/node-monitor.db`

### 3. Configure Nginx

```bash
- [ ] cp nginx.conf.example nginx.conf
- [ ] Edit nginx.conf and replace all CHANGE_THIS:
      - [ ] server_name (line 27)
      - [ ] server_name (line 43)
      - [ ] ssl_certificate paths (lines 47-48)
      - [ ] root path (line 69)
      - [ ] upstream port if not 3001 (line 18)
```

---

## 📦 Installation

### Backend
```bash
- [ ] cd backend
- [ ] npm install
- [ ] Test: npm run dev (Ctrl+C to stop)
```

### Frontend
```bash
- [ ] cd frontend
- [ ] npm install
- [ ] Test: npm run dev (Ctrl+C to stop)
- [ ] Verify http://localhost:5173 loads
```

---

## 🌐 Production Deployment

### 1. Build Frontend
```bash
- [ ] cd frontend
- [ ] npm run build
- [ ] Verify dist/ directory created
```

### 2. Deploy Nginx Configuration
```bash
- [ ] sudo cp nginx.conf /etc/nginx/sites-available/node-monitor
- [ ] sudo ln -s /etc/nginx/sites-available/node-monitor /etc/nginx/sites-enabled/
- [ ] sudo nginx -t
- [ ] If errors, fix nginx.conf and retest
```

### 3. SSL Certificate (If Using HTTPS)
```bash
- [ ] sudo certbot --nginx -d your-domain.com
- [ ] Verify certificate installed
- [ ] Test: curl -I https://your-domain.com
```

### 4. Systemd Service
```bash
- [ ] Create /etc/systemd/system/node-monitor.service
      Use example from README.md, update paths
- [ ] sudo systemctl daemon-reload
- [ ] sudo systemctl enable node-monitor
- [ ] sudo systemctl start node-monitor
- [ ] sudo systemctl status node-monitor
- [ ] Check logs: sudo journalctl -u node-monitor -n 50
```

### 5. Start Nginx
```bash
- [ ] sudo systemctl reload nginx
- [ ] sudo systemctl status nginx
```

---

## ✅ Verification

### Backend Health
```bash
- [ ] Service running: sudo systemctl status node-monitor
- [ ] Backend responding: curl http://localhost:3001/api/monitoring/all
- [ ] WebSocket working: Check browser dev console for WS connection
- [ ] Logs clean: sudo journalctl -u node-monitor -n 20
```

### Frontend Access
```bash
- [ ] Domain resolves: ping your-domain.com
- [ ] HTTP redirects to HTTPS: curl -I http://your-domain.com
- [ ] HTTPS loads: curl -I https://your-domain.com
- [ ] Page loads in browser: https://your-domain.com
- [ ] Login page shows correct branding
```

### Authentication
```bash
- [ ] Can login with system user credentials
- [ ] JWT token stored in browser
- [ ] Protected routes require auth
- [ ] Admin users can access admin features
```

### Monitoring Features
```bash
- [ ] Dashboard shows both nodes
- [ ] Node labels match your configuration
- [ ] Real-time metrics updating (check WS status)
- [ ] GPU stats showing (if GPUs present)
- [ ] Process list loads
- [ ] Terminal tab works (can create sessions)
- [ ] Storage page shows disk usage
- [ ] Datasets page loads
```

### SSH Connections
```bash
- [ ] Backend connects to node1: Check logs
- [ ] Backend connects to node2 (or runs locally): Check logs
- [ ] Terminal can SSH to nodes
- [ ] No SSH errors in logs
```

---

## 🔍 Final Checks

### Security
- [ ] JWT_SECRET is strong and random
- [ ] HTTPS enabled and working
- [ ] Security headers present: curl -I https://your-domain.com
- [ ] Rate limiting active (test login endpoint)
- [ ] No secrets in git repository
- [ ] Firewall rules configured (if applicable)

### Performance
- [ ] Page loads in <3 seconds
- [ ] WebSocket connection stable
- [ ] No console errors in browser
- [ ] Nginx logs show no errors
- [ ] Backend memory usage reasonable

### Monitoring
- [ ] All nodes appear in dashboard
- [ ] Metrics update every 5 seconds
- [ ] Alerts work for critical conditions
- [ ] Terminal sessions stable
- [ ] No errors in browser console

---

## 📝 Post-Deployment

### Documentation
- [ ] Document your specific configuration
- [ ] Save `.env` file securely (backup, not in git)
- [ ] Document any custom changes
- [ ] Share access with team members
- [ ] Add to internal documentation

### Maintenance
- [ ] Set up log rotation
  ```bash
  sudo nano /etc/logrotate.d/node-monitor
  ```
- [ ] Schedule database backups
- [ ] Monitor disk usage
- [ ] Set up monitoring alerts (external)
- [ ] Plan for updates/patches

### Team Onboarding
- [ ] Share deployment URL
- [ ] Explain permission model
- [ ] Show how to use terminal feature
- [ ] Demonstrate dataset hub
- [ ] Provide support contact

---

## 🆘 Troubleshooting

If something doesn't work:

1. **Check backend logs:**
   ```bash
   sudo journalctl -u node-monitor -f
   ```

2. **Check nginx logs:**
   ```bash
   sudo tail -f /var/log/nginx/node-monitor.error.log
   ```

3. **Verify configuration:**
   ```bash
   # Backend env loaded
   sudo systemctl show node-monitor | grep Environment

   # Nginx config valid
   sudo nginx -t
   ```

4. **Test connectivity:**
   ```bash
   # Backend port open
   sudo netstat -tlnp | grep 3001

   # SSH to nodes works
   ssh -i $SSH_KEY_PATH $SSH_USER@$NODE1_HOST
   ```

5. **Check permissions:**
   ```bash
   # Backend user in shadow group
   groups $(whoami)

   # Monitor user has sudo rights on nodes
   ssh monitor@node1 "sudo -l"
   ```

See [README.md](README.md) and [GENERALIZATION_SUMMARY.md](GENERALIZATION_SUMMARY.md) for detailed troubleshooting.

---

## ✨ Done!

Once all checkboxes are complete, your Node Monitor deployment is ready! 🎉

**Access:** https://your-domain.com
**Support:** Open issue at GitHub repository

---

**Last Updated:** 2024
**Version:** 1.0
