import { useState, useEffect } from 'react';
import { AlertCircle, Key, X, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  validateAccessCode,
  checkAlreadyAttempted,
  validateRetestKey
} from '../lib/slotManagement';
import type { Database } from '../lib/database.types';

type Test = Database['public']['Tables']['tests']['Row'];

interface StudentEntryProps {
  onStartTest: (
    testId: string,
    studentName: string,
    fatherName: string,
    classApplyingFor: string,
    retestKeyId?: string,
    isMasterKey?: boolean
  ) => void;
}

export default function StudentEntry({ onStartTest }: StudentEntryProps) {
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [studentName, setStudentName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [classApplyingFor, setClassApplyingFor] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Retest state
  const [showRetestModal, setShowRetestModal] = useState(false);
  const [retestKeyInput, setRetestKeyInput] = useState('');
  const [retestKeyValidated, setRetestKeyValidated] = useState(false);
  const [activeRetestKeyId, setActiveRetestKeyId] = useState<string | undefined>(undefined);
  const [isMasterKey, setIsMasterKey] = useState(false);

  const [step, setStep] = useState<'form' | 'instructions'>('form');

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTests(data || []);
    } catch (error) {
      console.error('Error loading tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetestKeySubmit = async () => {
    setError('');
    try {
      if (!retestKeyInput.trim()) throw new Error("Enter a key");

      const testIdToUse = selectedTest?.id;

      if (retestKeyInput === 'Azneeta-entrance_retest') {
        setRetestKeyValidated(true);
        setIsMasterKey(true);
        setShowRetestModal(false);
        return;
      }

      if (!testIdToUse) {
        const { data: keyData } = await (supabase
          .from('retest_keys')
          .select('*, tests(*)')
          .eq('key', retestKeyInput)
          .maybeSingle() as any);

        if (keyData) {
          setSelectedTest(keyData.tests as any);
          setStudentName(keyData.student_name);
          setActiveRetestKeyId(keyData.id);
          setRetestKeyValidated(true);
          setShowRetestModal(false);
          return;
        } else {
          throw new Error("Invalid key or Test not identified. Please select a test first.");
        }
      }

      const validation = await validateRetestKey(retestKeyInput, testIdToUse);
      if (!validation.valid) throw new Error("Invalid or expired retest key");

      setActiveRetestKeyId(validation.retestKeyId);
      if (validation.studentName) setStudentName(validation.studentName);
      setIsMasterKey(false);
      setRetestKeyValidated(true);
      setShowRetestModal(false);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid key');
    }
  };

  const handleProceed = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (!selectedTest || !studentName.trim() || !fatherName.trim() || !classApplyingFor) {
        throw new Error('Please fill all required fields');
      }

      if (!accessCode.trim()) {
        throw new Error('Please enter the access code');
      }

      // Validate access code
      const validation = await validateAccessCode(selectedTest.id, accessCode.trim().toUpperCase());

      if (!validation.valid) {
        throw new Error(validation.reason || 'Invalid or expired access code');
      }

      // Check for previous attempts unless retest key is active
      if (!retestKeyValidated && !isMasterKey) {
        const alreadyAttempted = await checkAlreadyAttempted(
          selectedTest.id,
          validation.slotNumber,
          studentName.trim(),
          fatherName.trim()
        );

        if (alreadyAttempted) {
          throw new Error('You have already attempted this test in this time slot. Use a retest key if applicable.');
        }
      }

      // If all good, move to instructions
      setStep('instructions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const finalStartTest = () => {
    if (!selectedTest) return;
    onStartTest(
      selectedTest.id,
      studentName.trim(),
      fatherName.trim(),
      classApplyingFor,
      activeRetestKeyId,
      isMasterKey
    );
  };

  const classes = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className={`${step === 'form' ? 'max-w-2xl' : 'max-w-4xl'} mx-auto transition-all duration-300`}>
          {loading ? (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="animate-pulse">Loading tests...</div>
            </div>
          ) : tests.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <p className="text-gray-600">No tests are currently available.</p>
            </div>
          ) : step === 'form' ? (
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 relative animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Retest status indicator */}
              {retestKeyValidated && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-800 font-medium text-xs md:text-sm">
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                    <span>Retest Key Applied {isMasterKey ? '(Teacher Override)' : ''}</span>
                  </div>
                  <button
                    onClick={() => {
                      setRetestKeyValidated(false);
                      setActiveRetestKeyId(undefined);
                      setIsMasterKey(false);
                      setRetestKeyInput('');
                    }}
                    className="text-[10px] text-blue-600 hover:text-blue-800 underline font-semibold"
                  >
                    Remove
                  </button>
                </div>
              )}

              <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 mb-4 md:mb-6">Student Registration</h2>

              {error && (
                <div className="mb-4 md:mb-6 bg-red-50 border border-red-200 rounded-xl p-3 md:p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-red-800 text-xs md:text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleProceed} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                      Select Test <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedTest?.id || ''}
                      onChange={(e) => {
                        const test = tests.find((t) => t.id === e.target.value);
                        setSelectedTest(test || null);
                      }}
                      className="w-full px-4 py-3 border border-gray-100 bg-gray-50 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition text-sm md:text-base font-medium"
                      required
                    >
                      <option value="">-- Select a test --</option>
                      {tests.map((test) => (
                        <option key={test.id} value={test.id}>
                          {test.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-100 bg-gray-50 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition text-sm font-medium"
                      placeholder="Your full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                      Father's Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-100 bg-gray-50 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition text-sm font-medium"
                      placeholder="Father's name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                      Class Level <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={classApplyingFor}
                      onChange={(e) => setClassApplyingFor(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-100 bg-gray-50 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition text-sm font-medium"
                      required
                    >
                      <option value="">-- Select class --</option>
                      {classes.map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                      Access Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 border border-gray-100 bg-gray-50 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition font-mono tracking-widest text-center text-sm md:text-base border-blue-100"
                      placeholder="6-DIGIT CODE"
                      maxLength={6}
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowRetestModal(true)}
                    className="text-blue-600 text-xs font-bold hover:text-blue-700 flex items-center gap-1.5 w-fit uppercase tracking-wider"
                  >
                    <Key className="w-3.5 h-3.5" /> Have a Retest Key?
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl transition duration-200 shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-widest"
                  >
                    {submitting ? 'Validating...' : 'Proceed to Instructions'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xl p-4 md:p-6 animate-in fade-in slide-in-from-right-4 duration-300 w-full">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-50">
                <h2 className="text-lg md:text-xl font-black text-gray-900 border-l-4 border-blue-600 pl-3">Test Instructions</h2>
                <button
                  onClick={() => setStep('form')}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition flex items-center gap-2"
                >
                  Edit Profile
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4 space-y-3">
                  {selectedTest && (
                    <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl text-white shadow-lg shadow-blue-500/20">
                      <h3 className="text-base font-bold mb-2 border-b border-blue-400/50 pb-1">{selectedTest.title}</h3>
                      <div className="space-y-2.5">
                        <div className="flex justify-between text-xs font-medium bg-blue-800/30 p-2 rounded-lg">
                          <span>Time Limit:</span>
                          <span className="font-bold">{selectedTest.duration_minutes} Mins</span>
                        </div>
                        <div className="flex justify-between text-xs font-medium bg-blue-800/30 p-2 rounded-lg">
                          <span>Total Marks:</span>
                          <span className="font-bold">{selectedTest.total_marks} Marks</span>
                        </div>
                      </div>
                      {selectedTest.description && (
                        <div className="mt-4 text-[11px] text-blue-100 leading-relaxed italic opacity-90 line-clamp-4">
                          "{selectedTest.description}"
                        </div>
                      )}
                    </div>
                  )}

                  <div className="hidden lg:block p-3 bg-orange-50 rounded-xl border border-orange-100">
                    <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest block mb-0.5">Ranking Info</span>
                    <p className="text-[10px] text-orange-800 leading-tight font-bold italic">
                      "Highest marks with fastest completion time secures top rank."
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-8 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      Safety Rules & Navigation
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-1.5">
                      {[
                        'Full screen mode is strictly required.',
                        'Rankings are based on total marks & submission time.',
                        'Navigate freely using sidebar buttons.',
                        'Review or skip questions anytime.',
                        'Do not switch tabs or minimize window.',
                        'Max 2 fullscreen exits allowed.',
                        'All violations flag as malpractice.'
                      ].map((inst, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 p-2 bg-gray-100/50 rounded-lg border border-gray-200/30 hover:bg-white hover:shadow-sm transition group">
                          <span className="flex-shrink-0 w-5 h-5 bg-white text-blue-600 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            {idx + 1}
                          </span>
                          <span className="text-[11px] md:text-sm text-gray-700 font-bold">{inst}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-50">
                    <button
                      onClick={finalStartTest}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 px-8 rounded-xl transition duration-200 shadow-xl shadow-blue-500/25 active:scale-95 text-base md:text-lg flex items-center justify-center gap-3"
                    >
                      Start Entrance Test
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <p className="text-center text-[10px] text-gray-400 mt-2 font-medium">
                      By starting, you agree to the conditions mentioned above.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}        </div>
      </div>

      {/* Retest Modal */}
      {showRetestModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Enter Retest Key</h3>
              <button
                onClick={() => setShowRetestModal(false)}
                className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Security Key</label>
              <input
                type="text"
                value={retestKeyInput}
                onChange={(e) => setRetestKeyInput(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-base font-mono"
                placeholder="Paste your 8-char key"
              />
            </div>
            <button
              onClick={handleRetestKeySubmit}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20"
            >
              Verify & Apply Key
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


