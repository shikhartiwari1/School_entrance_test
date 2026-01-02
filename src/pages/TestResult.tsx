import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Home, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Submission = Database['public']['Tables']['submissions']['Row'];
interface TestResultProps {
  submissionId: string;
  onBackToHome: () => void;
}

export default function TestResult({ submissionId, onBackToHome }: TestResultProps) {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [details, setDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubmission();
  }, [submissionId]);

  const loadSubmission = async () => {
    try {
      // Fetch submission
      const { data: submissionData, error: submissionError } = await (supabase
        .from('submissions')
        .select('*')
        .eq('id', submissionId) as any)
        .single();

      if (submissionError) throw submissionError;

      // Fetch answers with question details
      const { data: answersData, error: answersError } = await (supabase
        .from('answers')
        .select(`
          *,
          questions (*)
        `)
        .eq('submission_id', submissionId) as any);

      if (answersError) throw answersError;

      let retestKeyDetails = null;
      if (submissionData.retest_key_used) {
        const { data: keyData, error: keyError } = await (supabase
          .from('retest_keys')
          .select('key')
          .eq('id', submissionData.retest_key_used) as any)
          .single();

        if (!keyError && keyData) {
          retestKeyDetails = keyData;
        }
      }

      // Combine data
      setSubmission({
        ...submissionData,
        retest_keys: retestKeyDetails
      } as any);

      setDetails(answersData || []);

    } catch (error) {
      console.error('Error loading submission:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-600">Loading results...</div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">Unable to load results</div>
      </div>
    );
  }

  const isPassed = submission.percentage >= 40;
  // @ts-ignore
  const retestKey = submission.retest_keys?.key;
  const isRetest = !!(submission.retest_key_used || retestKey);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${isRetest ? 'from-blue-100 via-blue-50 to-indigo-100' : 'from-blue-50 via-white to-green-50'}`}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${isRetest ? 'ring-4 ring-blue-300' : ''}`}>
            {isRetest && (
              <div className="bg-blue-600 text-white text-center py-1 text-sm font-semibold tracking-wider uppercase">
                Retest Submission
              </div>
            )}
            <div
              className={`p-8 text-center ${isPassed ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-red-600'
                }`}
            >
              <div className="flex justify-center mb-4">
                {isPassed ? (
                  <CheckCircle className="w-20 h-20 text-white" />
                ) : (
                  <XCircle className="w-20 h-20 text-white" />
                )}
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {isPassed ? 'Congratulations!' : 'Test Completed'}
              </h1>
              <p className="text-white text-lg">
                {isPassed ? 'You have passed the entrance test!' : 'Thank you for taking the test'}
              </p>
            </div>

            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Student Information</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Student Code</p>
                    <p className="font-mono font-bold text-blue-600">{submission.student_code || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Full Name</p>
                    <p className="font-medium text-gray-900">{submission.student_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Father's Name</p>
                    <p className="font-medium text-gray-900">{submission.father_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Class Applying For</p>
                    <p className="font-medium text-gray-900">{submission.class_applying_for}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Slot Number</p>
                    <p className="font-medium text-gray-900">{submission.slot_number || 'N/A'}</p>
                  </div>
                  {retestKey && (
                    <div>
                      <p className="text-sm text-gray-600">Retest Key Used</p>
                      <p className="font-mono font-bold text-indigo-600">{retestKey}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                  Test Results
                </h2>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Score</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {submission.score}/{submission.total_marks}
                    </p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Percentage</p>
                    <p className="text-3xl font-bold text-green-600">
                      {submission.percentage.toFixed(2)}%
                    </p>
                  </div>

                  <div className="bg-emerald-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Correct Answers</p>
                    <p className="text-2xl font-bold text-emerald-600 flex items-center gap-2">
                      <CheckCircle className="w-6 h-6" />
                      {submission.correct_count}
                    </p>
                  </div>

                  <div className="bg-red-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Wrong Answers</p>
                    <p className="text-2xl font-bold text-red-600 flex items-center gap-2">
                      <XCircle className="w-6 h-6" />
                      {submission.wrong_count}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Time Taken</p>
                    <p className="text-xl font-bold text-gray-700">
                      {formatTime(submission.time_taken_seconds)}
                    </p>
                  </div>

                  <div className="bg-yellow-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Tab Switches</p>
                    <p className="text-xl font-bold text-yellow-600">
                      {submission.tab_switch_count}
                    </p>
                  </div>
                </div>

                {submission.needs_manual_review && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-yellow-900">Manual Review Required</p>
                      <p className="text-sm text-yellow-800">
                        Some of your answers require manual evaluation. Your final score may be
                        updated after review.
                      </p>
                    </div>
                  </div>
                )}

                {submission.status === 'auto_submitted' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-red-900">Auto-Submitted</p>
                      <p className="text-sm text-red-800">
                        Your test was automatically submitted due to tab switching or time expiry.
                      </p>
                    </div>
                  </div>
                )}

                {submission.malpractice_detected && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-orange-900">Malpractice Detected</p>
                      <p className="text-sm text-orange-800">
                        Your attempt has been flagged for suspicious activity. Please contact your exam administrator for further details.
                      </p>
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    Detailed Question Review
                  </h2>

                  <div className="space-y-8">
                    {details
                      .sort((a, b) => (a.questions?.question_number || 0) - (b.questions?.question_number || 0))
                      .map((detail, idx) => {
                        const question = detail.questions;
                        const isCorrect = detail.is_correct;
                        const studentAnswer = detail.student_answer;
                        const correctAnswers = question?.correct_answers as string[] || [];

                        return (
                          <div key={detail.id} className="border-b border-gray-100 pb-8 last:border-0">
                            <div className="flex items-start gap-3 mb-3">
                              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-sm">
                                {idx + 1}
                              </span>
                              <div className="flex-1">
                                <h3 className="text-lg font-medium text-gray-900">
                                  {question?.question_text || 'Question not found'}
                                </h3>
                              </div>
                              <div className="flex-shrink-0">
                                {isCorrect === true ? (
                                  <span className="flex items-center gap-1 text-green-600 font-bold px-3 py-1 bg-green-50 rounded-full text-xs">
                                    <CheckCircle className="w-4 h-4" /> Correct
                                  </span>
                                ) : isCorrect === false ? (
                                  <span className="flex items-center gap-1 text-red-600 font-bold px-3 py-1 bg-red-50 rounded-full text-xs">
                                    <XCircle className="w-4 h-4" /> Incorrect
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-yellow-600 font-bold px-3 py-1 bg-yellow-50 rounded-full text-xs">
                                    <AlertCircle className="w-4 h-4" /> Pending
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="ml-11 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-gray-500 mb-1 font-medium">Your Answer:</p>
                                <p className={`font-semibold ${isCorrect === false ? 'text-red-600' : 'text-gray-900'}`}>
                                  {Array.isArray(studentAnswer) ? studentAnswer.join(', ') : (studentAnswer || 'Not answered')}
                                </p>
                              </div>
                              <div className="p-3 bg-blue-50/50 rounded-lg">
                                <p className="text-blue-500 mb-1 font-medium">Correct Answer:</p>
                                <p className="font-semibold text-blue-900">
                                  {Array.isArray(correctAnswers) ? correctAnswers.join(', ') : correctAnswers}
                                </p>
                              </div>
                            </div>

                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              <button
                onClick={onBackToHome}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" />
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
}
