import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { evaluateAnswer, calculateResults } from '../lib/evaluation';
import {
  getOrCreateSlot,
  generateStudentCode,
  getNextSerialForSlot,
} from '../lib/slotManagement';
import type { Database } from '../lib/database.types';
import QuestionRenderer from '../components/QuestionRenderer';

type Test = Database['public']['Tables']['tests']['Row'];
type Question = Database['public']['Tables']['questions']['Row'];

interface TestTakingProps {
  testId: string;
  studentName: string;
  fatherName: string;
  classApplyingFor: string;
  retestKeyId?: string;
  isMasterKey?: boolean;
  onComplete: (submissionId: string) => void;
}

export default function TestTaking({
  testId,
  studentName,
  fatherName,
  classApplyingFor,
  retestKeyId,
  isMasterKey,
  onComplete,
}: TestTakingProps) {
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [violationCount, setViolationCount] = useState(0);
  const [showMalpracticeWarning, setShowMalpracticeWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slotNumber, setSlotNumber] = useState(0);
  const [studentCode, setStudentCode] = useState('');

  // Refs for state access in event handlers
  const answersRef = useRef<Record<string, any>>({});
  const questionsRef = useRef<Question[]>([]);
  const violationCountRef = useRef(0);
  const fullscreenExitCountRef = useRef(0);
  const tabSwitchCountRef = useRef(0);
  const startTimeRef = useRef<number>(Date.now());
  const submissionIdRef = useRef<string | null>(null);
  const malpracticeWarningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync refs
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);

  // Anti-Cheating Handlers
  const preventDefault = (e: Event) => e.preventDefault();

  const handleKeyDown = (e: KeyboardEvent) => {
    // Block Refresh
    if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
      e.preventDefault();
    }

    // F11: Block ONLY if we are in fullscreen (prevent exit). 
    // If NOT in fullscreen, allow default (enter fullscreen).
    if (e.key === 'F11') {
      if (document.fullscreenElement) {
        e.preventDefault();
        e.stopPropagation();
      }
    }

    // Escape: Always block to prevent exit
    if (e.key === 'Escape') {
      e.preventDefault();
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      tabSwitchCountRef.current += 1;
      handleViolation('Tab Switch');
    }
  };

  const handleWindowBlur = () => {
    // Optional
  };

  const handleFullscreenChange = () => {
    if (!document.fullscreenElement) {
      fullscreenExitCountRef.current += 1;
      handleViolation('Fullscreen Exit');
    }
  };

  const setupAntiCheating = () => {
    document.addEventListener('contextmenu', preventDefault);
    document.addEventListener('copy', preventDefault);
    document.addEventListener('cut', preventDefault);
    document.addEventListener('paste', preventDefault);
    document.addEventListener('selectstart', preventDefault);
    document.addEventListener('keydown', handleKeyDown);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
  };

  const cleanupAntiCheating = () => {
    document.removeEventListener('contextmenu', preventDefault);
    document.removeEventListener('copy', preventDefault);
    document.removeEventListener('cut', preventDefault);
    document.removeEventListener('paste', preventDefault);
    document.removeEventListener('selectstart', preventDefault);
    document.removeEventListener('keydown', handleKeyDown);

    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleWindowBlur);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);

    if (malpracticeWarningTimeoutRef.current) clearTimeout(malpracticeWarningTimeoutRef.current);
  };

  useEffect(() => {
    loadTestData();
    enterFullscreen();
    setupAntiCheating();
    return () => cleanupAntiCheating();
  }, []);

  useEffect(() => {
    if (timeLeft <= 0 && timeLeft !== 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const enterFullscreen = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      }
    } catch (error) {
      console.warn('Fullscreen request failed:', error);
    }
  };

  // Logic
  const handleViolation = (type: string) => {
    console.warn(`Violation detected: ${type}`);
    violationCountRef.current += 1;
    setViolationCount(violationCountRef.current);
    showMalpractice();

    // Auto-submit if:
    // 1. Fullscreen is exited more than 2 times (on the 3rd exit)
    // 2. Total violations (including tab switches) exceed 2
    if (fullscreenExitCountRef.current > 2 || violationCountRef.current > 2) {
      handleSubmit(true, true);
    }
  };

  const showMalpractice = () => {
    setShowMalpracticeWarning(true);
    if (malpracticeWarningTimeoutRef.current) clearTimeout(malpracticeWarningTimeoutRef.current);
    malpracticeWarningTimeoutRef.current = setTimeout(() => setShowMalpracticeWarning(false), 5000);
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const loadTestData = async () => {
    try {
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single();
      if (testError) throw testError;

      setTest(testData as Test);
      setTimeLeft((testData as Test).duration_minutes * 60);

      const slot = await getOrCreateSlot(testId);
      setSlotNumber(slot.slot_number);

      const serial = await getNextSerialForSlot(testId, slot.slot_number, classApplyingFor);
      const code = generateStudentCode(classApplyingFor, studentName, serial);
      setStudentCode(code);

      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .order('question_number', { ascending: true });
      if (questionsError) throw questionsError;

      if (questionsData && questionsData.length > 0) {
        const questionsList = questionsData as Question[];
        console.log('Original questions order:', questionsList.map(q => q.question_number));

        // Shuffle questions
        const shuffledQuestions = shuffleArray<Question>(questionsList);
        console.log('Shuffled questions order:', shuffledQuestions.map(q => q.question_number));

        // Shuffle options for each question if they exist
        const questionsWithOptionsShuffled = shuffledQuestions.map((q: Question) => {
          const options = q.options as any;
          if (options && Array.isArray(options) && options.length > 1) {
            // Don't shuffle True/False options as they should stay fixed
            if (q.question_type === 'mcq_single' || q.question_type === 'mcq_multiple') {
              const shuffledOptions = shuffleArray<string>(options as string[]);
              console.log(`Shuffled options for Q${q.question_number}:`, shuffledOptions);
              return {
                ...q,
                options: shuffledOptions
              };
            }
          }
          return q;
        });

        setQuestions(questionsWithOptionsShuffled);
      } else {
        setQuestions([]);
      }
    } catch (error) {
      console.error('Error loading test:', error);
    }
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async (isAutoSubmit = false, forceMalpractice = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const currentQuestions = questionsRef.current;
      const currentAnswers = answersRef.current;
      const currentViolationCount = violationCountRef.current;

      const timeTakenSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

      const evaluations = currentQuestions.map((q) => {
        const studentAnswer = currentAnswers[q.id];
        return evaluateAnswer(q, studentAnswer);
      });

      const { score, correctCount, wrongCount, needsManualReview } = calculateResults(evaluations);
      const totalMarks = currentQuestions.reduce((sum, q) => sum + q.marks, 0);
      const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;

      const hasMalpractice = forceMalpractice || currentViolationCount > 0;

      // Retest Invalidation
      if (retestKeyId || isMasterKey) {
        import('../lib/slotManagement').then(({ invalidatePreviousSubmission }) => {
          invalidatePreviousSubmission(testId, slotNumber, studentName, fatherName, retestKeyId);
        });
      }

      // Retry Logic for "Duplicate Student Code"
      let submission = null;
      let attempt = 0;
      const maxAttempts = 3;

      while (attempt < maxAttempts) {
        try {
          // Ensure Uniqueness: Append timestamp + random to code at submission time
          // We regenerate this on every attempt to ensure a new unique value
          const uniqueSuffix = `${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
          const finalStudentCode = `${studentCode || 'FALLBACK'}-${uniqueSuffix}`;

          const { data, error } = await (supabase
            .from('submissions')
            .insert({
              test_id: testId,
              student_name: studentName,
              father_name: fatherName,
              class_applying_for: classApplyingFor,
              student_code: finalStudentCode,
              slot_number: slotNumber,
              tab_switch_count: currentViolationCount,
              time_taken_seconds: timeTakenSeconds,
              score,
              total_marks: totalMarks,
              percentage,
              correct_count: correctCount,
              wrong_count: wrongCount,
              needs_manual_review: needsManualReview,
              malpractice_detected: hasMalpractice,
              status: isAutoSubmit ? 'auto_submitted' : 'completed',
              submitted_at: new Date().toISOString(),
              retest_key_used: retestKeyId || null
            } as any)
            .select()
            .single() as any);

          if (error) {
            // If unique constraint violation (code 23505), throw to catch block but check code
            if (error.code === '23505') {
              console.warn(`Attempt ${attempt + 1}: Duplicate Code ${finalStudentCode}. Retrying...`);
              attempt++;
              continue; // Retry loop
            }
            throw error; // Other errors, throw immediately
          }

          submission = data;
          break; // Success

        } catch (err: any) {
          if (attempt === maxAttempts - 1) throw err; // Throw if last attempt failed
          attempt++;
        }
      }

      if (!submission) throw new Error('Failed to create submission after multiple attempts.');

      const submissionData = submission as any;
      if (retestKeyId) {
        import('../lib/slotManagement').then(({ markRetestKeyAsUsed }) => {
          markRetestKeyAsUsed(retestKeyId, submissionData.id);
        });
      }

      const answersToInsert = currentQuestions.map((q, idx) => ({
        submission_id: submissionData.id,
        question_id: q.id,
        student_answer: currentAnswers[q.id] || null,
        is_correct: evaluations[idx].isCorrect,
        marks_awarded: evaluations[idx].marksAwarded,
      }));

      const { error: answersError } = await (supabase.from('answers').insert(answersToInsert as any) as any);
      if (answersError) throw answersError;

      submissionIdRef.current = submissionData.id;
      onComplete(submissionData.id);

    } catch (error: any) {
      console.error('Error submitting test:', error);
      alert(`Error submitting test: ${error.message || 'Unknown code'}. Please contact invigilator.`);
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getQuestionStatusColor = (idx: number) => {
    if (idx === currentQuestionIndex) return 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300';
    if (answers[questions[idx].id] !== undefined) return 'bg-green-500 text-white hover:bg-green-600';
    return 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100';
  };

  if (!test || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-600">Loading test...</div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="h-screen bg-gray-50 flex flex-col font-sans relative">
      {/* Overlay when not fullscreen */}
      {!document.fullscreenElement && (
        <div className="fixed inset-0 z-[200] bg-black bg-opacity-95 flex flex-col items-center justify-center text-white p-8 text-center backdrop-blur-md">
          <AlertTriangle className="w-24 h-24 text-red-500 mb-6 animate-pulse" />
          <h2 className="text-4xl font-bold mb-4">Secure Mode Exited</h2>
          <p className="text-xl mb-8 max-w-xl text-gray-300">
            Test cannot proceed unless you are in Fullscreen Mode.
          </p>
          <button
            onClick={enterFullscreen}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl py-4 px-10 rounded-full transition transform hover:scale-105 shadow-lg border border-blue-400"
          >
            Return to Test (Fullscreen)
          </button>
          <p className="mt-8 text-sm text-gray-500 font-mono">
            If button fails, press <strong>F11</strong> on your keyboard.
          </p>
        </div>
      )}

      {/* Malpractice Warning Banner */}
      {showMalpracticeWarning && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-3 z-[100] flex items-center justify-center gap-2 shadow-lg animate-pulse">
          <AlertTriangle className="w-6 h-6" />
          <span className="font-bold text-lg text-center">
            ⚠ Warning: Violation Detected! (Total: {violationCount}/2).
            {fullscreenExitCountRef.current > 0 && ` Fullscreen Exits: ${fullscreenExitCountRef.current}/2.`}
            <br className="md:hidden" /> Continued violation will auto-submit test.
          </span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 z-10 flex-shrink-0">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">{test.title}</h1>
              <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{studentCode}</span>
                <span>|</span>
                <span className="font-medium">{studentName}</span>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className={`font-mono text-xl font-bold ${timeLeft < 300 ? 'text-red-600 animate-pulse' : 'text-gray-900'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${violationCount > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                  <AlertTriangle className={`w-4 h-4 ${violationCount > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                  <span className="text-sm font-semibold">Violations: {violationCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full bg-gray-200 h-1">
          <div className="bg-blue-600 h-1 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-inner z-0 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Question Navigator</h3>
            <p className="text-sm text-gray-700 font-medium">
              {Object.keys(answers).length} of {questions.length} Attempted
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            <div className="grid grid-cols-5 gap-3">
              {questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`h-10 w-full rounded-lg text-sm font-bold transition-all duration-200 flex items-center justify-center ${getQuestionStatusColor(idx)}`}
                >
                  {idx + 1}
                  {answers[questions[idx].id] !== undefined && idx !== currentQuestionIndex && (
                    <CheckCircle className="w-3 h-3 ml-0.5 opacity-50 absolute top-1 right-1" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span>Attempted</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-400 opacity-60"></span>
              <span>Unattempted</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600"></span>
              <span>Current</span>
            </div>
          </div>
        </aside>

        {/* Question Area */}
        <main className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar flex flex-col justify-center">
            <div className="max-w-5xl mx-auto w-full flex flex-col gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between min-h-[300px]">
                <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
                  <span className="text-sm font-medium text-gray-500">Question {currentQuestionIndex + 1}</span>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold uppercase rounded-full tracking-wide">
                    {currentQuestion.marks} Marks
                  </span>
                </div>

                <div className="flex-1">
                  <QuestionRenderer
                    question={currentQuestion}
                    displayNumber={currentQuestionIndex + 1}
                    answer={answers[currentQuestion.id]}
                    onAnswerChange={(answer) => handleAnswerChange(currentQuestion.id, answer)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="px-6 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                >
                  Previous
                </button>

                {currentQuestionIndex === questions.length - 1 ? (
                  <button
                    onClick={() => handleSubmit(false)}
                    disabled={isSubmitting}
                    className="px-8 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg disabled:opacity-50 transition shadow-md flex items-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Submit Test
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition shadow-md flex items-center gap-2"
                  >
                    Next Question
                  </button>
                )}
              </div>
            </div>
          </div>

          <footer className="bg-white border-t border-gray-200 py-3 px-6 text-center text-xs text-gray-400 flex-shrink-0">
            <p>&copy; {new Date().getFullYear()} Azneeta Academy. All Rights Reserved. • Entrance Examination System</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
