'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Employee {
  employee_id: string
  name: string
  email: string
  role: string
  department: string
  bu: string
  experience_years: number
}

interface LearningPlan {
  plan_id: string
  title: string
  employee_id: string
  plan_type: string
  technology_area: string
  objective: string
  learning_objectives: string
  milestones: string
  status: string
  start_date: string
  end_date: string
  priority: number
  completion_percentage: number
  employee_master?: { name: string } | { name: string }[]
}

interface AIScore {
  learning_score: number
  relevance_score: number
  execution_score: number
  delivery_score: number
  authenticity_score: number
  final_score: number
}

const PLAN_TYPES = ['GenAI','AI Engineering','MLOps','Data Engineering','AI Agents','LLMOps','RAG','MCP','Cloud AI','AI Security','Custom']
const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
const labelCls = "block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide"

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'users' | 'plans'>('users')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [learningPlans, setLearningPlans] = useState<LearningPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<LearningPlan | null>(null)
  const [planAIScore, setPlanAIScore] = useState<AIScore | null>(null)
  const [commentText, setCommentText] = useState('')
  const [adminId, setAdminId] = useState('')
  const [sendingComment, setSendingComment] = useState(false)

  const [showUserForm, setShowUserForm] = useState(false)
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'Employee', department: '', bu: '', experience_years: 0 })

  useEffect(() => { checkAuth() }, [])
  useEffect(() => { fetchData() }, [activeTab])
  useEffect(() => { if (selectedPlan) fetchPlanAIScore(selectedPlan.plan_id, selectedPlan.employee_id) }, [selectedPlan])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    const { data: emp } = await supabase.from('employee_master').select('employee_id').eq('email', session.user.email).single()
    if (emp) setAdminId(emp.employee_id)
  }

  const fetchData = async () => {
    setLoading(true)
    if (activeTab === 'users') {
      const { data } = await supabase.from('employee_master').select('*').order('name')
      if (data) setEmployees(data)
    } else {
      const { data } = await supabase.from('learning_plans').select(`*, employee_master(name)`).order('created_at', { ascending: false })
      if (data) setLearningPlans(data)
    }
    setLoading(false)
  }

  const fetchPlanAIScore = async (planId: string, empId: string) => {
    const { data } = await supabase.from('ai_evaluation_scores').select('*').eq('plan_id', planId).eq('employee_id', empId).single()
    setPlanAIScore(data || null)
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('employee_master').insert([userForm])
    if (!error) { setShowUserForm(false); setUserForm({ name: '', email: '', role: 'Employee', department: '', bu: '', experience_years: 0 }); fetchData() }
  }

  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedPlan || !adminId) return
    setSendingComment(true)
    const { error } = await supabase.from('plan_comments').insert([{
      plan_id: selectedPlan.plan_id,
      commenter_id: adminId,
      comment_text: commentText.trim(),
    }])
    if (!error) { setCommentText(''); alert('Comment added. Employee will see it on their dashboard.') }
    else alert('Error adding comment: ' + error.message)
    setSendingComment(false)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }

  const getEmployeeName = (plan: LearningPlan) => {
    if (!plan.employee_master) return 'Unknown'
    if (Array.isArray(plan.employee_master)) return plan.employee_master[0]?.name || 'Unknown'
    return (plan.employee_master as any).name || 'Unknown'
  }

  const statusColor = (status: string) => {
    if (status === 'Completed') return 'bg-green-100 text-green-700'
    if (status === 'In Progress') return 'bg-blue-100 text-blue-700'
    if (status === 'Active') return 'bg-purple-100 text-purple-700'
    return 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">AI Learning Platform</h1>
            <p className="text-sm text-gray-500">Admin Dashboard</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push('/scoring')} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">Score Plans</button>
            <button onClick={handleLogout} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">Logout</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            ['Total Users', employees.length, 'blue'],
            ['Total Plans', learningPlans.length, 'green'],
            ['Active Plans', learningPlans.filter(p => p.status === 'Active' || p.status === 'In Progress').length, 'purple'],
            ['Completed', learningPlans.filter(p => p.status === 'Completed').length, 'orange'],
          ].map(([label, val, color]) => (
            <div key={String(label)} className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-2xl font-bold text-gray-800">{val}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex border-b">
            {(['users', 'plans'] as const).map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab); setSelectedPlan(null) }}
                className={`px-6 py-3 text-sm font-medium capitalize ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                {tab === 'users' ? `User Management (${employees.length})` : `Learning Plans (${learningPlans.length})`}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* USERS TAB */}
            {activeTab === 'users' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-semibold text-gray-800">All Users</h2>
                  <button onClick={() => setShowUserForm(!showUserForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">+ Add User</button>
                </div>

                {showUserForm && (
                  <div className="mb-6 p-5 border rounded-xl bg-blue-50">
                    <h3 className="font-semibold mb-4">Create New User</h3>
                    <form onSubmit={handleCreateUser} className="grid grid-cols-3 gap-3">
                      <div><label className={labelCls}>Name *</label><input type="text" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className={inputCls} required /></div>
                      <div><label className={labelCls}>Email *</label><input type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} className={inputCls} required /></div>
                      <div>
                        <label className={labelCls}>Role</label>
                        <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} className={inputCls}>
                          {['Employee','Admin','Manager','Delivery Head','BU Head','AI Evaluator','HR/L&D'].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div><label className={labelCls}>Department</label><input type="text" value={userForm.department} onChange={e => setUserForm({...userForm, department: e.target.value})} className={inputCls} /></div>
                      <div><label className={labelCls}>Business Unit</label><input type="text" value={userForm.bu} onChange={e => setUserForm({...userForm, bu: e.target.value})} className={inputCls} /></div>
                      <div><label className={labelCls}>Experience (years)</label><input type="number" value={userForm.experience_years} onChange={e => setUserForm({...userForm, experience_years: parseInt(e.target.value)})} className={inputCls} min={0} /></div>
                      <div className="col-span-3 flex gap-2">
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Create User</button>
                        <button type="button" onClick={() => setShowUserForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm">Cancel</button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        {['Name','Email','Role','Department','BU','Exp'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {employees.map(emp => (
                        <tr key={emp.employee_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{emp.name}</td>
                          <td className="px-4 py-3 text-gray-500">{emp.email}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${emp.role === 'Admin' ? 'bg-purple-100 text-purple-700' : emp.role === 'Manager' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{emp.role}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{emp.department || '-'}</td>
                          <td className="px-4 py-3 text-gray-500">{emp.bu || '-'}</td>
                          <td className="px-4 py-3 text-gray-500">{emp.experience_years}y</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PLANS TAB */}
            {activeTab === 'plans' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Plan List */}
                <div>
                  <h2 className="font-semibold text-gray-800 mb-4">All Learning Plans</h2>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                    {loading ? <p className="text-gray-400 text-sm">Loading...</p> :
                      learningPlans.map(plan => (
                        <div key={plan.plan_id} onClick={() => setSelectedPlan(plan)}
                          className={`p-4 border rounded-xl cursor-pointer transition ${selectedPlan?.plan_id === plan.plan_id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 bg-white'}`}>
                          <div className="flex justify-between items-start mb-1">
                            <p className="font-semibold text-sm text-gray-900">{plan.title}</p>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor(plan.status)}`}>{plan.status}</span>
                          </div>
                          <p className="text-xs text-gray-500">{getEmployeeName(plan)} · {plan.plan_type}</p>
                          <div className="flex gap-2 mt-2 text-xs text-gray-400">
                            <span>{new Date(plan.start_date).toLocaleDateString()} - {new Date(plan.end_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>

                {/* Plan Detail + Comment */}
                <div>
                  {selectedPlan ? (
                    <div className="space-y-4">
                      {/* Plan Info */}
                      <div className="bg-gray-50 border rounded-xl p-4">
                        <h3 className="font-bold text-gray-900 mb-1">{selectedPlan.title}</h3>
                        <p className="text-sm text-gray-500 mb-3">{getEmployeeName(selectedPlan)} · {selectedPlan.plan_type}</p>
                        {selectedPlan.objective && (
                          <div className="bg-white rounded-lg p-3 mb-2">
                            <p className="text-xs font-semibold text-gray-500 mb-1">OBJECTIVE</p>
                            <p className="text-sm text-gray-700">{selectedPlan.objective}</p>
                          </div>
                        )}
                        {selectedPlan.learning_objectives && (
                          <div className="bg-white rounded-lg p-3">
                            <p className="text-xs font-semibold text-gray-500 mb-1">LEARNING OBJECTIVES</p>
                            <p className="text-sm text-gray-700 whitespace-pre-line">{selectedPlan.learning_objectives}</p>
                          </div>
                        )}
                      </div>

                      {/* AI Score */}
                      {planAIScore && (
                        <div className="bg-white border rounded-xl p-4">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-semibold text-sm">AI Evaluation Score</h4>
                            <span className="text-2xl font-bold text-blue-600">{Number(planAIScore.final_score).toFixed(1)}/100</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {[
                              ['Learning', planAIScore.learning_score],
                              ['Relevance', planAIScore.relevance_score],
                              ['Execution', planAIScore.execution_score],
                              ['Delivery', planAIScore.delivery_score],
                            ].map(([label, score]) => (
                              <div key={String(label)} className="bg-gray-50 rounded p-2">
                                <div className="flex justify-between mb-1">
                                  <span className="text-gray-600">{label}</span>
                                  <span className="font-bold">{score}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1">
                                  <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${score}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add Comment */}
                      <div className="bg-white border rounded-xl p-4">
                        <h4 className="font-semibold text-sm mb-3">Add Comment</h4>
                        <textarea
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          placeholder="Add feedback or note for this employee's plan..."
                        />
                        <button
                          onClick={handleAddComment}
                          disabled={!commentText.trim() || sendingComment}
                          className="mt-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 text-sm font-medium"
                        >
                          {sendingComment ? 'Sending...' : 'Add Comment'}
                        </button>
                        <p className="text-xs text-gray-400 mt-2">Employee will see this comment on their dashboard.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-400 text-sm">
                      Select a plan to view details and add comments
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
