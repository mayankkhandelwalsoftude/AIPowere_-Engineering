-- Task AI Reviews table
CREATE TABLE IF NOT EXISTS task_ai_reviews (
  review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES learning_tasks(task_id) ON DELETE CASCADE,
  plan_id UUID REFERENCES learning_plans(plan_id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employee_master(employee_id) ON DELETE CASCADE,
  task_score INT CHECK (task_score >= 0 AND task_score <= 100),
  quality_review TEXT,
  alignment_review TEXT,
  deliverable_review TEXT,
  market_value_review TEXT,
  missing_items TEXT,   -- JSON array
  recommendations TEXT, -- JSON array
  overall_verdict TEXT CHECK (overall_verdict IN ('Strong','Good','Needs Work','Weak')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_reviews_task ON task_ai_reviews(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reviews_plan ON task_ai_reviews(plan_id);
