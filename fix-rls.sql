-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own profile" ON employee_master;
DROP POLICY IF EXISTS "Admins can view all profiles" ON employee_master;
DROP POLICY IF EXISTS "Admins can insert employees" ON employee_master;
DROP POLICY IF EXISTS "Users can view their own plans" ON learning_plans;
DROP POLICY IF EXISTS "Admins can view all plans" ON learning_plans;
DROP POLICY IF EXISTS "Admins can create plans" ON learning_plans;
DROP POLICY IF EXISTS "Users can view tasks for their plans" ON learning_tasks;
DROP POLICY IF EXISTS "Admins can view all tasks" ON learning_tasks;

-- Create a security definer function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM employee_master
    WHERE email = auth.email()
    AND role = 'Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new RLS policies using the security definer function

-- Employee Master Policies
CREATE POLICY "Users can view their own profile" ON employee_master
  FOR SELECT USING (auth.email() = email);

CREATE POLICY "Admins can view all profiles" ON employee_master
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can insert employees" ON employee_master
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update employees" ON employee_master
  FOR UPDATE USING (is_admin());

-- Learning Plans Policies
CREATE POLICY "Users can view their own plans" ON learning_plans
  FOR SELECT USING (
    employee_id IN (SELECT employee_id FROM employee_master WHERE email = auth.email())
  );

CREATE POLICY "Admins can view all plans" ON learning_plans
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can create plans" ON learning_plans
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update plans" ON learning_plans
  FOR UPDATE USING (is_admin());

-- Learning Tasks Policies
CREATE POLICY "Users can view tasks for their plans" ON learning_tasks
  FOR SELECT USING (
    plan_id IN (
      SELECT plan_id FROM learning_plans WHERE employee_id IN (
        SELECT employee_id FROM employee_master WHERE email = auth.email()
      )
    )
  );

CREATE POLICY "Admins can view all tasks" ON learning_tasks
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can create tasks" ON learning_tasks
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update tasks" ON learning_tasks
  FOR UPDATE USING (is_admin());

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
