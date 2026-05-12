import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Activity, 
  Zap, 
  Target, 
  AlertTriangle, 
  ArrowRightLeft, 
  TrendingUp, 
  ChevronRight,
  Search,
  Plus,
  Loader2,
  Database,
  Info,
  Save,
  Skull,
  MousePointer2,
  XCircle,
  BarChart3,
  Coins,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { analyzeMatch, generateBackupCombo, validateMatchData, validateAnalysisOutput, ValidationError } from '../services/bettingAnalysisEngine';
import { MatchData, AnalysisOutput, Market, LeagueTier, MatchTempo } from '../types';
import { MOCK_MATCHES, LEAGUE_STABILITY_EXPLANATIONS, TEMPO_DEFINITIONS } from '../constants';
import { getProReasoning, getDeepMatchAnalysis, getFinalSystemVerdict } from '../lib/gemini';
import { archiveAnalysis } from '../services/archiveService';
import { fetchUpcomingOdds, OddsMatch } from '../services/oddsService';
import { addSlipItem } from '../services/slipService';
import { useEffect } from 'react';
import { useAuth } from '../lib/AuthProvider';
import { collection, query, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function MatchAnalyzer() {
  const { user, signIn } = useAuth();
  const [selectedMatch, setSelectedMatch] = useState<MatchData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveSuccess, setArchiveSuccess] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  
  // Custom search inputs
  const [homeInput, setHomeInput] = useState('');
  const [awayInput, setAwayInput] = useState('');
  const [isDeepSearching, setIsDeepSearching] = useState(false);
  const [deepAnalysisError, setDeepAnalysisError] = useState<string | null>(null);
  const [liveMatches, setLiveMatches] = useState<MatchData[]>([]);
  const [customMatches, setCustomMatches] = useState<MatchData[]>([]);
  const [isLoadingOdds, setIsLoadingOdds] = useState(false);
  const [hideHighRisk, setHideHighRisk] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Helper to check risk level before full analysis
  const getMatchRiskStatus = (match: MatchData) => {
    if (match.leagueTier === LeagueTier.TIER_C) return 'HIGH';
    const homeImp = 1 / match.originalOdds.home;
    const awayImp = 1 / match.originalOdds.away;
    if ((homeImp > 0.6 && match.homeStats.homeForm < 4) || (awayImp > 0.6 && match.awayStats.awayForm < 4)) return 'WARNING';
    return 'STABLE';
  };

  const fetchCustomMatches = async () => {
    try {
      const q = query(collection(db, 'matches'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        isCustom: true
      })) as any[];
      setCustomMatches(data);
    } catch (err) {
      console.error("Failed to fetch custom matches:", err);
    }
  };

  const handleDeleteCustomMatch = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Delete this custom match from repository?")) return;
    try {
      await deleteDoc(doc(db, 'matches', id));
      setCustomMatches(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const loadRealTimeOdds = async () => {
      setIsLoadingOdds(true);
      const odds = await fetchUpcomingOdds();
      if (odds && odds.length > 0) {
        const mappedMatches: MatchData[] = odds.map(m => {
          const mainBookmaker = m.bookmakers[0];
          const h2hMarket = mainBookmaker?.markets.find(mk => mk.key === 'h2h');
          const homeOutcome = h2hMarket?.outcomes.find(o => o.name === m.home_team);
          const drawOutcome = h2hMarket?.outcomes.find(o => o.name === 'Draw');
          const awayOutcome = h2hMarket?.outcomes.find(o => o.name === m.away_team);

          return {
            id: m.id,
            league: m.sport_title,
            leagueTier: LeagueTier.TIER_B, // Default to B
            homeTeam: m.home_team,
            awayTeam: m.away_team,
            homeStats: {
              lastFiveMatches: [],
              homeForm: 5,
              awayForm: 5,
              goalsScored: 1.5,
              goalsConceded: 1.2,
              cleanSheets: 1,
              motivation: 3,
              injuries: []
            },
            awayStats: {
              lastFiveMatches: [],
              homeForm: 5,
              awayForm: 5,
              goalsScored: 1.5,
              goalsConceded: 1.2,
              cleanSheets: 1,
              motivation: 3,
              injuries: []
            },
            originalOdds: {
              home: homeOutcome?.price || 2.0,
              draw: drawOutcome?.price || 3.2,
              away: awayOutcome?.price || 3.5
            }
          };
        });
        setLiveMatches(mappedMatches);
      }
      setIsLoadingOdds(false);
    };

    loadRealTimeOdds();
    fetchCustomMatches();
  }, []);

  const handleAnalyze = async (match: MatchData) => {
    setIsAnalyzing(true);
    setAnalysis(null);
    setSelectedMatch(match);
    setValidationErrors([]);

    const errors = validateMatchData(match);
    if (errors.length > 0) {
      setValidationErrors(errors);
      setIsAnalyzing(false);
      return;
    }
    
    // Core logical analysis
    const result = analyzeMatch(match);

    const postErrors = validateAnalysisOutput(result);
    if (postErrors.length > 0) {
      setValidationErrors(postErrors);
      setIsAnalyzing(false);
      return;
    }
    
    // AI enhanced reasoning
    const aiReason = await getProReasoning(
      { homeTeam: match.homeTeam, awayTeam: match.awayTeam, league: match.league },
      result.transformation.suggestedMarket
    );
    
    const intermediateAnalysis: AnalysisOutput = {
      ...result,
      aiReasoning: aiReason
    };

    // --- CROSS-VERIFICATION LOOP for Sidebar Matches ---
    const verdict = await getFinalSystemVerdict(intermediateAnalysis);
    
    const finalAnalysis: AnalysisOutput = {
      ...intermediateAnalysis,
      aiReasoning: verdict.text,
      isAIPowered: !!verdict.isAIPowered,
      confidence: {
        ...intermediateAnalysis.confidence,
        score: Math.min(10, Math.max(0, intermediateAnalysis.confidence.score + verdict.scoreAdjustment)),
        category: (Math.min(10, Math.max(0, intermediateAnalysis.confidence.score + verdict.scoreAdjustment))) > 8.5 ? 'Elite Safe' : 
                 (Math.min(10, Math.max(0, intermediateAnalysis.confidence.score + verdict.scoreAdjustment))) > 7.5 ? 'Strong Safe' : 'Medium Safe'
      }
    };

    if (verdict.suggestedMarketOverride) {
      finalAnalysis.transformation.suggestedMarket = verdict.suggestedMarketOverride as Market;
      finalAnalysis.transformation.reasoning = `[AI OVERRIDE] ${verdict.riskWarning || 'Market adjusted via neural verification.'} Original logic was: ${intermediateAnalysis.transformation.reasoning}`;
    }
    
    setAnalysis(finalAnalysis);
    setIsAnalyzing(false);
    
    // Auto-archive on completion
    await handleArchive(finalAnalysis, true);
  };

  const handleArchive = async (targetAnalysis: AnalysisOutput | null = null, isAuto = false) => {
    const analysisToArchive = targetAnalysis || analysis;
    if (!analysisToArchive || isArchiving) return;
    
    // Reset states
    setArchiveSuccess(false);
    setArchiveError(null);
    setIsArchiving(true);
    try {
      // Find match info if available
      const matchInfo = selectedMatch ? {
        homeTeam: selectedMatch.homeTeam,
        awayTeam: selectedMatch.awayTeam,
        league: selectedMatch.league
      } : analysisToArchive.realData ? {
        homeTeam: homeInput || 'AI Recon',
        awayTeam: awayInput || 'AI Recon',
        league: analysisToArchive.realData.league || 'AI Global Search'
      } : undefined;

      const result = await archiveAnalysis(analysisToArchive, matchInfo);
      if (result) {
        setArchiveSuccess(true);
      } else if (!user && !isAuto) {
        setArchiveError('NOT_LOGGED_IN');
      }
      
      if (!isAuto && result) {
        alert('Analysis archived to repository.');
      }
    } catch (error) {
      console.error(error);
      setArchiveError(error instanceof Error ? error.message : 'Unknown sync error');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDeepAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeInput || !awayInput) return;

    setIsAnalyzing(true);
    setIsDeepSearching(true);
    setDeepAnalysisError(null);
    setAnalysis(null);
    setSelectedMatch(null);
    setValidationErrors([]);

    try {
      const result = await getDeepMatchAnalysis(homeInput, awayInput);
      
      // --- CROSS-VERIFICATION LOOP ---
      // 1. Construct synthetic match data from AI metrics
      const syntheticMatch: MatchData = {
        id: `ai-${Date.now()}`,
        league: result.league || 'AI Search Result',
        leagueTier: LeagueTier.TIER_B, // Assumed for safety, or inferred
        homeTeam: homeInput,
        awayTeam: awayInput,
        homeStats: {
          lastFiveMatches: [],
          homeForm: Math.min(10, Math.max(0, Math.round(result.realData.metrics?.homeForm || 5))),
          awayForm: 5,
          goalsScored: result.realData.metrics?.attackingPotency ? result.realData.metrics.attackingPotency / 2 : 1.5,
          goalsConceded: result.realData.metrics?.defensiveStability ? (10 - result.realData.metrics.defensiveStability) / 2 : 1.2,
          cleanSheets: result.realData.metrics?.defensiveStability ? result.realData.metrics.defensiveStability / 2 : 1,
          motivation: Math.min(5, Math.max(1, Math.round(result.realData.metrics?.homeMotivation || 3))),
          injuries: []
        },
        awayStats: {
          lastFiveMatches: [],
          homeForm: 5,
          awayForm: Math.min(10, Math.max(0, Math.round(result.realData.metrics?.awayForm || 5))),
          goalsScored: result.realData.metrics?.attackingPotency ? result.realData.metrics.attackingPotency / 2 : 1.5,
          goalsConceded: result.realData.metrics?.defensiveStability ? (10 - result.realData.metrics.defensiveStability) / 2 : 1.2,
          cleanSheets: result.realData.metrics?.defensiveStability ? result.realData.metrics.defensiveStability / 2 : 1,
          motivation: Math.min(5, Math.max(1, Math.round(result.realData.metrics?.awayMotivation || 3))),
          injuries: []
        },
        originalOdds: {
          home: 2.0, // Defaults or parsed from currentOdds if we had a regex
          draw: 3.4,
          away: 3.8
        }
      };

      // Validate synthetic data
      const errors = validateMatchData(syntheticMatch);
      if (errors.length > 0) {
        setValidationErrors(errors);
        setIsAnalyzing(false);
        setIsDeepSearching(false);
        return;
      }

      // 2. Run through Cold Logic Engine
      const engineResult = analyzeMatch(syntheticMatch);
      
      const postErrors = validateAnalysisOutput(engineResult);
      if (postErrors.length > 0) {
        setValidationErrors(postErrors);
        setIsAnalyzing(false);
        setIsDeepSearching(false);
        return;
      }

      // 3. Map AI response and combine with Engine logic
      const mappedAnalysis: AnalysisOutput = {
        ...engineResult,
        matchId: `cv-${Date.now()}`,
        tempo: {
          ...engineResult.tempo,
          explanation: result.analysis.tempo || engineResult.tempo.explanation
        },
        goalEnvironment: {
          avgGoals: parseFloat(result.analysis.goalExpectancy) || engineResult.goalEnvironment.avgGoals,
          bttsHitRate: result.realData.goalVerdict?.toLowerCase().includes('btts') ? 0.75 : 0.5,
          over15Rate: result.analysis.goalExpectancy?.includes('High') ? 0.85 : 0.7
        },
        oddsTrap: {
          isTrap: result.analysis.riskRating?.includes('Trap') || engineResult.oddsTrap.isTrap,
          reason: result.analysis.riskRating || engineResult.oddsTrap.reason
        },
        transformation: {
          originalMarket: Market.HOME_WIN,
          suggestedMarket: result.analysis.suggestedMarket as Market || engineResult.transformation.suggestedMarket,
          alternativeMarket: result.analysis.alternativeMarket as Market || engineResult.transformation.alternativeMarket,
          backupCombo: generateBackupCombo(
            result.analysis.suggestedMarket as Market || engineResult.transformation.suggestedMarket,
            result.analysis.alternativeMarket as Market || engineResult.transformation.alternativeMarket,
            engineResult.teamStrength.strongerTeam,
            engineResult.tempo.type,
            { 
              over15: engineResult.probabilities?.over15 || 0, 
              over25: engineResult.probabilities?.over25 || 0, 
              btts: engineResult.probabilities?.btts || 0 
            }
          ),
          reasoning: `[CROSS-VERIFIED] ${result.analysis.marketTransformationLogic || result.analysis.reasoning}`
        },
        confidence: {
          score: (result.confidenceScore + engineResult.confidence.score) / 2, // Combined weighted score
          category: ((result.confidenceScore + engineResult.confidence.score) / 2) > 8 ? 'Elite Safe' : 'Medium Safe'
        },
        aiReasoning: result.analysis.reasoning || 'Cross-verified search reconstruction complete.',
        realData: {
          ...result.realData,
          league: result.league,
          matchTime: result.matchTime
        }
      };

    // 4. Final System Verdict (Cross-Verification)
      const verdict = await getFinalSystemVerdict(mappedAnalysis);
      
      const finalAnalysis: AnalysisOutput = {
        ...mappedAnalysis,
        aiReasoning: verdict.text,
        isAIPowered: !!verdict.isAIPowered,
        confidence: {
          ...mappedAnalysis.confidence,
          score: Math.min(10, Math.max(0, mappedAnalysis.confidence.score + verdict.scoreAdjustment)),
          category: (Math.min(10, Math.max(0, mappedAnalysis.confidence.score + verdict.scoreAdjustment))) > 8.5 ? 'Elite Safe' : 
                   (Math.min(10, Math.max(0, mappedAnalysis.confidence.score + verdict.scoreAdjustment))) > 7.5 ? 'Strong Safe' : 'Medium Safe'
        }
      };

      if (verdict.suggestedMarketOverride) {
        finalAnalysis.transformation.suggestedMarket = verdict.suggestedMarketOverride as Market;
        finalAnalysis.transformation.reasoning = `[AI OVERRIDE] ${verdict.riskWarning || 'Market adjusted via neural verification.'} Original logic was: ${mappedAnalysis.transformation.reasoning}`;
      }

      setAnalysis(finalAnalysis);
      
      // Auto-archive on completion for deep search
      await handleArchive(finalAnalysis, true);
    } catch (error) {
      console.error(error);
      setDeepAnalysisError(error instanceof Error ? error.message : 'Analysis link failed. Check satellite connection.');
    } finally {
      setIsAnalyzing(false);
      setIsDeepSearching(false);
    }
  };

  const handleAddToSlip = async () => {
    if (!analysis) return;
    
    addSlipItem({
      id: analysis.matchId,
      game: selectedMatch ? `${selectedMatch.homeTeam} vs ${selectedMatch.awayTeam}` : analysis.realData ? `${homeInput} vs ${awayInput}` : 'AI Recon Match',
      market: analysis.transformation.suggestedMarket,
      odds: analysis.valueAnalysis?.impliedOdds || 1.85,
      confidence: analysis.confidence.score
    });
    
    // Manual archive
    await handleArchive(analysis);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full overflow-hidden">
      {/* Sidebar: Match Selector */}
      <div className="lg:col-span-3 technical-border bg-[color:var(--color-header)] flex flex-col h-[50vh] lg:h-full rounded-lg overflow-hidden">
        <div className="p-3 border-b border-white/5 flex items-center justify-between">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Active Fixtures</span>
          <div className="flex gap-2">
            <button 
              onClick={() => setHideHighRisk(!hideHighRisk)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all border ${
                hideHighRisk ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-white/5 border-white/5 text-zinc-600'
              }`}
              title={hideHighRisk ? "Show Suspicious Targets" : "Hide High-Risk Targets"}
            >
              <Skull className="w-3 h-3" />
              <span className="text-[8px] font-black uppercase tracking-tighter">Eliminator</span>
            </button>
            <button className="p-1 hover:bg-white/5 rounded transition-colors border border-transparent">
              <Plus className="w-4 h-4 text-emerald-400" />
            </button>
            <button 
              onClick={() => {
                const testMatch = MOCK_MATCHES[0];
                handleAnalyze(testMatch);
              }}
              className="p-1 hover:bg-emerald-500/20 rounded transition-colors border border-emerald-500/30 bg-emerald-500/10"
              title="Run Engine System Test"
            >
              <Activity className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>

        {/* Custom AI Search Form */}
        <div className="p-3 bg-emerald-500/5 border-b border-white/5">
          <form onSubmit={handleDeepAnalyze} className="space-y-2">
             <div className="flex items-center gap-2 mb-2">
                <Zap className="w-3 h-3 text-emerald-400" />
                <span className="text-[9px] font-black uppercase text-emerald-400">AI Deep Search</span>
             </div>
             {deepAnalysisError && (
               <div className="p-2 bg-red-500/10 border border-red-500/20 rounded mb-2">
                  <p className="text-[8px] font-black text-red-500 uppercase leading-tight italic">Error: {deepAnalysisError}</p>
               </div>
             )}
             <input 
               type="text"
               placeholder="Home Team..."
               value={homeInput}
               onChange={e => setHomeInput(e.target.value)}
               className="w-full bg-black/40 border border-white/10 rounded p-2 text-[10px] text-white focus:outline-none focus:border-emerald-500"
             />
             <input 
               type="text"
               placeholder="Away Team..."
               value={awayInput}
               onChange={e => setAwayInput(e.target.value)}
               className="w-full bg-black/40 border border-white/10 rounded p-2 text-[10px] text-white focus:outline-none focus:border-emerald-500"
             />
             <button 
               type="submit"
               disabled={isAnalyzing}
               className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-2 rounded text-[9px] uppercase tracking-widest transition-all disabled:opacity-50"
             >
               {isDeepSearching ? 'Searching Real World...' : 'Initialize Deep Analysis'}
             </button>
          </form>
        </div>

        <div className="p-2">
          <div className="flex gap-1 mb-2 bg-black/20 p-1 rounded">
            <button 
              onClick={() => setShowHistory(false)}
              className={`flex-1 text-[9px] font-black uppercase py-1.5 rounded transition-all ${!showHistory ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'bg-transparent text-zinc-500 hover:text-white'}`}
            >
              Live Odds
            </button>
            <button 
              onClick={() => setShowHistory(true)}
              className={`flex-1 text-[9px] font-black uppercase py-1.5 rounded transition-all ${showHistory ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'bg-transparent text-zinc-500 hover:text-white'}`}
            >
              Repository
            </button>
          </div>

          <div className="relative mb-3">
            <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input 
              type="text" 
              placeholder="Search team or league..." 
              className="w-full bg-white/5 border border-white/5 rounded-sm py-1.5 pl-8 pr-3 text-[11px] focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-2 space-y-1 scrollbar-thin">
          {isLoadingOdds && !showHistory && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
              <span className="text-[10px] text-zinc-500 ml-2 uppercase font-bold">Synchronizing Feed...</span>
            </div>
          )}

          {(showHistory ? [...customMatches, ...MOCK_MATCHES] : liveMatches)
            .filter(match => !hideHighRisk || getMatchRiskStatus(match) !== 'HIGH')
            .map((match) => {
              const risk = getMatchRiskStatus(match);
              const isCustom = (match as any).isCustom;
              
              return (
                <button
                  key={match.id}
                  onClick={() => handleAnalyze(match)}
                  className={`w-full text-left p-3 rounded-lg border transition-all mb-1 relative overflow-hidden group ${
                    selectedMatch?.id === match.id 
                    ? 'bg-emerald-500/10 border-emerald-500/30' 
                    : 'bg-white/[0.04] border-white/5 hover:border-emerald-500/30'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter line-clamp-1 pr-12">{match.league}</span>
                    <div className="flex gap-1 items-center">
                      {isCustom && (
                        <button 
                          onClick={(e) => handleDeleteCustomMatch(e, match.id)}
                          className="p-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                          title="Purge Match Data"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                      {risk !== 'STABLE' && (
                        <div className={`px-1 rounded-[2px] text-[7px] font-black uppercase tracking-tighter ${
                          risk === 'HIGH' ? 'bg-red-500 text-black' : 'bg-amber-500 text-black'
                        }`}>
                          {risk}
                        </div>
                      )}
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        risk === 'STABLE' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}></span>
                    </div>
                  </div>
                  <div className="text-[11px] font-black text-white uppercase italic leading-tight">
                    {match.homeTeam} <span className="text-emerald-500/30 font-mono not-italic px-0.5">/</span> {match.awayTeam}
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex gap-1.5">
                       <span className="text-[9px] font-mono text-emerald-500/70">{match.originalOdds.home.toFixed(2)}</span>
                       <span className="text-[9px] font-mono text-zinc-600">{match.originalOdds.draw.toFixed(2)}</span>
                       <span className="text-[9px] font-mono text-zinc-600">{match.originalOdds.away.toFixed(2)}</span>
                    </div>
                    {selectedMatch?.id === match.id && (
                      <Activity className="w-2.5 h-2.5 text-emerald-500 animate-pulse" />
                    )}
                  </div>
                </button>
              );
            })}
          
          {(showHistory ? [...customMatches, ...MOCK_MATCHES] : liveMatches).length === 0 && (
            <div className="py-20 text-center text-[10px] text-zinc-700 uppercase font-black space-y-2">
              <Database className="w-8 h-8 text-zinc-900 mx-auto opacity-50" />
              <p>Buffer Stream Empty</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Analysis Engine */}
      <div className="lg:col-span-9 flex flex-col gap-4 overflow-auto pr-2 pb-8">
        <AnimatePresence mode="wait">
          {isAnalyzing ? (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="flex-1 flex flex-col items-center justify-center technical-grid rounded-lg border border-white/5 h-full min-h-[400px]"
             >
               <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
               <div className="text-center space-y-2">
                 <h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">
                   {isDeepSearching ? 'Accessing Global Sports Data' : 'Calibrating Neural Engine'}
                 </h3>
                 <p className="text-[10px] text-zinc-500 uppercase">
                   {isDeepSearching ? 'Fetching live news, form & H2H via Gemini Search...' : 'Synchronizing market data & historical recon...'}
                 </p>
               </div>
             </motion.div>
          ) : validationErrors.length > 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex items-center justify-center bg-red-500/5 rounded-lg border border-red-500/20 p-8 h-full min-h-[400px]"
            >
              <div className="max-w-md w-full">
                <div className="flex items-center gap-3 mb-6 border-b border-red-500/20 pb-4">
                  <XCircle className="w-6 h-6 text-red-500" />
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Pre-Analysis Data Violation</h3>
                </div>
                <div className="space-y-4">
                  {validationErrors.map((error, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="text-[10px] font-mono text-red-500/50 mt-0.5">[{error.field}]</div>
                      <div className="text-xs text-zinc-300 font-medium">{error.message}</div>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => setValidationErrors([])}
                  className="mt-8 w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black uppercase text-white rounded transition-colors"
                >
                  Clear Diagnostics
                </button>
              </div>
            </motion.div>
          ) : !analysis ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex items-center justify-center technical-grid rounded-lg border border-white/5"
            >
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                  <Activity className="w-6 h-6 text-zinc-600" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white">ORBITAL ANALYSIS READY</h3>
                  <p className="text-[11px] text-zinc-500">Select a fixture from the sidebar to initialize the 8-step engine.</p>
                </div>
              </div>
            </motion.div>
          ) : (
    <motion.div 
      key={analysis.matchId}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Vault Sync Status */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/40 border border-white/10 rounded-lg">
         <div className="flex items-center gap-2">
            {archiveError ? (
               <AlertTriangle className="w-3 h-3 text-red-500" />
            ) : (
               <Database className={`w-3 h-3 ${isArchiving ? 'animate-pulse text-amber-500' : archiveSuccess ? 'text-emerald-500' : 'text-zinc-600'}`} />
            )}
            <span className={`text-[9px] font-black uppercase tracking-widest ${archiveError && archiveError !== 'NOT_LOGGED_IN' ? 'text-red-400' : 'text-zinc-400'}`}>
               {isArchiving ? 'Syncing with Neural Vault...' : 
                archiveError === 'NOT_LOGGED_IN' ? 'Vault Access Locked (Login Required)' :
                archiveError ? `Sync Error: ${archiveError === 'AUTH_REQUIRED' ? 'AUTH_REQUIRED' : 'NETWORK_REJECT'}` :
                archiveSuccess ? 'Analyzed Snapshot Persisted' : 
                !user ? 'Vault Access Locked (Sign in to save)' : 'Pending Neural Sync'}
            </span>
         </div>
         {!user ? (
            <button 
              onClick={signIn}
              className="text-[9px] font-black uppercase text-emerald-500 hover:text-emerald-400 flex items-center gap-2 group"
            >
              Initialize Link <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
         ) : archiveSuccess ? (
            <div className="flex items-center gap-1.5 text-emerald-500/50">
               <CheckCircle2 className="w-3 h-3" />
               <span className="text-[8px] font-black uppercase tracking-tighter">Verified</span>
            </div>
         ) : archiveError ? (
           <button 
             onClick={() => handleArchive(analysis)}
             className="text-[8px] font-black uppercase text-red-500 hover:text-red-400 border border-red-500/20 px-2 py-0.5 rounded transition-colors"
           >
             Retry Sync
           </button>
         ) : !isArchiving && (
           <button 
             onClick={() => handleArchive(analysis)}
             className="text-[8px] font-black uppercase text-zinc-500 hover:text-white border border-white/10 px-2 py-0.5 rounded transition-colors"
           >
             Manual Persist
           </button>
         )}
      </div>

      {/* Status Banner */}
              {analysis.elimination?.isEliminated && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-red-500/10 border border-red-500/30 p-4 rounded flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Skull className="w-5 h-5 text-red-500" />
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-widest">{analysis.elimination.criticalFail}</h4>
                      <p className="text-[10px] text-red-400/70 uppercase font-bold mt-0.5">{analysis.elimination.reason}</p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-red-500 text-black font-black text-[9px] rounded uppercase tracking-tighter">
                    ELIMINATED
                  </div>
                </motion.div>
              )}

              {/* Header Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className={`technical-border p-3 rounded bg-[color:var(--color-card)] relative overflow-hidden ${analysis.elimination?.isEliminated ? 'opacity-50 grayscale' : ''}`}>
                  <div className="text-[9px] text-zinc-500 font-bold uppercase mb-1">Confidence Score</div>
                  <div className="text-2xl font-black text-white mono-value">{analysis.confidence.score.toFixed(1)}<span className="text-[10px] text-zinc-600 font-normal">/10</span></div>
                  <div className={`text-[8px] font-bold uppercase mt-1 ${
                    analysis.confidence.category.includes('Safe') ? 'text-emerald-400' : 'text-amber-500'
                  }`}>
                    {analysis.confidence.category}
                  </div>
                  <div className="absolute right-0 bottom-0 opacity-10">
                    <Zap className="w-12 h-12" />
                  </div>
                </div>
                <div className="technical-border p-3 rounded bg-[color:var(--color-card)]">
                  <div className="text-[9px] text-zinc-500 font-bold uppercase mb-1">Stability Tier</div>
                  <div className="text-xl font-bold text-white">{analysis.leagueStability.tier}</div>
                  <div className="text-[8px] text-zinc-600 mt-1 uppercase leading-tight">
                    {analysis.leagueStability.score}/10 Predictability
                  </div>
                </div>
                <div className="technical-border p-3 rounded bg-[color:var(--color-card)] flex flex-col justify-between">
                  <div>
                    <div className="text-[9px] text-zinc-500 font-bold uppercase mb-1">Visual Tempo</div>
                    <div className="text-xl font-bold text-emerald-400 uppercase tracking-tighter">{analysis.tempo.type}</div>
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[7px] text-zinc-600 font-bold uppercase">
                       <span>Defensive</span>
                       <span>Attacking</span>
                    </div>
                    <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden relative">
                       <motion.div 
                         initial={{ left: '50%' }}
                         animate={{ 
                           left: analysis.tempo.type === MatchTempo.OPEN ? '80%' : 
                                 analysis.tempo.type === MatchTempo.DEFENSIVE ? '20%' : '50%' 
                         }}
                         className="absolute w-2 h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] -translate-x-1/2"
                       />
                    </div>
                  </div>
                </div>
                <div className="technical-border p-3 rounded bg-emerald-500/10 border-emerald-500/20 relative overflow-hidden">
                  <div className="text-[9px] text-emerald-400 font-bold uppercase mb-1">Verdict</div>
                  <div className="text-sm font-bold text-white uppercase">{analysis.transformation.suggestedMarket}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <div className={`w-1 h-1 rounded-full ${analysis.isAIPowered ? 'bg-emerald-400' : 'bg-amber-500'} animate-pulse`}></div>
                    <span className={`text-[8px] font-medium uppercase italic ${analysis.isAIPowered ? 'text-emerald-400' : 'text-amber-500'}`}>
                      {analysis.isAIPowered ? 'AI Neural Verified' : 'Statistical Fallback Active'}
                    </span>
                  </div>
                  {analysis.isAIPowered && (
                    <div className="absolute top-0 right-0 p-1 opacity-10">
                       <Zap className="w-8 h-8 text-emerald-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* ELITE PROBABILITY VECTORS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[color:var(--color-card)] technical-border p-3 rounded relative overflow-hidden">
                   <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-3 h-3 text-emerald-400" />
                      <span className="text-[8px] sm:text-[9px] font-black text-zinc-500 uppercase tracking-widest">O1.5 Vector</span>
                   </div>
                   <div className="text-lg sm:text-xl font-black text-white italic">{((analysis.probabilities?.over15 || 0) * 100).toFixed(1)}%</div>
                   <div className="h-1 bg-zinc-900 rounded-full mt-2 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(analysis.probabilities?.over15 || 0) * 100}%` }}
                        className="h-full bg-emerald-500"
                      />
                   </div>
                </div>
                <div className="bg-[color:var(--color-card)] technical-border p-3 rounded relative overflow-hidden">
                   <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-3 h-3 text-emerald-400" />
                      <span className="text-[8px] sm:text-[9px] font-black text-zinc-500 uppercase tracking-widest">O2.5 Vector</span>
                   </div>
                   <div className="text-lg sm:text-xl font-black text-white italic">{((analysis.probabilities?.over25 || 0) * 100).toFixed(1)}%</div>
                   <div className="h-1 bg-zinc-900 rounded-full mt-2 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(analysis.probabilities?.over25 || 0) * 100}%` }}
                        className="h-full bg-emerald-400"
                      />
                   </div>
                </div>
                <div className="bg-[color:var(--color-card)] technical-border p-3 rounded relative overflow-hidden">
                   <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-3 h-3 text-emerald-400" />
                      <span className="text-[8px] sm:text-[9px] font-black text-zinc-500 uppercase tracking-widest">BTTS Vector</span>
                   </div>
                   <div className="text-lg sm:text-xl font-black text-white italic">{((analysis.probabilities?.btts || 0) * 100).toFixed(1)}%</div>
                   <div className="h-1 bg-zinc-900 rounded-full mt-2 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(analysis.probabilities?.btts || 0) * 100}%` }}
                        className="h-full bg-emerald-300"
                      />
                   </div>
                </div>
                {/* VALUE ANALYTICS */}
                <div className={`technical-border p-3 rounded flex flex-col justify-between ${
                  analysis.valueAnalysis?.isValue ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[color:var(--color-card)]'
                }`}>
                   <div className="flex items-center gap-2 mb-1">
                      <Coins className={`w-3 h-3 ${analysis.valueAnalysis?.isValue ? 'text-emerald-400' : 'text-zinc-500'}`} />
                      <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${
                         analysis.valueAnalysis?.isValue ? 'text-emerald-400' : 'text-zinc-500'
                      }`}>EV Edge</span>
                   </div>
                   <div className="flex items-baseline gap-1">
                      <span className="text-lg sm:text-xl font-black text-white">{(analysis.valueAnalysis?.ev || 0).toFixed(2)}</span>
                      <span className="text-[8px] text-zinc-600 font-bold">ALPHA</span>
                   </div>
                   {analysis.valueAnalysis?.isValue && (
                      <div className="text-[7px] font-black bg-emerald-500 text-black px-1 py-0.5 rounded uppercase mt-1 w-fit animate-pulse">
                         Value Detected
                      </div>
                   )}
                </div>
              </div>

              {/* Intelligence Recon Layer (Search Data) */}
              {analysis.realData && (
                <section className="technical-border bg-[color:var(--color-card)] rounded p-4 border-emerald-500/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                       <Database className="w-4 h-4 text-emerald-400" />
                       <h4 className="text-[11px] font-black uppercase tracking-widest">Intelligence Recon Layer</h4>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[8px] text-emerald-400 font-bold uppercase">Live Grounded Data</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-[8px] text-zinc-500 uppercase font-black mb-1 block">Contextual Environment</label>
                        <div className="text-[10px] text-white flex items-center gap-2">
                          <span className="text-emerald-400 font-bold uppercase">{analysis.realData.league || 'Global'}</span>
                          <span className="text-zinc-600">•</span>
                          <span className="text-zinc-400">{analysis.realData.matchTime || 'Upcoming'}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[8px] text-zinc-500 uppercase font-black mb-1 block">Head-to-Head Vector</label>
                        <p className="text-[10px] text-zinc-300 leading-normal">{analysis.realData.h2h || 'Neutral trajectory detected.'}</p>
                      </div>
                    </div>
                    <div className="space-y-3 border-x border-white/5 px-4">
                      <div>
                        <label className="text-[8px] text-zinc-500 uppercase font-black mb-1 block">Squad Health & Intel</label>
                        <p className="text-[10px] text-zinc-300 leading-normal">{analysis.realData.injuries || 'Standard availability index.'}</p>
                      </div>
                      <div>
                        <label className="text-[8px] text-zinc-500 uppercase font-black mb-1 block">Market Calibration</label>
                        <p className="text-[10px] text-emerald-400/80 font-mono">{analysis.realData.currentOdds || 'Syncing live odds...'}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                       <div className="bg-white/[0.02] p-3 rounded border border-white/5">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[9px] font-bold text-white uppercase tracking-tighter">Goal Environment Verdict</span>
                            <Info className="w-3 h-3 text-zinc-600" />
                          </div>
                          <p className="text-[10px] text-emerald-400 font-medium leading-normal italic">
                            “{analysis.realData.goalVerdict || 'Trend analysis stable. Nominal goal expectancy.'}”
                          </p>
                       </div>
                       <div className="bg-white/[0.02] p-3 rounded border border-white/5">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[9px] font-bold text-white uppercase tracking-tighter">Form Flux</span>
                          </div>
                          <div className="space-y-2">
                             <div>
                               <div className="flex justify-between text-[8px] text-zinc-500 uppercase mb-1">
                                 <span>{analysis.realData.homeForm ? 'Home Sequence' : 'Home'}</span>
                               </div>
                               <p className="text-[9px] text-white font-medium line-clamp-1">{analysis.realData.homeForm || 'Stabilized'}</p>
                             </div>
                             <div>
                               <div className="flex justify-between text-[8px] text-zinc-500 uppercase mb-1">
                                 <span>{analysis.realData.awayForm ? 'Away Sequence' : 'Away'}</span>
                               </div>
                               <p className="text-[9px] text-white font-medium line-clamp-1">{analysis.realData.awayForm || 'Stabilized'}</p>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Analysis Steps Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Step 1 & 2: League & Team */}
                <div className="space-y-4">
                  <section className="technical-border bg-[color:var(--color-header)] rounded p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-[11px] font-bold uppercase tracking-widest">Structural Analysis</h4>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[9px] text-zinc-600 uppercase font-bold block mb-1">League Environment</label>
                        <p className="text-[11px] text-zinc-400 leading-relaxed italic border-l border-emerald-500/30 pl-3">
                          {LEAGUE_STABILITY_EXPLANATIONS[analysis.leagueStability.tier]}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/[0.02] p-2 rounded">
                          <label className="text-[8px] text-zinc-500 uppercase block mb-1">Reliability Index</label>
                          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden mt-1">
                            <div className="h-full bg-emerald-500" style={{ width: `${analysis.teamStrength.reliability * 10}%` }}></div>
                          </div>
                        </div>
                        <div className="bg-white/[0.02] p-2 rounded">
                          <label className="text-[8px] text-zinc-500 uppercase block mb-1">Momentum</label>
                          <span className="text-[9px] text-white font-medium">{analysis.teamStrength.momentum}</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="technical-border bg-[color:var(--color-header)] rounded p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-[11px] font-bold uppercase tracking-widest">Goal Environment</h4>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2">
                      <div className="text-center">
                        <div className="text-xl font-bold mono-value">{analysis.goalEnvironment.avgGoals.toFixed(1)}</div>
                        <div className="text-[8px] text-zinc-600 uppercase">Avg Goals</div>
                      </div>
                      <div className="text-center border-x border-white/5">
                        <div className="text-xl font-bold mono-value">{Math.round(analysis.goalEnvironment.bttsHitRate * 100)}%</div>
                        <div className="text-[8px] text-zinc-600 uppercase">BTTS Hit</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold mono-value">{Math.round(analysis.goalEnvironment.over15Rate * 100)}%</div>
                        <div className="text-[8px] text-zinc-600 uppercase">O1.5 Prob.</div>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Step 5 & 6: Trap & Transformation */}
                <div className="space-y-4">
                  <section className={`technical-border rounded p-4 ${analysis.oddsTrap.isTrap ? 'bg-amber-500/5 border-amber-500/20' : 'bg-[color:var(--color-header)]'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className={`w-4 h-4 ${analysis.oddsTrap.isTrap ? 'text-amber-500' : 'text-zinc-600'}`} />
                      <h4 className="text-[11px] font-bold uppercase tracking-widest">Odds Trap Detection</h4>
                    </div>
                    {analysis.oddsTrap.isTrap ? (
                      <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded">
                        <p className="text-[10px] text-amber-200 leading-normal">{analysis.oddsTrap.reason}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-emerald-400/50">
                        <ChevronRight className="w-3 h-3" />
                        <span className="text-[10px] uppercase font-bold tracking-tighter">No malicious patterns detected</span>
                      </div>
                    )}
                  </section>

                  <section className="technical-border bg-[color:var(--color-header)] rounded p-4 relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-3">
                      <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-[11px] font-bold uppercase tracking-widest">Market Transformation</h4>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-2 relative z-10">
                      <div className="flex-1 bg-white/5 p-3 rounded border border-white/5">
                        <div className="text-[8px] text-zinc-500 uppercase mb-1">Risky Market</div>
                        <div className="text-[11px] font-bold text-zinc-400 line-through uppercase">{analysis.transformation.originalMarket}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-700" />
                      <div className="flex-1 bg-emerald-500/10 p-3 rounded border border-emerald-500/20">
                        <div className="text-[8px] text-emerald-400 uppercase mb-1">Suggested Market</div>
                        <div className="text-[11px] font-black text-white uppercase">{analysis.transformation.suggestedMarket}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-700" />
                      <div className="flex-1 bg-white/5 p-3 rounded border border-white/5 border-dashed">
                        <div className="text-[8px] text-zinc-500 uppercase mb-1">Safer Alternative</div>
                        <div className="text-[11px] font-bold text-emerald-500/70 uppercase">{analysis.transformation.alternativeMarket}</div>
                      </div>
                    </div>

                    <div className="mt-2 bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-sm flex items-center justify-between">
                      <div>
                        <div className="text-[8px] text-emerald-400 font-black uppercase mb-1">Ultra-Safe Backup Combo</div>
                        <div className="text-xs font-black text-white uppercase tracking-wider">{analysis.transformation.backupCombo}</div>
                      </div>
                      <Shield className="w-5 h-5 text-emerald-400/30" />
                    </div>

                    <div className="mt-3 p-2 bg-white/5 rounded">
                      <p className="text-[10px] text-zinc-400 italic">“{analysis.transformation.reasoning}”</p>
                    </div>
                  </section>
                </div>
              </div>

              {/* Step 8: AI Reasoning */}
              <section className="technical-border bg-zinc-900 rounded p-5 relative">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Target className="w-24 h-24" />
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <h4 className="text-xs font-black uppercase tracking-[0.2em]">AI Intelligence Digest</h4>
                </div>
                <div className="space-y-4 relative z-10">
                  <p className="text-sm text-zinc-300 leading-relaxed font-medium font-mono">
                    {analysis.aiReasoning}
                  </p>
                  <div className="flex flex-wrap gap-4 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-zinc-500 uppercase font-bold">Safety Score:</span>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`w-3 h-1 rounded-sm ${i < (analysis.confidence.score / 2) ? 'bg-emerald-500' : 'bg-zinc-800'}`}></div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-zinc-500 uppercase font-bold">Risk Level:</span>
                      <span className={`text-[9px] font-bold uppercase ${analysis.confidence.category === 'Avoid' ? 'text-red-400' : 'text-emerald-400'}`}>
                        {analysis.confidence.category}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Action */}
              <div className="flex gap-3">
                <button 
                  onClick={handleAddToSlip}
                  disabled={analysis.elimination?.isEliminated}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black py-4 rounded text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                >
                  Add to Slip Buffer
                </button>
                <button 
                  onClick={handleArchive}
                  disabled={isArchiving}
                  className="px-6 border border-white/10 hover:border-emerald-500/50 text-white font-bold text-[10px] uppercase tracking-widest transition-all rounded flex items-center gap-2 hover:bg-emerald-500/5"
                >
                  {isArchiving ? <Loader2 className="w-3 h-3 animate-spin"/> : <Save className="w-3.5 h-3.5 text-emerald-400" />}
                  Archive Result
                </button>
                <button className="px-6 border border-white/10 hover:border-white/25 text-white font-bold text-[10px] uppercase tracking-widest transition-colors rounded hidden md:block">
                  PDF Report
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
