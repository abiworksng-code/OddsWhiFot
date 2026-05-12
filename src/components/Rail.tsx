import { Activity, ShieldCheck, Database, Globe, Zap } from 'lucide-react';

export function Rail() {
  return (
    <aside className="w-64 border-r border-white/5 bg-[color:var(--color-rail)] h-full hidden md:flex flex-col technical-border">
      {/* System Integrity */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-3 h-3 text-emerald-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">System Integrity</span>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Neural Engine', status: 'Online', icon: Zap },
            { label: 'Market Feed', status: 'Syncing', icon: Database },
            { label: 'Encryption', status: 'Active', icon: ShieldCheck },
          ].map((sys, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <sys.icon className="w-2.5 h-2.5 text-zinc-600" />
                <span className="text-[9px] font-medium text-zinc-500">{sys.label}</span>
              </div>
              <span className={`text-[8px] font-black uppercase ${sys.status === 'Online' || sys.status === 'Active' ? 'text-emerald-500' : 'text-amber-500'}`}>
                {sys.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Global Market Load */}
      <div className="flex-1 p-4 flex flex-col justify-end">
        <div className="bg-white/[0.02] p-3 rounded-sm border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-3 h-3 text-zinc-400" />
            <span className="text-[9px] font-bold text-zinc-400 uppercase">Global Load</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[8px]">
              <span className="text-[color:var(--color-text-dim)]">Reconstruction Queue</span>
              <span className="text-[color:var(--color-text)] font-mono">14/s</span>
            </div>
            <div className="h-0.5 bg-zinc-900 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-2/3"></div>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">Live Analysis Engine</span>
          </div>
          <span className="text-[8px] font-mono text-zinc-700 font-bold">V4.12.0</span>
        </div>
      </div>
    </aside>
  );
}

