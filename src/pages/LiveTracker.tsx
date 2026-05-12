import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Activity, 
  Target, 
  TrendingUp, 
  AlertCircle,
  Database,
  Cpu,
  RefreshCw,
  Search,
  Globe,
  Lock,
  ChevronRight,
  Filter
} from 'lucide-react';
import { useAuth } from '../lib/AuthProvider';
import { getArchivedAnalyses } from '../services/archiveService';
import { ArchivedAnalysis, SettlementOutcome } from '../types';

interface LiveEvent {
  id: string;
  matchId: string;
  teams: string;
  type: 'GOAL' | 'TEMP_SHIFT' | 'TRAP_ALERT' | 'CONFIDENCE_BOOST' | 'THREAT_DETECTED';
  message: string;
  time: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export function LiveTracker() {
  const { user } = useAuth();
  const [activeAnalyses, setActiveAnalyses] = useState<ArchivedAnalysis[]>([]);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemUptime, setSystemUptime] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const data = await getArchivedAnalyses();
      // Filter for pending or recent ones to "track"
      setActiveAnalyses(data.filter(a => a.outcome === SettlementOutcome.PENDING).slice(0, 5));
      setLoading(false);
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSystemUptime(prev => prev + 1);
    }, 1000);

    const eventSim = setInterval(() => {
      if (activeAnalyses.length === 0) return;
      
      const randomMatch = activeAnalyses[Math.floor(Math.random() * activeAnalyses.length)];
      const eventTypes: LiveEvent['type'][] = ['GOAL', 'TEMP_SHIFT', 'TRAP_ALERT', 'CONFIDENCE_BOOST', 'THREAT_DETECTED'];
      const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      
      let message = '';
      let severity: LiveEvent['severity'] = 'low';

      switch(type) {
        case 'GOAL':
          message = 'MATCH INCIDENT: GOAL SCORED. ODDS RECALIBRATING.';
          severity = 'high';
          break;
        case 'TEMP_SHIFT':
          message = 'SENSORY SHIFT: TEMPO INCREASING. VOLATILITY SPIKE.';
          severity = 'medium';
          break;
        case 'TRAP_ALERT':
          message = 'NEURAL GUARD: COUNTER-TRAP ENGAGED. MARKET RESISTANT.';
          severity = 'critical';
          break;
        case 'CONFIDENCE_BOOST':
          message = 'MODEL SYNC: CROSS-VERIFICATION COMPLETE. CONFIDENCE +0.2';
          severity = 'low';
          break;
        case 'THREAT_DETECTED':
          message = 'SYSTEM WARNING: SUSPICIOUS VOLUME DETECTED ON MARKET.';
          severity = 'medium';
          break;
      }

      const newEvent: LiveEvent = {
        id: Math.random().toString(36).substr(2, 9),
        matchId: randomMatch.id,
        teams: `${randomMatch.match?.homeTeam} vs ${randomMatch.match?.awayTeam}`,
        type,
        message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        severity
      };

      setEvents(prev => [newEvent, ...prev].slice(0, 20));
    }, 5000);

    return () => {
      clearInterval(timer);
      clearInterval(eventSim);
    };
  }, [activeAnalyses]);

  const getSeverityColor = (sev: LiveEvent['severity']) => {
    switch(sev) {
      case 'low': return 'text-emerald-500 bg-emerald-500/5 border-emerald-500/10';
      case 'medium': return 'text-amber-500 bg-amber-500/5 border-amber-500/10';
      case 'high': return 'text-orange-500 bg-orange-500/5 border-orange-500/10';
      case 'critical': return 'text-red-500 bg-red-500/5 border-red-500/10 underline decoration-red-500/50';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 lg:p-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <Zap className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">Live Neural Tracker</h1>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] font-black text-emerald-500/70 uppercase tracking-widest">Global Engine Synchronized</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-[#0f1115] border border-white/5 rounded-2xl p-3 flex items-center gap-4">
            <div className="space-y-0.5">
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Active Links</p>
              <p className="text-sm font-black text-white tabular-nums">{activeAnalyses.length}</p>
            </div>
            <div className="w-px h-8 bg-white/5" />
            <div className="space-y-0.5">
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Uptime Index</p>
              <p className="text-sm font-black text-white tabular-nums">{Math.floor(systemUptime / 60)}m {systemUptime % 60}s</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Events Feed */}
        <div className="lg:col-span-12 space-y-4">
           {!user ? (
             <div className="bg-[#0f1115] border border-white/5 rounded-3xl p-12 text-center">
               <Lock className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
               <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest mb-2">Biometric Data Filtered</h3>
               <p className="text-[10px] text-zinc-600 font-bold uppercase max-w-xs mx-auto mb-6">Sign in to initialize real-time match tracking and neural feed decryption.</p>
               <button className="bg-emerald-500 text-black px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all">Enable Neural Link</button>
             </div>
           ) : (
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
               {/* Activity Sidebar */}
               <div className="lg:col-span-8 space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.3em]">Neural Event Log</h2>
                    <div className="flex items-center gap-2">
                       <RefreshCw className="w-3 h-3 text-emerald-500 animate-spin-slow" />
                       <span className="text-[8px] font-black text-emerald-500 uppercase">Incoming...</span>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    <AnimatePresence initial={false}>
                      {events.length === 0 ? (
                        <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl">
                          <Activity className="w-8 h-8 text-zinc-800 mx-auto mb-3 opacity-20" />
                          <p className="text-[9px] font-black text-zinc-700 uppercase tracking-widest italic">Waiting for signal acquisition...</p>
                        </div>
                      ) : (
                        events.map((event) => (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className={`p-4 rounded-2xl border ${getSeverityColor(event.severity)} transition-all hover:bg-white/[0.02] group`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1.5 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black uppercase tracking-tighter text-white/50 group-hover:text-white transition-colors">{event.teams}</span>
                                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-zinc-900 border border-white/5 text-zinc-500">{event.type}</span>
                                </div>
                                <p className="text-[11px] font-black tracking-tight leading-tight uppercase group-hover:text-white/90">{event.message}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-[10px] font-mono text-zinc-600 font-bold">{event.time}</p>
                                <div className="mt-1">
                                   <div className={`w-1.5 h-1.5 rounded-full ml-auto ${
                                     event.severity === 'critical' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                                     event.severity === 'high' ? 'bg-orange-500' :
                                     event.severity === 'medium' ? 'bg-amber-500' :
                                     'bg-emerald-500'
                                   }`} />
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>
               </div>

               {/* Tracking Targets Sidebar */}
               <div className="lg:col-span-4 space-y-6">
                  <div className="bg-[#0f1115] border border-white/5 rounded-3xl p-6 space-y-4">
                    <h3 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                      <Target className="w-4 h-4 text-emerald-500" /> System Focus
                    </h3>
                    
                    <div className="space-y-3">
                      {activeAnalyses.length === 0 ? (
                        <div className="py-8 text-center bg-white/[0.02] rounded-2xl border border-white/5">
                           <p className="text-[9px] font-black text-zinc-600 uppercase tracking-tight">No Active Targets</p>
                        </div>
                      ) : (
                        activeAnalyses.map((analysis) => (
                          <div key={analysis.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-2 group hover:border-emerald-500/30 transition-colors">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-black text-zinc-400 group-hover:text-zinc-200 truncate uppercase">{analysis.match?.homeTeam} vs {analysis.match?.awayTeam}</p>
                              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black text-emerald-500 uppercase italic">{analysis.transformation.backupCombo}</span>
                              <span className="text-[11px] font-mono font-black text-white">{analysis.confidence.score.toFixed(1)}</span>
                            </div>
                            {/* Simple Progress Bar */}
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                               <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${Math.random() * 60 + 20}%` }}
                                 className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                               />
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <button className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[9px] font-black text-zinc-500 uppercase tracking-widest transition-all">
                      Expand Control Center
                    </button>
                  </div>

                  <div className="bg-emerald-500/[0.02] border border-emerald-500/10 rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                       <Cpu className="w-5 h-5 text-emerald-500" />
                       <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Neural Capacity</h4>
                    </div>
                    <div className="space-y-4">
                       <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-zinc-600 uppercase">Analysis Load</span>
                            <span className="text-[9px] font-black text-emerald-500">OPTIMIZIED</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                             <div className="h-full w-[42%] bg-emerald-500" />
                          </div>
                       </div>
                       <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-zinc-600 uppercase">Network Latency</span>
                            <span className="text-[9px] font-black text-emerald-500">12ms</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                             <div className="h-full w-[12%] bg-emerald-500" />
                          </div>
                       </div>
                    </div>
                  </div>
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
