# 🎯 Setup Script - Complete Overview

## What is setup.sh?

**`setup.sh`** is an interactive wizard that automates the entire Node Monitor configuration and deployment process. Instead of manually editing multiple files, just run the script and answer questions!

---

## 🚀 Quick Start

```bash
./setup.sh
```

The script will:
1. Check prerequisites (Node.js, npm, nginx, etc.)
2. Ask configuration questions with smart defaults
3. Generate all necessary files
4. Install dependencies
5. Deploy the application

**That's it!** No manual file editing required.

---

## 📊 Comparison: Manual vs Setup Script

### Manual Setup (Old Way)
```bash
# Edit backend/.env manually
nano backend/.env
# Update 20+ variables manually
# Easy to make mistakes

# Copy and edit nginx.conf
cp nginx.conf.example nginx.conf
nano nginx.conf
# Replace 8+ placeholders manually

# Create systemd service file
nano /etc/systemd/system/node-monitor.service
# Write service definition from scratch

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Build and deploy
cd frontend && npm run build
sudo cp -r dist /var/www/node-monitor
sudo systemctl enable node-monitor
sudo systemctl start node-monitor
sudo nginx -t && sudo systemctl reload nginx
```

### Setup Script (New Way)
```bash
./setup.sh
# Answer a few questions
# Everything is done automatically!
```

**Time saved:** ~30 minutes → 5 minutes ⚡

---

## 🎨 Features

### ✅ Smart Defaults
- Detects current user
- Suggests reasonable values
- Uses localhost for development
- Generates secure secrets

### ✅ Validation
- Checks domain names
- Validates port numbers
- Verifies file paths
- Tests prerequisites

### ✅ Automation
- Generates `.env` file
- Creates `nginx.conf`
- Builds systemd service
- Installs dependencies
- Deploys application

### ✅ SSH Management
- Generates SSH keys
- Copies keys to nodes
- Tests connections
- Shows troubleshooting

### ✅ Configuration Saving
- Saves your answers
- Reloads on re-run
- Quick updates
- No repetition

---

## 📁 Files Created

After running `./setup.sh`, you'll have:

```
node-monitor/
├── backend/
│   └── .env                 ← Generated from your answers
├── nginx.conf                ← Ready to deploy
├── node-monitor.service      ← Systemd service file
├── .setup-config             ← Saved configuration
└── templates/               ← Templates used (don't edit these)
    ├── .env.template
    ├── nginx.conf.template
    └── systemd.service.template
```

---

## 🎯 Use Cases

### 1. Fresh Installation

```bash
git clone https://github.com/yourusername/node-monitor.git
cd node-monitor
./setup.sh
```

Perfect for first-time setup on a new server.

### 2. Development Setup

```bash
./setup.sh
# Domain: localhost  ← Triggers dev mode
# Generates .env, installs deps
# Shows how to run dev servers
```

Great for local testing.

### 3. Update Configuration

```bash
./setup.sh
# Found existing configuration
# Load previous? [Y/n]: y
# Change just what you need
# Re-generate files
```

Easy config updates.

### 4. Multiple Deployments

```bash
# Server 1
./setup.sh
# Domain: monitor.lab1.edu

# Server 2
./setup.sh
# Domain: monitor.lab2.edu
```

Deploy to multiple servers with different configs.

---

## 🔧 Configuration Questions

The wizard asks for:

| Category | Questions | Examples |
|----------|-----------|----------|
| **Application** | Name, Short Name | "Lab Monitor", "Lab" |
| **Server** | User, Port, Domain | oem, 3001, monitor.edu |
| **Security** | JWT Secret | Auto-generated |
| **Nodes** | Hosts, Labels, Ports | node1.edu, "Server 1", 22 |
| **SSH** | User, Key Path | monitor, ~/.ssh/key |
| **Database** | File Path | ./data/node-monitor.db |

All questions have sensible defaults - just press Enter to accept.

---

## 🎬 Example Session

```bash
$ ./setup.sh

    ███╗   ██╗ ██████╗ ██████╗ ███████╗
    ████╗  ██║██╔═══██╗██╔══██╗██╔════╝
    ...

═══════════════════════════════════════════════════
  Checking Prerequisites
═══════════════════════════════════════════════════

✓ node is installed
✓ npm is installed
✓ nginx is installed

═══════════════════════════════════════════════════
  Configuration Wizard
═══════════════════════════════════════════════════

━━━ Application Settings ━━━
Application name [Node Monitor]: ▌
# Just press Enter for defaults or type your value

... (continue answering questions)

═══════════════════════════════════════════════════
  Configuration Summary
═══════════════════════════════════════════════════

Application:
  Name:              Node Monitor
  ...

Proceed with this configuration? [Y/n]: y

✓ Created backend/.env
✓ Created nginx.conf
✓ Installing backend dependencies...
✓ Installing frontend dependencies...
✓ Building frontend...
✓ Service started successfully

Setup Complete! 🎉

Access: https://your-domain.com
```

---

## 💡 Tips & Tricks

### 1. Test First with Localhost

```bash
./setup.sh
Domain: localhost  # Dev mode
# Test everything works
# Then re-run with real domain
```

### 2. Save Time with Defaults

Most defaults are perfect - just press Enter:
- ✅ Port 3001 works fine
- ✅ SSH user "monitor" is standard
- ✅ Default paths are sensible

### 3. Re-run Anytime

```bash
./setup.sh
# Load previous configuration? Y
# Update just one or two values
# Re-generate all files
```

### 4. Review Before Confirm

The script shows a complete summary before applying changes. Review carefully!

---

## 🆘 Troubleshooting

### "Command not found: setup.sh"

Make it executable:
```bash
chmod +x setup.sh
./setup.sh
```

### Prerequisites Check Fails

Install missing packages:
```bash
sudo apt update
sudo apt install nodejs npm nginx git
```

### Service Won't Start

Check logs:
```bash
sudo journalctl -u node-monitor -n 50
```

### Nginx Config Invalid

Test configuration:
```bash
sudo nginx -t
```

### SSH Key Issues

Generate manually:
```bash
ssh-keygen -t ed25519 -f ~/.ssh/node_monitor
ssh-copy-id -i ~/.ssh/node_monitor.pub monitor@node.com
```

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| **[SETUP_GUIDE.md](SETUP_GUIDE.md)** | Detailed setup script documentation |
| **[README.md](README.md)** | Complete application documentation |
| **[QUICK_START.md](QUICK_START.md)** | Quick reference guide |
| **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** | Manual deployment checklist |

---

## 🔄 Workflow

```
┌─────────────────┐
│   ./setup.sh    │
└────────┬────────┘
         │
         ├─► Check Prerequisites
         │   ├─ Node.js ≥ 18
         │   ├─ npm
         │   ├─ nginx
         │   └─ git
         │
         ├─► Configuration Wizard
         │   ├─ Application settings
         │   ├─ Server settings
         │   ├─ Node configuration
         │   ├─ SSH settings
         │   └─ Database path
         │
         ├─► Show Summary
         │   └─ Confirm? (Y/n)
         │
         ├─► Generate Files
         │   ├─ backend/.env
         │   ├─ nginx.conf
         │   └─ systemd service
         │
         ├─► SSH Keys (optional)
         │   ├─ Generate key
         │   └─ Copy to nodes
         │
         ├─► Install Dependencies
         │   ├─ npm install (backend)
         │   └─ npm install (frontend)
         │
         ├─► Deploy
         │   ├─ Build frontend
         │   ├─ Install service
         │   └─ Configure nginx
         │
         └─► Success!
             └─ Show access URLs
```

---

## 🎉 Success Indicators

After a successful setup:

- ✅ Files created in correct locations
- ✅ No error messages during install
- ✅ Service status shows "active (running)"
- ✅ Nginx config test passes
- ✅ Can access login page
- ✅ Backend responds to API calls

---

## 🚀 Next Steps After Setup

1. **SSL Certificate** (Production)
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

2. **Monitor User** (On Each Node)
   ```bash
   sudo useradd -r -m -s /bin/bash monitor
   # Configure sudoers (see README.md)
   ```

3. **Test Login**
   - Open browser to your domain
   - Login with system credentials
   - Verify all features work

4. **Configure Monitoring**
   - Check all nodes appear
   - Verify SSH connections
   - Test terminal access
   - Review metrics

---

## 💪 Why Use the Setup Script?

| Advantage | Benefit |
|-----------|---------|
| **Faster** | 5 minutes vs 30+ minutes manual setup |
| **Easier** | Answer questions vs edit 3+ files |
| **Safer** | Validation prevents mistakes |
| **Repeatable** | Same setup every time |
| **Documented** | Saves configuration for reference |
| **Flexible** | Dev or production mode |
| **Smart** | Auto-generates secrets, detects settings |

---

**The setup script is the recommended way to deploy Node Monitor!** 🎯

Just run `./setup.sh` and follow the prompts. Everything else is automatic.

For detailed information, see [SETUP_GUIDE.md](SETUP_GUIDE.md).
