import axios from 'axios';

const API_KEY = import.meta.env.VITE_THE_ODDS_API_KEY;
const BASE_URL = 'https://api.the-odds-api.com/v4/sports';

export interface OddsMatch {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: {
    key: string;
    title: string;
    last_update: string;
    markets: {
      key: string;
      last_update: string;
      outcomes: {
        name: string;
        price: number;
      }[];
    }[];
  }[];
}

export const fetchUpcomingOdds = async (sport = 'soccer_epl', regions = 'uk', markets = 'h2h'): Promise<OddsMatch[]> => {
  if (!API_KEY) {
    console.warn('VITE_THE_ODDS_API_KEY is not set. Real-time odds will not be available.');
    return [];
  }

  try {
    const response = await axios.get(`${BASE_URL}/${sport}/odds`, {
      params: {
        apiKey: API_KEY,
        regions,
        markets,
        oddsFormat: 'decimal',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching odds:', error);
    return [];
  }
};

export const getSports = async () => {
  if (!API_KEY) return [];
  try {
    const response = await axios.get(`${BASE_URL}`, {
      params: {
        apiKey: API_KEY,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching sports:', error);
    return [];
  }
};
