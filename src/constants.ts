import { LeagueTier, MatchTempo } from './types';

export const LEAGUE_STABILITY_EXPLANATIONS: Record<LeagueTier, string> = {
  [LeagueTier.TIER_A]: 'Highly stable. High statistical predictability. Ideal for elite safe plays.',
  [LeagueTier.TIER_B]: 'Semi-stable. Moderate predictability. Requires caution on squad rotation.',
  [LeagueTier.TIER_C]: 'Volatile. Unpredictable youth or reserve leagues. High risk of outcome deviation.',
};

export const TEMPO_DEFINITIONS: Record<MatchTempo, string> = {
  [MatchTempo.OPEN]: 'Attacking football, weak defenses, high transition frequency. Ideal for Over goals.',
  [MatchTempo.BALANCED]: 'Tactical control, moderate scoring, structured gameplay. Favors structured wins.',
  [MatchTempo.DEFENSIVE]: 'Low scoring, cautious football, tight structure. Favors Under 4.5 or DNB.',
};

export const MOCK_MATCHES = [
  {
    id: 'm1',
    league: 'Premier League',
    leagueTier: LeagueTier.TIER_A,
    homeTeam: 'Arsenal',
    awayTeam: 'Brighton',
    homeStats: {
      lastFiveMatches: ['W', 'W', 'D', 'W', 'W'],
      homeForm: 9,
      awayForm: 7,
      goalsScored: 12,
      goalsConceded: 3,
      cleanSheets: 3,
      motivation: 5,
      injuries: [],
    },
    awayStats: {
      lastFiveMatches: ['D', 'L', 'W', 'L', 'D'],
      homeForm: 6,
      awayForm: 4,
      goalsScored: 5,
      goalsConceded: 8,
      cleanSheets: 1,
      motivation: 3,
      injuries: ['Top Scorer Out'],
    },
    originalOdds: { home: 1.45, draw: 4.2, away: 7.5 },
  },
];
