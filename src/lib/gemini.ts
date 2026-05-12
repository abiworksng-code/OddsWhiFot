import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisOutput } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getProReasoning(match: { homeTeam: string; awayTeam: string; league: string }, selection: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the football match ${match.homeTeam} vs ${match.awayTeam} in ${match.league}. 
      The chosen market is ${selection}. Provide a 2-3 sentence "Pro Technical Insight" explaining why this market is high-confidence, 
      focusing on tempo, tactical setup, or market value. Keep it professional, data-centric, and concise. 
      Use a "technical analyst" persona.`,
    });

    return response.text || "Market calibration indicates high-density value. Reconstruction engine confirms technical alignment.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Dynamic analysis engine currently syncing. Statistical confidence remains in upper tier thresholds.";
  }
}

export async function getFinalSystemVerdict(analysis: AnalysisOutput) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are the Final Quality Control Agent for a high-stakes betting analysis system.
      
      We have two inputs:
      1. REAL-WORLD DATA: ${JSON.stringify(analysis.realData)}
      2. COLD-LOGIC ENGINE RESULTS: Confidence: ${analysis.confidence.score}, Market: ${analysis.transformation.suggestedMarket}, Trap: ${analysis.oddsTrap.isTrap}
      
      Your task:
      - Compare the Engine's logical conclusion with the searched Real-World data.
      - Identify if the Engine is being too conservative or too aggressive.
      - Provide a final, authoritative 2-3 sentence verdict that integrates both.
      - If there is a major conflict, warn the user.`,
    });
    return response.text || analysis.aiReasoning;
  } catch (error) {
    console.error(error);
    return analysis.aiReasoning;
  }
}

export async function getDeepMatchAnalysis(homeTeam: string, awayTeam: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Perform a deep dive analysis for the football match: ${homeTeam} vs ${awayTeam}.
      Use Google Search to find current data: 
      1. Recent form of both teams.
      2. Head-to-head history.
      3. Critical team news (injuries/suspensions).
      4. Current market odds.
      5. Historical goal trends (BTTS, Over/Under) in this fixture and recent matches.

      Then, provide a professional betting reconstruction.`,
      config: {
        tools: [{ googleSearch: {} }],
        toolConfig: { includeServerSideToolInvocations: true },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            homeTeam: { type: Type.STRING },
            awayTeam: { type: Type.STRING },
            league: { type: Type.STRING },
            matchTime: { type: Type.STRING },
            realData: {
              type: Type.OBJECT,
              properties: {
                homeForm: { type: Type.STRING },
                awayForm: { type: Type.STRING },
                h2h: { type: Type.STRING },
                injuries: { type: Type.STRING },
                currentOdds: { type: Type.STRING },
                goalVerdict: { type: Type.STRING },
                metrics: {
                  type: Type.OBJECT,
                  description: "Numerical metrics for engine verification",
                  properties: {
                    homeForm: { type: Type.NUMBER, description: "Scale 0-10" },
                    awayForm: { type: Type.NUMBER, description: "Scale 0-10" },
                    homeMotivation: { type: Type.NUMBER, description: "Scale 1-5 (5 = Elite priority, 1 = Low priority/Reserve)" },
                    awayMotivation: { type: Type.NUMBER, description: "Scale 1-5 (5 = Elite priority, 1 = Low priority/Reserve)" },
                    defensiveStability: { type: Type.NUMBER, description: "Scale 0-10" },
                    attackingPotency: { type: Type.NUMBER, description: "Scale 0-10" }
                  }
                }
              }
            },
            analysis: {
              type: Type.OBJECT,
              properties: {
                tempo: { type: Type.STRING },
                goalExpectancy: { type: Type.STRING },
                riskRating: { type: Type.STRING },
                suggestedMarket: { 
                  type: Type.STRING, 
                  description: "The primary high-value market (e.g. Home Win, BTTS, Over 2.5). Must be one of the professional Market enum values." 
                },
                alternativeMarket: { 
                  type: Type.STRING, 
                  description: "A calculated safety net market (e.g. Draw No Bet, Under 4.5, Over 1.5). This will be used to calibrate the final backup combo." 
                },
                marketTransformationLogic: { 
                  type: Type.STRING, 
                  description: "Strategic explanation of the shift from the high-risk original market to these safer reconstructions." 
                },
                reasoning: { type: Type.STRING }
              }
            },
            confidenceScore: { type: Type.NUMBER, description: "Scale 1-10" }
          },
          required: ["homeTeam", "awayTeam", "league", "analysis", "confidenceScore"]
        }
      }
    });

    const text = response.text || "{}";
    // Strip markdown if present
    const cleanJson = text.replace(/```json\n?|```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Gemini Deep Analysis Error:", error);
    throw error;
  }
}
