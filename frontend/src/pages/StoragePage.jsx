import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../utils/api';
import { useMetricsStore } from '../stores/metricsStore';
import { HardDrive, User, BarChart2, RefreshCw, Server } from 'lucide-react';
import { getUsageColor, getUsageTextColor } from '../utils/format';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

function parseSizeStr(str) {
  if (!str) return 0;
  const match = str.match(/^([\d.]+)\s*([KMGT]?B?)$/i);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const unit = match[2].toUpperCase().replace('B', '');
  const mult = { '': 1, 'K': 1024, 'M': 1024 ** 2, 'G': 1024 ** 3, 'T': 1024 ** 4 };
  return Math.round(num * (mult[unit] ?? 1));
}

// ─── Overall Filesystem Card ───────────────────────────────────────────────────
function FilesystemCard({ nodeId, storage }) {
  const nodeName = nodeId === 'node1' ? 'dilab' : 'dilab2';
  const filesystems = storage?.filesystems || [];

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Server size={14} className="text-slate-400" />
          <span className="font-medium text-sm text-slate-200">{nodeName} — Filesystems</span>
        </div>
        <span className="text-xs text-slate-500">{filesystems.length} mounts</span>
      </div>
      <div className="p-4 space-y-3">
        {filesystems.length === 0 && (
          <p className="text-sm text-slate-600 text-center py-4">No data</p>
        )}
        {filesystems.map((fs, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-slate-300 truncate">{fs.mountpoint}</span>
                <div className="flex gap-1">
                  {fs.isNVMe && <span className="text-[9px] bg-accent/10 text-accent px-1 rounded">NVMe</span>}
                  {fs.fstype && <span className="text-[9px] bg-surface-600 text-slate-500 px-1 rounded">{fs.fstype}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 font-mono text-[11px]">
                <span className={getUsageTextColor(fs.usedPct)}>{fs.usedPct}%</span>
                <span className="text-slate-500">{fs.usedGB} / {fs.sizeGB} GB</span>
                <span className="text-slate-600">({fs.availGB} GB free)</span>
              </div>
            </div>
            <div className="progress-bar h-2">
              <div
                className={`progress-fill h-full ${getUsageColor(fs.usedPct)}`}
                style={{ width: `${Math.min(fs.usedPct, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-700 font-mono">{fs.source}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Per-User Storage Table ────────────────────────────────────────────────────
function UserStorageTable({ nodeId, data }) {
  const [sortBy, setSortBy] = useState('totalBytes');
  const nodeName = nodeId === 'node1' ? 'dilab' : 'dilab2';
  const users = [...(data?.users || [])].sort((a, b) => b[sortBy] - a[sortBy]);

  if (!users.length) return (
    <div className="py-8 text-center text-slate-600 text-sm">
      No per-user data available.
      <p className="text-xs mt-1 text-slate-700">Requires read access to /home, /data, /scratch</p>
    </div>
  );

  const maxBytes = users[0]?.totalBytes || 1;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{nodeName}</span>
        <span className="text-[10px] text-slate-600">{users.length} users</span>
      </div>
      <div className="space-y-1.5">
        {users.map((u, i) => {
          const pct = Math.round((u.totalBytes / maxBytes) * 100);
          return (
            <div key={u.user} className="group">
              <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/3 transition-colors">
                {/* Rank */}
                <span className="text-[10px] text-slate-700 w-4 font-mono flex-shrink-0">
                  {i + 1}
                </span>
                {/* Avatar */}
                <div className="w-6 h-6 rounded bg-accent/10 border border-accent/15 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-accent">{u.user[0]?.toUpperCase()}</span>
                </div>
                {/* Username */}
                <span className="text-xs font-mono text-slate-300 w-24 flex-shrink-0 truncate">{u.user}</span>
                {/* Bar */}
                <div className="flex-1">
                  <div className="progress-bar h-1.5">
                    <div
                      className={`progress-fill h-full ${
                        pct > 80 ? 'bg-danger' : pct > 60 ? 'bg-warn' : 'bg-accent'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                {/* Size */}
                <span className="text-xs font-mono font-semibold text-slate-300 w-20 text-right flex-shrink-0">
                  {u.totalFormatted || formatBytes(u.totalBytes)}
                </span>
              </div>
              {/* Mount breakdown on hover */}
              {u.mounts?.length > 0 && (
                <div className="hidden group-hover:flex flex-wrap gap-2 px-10 pb-1.5">
                  {u.mounts.map((m, mi) => (
                    <span key={mi} className="text-[10px] font-mono text-slate-600">
                      {m.mount}: <span className="text-slate-500">{m.size}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Cross-Node User Comparison Chart ─────────────────────────────────────────
function CrossNodeChart({ node1Data, node2Data }) {
  const allUsers = new Set([
    ...(node1Data?.users || []).map(u => u.user),
    ...(node2Data?.users || []).map(u => u.user)
  ]);

  const chartData = [...allUsers].map(user => {
    const n1 = node1Data?.users?.find(u => u.user === user);
    const n2 = node2Data?.users?.find(u => u.user === user);
    return {
      user,
      node1GB: n1 ? Math.round(n1.totalBytes / 1024 ** 3 * 10) / 10 : 0,
      node2GB: n2 ? Math.round(n2.totalBytes / 1024 ** 3 * 10) / 10 : 0,
      totalGB: Math.round(((n1?.totalBytes || 0) + (n2?.totalBytes || 0)) / 1024 ** 3 * 10) / 10
    };
  }).sort((a, b) => b.totalGB - a.totalGB).slice(0, 15);

  if (!chartData.length) return null;

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <BarChart2 size={15} className="text-accent" />
          <span className="font-medium text-sm text-slate-200">Storage by User — Both Nodes (GB)</span>
        </div>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 40, left: 8 }}>
            <XAxis
              dataKey="user"
              tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickFormatter={v => `${v}G`}
            />
            <Tooltip
              contentStyle={{
                background: '#1e2a3d', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, fontSize: 12, fontFamily: 'JetBrains Mono'
              }}
              formatter={(val, name) => [`${val} GB`, name === 'node1GB' ? 'dilab' : 'dilab2']}
            />
            <Bar dataKey="node1GB" name="node1GB" stackId="a" fill="#38bdf8" radius={[0, 0, 0, 0]} />
            <Bar dataKey="node2GB" name="node2GB" stackId="a" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-6 mt-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className="w-3 h-2 rounded-sm bg-accent" />
            dilab (Node 1)
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className="w-3 h-2 rounded-sm bg-indigo-500" />
            dilab2 (Node 2)
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Storage Page ─────────────────────────────────────────────────────────
export default function StoragePage() {
  const metrics = useMetricsStore(s => s.metrics);
  const [tab, setTab] = useState('overview'); // overview | users

  const { data: userStorage, isLoading: usersLoading, refetch } = useQuery({
    queryKey: ['storage-by-user'],
    queryFn: () => api.get('/extras/storage-by-user').then(r => r.data),
    refetchInterval: 60000,
    staleTime: 0
  });

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-slate-100 flex items-center gap-2">
            <HardDrive size={20} className="text-accent" />
            Storage
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Filesystem overview and per-user disk usage across both nodes
          </p>
        </div>
        <button onClick={refetch} className="btn-ghost text-xs">
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-800 border border-white/5 rounded-xl p-1 w-fit">
        {[
          { id: 'overview', label: 'Overview', icon: HardDrive },
          { id: 'users', label: 'Per-User Usage', icon: User },
          { id: 'chart', label: 'Comparison', icon: BarChart2 }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === t.id
                ? 'bg-accent/15 text-accent border border-accent/20'
                : 'text-slate-500 hover:text-slate-300'
              }`}
          >
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <FilesystemCard nodeId="node1" storage={metrics?.node1?.storage} />
          <FilesystemCard nodeId="node2" storage={metrics?.node2?.storage} />
        </div>
      )}

      {/* Per-User Tab */}
      {tab === 'users' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Node 1 */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <User size={14} className="text-slate-400" />
                <span className="font-medium text-sm text-slate-200">dilab — Per-User Usage</span>
              </div>
            </div>
            <div className="p-4">
              {usersLoading ? (
                <div className="py-8 text-center">
                  <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-slate-600">Calculating disk usage…</p>
                  <p className="text-xs text-slate-700 mt-1">This may take a moment for large filesystems</p>
                </div>
              ) : (
                <UserStorageTable nodeId="node1" data={userStorage?.node1} />
              )}
            </div>
          </div>

          {/* Node 2 */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <User size={14} className="text-slate-400" />
                <span className="font-medium text-sm text-slate-200">dilab2 — Per-User Usage</span>
              </div>
            </div>
            <div className="p-4">
              {usersLoading ? (
                <div className="py-8 text-center">
                  <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-slate-600">Calculating disk usage…</p>
                </div>
              ) : (
                <UserStorageTable nodeId="node2" data={userStorage?.node2} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chart Tab */}
      {tab === 'chart' && (
        <CrossNodeChart
          node1Data={userStorage?.node1}
          node2Data={userStorage?.node2}
        />
      )}

      {/* Note about du timing */}
      <p className="text-xs text-slate-700 text-center">
        Per-user usage calculated via <code className="font-mono">du</code> — may be slow on large datasets.
        Results cached for 60 seconds.
      </p>
    </div>
  );
}