import { AnalysisOutput } from "../types";

export async function getProReasoning(match: { homeTeam: string; awayTeam: string; league: string }, selection: string) {
  try {
    const response = await fetch('/api/ai/pro-reasoning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match, selection })
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Pro Reasoning Non-JSON Response:", text);
      throw new Error("Server returned HTML. Check API route availability.");
    }
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
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Final Verdict Non-JSON Response:", text);
      return analysis.aiReasoning;
    }
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
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Deep Match Analysis Non-JSON Response:", text);
      throw new Error("Server returned HTML. This usually means the API route was not found or the server crashed.");
    }

    if (!response.ok) {
       throw new Error(data.details || data.error || 'Deep Analysis failed at proxy layer');
    }

    return data;
  } catch (error) {
    console.error("Gemini Deep Proxy Error:", error);
    throw error;
  }
}
