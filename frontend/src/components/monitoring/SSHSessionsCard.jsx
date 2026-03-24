import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { Terminal, Clock, Wifi, User } from 'lucide-react';

function SessionRow({ session }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/3 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-success/10 border border-success/20 flex items-center justify-center flex-shrink-0">
        <span className="text-[10px] font-bold text-success">{session.user?.[0]?.toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-medium text-slate-200">{session.user}</span>
          <span className="text-[10px] text-slate-600 font-mono">{session.tty}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse flex-shrink-0" />
        </div>
        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
          from {session.fromIP} · since {session.loginTime}
        </div>
      </div>
    </div>
  );
}

function RecentLoginRow({ login }) {
  return (
    <tr className="border-b border-white/3 hover:bg-white/2">
      <td className="px-3 py-1.5">
        <span className="text-xs font-mono text-slate-300">{login.user}</span>
      </td>
      <td className="px-3 py-1.5">
        <span className="text-[10px] font-mono text-slate-500">{login.fromIP}</span>
      </td>
      <td className="px-3 py-1.5">
        <span className="text-[10px] font-mono text-slate-500">{login.loginTime}</span>
      </td>
      <td className="px-3 py-1.5">
        {login.active
          ? <span className="text-[10px] text-success font-medium">● active</span>
          : <span className="text-[10px] text-slate-600">{login.logoutTime?.slice(0, 20)}</span>
        }
      </td>
    </tr>
  );
}

function NodeSSHPanel({ label, data }) {
  const sessions = data?.sessions || [];
  const recentLogins = data?.recentLogins || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-300">{label}</span>
        <div className="flex items-center gap-1.5">
          <Wifi size={11} className={sessions.length > 0 ? 'text-success' : 'text-slate-600'} />
          <span className="text-[10px] text-slate-500">
            {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Active sessions */}
      {sessions.length > 0 ? (
        <div className="bg-surface-700/30 rounded-lg px-3 py-1 border border-white/5">
          {sessions.map((s, i) => <SessionRow key={i} session={s} />)}
        </div>
      ) : (
        <div className="text-[11px] text-slate-600 py-1 px-3 bg-surface-700/20 rounded-lg border border-white/4">
          No active SSH sessions
        </div>
      )}

      {/* Recent login history */}
      {recentLogins.length > 0 && (
        <div>
          <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Clock size={9} /> Recent logins
          </p>
          <div className="rounded-lg overflow-hidden border border-white/5">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-700/40">
                  {['User', 'From', 'Login', 'Status'].map(h => (
                    <th key={h} className="px-3 py-1.5 text-left text-[10px] text-slate-600 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentLogins.slice(0, 8).map((l, i) => <RecentLoginRow key={i} login={l} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SSHSessionsCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['ssh-sessions'],
    queryFn: () => api.get('/extras/ssh-sessions').then(r => r.data),
    refetchInterval: 15000
  });

  const totalActive = (data?.node1?.activeCount || 0) + (data?.node2?.activeCount || 0);

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Terminal size={15} className="text-accent" />
          <span className="font-medium text-sm text-slate-200">SSH Sessions</span>
          {totalActive > 0 && (
            <span className="text-[10px] bg-success/15 text-success border border-success/25 px-1.5 py-0.5 rounded font-medium">
              {totalActive} active
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500">Refreshes every 15s</span>
      </div>

      <div className="p-4 space-y-5">
        {isLoading ? (
          <div className="py-6 text-center text-slate-600 text-sm">
            <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-2" />
            Loading sessions…
          </div>
        ) : (
          <>
            <NodeSSHPanel label="dilab (Node 1)" data={data?.node1} />
            <div className="border-t border-white/5 pt-4">
              <NodeSSHPanel label="dilab2 (Node 2)" data={data?.node2} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}