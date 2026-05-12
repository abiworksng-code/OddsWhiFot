// bettingAnalysisEngine.ts
// This module contains the core analysis engine logic

import { 
  MatchData, 
  AnalysisOutput, 
  LeagueTier, 
  MatchTempo, 
  Market,
} from '../types';

export interface ValidationError {
  field: string;
  message: string;
}

export function validateMatchData(data: MatchData): ValidationError[] {
  const errors: ValidationError[] = [];

  // Team names
  if (!data.homeTeam || !data.homeTeam.trim()) errors.push({ field: 'homeTeam', message: 'Home team identity is missing.' });
  if (!data.awayTeam || !data.awayTeam.trim()) errors.push({ field: 'awayTeam', message: 'Away team identity is missing.' });

  // Odds validation
  if (!data.originalOdds || typeof data.originalOdds.home !== 'number' || isNaN(data.originalOdds.home) || data.originalOdds.home <= 1.0) {
    errors.push({ field: 'odds.home', message: 'Home odds must be a valid number greater than 1.0.' });
  }
  if (!data.originalOdds || typeof data.originalOdds.draw !== 'number' || isNaN(data.originalOdds.draw) || data.originalOdds.draw <= 1.0) {
    errors.push({ field: 'odds.draw', message: 'Draw odds must be a valid number greater than 1.0.' });
  }
  if (!data.originalOdds || typeof data.originalOdds.away !== 'number' || isNaN(data.originalOdds.away) || data.originalOdds.away <= 1.0) {
    errors.push({ field: 'odds.away', message: 'Away odds must be a valid number greater than 1.0.' });
  }

  // Stats validation (ranges based on engine logic)
  const validateRange = (val: number, min: number, max: number, field: string, name: string) => {
    if (typeof val !== 'number' || isNaN(val) || val < min || val > max) {
      errors.push({ field, message: `${name} must be between ${min} and ${max}.` });
    }
  };

  validateRange(data.homeStats.homeForm, 0, 10, 'homeStats.homeForm', 'Home form coefficient');
  validateRange(data.awayStats.awayForm, 0, 10, 'awayStats.awayForm', 'Away form coefficient');
  validateRange(data.homeStats.motivation, 1, 5, 'homeStats.motivation', 'Motivation vector');
  validateRange(data.awayStats.motivation, 1, 5, 'awayStats.motivation', 'Motivation vector');

  return errors;
}

export function validateAnalysisOutput(output: AnalysisOutput): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (typeof output.confidence.score !== 'number' || isNaN(output.confidence.score) || output.confidence.score < 0 || output.confidence.score > 20) {
    errors.push({ field: 'confidence.score', message: 'Confidence calibration failed: score out of expected bounds.' });
  }
  
  if (!output.tempo.type) {
    errors.push({ field: 'tempo.type', message: 'Tempo identification failed.' });
  }

  if (!output.transformation.suggestedMarket) {
    errors.push({ field: 'market.selection', message: 'Failed to calculate optimal market transformation.' });
  }

  return errors;
}

export function analyzeMatch(match: MatchData): AnalysisOutput {
  // --- Step 1: League Stability ---
  let leagueScore = match.leagueTier === LeagueTier.TIER_A ? 10 : match.leagueTier === LeagueTier.TIER_B ? 7 : 4;
  let leagueWarning = match.leagueTier === LeagueTier.TIER_C ? 'Extreme volatility detected in league data.' : undefined;

  // --- Step 2: Team Strength ---
  const homeScore = (match.homeStats.homeForm * 0.4) + (match.homeStats.motivation * 0.2);
  const awayScore = (match.awayStats.awayForm * 0.4) + (match.awayStats.motivation * 0.2);
  
  const strongerTeam = Math.abs(homeScore - awayScore) > 1.5 
    ? (homeScore > awayScore ? 'home' : 'away') 
    : 'none';
  
  let reliability = Math.min((match.homeStats.cleanSheets + match.awayStats.cleanSheets) * 2, 10);

  // --- Step 3: Match Tempo ---
  const predictedGoals = (match.homeStats.goalsScored + match.awayStats.goalsScored + match.homeStats.goalsConceded + match.awayStats.goalsConceded) / 10;
  let tempoType = MatchTempo.BALANCED;
  if (predictedGoals > 3.0) tempoType = MatchTempo.OPEN;
  else if (predictedGoals < 2.0) tempoType = MatchTempo.DEFENSIVE;

  const tempoConfidence = 7 + (reliability / 5);

  // --- Step 4: Goal Environment ---
  const avgGoals = predictedGoals;
  const bttsHitRate = (match.homeStats.goalsScored > 0 && match.awayStats.goalsScored > 0) ? 0.65 : 0.45;
  const over15Rate = avgGoals > 1.5 ? 0.85 : 0.55;

  // --- Step 5: Odds Trap Detector ---
  const homeImpliedProb = 1 / match.originalOdds.home;
  const awayImpliedProb = 1 / match.originalOdds.away;
  
  // Detection logic: If bookie implies >60% chance but our data shows <40% reliability
  const isTrap = (homeImpliedProb > 0.6 && match.homeStats.homeForm < 5) || 
                 (awayImpliedProb > 0.6 && match.awayStats.awayForm < 5);
  const trapReason = isTrap ? 'Suspiciously low odds given current form volatility. Bookmaker bias detected.' : undefined;

  // --- Step 6: Market Transformation & Elimination ---
  let suggestedMarket: Market = Market.DRAW_NO_BET;
  let alternativeMarket: Market = Market.UNDER_4_5;
  let transformationReasoning = 'Standard market selection based on core metrics.';
  
  let isEliminated = false;
  let eliminationReason = '';
  let criticalFail = '';

  // --- ELITE PROBABILITY ENGINE (POISSON) ---
  const poisson = (k: number, lambda: number) => {
    const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));
    return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
  };

  const calculateProbabilities = (homeLambda: number, awayLambda: number) => {
    let over15 = 0;
    let over25 = 0;
    let btts = 0;
    let homeWin = 0;
    let awayWin = 0;
    let draw = 0;

    for (let h = 0; h <= 6; h++) {
      for (let hProb = poisson(h, homeLambda), a = 0; a <= 6; a++) {
        const prob = hProb * poisson(a, awayLambda);
        if (h + a > 1.5) over15 += prob;
        if (h + a > 2.5) over25 += prob;
        if (h > 0 && a > 0) btts += prob;
        if (h > a) homeWin += prob;
        else if (a > h) awayWin += prob;
        else draw += prob;
      }
    }
    return { over15, over25, btts, homeWin, awayWin, draw };
  };

  const { over15, over25, btts: bttsProb, homeWin, awayWin, draw } = calculateProbabilities(
    (match.homeStats.goalsScored + match.awayStats.goalsConceded) / 2,
    (match.awayStats.goalsScored + match.homeStats.goalsConceded) / 2
  );

  // --- Step 5.5: Value Analysis (Expected Value) ---
  const getMarketProb = (market: Market): number => {
    switch (market) {
      case Market.HOME_WIN: return homeWin;
      case Market.AWAY_WIN: return awayWin;
      case Market.DRAW_NO_BET: return homeWin / (homeWin + awayWin); // Simplified
      case Market.DOUBLE_CHANCE: return homeWin + draw; // 1X assumed
      case Market.BTTS: return bttsProb;
      case Market.OVER_1_5: return over15;
      case Market.OVER_2_5: return over25;
      case Market.UNDER_4_5: return 1 - over25; // Crude approx
      default: return 0.5;
    }
  };

  const getBookieOdds = (market: Market): number => {
    switch (market) {
      case Market.HOME_WIN: return match.originalOdds.home;
      case Market.AWAY_WIN: return match.originalOdds.away;
      case Market.DRAW_NO_BET: return (match.originalOdds.home + match.originalOdds.draw) / 2; // Est
      default: return 1.85; // Generic fallback
    }
  };

  // --- ELIMINATION SYSTEM ---
  // Rule 1: High Volatility Chaos (Tier C + Low Reliability)
  if (match.leagueTier === LeagueTier.TIER_C && reliability < 4.5) {
    isEliminated = true;
    eliminationReason = 'Extreme league volatility paired with critical lack of defensive stability makes projection statistically impossible.';
    criticalFail = 'CHAOTIC DATA ENVIRONMENT';
  } 
  // Rule 2: Market Manipulation / Trap Detection
  else if (isTrap && reliability < 3.5) {
    isEliminated = true;
    eliminationReason = 'Market price manipulation detected. Bookmakers are pricing a narrative that contradicts structural team metrics.';
    criticalFail = 'MARKET PRICE ANOMALY';
  }
  // Rule 3: Critical Statistical Absence (Form collapse)
  else if (match.homeStats.homeForm <= 1 && match.awayStats.awayForm <= 1) {
    isEliminated = true;
    eliminationReason = 'Mutual form collapse. Neither team maintains enough structural integrity for a high-confidence reconstruction.';
    criticalFail = 'TOTAL FORM DISSOLUTION';
  }
  // Rule 4: Motivation Parity in Low Stakes (Both low motivation)
  else if (match.homeStats.motivation <= 1 && match.awayStats.motivation <= 1) {
    isEliminated = true;
    eliminationReason = 'Motivation deficit on both sides. High probability of low-effort, random-outcome game state.';
    criticalFail = 'MOTIVATION DEFICIT';
  }

  // Base selection based on team strength or goals
  if (strongerTeam === 'home') suggestedMarket = Market.HOME_WIN;
  else if (strongerTeam === 'away') suggestedMarket = Market.AWAY_WIN;
  else if (predictedGoals > 2.5) suggestedMarket = Market.OVER_2_5;
  else suggestedMarket = Market.DRAW_NO_BET;

  // Base selection for alternative market
  if (over25 > 0.65) alternativeMarket = Market.OVER_2_5;
  else if (over15 > 0.85) alternativeMarket = Market.OVER_1_5;
  else if (over15 > 0.70) alternativeMarket = Market.OVER_1_5;

  // Confidence Boost based on Probability Anchoring
  if (alternativeMarket === Market.OVER_1_5 && over15 > 0.92) {
    reliability += 1.5;
  }
  if (bttsProb > 0.75) {
    suggestedMarket = Market.BTTS;
    reliability += 0.5;
  }

  // --- TRANSFORMATION RULES ---
  
  // Rule 1: Win Market + Trap Detected -> DNB or DC
  if (isTrap && (suggestedMarket === Market.HOME_WIN || suggestedMarket === Market.AWAY_WIN)) {
    const original = suggestedMarket;
    suggestedMarket = Market.DRAW_NO_BET;
    transformationReasoning = `Odds trap detected on ${original}. Downgrading to Draw No Bet for safety shielding.`;
    
    if (reliability < 5) {
      suggestedMarket = Market.DOUBLE_CHANCE;
      transformationReasoning = `Severe odds trap + low reliability on ${original}. Deep downgrade to Double Chance applied.`;
    }
  }

  // Rule 2: Goal Markets + Defensive Tempo Constraint
  if (tempoType === MatchTempo.DEFENSIVE) {
    if (suggestedMarket === Market.OVER_2_5) {
      suggestedMarket = Market.OVER_1_5;
      transformationReasoning += ' Defensive tempo identified; transforming Suggested Over 2.5 to Over 1.5 Goals.';
    }
    if (alternativeMarket === Market.OVER_2_5) {
      alternativeMarket = Market.OVER_1_5;
      transformationReasoning += ' Transforming Alternative Over 2.5 to Over 1.5 for defensive safety.';
    }
    // Force some under markets if very defensive
    if (reliability > 6 && alternativeMarket !== Market.OVER_1_5) {
      alternativeMarket = Market.UNDER_4_5;
    }
  }

  // Rule 3: High-Confidence Trap Pivot (If trap is detected but reliability is high, maybe it's an opportunity, otherwise safety)
  if (isTrap && reliability > 7 && suggestedMarket === Market.DRAW_NO_BET) {
     // If it's a trap but reliability is high, we stay with DNB rather than DC
     transformationReasoning += ' High reliability allows maintaining Draw No Bet despite trap signature.';
  }

  // Additional refinements based on tempo
  if (tempoType === MatchTempo.OPEN) {
    if (suggestedMarket !== Market.HOME_WIN && suggestedMarket !== Market.AWAY_WIN) {
      suggestedMarket = Market.OVER_1_5;
      transformationReasoning = 'High goals environment detected. Prioritizing over markets.';
    }
    if (reliability > 7 && alternativeMarket === Market.OVER_1_5) {
      alternativeMarket = Market.BTTS;
    }
  } else if (tempoType === MatchTempo.DEFENSIVE && !isEliminated) {
    if (suggestedMarket === Market.HOME_WIN) suggestedMarket = Market.DRAW_NO_BET;
    if (suggestedMarket === Market.AWAY_WIN) suggestedMarket = Market.DRAW_NO_BET;
    alternativeMarket = Market.UNDER_4_5;
  }

  // Final Transformation Polish
  if (isEliminated) {
    suggestedMarket = Market.NO_BET;
    alternativeMarket = Market.NO_BET;
  }

  // --- Step 7: Backup Combo Generation (High Security) ---
  const backupCombo = generateBackupCombo(suggestedMarket, alternativeMarket, strongerTeam, tempoType, { over15, over25, btts: bttsProb });

  // --- Step 8: Enhanced Confidence Scoring (Dynamic Weighted Logic) ---
  // Define dynamic weights based on data certainty
  const weights = {
    league: match.leagueTier === LeagueTier.TIER_A ? 0.30 : 0.20,
    reliability: reliability > 7 ? 0.30 : 0.25,
    tempo: tempoConfidence > 8 ? 0.20 : 0.15,
    motivation: 0.25
  };

  // Normalize weights to sum to 1.0 if they don't
  const totalWeight = weights.league + weights.reliability + weights.tempo + weights.motivation;
  const normalizedWeights = {
    league: weights.league / totalWeight,
    reliability: weights.reliability / totalWeight,
    tempo: weights.tempo / totalWeight,
    motivation: weights.motivation / totalWeight
  };

  let rawConfidence = (leagueScore * normalizedWeights.league) + 
                     (reliability * normalizedWeights.reliability) + 
                     (tempoConfidence * normalizedWeights.tempo) + 
                     (match.homeStats.motivation * normalizedWeights.motivation);

  // Dynamic Trap Penalty: Higher implied probability favorites get penalized more if they are traps
  if (isTrap) {
    const probabilityGap = Math.max(homeImpliedProb, awayImpliedProb) - 0.5;
    const trapPenalty = 1.0 + (probabilityGap * 2); // Scales with the "size" of the favorite
    rawConfidence = Math.max(0, rawConfidence - trapPenalty);
  }

  if (isEliminated) rawConfidence = 0;
  
  // High volatility penalty for Tier C leagues
  if (match.leagueTier === LeagueTier.TIER_C && rawConfidence > 5) {
    rawConfidence *= 0.8; 
  }
  
  let category: AnalysisOutput['confidence']['category'] = 'Risky';
  if (rawConfidence >= 8.5) category = 'Elite Safe';
  else if (rawConfidence >= 7.5) category = 'Strong Safe';
  else if (rawConfidence >= 6.5) category = 'Medium Safe';
  else if (rawConfidence < 4.5) category = 'Avoid';

  // --- Step 8.5: Value Logic Calculation ---
  const targetMarketForValue = suggestedMarket !== Market.NO_BET ? suggestedMarket : alternativeMarket;
  const sysProb = getMarketProb(targetMarketForValue);
  const bookieOdds = getBookieOdds(targetMarketForValue);
  const ev = (sysProb * bookieOdds) - 1;
  const isValue = ev > 0.05; // 5% edge threshold

  // --- Step 9: Final AI Reasoning ---
  const aiReasoning = isEliminated 
    ? `Match eliminated from reconstruction queue. ${eliminationReason}`
    : `Analysis complete. League stability at ${match.leagueTier} provides a strong ${leagueScore}/10 baseline. Recommending ${suggestedMarket} with a backup backup combo of ${backupCombo} for maximum safety. ${isValue ? 'ALPHA VALUE DETECTED: Engine confirms positive EV edge.' : 'STANDARD MARKET RECOVERY.'} Confidence rating: ${category}.`;

  return {
    matchId: match.id,
    leagueStability: {
      tier: match.leagueTier,
      score: leagueScore,
      warning: leagueWarning,
    },
    teamStrength: {
      strongerTeam: strongerTeam as 'home' | 'away' | 'none',
      reliability,
      momentum: 'Steady growth in defensive structure.',
    },
    tempo: {
      type: tempoType,
      confidence: tempoConfidence,
      explanation: `${tempoType} tempo matches historical xG flows for these opponents.`,
    },
    goalEnvironment: {
      avgGoals,
      bttsHitRate,
      over15Rate,
    },
    oddsTrap: {
      isTrap,
      reason: trapReason,
    },
    elimination: {
      isEliminated,
      reason: eliminationReason,
      criticalFail
    },
    transformation: {
      originalMarket: Market.HOME_WIN, // Simulated original
      suggestedMarket,
      alternativeMarket,
      backupCombo,
      reasoning: transformationReasoning,
    },
    confidence: {
      score: rawConfidence,
      category,
    },
    aiReasoning,
    probabilities: {
      over15,
      over25,
      btts: bttsProb
    },
    valueAnalysis: {
      market: targetMarketForValue,
      probability: sysProb,
      impliedOdds: 1 / sysProb,
      ev,
      isValue
    }
  };
}

export function generateBackupCombo(suggested: Market, alternative: Market, strongerTeam: string, tempo: MatchTempo, probs?: { over15: number, over25: number, btts: number }): string {
  if (suggested === Market.NO_BET) return 'N/A - System Shutdown';

  // 1. Intelligent Directional Mapping (The "Anchor")
  let direction = 'Double Chance (1X)';
  if (strongerTeam === 'away') {
    direction = 'Double Chance (X2)';
  } else if (strongerTeam === 'none') {
    if (suggested === Market.HOME_WIN || suggested === Market.DRAW_NO_BET) direction = 'Double Chance (1X)';
    else if (suggested === Market.AWAY_WIN) direction = 'Double Chance (X2)';
    else direction = 'Either Team Wins (12)';
  } else {
    // Suggested is already Home Win or similar
    direction = 'Double Chance (1X)';
  }

  // Refine direction based on market intensity
  if (suggested === Market.AWAY_WIN || suggested === Market.WIN_OVER_1_5 || suggested === Market.WIN_UNDER_4_5) {
    if (strongerTeam === 'away') direction = 'X2';
    else if (strongerTeam === 'home') direction = '1X';
  }

  // 2. Intelligent Goal Mapping (The "Buffer")
  let goalSafeNet = 'Under 4.5';
  
  const isOverMarket = alternative.toLowerCase().includes('over') || suggested.toLowerCase().includes('over');
  const isUnderMarket = alternative.toLowerCase().includes('under') || suggested.toLowerCase().includes('under');

  if (tempo === MatchTempo.OPEN || (probs && probs.over15 > 0.85)) {
    if (isOverMarket || (probs && probs.over25 > 0.6)) {
      if (alternative.includes('2.5') || (probs && probs.over25 > 0.75)) goalSafeNet = 'Over 1.5';
      else goalSafeNet = 'Over 0.5';
    } else {
      goalSafeNet = 'Over 1.5'; 
    }
  } else if (tempo === MatchTempo.DEFENSIVE || (probs && probs.over25 < 0.3)) {
    if (isUnderMarket) {
      if (alternative.includes('2.5')) goalSafeNet = 'Under 3.5';
      else goalSafeNet = 'Under 4.5';
    } else {
      goalSafeNet = 'Under 3.5';
    }
  } else {
    // Balanced Tempo
    if (isOverMarket) goalSafeNet = 'Over 1.5';
    else if (isUnderMarket) goalSafeNet = 'Under 4.5';
    else goalSafeNet = 'Under 4.5';
  }

  // 3. Synthesis Override: Market-Specific Combos
  if (suggested === Market.BTTS || (probs && probs.btts > 0.78)) {
    return `BTTS or Over 1.5`; 
  }

  if (suggested === Market.DOUBLE_CHANCE || suggested === Market.DRAW_NO_BET) {
    const side = suggested.includes('Home') || suggested.includes('1X') ? '1X' : 'X2';
    return `${side} & ${goalSafeNet}`;
  }

  // Final Professional Formatting
  const cleanDirection = direction.includes('1X') ? 'Home/Draw' : 
                        direction.includes('X2') ? 'Away/Draw' : 
                        direction.includes('12') ? '12 DC' : direction;

  return `${cleanDirection} & ${goalSafeNet} Goals`;
}
