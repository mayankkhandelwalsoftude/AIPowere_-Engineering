-- Fix 1: Add evidence fields to learning_tasks
ALTER TABLE learning_tasks ADD COLUMN IF NOT EXISTS github_link TEXT;
ALTER TABLE learning_tasks ADD COLUMN IF NOT EXISTS pr_link TEXT;
ALTER TABLE learning_tasks ADD COLUMN IF NOT EXISTS demo_url TEXT;
ALTER TABLE learning_tasks ADD COLUMN IF NOT EXISTS jira_link TEXT;
ALTER TABLE learning_tasks ADD COLUMN IF NOT EXISTS certificate_url TEXT;
ALTER TABLE learning_tasks ADD COLUMN IF NOT EXISTS file_urls TEXT; -- JSON array of uploaded file URLs
ALTER TABLE learning_tasks ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE learning_tasks ADD COLUMN IF NOT EXISTS hours_spent NUMERIC(5,2) DEFAULT 0;
ALTER TABLE learning_tasks ADD COLUMN IF NOT EXISTS completion_percent INT DEFAULT 0;

-- Fix 2: Add detailed AI feedback to ai_evaluation_scores
ALTER TABLE ai_evaluation_scores ADD COLUMN IF NOT EXISTS learning_reason TEXT;
ALTER TABLE ai_evaluation_scores ADD COLUMN IF NOT EXISTS relevance_reason TEXT;
ALTER TABLE ai_evaluation_scores ADD COLUMN IF NOT EXISTS execution_reason TEXT;
ALTER TABLE ai_evaluation_scores ADD COLUMN IF NOT EXISTS delivery_reason TEXT;
ALTER TABLE ai_evaluation_scores ADD COLUMN IF NOT EXISTS authenticity_reason TEXT;
ALTER TABLE ai_evaluation_scores ADD COLUMN IF NOT EXISTS recommendations TEXT; -- JSON array
ALTER TABLE ai_evaluation_scores ADD COLUMN IF NOT EXISTS gaps TEXT; -- JSON array
ALTER TABLE ai_evaluation_scores ADD COLUMN IF NOT EXISTS strengths TEXT; -- JSON array
ALTER TABLE ai_evaluation_scores ADD COLUMN IF NOT EXISTS timeline_assessment TEXT;
ALTER TABLE ai_evaluation_scores ADD COLUMN IF NOT EXISTS overall_feedback TEXT;

-- Create Supabase Storage bucket for evidence files
-- Run this separately if needed:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('evidence', 'evidence', true);
