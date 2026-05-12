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

export async function getTeamLogo(team: string): Promise<string | null> {
  try {
    const searchResponse = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(team + " football club")}&format=json&origin=*`);
    const searchData = await searchResponse.json();
    if (!searchData.query?.search?.length) return null;
    const pageTitle = searchData.query.search[0].title;
    const imageResponse = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=pageimages&pithumbsize=100&format=json&origin=*`);
    const imageData = await imageResponse.json();
    const pages = imageData.query.pages;
    const pageId = Object.keys(pages)[0];
    return pages[pageId]?.thumbnail?.source || null;
  } catch (error) {
    console.error("Wikipedia Logo Fetch Error:", error);
    return null;
  }
}

export const fetchUpcomingOdds = async (sport = 'soccer_epl', regions = 'uk', markets = 'h2h'): Promise<OddsMatch[]> => {
  if (!API_KEY) {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && !window.location.hostname.includes('run.app')) {
       console.error("CRITICAL: VITE_THE_ODDS_API_KEY is missing in production. Live odds will not be available.");
    } else {
       console.warn('VITE_THE_ODDS_API_KEY is not set. Returning mock hardware-aligned data.');
    }
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
