import { Client } from 'ssh2';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const execLocal = promisify(exec);

/**
 * NODE_LOCAL_ID = the node this backend process is physically running on.
 * Commands for that node run via local child_process instead of SSH.
 *
 * If backend is hosted on node2  →  NODE_LOCAL_ID=node2  (default)
 * If backend is hosted on node1  →  NODE_LOCAL_ID=node1
 * If backend is on a separate VM →  NODE_LOCAL_ID=none
 */
const LOCAL_NODE_ID = process.env.NODE_LOCAL_ID || 'node2';

export const NODES = {
  node1: {
    id: 'node1',
    label: process.env.NODE1_LABEL || 'Node 1',
    host: process.env.NODE1_HOST || 'node1.example.com',
    port: parseInt(process.env.NODE1_SSH_PORT || '22'),
    username: process.env.SSH_USER || 'monitor',
    specs: {
      gpus: ['RTX 3090', 'RTX 3090'],
      cores: 18,
      ramGB: 251,
      gpuThermalCritical: false
    }
  },
  node2: {
    id: 'node2',
    label: process.env.NODE2_LABEL || 'Node 2',
    host: process.env.NODE2_HOST || 'node2.example.com',
    port: parseInt(process.env.NODE2_SSH_PORT || '22'),
    username: process.env.SSH_USER || 'monitor',
    specs: {
      gpus: ['RTX 4090', 'RTX 4090', 'RTX 4090', 'RTX 4090'],
      cores: 40,
      ramGB: 440,
      gpuThermalCritical: false
    }
  }
};

// ─── Connection pool (SSH only — local node skips this) ────────────────────────
const connections = new Map();
const reconnectTimers = new Map();
const MAX_RECONNECT_DELAY = 30000;

function isLocalNode(nodeId) {
  return LOCAL_NODE_ID !== 'none' && LOCAL_NODE_ID === nodeId;
}

// Read SSH private key once at startup (only needed for remote nodes)
function getSSHKey() {
  if (!process.env.SSH_KEY_PATH) return undefined;
  try {
    return readFileSync(process.env.SSH_KEY_PATH);
  } catch (e) {
    console.error('[SSH] Could not read SSH key:', e.message);
    return undefined;
  }
}

const SSH_PRIVATE_KEY = getSSHKey();

function createConnection(nodeId) {
  const nodeConfig = NODES[nodeId];
  if (!nodeConfig) throw new Error(`Unknown node: ${nodeId}`);

  // Skip SSH for the local node
  if (isLocalNode(nodeId)) {
    connections.set(nodeId, { conn: null, status: 'local' });
    console.log(`[SSH] ${nodeConfig.label} is LOCAL — skipping SSH`);
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const conn = new Client();
    let resolved = false;

    conn.on('ready', () => {
      console.log(`[SSH] Connected to ${nodeConfig.label}`);
      connections.set(nodeId, { conn, status: 'connected', reconnectAttempts: 0 });
      clearReconnectTimer(nodeId);
      resolved = true;
      resolve(conn);
    });

    conn.on('error', (err) => {
      console.error(`[SSH] Error on ${nodeConfig.label}:`, err.message);
      connections.set(nodeId, { conn: null, status: 'error', error: err.message });
      scheduleReconnect(nodeId);
      if (!resolved) reject(err);
    });

    conn.on('close', () => {
      console.warn(`[SSH] Connection closed for ${nodeConfig.label}`);
      connections.set(nodeId, { conn: null, status: 'disconnected' });
      scheduleReconnect(nodeId);
    });

    const connectConfig = {
      host: nodeConfig.host,
      port: nodeConfig.port,
      username: nodeConfig.username,
      readyTimeout: 10000,
      keepaliveInterval: 15000,
      keepaliveCountMax: 3
    };

    if (SSH_PRIVATE_KEY) {
      connectConfig.privateKey = SSH_PRIVATE_KEY;
    } else {
      const passEnv = nodeId === 'node1' ? process.env.NODE1_SSH_PASS : process.env.NODE2_SSH_PASS;
      if (passEnv) connectConfig.password = passEnv;
    }

    conn.connect(connectConfig);
  });
}

function clearReconnectTimer(nodeId) {
  if (reconnectTimers.has(nodeId)) {
    clearTimeout(reconnectTimers.get(nodeId));
    reconnectTimers.delete(nodeId);
  }
}

function scheduleReconnect(nodeId) {
  if (isLocalNode(nodeId)) return;
  clearReconnectTimer(nodeId);
  const state = connections.get(nodeId);
  const attempts = state?.reconnectAttempts || 0;
  const delay = Math.min(1000 * Math.pow(2, attempts), MAX_RECONNECT_DELAY);

  console.log(`[SSH] Reconnecting to ${nodeId} in ${delay}ms (attempt ${attempts + 1})`);
  const timer = setTimeout(async () => {
    connections.set(nodeId, { conn: null, status: 'reconnecting', reconnectAttempts: attempts + 1 });
    try { await createConnection(nodeId); }
    catch (err) { console.error(`[SSH] Reconnect failed for ${nodeId}:`, err.message); }
  }, delay);
  reconnectTimers.set(nodeId, timer);
}

// ─── Public API ────────────────────────────────────────────────────────────────

export async function initSSHConnections() {
  console.log(`[SSH] Initializing connections (local node: ${LOCAL_NODE_ID})...`);
  const results = await Promise.allSettled(
    Object.keys(NODES).map(nodeId => createConnection(nodeId))
  );
  results.forEach((result, i) => {
    const nodeId = Object.keys(NODES)[i];
    if (result.status === 'rejected') {
      console.error(`[SSH] Initial connection to ${nodeId} failed:`, result.reason?.message);
    }
  });
}

/**
 * Execute a command on a node.
 * - Local node  → child_process.exec (no SSH overhead)
 * - Remote node → persistent SSH connection
 */
export function execOnNode(nodeId, command, timeoutMs = 15000) {
  // ── Local execution ──────────────────────────────────────────────────────
  if (isLocalNode(nodeId)) {
    return execLocal(command, { timeout: timeoutMs })
      .then(({ stdout }) => stdout.trim())
      .catch(err => {
        if (err.stdout) return err.stdout.trim();
        throw new Error(err.message);
      });
  }

  // ── Remote SSH execution ─────────────────────────────────────────────────
  return new Promise((resolve, reject) => {
    const state = connections.get(nodeId);
    if (!state?.conn) {
      return reject(new Error(`No active SSH connection to ${nodeId}`));
    }

    const { conn } = state;
    let output = '';
    let errOutput = '';

    conn.exec(command, { pty: false }, (err, stream) => {
      if (err) return reject(err);

      const timer = setTimeout(() => {
        stream.destroy();
        reject(new Error(`Command timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      stream.on('data', d => { output += d.toString(); });
      stream.stderr.on('data', d => { errOutput += d.toString(); });
      stream.on('close', code => {
        clearTimeout(timer);
        if (code !== 0 && !output) reject(new Error(`Exit ${code}: ${errOutput}`));
        else resolve(output.trim());
      });
    });
  });
}

export async function execOnAllNodes(command, timeoutMs = 15000) {
  const results = await Promise.allSettled(
    Object.keys(NODES).map(nodeId => execOnNode(nodeId, command, timeoutMs))
  );
  return Object.fromEntries(
    Object.keys(NODES).map((nodeId, i) => [
      nodeId,
      results[i].status === 'fulfilled'
        ? { success: true, data: results[i].value }
        : { success: false, error: results[i].reason?.message }
    ])
  );
}

export function getConnectionStatus() {
  return Object.fromEntries(
    Object.keys(NODES).map(nodeId => {
      const state = connections.get(nodeId);
      return [nodeId, {
        status: state?.status || 'unknown',
        isLocal: isLocalNode(nodeId),
        error: state?.error || null,
        label: NODES[nodeId].label,
        specs: NODES[nodeId].specs
      }];
    })
  );
}

/**
 * Stream a long-running command (e.g. rsync) with live output callbacks.
 */
export function execStreamOnNode(nodeId, command, onData, onError) {
  // ── Local stream ─────────────────────────────────────────────────────────
  if (isLocalNode(nodeId)) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, { shell: true });
      child.stdout.on('data', d => onData(d.toString()));
      child.stderr.on('data', d => onError?.(d.toString()));
      child.on('close', code => code === 0 ? resolve() : reject(new Error(`Exit ${code}`)));
    });
  }

  // ── Remote SSH stream ────────────────────────────────────────────────────
  return new Promise((resolve, reject) => {
    const state = connections.get(nodeId);
    if (!state?.conn) return reject(new Error(`No SSH connection to ${nodeId}`));

    state.conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      stream.on('data', d => onData(d.toString()));
      stream.stderr.on('data', d => onError?.(d.toString()));
      stream.on('close', code => code === 0 ? resolve() : reject(new Error(`Exit ${code}`)));
    });
  });
}