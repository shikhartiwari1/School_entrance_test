-- Add explanation column to questions table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS explanation TEXT DEFAULT '';
