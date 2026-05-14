// --- API Key Definition ---
// VITE_GEMINI_API_KEY env var (.env 파일 참조)
import { GEMINI_API_KEY as apiKey } from "../../../lib/gemini";

// Gemini API 호출 함수
export const callGeminiAPI = async (prompt, images = [], temperature = 0.4) => {
    try {
        const imageArray = Array.isArray(images) ? images : (images ? [images] : []);
        const parts = [{ text: prompt }];
        
        imageArray.forEach(img => {
            if(img) parts.push({ inlineData: { mimeType: "image/jpeg", data: img } });
        });

        const requestBody = {
            contents: [{ parts }],
            generationConfig: {
                temperature: temperature
            },
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        };
        
        // 모델명 (필요 시 'gemini-2.5-pro' 등으로 변경 가능)
        const modelVersion = "gemini-2.5-flash";

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelVersion}:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API call failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        
        // 응답 데이터 구조 안전하게 접근
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
            return data.candidates[0].content.parts[0].text;
        } else {
            console.warn("Unexpected API response structure:", data);
            return null;
        }

    } catch (error) {
        console.error("Gemini API Error:", error);
        return null;
    }
};