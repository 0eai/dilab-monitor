# Node Monitor

> **Full-stack server management and monitoring platform for multi-node environments.**
> Real-time GPU thermals, VRAM zombie detection, tmux terminal, per-user resource tracking,
> open ports, SSH sessions, storage analytics, and a collaborative dataset hub —
> across multiple Linux nodes via live WebSocket streaming.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Directory Structure](#directory-structure)
3. [Tech Stack](#tech-stack)
4. [Step-by-Step Setup](#step-by-step-setup)
5. [Authentication Flow](#authentication-flow)
6. [Feature Access & Permission Model](#feature-access--permission-model)
7. [Adding & Removing Nodes](#adding--removing-nodes)
8. [Feature Guide](#feature-guide)
9. [SSH Monitor User Setup](#ssh-monitor-user-setup)
10. [Deployment](#deployment)
11. [Security Notes](#security-notes)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser (User)                              │
│  React 18 + Vite + Tailwind  ·  Zustand  ·  TanStack Query     │
│  xterm.js (terminal)  ·  Recharts  ·  WebSocket (live metrics)  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP + WebSocket
┌──────────────────────────────▼──────────────────────────────────┐
│                  Node.js Backend  (Fastify)                     │
│                  Hosted on one of your nodes                    │
│                                                                 │
│  /api/auth        ── PAM/shadow auth → JWT (8h TTL)            │
│  /api/monitoring  ── Cached snapshots + historical ring buf     │
│  /api/processes   ── List, zombie-detect, kill                  │
│  /api/extras      ── Ports, SSH sessions, storage-by-user       │
│  /api/datasets    ── CRUD + rsync SSE sync                      │
│  /api/terminal    ── tmux WebSocket bridge (xterm.js)           │
│  /ws/metrics      ── WebSocket broadcast (5s interval)          │
│                                                                 │
│  node-cron (5s) ──► SSH Manager ──► MetricsCache ──► WS push   │
│                                                                 │
└───────────────┬──────────────────────────┬──────────────────────┘
                │ SSH (ssh2) or local exec │
┌───────────────▼──────────┐  ┌────────────▼────────────────────┐
│   Node 1                 │  │   Node 2 (can be LOCAL)         │
│   (configurable host)    │  │   (configurable host)           │
│   SSH monitoring         │  │   SSH or local child_process    │
└──────────────────────────┘  └─────────────────────────────────┘
```

**Data flow for live metrics:**
1. `node-cron` fires every 5 seconds
2. Scheduler fetches all nodes **concurrently** via `Promise.allSettled`
3. Local node (if `NODE_LOCAL_ID` is set) runs commands via `child_process.exec` (zero SSH overhead)
4. Remote nodes run commands over persistent SSH connections
5. Parsed data stored in `MetricsCache` (360-entry ring buffer = 30 min history)
6. Broadcast to all connected WebSocket clients atomically

---

## Directory Structure

```
node-monitor/
├── README.md
├── backend/
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── index.js                      # Fastify server + plugin registration
│       ├── auth/
│       │   ├── pamAuth.js                # Python crypt + sshpass auth strategy
│       │   ├── routes.js                 # POST /login, GET /me, POST /refresh
│       │   └── verifyPassword.py         # /etc/shadow verifier (Python 3.13+ safe)
│       ├── monitoring/
│       │   ├── monitoringService.js      # All SSH command parsers + zombie detection
│       │   ├── routes.js                 # GET /all, /node/:id, /alerts, /historical
│       │   ├── processRoutes.js          # GET /list, /zombies; POST /kill, /kill-batch
│       │   ├── extrasRoutes.js           # GET /ports, /ssh-sessions, /storage-by-user
│       │   ├── terminalRoutes.js         # WebSocket tmux bridge
│       │   └── scheduler.js             # node-cron polling + MetricsCache + WS broadcast
│       ├── ssh/
│       │   └── sshManager.js            # Connection pool, local/remote exec routing
│       ├── datasets/
│       │   └── routes.js                # CRUD + rsync SSE streaming
│       └── utils/
│           └── database.js              # better-sqlite3 init + schema + tag seeds
│
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx                       # Router + WS init + QueryClient
        ├── index.css                     # Tailwind + custom CSS vars + animations
        ├── hooks/
        │   └── usePermissions.js         # ★ Centralized permission matrix
        ├── pages/
        │   ├── LoginPage.jsx             # System credential form
        │   ├── DashboardPage.jsx         # Overview: nodes, thermals, ports, SSH, users
        │   ├── ProcessesPage.jsx         # Processes, VRAM, zombies, kill switch
        │   ├── StoragePage.jsx           # Filesystem overview + per-user usage + chart
        │   ├── DatasetsPage.jsx          # Dataset hub: register, tag, markdown, sync
        │   └── TerminalPage.jsx          # xterm.js + tmux multi-tab terminal
        ├── components/
        │   ├── dashboard/
        │   │   └── Layout.jsx            # Sidebar nav + status pills + alert count
        │   └── monitoring/
        │       ├── AlertBanner.jsx       # Flashing critical/warning banner
        │       ├── NodeCard.jsx          # Per-node card with sparklines
        │       ├── ThermalPanel.jsx      # GPU arc gauges + CPU core grid
        │       ├── StoragePanel.jsx      # Filesystem bars
        │       ├── UserResourceTable.jsx # Per-user CPU/RAM/VRAM table
        │       ├── OpenPortsCard.jsx     # Listening ports with process/user info
        │       └── SSHSessionsCard.jsx   # Active sessions + recent login history
        ├── stores/
        │   ├── authStore.js              # Zustand auth (persisted JWT)
        │   └── metricsStore.js           # WS client + metrics state + history buffer
        └── utils/
            ├── api.js                    # Axios instance + 401 interceptor
            └── format.js                # formatMiB, getThermalColor, relativeTime…
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 18 + Vite | Fast HMR, modern React |
| Styling | Tailwind CSS v3 | Utility-first dark theme |
| Terminal | xterm.js v5 | Full VT100/256-color PTY rendering |
| Charts | Recharts | Composable area/line/bar charts |
| State | Zustand | Minimal boilerplate, persist middleware |
| Data fetching | TanStack Query | Auto-refetch, mutation cache |
| Real-time | Native WebSocket | Direct push, minimal overhead |
| Backend | Fastify v4 | High-throughput, schema validation |
| SSH | ssh2 | Persistent connections, exec + PTY shell |
| Auth | Python crypt + sshpass | No native modules, works with yescrypt |
| Database | better-sqlite3 | Zero-config, fast, dataset metadata |
| Scheduler | node-cron | 5-second polling trigger |

---

## Step-by-Step Setup

### Prerequisites

```bash
# On the backend host node:
sudo apt install -y libpam-dev build-essential pamtester sshpass tmux
pip install crypt-r           # Python 3.13+ yescrypt support

# Shadow group for password verification:
sudo usermod -aG shadow $USER
exec su -l $USER              # apply without logout

# Sudoers for monitoring commands (backend user on local node):
cat << 'EOF' | sudo tee /etc/sudoers.d/node-monitor
# Storage monitoring
$USER ALL=(ALL) NOPASSWD: /usr/bin/du

# Port monitoring - required for process/user info on all ports
$USER ALL=(ALL) NOPASSWD: /usr/bin/ss
$USER ALL=(ALL) NOPASSWD: /usr/bin/netstat
$USER ALL=(ALL) NOPASSWD: /usr/bin/ps
EOF
sudo chmod 440 /etc/sudoers.d/node-monitor

# On remote nodes — install tools the monitor user will run:
sudo apt install -y lm-sensors nvidia-utils tmux
sudo sensors-detect --auto
```

### 1. Clone & configure

```bash
git clone https://github.com/yourusername/node-monitor.git
cd node-monitor
cp backend/.env.example backend/.env
nano backend/.env   # Configure all settings (see below)
```

**Key environment variables to configure:**

```bash
# Application
APP_NAME="Node Monitor"
APP_SHORT_NAME="Nodes"

# Server
PORT=3001
DOMAIN_NAME=your-domain.com

# Security
JWT_SECRET=change-me-to-a-long-random-secret-at-least-64-chars

# Local Node
NODE_LOCAL_ID=node2  # or node1, or none if backend is on separate machine

# SSH Configuration
SSH_USER=monitor
SSH_KEY_PATH=/home/monitor/.ssh/id_ed25519

# Node Configuration
NODE1_HOST=node1.example.com
NODE1_LABEL=Server-01
NODE1_SSH_PORT=22

NODE2_HOST=node2.example.com
NODE2_LABEL=Server-02
NODE2_SSH_PORT=22

# Database
DB_PATH=./data/node-monitor.db
```

### 2. SSH key setup (for remote nodes)

```bash
# Generate key on backend host:
ssh-keygen -t ed25519 -C "node-monitor" -f ~/.ssh/node_monitor -N ""

# Copy to remote node:
ssh-copy-id -i ~/.ssh/node_monitor.pub -p 22 monitor@node1.example.com

# Test:
ssh -i ~/.ssh/node_monitor -p 22 monitor@node1.example.com "whoami"
```

### 3. Install & run

```bash
# Backend:
cd backend && npm install && npm run dev

# Frontend (separate terminal):
cd frontend && npm install && npm run dev
# → http://localhost:5173
```

### 4. Login

Use any Linux system account from any monitored node. Admin access is granted automatically for users in the `sudo` group.

---

## Authentication Flow

```
Browser                    Backend                      Linux OS
  │                           │                             │
  │  POST /api/auth/login     │                             │
  │  { username, password }   │                             │
  ├──────────────────────────►│                             │
  │                           │  userExistsLocally()?       │
  │                           │  getent passwd $user        │
  │                           │                             │
  │                           │  YES → verifyPassword.py    │
  │                           │    reads /etc/shadow        │
  │                           │    crypt.crypt(pass, hash)  │
  │                           │    supports yescrypt $y$    │
  │                           │                             │
  │                           │  NO → sshpass SSH to nodes  │
  │                           │    tries each configured node│
  │                           │    runs `id` command        │
  │                           │                             │
  │                           │  jwt.sign({                 │
  │                           │    username, isAdmin,       │
  │                           │    groups, uid, exp: 8h     │
  │                           │  })                         │
  │◄──────────────────────────│                             │
  │  { token, user }          │                             │
  │                           │                             │
  │  Zustand + localStorage   │                             │
  │  Authorization: Bearer …  │                             │
```

**isAdmin** is determined by real Linux group membership: `sudo`, `admin`, or `wheel`.

---

## Feature Access & Permission Model

All access control flows through a **single hook** on the frontend and **decorator checks** on the backend. This is the complete matrix:

| Action | Standard User | Admin (sudo group) | Implementation |
|--------|:---:|:---:|---|
| View dashboard / metrics | ✅ | ✅ | `authenticate` hook on all routes |
| View processes | ✅ | ✅ | `authenticate` hook |
| View open ports | ✅ | ✅ | `authenticate` hook |
| View SSH sessions | ✅ | ✅ | `authenticate` hook |
| View storage overview | ✅ | ✅ | `authenticate` hook |
| View per-user storage | ✅ | ✅ | `authenticate` hook |
| View datasets | ✅ | ✅ | `authenticate` hook |
| Kill **own** process | ✅ | ✅ | `proc.user === username` check |
| Kill **other users'** process | ❌ | ✅ | `isAdmin` check in `processRoutes.js` |
| Batch kill zombies | ❌ | ✅ | `requireAdmin` decorator |
| Register dataset | ✅ | ✅ | Authenticated, owner set to caller |
| Edit / delete **own** dataset | ✅ | ✅ | `dataset.owner === username` check |
| Edit / delete **any** dataset | ❌ | ✅ | `isAdmin` check in `datasets/routes.js` |
| Sync dataset | ✅ (own) | ✅ | Owner or admin check |
| Open **own** tmux session | ✅ | ✅ | session name must equal username |
| Attach to **any** tmux session | ❌ | ✅ | `isAdmin` check in `terminalRoutes.js` |
| Create named tmux session | ❌ | ✅ | `isAdmin` check in `terminalRoutes.js` |

---

## Adding & Removing Nodes

The node registry is the **single source of truth**. You only ever touch two files.

### Adding a new node

**Step 1 — `backend/src/ssh/sshManager.js`**: add to the `NODES` object:

```js
export const NODES = {
  node1: { ... },
  node2: { ... },

  // ADD THIS:
  node3: {
    id: 'node3',
    label: process.env.NODE3_LABEL || 'Node 3',
    host: process.env.NODE3_HOST || 'node3.example.com',
    port: parseInt(process.env.NODE3_SSH_PORT || '22'),
    username: process.env.SSH_USER || 'monitor',
    specs: {
      gpus: ['RTX 4090', 'RTX 4090'],
      cores: 32,
      ramGB: 256,
      gpuThermalCritical: false
    }
  }
};
```

**Step 2 — `backend/.env`**: add host variables:

```bash
NODE3_HOST=node3.example.com
NODE3_LABEL=Server-03
NODE3_SSH_PORT=22
```

**Step 3 — Set up the `monitor` user on the new server** (same as other nodes).

**Step 4 — Copy SSH public key** to the new server:
```bash
ssh-copy-id -i ~/.ssh/node_monitor.pub -p 22 monitor@node3.example.com
```

**That's it.** Everything else reads `Object.keys(NODES)` dynamically.

### Removing a node

**Step 1** — Delete the entry from `NODES` in `sshManager.js`.

**Step 2** — Remove the corresponding env variables from `.env`.

Restart the backend — the removed node will no longer appear.

### Setting a node as "local" (no SSH)

If you move the backend to a different server, update `.env`:
```bash
# Backend is now on node1:
NODE_LOCAL_ID=node1
```
That node will use `child_process.exec` instead of SSH — no `monitor` user needed on it.

---

## Feature Guide

### Dashboard (`/`)

| Panel | What it shows | Refresh |
|-------|--------------|---------|
| **Alert Banner** | Flashing critical GPU/RAM alerts | 5s (WS) |
| **Node Cards** | CPU%, RAM%, per-GPU temp/VRAM/util, load avg, mini sparklines | 5s (WS) |
| **Thermal Panels** | Arc gauges per GPU, temp history sparklines, CPU core grid | 5s (WS) |
| **Storage Panels** | Filesystems with usage bars | 5s (WS) |
| **SSH Sessions** | Active sessions per node + recent login history | 15s |
| **Open Ports** | Listening ports with process, PID, user (requires sudo) | 30s |
| **User Resource Table** | Every user's CPU, RAM, VRAM across all nodes | 5s (WS) |

### Processes & GPU (`/processes`)

| Feature | Detail |
|---------|--------|
| Process list | All processes >0.5% CPU/RAM, sorted by VRAM desc |
| VRAM column | Per-process from `nvidia-smi --query-compute-apps` |
| Zombie badge | Skull icon — idle >5min while holding VRAM |
| Kill buttons | Graceful (SIGTERM) / Force (SIGKILL) — two-step confirm |
| Batch zombie kill | Admin-only one-click per node |
| Filters | By node, type (All/GPU/Zombies/Heavy), text search |

### Storage (`/storage`)

| Tab | Detail |
|-----|--------|
| Overview | All filesystems per node, used/free/total |
| Per-User Usage | `sudo du` ranked list with hover mount breakdown |
| Comparison | Stacked bar chart — all nodes side by side per user |

### Terminal (`/terminal`)

| Feature | Detail |
|---------|--------|
| tmux bridge | xterm.js → WebSocket → SSH PTY → tmux attach |
| Multi-tab | Open multiple sessions simultaneously |
| Node selector | Switch between configured nodes |
| Session picker | List active sessions, create new ones |
| Permission | Standard users: own session only. Admins: any session |
| Resize | Terminal resizes automatically with the window |

### Dataset Hub (`/datasets`)

| Feature | Detail |
|---------|--------|
| Register | Name, path, node, tags, Markdown README |
| Tag system | 12 pre-seeded tags + user-defined, color-coded |
| Sync | rsync over SSH with SSE progress bar |
| Access | Edit/delete own datasets; admins edit any |

---

## SSH Monitor User Setup

```bash
# On each node — create limited monitor account:
sudo useradd -r -m -s /bin/bash monitor

# Allow specific commands without password:
cat << 'EOF' | sudo tee /etc/sudoers.d/node-monitor
# System monitoring
monitor ALL=(ALL) NOPASSWD: /usr/bin/sensors
monitor ALL=(ALL) NOPASSWD: /usr/bin/du

# Port monitoring - required for process/user info on all ports
monitor ALL=(ALL) NOPASSWD: /usr/bin/ss
monitor ALL=(ALL) NOPASSWD: /usr/bin/netstat
monitor ALL=(ALL) NOPASSWD: /usr/bin/ps

# Process management
monitor ALL=(ALL) NOPASSWD: /bin/kill
EOF
sudo chmod 440 /etc/sudoers.d/node-monitor
```

**Important:** The port monitoring feature requires `ss`, `netstat`, and `ps` with sudo privileges. Without these, the Open Ports display can only show process/user information for ports owned by the monitor user.

---

## Deployment

### Systemd service

```ini
# /etc/systemd/system/node-monitor.service
[Unit]
Description=Node Monitor Backend
After=network.target

[Service]
Type=simple
User=yourusername
WorkingDirectory=/path/to/node-monitor/backend
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=5
EnvironmentFile=/path/to/node-monitor/backend/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now node-monitor
```

### Nginx reverse proxy

We provide example configurations to get you started:

- **[nginx.conf.example](nginx.conf.example)** - Template with `CHANGE_THIS` placeholders
- **[nginx.conf.filled-example](nginx.conf.filled-example)** - Reference showing completed configuration

**Quick setup:**

```bash
# Copy the example template
cp nginx.conf.example nginx.conf

# Edit and replace all CHANGE_THIS placeholders
nano nginx.conf

# Deploy to nginx
sudo cp nginx.conf /etc/nginx/sites-available/node-monitor
sudo ln -s /etc/nginx/sites-available/node-monitor /etc/nginx/sites-enabled/

# Get SSL certificate (certbot will update the paths automatically)
sudo certbot --nginx -d your-domain.com

# Test and reload
sudo nginx -t && sudo systemctl reload nginx
```

**Key configuration points:**
1. Update `server_name` to your domain (2 places)
2. Update SSL certificate paths (certbot does this automatically)
3. Update `root` path to your frontend build directory
4. Adjust backend port in `upstream` block if not using 3001

### Frontend build

```bash
cd frontend && npm run build
# Output: frontend/dist/  — serve via nginx
```

### Deployment script

Use the included [deploy.sh](deploy.sh) script with environment variables:

```bash
APP_DIR=~/node-monitor \
WEB_ROOT=/var/www/node-monitor \
SERVICE_NAME=node-monitor \
DOMAIN=your-domain.com \
./deploy.sh
```

---

## Security Notes

1. **Change `JWT_SECRET`** in `.env` to a 64+ character random string before any production use
2. **HTTPS in production** — add TLS via certbot; the terminal WebSocket carries live keystrokes
3. **Network-level access** — bind Nginx to internal network only, not the public internet
4. **`monitor` user is read-only** — it has no write access to user files; kill operations use `sudo kill` scoped to that binary only
5. **Terminal sessions run as `monitor`** — not as the authenticated web user. For user-isolated terminals, configure tmux to `su` to the user inside the session
6. **Rate limiting** — the built-in limiter is in-memory (resets on restart); for production use `@fastify/rate-limit` with Redis
7. **Audit trail** — all kill operations are logged with username, PID, and signal. Pipe to syslog with `LOG_LEVEL=info`

---

## Troubleshooting

### Open Ports showing "unknown" for user/process

**Symptom:** The Open Ports page shows "unknown" in the Process and User columns for most ports.

**Cause:** The monitoring user doesn't have sudo privileges to run `ss`, `ps`, and `netstat`.

**Solution:**

1. **Verify sudo configuration exists:**
   ```bash
   # On backend host:
   sudo -l | grep -E "ss|ps|netstat"

   # On remote nodes:
   ssh monitor@node1.example.com "sudo -l | grep -E 'ss|ps|netstat'"
   ```

2. **If missing, add sudo permissions:**
   ```bash
   # On each node, create/update /etc/sudoers.d/node-monitor:
   sudo visudo -f /etc/sudoers.d/node-monitor

   # Add these lines (replace monitor with actual username):
   monitor ALL=(ALL) NOPASSWD: /usr/bin/ss
   monitor ALL=(ALL) NOPASSWD: /usr/bin/netstat
   monitor ALL=(ALL) NOPASSWD: /usr/bin/ps
   ```

3. **Test sudo commands work without password:**
   ```bash
   sudo -n ss -tlnpH | head -3
   sudo -n ps -o pid=,user= -p $$
   ```

4. **Restart backend** (if running as a service):
   ```bash
   sudo systemctl restart node-monitor
   ```

---

## License

MIT

---

## Contributing

Contributions welcome! Please open an issue or PR.
