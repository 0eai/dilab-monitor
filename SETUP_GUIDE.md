# 🚀 Setup Script Guide

The interactive setup script (`setup.sh`) makes deploying Node Monitor incredibly easy. Just run it and answer a few questions!

---

## Quick Start

```bash
./setup.sh
```

That's it! The script will guide you through everything.

---

## What It Does

The setup script automates the entire configuration and deployment process:

1. ✅ **Checks Prerequisites** - Verifies Node.js, npm, nginx, etc.
2. ✅ **Interactive Wizard** - Prompts for all configuration values
3. ✅ **Generates Files** - Creates `.env`, `nginx.conf`, and service files
4. ✅ **SSH Keys** - Optionally generates and distributes SSH keys
5. ✅ **Installs Dependencies** - Runs `npm install` for backend and frontend
6. ✅ **Deploys Application** - Builds, installs service, configures nginx
7. ✅ **Provides Next Steps** - Shows exactly what to do next

---

## Configuration Wizard

The wizard will ask you for:

### Application Settings
- **App Name** - Display name (e.g., "Lab Monitor")
- **Short Name** - Compact version (e.g., "Lab")

### Server Settings
- **System User** - User to run the service (defaults to current user)
- **Backend Port** - Port for Node.js backend (default: 3001)
- **Domain Name** - Your domain or "localhost" for dev mode

### Node Configuration
- **Local Node ID** - Which node runs the backend (node1, node2, or none)
- **Node 1 Details** - Hostname, label, SSH port
- **Node 2 Details** - Hostname, label, SSH port

### SSH Configuration
- **SSH User** - Username for monitoring (default: monitor)
- **SSH Key Path** - Path to SSH key
- **Generate Key** - Auto-generate if key doesn't exist

### Deployment
- **Database Path** - Where to store SQLite database
- **Service Name** - Systemd service name

---

## Example Run

```
./setup.sh

    ███╗   ██╗ ██████╗ ██████╗ ███████╗    ███╗   ███╗ ██████╗ ███╗   ██╗██╗████████╗ ██████╗ ██████╗
    ████╗  ██║██╔═══██╗██╔══██╗██╔════╝    ████╗ ████║██╔═══██╗████╗  ██║██║╚══██╔══╝██╔═══██╗██╔══██╗
    ██╔██╗ ██║██║   ██║██║  ██║█████╗      ██╔████╔██║██║   ██║██╔██╗ ██║██║   ██║   ██║   ██║██████╔╝
    ██║╚██╗██║██║   ██║██║  ██║██╔══╝      ██║╚██╔╝██║██║   ██║██║╚██╗██║██║   ██║   ██║   ██║██╔══██╗
    ██║ ╚████║╚██████╔╝██████╔╝███████╗    ██║ ╚═╝ ██║╚██████╔╝██║ ╚████║██║   ██║   ╚██████╔╝██║  ██║
    ╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚══════╝    ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝

                            Interactive Setup Wizard

ℹ This wizard will help you set up Node Monitor step by step.

═══════════════════════════════════════════════════
  Checking Prerequisites
═══════════════════════════════════════════════════

✓ node is installed
✓ npm is installed
✓ nginx is installed
✓ git is installed

═══════════════════════════════════════════════════
  Configuration Wizard
═══════════════════════════════════════════════════

━━━ Application Settings ━━━
Application name [Node Monitor]: My Lab Monitor
Short name [Nodes]: MyLab

━━━ Server Settings ━━━
System user to run the service [oem]:
Backend port [3001]:
Domain name (e.g., monitor.example.com) [localhost]: monitor.mylab.edu

━━━ Security ━━━
ℹ Generating JWT secret...
✓ JWT secret generated (64 characters)

... (continues with all prompts)

═══════════════════════════════════════════════════
  Configuration Summary
═══════════════════════════════════════════════════

Application:
  Name:              My Lab Monitor
  Short Name:        MyLab
...

Proceed with this configuration? [Y/n]: y

✓ Created backend/.env
✓ Created nginx.conf
✓ Created node-monitor.service
...

Setup Complete! 🎉
```

---

## Generated Files

The script creates or modifies:

| File | Purpose |
|------|---------|
| `backend/.env` | Backend environment variables |
| `nginx.conf` | Nginx reverse proxy configuration |
| `node-monitor.service` | Systemd service file |
| `.setup-config` | Saved configuration (for re-runs) |

---

## Development vs Production

### Development Mode (localhost)

When you enter "localhost" as the domain:
- ✅ Generates `.env` file
- ✅ Installs dependencies
- ✅ Skips nginx and systemd setup
- ✅ Shows how to run in dev mode

**Start development:**
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

### Production Mode (real domain)

When you enter a real domain:
- ✅ Generates all files (.env, nginx.conf, service file)
- ✅ Installs dependencies
- ✅ Builds frontend
- ✅ Installs systemd service
- ✅ Configures nginx
- ✅ Provides SSL setup instructions

---

## Advanced Usage

### Re-run with Previous Config

The script saves your configuration in `.setup-config`. When you re-run:

```bash
./setup.sh
```

It will offer to load your previous configuration, allowing you to:
- Quickly update one or two values
- Re-generate files after manual edits
- Deploy to a new server with same config

### Manual Configuration

You can also edit the templates directly before running setup:

```bash
# Edit templates
nano templates/.env.template
nano templates/nginx.conf.template
nano templates/systemd.service.template

# Then run setup
./setup.sh
```

### Skip Prompts (Advanced)

Create `.setup-config` manually with your values, then run setup - it will use those values.

---

## SSH Key Management

The script can generate SSH keys automatically:

1. **Detects Missing Key** - If SSH key path doesn't exist
2. **Offers to Generate** - Prompts to create ed25519 key
3. **Shows Public Key** - Displays key to copy
4. **Auto-Copy** - Optionally copies key to nodes via `ssh-copy-id`

**Manual key distribution:**
```bash
# Copy to Node 1
ssh-copy-id -i ~/.ssh/node_monitor.pub -p 22 monitor@node1.example.com

# Copy to Node 2
ssh-copy-id -i ~/.ssh/node_monitor.pub -p 22 monitor@node2.example.com
```

---

## Troubleshooting

### Script Fails on Prerequisites

**Solution:** Install missing packages
```bash
sudo apt update
sudo apt install nodejs npm nginx git python3
```

### SSH Key Copy Fails

**Solution:** Copy key manually
```bash
# Show public key
cat ~/.ssh/node_monitor.pub

# SSH to node and add it
ssh admin@nodeX.example.com
sudo mkdir -p /home/monitor/.ssh
sudo bash -c 'cat >> /home/monitor/.ssh/authorized_keys' << EOF
paste-public-key-here
EOF
sudo chown -R monitor:monitor /home/monitor/.ssh
sudo chmod 700 /home/monitor/.ssh
sudo chmod 600 /home/monitor/.ssh/authorized_keys
```

### Service Won't Start

**Solution:** Check logs
```bash
sudo journalctl -u node-monitor -n 50
```

Common issues:
- Wrong paths in .env
- Backend dependencies not installed
- Port already in use
- SSH connections failing

### Nginx Configuration Invalid

**Solution:** Test and fix
```bash
sudo nginx -t
# Fix errors shown, then:
sudo systemctl reload nginx
```

---

## What Setup Script Doesn't Do

The script automates most tasks, but you still need to:

1. **SSL Certificates** - Run certbot after setup:
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

2. **Monitor User Setup** - Create monitor users on each node (see README.md)

3. **Firewall Configuration** - Open necessary ports

4. **DNS Configuration** - Point your domain to the server

5. **Node Specs** - Update GPU/CPU specs in `backend/src/ssh/sshManager.js`

---

## Post-Setup Checklist

After running setup:

- [ ] SSL certificate installed (production only)
- [ ] Monitor user created on all nodes
- [ ] SSH keys copied to all nodes
- [ ] Service is running: `sudo systemctl status node-monitor`
- [ ] Nginx is running: `sudo systemctl status nginx`
- [ ] Can access dashboard
- [ ] Can login with system credentials
- [ ] All nodes appear in dashboard
- [ ] Real-time metrics updating

---

## Templates

The script uses templates from the `templates/` directory:

- **`.env.template`** - Backend environment variables
- **`nginx.conf.template`** - Nginx reverse proxy config
- **`systemd.service.template`** - Systemd service definition

Template variables use `{{VARIABLE_NAME}}` syntax and are replaced during setup.

---

## Examples

### Research Lab Setup

```bash
./setup.sh

# Prompts:
Application name: AI Research Lab Monitor
Short name: AI Lab
Domain: monitor.ai-lab.edu
Node 1 host: gpu-server-01.ai-lab.edu
Node 1 label: Training Server A
Node 2 host: gpu-server-02.ai-lab.edu
Node 2 label: Training Server B
```

### Corporate IT Setup

```bash
./setup.sh

# Prompts:
Application name: Infrastructure Monitor
Short name: IT Monitor
Domain: monitor.company.com
Node 1 host: prod-gpu-01.internal
Node 1 label: Production 01
Node 2 host: prod-gpu-02.internal
Node 2 label: Production 02
```

### Development Setup

```bash
./setup.sh

# Prompts:
Application name: Node Monitor
Short name: Nodes
Domain: localhost  # ← Triggers dev mode
Node 1 host: 192.168.1.100
Node 1 label: Test Node 1
Node 2 host: 192.168.1.101
Node 2 label: Test Node 2
```

---

## Related Documentation

- **[README.md](README.md)** - Complete application documentation
- **[QUICK_START.md](QUICK_START.md)** - Quick reference guide
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Detailed deployment steps
- **[CURRENT_DEPLOYMENT.md](CURRENT_DEPLOYMENT.md)** - Your specific setup

---

## Support

If you encounter issues with the setup script:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review the generated files (`.env`, `nginx.conf`, etc.)
3. Check logs: `sudo journalctl -u node-monitor -n 50`
4. Open an issue on GitHub

---

**The setup script makes deployment easy - just run `./setup.sh` and answer the questions!** 🎉
