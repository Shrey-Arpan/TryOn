import { GoogleGenAI, Type } from "@google/genai";
import { AIInsight } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getNoteInsights(content: string): Promise<AIInsight> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the following note content and provide insights in JSON format:
    "${content}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING, description: "A concise summary of the note." },
          category: { type: Type.STRING, description: "A suggested category (e.g., Work, Personal, Idea, Task)." },
          tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Relevant keywords." },
          suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Actionable suggestions or related thoughts." },
        },
        required: ["summary", "category", "tags", "suggestions"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}

export async function chatWithAI(message: string, context: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Context from user notes:
    ${context}
    
    User message: ${message}`,
    config: {
      systemInstruction: "You are Lumina, an intelligent assistant that helps users manage their knowledge. Use the provided context from their notes to answer questions accurately and insightfully.",
    },
  });

  return response.text || "I'm sorry, I couldn't process that.";
}
