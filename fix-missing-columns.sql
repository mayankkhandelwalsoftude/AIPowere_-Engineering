-- Quick fix: Add missing columns to learning_plans
ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS github_repo TEXT;
ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS business_use_case TEXT;
ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS skills_tags TEXT;
ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS completion_percentage INT DEFAULT 0;
ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS plan_type TEXT;
ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS learning_objectives TEXT;
ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS milestones TEXT;

-- Create plan_milestones table
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
  status TEXT DEFAULT 'Not Started',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create plan_comments table
CREATE TABLE IF NOT EXISTS plan_comments (
  comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES learning_plans(plan_id) ON DELETE CASCADE,
  commenter_id UUID REFERENCES employee_master(employee_id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add milestone_id to learning_tasks
ALTER TABLE learning_tasks ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES plan_milestones(milestone_id) ON DELETE CASCADE;
ALTER TABLE learning_tasks ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(5,2) DEFAULT 0;
ALTER TABLE learning_tasks ADD COLUMN IF NOT EXISTS expected_output TEXT;
ALTER TABLE learning_tasks ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'Learning';

-- Update learning_plans status constraint
ALTER TABLE learning_plans DROP CONSTRAINT IF EXISTS learning_plans_status_check;
ALTER TABLE learning_plans ADD CONSTRAINT learning_plans_status_check 
  CHECK (status IN ('Draft','Active','In Progress','Completed','On Hold','Pending Approval','Approved'));
