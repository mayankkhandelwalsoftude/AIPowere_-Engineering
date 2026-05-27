-- Migration: Plan Milestones + Admin Comments
-- Run in Supabase SQL Editor

-- 1. Create plan_milestones table
CREATE TABLE IF NOT EXISTS plan_milestones (
  milestone_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES learning_plans(plan_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  goal TEXT,
  start_date DATE,
  end_date DATE,
  order_number INT DEFAULT 1,
  skills_covered TEXT,
  evidence_expected TEXT,
  status TEXT CHECK (status IN ('Not Started','In Progress','Completed')) DEFAULT 'Not Started',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Update learning_tasks to link to milestones
ALTER TABLE learning_tasks ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES plan_milestones(milestone_id) ON DELETE CASCADE;
ALTER TABLE learning_tasks ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(5,2) DEFAULT 0;
ALTER TABLE learning_tasks ADD COLUMN IF NOT EXISTS expected_output TEXT;

-- 3. Create plan_comments table (admin comments on plans)
CREATE TABLE IF NOT EXISTS plan_comments (
  comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES learning_plans(plan_id) ON DELETE CASCADE,
  commenter_id UUID REFERENCES employee_master(employee_id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Update learning_plans status - remove approval statuses, keep it simple
ALTER TABLE learning_plans DROP CONSTRAINT IF EXISTS learning_plans_status_check;
ALTER TABLE learning_plans ADD CONSTRAINT learning_plans_status_check 
  CHECK (status IN ('Draft','Active','In Progress','Completed','On Hold'));

-- 5. Add missing columns to learning_plans
ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS github_repo TEXT;
ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS business_use_case TEXT;
ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS skills_tags TEXT;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_plan_milestones_plan ON plan_milestones(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_comments_plan ON plan_comments(plan_id);
CREATE INDEX IF NOT EXISTS idx_learning_tasks_milestone ON learning_tasks(milestone_id);
