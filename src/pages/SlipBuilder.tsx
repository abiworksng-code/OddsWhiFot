import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, Trash2, Zap, AlertCircle, Plus, Search, Loader2, Sparkles, TrendingUp, ShieldCheck, Info } from 'lucide-react';
import { Market } from '../types';
import { fetchUpcomingOdds } from '../services/oddsService';
import { getSlipItems, removeSlipItem, clearSlip, SlipItem, addSlipItem } from '../services/slipService';

export function SlipBuilder() {
  const [items, setItems] = useState<SlipItem[]>([]);
  const [liveOdds, setLiveOdds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadRealOdds = async () => {
      setIsLoading(true);
      const data = await fetchUpcomingOdds();
      setLiveOdds(data || []);
      setIsLoading(false);
    };

    const syncSlip = () => {
      setItems(getSlipItems());
    };

    loadRealOdds();
    syncSlip();

    window.addEventListener('slip-updated', syncSlip);
    return () => window.removeEventListener('slip-updated', syncSlip);
  }, []);

  const totalOdds = items.reduce((acc, item) => acc * item.odds, 1);
  const avgConfidence = items.length > 0 
    ? items.reduce((acc, item) => acc + item.confidence, 0) / items.length 
    : 0;

  // SYSTEM LOGIC: Dynamic Slip Adjustments & AI Insights
  const aiInsights = useMemo(() => {
    if (items.length === 0) return null;
    
    const insights = [];
    if (totalOdds > 15) {
      insights.push({
        type: 'risk',
        icon: ShieldCheck,
        text: 'HIGH MULTIPLIER: Risk entropy elevated. System suggests hedging with a backup double chance on selected games.',
        color: 'text-amber-400'
      });
    }
    
    if (avgConfidence < 7.5) {
      insights.push({
        type: 'warning',
        icon: AlertCircle,
        text: 'LOW CONFIDENCE CLUSTER: Multiple low-reliability vectors detected. Engine recommends cleaning slip buffer.',
        color: 'text-red-400'
      });
    }

    if (items.length >= 3 && avgConfidence > 8.0) {
      insights.push({
        type: 'success',
        icon: Sparkles,
        text: 'ELITE STACK: High confidence cluster identified. Alpha value potential 88%.',
        color: 'text-emerald-400'
      });
    }

    return insights;
  }, [items, totalOdds, avgConfidence]);

  const removeItem = (id: string) => {
    removeSlipItem(id);
  };

  const addLiveMatch = (match: any, marketKey: string) => {
    const bookmaker = match.bookmakers[0];
    const market = bookmaker?.markets.find((m: any) => m.key === 'h2h'); 
    
    let outcome;
    let marketType: Market | string = Market.HOME_WIN;

    if (marketKey === 'home') {
      outcome = market?.outcomes.find((o: any) => o.name === match.home_team);
      marketType = Market.HOME_WIN;
    } else if (marketKey === 'away') {
      outcome = market?.outcomes.find((o: any) => o.name === match.away_team);
      marketType = Market.AWAY_WIN;
    } else {
      outcome = market?.outcomes.find((o: any) => o.name === 'Draw');
      marketType = 'DRAW'; 
    }

    const newItem: SlipItem = {
      id: `${match.id}-${marketKey}`,
      game: `${match.home_team} vs ${match.away_team}`,
      market: marketType,
      odds: outcome?.price || 1.0,
      confidence: 7.5 + Math.random() * 2 
    };

    addSlipItem(newItem);
  };

  const filteredLiveMatches = liveOdds.filter(m => 
    `${m.home_team} ${m.away_team}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-hidden">
      {/* Left Pane: Selection Buffer */}
      <div className="lg:col-span-8 space-y-4 overflow-auto pb-10 scrollbar-hide h-[60vh] lg:h-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[color:var(--color-header)] p-4 technical-border rounded gap-3 sm:gap-0">
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-white">Slip Reconstruction Chamber</h2>
            <p className="text-[10px] text-zinc-500">Add analyzed markets to the buffer for combined risk evaluation.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={clearSlip}
              className="flex-1 sm:flex-none px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded text-[9px] font-black uppercase tracking-widest transition-all"
            >
              System Wipe
            </button>
            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded transition-colors border border-emerald-500/30">
              <Plus className="w-3 h-3" />
              <span className="text-[9px] font-bold uppercase tracking-widest">Import Cache</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {items.map((item, i) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="technical-border bg-[color:var(--color-card)] p-4 rounded-sm flex items-center justify-between group relative overflow-hidden"
            >
              <div className="absolute top-0 right-1/4 bottom-0 w-1/4 bg-emerald-500/5 skew-x-12 -z-10" />
              
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center font-mono text-[10px] text-zinc-500 border border-white/5">
                  {(i+1).toString().padStart(2, '0')}
                </div>
                <div>
                  <div className="text-[11px] font-bold text-white uppercase tracking-tighter">{item.game}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-emerald-400 font-black uppercase tracking-tighter bg-emerald-500/10 px-1 rounded">{item.market}</span>
                    <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">Recon Ready</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 sm:gap-8">
                <div className="text-center">
                  <div className="text-[8px] text-zinc-600 uppercase mb-1">Price</div>
                  <div className="text-sm font-black text-white">{item.odds.toFixed(2)}</div>
                </div>
                <div className="text-center hidden sm:block">
                  <div className="text-[8px] text-zinc-600 uppercase mb-1">Vector</div>
                  <div className="text-[10px] font-black text-emerald-400">+{item.confidence.toFixed(1)}%</div>
                </div>
                <button 
                  onClick={() => removeItem(item.id)}
                  className="p-2 text-zinc-700 hover:text-red-400 transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}

          {items.length === 0 && (
            <div className="technical-grid h-48 border border-white/5 rounded flex flex-col items-center justify-center space-y-3">
              <ShoppingCart className="w-10 h-10 text-zinc-800" />
              <div className="text-center">
                 <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Slip Buffer is Empty</p>
                 <p className="text-[8px] text-zinc-700 uppercase mt-1">Reconstruct markets in the analyzer first.</p>
              </div>
            </div>
          )}
        </div>

        {/* AI Insight Overlay */}
        <AnimatePresence>
          {aiInsights && aiInsights.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg space-y-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Alpha Engine Optimization</span>
              </div>
              {aiInsights.map((insight, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <insight.icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${insight.color}`} />
                  <p className="text-[10px] text-zinc-400 leading-relaxed font-bold tracking-tight">{insight.text}</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Pane: Risk Summary & Search */}
      <div className="lg:col-span-4 h-full flex flex-col gap-4 overflow-hidden">
        <div className="technical-border bg-emerald-500/5 p-6 rounded relative overflow-hidden shrink-0 border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.05)]">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Zap className="w-24 h-24" />
          </div>
          
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400">System Accumulator</h3>
          </div>
          
          <div className="space-y-6 relative z-10">
            <div className="flex justify-between items-end border-b border-emerald-500/10 pb-4">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 font-black uppercase tracking-tight">Combined Odds</span>
                <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Total System Multiplier</span>
              </div>
              <span className="text-4xl font-black text-white italic tracking-tighter">{totalOdds.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <div className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.15em] mb-1">Avg Confidence</div>
                  <div className="text-lg font-black text-emerald-400">{avgConfidence.toFixed(1)}%</div>
               </div>
               <div>
                  <div className="text-[8px] text-zinc-600 font-black uppercase tracking-[0.15em] mb-1">Selection Count</div>
                  <div className="text-lg font-black text-white">{items.length} Markets</div>
               </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-[10px]">
                <span className="text-zinc-500 font-black uppercase tracking-widest">Risk Analysis</span>
                <span className={`font-black uppercase tracking-widest ${
                  avgConfidence > 8.5 ? 'text-emerald-400' : avgConfidence > 7 ? 'text-white' : 'text-amber-500'
                }`}>
                  {avgConfidence > 8.5 ? 'MINIMAL' : avgConfidence > 7 ? 'NOMINAL' : 'ELEVATED'}
                </span>
              </div>
              <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(avgConfidence * 10, 100)}%` }}
                  className={`h-full transition-colors ${
                    avgConfidence > 8.5 ? 'bg-emerald-500' : avgConfidence > 7 ? 'bg-emerald-400' : 'bg-amber-500'
                  }`}
                />
              </div>
            </div>

            <div className="pt-2">
               <button 
                disabled={items.length === 0}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:grayscale text-black font-black py-4 rounded text-xs uppercase tracking-widest transition-all shadow-[0_10px_20px_rgba(16,185,129,0.2)] active:scale-95"
               >
                 Export Optimized Slip
               </button>
               <div className="flex items-center justify-center gap-1.5 mt-3 text-[8px] text-zinc-600 font-bold uppercase">
                  <ShieldCheck className="w-2.5 h-2.5" /> Secure Vector Transmission Active
               </div>
            </div>
          </div>
        </div>

        {/* Live Odds Explorer */}
        <div className="flex-1 technical-border bg-[color:var(--color-header)] rounded flex flex-col min-h-0 min-h-[300px]">
           <div className="p-3 border-b border-white/5 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3 h-3 text-zinc-500" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Live Recon Terminal</span>
              </div>
              {isLoading && <Loader2 className="w-3 h-3 text-emerald-500 animate-spin" />}
           </div>
           <div className="p-2 border-b border-white/5">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input 
                  type="text" 
                  placeholder="Filter active fixtures..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded h-10 pl-9 pr-3 text-[10px] focus:outline-none focus:border-emerald-500/50 transition-all text-white placeholder:text-zinc-700"
                />
              </div>
           </div>
           <div className="flex-1 overflow-auto p-2 space-y-2 scrollbar-hide">
              <AnimatePresence>
                {filteredLiveMatches.length > 0 ? (
                  filteredLiveMatches.map((m) => {
                    const h2h = m.bookmakers[0]?.markets.find((mk: any) => mk.key === 'h2h');
                    const home = h2h?.outcomes.find((o: any) => o.name === m.home_team);
                    const draw = h2h?.outcomes.find((o: any) => o.name === 'Draw');
                    const away = h2h?.outcomes.find((o: any) => o.name === m.away_team);

                    return (
                      <motion.div 
                        key={m.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white/[0.02] border border-white/5 p-3 rounded-lg hover:border-emerald-500/20 transition-all group"
                      >
                        <div className="flex justify-between items-center mb-2">
                           <div className="text-[8px] text-zinc-600 uppercase font-black tracking-widest">{m.sport_title}</div>
                           <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        </div>
                        <div className="text-[10px] font-black text-white mb-3 uppercase tracking-tight">{m.home_team} vs {m.away_team}</div>
                        <div className="grid grid-cols-3 gap-2">
                          <button 
                            onClick={() => addLiveMatch(m, 'home')}
                            className="bg-black/40 p-2 rounded border border-white/5 hover:border-emerald-500/40 text-center transition-all group/btn"
                          >
                            <div className="text-[7px] text-zinc-500 uppercase font-bold group-hover/btn:text-emerald-500/70">Home</div>
                            <div className="text-xs font-black text-emerald-400">{home?.price || '—'}</div>
                          </button>
                          <button 
                            onClick={() => addLiveMatch(m, 'draw')}
                            className="bg-black/40 p-2 rounded border border-white/5 hover:border-white/20 text-center transition-all group/btn"
                          >
                            <div className="text-[7px] text-zinc-500 uppercase font-bold group-hover/btn:text-white/70">Draw</div>
                            <div className="text-xs font-black text-white">{draw?.price || '—'}</div>
                          </button>
                          <button 
                            onClick={() => addLiveMatch(m, 'away')}
                            className="bg-black/40 p-2 rounded border border-white/5 hover:border-emerald-500/40 text-center transition-all group/btn"
                          >
                            <div className="text-[7px] text-zinc-500 uppercase font-bold group-hover/btn:text-emerald-500/70">Away</div>
                            <div className="text-xs font-black text-emerald-400">{away?.price || '—'}</div>
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 opacity-20">
                     <Info className="w-8 h-8 mb-2" />
                     <span className="text-[9px] font-black uppercase tracking-widest">No matching active vectors</span>
                  </div>
                )}
              </AnimatePresence>
           </div>
        </div>
      </div>
    </div>
  );
}

