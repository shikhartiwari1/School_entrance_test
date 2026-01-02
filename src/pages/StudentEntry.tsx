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

      // We need testId to validate specific keys, but for master key or general lookup we might not?
      // Actually validateRetestKey takes testId. But if we haven't selected a test yet?
      // The prompt says "Have a Retest Key? Click here" before start test button.
      // Usually retest key is tied to a test.
      // If the user enters a key, we can look it up without testId?
      // My `validateRetestKey` implementation takes `testId`.
      // I should probably allow lookup by key alone to find the test.
      // But for now, let's assume the user selects the test first OR we modify validateRetestKey.
      // Getting testId from UI if selected.

      const testIdToUse = selectedTest?.id;
      // If no test selected, maybe we find the key in DB and set the test?
      // But I'll stick to validating against selected test if available, or error.
      // Actually, better UX: Find key, set test.

      // For now, let's require test selection or try to find it.
      // Let's modify logic: If master key, just mark as valid.
      if (retestKeyInput === 'Azneeta-entrance_retest') {
        setRetestKeyValidated(true);
        setIsMasterKey(true);
        setShowRetestModal(false);
        return;
      }

      if (!testIdToUse) {
        // Try to find the key globally?
        const { data: keyData } = await (supabase
          .from('retest_keys')
          .select('*, tests(*)')
          .eq('key', retestKeyInput)
          .maybeSingle() as any);

        if (keyData) {
          // Found it
          setSelectedTest(keyData.tests as any);
          setStudentName(keyData.student_name); // Pre-fill name
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

  const handleSubmit = async (e: React.FormEvent) => {
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
          validation.slotNumber, // Use the authoritative slot number from the valid code
          studentName.trim(),
          fatherName.trim()
        );

        if (alreadyAttempted) {
          throw new Error('You have already attempted this test in this time slot. Use a retest key if applicable.');
        }
      }

      onStartTest(
        selectedTest.id,
        studentName.trim(),
        fatherName.trim(),
        classApplyingFor,
        activeRetestKeyId, // Pass the key ID
        isMasterKey
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const classes = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="animate-pulse">Loading tests...</div>
            </div>
          ) : tests.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <p className="text-gray-600">No tests are currently available.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 relative">
              {/* Retest status indicator */}
              {retestKeyValidated && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-800 font-medium text-sm md:text-base">
                    <CheckCircle className="w-5 h-5" />
                    <span>Retest Key Applied {isMasterKey ? '(Teacher Override)' : ''}</span>
                  </div>
                  <button
                    onClick={() => {
                      setRetestKeyValidated(false);
                      setActiveRetestKeyId(undefined);
                      setIsMasterKey(false);
                      setRetestKeyInput('');
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Remove
                  </button>
                </div>
              )}

              <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-4 md:mb-6">Student Information</h2>

              {error && (
                <div className="mb-4 md:mb-6 bg-red-50 border border-red-200 rounded-lg p-3 md:p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-red-800 text-sm md:text-base">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                    Select Test <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedTest?.id || ''}
                    onChange={(e) => {
                      const test = tests.find((t) => t.id === e.target.value);
                      setSelectedTest(test || null);
                    }}
                    className="w-full px-3 py-2.5 md:px-4 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm md:text-base"
                    required
                  >
                    <option value="">-- Select a test --</option>
                    {tests.map((test) => (
                      <option key={test.id} value={test.id}>
                        {test.title}
                      </option>
                    ))}
                  </select>
                  {selectedTest && (
                    <div className="mt-3 p-3 md:p-4 bg-blue-50 rounded-lg">
                      <p className="text-xs md:text-sm text-gray-700">
                        <span className="font-medium">Duration:</span> {selectedTest.duration_minutes} minutes
                      </p>
                      <p className="text-xs md:text-sm text-gray-700">
                        <span className="font-medium">Total Marks:</span> {selectedTest.total_marks}
                      </p>
                      {selectedTest.description && (
                        <p className="text-xs md:text-sm text-gray-700 mt-2">{selectedTest.description}</p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                    Student Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full px-3 py-2.5 md:px-4 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm md:text-base"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                    Father's Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    className="w-full px-3 py-2.5 md:px-4 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm md:text-base"
                    placeholder="Enter your father's name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                    Class Applying For <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={classApplyingFor}
                    onChange={(e) => setClassApplyingFor(e.target.value)}
                    className="w-full px-3 py-2.5 md:px-4 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm md:text-base"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                    Access Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2.5 md:px-4 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono tracking-wider text-center text-base md:text-lg"
                    placeholder="Enter 6-char code"
                    maxLength={6}
                    required
                  />
                  <p className="text-[10px] md:text-xs text-gray-500 mt-2">
                    Contact your exam invigilator for the access code
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowRetestModal(true)}
                  className="text-blue-600 text-xs md:text-sm font-medium hover:underline flex items-center gap-1"
                >
                  <Key className="w-4 h-4" /> Have a Retest Key? Click here
                </button>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 md:p-4">
                  <h3 className="font-semibold text-yellow-900 mb-1 md:mb-2 text-sm md:text-base">Important Instructions:</h3>
                  <ul className="text-[11px] md:text-sm text-yellow-800 space-y-1 list-disc list-inside">
                    <li>Full screen mode is required to start the test</li>
                    <li>Do not switch tabs or minimize the window</li>
                    <li>Exiting fullscreen <strong>more than 2 times</strong> will auto-submit</li>
                    <li>Right-click, copy, and paste are disabled</li>
                    <li>All violations are recorded as malpractice</li>
                  </ul>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 md:py-3 px-6 rounded-lg transition duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                >
                  {submitting ? 'Validating...' : 'Start Test'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Retest Modal */}
      {showRetestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Enter Retest Key</h3>
              <button onClick={() => setShowRetestModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={retestKeyInput}
              onChange={(e) => setRetestKeyInput(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-4"
              placeholder="Paste your 8-char key"
            />
            <button
              onClick={handleRetestKeySubmit}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              Apply Key
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


