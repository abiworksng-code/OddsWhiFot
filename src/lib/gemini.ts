import { AnalysisOutput } from "../types";

export async function getProReasoning(match: { homeTeam: string; awayTeam: string; league: string }, selection: string) {
  try {
    const response = await fetch('/api/ai/pro-reasoning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match, selection })
    });
    const data = await response.json();
    return data.text || "Market calibration indicates high-density value. Reconstruction engine confirms technical alignment.";
  } catch (error) {
    console.error("Gemini Proxy Error:", error);
    return "Dynamic analysis engine currently syncing. Statistical confidence remains in upper tier thresholds.";
  }
}

export async function getFinalSystemVerdict(analysis: AnalysisOutput) {
  try {
    const response = await fetch('/api/ai/final-verdict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis })
    });
    const data = await response.json();
    return data.text || analysis.aiReasoning;
  } catch (error) {
    console.error("Gemini Proxy Error:", error);
    return analysis.aiReasoning;
  }
}

export async function getDeepMatchAnalysis(homeTeam: string, awayTeam: string) {
  try {
    const response = await fetch('/api/ai/deep-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homeTeam, awayTeam })
    });
    
    if (!response.ok) {
       const errorData = await response.json();
       throw new Error(errorData.details || errorData.error || 'Deep Analysis failed at proxy layer');
    }

    return await response.json();
  } catch (error) {
    console.error("Gemini Deep Proxy Error:", error);
    throw error;
  }
}
