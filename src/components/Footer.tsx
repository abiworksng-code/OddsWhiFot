import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { getArchivedAnalyses } from '../services/archiveService';
import { ArchivedAnalysis, SettlementOutcome } from '../types';
import { useAuth } from '../lib/AuthProvider';

export function Footer() {
  const { user } = useAuth();
  const [feed, setFeed] = useState<string[]>([]);

  useEffect(() => {
    const loadFeed = async () => {
      if (!user) {
        setFeed([
          "SYSTEM IDLE • WAITING FOR NEURAL LINK...",
          "MARKET VIGILANCE ACTIVE • ENCRYPTION: SHA-256",
          "ODDSWHIZ V4.12 • COLD STORAGE SYNC PENDING",
        ]);
        return;
      }
      
      const data = await getArchivedAnalyses();
      const liveItems = data
        .filter(a => a.outcome === SettlementOutcome.PENDING)
        .slice(0, 5)
        .map(a => `${a.match?.homeTeam} vs ${a.match?.awayTeam} • PREDICTION: ${a.transformation.backupCombo} • CONFIDENCE: ${a.confidence.score.toFixed(1)}/10`);
      
      if (liveItems.length > 0) {
        setFeed(liveItems);
      } else {
        setFeed([
          "NO ACTIVE RECON TARGETS • GLOBAL SEARCH ACTIVE",
          "SYSTEM OPTIMIZED • UPTIME: 99.9%",
          "NEURAL NETS COLD • WAITING FOR MATCH SELECTION",
        ]);
      }
    };

    loadFeed();
    const interval = setInterval(loadFeed, 30000); // Pulse every 30s
    return () => clearInterval(interval);
  }, [user]);

  return (
    <footer className="h-8 bg-black border-t border-white/5 flex items-center px-4 overflow-hidden relative">
      <div className="flex items-center gap-2 mr-6 bg-black z-10 pr-4">
        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
        <span className="text-[9px] font-black uppercase tracking-widest text-white">Live Engine Feed</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <motion.div 
          animate={{ x: [0, -1000] }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="flex gap-16 whitespace-nowrap text-[9px] text-zinc-500 font-mono uppercase"
        >
          {(feed.length > 0 ? feed.concat(feed) : []).map((item, i) => (
            <span key={i} className="flex items-center gap-2">
              <span className="text-zinc-700">•</span> {item}
            </span>
          ))}
        </motion.div>
      </div>
      <div className="bg-black z-10 pl-4 h-full flex items-center">
        <span className="text-[8px] font-bold text-emerald-400">STATUS: {feed.length > 3 ? 'TRACKING' : 'OPTIMIZED'}</span>
      </div>
    </footer>
  );
}

