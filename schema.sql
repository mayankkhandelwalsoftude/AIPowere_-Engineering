-- AI Learning Platform Database Schema
-- Run this in your Supabase SQL Editor

-- Create employee_master table
CREATE TABLE IF NOT EXISTS employee_master (
  employee_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  bu TEXT,
  department TEXT,
  role TEXT CHECK (role IN ('Admin','Delivery Head','BU Head','Manager','Employee','AI Evaluator','HR/L&D')),
  experience_years INT DEFAULT 0,
  manager_id UUID REFERENCES employee_master(employee_id),
  ai_maturity_level INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create learning_plans table
CREATE TABLE IF NOT EXISTS learning_plans (
  plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employee_master(employee_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  technology_area TEXT,
  objective TEXT,
  start_date DATE,
  end_date DATE,
  priority INT DEFAULT 1,
  status TEXT CHECK (status IN ('Draft','Pending Approval','Approved','In Progress','Completed')) DEFAULT 'Draft',
  ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create learning_tasks table
CREATE TABLE IF NOT EXISTS learning_tasks (
  task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES learning_plans(plan_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completion_percent INT DEFAULT 0 CHECK (completion_percent >= 0 AND completion_percent <= 100),
  evidence_url TEXT,
  status TEXT CHECK (status IN ('Pending','Done','Skipped')) DEFAULT 'Pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create git_activity table
CREATE TABLE IF NOT EXISTS git_activity (
  git_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employee_master(employee_id) ON DELETE CASCADE,
  repo_name TEXT,
  commits INT DEFAULT 0,
  prs INT DEFAULT 0,
  lines_changed INT DEFAULT 0,
  ai_framework_used TEXT,
  commit_quality_score NUMERIC(5,2),
  activity_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create skill_matrix table
CREATE TABLE IF NOT EXISTS skill_matrix (
  skill_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employee_master(employee_id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  current_level INT CHECK (current_level >= 1 AND current_level <= 5) DEFAULT 1,
  target_level INT CHECK (target_level >= 1 AND target_level <= 5) DEFAULT 3,
  confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ai_evaluation_scores table
CREATE TABLE IF NOT EXISTS ai_evaluation_scores (
  score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employee_master(employee_id) ON DELETE CASCADE,
  plan_id UUID REFERENCES learning_plans(plan_id) ON DELETE CASCADE,
  learning_score NUMERIC(5,2) CHECK (learning_score >= 0 AND learning_score <= 100),
  relevance_score NUMERIC(5,2) CHECK (relevance_score >= 0 AND relevance_score <= 100),
  execution_score NUMERIC(5,2) CHECK (execution_score >= 0 AND execution_score <= 100),
  delivery_score NUMERIC(5,2) CHECK (delivery_score >= 0 AND delivery_score <= 100),
  authenticity_score NUMERIC(5,2) CHECK (authenticity_score >= 0 AND authenticity_score <= 100),
  final_score NUMERIC(5,2) CHECK (final_score >= 0 AND final_score <= 100),
  evaluation_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ai_recommendations table
CREATE TABLE IF NOT EXISTS ai_recommendations (
  recommendation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employee_master(employee_id) ON DELETE CASCADE,
  type TEXT,
  description TEXT,
  severity TEXT CHECK (severity IN ('Low','Medium','High','Critical')),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create evidence_repository table
CREATE TABLE IF NOT EXISTS evidence_repository (
  evidence_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employee_master(employee_id) ON DELETE CASCADE,
  evidence_type TEXT,
  file_url TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employee_email ON employee_master(email);
CREATE INDEX IF NOT EXISTS idx_learning_plans_employee ON learning_plans(employee_id);
CREATE INDEX IF NOT EXISTS idx_learning_tasks_plan ON learning_tasks(plan_id);
CREATE INDEX IF NOT EXISTS idx_git_activity_employee ON git_activity(employee_id);
CREATE INDEX IF NOT EXISTS idx_skill_matrix_employee ON skill_matrix(employee_id);

-- Create a view for final score calculation
CREATE OR REPLACE VIEW employee_final_scores AS
SELECT 
  e.employee_id,
  e.name,
  e.email,
  e.department,
  e.bu,
  COALESCE(
    (0.25 * AVG(aes.learning_score)) +
    (0.20 * AVG(aes.relevance_score)) +
    (0.25 * AVG(aes.execution_score)) +
    (0.20 * AVG(aes.delivery_score)) +
    (0.10 * AVG(aes.authenticity_score)),
    0
  ) as weighted_final_score,
  COUNT(DISTINCT lp.plan_id) as total_plans,
  COUNT(DISTINCT CASE WHEN lp.status = 'Completed' THEN lp.plan_id END) as completed_plans
FROM employee_master e
LEFT JOIN learning_plans lp ON e.employee_id = lp.employee_id
LEFT JOIN ai_evaluation_scores aes ON e.employee_id = aes.employee_id
GROUP BY e.employee_id, e.name, e.email, e.department, e.bu;

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE employee_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE git_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_evaluation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_repository ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for employee_master
CREATE POLICY "Users can view their own profile" ON employee_master
  FOR SELECT USING (auth.email() = email);

CREATE POLICY "Admins can view all profiles" ON employee_master
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employee_master WHERE email = auth.email() AND role = 'Admin'
    )
  );

CREATE POLICY "Admins can insert employees" ON employee_master
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM employee_master WHERE email = auth.email() AND role = 'Admin'
    )
  );

-- Create RLS policies for learning_plans
CREATE POLICY "Users can view their own plans" ON learning_plans
  FOR SELECT USING (
    employee_id IN (SELECT employee_id FROM employee_master WHERE email = auth.email())
  );

CREATE POLICY "Admins can view all plans" ON learning_plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employee_master WHERE email = auth.email() AND role = 'Admin'
    )
  );

CREATE POLICY "Admins can create plans" ON learning_plans
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM employee_master WHERE email = auth.email() AND role = 'Admin'
    )
  );

-- Create RLS policies for learning_tasks
CREATE POLICY "Users can view tasks for their plans" ON learning_tasks
  FOR SELECT USING (
    plan_id IN (
      SELECT plan_id FROM learning_plans WHERE employee_id IN (
        SELECT employee_id FROM employee_master WHERE email = auth.email()
      )
    )
  );

CREATE POLICY "Admins can view all tasks" ON learning_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employee_master WHERE email = auth.email() AND role = 'Admin'
    )
  );

-- Insert sample admin user (UPDATE PASSWORD AFTER FIRST LOGIN)
INSERT INTO employee_master (name, email, role, department, bu, experience_years)
VALUES 
  ('Admin User', 'admin@example.com', 'Admin', 'Technology', 'Corporate', 10),
  ('Test User', 'user@example.com', 'Employee', 'Engineering', 'Development', 3)
ON CONFLICT (email) DO NOTHING;

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for learning_plans
CREATE TRIGGER update_learning_plans_updated_at BEFORE UPDATE ON learning_plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for skill_matrix
CREATE TRIGGER update_skill_matrix_updated_at BEFORE UPDATE ON skill_matrix
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
