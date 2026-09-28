import { Topic, Question, Quiz } from '../types/quiz';

export const SEED_TOPIC_ID = 'topic-ethics-genai';

export const SEED_TOPIC: Topic = {
  id: SEED_TOPIC_ID,
  name: 'Ethical Issues & Storytelling with Data in Generative AI',
  description: 'Foundations of categorical vs numerical data, charts & representations, descriptive vs predictive analytics, and ethical implications in generative AI systems.',
  studyMaterialName: 'Storytelling_with_Data_using_AI_Tools.pdf',
  studyMaterialUrl: '#embedded-study-guide',
  studyMaterialSize: '2.4 MB',
  studyMaterialText: `Study Material Summary:
1. Data Types: Categorical (names a group) vs Numerical (measures an amount).
2. Categorical types: Nominal (no ranking, e.g. blood group) and Ordinal (ranked, e.g. customer satisfaction).
3. Numerical types: Discrete (counted values, no in-betweens) and Continuous (measured on scale, e.g. height, temperature).
4. Qualitative (qualities/words) vs Quantitative (numerical measurements).
5. Structured (tables with predefined schema) vs Unstructured (emails, PDFs, social media).
6. Visualizations: Column charts (discrete categories, vertical), Bar charts (long labels, horizontal), Line charts (trends over time), Area charts (volume/magnitude beneath trend), Pie charts (proportions of a whole with <= 5 slices). Beware non-zero Y-axis pitfalls.
7. Analytics: Descriptive (what happened) vs Predictive (future forecasting with uncertainty) vs Prescriptive (what to do).`,
  questionCount: 20,
  createdAt: '2026-09-28T08:00:00.000Z',
};

export const SEED_QUESTIONS: Question[] = [
  {
    id: 'q-01',
    topicId: SEED_TOPIC_ID,
    questionText: 'What is the key question that distinguishes categorical data from numerical data?',
    options: [
      'Is the value large or small?',
      'Does it name a group, or measure an amount?',
      'Was it collected recently or long ago?',
      'Was it collected online or offline?'
    ],
    correctOption: 1,
    explanation: 'Categorical data identifies group memberships or attributes (qualitative categories), whereas numerical data measures quantities or counts.',
    approved: true,
    createdAt: '2026-09-28T08:01:00.000Z'
  },
  {
    id: 'q-02',
    topicId: SEED_TOPIC_ID,
    questionText: 'Which of these is an example of categorical data?',
    options: [
      'Customer age',
      'Blood group',
      'Monthly revenue',
      'Temperature'
    ],
    correctOption: 1,
    explanation: 'Blood group (A, B, AB, O) places individuals into distinct discrete categories with no continuous mathematical measurement.',
    approved: true,
    createdAt: '2026-09-28T08:02:00.000Z'
  },
  {
    id: 'q-03',
    topicId: SEED_TOPIC_ID,
    questionText: 'Which of these is an example of numerical data?',
    options: [
      'Payment method',
      'Movie genre',
      'Employee salary',
      'Country of residence'
    ],
    correctOption: 2,
    explanation: 'Employee salary is represented as a numeric quantity that can be added, averaged, and statistically modeled.',
    approved: true,
    createdAt: '2026-09-28T08:03:00.000Z'
  },
  {
    id: 'q-04',
    topicId: SEED_TOPIC_ID,
    questionText: 'In nominal categorical data, how are the categories related to each other?',
    options: [
      'They follow a strict numeric order',
      'They have no natural order or ranking',
      'They must always be binary (yes/no)',
      'They are always percentages'
    ],
    correctOption: 1,
    explanation: 'Nominal data comes from the Latin "nomen" (name); categories differ by label only without an intrinsic rank or sequence.',
    approved: true,
    createdAt: '2026-09-28T08:04:00.000Z'
  },
  {
    id: 'q-05',
    topicId: SEED_TOPIC_ID,
    questionText: 'Which of the following is an example of ordinal data?',
    options: [
      'Blood group — A, B, AB, O',
      'Country of residence',
      'Customer satisfaction — Poor, Fair, Good, Excellent',
      'Payment method — UPI, Card, Cash'
    ],
    correctOption: 2,
    explanation: 'Customer satisfaction ratings have a clear order or hierarchical ranking from lowest to highest.',
    approved: true,
    createdAt: '2026-09-28T08:05:00.000Z'
  },
  {
    id: 'q-06',
    topicId: SEED_TOPIC_ID,
    questionText: 'Discrete numerical data is best described as:',
    options: [
      'Values you get by counting, with no in-between values',
      'Any value measured on a continuous scale',
      'Data expressed only in words',
      'Survey responses with no numbers'
    ],
    correctOption: 0,
    explanation: 'Discrete data consists of distinct, countable points (integers like 1, 2, 3 children or cars) with no fractional intermediary values.',
    approved: true,
    createdAt: '2026-09-28T08:06:00.000Z'
  },
  {
    id: 'q-07',
    topicId: SEED_TOPIC_ID,
    questionText: 'Which of the following is an example of continuous data?',
    options: [
      'Number of children in a family',
      'Cars sold in a showroom this month',
      'Height, weight and temperature',
      'Number of app downloads'
    ],
    correctOption: 2,
    explanation: 'Continuous data can take on any infinite value within an interval (e.g., 172.54 cm, 68.3 kg).',
    approved: true,
    createdAt: '2026-09-28T08:07:00.000Z'
  },
  {
    id: 'q-08',
    topicId: SEED_TOPIC_ID,
    questionText: 'Qualitative data is described in the session as data that:',
    options: [
      'Captures qualities, opinions and characteristics in words',
      'Is always a whole number',
      'Can be meaningfully averaged',
      'Is stored only in spreadsheets'
    ],
    correctOption: 0,
    explanation: 'Qualitative data describes non-numerical qualities such as descriptive opinions, feelings, audio transcripts, or open-ended responses.',
    approved: true,
    createdAt: '2026-09-28T08:08:00.000Z'
  },
  {
    id: 'q-09',
    topicId: SEED_TOPIC_ID,
    questionText: 'Which of the following is an example of quantitative data?',
    options: [
      'Interview transcripts',
      'Product review text',
      'Monthly sales figures',
      'Focus-group notes'
    ],
    correctOption: 2,
    explanation: 'Monthly sales figures represent measurable numeric quantities suitable for arithmetic analysis and mathematical aggregation.',
    approved: true,
    createdAt: '2026-09-28T08:09:00.000Z'
  },
  {
    id: 'q-10',
    topicId: SEED_TOPIC_ID,
    questionText: 'Structured data is described as data that:',
    options: [
      'Has no fixed format',
      'Is organized into rows and columns with a predefined schema',
      'Can only be images or video',
      'Cannot be queried or sorted'
    ],
    correctOption: 1,
    explanation: 'Structured data adheres to tabular formats (SQL tables, spreadsheets) with rigid typed attributes and column headers.',
    approved: true,
    createdAt: '2026-09-28T08:10:00.000Z'
  },
  {
    id: 'q-11',
    topicId: SEED_TOPIC_ID,
    questionText: 'Which of these is an example of unstructured data?',
    options: [
      'An HR employee records table',
      'A sales ledger',
      'Emails, PDFs and social media posts',
      'An ERP transaction table'
    ],
    correctOption: 2,
    explanation: 'Emails, unstructured text documents, PDFs, audio recordings, and social media posts lack a rigid relational schema.',
    approved: true,
    createdAt: '2026-09-28T08:11:00.000Z'
  },
  {
    id: 'q-12',
    topicId: SEED_TOPIC_ID,
    questionText: "In the 'Three Lenses, One Dataset' recap, which pair of lenses answers the question 'Was it described, or measured?'",
    options: [
      'Categorical vs. Numerical',
      'Qualitative vs. Quantitative',
      'Structured vs. Unstructured',
      'Discrete vs. Continuous'
    ],
    correctOption: 1,
    explanation: 'Qualitative corresponds to being described in words/attributes; Quantitative corresponds to being mathematically measured.',
    approved: true,
    createdAt: '2026-09-28T08:12:00.000Z'
  },
  {
    id: 'q-13',
    topicId: SEED_TOPIC_ID,
    questionText: 'Column charts are the best choice when you want to:',
    options: [
      'Compare values across a handful of discrete categories using vertical bars',
      'Show what share each part contributes to a whole',
      'Rank many categories with very long labels',
      'Show change over a continuous time span only'
    ],
    correctOption: 0,
    explanation: 'Vertical column charts clearly contrast magnitudes across a small set of discrete categories with readable brief labels.',
    approved: true,
    createdAt: '2026-09-28T08:13:00.000Z'
  },
  {
    id: 'q-14',
    topicId: SEED_TOPIC_ID,
    questionText: 'Bar charts (horizontal bars) are usually preferred over column charts when:',
    options: [
      'You only have two categories to show',
      'Category labels are long and would overlap as columns',
      'You need to show a trend over time',
      'You are plotting percentages only'
    ],
    correctOption: 1,
    explanation: 'Horizontal bar charts provide ample horizontal layout space for long textual labels without requiring diagonal or truncated text.',
    approved: true,
    createdAt: '2026-09-28T08:14:00.000Z'
  },
  {
    id: 'q-15',
    topicId: SEED_TOPIC_ID,
    questionText: 'Line charts are most appropriate for:',
    options: [
      'Showing how a continuous value changes over time',
      'Comparing categories with very long labels',
      'Showing the composition of a whole',
      'Displaying a single, isolated data point'
    ],
    correctOption: 0,
    explanation: 'Line charts connect adjacent points to highlight rate of change, direction, and continuous temporal trends.',
    approved: true,
    createdAt: '2026-09-28T08:15:00.000Z'
  },
  {
    id: 'q-16',
    topicId: SEED_TOPIC_ID,
    questionText: 'What does an area chart emphasize that a plain line chart does not?',
    options: [
      'The exact category labels',
      'Magnitude or volume beneath the trend line',
      'The alphabetical order of categories',
      'Statistical significance of the trend'
    ],
    correctOption: 1,
    explanation: 'The shaded area between the line and baseline emphasizes cumulative volume, cumulative mass, or aggregate magnitude.',
    approved: true,
    createdAt: '2026-09-28T08:16:00.000Z'
  },
  {
    id: 'q-17',
    topicId: SEED_TOPIC_ID,
    questionText: 'According to the session, a pie chart works best when:',
    options: [
      'There are more than ten categories to show',
      'The story is about share of a whole, with about five or fewer slices',
      'You are plotting a trend across many months',
      'You need viewers to compare exact magnitudes precisely'
    ],
    correctOption: 1,
    explanation: 'Human eyes struggle with radial angles; pie charts should strictly be limited to share-of-whole stories with <= 5 clearly distinct slices.',
    approved: true,
    createdAt: '2026-09-28T08:17:00.000Z'
  },
  {
    id: 'q-18',
    topicId: SEED_TOPIC_ID,
    questionText: 'What common chart pitfall is specifically called out for column and bar charts?',
    options: [
      'Using too many colors',
      "A y-axis that doesn't start at zero, which exaggerates differences",
      'Adding a legend to the chart',
      'Sorting bars by value instead of alphabetically'
    ],
    correctOption: 1,
    explanation: 'Trunking the baseline above zero visually distorts bar length ratios and misleadingly exaggerates minor variations.',
    approved: true,
    createdAt: '2026-09-28T08:18:00.000Z'
  },
  {
    id: 'q-19',
    topicId: SEED_TOPIC_ID,
    questionText: 'Descriptive analytics primarily answers the question:',
    options: [
      'What should we do about it?',
      'Why did it happen?',
      'What happened?',
      "What's likely to happen?"
    ],
    correctOption: 2,
    explanation: 'Descriptive analytics summarizes historical data into intelligible metrics to understand what has already occurred.',
    approved: true,
    createdAt: '2026-09-28T08:19:00.000Z'
  },
  {
    id: 'q-20',
    topicId: SEED_TOPIC_ID,
    questionText: 'Predictive analytics differs from descriptive analytics mainly because it:',
    options: [
      'Only ever uses qualitative data',
      'Looks forward and always involves some degree of uncertainty',
      'Never makes use of Gen AI',
      'Is always more accurate than descriptive analytics'
    ],
    correctOption: 1,
    explanation: 'Predictive analytics projects future probabilities and trends using statistical models or AI, naturally incorporating confidence bounds and uncertainty.',
    approved: true,
    createdAt: '2026-09-28T08:20:00.000Z'
  }
];

export const SEED_QUIZ: Quiz = {
  id: 'quiz-ethics-live',
  code: 'ETH2026',
  title: 'Ethical Issues & Storytelling with Data in Generative AI',
  topicId: SEED_TOPIC_ID,
  topicName: SEED_TOPIC.name,
  status: 'active',
  totalQuestions: 20,
  timeLimitMinutes: 15,
  questionIds: SEED_QUESTIONS.map(q => q.id),
  participantCount: 0,
  submissionCount: 0,
  createdBy: 'admin-vidya',
  createdAt: '2026-09-28T08:25:00.000Z',
  startedAt: '2026-09-28T08:30:00.000Z'
};
