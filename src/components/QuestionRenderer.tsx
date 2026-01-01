import type { Database } from '../lib/database.types';

type Question = Database['public']['Tables']['questions']['Row'];

interface QuestionRendererProps {
  question: Question;
  answer: any;
  onAnswerChange: (answer: any) => void;
  displayNumber?: number;
}

export default function QuestionRenderer({
  question,
  answer,
  onAnswerChange,
  displayNumber,
}: QuestionRendererProps) {
  const options = (question.options as string[]) || [];

  const renderQuestion = () => {
    switch (question.question_type) {
      case 'mcq_single':
        return (
          <div className="space-y-3">
            {options.map((option, idx) => (
              <label
                key={idx}
                className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-blue-50 cursor-pointer transition"
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={answer === option}
                  onChange={(e) => onAnswerChange(e.target.value)}
                  className="w-5 h-5 text-blue-600"
                />
                <span className="ml-3 text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'mcq_multiple':
        const selectedOptions = Array.isArray(answer) ? answer : [];
        return (
          <div className="space-y-3">
            {options.map((option, idx) => (
              <label
                key={idx}
                className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-blue-50 cursor-pointer transition"
              >
                <input
                  type="checkbox"
                  value={option}
                  checked={selectedOptions.includes(option)}
                  onChange={(e) => {
                    const newSelection = e.target.checked
                      ? [...selectedOptions, option]
                      : selectedOptions.filter((o) => o !== option);
                    onAnswerChange(newSelection);
                  }}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <span className="ml-3 text-gray-700">{option}</span>
              </label>
            ))}
            <p className="text-sm text-gray-500 italic">Select all that apply</p>
          </div>
        );

      case 'fill_blank':
        return (
          <input
            type="text"
            value={answer || ''}
            onChange={(e) => onAnswerChange(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="Type your answer here"
          />
        );

      case 'true_false':
        return (
          <div className="space-y-3">
            <label className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-blue-50 cursor-pointer transition">
              <input
                type="radio"
                name={question.id}
                value="true"
                checked={answer === 'true'}
                onChange={(e) => onAnswerChange(e.target.value)}
                className="w-5 h-5 text-blue-600"
              />
              <span className="ml-3 text-gray-700">True</span>
            </label>
            <label className="flex items-center p-4 border border-gray-300 rounded-lg hover:bg-blue-50 cursor-pointer transition">
              <input
                type="radio"
                name={question.id}
                value="false"
                checked={answer === 'false'}
                onChange={(e) => onAnswerChange(e.target.value)}
                className="w-5 h-5 text-blue-600"
              />
              <span className="ml-3 text-gray-700">False</span>
            </label>
          </div>
        );

      case 'numerical':
        return (
          <input
            type="number"
            value={answer || ''}
            onChange={(e) => onAnswerChange(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="Enter numerical answer"
          />
        );

      case 'short_answer':
        return (
          <input
            type="text"
            value={answer || ''}
            onChange={(e) => onAnswerChange(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="Type your answer here"
            maxLength={200}
          />
        );

      case 'paragraph':
        return (
          <textarea
            value={answer || ''}
            onChange={(e) => onAnswerChange(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            placeholder="Type your detailed answer here"
            rows={6}
          />
        );

      default:
        return <p className="text-red-500">Unknown question type</p>;
    }
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex-1">
            Q{displayNumber || question.question_number}. {question.question_text}
          </h2>
          <span className="ml-4 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium whitespace-nowrap">
            {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
          </span>
        </div>
      </div>

      {renderQuestion()}
    </div>
  );
}
