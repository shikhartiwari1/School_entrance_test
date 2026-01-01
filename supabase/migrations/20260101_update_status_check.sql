/*
  # Update Submissions Status Check Constraint

  ## Overview
  Updates the check constraint on the submissions table to include 'invalidated_by_retest' 
  as a valid status.

  ## Changes
  - Drop existing constraint `submissions_status_check`
  - Add new constraint with updated values
*/

DO $$
BEGIN
  -- Drop the existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'submissions_status_check' 
    AND conrelid = 'submissions'::regclass
  ) THEN
    ALTER TABLE submissions DROP CONSTRAINT submissions_status_check;
  END IF;

  -- Add the new constraint
  ALTER TABLE submissions 
    ADD CONSTRAINT submissions_status_check 
    CHECK (status IN ('in_progress', 'completed', 'auto_submitted', 'invalidated_by_retest'));
END $$;
