import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Test = Database['public']['Tables']['tests']['Row'];
type Question = Database['public']['Tables']['questions']['Insert'];

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

  const addOption = (questionIndex: number) => {
    const updated = [...questions];
    const options = [...(updated[questionIndex].options as string[])];
    options.push(`Option ${options.length + 1}`);
    updated[questionIndex].options = options;
    setQuestions(updated);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    const options = (updated[questionIndex].options as string[]).filter((_, i) => i !== optionIndex);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {test ? 'Edit Test' : 'Create New Test'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter test title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter test description"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passing Percentage
                </label>
                <input
                  type="number"
                  value={passingPercentage}
                  onChange={(e) => setPassingPercentage(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  max="100"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Questions</h3>
                <button
                  onClick={addNewQuestion}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Question
                </button>
              </div>

              <div className="space-y-6">
                {questions.map((q, qIndex) => (
                  <div key={qIndex} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="font-medium text-gray-900">Question {qIndex + 1}</h4>
                      <button
                        onClick={() => removeQuestion(qIndex)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Question Type
                          </label>
                          <select
                            value={q.question_type}
                            onChange={(e) => updateQuestion(qIndex, 'question_type', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            {questionTypes.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Marks
                          </label>
                          <input
                            type="number"
                            value={q.marks}
                            onChange={(e) =>
                              updateQuestion(qIndex, 'marks', parseInt(e.target.value) || 1)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            min="1"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Question Text
                        </label>
                        <textarea
                          value={q.question_text}
                          onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          rows={2}
                          placeholder="Enter question text"
                        />
                      </div>

                      {(q.question_type === 'mcq_single' ||
                        q.question_type === 'mcq_multiple' ||
                        q.question_type === 'true_false') && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Options
                            </label>
                            <div className="space-y-2">
                              {(q.options as string[]).map((option, oIndex) => (
                                <div key={oIndex} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => updateOptions(qIndex, oIndex, e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder={`Option ${oIndex + 1}`}
                                  />
                                  {q.question_type !== 'true_false' && (q.options as string[]).length > 2 && (
                                    <button
                                      onClick={() => removeOption(qIndex, oIndex)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              {q.question_type !== 'true_false' && (
                                <button
                                  onClick={() => addOption(qIndex)}
                                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                >
                                  + Add Option
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Correct Answer(s)
                        </label>
                        {q.question_type === 'mcq_single' || q.question_type === 'true_false' ? (
                          <select
                            value={(q.correct_answers as string[])[0] || ''}
                            onChange={(e) => updateQuestion(qIndex, 'correct_answers', [e.target.value])}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            {(q.options as string[]).map((option, oIndex) => (
                              <option key={oIndex} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : q.question_type === 'mcq_multiple' ? (
                          <div className="space-y-2">
                            {(q.options as string[]).map((option, oIndex) => (
                              <label key={oIndex} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={(q.correct_answers as string[]).includes(option)}
                                  onChange={(e) => {
                                    const currentAnswers = q.correct_answers as string[];
                                    const newAnswers = e.target.checked
                                      ? [...currentAnswers, option]
                                      : currentAnswers.filter((a) => a !== option);
                                    updateQuestion(qIndex, 'correct_answers', newAnswers);
                                  }}
                                  className="w-4 h-4 text-blue-600 rounded"
                                />
                                <span className="text-gray-700">{option}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={(q.correct_answers as string[])[0] || ''}
                            onChange={(e) => updateQuestion(qIndex, 'correct_answers', [e.target.value])}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter correct answer"
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Review/Explanation (optional)
                        </label>
                        <textarea
                          value={q.explanation || ''}
                          onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          rows={2}
                          placeholder="Provide an explanation for the correct answer"
                        />
                      </div>

                      {q.question_type === 'fill_blank' && (
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={q.is_case_sensitive}
                            onChange={(e) =>
                              updateQuestion(qIndex, 'is_case_sensitive', e.target.checked)
                            }
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm text-gray-700">Case sensitive</span>
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Test'}
          </button>
        </div>
      </div>
    </div>
  );
}
