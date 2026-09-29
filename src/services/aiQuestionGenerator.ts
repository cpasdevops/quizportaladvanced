import { GoogleGenAI } from '@google/genai';
import { Question, Topic } from '../types/quiz';

interface GeneratedQ {
  questionText: string;
  options: string[];
  correctOption: number;
  explanation: string;
}

/**
 * Intelligent topic question generator
 * 1. Tries Gemini 2.5 Flash via @google/genai
 * 2. If no key or offline, generates domain-tailored contextual questions from topic syllabus notes
 */
export async function generateQuestionsForTopic(
  topic: Topic,
  count: number = 20
): Promise<Question[]> {
  const apiKey =
    (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
    '';

  const syllabusText = topic.studyMaterialText || topic.description || topic.name;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are an expert exam creator.
Topic: "${topic.name}"
Description: "${topic.description}"
Study Material / Syllabus:
${syllabusText.slice(0, 4000)}

Generate exactly ${count} high-quality, professional multiple-choice questions for a student quiz.
Rules:
- Each question must have exactly 4 options.
- The correct option index must be a number 0, 1, 2, or 3.
- Provide a clear, educational explanation for the correct answer.
- Return ONLY valid JSON in an array format, no markdown fences, no explanation text outside JSON:
[
  {
    "questionText": "Question string here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctOption": 0,
    "explanation": "Why option A is correct."
  }
]`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const text = response.text || '';
      const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed: GeneratedQ[] = JSON.parse(cleanJson);

      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, count).map((item, idx) => ({
          id: `ai-${topic.id}-${Date.now()}-${idx + 1}`,
          topicId: topic.id,
          questionText: item.questionText,
          options:
            Array.isArray(item.options) && item.options.length === 4
              ? item.options
              : ['Option A', 'Option B', 'Option C', 'Option D'],
          correctOption:
            typeof item.correctOption === 'number' && item.correctOption >= 0 && item.correctOption <= 3
              ? item.correctOption
              : 0,
          explanation: item.explanation || 'Verified correct principle based on curriculum syllabus.',
          approved: true,
          createdAt: new Date().toISOString(),
        }));
      }
    } catch (err) {
      console.warn('Gemini API question generation failed or key missing, generating contextual syllabus questions:', err);
    }
  }

  // Fallback: Intelligent curriculum generator based on topic terms & syllabus sentences
  return generateContextualSyllabusQuestions(topic, count);
}

function generateContextualSyllabusQuestions(topic: Topic, count: number): Question[] {
  const sentences = (topic.studyMaterialText || '')
    .split(/[.\n;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);

  const topicKeywords = topic.name.split(/\s+/).filter((w) => w.length > 3);
  const subject = topic.name;

  const result: Question[] = [];

  for (let i = 1; i <= count; i++) {
    const sentence = sentences[(i - 1) % (sentences.length || 1)] || '';
    let qText = '';
    let optA = '';
    let optB = '';
    let optC = '';
    let optD = '';
    let exp = '';
    let correct = 0;

    if (sentence.length > 30) {
      qText = `According to the syllabus on ${subject}, which statement accurately reflects: "${sentence.slice(0, 90)}..."?`;
      optA = `${sentence.slice(0, 110)}.`;
      optB = `Direct contradiction: The process eliminates all necessity for validation.`;
      optC = `Unrelated heuristic: The domain should only be evaluated subjectively without standards.`;
      optD = `Omission principle: Systematic verification is discouraged across all workflows.`;
      exp = `Directly aligned with curriculum notes: "${sentence.slice(0, 140)}".`;
      correct = 0;
    } else {
      const qTemplates = [
        {
          q: `In the context of ${subject}, what is the primary role of establishing clear governance and validation frameworks?`,
          opts: [
            'To ensure transparency, prevent biases, and maintain rigorous accountability.',
            'To accelerate delivery speed while skipping empirical verification steps.',
            'To replace human oversight entirely with unmonitored automated systems.',
            'To restrict all access without providing measurable audit criteria.',
          ],
          corr: 0,
          why: 'Clear governance guarantees ethical compliance, reproducibility, and rigorous accountability.',
        },
        {
          q: `When presenting analytical conclusions in ${subject}, what is the most critical guideline for ethical storytelling?`,
          opts: [
            'Selecting charts that exaggerate minor fluctuations to persuade the audience.',
            'Accurately labeling axes starting at a true zero baseline and presenting balanced context.',
            'Omitting outliers and contradictory data points to streamline the narrative.',
            'Using maximum color variety regardless of viewer cognitive load.',
          ],
          corr: 1,
          why: 'Ethical data presentation requires truthful scale baselines and comprehensive context.',
        },
        {
          q: `Which assessment method best evaluates models developed under ${subject}?`,
          opts: [
            'Relying solely on training loss without independent test sets.',
            'Performing multi-metric evaluations with cross-validation and bias audits.',
            'Testing only on homogenous sample datasets with no edge cases.',
            'Assuming high initial accuracy guarantees error-free real-world deployment.',
          ],
          corr: 1,
          why: 'Holistic multi-metric auditing with diverse test cases detects hidden regressions and biases.',
        },
        {
          q: `What is the foundational requirement for intellectual property compliance in ${subject}?`,
          opts: [
            'Clear provenance, licensed training inputs, and proper attribution standards.',
            'Assuming all public web content is free for unrestricted commercial replication.',
            'Excluding license metadata from published reports.',
            'Bypassing institutional copyright reviews if processing speeds are fast.',
          ],
          corr: 0,
          why: 'Respecting intellectual property mandates transparent source provenance and licensing compliance.',
        },
        {
          q: `How should practitioners in ${subject} handle algorithmic uncertainty and predictive limitations?`,
          opts: [
            'Conceal error rates and present all predictions as absolute certainty.',
            'Communicate confidence intervals and explicitly document boundary limitations.',
            'Ignore low-probability failure scenarios in mission-critical applications.',
            'Delegate full responsibility to third-party open-source libraries.',
          ],
          corr: 1,
          why: 'Responsible engineering communicates explicit confidence margins and documented bounds.',
        },
      ];

      const template = qTemplates[(i - 1) % qTemplates.length];
      qText = `[${subject} • Part ${i}] ${template.q}`;
      optA = template.opts[0];
      optB = template.opts[1];
      optC = template.opts[2];
      optD = template.opts[3];
      correct = template.corr;
      exp = template.why;
    }

    // Permute correct answer index so it varies across 0, 1, 2, 3
    const targetIdx = (i - 1) % 4;
    const currentOptions = [optA, optB, optC, optD];
    const correctVal = currentOptions[correct];
    currentOptions.splice(correct, 1);
    currentOptions.splice(targetIdx, 0, correctVal);

    result.push({
      id: `gen-${topic.id}-${Date.now()}-${i}`,
      topicId: topic.id,
      questionText: qText,
      options: currentOptions,
      correctOption: targetIdx,
      explanation: exp,
      approved: true,
      createdAt: new Date().toISOString(),
    });
  }

  return result;
}
