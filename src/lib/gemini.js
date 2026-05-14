export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export function geminiUrl(model = DEFAULT_GEMINI_MODEL, key = GEMINI_API_KEY) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
}
