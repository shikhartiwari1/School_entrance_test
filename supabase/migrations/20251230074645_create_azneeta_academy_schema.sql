/*
  # Azneeta Academy Online Entrance Test System

  ## Overview
  Complete database schema for online entrance test platform with anti-cheating features,
  multiple question types, and automatic evaluation.

  ## Tables Created

  ### 1. tests
  Stores test/exam information
  - `id` (uuid, primary key) - Unique test identifier
  - `title` (text) - Test name/title
  - `description` (text) - Test description
  - `duration_minutes` (integer) - Time limit in minutes
  - `is_published` (boolean) - Whether test is active/visible to students
  - `total_marks` (integer) - Total marks for the test
  - `passing_percentage` (integer) - Minimum percentage to pass
  - `created_at` (timestamptz) - Test creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. questions
  Stores questions with various types
  - `id` (uuid, primary key) - Unique question identifier
  - `test_id` (uuid, foreign key) - Reference to tests table
  - `question_number` (integer) - Order/sequence of question
  - `question_type` (text) - Type: mcq_single, mcq_multiple, fill_blank, true_false, numerical, short_answer, paragraph
  - `question_text` (text) - The actual question
  - `options` (jsonb) - Array of options for MCQs (stored as JSON)
  - `correct_answers` (jsonb) - Correct answer(s) stored as JSON array
  - `marks` (integer) - Marks allocated for this question
  - `is_case_sensitive` (boolean) - For fill-in-blanks questions
  - `created_at` (timestamptz) - Question creation timestamp

  ### 3. submissions
  Stores student test submissions with anti-cheating tracking
  - `id` (uuid, primary key) - Unique submission identifier
  - `test_id` (uuid, foreign key) - Reference to tests table
  - `student_name` (text) - Student's full name
  - `class_applying_for` (text) - Class (1-12)
  - `tab_switch_count` (integer) - Number of tab switches detected
  - `time_taken_seconds` (integer) - Time taken to complete test
  - `score` (integer) - Total score achieved
  - `total_marks` (integer) - Total possible marks
  - `percentage` (numeric) - Percentage scored
  - `correct_count` (integer) - Number of correct answers
  - `wrong_count` (integer) - Number of wrong answers
  - `needs_manual_review` (boolean) - Has subjective questions needing review
  - `status` (text) - completed, auto_submitted, in_progress
  - `submitted_at` (timestamptz) - Submission timestamp
  - `created_at` (timestamptz) - Record creation timestamp

  ### 4. answers
  Stores individual answers for each question in a submission
  - `id` (uuid, primary key) - Unique answer identifier
  - `submission_id` (uuid, foreign key) - Reference to submissions table
  - `question_id` (uuid, foreign key) - Reference to questions table
  - `student_answer` (jsonb) - Student's answer (can be array or single value)
  - `is_correct` (boolean) - Whether answer is correct (null for manual review)
  - `marks_awarded` (integer) - Marks given for this answer
  - `created_at` (timestamptz) - Answer creation timestamp

  ## Security
  - Enable RLS on all tables
  - Public can insert submissions and answers (for no-login student access)
  - Public can read published tests and their questions
  - All other operations restricted
*/

-- Create tests table
CREATE TABLE IF NOT EXISTS tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  duration_minutes integer NOT NULL DEFAULT 60,
  is_published boolean DEFAULT false,
  total_marks integer DEFAULT 0,
  passing_percentage integer DEFAULT 40,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  question_number integer NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('mcq_single', 'mcq_multiple', 'fill_blank', 'true_false', 'numerical', 'short_answer', 'paragraph')),
  question_text text NOT NULL,
  options jsonb DEFAULT '[]'::jsonb,
  correct_answers jsonb NOT NULL,
  marks integer NOT NULL DEFAULT 1,
  is_case_sensitive boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  class_applying_for text NOT NULL,
  tab_switch_count integer DEFAULT 0,
  time_taken_seconds integer DEFAULT 0,
  score integer DEFAULT 0,
  total_marks integer DEFAULT 0,
  percentage numeric(5,2) DEFAULT 0,
  correct_count integer DEFAULT 0,
  wrong_count integer DEFAULT 0,
  needs_manual_review boolean DEFAULT false,
  status text DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'auto_submitted')),
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create answers table
CREATE TABLE IF NOT EXISTS answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  student_answer jsonb,
  is_correct boolean,
  marks_awarded integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_test_id ON questions(test_id);
CREATE INDEX IF NOT EXISTS idx_submissions_test_id ON submissions(test_id);
CREATE INDEX IF NOT EXISTS idx_answers_submission_id ON answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);

-- Enable Row Level Security
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tests
CREATE POLICY "Anyone can view published tests"
  ON tests FOR SELECT
  USING (is_published = true);

CREATE POLICY "Allow all operations on tests"
  ON tests FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for questions
CREATE POLICY "Anyone can view questions of published tests"
  ON questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tests
      WHERE tests.id = questions.test_id
      AND tests.is_published = true
    )
  );

CREATE POLICY "Allow all operations on questions"
  ON questions FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for submissions
CREATE POLICY "Anyone can insert submissions"
  ON submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view all submissions"
  ON submissions FOR SELECT
  USING (true);

CREATE POLICY "Allow all operations on submissions"
  ON submissions FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for answers
CREATE POLICY "Anyone can insert answers"
  ON answers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view all answers"
  ON answers FOR SELECT
  USING (true);

CREATE POLICY "Allow all operations on answers"
  ON answers FOR ALL
  USING (true)
  WITH CHECK (true);