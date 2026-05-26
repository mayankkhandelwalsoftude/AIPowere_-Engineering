-- Migration: Add enhanced learning plan and task tracking fields
-- Run this AFTER the initial schema.sql

-- Add new columns to learning_plans
ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS plan_type TEXT CHECK (plan_type IN ('GenAI','AI Engineering','MLOps','Data Engineering','AI Agents','LLMOps','RAG','MCP','Cloud AI','AI Security','Custom'));
ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS learning_objectives TEXT;
ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS milestones TEXT;
ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS approval_notes TEXT;
ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS completion_percentage INT DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100);

-- Add new columns to learning_tasks
ALTER TABLE learning_tasks ADD COLUMN IF NOT EXISTS task_type TEXT CHECK (task_type IN ('Learning','Coding','Documentation','POC','Demo','Assessment','Certification','Project')) DEFAULT 'Learning';
ALTER TABLE learning_tasks ADD COLUMN IF NOT EXISTS hours_spent NUMERIC(5,2) DEFAULT 0;
ALTER TABLE learning_tasks ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE learning_tasks ADD COLUMN IF NOT EXISTS blockers TEXT;
ALTER TABLE learning_tasks ADD COLUMN IF NOT EXISTS deliverables TEXT;
ALTER TABLE learning_tasks ADD COLUMN IF NOT EXISTS github_link TEXT;
ALTER TABLE learning_tasks ADD COLUMN IF NOT EXISTS pr_link TEXT;
ALTER TABLE learning_tasks ADD COLUMN IF NOT EXISTS demo_url TEXT;
ALTER TABLE learning_tasks ADD COLUMN IF NOT EXISTS jira_link TEXT;
ALTER TABLE learning_tasks ADD COLUMN IF NOT EXISTS completed_date DATE;

-- Update task status enum to include new statuses
ALTER TABLE learning_tasks DROP CONSTRAINT IF EXISTS learning_tasks_status_check;
ALTER TABLE learning_tasks ADD CONSTRAINT learning_tasks_status_check CHECK (status IN ('Pending','In Progress','Done','Skipped','Blocked'));

-- Create activity_logs table for daily progress tracking
CREATE TABLE IF NOT EXISTS activity_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employee_master(employee_id) ON DELETE CASCADE,
  plan_id UUID REFERENCES learning_plans(plan_id) ON DELETE CASCADE,
  task_id UUID REFERENCES learning_tasks(task_id) ON DELETE CASCADE,
  log_date DATE DEFAULT CURRENT_DATE,
  hours_spent NUMERIC(5,2) DEFAULT 0,
  progress_notes TEXT,
  blockers TEXT,
  achievements TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_employee ON activity_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_plan ON activity_logs(plan_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(log_date);

-- Enable RLS on activity_logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity logs" ON activity_logs
  FOR SELECT USING (
    employee_id IN (SELECT employee_id FROM employee_master WHERE email = auth.email())
  );

CREATE POLICY "Admins can view all activity logs" ON activity_logs
  FOR SELECT USING (is_admin());

CREATE POLICY "Users can insert their own activity logs" ON activity_logs
  FOR INSERT WITH CHECK (
    employee_id IN (SELECT employee_id FROM employee_master WHERE email = auth.email())
  );

CREATE POLICY "Admins can insert activity logs" ON activity_logs
  FOR INSERT WITH CHECK (is_admin());
