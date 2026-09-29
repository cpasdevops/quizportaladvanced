import { Question } from '../types/quiz';

export interface ParsedQuestionDraft {
  questionText: string;
  options: [string, string, string, string];
  correctOption: number;
  explanation: string;
}

/**
 * Parses raw text, CSV, or JSON into questions
 */
export function parseQuestionsFromFileContent(
  content: string,
  topicId: string
): { questions: Question[]; errors: string[] } {
  const errors: string[] = [];
  const trimmed = content.trim();

  // 1. Try parsing as JSON
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const result: Question[] = [];
        parsed.forEach((item, index) => {
          const qText = item.questionText || item.question || item.title;
          const rawOpts = item.options || [
            item.optionA || item.option1 || item.a,
            item.optionB || item.option2 || item.b,
            item.optionC || item.option3 || item.c,
            item.optionD || item.option4 || item.d,
          ];

          if (!qText || !Array.isArray(rawOpts) || rawOpts.length < 4) {
            errors.push(`Row ${index + 1}: Missing question text or 4 options.`);
            return;
          }

          let corr = 0;
          if (typeof item.correctOption === 'number') corr = item.correctOption;
          else if (typeof item.answer === 'number') corr = item.answer;
          else if (typeof item.correct === 'string') {
            const letter = item.correct.trim().toUpperCase();
            if (letter === 'A' || letter === '1') corr = 0;
            else if (letter === 'B' || letter === '2') corr = 1;
            else if (letter === 'C' || letter === '3') corr = 2;
            else if (letter === 'D' || letter === '4') corr = 3;
          }

          result.push({
            id: `upload-${topicId}-${Date.now()}-${index + 1}`,
            topicId,
            questionText: String(qText).trim(),
            options: [
              String(rawOpts[0] || '').trim(),
              String(rawOpts[1] || '').trim(),
              String(rawOpts[2] || '').trim(),
              String(rawOpts[3] || '').trim(),
            ],
            correctOption: corr >= 0 && corr <= 3 ? corr : 0,
            explanation: String(item.explanation || 'Verified question.').trim(),
            approved: true,
            createdAt: new Date().toISOString(),
          });
        });

        if (result.length > 0) {
          return { questions: result, errors };
        }
      }
    } catch (e: any) {
      errors.push(`JSON parsing notice: ${e.message}`);
    }
  }

  // 2. Try parsing as CSV
  if (content.includes(',') || content.includes(';')) {
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length > 1) {
      const result: Question[] = [];
      const delimiter = lines[0].includes(';') ? ';' : ',';

      // Check if line 0 is a header
      const firstLineLower = lines[0].toLowerCase();
      const startIndex =
        firstLineLower.includes('question') || firstLineLower.includes('option') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        // Split with basic quotes handling
        const parts = line.split(delimiter).map((p) => p.replace(/^["']|["']$/g, '').trim());

        if (parts.length >= 5) {
          const qText = parts[0];
          const optA = parts[1] || 'Option A';
          const optB = parts[2] || 'Option B';
          const optC = parts[3] || 'Option C';
          const optD = parts[4] || 'Option D';
          let corr = 0;

          if (parts[5]) {
            const rawCorr = parts[5].toUpperCase();
            if (rawCorr === 'A' || rawCorr === '1' || rawCorr === '0') corr = 0;
            else if (rawCorr === 'B' || rawCorr === '2') corr = 1;
            else if (rawCorr === 'C' || rawCorr === '3') corr = 2;
            else if (rawCorr === 'D' || rawCorr === '4') corr = 3;
            else {
              const num = parseInt(rawCorr, 10);
              if (!isNaN(num) && num >= 0 && num <= 3) corr = num;
            }
          }

          const explanation = parts[6] || 'Uploaded question.';

          if (qText && optA && optB) {
            result.push({
              id: `csv-${topicId}-${Date.now()}-${i}`,
              topicId,
              questionText: qText,
              options: [optA, optB, optC, optD],
              correctOption: corr,
              explanation,
              approved: true,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }

      if (result.length > 0) {
        return { questions: result, errors };
      }
    }
  }

  // 3. Fallback: Parse Plain Text / Standard Q&A Blocks
  // e.g.:
  // Q: What is X?
  // A) ...
  // B) ...
  // C) ...
  // D) ...
  // Correct: B
  const blocks = content.split(/\n\s*\n/).map((b) => b.trim()).filter((b) => b.length > 15);
  const textQuestions: Question[] = [];

  blocks.forEach((block, idx) => {
    const lines = block.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    let qText = '';
    const opts: string[] = [];
    let correct = 0;
    let explanation = '';

    for (const line of lines) {
      if (/^(Q|Question|\d+[\.\)])/i.test(line) && !qText) {
        qText = line.replace(/^(Q\s*:?|Question\s*\d*:?|\d+[\.\)])\s*/i, '').trim();
      } else if (/^[A-D][\.\)]/i.test(line)) {
        opts.push(line.replace(/^[A-D][\.\)]\s*/i, '').trim());
      } else if (/^(Answer|Correct|Correct Answer)\s*:/i.test(line)) {
        const val = line.replace(/^(Answer|Correct|Correct Answer)\s*:\s*/i, '').trim().toUpperCase();
        if (val.startsWith('A') || val === '0') correct = 0;
        else if (val.startsWith('B') || val === '1') correct = 1;
        else if (val.startsWith('C') || val === '2') correct = 2;
        else if (val.startsWith('D') || val === '3') correct = 3;
      } else if (/^(Explanation|Why)\s*:/i.test(line)) {
        explanation = line.replace(/^(Explanation|Why)\s*:\s*/i, '').trim();
      } else if (!qText) {
        qText = line;
      }
    }

    if (qText && opts.length >= 4) {
      textQuestions.push({
        id: `text-${topicId}-${Date.now()}-${idx + 1}`,
        topicId,
        questionText: qText,
        options: [opts[0], opts[1], opts[2], opts[3]],
        correctOption: correct,
        explanation: explanation || 'Imported from text format.',
        approved: true,
        createdAt: new Date().toISOString(),
      });
    }
  });

  if (textQuestions.length > 0) {
    return { questions: textQuestions, errors };
  }

  errors.push('Could not parse questions. Please check the file format or use the sample template.');
  return { questions: [], errors };
}

/**
 * Downloads a sample CSV template for admins
 */
export function downloadSampleCsvTemplate() {
  const sample = `questionText,optionA,optionB,optionC,optionD,correctOption,explanation
"What does ethical data storytelling require when designing bar and column charts?","Baseline axis starting at zero to prevent exaggerated visual distortion","Arbitrary color accents on every single bar","Hiding outlier values from viewers","Omitting all category labels",0,"Starting the y-axis at zero avoids misleading exaggerations in bar heights."
"In predictive analytics using Generative AI, what is a necessary practice?","Explicitly documenting uncertainty bounds and confidence levels","Claiming 100% predictive accuracy","Skipping all validation test splits","Using unverified public scrapings without licensing",0,"Predictive algorithms inherently carry uncertainty and require clear bounds."
"Which metric is critical when evaluating algorithmic fairness across demographic groups?","Equalized odds and demographic parity across sensitive features","Only raw overall accuracy","System execution throughput speed","Total memory usage",0,"Fairness auditing requires inspecting performance across demographic cohorts."`;

  const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample_questions_template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Downloads a sample JSON template for admins
 */
export function downloadSampleJsonTemplate() {
  const sample = [
    {
      questionText: "What does ethical data storytelling require when designing bar charts?",
      options: [
        "Baseline axis starting at zero to prevent visual distortion",
        "Arbitrary color accents on every single bar",
        "Hiding outlier values from viewers",
        "Omitting all category labels"
      ],
      correctOption: 0,
      explanation: "Starting the y-axis at zero avoids misleading exaggerations."
    },
    {
      questionText: "In predictive analytics using Gen AI, what is a fundamental practice?",
      options: [
        "Explicitly communicating confidence margins and uncertainty",
        "Asserting 100% certainty across all scenarios",
        "Skipping all test evaluations",
        "Deleting historical validation records"
      ],
      correctOption: 0,
      explanation: "Responsible forecasting communicates explicit uncertainty bounds."
    }
  ];

  const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample_questions_template.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
