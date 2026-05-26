# AI Learning Platform - Quick Start Guide

## 🎯 What You Have

**Complete MVP deployed to GitHub** with:
- User Management (Admin/Employee roles)
- Learning Plan Management
- Task Tracking
- Role-based dashboards
- Supabase backend
- Ready for Vercel deployment

## 🚀 Deploy in 20 Minutes

### Step 1: Setup Database (5 min)
1. Open: https://supabase.com/dashboard/project/hjitstijzpppwoepragj/sql/new
2. Copy all content from `schema.sql` file in the repo
3. Click "Run" in SQL Editor
4. Done! Tables created with sample data

### Step 2: Create Login Users (3 min)
1. Open: https://supabase.com/dashboard/project/hjitstijzpppwoepragj/auth/users
2. Click "Add user" → Manual
3. Create admin user:
   - Email: admin@example.com
   - Password: Admin@123
4. Create test employee:
   - Email: user@example.com
   - Password: User@123

### Step 3: Deploy to Vercel (10 min)
1. Go to: https://vercel.com
2. Sign in with GitHub
3. Click "Add New Project"
4. Select: mayankkhandelwalsoftude/AIPowere_-Engineering
5. Add these environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://hjitstijzpppwoepragj.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = sb_publishable_FGCrD7EXl687Rk15zOGk5w_AVEu0Jzp
   ```
6. Click "Deploy"
7. Wait 2-3 minutes

### Step 4: Configure Auth (2 min)
After deployment:
1. Copy your Vercel URL (e.g., https://your-app.vercel.app)
2. Open: https://supabase.com/dashboard/project/hjitstijzpppwoepragj/auth/url-configuration
3. Set Site URL to your Vercel URL
4. Add Redirect URL: https://your-app.vercel.app/**

### Step 5: Test (5 min)
1. Open your Vercel URL
2. Login as admin@example.com / Admin@123
3. Go to "User Management" → Create a new employee
4. Go to "Learning Plans" → Create a plan for that employee
5. Logout and login as the new employee
6. Verify the plan shows up

## ✅ Done!

Your MVP is live. Admin can create users and plans, users can view their plans.

## 📋 Features Available

**Admin Dashboard:**
- Create/view employees with roles
- Create learning plans
- Assign plans to employees
- Set technology areas, dates, priorities
- Track plan status

**User Dashboard:**
- View assigned learning plans
- See plan objectives and dates
- Track task progress
- View completion stats

## 🔗 Links

- **GitHub Repo**: https://github.com/mayankkhandelwalsoftude/AIPowere_-Engineering
- **Supabase Project**: https://supabase.com/dashboard/project/hjitstijzpppwoepragj
- **Vercel Dashboard**: https://vercel.com/dashboard

## 🆘 Issues?

**Login fails?**
- Check user exists in both Supabase Auth AND employee_master table
- Emails must match exactly

**No data showing?**
- Verify environment variables in Vercel
- Check Supabase RLS policies are enabled

**Build fails?**
- Check Vercel build logs
- Ensure environment variables are set

## 📞 Contact

mayankkhandelwal08@gmail.com

---

**Time to Production: 20 minutes**
**Cost: $0 (all free tiers)**
