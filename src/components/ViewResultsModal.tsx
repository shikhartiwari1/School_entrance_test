import { useState, useEffect } from 'react';
import { X, Download, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { exportToExcel } from '../lib/excelExport';
import type { Database } from '../lib/database.types';

type Submission = Database['public']['Tables']['submissions']['Row'];
type Test = Database['public']['Tables']['tests']['Row'];

interface ViewResultsModalProps {
  testId: string;
  onClose: () => void;
}

export default function ViewResultsModal({ testId, onClose }: ViewResultsModalProps) {
  const [test, setTest] = useState<Test | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [testId]);

  const loadData = async () => {
    try {
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (testError) throw testError;
      setTest(testData);

      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select('*')
        .eq('test_id', testId)
        .order('submitted_at', { ascending: false });

      if (submissionsError) throw submissionsError;
      setSubmissions(submissionsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (submissions.length > 0) {
      exportToExcel(submissions);
    } else {
      alert('No submissions to export');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Completed</span>;
      case 'auto_submitted':
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Auto-Submitted</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">In Progress</span>;
    }
  };

  const malpracticeCount = submissions.filter((s) => s.malpractice_detected).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Test Results</h2>
            {test && <p className="text-gray-600 mt-1">{test.title}</p>}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleExport}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export to Excel
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-auto flex-1">
          {loading ? (
            <div className="text-center py-8 text-gray-600">Loading results...</div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-8 text-gray-600">No submissions yet for this test.</div>
          ) : (
            <>
              <div className="grid grid-cols-5 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Total Submissions</p>
                  <p className="text-2xl font-bold text-blue-600">{submissions.length}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Average Score</p>
                  <p className="text-2xl font-bold text-green-600">
                    {(
                      submissions.reduce((sum, s) => sum + s.percentage, 0) / submissions.length
                    ).toFixed(1)}
                    %
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Passed</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {submissions.filter((s) => s.percentage >= (test?.passing_percentage || 40)).length}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Failed</p>
                  <p className="text-2xl font-bold text-red-600">
                    {submissions.filter((s) => s.percentage < (test?.passing_percentage || 40)).length}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Malpractice Detected</p>
                  <p className="text-2xl font-bold text-orange-600">{malpracticeCount}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Student Code
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Student Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Father's Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Class
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Slot
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Score
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Percentage
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Malpractice
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Tab Switches
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Time Taken
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Submitted At
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {submissions.map((submission) => (
                      <tr key={submission.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono font-bold text-blue-600">
                          {submission.student_code || 'N/A'}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {submission.student_name}
                          {submission.retest_key_used && (
                            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
                              (Retest)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {submission.father_name || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {submission.class_applying_for}
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-gray-900">
                          {submission.slot_number || 'N/A'}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {submission.score}/{submission.total_marks}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`font-semibold ${submission.percentage >= (test?.passing_percentage || 40)
                              ? 'text-green-600'
                              : 'text-red-600'
                              }`}
                          >
                            {submission.percentage.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {submission.malpractice_detected ? (
                            <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded font-semibold w-fit">
                              <AlertCircle className="w-4 h-4" />
                              Yes
                            </span>
                          ) : (
                            <span className="text-gray-500">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`font-medium ${submission.tab_switch_count === 0
                              ? 'text-green-600'
                              : submission.tab_switch_count === 1
                                ? 'text-yellow-600'
                                : 'text-red-600'
                              }`}
                          >
                            {submission.tab_switch_count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 font-mono">
                          {formatTime(submission.time_taken_seconds || 0)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {submission.submitted_at
                            ? new Date(submission.submitted_at).toLocaleString()
                            : '-'}
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(submission.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
