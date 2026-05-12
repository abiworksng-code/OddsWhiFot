import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
