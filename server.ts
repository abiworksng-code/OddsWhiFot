import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/team-logo-wiki", async (req, res) => {
    const team = req.query.team;
    if (!team) return res.status(400).json({ error: "Missing team name" });
    
    try {
      // 1. Search for the Wikipedia page
      const searchResponse = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(String(team) + " football club")}&format=json`);
      const searchData = await searchResponse.json();
      
      if (!searchData.query?.search?.length) {
        return res.status(404).json({ error: "Team not found" });
      }
      
      const pageTitle = searchData.query.search[0].title;
      
      // 2. Fetch the page image
      const imageResponse = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=pageimages&pithumbsize=100&format=json`);
      const imageData = await imageResponse.json();
      
      const pages = imageData.query.pages;
      const pageId = Object.keys(pages)[0];
      const logoUrl = pages[pageId]?.thumbnail?.source;
      
      res.json({ logoUrl });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch logo" });
    }
  });

  app.get("/api/betting-odds", async (req, res) => {
    // In a real application, you would call a sports betting API here.
    // For this prototype, we return structured mock data.
    const odds = {
      homeWin: 1.85,
      draw: 3.50,
      awayWin: 4.20,
      over25: 1.75,
      under25: 2.10
    };
    res.json(odds);
  });

  app.post("/api/ai/pro-reasoning", express.json(), async (req, res) => {
    const { match, selection } = req.body;
    try {
      const prompt = `Analyze the football match ${match.homeTeam} vs ${match.awayTeam} in ${match.league}. 
      The chosen market is ${selection}. Provide a 2-3 sentence "Pro Technical Insight" explaining why this market is high-confidence, 
      focusing on tempo, tactical setup, or market value. Keep it professional, data-centric, and concise. 
      Use a "technical analyst" persona.`;

      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      
      res.json({ text: response.text });
    } catch (error) {
      console.error("AI reasoning error:", error);
      res.status(500).json({ error: "Failed to generate AI reasoning" });
    }
  });

  app.post("/api/ai/deep-analysis", express.json(), async (req, res) => {
    const { homeTeam, awayTeam } = req.body;
    try {
      const prompt = `Perform a deep dive analysis for the football match: ${homeTeam} vs ${awayTeam}.
      Use Google Search to find current data: 
      1. Recent form of both teams.
      2. Head-to-head history.
      3. Critical team news (injuries/suspensions).
      4. Current market odds.
      5. Historical goal trends (BTTS, Over/Under) in this fixture and recent matches.

      Then, provide a professional betting reconstruction. Return ONLY valid JSON matching this schema:
      {
        "homeTeam": "string",
        "awayTeam": "string",
        "league": "string",
        "matchTime": "string",
        "realData": {
          "homeForm": "string",
          "awayForm": "string",
          "h2h": "string",
          "injuries": "string",
          "currentOdds": "string",
          "goalVerdict": "string",
          "metrics": {
            "homeForm": number,
            "awayForm": number,
            "homeMotivation": number,
            "awayMotivation": number,
            "defensiveStability": number,
            "attackingPotency": number
          }
        },
        "analysis": {
          "tempo": "string",
          "goalExpectancy": "string",
          "riskRating": "string",
          "suggestedMarket": "string",
          "alternativeMarket": "string",
          "marketTransformationLogic": "string",
          "reasoning": "string"
        },
        "confidenceScore": number
      }`;

      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          tools: [{ googleSearch: {} }],
          toolConfig: { includeServerSideToolInvocations: true },
          responseMimeType: "application/json",
        }
      });
      
      const text = response.text || "{}";
      const cleanJson = text.replace(/```json\n?|```/g, "").trim();
      res.json(JSON.parse(cleanJson));
    } catch (error) {
      console.error("Deep Analysis Error:", error);
      res.status(500).json({ error: "Deep analysis failed", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/ai/final-verdict", express.json(), async (req, res) => {
    const { analysis } = req.body;
    try {
      const prompt = `You are the Final Quality Control Agent for a high-stakes betting analysis system.
      
      We have two inputs:
      1. REAL-WORLD DATA: ${JSON.stringify(analysis.realData)}
      2. COLD-LOGIC ENGINE RESULTS: Confidence: ${analysis.confidence.score}, Market: ${analysis.transformation.suggestedMarket}, Trap: ${analysis.oddsTrap.isTrap}
      
      Your task:
      - Compare the Engine's logical conclusion with the searched Real-World data.
      - Identify if the Engine is being too conservative or too aggressive.
      - Provide a final, authoritative 2-3 sentence verdict that integrates both.
      - If there is a major conflict, warn the user.`;

      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      
      res.json({ text: response.text });
    } catch (error) {
      console.error("Final verdict error:", error);
      res.status(500).json({ error: "Failed to generate final verdict" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
