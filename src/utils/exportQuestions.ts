import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { Question } from '../types/quiz';

/**
 * Exports questions to a clean, professionally formatted Excel workbook (.xlsx)
 */
export function exportQuestionsToExcel(
  questions: Question[],
  filenamePrefix: string = 'questions',
  topicName?: string
) {
  if (!questions || questions.length === 0) return;

  const optionLetters = ['A', 'B', 'C', 'D'];

  const rows = questions.map((q, idx) => {
    const correctLetter = optionLetters[q.correctOption] || 'A';
    const correctText = q.options[q.correctOption] || '';

    return {
      '#': idx + 1,
      'Question Text': q.questionText,
      'Option A': q.options[0] || '',
      'Option B': q.options[1] || '',
      'Option C': q.options[2] || '',
      'Option D': q.options[3] || '',
      'Correct Option': correctLetter,
      'Correct Answer': correctText,
      'Explanation': q.explanation || 'Verified curriculum standard.',
      'Topic': topicName || (q as any).topicName || 'General',
      'Status': q.approved ? 'Approved' : 'Pending',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set intelligent column widths
  worksheet['!cols'] = [
    { wch: 5 },   // #
    { wch: 45 },  // Question
    { wch: 25 },  // Opt A
    { wch: 25 },  // Opt B
    { wch: 25 },  // Opt C
    { wch: 25 },  // Opt D
    { wch: 15 },  // Correct Opt
    { wch: 30 },  // Correct Text
    { wch: 40 },  // Explanation
    { wch: 20 },  // Topic
    { wch: 12 },  // Status
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');

  const safeTopic = (topicName || 'questions').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  const fileName = `${filenamePrefix}_${safeTopic}_${Date.now()}.xlsx`;

  XLSX.writeFile(workbook, fileName);
}

/**
 * Exports questions to a clean, printable PDF document (.pdf) with multi-page flow
 */
export function exportQuestionsToPdf(
  questions: Question[],
  filenamePrefix: string = 'questions',
  topicName?: string
) {
  if (!questions || questions.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  let y = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      drawHeaderSmall();
    }
  };

  const drawHeaderSmall = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(`${topicName || 'Quiz Questions'} • Question Bank Export`, margin, y);
    doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin, y, { align: 'right' });
    y += 15;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 20;
  };

  // Document Title Header on first page
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('Assessment Question Bank', margin, y);
  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Topic: ${topicName || 'General Knowledge'}  |  Total Questions: ${questions.length}  |  Generated: ${new Date().toLocaleDateString()}`, margin, y);
  y += 15;

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  const optionLetters = ['A', 'B', 'C', 'D'];

  questions.forEach((q, idx) => {
    // Estimate height needed for this question block
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const qLines = doc.splitTextToSize(`Q${idx + 1}. ${q.questionText}`, contentWidth);
    const qHeight = qLines.length * 14;

    const optHeights = q.options.map((opt, optIdx) => {
      const isCorrect = optIdx === q.correctOption;
      const text = `${optionLetters[optIdx]}) ${opt}${isCorrect ? '  [CORRECT ANSWER]' : ''}`;
      return doc.splitTextToSize(text, contentWidth - 20).length * 13;
    });
    const totalOptHeight = optHeights.reduce((a, b) => a + b, 0);

    const expLines = q.explanation ? doc.splitTextToSize(`Explanation: ${q.explanation}`, contentWidth - 20) : [];
    const expHeight = expLines.length > 0 ? expLines.length * 12 + 12 : 0;

    const blockHeight = qHeight + totalOptHeight + expHeight + 30;
    checkPageBreak(Math.min(blockHeight, 140));

    // Render Question Text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(qLines, margin, y);
    y += qHeight + 6;

    // Render Options
    q.options.forEach((opt, optIdx) => {
      const isCorrect = optIdx === q.correctOption;
      const prefix = `${optionLetters[optIdx]}) `;
      const fullText = `${prefix}${opt}`;

      doc.setFont('helvetica', isCorrect ? 'bold' : 'normal');
      doc.setFontSize(9.5);

      if (isCorrect) {
        doc.setTextColor(16, 149, 93); // emerald green
      } else {
        doc.setTextColor(71, 85, 105); // slate-600
      }

      const optLines = doc.splitTextToSize(fullText + (isCorrect ? '  ✓' : ''), contentWidth - 15);
      doc.text(optLines, margin + 10, y);
      y += optLines.length * 13 + 2;
    });

    // Render Explanation box if present
    if (expLines.length > 0) {
      y += 4;
      doc.setFillColor(248, 250, 252); // light slate background
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin + 5, y, contentWidth - 10, expLines.length * 12 + 8, 3, 3, 'FD');

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(expLines, margin + 12, y + 10);
      y += expLines.length * 12 + 14;
    }

    y += 12; // Gap between questions
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y, pageWidth - margin, y);
    y += 14;
  });

  const safeTopic = (topicName || 'questions').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  const fileName = `${filenamePrefix}_${safeTopic}_${Date.now()}.pdf`;

  doc.save(fileName);
}
