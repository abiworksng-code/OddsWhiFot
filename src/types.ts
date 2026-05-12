export enum LeagueTier {
  TIER_A = 'Tier A',
  TIER_B = 'Tier B',
  TIER_C = 'Tier C',
}

export enum MatchTempo {
  OPEN = 'Open',
  BALANCED = 'Balanced',
  DEFENSIVE = 'Defensive',
}

export enum Market {
  HOME_WIN = 'Home Win',
  AWAY_WIN = 'Away Win',
  DRAW_NO_BET = 'Draw No Bet',
  DOUBLE_CHANCE = 'Double Chance',
  OVER_1_5 = 'Over 1.5 Goals',
  OVER_2_5 = 'Over 2.5 Goals',
  UNDER_2_5 = 'Under 2.5 Goals',
  UNDER_4_5 = 'Under 4.5 Goals',
  WIN_OVER_1_5 = 'Win + Over 1.5',
  WIN_UNDER_4_5 = 'Win + Under 4.5',
  BTTS = 'BTTS',
  NO_BET = 'NO BET',
}

export enum UserRole {
  FREE = 'free',
  PRO = 'pro',
  ADMIN = 'admin',
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  createdAt: any;
  lastLogin: any;
}

export interface TeamStats {
  lastFiveMatches: string[];
  homeForm: number; // 0-10
  awayForm: number; // 0-10
  goalsScored: number;
  goalsConceded: number;
  cleanSheets: number;
  motivation: number; // 1-5
  injuries: string[];
}

export interface MatchData {
  id: string;
  league: string;
  leagueTier: LeagueTier;
  homeTeam: string;
  awayTeam: string;
  homeStats: TeamStats;
  awayStats: TeamStats;
  originalOdds: {
    home: number;
    draw: number;
    away: number;
  };
}

export interface AnalysisOutput {
  matchId: string;
  leagueStability: {
    tier: LeagueTier;
    score: number;
    warning?: string;
  };
  teamStrength: {
    strongerTeam: 'home' | 'away' | 'none';
    reliability: number;
    momentum: string;
  };
  tempo: {
    type: MatchTempo;
    confidence: number;
    explanation: string;
  };
  goalEnvironment: {
    avgGoals: number;
    bttsHitRate: number;
    over15Rate: number;
  };
  oddsTrap: {
    isTrap: boolean;
    reason?: string;
  };
  transformation: {
    originalMarket: Market;
    suggestedMarket: Market;
    alternativeMarket: Market;
    backupCombo: string;
    reasoning: string;
  };
  confidence: {
    score: number; // 0-10
    category: 'Elite Safe' | 'Strong Safe' | 'Medium Safe' | 'Risky' | 'Avoid';
  };
  elimination?: {
    isEliminated: boolean;
    reason?: string;
    criticalFail?: string;
  };
  aiReasoning: string;
  realData?: {
    homeForm?: string;
    awayForm?: string;
    h2h?: string;
    injuries?: string;
    currentOdds?: string;
    league?: string;
    matchTime?: string;
    goalVerdict?: string;
    metrics?: {
      homeForm: number;
      awayForm: number;
      homeMotivation: number;
      awayMotivation: number;
      defensiveStability: number;
      attackingPotency: number;
    };
  };
  probabilities?: {
    over15: number;
    over25: number;
    btts: number;
  };
  valueAnalysis?: {
    market: Market;
    probability: number;
    impliedOdds: number;
    ev: number;
    isValue: boolean;
  };
}

export enum SettlementOutcome {
  PENDING = 'pending',
  WIN = 'win',
  LOSS = 'loss',
  VOID = 'void',
}

export interface ArchivedAnalysis extends AnalysisOutput {
  id: string;
  userId: string;
  archivedAt: any;
  outcome?: SettlementOutcome;
  finalScore?: string;
  settledAt?: any;
  match?: {
    homeTeam: string;
    awayTeam: string;
    league: string;
  };
}
