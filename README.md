# AI Learning Platform - MVP

AI Engineering Capability & Delivery Readiness Platform built with Next.js 14, Supabase, and Tailwind CSS.

## Features

- **User Management**: Admin can create and manage employees with roles (Admin/Employee)
- **Learning Plan Management**: Create, view, and track learning plans with detailed objectives
- **Task Tracking**: Break down learning plans into tasks with progress tracking
- **Role-based Access**: Different dashboards for Admin and regular users
- **Real-time Data**: Powered by Supabase for instant updates

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Deployment**: Vercel

## Quick Start

### 1. Database Setup

1. Go to your Supabase project: https://supabase.com/dashboard/project/hjitstijzpppwoepragj
2. Navigate to SQL Editor
3. Copy all content from `schema.sql` and execute it
4. This will create all tables, indexes, RLS policies, and sample users

### 2. Set Up Authentication

In Supabase Dashboard:
1. Go to Authentication → Settings
2. Enable Email provider
3. Disable email confirmation for testing (optional)
4. Set Site URL to your Vercel deployment URL (or localhost:3000 for development)

### 3. Create Auth Users

For each employee in the `employee_master` table, create a corresponding auth user:

1. Go to Authentication → Users
2. Click "Add user"
3. Enter the same email as in `employee_master` table
4. Set a password
5. Repeat for all employees

**Sample Users (already in schema.sql):**
- Admin: admin@example.com
- User: user@example.com

### 4. Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open http://localhost:3000

### 5. Deploy to Vercel

#### Option A: GitHub Integration (Recommended)

1. Push code to your GitHub repository:
```bash
cd /path/to/ai-learning-platform
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/mayankkhandelwalsoftude/AIPowere_-Engineering.git
git branch -M main
git push -u origin main
```

2. Go to https://vercel.com
3. Click "Add New Project"
4. Import your GitHub repository
5. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: https://hjitstijzpppwoepragj.supabase.co
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: sb_publishable_FGCrD7EXl687Rk15zOGk5w_AVEu0Jzp
6. Click "Deploy"

#### Option B: Vercel CLI

```bash
npm install -g vercel
vercel login
vercel
```

Follow the prompts and add the environment variables when asked.

### 6. Update Supabase Auth Settings

After deployment:
1. Copy your Vercel deployment URL (e.g., https://your-app.vercel.app)
2. Go to Supabase → Authentication → URL Configuration
3. Add your Vercel URL to "Site URL"
4. Add `https://your-app.vercel.app/**` to "Redirect URLs"

## Usage

### Admin Login
1. Navigate to your deployed URL
2. Login with: admin@example.com / [your-password]
3. Access:
   - **User Management**: Create and view employees
   - **Learning Plans**: Create and assign learning plans to employees

### Employee Login
1. Login with employee credentials
2. View assigned learning plans
3. Track progress on tasks

## Project Structure

```
ai-learning-platform/
├── app/
│   ├── admin/          # Admin dashboard
│   ├── dashboard/      # User dashboard
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Login page
├── lib/
│   └── supabase.ts     # Supabase client
├── components/         # Reusable components (future)
├── schema.sql          # Database schema
└── package.json
```

## Database Schema

Key tables:
- `employee_master`: User profiles and roles
- `learning_plans`: Learning plan details
- `learning_tasks`: Tasks within plans
- `git_activity`: GitHub activity tracking
- `skill_matrix`: Employee skills
- `ai_evaluation_scores`: AI-based scoring
- `ai_recommendations`: AI recommendations
- `evidence_repository`: Evidence uploads

## Security

- Row Level Security (RLS) enabled on all tables
- Role-based access control
- Admins can manage all data
- Users can only view their own data

## Future Enhancements

- Task creation and evidence upload
- GitHub integration for commit tracking
- AI-powered recommendations
- Skill matrix visualization
- Analytics dashboard
- Email notifications

## Troubleshooting

### Login fails
- Verify user exists in both Supabase Auth AND employee_master table
- Check email matches in both places
- Ensure RLS policies are active

### Data not showing
- Check Supabase console for any errors
- Verify RLS policies allow access
- Check browser console for API errors

### Deployment issues
- Ensure environment variables are set in Vercel
- Check build logs for errors
- Verify Supabase URLs are correct

## Support

For issues or questions, contact: mayankkhandelwal08@gmail.com
