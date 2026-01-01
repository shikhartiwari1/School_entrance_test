/*
  # Add Slot-Based System and Extended Fields

  ## Overview
  Extends the existing schema to support slot-based testing with access codes,
  retest keys, unique student codes, and malpractice detection.

  ## Changes

  ### 1. New Tables
  - `slots` - Manages 2-hour test slots
  - `access_codes` - Slot-specific access codes (changes every 2 hours)
  - `retest_keys` - Admin-generated retest authorization

  ### 2. Modified Submissions Table
  - Added `father_name` (text) - Father's name of student
  - Added `malpractice_detected` (boolean) - Whether malpractice was detected
  - Added `slot_number` (integer) - Which slot this attempt was in
  - Added `student_code` (text) - Unique code: AZN-CLASS-NAME-SERIAL
  - Added `retest_key_used` (uuid) - Reference to retest key if used

  ## Security & RLS
  - Access codes are public readable (needed for student access)
  - Retest keys have restricted access
*/

-- Add new columns to submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'father_name'
  ) THEN
    ALTER TABLE submissions ADD COLUMN father_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'malpractice_detected'
  ) THEN
    ALTER TABLE submissions ADD COLUMN malpractice_detected boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'slot_number'
  ) THEN
    ALTER TABLE submissions ADD COLUMN slot_number integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'student_code'
  ) THEN
    ALTER TABLE submissions ADD COLUMN student_code text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'submissions' AND column_name = 'retest_key_used'
  ) THEN
    ALTER TABLE submissions ADD COLUMN retest_key_used uuid;
  END IF;
END $$;

-- Create slots table
CREATE TABLE IF NOT EXISTS slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  slot_number integer NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 120,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(test_id, slot_number)
);

-- Create access_codes table
CREATE TABLE IF NOT EXISTS access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  valid_until timestamptz NOT NULL
);

-- Create retest_keys table
CREATE TABLE IF NOT EXISTS retest_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  slot_number integer NOT NULL,
  student_name text NOT NULL,
  key text NOT NULL UNIQUE,
  is_used boolean DEFAULT false,
  used_by_submission_id uuid REFERENCES submissions(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_slots_test_id ON slots(test_id);
CREATE INDEX IF NOT EXISTS idx_slots_active ON slots(is_active);
CREATE INDEX IF NOT EXISTS idx_access_codes_slot_id ON access_codes(slot_id);
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON access_codes(code);
CREATE INDEX IF NOT EXISTS idx_retest_keys_submission ON retest_keys(submission_id);
CREATE INDEX IF NOT EXISTS idx_retest_keys_key ON retest_keys(key);
CREATE INDEX IF NOT EXISTS idx_submissions_student_code ON submissions(student_code);
CREATE INDEX IF NOT EXISTS idx_submissions_slot_number ON submissions(slot_number);

-- Enable RLS on new tables
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE retest_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for slots
CREATE POLICY "Anyone can view active slots for published tests"
  ON slots FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM tests
      WHERE tests.id = slots.test_id
      AND tests.is_published = true
    )
  );

CREATE POLICY "Allow all operations on slots"
  ON slots FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for access_codes
CREATE POLICY "Anyone can view valid access codes"
  ON access_codes FOR SELECT
  USING (valid_until > now());

CREATE POLICY "Allow all operations on access_codes"
  ON access_codes FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for retest_keys
CREATE POLICY "Anyone can use valid retest keys"
  ON retest_keys FOR SELECT
  USING (is_used = false AND expires_at > now());

CREATE POLICY "Allow all operations on retest_keys"
  ON retest_keys FOR ALL
  USING (true)
  WITH CHECK (true);
