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
 * Downloads a sample CSV template with 20 completely unique questions
 */
export function downloadSampleCsvTemplate() {
  const sample = `Question,Option A,Option B,Option C,Option D,Correct Option,Explanation
"What fundamental attribute distinguishes categorical data from numerical data?","Does it identify a discrete category or quantify a numerical measurement?","Is the measurement positive or negative?","Was it collected recently or historically?","Does it require floating-point arithmetic?",0,"Categorical data assigns items into distinct classes or groups, whereas numerical data quantifies amounts or counts."
"Which of the following represents an ordinal categorical data type?","Customer satisfaction rating (Poor, Fair, Good, Excellent)","Blood type group (A, B, AB, O)","Telephone area code","Computer processor serial number",0,"Ordinal data has an explicit, natural ranking order among categories with non-uniform intervals."
"Which of the following is an example of continuous numerical data rather than discrete?","The ambient temperature of a laboratory server room over time","The total number of students logged into an exam session","The count of defect items in a shipment batch","The number of hospital beds available in a ward",0,"Continuous data can take on any real value along an unbroken scale, whereas counts are discrete integers."
"When constructing bar charts for categorical comparison, why must the baseline start at zero?","To prevent deceptive visual distortion of relative bar height ratios","To ensure bar charts fit within default printer margins","Because SVG vector graphics do not support non-zero origins","To force gridlines to be calculated as integers",0,"Truncating the baseline distorts proportional lengths, misleading readers about actual magnitude ratios."
"When should a horizontal bar chart be preferred over a vertical column chart?","When category labels are lengthy and would truncate or slant vertically","When tracking continuous price movements across 500 trading days","When illustrating proportions of a single whole under 4 parts","When displaying multi-dimensional 3D surfaces",0,"Horizontal bar charts allow long textual labels to be read naturally left-to-right without diagonal tilting."
"What is the primary analytical question addressed by descriptive analytics?","What specific events have historically occurred based on verified records?","What will happen in the next financial quarter with certainty?","What optimal decision algorithm should be executed next?","How can outlier data points be silently removed?",0,"Descriptive analytics summarizes historical and empirical data to characterize what has already occurred."
"In predictive analytics using Generative AI models, what essential accompaniment is required?","Clear communication of uncertainty bounds, error margins, and confidence intervals","An absolute guarantee that future predictions are 100% deterministic","The removal of all training baseline comparison sets","Omitting all documentation of model hyperparameter choices",0,"Predictive algorithms inherently produce probabilistic estimates that require clear uncertainty disclosure."
"How does prescriptive analytics differ from descriptive and predictive analytics?","It formulates and recommends specific actionable decisions to optimize outcomes","It only records past ledger entries without future forecasting","It focuses exclusively on plotting 2D static visual graphics","It removes human oversight from critical safety protocols",0,"Prescriptive analytics identifies the optimal course of action based on predictions and constraint objectives."
"Which visualization format is recommended for illustrating trend velocity and change over continuous time intervals?","A continuous line chart with chronological ordering on the horizontal axis","A 3D exploded pie chart with 20 slices","A radar spider chart with random categorical ordering","A horizontal stacked cylinder bar chart",0,"Line charts effectively communicate rate, continuity, and temporal trajectory across uninterrupted intervals."
"What is the primary risk of representational bias in generative machine learning models?","Training data underrepresents marginalized cohorts, producing skewed model behaviors","Processing units consume too much memory during backpropagation","Database tables contain too many normalized foreign keys","API responses return structured JSON instead of plain markdown",0,"When training sets lack balanced diversity, model inference reflects disparities and fails on minority groups."
"Why must pie charts generally be restricted to five or fewer slices?","Human visual perception struggles to accurately judge non-aligned angle and arc slices","Pie charts cannot support decimal percentage calculations","Web browsers cannot render circular SVG geometry efficiently","Hexadecimal color palettes do not support more than five hues",0,"Comparing multiple angular wedges without a common baseline is perceptually difficult and error-prone."
"In structured versus unstructured data architectures, which format represents unstructured data?","Medical clinical notes recorded in free-form physician dictation","A relational SQL table with predefined primary and foreign keys","A comma-separated spreadsheet with rigid typed columns","A database catalog index with integer keys",0,"Free-form natural language text lacks a standardized relational schema and represents unstructured data."
"What role does a tamper-evident audit log serve in examination and compliance platforms?","Provides an immutable chronological record of candidate interactions and submissions","Allows candidates to overwrite previous answers after grading completion","Reduces server database size by deleting previous test histories","Automatically marks incorrect answers as correct during network drops",0,"Audit logs guarantee transparency, accountability, and academic integrity by preserving timestamped activity."
"When presenting visual dashboards to non-technical executives, what is the best practice?","Lead with clear contextual narrative insights rather than raw unannotated numbers","Include as many decorative 3D textures and animations as possible","Display complex mathematical proofs on the summary slide","Remove all axis titles to give the interface a minimalist design",0,"Effective data storytelling translates complex analytics into clear, actionable executive insights."
"Which metric measures algorithmic fairness by evaluating whether error rates are equal across protected groups?","Equalized odds and false positive parity","Floating point operations per second (FLOPS)","Average response latency in milliseconds","Total parameter storage footprint in gigabytes",0,"Equalized odds verifies that true positive and false positive rates remain equivalent across demographic classes."
"What is a critical anti-pattern when designing machine learning training pipelines?","Data leakage from test splits into training datasets","Conducting cross-validation across multiple random folds","Documenting feature provenance and data licenses","Implementing automated regression integration suites",0,"Data leakage contaminates training data with target test signals, creating misleadingly optimistic accuracy."
"If an examinee experiences an unexpected network disconnect during an online quiz, what must the client do?","Persist answered questions locally in browser storage and resynchronize upon reconnect","Immediately submit a blank test and invalidate the candidate session","Crash the user browser tab with an unhandled fatal exception","Reset all previously answered questions back to unanswered state",0,"Robust client-side architecture caches state in local storage to withstand transient network failures seamlessly."
"Why is qualitative data crucial even when rich quantitative metrics are readily available?","Qualitative insights explain the human 'why' and emotional nuance behind the numbers","Qualitative data eliminates the necessity of statistical significance testing","Qualitative feedback can be parsed instantly by simple integer additions","Qualitative notes never require subjective interpretation",0,"Numbers show the magnitude of behavior, but qualitative feedback uncovers the underlying motivations and context."
"What is the primary benefit of standardized multiple-choice question distraction design?","Distractors target common student misconceptions to evaluate true diagnostic comprehension","Distractors trick candidates with obscure grammatical technicalities","Distractors should all be blatantly obvious so everyone answers correctly","Distractors should be identical to the correct answer to increase difficulty",0,"Effective distractors diagnose conceptual misunderstandings rather than testing trivia or syntactic trickery."
"What is the ultimate goal of integrating disciplined data storytelling with Generative AI?","Empowering humans to make verified, ethical, and evidence-based strategic decisions","Replacing human leadership with unmonitored autonomous algorithms","Generating visual graphics rapidly without evaluating data authenticity","Automating assessments without providing feedback to learners",0,"Ethical data storytelling combines computational capabilities with critical human discernment for impactful decisions."`;

  const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample_20_unique_questions.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Downloads a sample JSON template with 20 completely unique questions
 */
export function downloadSampleJsonTemplate() {
  const sample = [
    {
      questionText: "What fundamental attribute distinguishes categorical data from numerical data?",
      options: [
        "Does it identify a discrete category or quantify a numerical measurement?",
        "Is the measurement positive or negative?",
        "Was it collected recently or historically?",
        "Does it require floating-point arithmetic?"
      ],
      correctOption: 0,
      explanation: "Categorical data assigns items into distinct classes or groups, whereas numerical data quantifies amounts or counts."
    },
    {
      questionText: "Which of the following represents an ordinal categorical data type?",
      options: [
        "Customer satisfaction rating (Poor, Fair, Good, Excellent)",
        "Blood type group (A, B, AB, O)",
        "Telephone area code",
        "Computer processor serial number"
      ],
      correctOption: 0,
      explanation: "Ordinal data has an explicit, natural ranking order among categories with non-uniform intervals."
    },
    {
      questionText: "Which of the following is an example of continuous numerical data rather than discrete?",
      options: [
        "The ambient temperature of a laboratory server room over time",
        "The total number of students logged into an exam session",
        "The count of defect items in a shipment batch",
        "The number of hospital beds available in a ward"
      ],
      correctOption: 0,
      explanation: "Continuous data can take on any real value along an unbroken scale, whereas counts are discrete integers."
    },
    {
      questionText: "When constructing bar charts for categorical comparison, why must the baseline start at zero?",
      options: [
        "To prevent deceptive visual distortion of relative bar height ratios",
        "To ensure bar charts fit within default printer margins",
        "Because SVG vector graphics do not support non-zero origins",
        "To force gridlines to be calculated as integers"
      ],
      correctOption: 0,
      explanation: "Truncating the baseline distorts proportional lengths, misleading readers about actual magnitude ratios."
    },
    {
      questionText: "When should a horizontal bar chart be preferred over a vertical column chart?",
      options: [
        "When category labels are lengthy and would truncate or slant vertically",
        "When tracking continuous price movements across 500 trading days",
        "When illustrating proportions of a single whole under 4 parts",
        "When displaying multi-dimensional 3D surfaces"
      ],
      correctOption: 0,
      explanation: "Horizontal bar charts allow long textual labels to be read naturally left-to-right without diagonal tilting."
    },
    {
      questionText: "What is the primary analytical question addressed by descriptive analytics?",
      options: [
        "What specific events have historically occurred based on verified records?",
        "What will happen in the next financial quarter with certainty?",
        "What optimal decision algorithm should be executed next?",
        "How can outlier data points be silently removed?"
      ],
      correctOption: 0,
      explanation: "Descriptive analytics summarizes historical and empirical data to characterize what has already occurred."
    },
    {
      questionText: "In predictive analytics using Generative AI models, what essential accompaniment is required?",
      options: [
        "Clear communication of uncertainty bounds, error margins, and confidence intervals",
        "An absolute guarantee that future predictions are 100% deterministic",
        "The removal of all training baseline comparison sets",
        "Omitting all documentation of model hyperparameter choices"
      ],
      correctOption: 0,
      explanation: "Predictive algorithms inherently produce probabilistic estimates that require clear uncertainty disclosure."
    },
    {
      questionText: "How does prescriptive analytics differ from descriptive and predictive analytics?",
      options: [
        "It formulates and recommends specific actionable decisions to optimize outcomes",
        "It only records past ledger entries without future forecasting",
        "It focuses exclusively on plotting 2D static visual graphics",
        "It removes human oversight from critical safety protocols"
      ],
      correctOption: 0,
      explanation: "Prescriptive analytics identifies the optimal course of action based on predictions and constraint objectives."
    },
    {
      questionText: "Which visualization format is recommended for illustrating trend velocity and change over continuous time intervals?",
      options: [
        "A continuous line chart with chronological ordering on the horizontal axis",
        "A 3D exploded pie chart with 20 slices",
        "A radar spider chart with random categorical ordering",
        "A horizontal stacked cylinder bar chart"
      ],
      correctOption: 0,
      explanation: "Line charts effectively communicate rate, continuity, and temporal trajectory across uninterrupted intervals."
    },
    {
      questionText: "What is the primary risk of representational bias in generative machine learning models?",
      options: [
        "Training data underrepresents marginalized cohorts, producing skewed model behaviors",
        "Processing units consume too much memory during backpropagation",
        "Database tables contain too many normalized foreign keys",
        "API responses return structured JSON instead of plain markdown"
      ],
      correctOption: 0,
      explanation: "When training sets lack balanced diversity, model inference reflects disparities and fails on minority groups."
    },
    {
      questionText: "Why must pie charts generally be restricted to five or fewer slices?",
      options: [
        "Human visual perception struggles to accurately judge non-aligned angle and arc slices",
        "Pie charts cannot support decimal percentage calculations",
        "Web browsers cannot render circular SVG geometry efficiently",
        "Hexadecimal color palettes do not support more than five hues"
      ],
      correctOption: 0,
      explanation: "Comparing multiple angular wedges without a common baseline is perceptually difficult and error-prone."
    },
    {
      questionText: "In structured versus unstructured data architectures, which format represents unstructured data?",
      options: [
        "Medical clinical notes recorded in free-form physician dictation",
        "A relational SQL table with predefined primary and foreign keys",
        "A comma-separated spreadsheet with rigid typed columns",
        "A database catalog index with integer keys"
      ],
      correctOption: 0,
      explanation: "Free-form natural language text lacks a standardized relational schema and represents unstructured data."
    },
    {
      questionText: "What role does a tamper-evident audit log serve in examination and compliance platforms?",
      options: [
        "Provides an immutable chronological record of candidate interactions and submissions",
        "Allows candidates to overwrite previous answers after grading completion",
        "Reduces server database size by deleting previous test histories",
        "Automatically marks incorrect answers as correct during network drops"
      ],
      correctOption: 0,
      explanation: "Audit logs guarantee transparency, accountability, and academic integrity by preserving timestamped activity."
    },
    {
      questionText: "When presenting visual dashboards to non-technical executives, what is the best practice?",
      options: [
        "Lead with clear contextual narrative insights rather than raw unannotated numbers",
        "Include as many decorative 3D textures and animations as possible",
        "Display complex mathematical proofs on the summary slide",
        "Remove all axis titles to give the interface a minimalist design"
      ],
      correctOption: 0,
      explanation: "Effective data storytelling translates complex analytics into clear, actionable executive insights."
    },
    {
      questionText: "Which metric measures algorithmic fairness by evaluating whether error rates are equal across protected groups?",
      options: [
        "Equalized odds and false positive parity",
        "Floating point operations per second (FLOPS)",
        "Average response latency in milliseconds",
        "Total parameter storage footprint in gigabytes"
      ],
      correctOption: 0,
      explanation: "Equalized odds verifies that true positive and false positive rates remain equivalent across demographic classes."
    },
    {
      questionText: "What is a critical anti-pattern when designing machine learning training pipelines?",
      options: [
        "Data leakage from test splits into training datasets",
        "Conducting cross-validation across multiple random folds",
        "Documenting feature provenance and data licenses",
        "Implementing automated regression integration suites"
      ],
      correctOption: 0,
      explanation: "Data leakage contaminates training data with target test signals, creating misleadingly optimistic accuracy."
    },
    {
      questionText: "If an examinee experiences an unexpected network disconnect during an online quiz, what must the client do?",
      options: [
        "Persist answered questions locally in browser storage and resynchronize upon reconnect",
        "Immediately submit a blank test and invalidate the candidate session",
        "Crash the user browser tab with an unhandled fatal exception",
        "Reset all previously answered questions back to unanswered state"
      ],
      correctOption: 0,
      explanation: "Robust client-side architecture caches state in local storage to withstand transient network failures seamlessly."
    },
    {
      questionText: "Why is qualitative data crucial even when rich quantitative metrics are readily available?",
      options: [
        "Qualitative insights explain the human 'why' and emotional nuance behind the numbers",
        "Qualitative data eliminates the necessity of statistical significance testing",
        "Qualitative feedback can be parsed instantly by simple integer additions",
        "Qualitative notes never require subjective interpretation"
      ],
      correctOption: 0,
      explanation: "Numbers show the magnitude of behavior, but qualitative feedback uncovers the underlying motivations and context."
    },
    {
      questionText: "What is the primary benefit of standardized multiple-choice question distraction design?",
      options: [
        "Distractors target common student misconceptions to evaluate true diagnostic comprehension",
        "Distractors trick candidates with obscure grammatical technicalities",
        "Distractors should all be blatantly obvious so everyone answers correctly",
        "Distractors should be identical to the correct answer to increase difficulty"
      ],
      correctOption: 0,
      explanation: "Effective distractors diagnose conceptual misunderstandings rather than testing trivia or syntactic trickery."
    },
    {
      questionText: "What is the ultimate goal of integrating disciplined data storytelling with Generative AI?",
      options: [
        "Empowering humans to make verified, ethical, and evidence-based strategic decisions",
        "Replacing human leadership with unmonitored autonomous algorithms",
        "Generating visual graphics rapidly without evaluating data authenticity",
        "Automating assessments without providing feedback to learners"
      ],
      correctOption: 0,
      explanation: "Ethical data storytelling combines computational capabilities with critical human discernment for impactful decisions."
    }
  ];

  const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample_20_unique_questions.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Downloads a sample study material syllabus text file for topic creation
 */
export function downloadSampleStudyMaterialTemplate() {
  const sample = `COURSE SYLLABUS & STUDY GUIDE: ETHICAL DATA SCIENCE & GENERATIVE AI

1. FOUNDATIONS OF DATA ARCHITECTURES
- Categorical vs Numerical Data:
  * Categorical Data: Identifies group memberships or qualitative attributes.
    - Nominal: Unranked discrete groups (e.g., blood types A, B, AB, O; department names; nationality).
    - Ordinal: Explicit ordered categories with non-uniform intervals (e.g., customer ratings: Poor, Fair, Good, Excellent; educational degrees: High School, Bachelor's, Master's, Doctorate).
  * Numerical Data: Quantifies measurable magnitude or countable occurrence.
    - Discrete: Countable integer values (e.g., total student attendance count, server CPU count).
    - Continuous: Measurable along an infinite continuum with decimals (e.g., ambient temperature in Celsius, processing latency in milliseconds, weight in kilograms).
  * Qualitative vs Quantitative: Qualitative captures nuance, motivations, and the human "why"; quantitative provides numerical rigor and magnitude.
  * Structured vs Unstructured Data: Structured data fits rigid tabular schemas (SQL tables, CSV rows); unstructured data lacks predefined relational models (clinical dictations, audio streams, customer emails).

2. VISUALIZATION HEURISTICS & DATA STORYTELLING
- Honest Visual Baselines:
  * Bar and Column Charts must ALWAYS originate at a baseline of zero. Truncating the vertical Y-axis falsely exaggerates minute variances and deceives stakeholders.
- Chart Selection Matrix:
  * Vertical Column Charts: Compare discrete categories with short textual labels.
  * Horizontal Bar Charts: Optimal when category labels are lengthy, enabling horizontal left-to-right reading without tilting or truncated text.
  * Continuous Line Charts: Ideal for continuous chronological intervals to display trend velocity and change trajectory.
  * Area Charts: Depict volume or cumulative magnitude beneath a trend line.
  * Pie Charts: Limited to five or fewer slices. Human visual cognition cannot reliably calculate angular areas without a common baseline. Never use 3D pie charts.

3. ANALYTICAL HORIZONS
- Descriptive Analytics: Documents historical telemetry. Answers: "What happened in the system?"
- Diagnostic Analytics: Examines root causes and correlations. Answers: "Why did it happen?"
- Predictive Analytics: Probabilistic forecasting with mathematical models. Answers: "What is likely to happen next?" Requires explicit error margins, confidence bounds, and disclosure of stochastic uncertainty.
- Prescriptive Analytics: Formulates actionable optimization strategies. Answers: "What specific decision should we take to achieve optimal outcomes?"

4. ETHICAL GOVERNANCE IN GENERATIVE AI & AUDITABILITY
- Algorithmic Fairness & Bias Mitigation:
  * Representational bias stems from skewed historical training distributions that underrepresent protected groups.
  * Auditing requires assessing Equalized Odds and Demographic Parity across sensitive demographic cohorts.
- Data Provenance & Integrity:
  * Training and evaluation pipelines must enforce strict boundaries to prevent data leakage from test partitions into training folds.
- Resilience & Exam System Integrity:
  * Assessment engines must provide tamper-evident audit logs with verifiable timestamps for academic integrity.
  * Candidate clients must maintain resilient local persistence during transient network dropouts and resynchronize automatically upon reconnection.`;

  const blob = new Blob([sample], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample_study_material_syllabus.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
