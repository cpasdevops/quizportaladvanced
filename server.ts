import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '10mb' }));

  // API endpoint for AI question generation with Gemini
  app.post('/api/generate-questions', async (req, res) => {
    try {
      const { topicName, topicDescription, studyMaterialText, count = 20 } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the server' });
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are an expert curriculum and exam creator.
Topic Name: "${topicName || 'General Knowledge'}"
Topic Description: "${topicDescription || ''}"
Study Material / Content:
${(studyMaterialText || '').slice(0, 12000)}

TASK:
Generate exactly ${count} completely UNIQUE, non-repetitive multiple-choice questions based on the topic and study material.

MANDATORY RULES:
1. Every single question MUST be unique. DO NOT repeat similar question structures, identical sentences, or identical concepts.
2. Even if the study material is short, extrapolate distinct sub-topics, real-world applications, contra-positive reasoning, definitions, edge cases, and industry standards related to the topic.
3. Each question must have exactly 4 plausible, distinct options.
4. "correctOption" must be a number index (0, 1, 2, or 3). Vary the correct index across questions.
5. Provide a thorough, educational explanation for why that option is correct.
6. Return ONLY valid JSON in the exact array format below:
[
  {
    "questionText": "Clear, standalone question text?",
    "options": ["Option 0", "Option 1", "Option 2", "Option 3"],
    "correctOption": 0,
    "explanation": "Clear explanation of the correct answer."
  }
]`;

      let text = '';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });
        text = response.text || '';
      } catch {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });
        text = response.text || '';
      }

      const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (Array.isArray(parsed) && parsed.length > 0) {
        return res.json({ questions: parsed });
      } else {
        return res.status(500).json({ error: 'Invalid response structure from Gemini' });
      }
    } catch (err: any) {
      console.error('Server Gemini generation error:', err);
      return res.status(500).json({ error: err.message || 'AI generation failed' });
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
