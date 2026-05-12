import axios from 'axios';

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
  try {
    const response = await axios.get('/api/odds/upcoming', {
      params: { sport, regions, markets },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching odds:', error);
    return [];
  }
};

export const getSports = async () => {
  try {
    const response = await axios.get('/api/odds/sports');
    return response.data;
  } catch (error) {
    console.error('Error fetching sports:', error);
    return [];
  }
};
