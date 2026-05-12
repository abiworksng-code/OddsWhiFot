import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History as HistoryIcon, 
  Trash2, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Search,
  Check,
  X,
  HelpCircle,
  Plus,
  Lock,
  LogIn
} from 'lucide-react';
import { getArchivedAnalyses, settleAnalysis, deleteAnalysis } from '../services/archiveService';
import { ArchivedAnalysis, SettlementOutcome } from '../types';
import { addSlipItem } from '../services/slipService';
import { useAuth } from '../lib/AuthProvider';

enum LocalFilter {
  ALL = 'all',
  ANALYZED = 'analyzed',
  WON = 'won',
  LOST = 'lost',
  VOID = 'void'
}

export function History() {
  const { user, signIn } = useAuth();
  const [history, setHistory] = useState<ArchivedAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<LocalFilter>(LocalFilter.ALL);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchHistory = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getArchivedAnalyses();
      setHistory(data || []);
    } catch (err: any) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to retrieve archive sync.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
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
    alert('Match re-added to Slip Buffer.');
  };

  const handleSettle = async (e: React.MouseEvent, id: string, outcome: SettlementOutcome) => {
    e.stopPropagation();
    const score = window.prompt("Enter final score (optional, e.g. 2-1):");
    setSettlingId(id);
    try {
      await settleAnalysis(id, outcome, score || undefined);
      await fetchHistory();
    } catch (error) {
      console.error(error);
    } finally {
      setSettlingId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this analysis permanently?")) return;
    try {
      await deleteAnalysis(id);
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  const filteredHistory = history.filter(item => {
    const matchesSearch = `${item.match?.homeTeam} ${item.match?.awayTeam}`.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeFilter === LocalFilter.ALL) return matchesSearch;
    if (activeFilter === LocalFilter.ANALYZED) return matchesSearch && item.outcome === SettlementOutcome.PENDING;
    if (activeFilter === LocalFilter.WON) return matchesSearch && item.outcome === SettlementOutcome.WIN;
    if (activeFilter === LocalFilter.LOST) return matchesSearch && item.outcome === SettlementOutcome.LOSS;
    if (activeFilter === LocalFilter.VOID) return matchesSearch && item.outcome === SettlementOutcome.VOID;
    return matchesSearch;
  });

  return (
    <div className="flex flex-col h-full space-y-6 pb-20">
      {/* Header Section */}
      <div className="space-y-4 px-1">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <HistoryIcon className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Analysis History</h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Track all past analyses and settle outcomes</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {Object.values(LocalFilter).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                activeFilter === f 
                  ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20' 
                  : 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search fixtures..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111] border border-white/5 rounded-lg h-10 pl-10 pr-4 text-[11px] text-white focus:outline-none focus:border-emerald-500/50 transition-all font-medium"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        {!user ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-3xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20">
              <Lock className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-2">Vault Access Locked</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-loose max-w-[240px] mb-8">
              Analysis snapshots are linked to your encrypted account for cross-platform availability.
            </p>
            <button 
              onClick={signIn}
              className="flex items-center gap-3 bg-emerald-500 text-black px-8 py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-400 transition-all shadow-[0_10px_30px_rgba(16,185,129,0.3)] active:scale-95"
            >
              <LogIn className="w-4 h-4" /> Initialize Account
            </button>
          </div>
        ) : loading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6 bg-red-500/[0.02] border border-red-500/10 rounded-3xl">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-2">Neural Link Severed</h3>
            <div className="text-[9px] text-zinc-500 font-mono tracking-tighter max-w-md bg-black/40 p-3 rounded border border-white/5 overflow-auto max-h-40 mb-6">
              {error}
            </div>
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-8">
              Check satellite configuration or database permissions.
            </p>
            <button 
              onClick={fetchHistory}
              className="px-8 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all"
            >
              Retry Uplink
            </button>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/5">
              <HistoryIcon className="w-6 h-6 text-zinc-700" />
            </div>
            <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em] mb-2">Neural Link Empty</h3>
            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter max-w-[200px]">
              No past analyses matching <span className="text-emerald-500/50">"{activeFilter}"</span> filter criteria were found in your local archive.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredHistory.map((item, idx) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.03 }}
                  className="group relative bg-[#0f1115] border border-white/5 rounded-2xl p-4 hover:border-emerald-500/30 transition-all cursor-pointer"
                >
                  <div className="flex gap-4">
                    {/* Match Card Header: Teams & Status */}
                    <div className="space-y-4">
                      {/* Top Row: Match Identity */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="text-[17px] font-black text-white tracking-tight uppercase leading-tight group-hover:text-emerald-400 transition-colors">
                            {item.match?.homeTeam} <span className="text-zinc-700 italic">vs</span> {item.match?.awayTeam}
                          </h3>
                        </div>
                        
                        {/* Outcome Badge next to Title */}
                        {item.outcome && item.outcome !== SettlementOutcome.PENDING && (
                          <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            item.outcome === SettlementOutcome.WIN ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500' :
                            item.outcome === SettlementOutcome.LOSS ? 'border-red-500/20 bg-red-500/10 text-red-500' :
                            'border-zinc-500/20 bg-zinc-500/10 text-zinc-400'
                          }`}>
                            {item.outcome}
                          </div>
                        )}
                        {item.outcome === SettlementOutcome.PENDING && (
                           <div className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-500/10 bg-amber-500/5 text-amber-500">
                              Analyzed
                           </div>
                        )}
                      </div>

                      {/* Middle Row: League & Date (Left) | Prediction (Center) | Confidence (Right) */}
                      <div className="grid grid-cols-12 items-center gap-4">
                        {/* Left: Metadata */}
                        <div className="col-span-3 space-y-1">
                          <div className="text-[10px] font-black text-zinc-500 uppercase leading-none truncate" title={item.match?.league}>
                            {item.match?.league || 'AI Recon'}
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px] text-zinc-700 font-bold uppercase transition-colors group-hover:text-zinc-500">
                            <span>•</span>
                            <span>{item.archivedAt?.toDate?.() ? item.archivedAt.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) : '2026-05-11'}</span>
                          </div>
                        </div>

                        {/* Center: The Prediction Meat */}
                        <div className="col-span-6 px-2 text-center border-x border-white/5">
                           <div className={`text-[13px] font-black leading-tight uppercase italic tracking-tight transition-all duration-500 ${
                             item.outcome === SettlementOutcome.WIN ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.2)]' : 'text-emerald-400/80 group-hover:text-emerald-400'
                           }`}>
                             {item.transformation.backupCombo}
                           </div>
                        </div>

                        {/* Right: Confidence Metric */}
                        <div className="col-span-3 flex flex-col items-end gap-1">
                           <div className="flex items-baseline gap-1">
                              <span className="text-[16px] font-black text-white tabular-nums tracking-tighter">
                                {item.confidence.score.toFixed(1)}
                              </span>
                              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">/10</span>
                           </div>
                        </div>
                      </div>

                      {/* Bottom Row: Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                         <div className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.2em] group-hover:text-emerald-500/30 transition-colors">
                           Neural Recon System v4.0
                         </div>
                         
                         <div className="flex items-center gap-4">
                           <button 
                             onClick={(e) => handleAddToSlip(e, item)}
                             className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-black rounded-lg text-[9px] font-black uppercase tracking-widest transform transition-all active:scale-95 hover:bg-emerald-400 shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
                           >
                             <Plus className="w-3 h-3 stroke-[3]" /> Add to Slip
                           </button>
                           
                           <button 
                             onClick={(e) => handleDelete(e, item.id)}
                             className="p-1.5 text-zinc-700 hover:text-red-500 transition-all rounded-lg hover:bg-red-500/5"
                             title="Wipe Analysis Data"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Settlement overlay for pending items on hover/click */}
                  {item.outcome === SettlementOutcome.PENDING && (
                    <div className="mt-4 pt-4 border-t border-white/5 flex gap-2 overflow-x-auto no-scrollbar">
                      {settlingId === item.id ? (
                        <div className="flex items-center gap-2 px-2 py-1 text-[9px] text-zinc-500 font-black uppercase italic">
                           <Loader2 className="w-3 h-3 animate-spin text-emerald-500" /> Applying result...
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={(e) => handleSettle(e, item.id, SettlementOutcome.WIN)}
                            className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-[9px] font-black text-emerald-500 uppercase hover:bg-emerald-500/10 transition-all"
                          >
                            <Check className="w-3 h-3" /> Mark Win
                          </button>
                          <button 
                            onClick={(e) => handleSettle(e, item.id, SettlementOutcome.LOSS)}
                            className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-red-500/5 border border-red-500/20 rounded-lg text-[9px] font-black text-red-500 uppercase hover:bg-red-500/10 transition-all"
                          >
                            <X className="w-3 h-3" /> Mark Loss
                          </button>
                          <button 
                            onClick={(e) => handleSettle(e, item.id, SettlementOutcome.VOID)}
                            className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-zinc-500/5 border border-zinc-500/20 rounded-lg text-[9px] font-black text-zinc-500 uppercase hover:bg-zinc-500/10 transition-all"
                          >
                            <HelpCircle className="w-3 h-3" /> Void
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Show final score if settled */}
                  {item.finalScore && (
                    <div className="mt-2 text-[9px] font-mono text-zinc-600 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-zinc-800" />
                      Final Verdict: {item.finalScore}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Stats Counter */}
      {!loading && filteredHistory.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 px-6 pointer-events-none">
          <div className="max-w-md mx-auto bg-black/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex justify-between items-center shadow-2xl">
            <span className="text-[9px] text-zinc-500 font-black uppercase tracking-tighter">
              Archive Metrics Locked
            </span>
            <span className="text-[10px] text-emerald-500 font-black tabular-nums">
              {filteredHistory.length} ENTRIES FOUND
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
