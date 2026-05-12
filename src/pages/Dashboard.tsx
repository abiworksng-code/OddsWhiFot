import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Target, 
  BarChart3, 
  ShieldAlert, 
  ArrowUpRight,
  Clock,
  ExternalLink,
  Plus,
  Zap,
  Slash,
  ChevronRight,
  Loader2,
  Activity
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import React, { useState, useEffect } from 'react';
import { getArchivedAnalyses } from '../services/archiveService';
import { ArchivedAnalysis, SettlementOutcome } from '../types';
import { addSlipItem } from '../services/slipService';
import { useAuth } from '../lib/AuthProvider';

const ROI_DATA = [
  { name: 'Jan', roi: 12 },
  { name: 'Feb', roi: 18 },
  { name: 'Mar', roi: 15 },
  { name: 'Apr', roi: 24 },
  { name: 'May', roi: 31 },
];

const LEAGUE_PERFORMANCE = [
  { league: 'EPL', win: 82, color: '#10b981' },
  { league: 'Bunesliga', win: 78, color: '#10b981' },
  { league: 'Serie A', win: 74, color: '#10b981' },
  { league: 'La Liga', win: 68, color: '#f59e0b' },
  { league: 'Ligue 1', win: 62, color: '#f59e0b' },
];

export function Dashboard() {
  const { user } = useAuth();
  const [recentAnalyses, setRecentAnalyses] = useState<ArchivedAnalysis[]>([]);
  const [activeTracking, setActiveTracking] = useState<ArchivedAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setRecentAnalyses([]);
        setActiveTracking([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const data = await getArchivedAnalyses();
      setRecentAnalyses(data.slice(0, 10));
      setActiveTracking(data.filter(a => a.outcome === SettlementOutcome.PENDING).slice(0, 3));
      setLoading(false);
    };
    loadData();
    const interval = setInterval(loadData, 60000); // Pulse every minute
    return () => clearInterval(interval);
  }, [user]);

  const handleAddToSlip = (e: React.MouseEvent, item: ArchivedAnalysis) => {
    e.stopPropagation();
    addSlipItem({
      id: item.matchId || item.id,
      game: `${item.match?.homeTeam} vs ${item.match?.awayTeam}`,
      market: item.transformation.suggestedMarket,
      odds: item.valueAnalysis?.impliedOdds || 1.85,
      confidence: item.confidence.score
    });
    alert('Added to Slip Buffer.');
  };

  return (
    <div className="space-y-6 h-full overflow-auto pb-10">
      {/* Live Tracker Widget */}
      {activeTracking.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-500/5 border border-emerald-500/20 rounded-sm p-4 overflow-hidden relative"
        >
          <div className="flex items-center justify-between mb-3">
             <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Live Neural Monitor</h3>
             </div>
             <span className="text-[8px] font-black text-emerald-500/50 uppercase tracking-widest">Active Links: {activeTracking.length}</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
             {activeTracking.map((analysis) => (
               <div key={analysis.id} className="min-w-[280px] bg-black/40 border border-white/5 rounded p-3 space-y-2 hover:border-emerald-500/30 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start">
                     <span className="text-[9px] font-black text-zinc-500 uppercase tracking-tighter truncate max-w-[180px]">{analysis.match?.league}</span>
                     <div className="flex items-center gap-1.5">
                        <Zap className="w-2.5 h-2.5 text-emerald-500" />
                        <span className="text-[10px] font-black text-white italic">{analysis.confidence.score.toFixed(1)}</span>
                     </div>
                  </div>
                  <div className="text-[12px] font-black text-white uppercase italic group-hover:text-emerald-400 transition-colors">
                     {analysis.match?.homeTeam} <span className="text-zinc-700">vs</span> {analysis.match?.awayTeam}
                  </div>
                  <div className="flex justify-between items-center">
                     <div className="text-[9px] font-black text-emerald-500 uppercase py-0.5 px-1.5 bg-emerald-500/10 rounded">{analysis.transformation.backupCombo}</div>
                     <span className="text-[8px] font-bold text-zinc-600 uppercase">Tracking...</span>
                  </div>
               </div>
             ))}
          </div>
          <div className="absolute top-0 right-0 p-1 opacity-10">
             <Activity className="w-20 h-20 text-emerald-500" />
          </div>
        </motion.div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Cumulative ROI', value: '+31.4%', icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Elite Success Rate', value: '88.2%', icon: Target, color: 'text-emerald-400' },
          { label: 'Matches Eliminated', value: '412', icon: ShieldAlert, color: 'text-amber-500' },
          { label: 'Active Capital', value: '$12,450', icon: BarChart3, color: 'text-[color:var(--color-text)]' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="technical-border bg-[color:var(--color-card)] p-4 rounded-sm flex flex-col justify-between h-24"
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-[color:var(--color-text-dim)] uppercase tracking-widest">{stat.label}</span>
              <stat.icon className={`w-3 h-3 ${stat.color} opacity-60`} />
            </div>
            <div className={`text-xl font-black mono-value ${stat.color}`}>{stat.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ROI Projection Chart */}
        <div className="lg:col-span-8 technical-border bg-[color:var(--color-header)] rounded-sm overflow-hidden p-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-[color:var(--color-text)]">ROI Momentum Tracking</h3>
              <p className="text-[10px] text-[color:var(--color-text-dim)] mt-1">Growth trajectory across TIER-A & TIER-B markets</p>
            </div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded">
                <ArrowUpRight className="w-3 h-3" /> +12.4% THIS PERIOD
              </span>
            </div>
          </div>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={ROI_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRoi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#666' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#666' }} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="roi" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRoi)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* League Rankings */}
        <div className="lg:col-span-4 technical-border bg-[color:var(--color-header)] rounded-sm p-6">
          <h3 className="text-xs font-black uppercase tracking-widest mb-6 border-b border-white/5 pb-4">Safe League Index</h3>
          <div className="space-y-5">
            {LEAGUE_PERFORMANCE.map((item, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="font-bold text-white uppercase">{item.league}</span>
                  <span className="text-zinc-500">{item.win}% Accuracy</span>
                </div>
                <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${item.win}%` }}
                    transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                    className="h-full"
                    style={{ backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-6 border-t border-white/5 bg-gradient-to-b from-transparent to-emerald-500/5 -mx-6 -mb-6 p-6">
            <p className="text-[10px] text-zinc-500 leading-relaxed italic">
              "TIER-A stability remains prioritized. Avoid Volatile Tier-C markets for long-term survival."
            </p>
          </div>
        </div>
      </div>

      {/* RECENT ANALYZED TABLE */}
      <div className="technical-border bg-[color:var(--color-card)] rounded-sm overflow-hidden">
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
            <Clock className="w-3 h-3" /> Historical Reconstruction Logs
          </h3>
          <button className="text-[9px] text-emerald-400 font-bold uppercase hover:underline flex items-center gap-1">
            View Full Audit <ExternalLink className="w-2.5 h-2.5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.01]">
                <th className="p-3 text-[9px] font-black uppercase tracking-widest text-zinc-600 border-b border-white/5">Fixture</th>
                <th className="p-3 text-[9px] font-black uppercase tracking-widest text-zinc-600 border-b border-white/5">Tempo</th>
                <th className="p-3 text-[9px] font-black uppercase tracking-widest text-zinc-600 border-b border-white/5">Confidence</th>
                <th className="p-3 text-[9px] font-black uppercase tracking-widest text-zinc-600 border-b border-white/5">Verdict</th>
                <th className="p-3 text-[9px] font-black uppercase tracking-widest text-zinc-600 border-b border-white/5">Result</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {loading ? (
                <tr>
                   <td colSpan={5} className="p-10 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                        <span className="text-[9px] font-black text-zinc-600 uppercase">Synchronizing Audit Logs...</span>
                      </div>
                   </td>
                </tr>
              ) : recentAnalyses.length === 0 ? (
                <tr>
                   <td colSpan={5} className="p-10 text-center">
                      <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">No previous audit logs detected in current workspace.</p>
                   </td>
                </tr>
              ) : recentAnalyses.map((item, i) => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer group">
                  <td className="p-3 text-white font-black uppercase tracking-tighter italic">
                    {item.match?.homeTeam} <span className="text-zinc-600/50 px-1">vs</span> {item.match?.awayTeam}
                  </td>
                  <td className="p-3 text-zinc-400 uppercase tracking-tighter font-bold">{item.tempo.type}</td>
                  <td className="p-3 font-mono text-emerald-400 font-black">{item.confidence.score.toFixed(1)}</td>
                  <td className="p-3 text-white uppercase font-black text-[10px] tracking-tight">{item.transformation.backupCombo}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-lg items-center justify-center flex font-black text-[9px] border ${
                        item.outcome === SettlementOutcome.WIN ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500' :
                        item.outcome === SettlementOutcome.LOSS ? 'border-red-500/20 bg-red-500/10 text-red-500' :
                        item.outcome === SettlementOutcome.VOID ? 'border-zinc-500/20 bg-zinc-500/10 text-zinc-400' :
                        'border-amber-500/20 bg-amber-500/5 text-amber-500'
                      }`}>
                        {item.outcome === SettlementOutcome.WIN ? 'W' : 
                         item.outcome === SettlementOutcome.LOSS ? 'L' : 
                         item.outcome === SettlementOutcome.VOID ? 'V' : 'P'}
                      </div>
                      <button 
                        onClick={(e) => handleAddToSlip(e, item)}
                        className="p-1 hover:bg-emerald-500/10 rounded transition-colors text-zinc-600 hover:text-emerald-500"
                        title="Add to Slip"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
