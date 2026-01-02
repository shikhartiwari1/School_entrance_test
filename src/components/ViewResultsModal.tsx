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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-white rounded-2xl w-full max-w-7xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-4 md:px-8 py-4 md:py-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-20">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Test Results</h2>
            {test && <p className="text-[10px] md:text-sm text-gray-500 mt-1 uppercase tracking-wider font-semibold">{test.title}</p>}
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={handleExport}
              className="hidden sm:flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-xl transition shadow-lg shadow-green-500/20 active:scale-95 text-xs md:text-sm"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
            >
              <X className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-6 md:space-y-10">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 animate-in slide-in-from-bottom-4 duration-300">
                <div className="bg-blue-50/50 p-4 md:p-6 rounded-2xl border border-blue-100/50">
                  <p className="text-[10px] md:text-xs font-bold text-blue-600 uppercase tracking-widest mb-1 md:mb-2 text-center md:text-left">Total Submissions</p>
                  <p className="text-xl md:text-3xl font-bold text-gray-900 text-center md:text-left">{submissions.length}</p>
                </div>
                <div className="bg-green-50/50 p-4 md:p-6 rounded-2xl border border-green-100/50">
                  <p className="text-[10px] md:text-xs font-bold text-green-600 uppercase tracking-widest mb-1 md:mb-2 text-center md:text-left">Average Score</p>
                  <p className="text-xl md:text-3xl font-bold text-gray-900 text-center md:text-left">
                    {submissions.length > 0
                      ? Math.round(submissions.reduce((acc, s) => acc + (s.percentage || 0), 0) / submissions.length)
                      : 0}%
                  </p>
                </div>
                <div className="bg-red-50/50 p-4 md:p-6 rounded-2xl border border-red-100/50">
                  <p className="text-[10px] md:text-xs font-bold text-red-600 uppercase tracking-widest mb-1 md:mb-2 text-center md:text-left">Malpractice Detected</p>
                  <p className="text-xl md:text-3xl font-bold text-gray-900 text-center md:text-left">{malpracticeCount}</p>
                </div>
                <div className="bg-purple-50/50 p-4 md:p-6 rounded-2xl border border-purple-100/50 text-center md:text-left">
                  <p className="text-[10px] md:text-xs font-bold text-purple-600 uppercase tracking-widest mb-1 md:mb-2">Admin Actions</p>
                  <button onClick={handleExport} className="text-xs md:text-sm font-bold text-purple-700 hover:underline">
                    Download Report
                  </button>
                </div>
              </div>

              {/* Submissions Table */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm animate-in slide-in-from-bottom-4 duration-400 delay-75">
                <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-sm md:text-lg font-bold text-gray-900">Detailed Submissions</h3>
                  <button
                    onClick={handleExport}
                    className="sm:hidden flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-xl transition text-xs"
                  >
                    <Download className="w-4 h-4" />
                    Export Excel
                  </button>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  {submissions.length === 0 ? (
                    <div className="p-8 md:p-12 text-center">
                      <AlertCircle className="w-10 h-10 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-sm md:text-lg text-gray-500 font-medium">No results found for this test yet.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left whitespace-nowrap">
                      <thead>
                        <tr className="bg-white border-b border-gray-100">
                          <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">Student Info</th>
                          <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">Date/Time</th>
                          <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">Score</th>
                          <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">Details</th>
                          <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">Security</th>
                          <th className="px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {submissions.map((s) => (
                          <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 md:px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm md:text-base font-bold text-gray-900 flex items-center gap-2">
                                  {s.student_name}
                                  {s.retest_key_used && (
                                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[8px] md:text-[10px] rounded-full font-bold uppercase tracking-tighter">Retest</span>
                                  )}
                                </span>
                                <span className="text-[10px] md:text-xs text-gray-500 font-mono tracking-wider">{s.student_code}</span>
                                <span className="text-[9px] text-gray-400">Class: {s.class_applying_for} | Slot: {s.slot_number || 'N/A'}</span>
                              </div>
                            </td>
                            <td className="px-4 md:px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm text-gray-700 font-medium">{s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : 'N/A'}</span>
                                <span className="text-[10px] text-gray-500 font-mono">{s.submitted_at ? new Date(s.submitted_at).toLocaleTimeString() : '-'}</span>
                              </div>
                            </td>
                            <td className="px-4 md:px-6 py-4">
                              <div className="flex flex-col">
                                <span className={`text-base md:text-lg font-bold ${(s.percentage || 0) >= (test?.passing_percentage || 40) ? 'text-green-600' : 'text-red-600'}`}>
                                  {(s.percentage || 0).toFixed(1)}%
                                </span>
                                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">{s.score}/{s.total_marks} Marks</span>
                              </div>
                            </td>
                            <td className="px-4 md:px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs text-gray-600 font-bold uppercase tracking-tighter">Time: {formatTime(s.time_taken_seconds || 0)}</span>
                                {s.father_name && <span className="text-[9px] text-gray-500 italic">Father: {s.father_name}</span>}
                              </div>
                            </td>
                            <td className="px-4 md:px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest w-fit border ${s.malpractice_detected ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                                  {s.malpractice_detected ? 'Malpractice' : 'Secure'}
                                </span>
                                {s.tab_switch_count !== undefined && (
                                  <span className={`text-[9px] font-bold ${s.tab_switch_count > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                                    {s.tab_switch_count} Tab Switches
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 md:px-6 py-4">
                              {getStatusBadge(s.status || '')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div >
  );
}
