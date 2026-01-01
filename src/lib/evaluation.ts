import type { Database } from './database.types';

type Question = Database['public']['Tables']['questions']['Row'];

export function evaluateAnswer(
  question: Question,
  studentAnswer: any
): { isCorrect: boolean | null; marksAwarded: number } {
  const correctAnswers = question.correct_answers as any;

  switch (question.question_type) {
    case 'mcq_single':
      const isCorrectSingle = studentAnswer === correctAnswers[0];
      return {
        isCorrect: isCorrectSingle,
        marksAwarded: isCorrectSingle ? question.marks : 0,
      };

    case 'mcq_multiple':
      if (!Array.isArray(studentAnswer) || !Array.isArray(correctAnswers)) {
        return { isCorrect: false, marksAwarded: 0 };
      }
      const sortedStudent = [...studentAnswer].sort();
      const sortedCorrect = [...correctAnswers].sort();
      const isCorrectMultiple =
        sortedStudent.length === sortedCorrect.length &&
        sortedStudent.every((val, idx) => val === sortedCorrect[idx]);
      return {
        isCorrect: isCorrectMultiple,
        marksAwarded: isCorrectMultiple ? question.marks : 0,
      };

    case 'fill_blank':
      const correctFill = correctAnswers[0];
      const studentFill = studentAnswer;
      let isCorrectFill: boolean;

      if (question.is_case_sensitive) {
        isCorrectFill = studentFill === correctFill;
      } else {
        isCorrectFill =
          String(studentFill).toLowerCase().trim() ===
          String(correctFill).toLowerCase().trim();
      }

      return {
        isCorrect: isCorrectFill,
        marksAwarded: isCorrectFill ? question.marks : 0,
      };

    case 'true_false':
      const isCorrectTF = studentAnswer === correctAnswers[0];
      return {
        isCorrect: isCorrectTF,
        marksAwarded: isCorrectTF ? question.marks : 0,
      };

    case 'numerical':
      const correctNum = parseFloat(correctAnswers[0]);
      const studentNum = parseFloat(studentAnswer);
      const isCorrectNum = !isNaN(studentNum) && !isNaN(correctNum) && studentNum === correctNum;
      return {
        isCorrect: isCorrectNum,
        marksAwarded: isCorrectNum ? question.marks : 0,
      };

    case 'short_answer':
    case 'paragraph':
      return {
        isCorrect: null,
        marksAwarded: 0,
      };

    default:
      return { isCorrect: false, marksAwarded: 0 };
  }
}

export function calculateResults(
  evaluations: Array<{ isCorrect: boolean | null; marksAwarded: number }>
) {
  let score = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let needsManualReview = false;

  evaluations.forEach((evaluation) => {
    score += evaluation.marksAwarded;

    if (evaluation.isCorrect === true) {
      correctCount++;
    } else if (evaluation.isCorrect === false) {
      wrongCount++;
    } else {
      needsManualReview = true;
    }
  });

  return { score, correctCount, wrongCount, needsManualReview };
}
