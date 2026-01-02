import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Test = Database['public']['Tables']['tests']['Row'];

interface Question {
  id?: string;
  test_id: string;
  question_number: number;
  question_type: string;
  question_text: string;
  options: string[];
  correct_answers: string[];
  marks: number;
  is_case_sensitive: boolean;
  explanation: string;
}

interface CreateTestModalProps {
  test: Test | null;
  onClose: () => void;
  onSuccess: () => void;
}

const questionTypes = [
  { value: 'mcq_single', label: 'Multiple Choice (Single)' },
  { value: 'mcq_multiple', label: 'Multiple Choice (Multiple)' },
  { value: 'fill_blank', label: 'Fill in the Blank' },
  { value: 'true_false', label: 'True/False' },
  { value: 'numerical', label: 'Numerical Answer' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'paragraph', label: 'Paragraph' },
];

export default function CreateTestModal({ test, onClose, onSuccess }: CreateTestModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [passingPercentage, setPassingPercentage] = useState(40);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (test) {
      setTitle(test.title);
      setDescription(test.description);
      setDurationMinutes(test.duration_minutes);
      setPassingPercentage(test.passing_percentage);
      loadQuestions(test.id);
    } else {
      addNewQuestion();
    }
  }, [test]);

  const loadQuestions = async (testId: string) => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .order('question_number', { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        setQuestions(data as Question[]);
      } else {
        addNewQuestion();
      }
    } catch (error) {
      console.error('Error loading questions:', error);
    }
  };

  const addNewQuestion = () => {
    const newQuestion: Question = {
      test_id: test?.id || '',
      question_number: questions.length + 1,
      question_type: 'mcq_single',
      question_text: '',
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      correct_answers: ['Option 1'],
      marks: 1,
      is_case_sensitive: false,
      explanation: '',
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (index: number) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated.map((q, i) => ({ ...q, question_number: i + 1 })));
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'question_type') {
      if (value === 'true_false') {
        updated[index].options = ['True', 'False'];
        updated[index].correct_answers = ['True'];
      } else if (value === 'mcq_single' || value === 'mcq_multiple') {
        if (!Array.isArray(updated[index].options) || updated[index].options.length === 0) {
          updated[index].options = ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
        }
        updated[index].correct_answers = [updated[index].options[0]];
      } else {
        updated[index].options = [];
        updated[index].correct_answers = [''];
      }
    }

    setQuestions(updated);
  };

  const updateOptions = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions];
    const options = [...(updated[questionIndex].options as string[])];
    options[optionIndex] = value;
    updated[questionIndex].options = options;
    setQuestions(updated);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a test title');
      return;
    }

    if (questions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    for (const q of questions) {
      if (!q.question_text.trim()) {
        alert('All questions must have text');
        return;
      }
    }

    setSaving(true);

    try {
      const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);

      let testId = test?.id;

      if (test) {
        const { error: updateError } = await (supabase.from('tests') as any)
          .update({
            title,
            description,
            duration_minutes: durationMinutes,
            passing_percentage: passingPercentage,
            total_marks: totalMarks,
            updated_at: new Date().toISOString(),
          })
          .eq('id', test.id);

        if (updateError) throw updateError;

        // Get current questions in DB to see what to delete
        const { data: existingData } = await (supabase.from('questions') as any)
          .select('id')
          .eq('test_id', test.id);

        const currentQuestionIds = questions.map(q => (q as any).id).filter(Boolean);
        const idsToDelete = (existingData as any[])
          ?.map(q => q.id)
          .filter(id => !currentQuestionIds.includes(id)) || [];

        if (idsToDelete.length > 0) {
          const { error: deleteError } = await (supabase.from('questions') as any)
            .delete()
            .in('id', idsToDelete);

          if (deleteError) {
            console.error('Delete error (might be existing answers):', deleteError);
            throw new Error('Cannot delete questions that already have student answers.');
          }
        }
      } else {
        const { data: newTest, error: insertError } = await (supabase.from('tests') as any)
          .insert({
            title,
            description,
            duration_minutes: durationMinutes,
            passing_percentage: passingPercentage,
            total_marks: totalMarks,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        testId = (newTest as any).id;
      }

      const questionsToUpsert = questions.map((q) => ({
        ...q,
        test_id: testId,
      }));

      const { error: questionsError } = await (supabase.from('questions') as any)
        .upsert(questionsToUpsert);

      if (questionsError) throw questionsError;

      onSuccess();
    } catch (error) {
      console.error('Error saving test:', error);
      alert('Failed to save test');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-4 md:px-8 py-4 md:py-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-20">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">{test ? 'Edit Test' : 'Create New Test'}</h2>
            <p className="text-[10px] md:text-sm text-gray-500 mt-1 uppercase tracking-wider font-semibold">Test Configuration</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-8 md:space-y-12">
            {/* Basic Info */}
            <section className="animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-2 mb-4 md:mb-6">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                <h3 className="text-lg md:text-xl font-bold text-gray-900">General Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                <div className="md:col-span-2">
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5 md:mb-2 uppercase tracking-wide">
                    Test Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2.5 md:px-5 md:py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all md:text-lg font-medium"
                    placeholder="e.g., Mathematics Entrance 2024"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5 md:mb-2 uppercase tracking-wide">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2.5 md:px-5 md:py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all min-h-[80px] md:min-h-[100px] text-sm md:text-base"
                    placeholder="Enter test description and instructions..."
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5 md:mb-2 uppercase tracking-wide">
                    Duration (Minutes) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
                    className="w-full px-3 py-2.5 md:px-5 md:py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm md:text-base"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5 md:mb-2 uppercase tracking-wide">
                    Passing Percentage <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={passingPercentage}
                    onChange={(e) => setPassingPercentage(parseInt(e.target.value))}
                    className="w-full px-3 py-2.5 md:px-5 md:py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm md:text-base"
                    min="1"
                    max="100"
                    required
                  />
                </div>
              </div>
            </section>

            {/* Questions Section */}
            <section className="animate-in slide-in-from-bottom-4 duration-400 delay-75">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8 bg-gray-50 p-4 md:p-6 rounded-2xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-gray-900">Questions</h3>
                    <p className="text-xs md:text-sm text-gray-500">{questions.length} total questions configured</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addNewQuestion}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold transition shadow-lg shadow-blue-500/20 active:scale-95 text-sm md:text-base"
                >
                  <Plus className="w-4 h-4 md:w-5 md:h-5" />
                  Add Question
                </button>
              </div>

              <div className="space-y-6 md:space-y-8">
                {questions.map((question, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-2xl md:rounded-[2rem] p-4 md:p-10 relative shadow-sm hover:shadow-md transition-all group animate-in slide-in-from-bottom-4 duration-300">
                    <div className="absolute -top-3 left-4 md:left-8 px-4 py-1.5 bg-gray-900 text-white text-[10px] md:text-xs font-bold rounded-full group-hover:bg-blue-600 transition-colors uppercase tracking-widest">
                      Q {index + 1}
                    </div>

                    <div className="flex flex-col gap-6 md:gap-10">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
                        <div className="lg:col-span-8">
                          <label className="block text-xs md:text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">Question Text</label>
                          <textarea
                            value={question.question_text}
                            onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                            className="w-full px-4 py-3 md:px-6 md:py-5 bg-gray-50 border border-gray-100 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm md:text-lg min-h-[100px] md:min-h-[120px]"
                            placeholder="Enter your question here..."
                            required
                          />
                        </div>
                        <div className="lg:col-span-4 space-y-4 md:space-y-6">
                          <div>
                            <label className="block text-xs md:text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">Question Type</label>
                            <select
                              value={question.question_type}
                              onChange={(e) => updateQuestion(index, 'question_type', e.target.value)}
                              className="w-full px-4 py-3 md:px-6 md:py-4 bg-gray-50 border border-gray-100 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm md:text-base font-semibold"
                            >
                              {questionTypes.map((type) => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs md:text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">Marks</label>
                            <input
                              type="number"
                              value={question.marks}
                              onChange={(e) => updateQuestion(index, 'marks', parseInt(e.target.value))}
                              className="w-full px-4 py-3 md:px-6 md:py-4 bg-gray-50 border border-gray-100 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm md:text-base font-semibold"
                              min="1"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      {/* Explanation Field */}
                      <div>
                        <label className="block text-xs md:text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">Correct Answer Explanation</label>
                        <textarea
                          value={question.explanation || ''}
                          onChange={(e) => updateQuestion(index, 'explanation', e.target.value)}
                          className="w-full px-4 py-3 md:px-6 md:py-4 bg-gray-50 border border-gray-100 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm md:text-base min-h-[80px]"
                          placeholder="Why is it the correct answer? (Optional)"
                        />
                      </div>

                      {/* Options and Correct Answers Logic */}
                      {(question.question_type === 'mcq_single' || question.question_type === 'mcq_multiple') && (
                        <div className="bg-gray-50/50 p-4 md:p-8 rounded-2xl md:rounded-[2rem] border border-gray-100/50">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 md:mb-6">
                            <h4 className="text-sm md:text-base font-bold text-gray-900 uppercase tracking-wide">Options & Correct Answers</h4>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...questions];
                                updated[index].options = [...(updated[index].options || []), `Option ${updated[index].options.length + 1}`];
                                setQuestions(updated);
                              }}
                              className="text-blue-600 text-xs md:text-sm font-bold hover:underline flex items-center gap-1.5"
                            >
                              <Plus className="w-4 h-4 font-bold" /> Add Option
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                            {question.options.map((option, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-3 bg-white p-2.5 md:p-3 rounded-xl border border-gray-100 shadow-sm group-hover:border-blue-100 transition-colors">
                                <input
                                  type={question.question_type === 'mcq_single' ? 'radio' : 'checkbox'}
                                  checked={question.correct_answers.includes(option)}
                                  onChange={() => {
                                    const updated = [...questions];
                                    if (question.question_type === 'mcq_single') {
                                      updated[index].correct_answers = [option];
                                    } else {
                                      const current = question.correct_answers;
                                      if (current.includes(option)) {
                                        updated[index].correct_answers = current.filter(a => a !== option);
                                      } else {
                                        updated[index].correct_answers = [...current, option];
                                      }
                                    }
                                    setQuestions(updated);
                                  }}
                                  className="w-4 h-4 md:w-5 md:h-5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) => {
                                    const updated = [...questions];
                                    const oldOption = updated[index].options[optIdx];
                                    updated[index].options[optIdx] = e.target.value;
                                    updated[index].correct_answers = updated[index].correct_answers.map(a => a === oldOption ? e.target.value : a);
                                    setQuestions(updated);
                                  }}
                                  className="flex-1 bg-transparent border-none outline-none text-sm md:text-base font-medium"
                                  placeholder={`Option ${optIdx + 1}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...questions];
                                    const removed = updated[index].options[optIdx];
                                    updated[index].options = updated[index].options.filter((_, i) => i !== optIdx);
                                    updated[index].correct_answers = updated[index].correct_answers.filter(a => a !== removed);
                                    setQuestions(updated);
                                  }}
                                  className="p-1.5 md:p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {question.question_type === 'true_false' && (
                        <div className="flex gap-4 md:gap-8 bg-gray-50/50 p-4 md:p-8 rounded-2xl md:rounded-[2rem] border border-gray-100/50">
                          {['True', 'False'].map((val) => (
                            <label key={val} className={`
                              flex-1 flex items-center justify-center gap-2 p-3 md:p-5 rounded-xl md:rounded-2xl border-2 transition-all cursor-pointer font-bold
                              ${question.correct_answers.includes(val)
                                ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30 scale-105'
                                : 'bg-white text-gray-400 border-gray-100 hover:border-blue-200'}
                            `}>
                              <input
                                type="radio"
                                className="hidden"
                                checked={question.correct_answers.includes(val)}
                                onChange={() => {
                                  const updated = [...questions];
                                  updated[index].correct_answers = [val];
                                  setQuestions(updated);
                                }}
                              />
                              <span className="text-sm md:text-xl">{val}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {(question.question_type === 'fill_blank' || question.question_type === 'numerical' || question.question_type === 'short_answer') && (
                        <div className="space-y-4 md:space-y-6 bg-gray-50/50 p-4 md:p-8 rounded-2xl md:rounded-[2rem] border border-gray-100/50">
                          <div>
                            <label className="block text-xs md:text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">Correct Answer <span className="text-red-500">*</span></label>
                            <input
                              type={question.question_type === 'numerical' ? 'number' : 'text'}
                              value={question.correct_answers[0]}
                              onChange={(e) => {
                                const updated = [...questions];
                                updated[index].correct_answers = [e.target.value];
                                setQuestions(updated);
                              }}
                              className="w-full px-4 py-3 md:px-6 md:py-4 bg-white border border-gray-100 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm md:text-base font-semibold shadow-sm"
                              placeholder="Enter correct answer..."
                              required
                            />
                          </div>
                          {question.question_type !== 'numerical' && (
                            <label className="flex items-center gap-3 cursor-pointer group">
                              <div className="relative flex items-center">
                                <input
                                  type="checkbox"
                                  checked={question.is_case_sensitive}
                                  onChange={(e) => updateQuestion(index, 'is_case_sensitive', e.target.checked)}
                                  className="w-4 h-4 md:w-5 md:h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                />
                              </div>
                              <span className="text-xs md:text-sm font-bold text-gray-600 group-hover:text-gray-900 transition-colors uppercase tracking-wide">Case Sensitive</span>
                            </label>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      className="absolute top-4 right-4 md:top-8 md:right-8 p-1.5 md:p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="Remove Question"
                    >
                      <Trash2 className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <div className="px-4 md:px-8 py-4 md:py-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white sticky bottom-0 z-20">
          <p className="text-xs md:text-sm text-gray-500 order-2 sm:order-1">All changes are saved upon clicking "Create/Update Test"</p>
          <div className="flex gap-3 w-full sm:w-auto order-1 sm:order-2">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 md:px-8 py-2.5 md:py-3.5 text-gray-500 font-bold hover:text-gray-900 transition-all text-sm md:text-base"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-8 md:px-12 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl font-bold shadow-xl shadow-blue-500/20 active:scale-95 transition-all text-sm md:text-base"
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving...
                </div>
              ) : test ? 'Update Test' : 'Create Test'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
