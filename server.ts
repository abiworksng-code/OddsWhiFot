import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok"
    });
  });

  app.get("/api/odds/upcoming", async (req, res) => {
    try {
      const { sport = 'soccer_epl', regions = 'uk', markets = 'h2h' } = req.query;
      const apiKey = process.env.THE_ODDS_API_KEY || process.env.VITE_THE_ODDS_API_KEY;
      
      if (!apiKey) {
        return res.json([]);
      }

      const response = await axios.get(`https://api.the-odds-api.com/v4/sports/${sport}/odds`, {
        params: {
          apiKey,
          regions,
          markets,
          oddsFormat: 'decimal',
        },
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Odds API Error:", error);
      res.json([]);
    }
  });

  app.get("/api/odds/sports", async (req, res) => {
    try {
      const apiKey = process.env.THE_ODDS_API_KEY || process.env.VITE_THE_ODDS_API_KEY;
      if (!apiKey) return res.json([]);

      const response = await axios.get(`https://api.the-odds-api.com/v4/sports`, {
        params: { apiKey },
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Sports API Error:", error);
      res.json([]);
    }
  });

  // API 404 handler
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API route not found" });
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

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('SERVER ERROR:', err);
    res.status(500).json({ 
      error: "Internal Server Error", 
      details: err instanceof Error ? err.message : String(err) 
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
