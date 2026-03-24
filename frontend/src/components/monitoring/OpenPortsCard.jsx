import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { Network, ChevronDown, ChevronUp, Globe, Lock } from 'lucide-react';

const WELL_KNOWN = {
  22: 'SSH', 80: 'HTTP', 443: 'HTTPS', 3001: 'API Backend',
  5173: 'Vite Dev', 6006: 'TensorBoard', 8080: 'HTTP Alt',
  8888: 'Jupyter', 3000: 'Grafana', 5432: 'PostgreSQL',
  6379: 'Redis', 27017: 'MongoDB', 11434: 'Ollama'
};

function PortRow({ port }) {
  const known = WELL_KNOWN[port.port];
  const isPublic = !port.isLocal && !port.address?.startsWith('127.');

  return (
    <tr className="border-b border-white/3 hover:bg-white/2 transition-colors group">
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-semibold text-slate-200">{port.port}</span>
          {known && (
            <span className="text-[10px] bg-accent/10 text-accent/80 px-1.5 rounded font-medium">
              {known}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2">
        <span className="font-mono text-xs text-slate-400 truncate max-w-[120px] block">
          {port.process !== '—' ? port.process : <span className="text-slate-600">unknown</span>}
        </span>
      </td>
      <td className="px-3 py-2">
        <span className="text-xs text-slate-500 font-mono">{port.pid || '—'}</span>
      </td>
      <td className="px-3 py-2">
        <span className="text-xs text-slate-400 font-mono">{port.user}</span>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          {isPublic
            ? <Globe size={10} className="text-warn" />
            : <Lock size={10} className="text-slate-600" />
          }
          <span className={`text-[10px] font-mono ${isPublic ? 'text-warn' : 'text-slate-600'}`}>
            {port.address?.replace('0.0.0.0', '*') || '—'}
          </span>
        </div>
      </td>
    </tr>
  );
}

function NodePortsTable({ label, data, isMissionCritical }) {
  const [showAll, setShowAll] = useState(false);
  const ports = data?.ports || [];
  const visible = showAll ? ports : ports.slice(0, 10);
  const publicPorts = ports.filter(p => !p.isLocal && !p.address?.startsWith('127.'));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-300">{label}</span>
          <span className="text-[10px] bg-surface-700 text-slate-500 px-1.5 py-0.5 rounded font-mono">
            {ports.length} ports
          </span>
          {publicPorts.length > 0 && (
            <span className="text-[10px] bg-warn/10 text-warn px-1.5 py-0.5 rounded font-medium">
              {publicPorts.length} public
            </span>
          )}
        </div>
        {data?.error && (
          <span className="text-[10px] text-danger font-mono">{data.error}</span>
        )}
      </div>

      {ports.length > 0 && (
        <div className="rounded-lg overflow-hidden border border-white/5">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-700/50 border-b border-white/5">
                {['Port', 'Process', 'PID', 'User', 'Bind'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((p, i) => <PortRow key={i} port={p} />)}
            </tbody>
          </table>
          {ports.length > 10 && (
            <button
              onClick={() => setShowAll(s => !s)}
              className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1 bg-surface-700/30 transition-colors"
            >
              {showAll ? <><ChevronUp size={11} /> Show less</> : <><ChevronDown size={11} /> Show {ports.length - 10} more</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function OpenPortsCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['open-ports'],
    queryFn: () => api.get('/extras/ports').then(r => r.data),
    refetchInterval: 30000
  });

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Network size={15} className="text-accent" />
          <span className="font-medium text-sm text-slate-200">Open Ports</span>
        </div>
        <span className="text-xs text-slate-500">Refreshes every 30s</span>
      </div>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="py-6 text-center text-slate-600 text-sm">
            <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-2" />
            Scanning ports…
          </div>
        ) : (
          <>
            <NodePortsTable label="dilab (Node 1)" data={data?.node1} />
            <div className="border-t border-white/5 pt-4">
              <NodePortsTable label="dilab2 (Node 2)" data={data?.node2} isMissionCritical />
            </div>
          </>
        )}
      </div>
    </div>
  );
}