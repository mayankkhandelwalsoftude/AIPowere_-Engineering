'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Employee { employee_id:string; name:string; email:string; role:string; department:string; bu:string; experience_years:number }
interface LearningPlan { plan_id:string; title:string; employee_id:string; plan_type:string; technology_area:string; objective:string; learning_objectives:string; status:string; start_date:string; end_date:string; priority:number; completion_percentage:number; github_repo:string; business_use_case:string; skills_tags:string; employee_master:any }
interface AIScore { learning_score:number; relevance_score:number; execution_score:number; delivery_score:number; authenticity_score:number; final_score:number; overall_feedback:string; recommendations:string; gaps:string; strengths:string }
interface Notification { type:'overdue'|'no_evidence'|'approaching'; plan_id:string; plan_title:string; employee_name:string; message:string; days_overdue?:number; task_title?:string }

const inp = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
const lbl = "block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide"
const PLAN_TYPES = ['GenAI','AI Engineering','MLOps','Data Engineering','AI Agents','LLMOps','RAG','MCP','Cloud AI','AI Security','Custom']

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'users'|'plans'|'notifications'>('plans')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [allPlans, setAllPlans] = useState<LearningPlan[]>([])
  const [filteredPlans, setFilteredPlans] = useState<LearningPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<LearningPlan|null>(null)
  const [planMilestones, setPlanMilestones] = useState<any[]>([])
  const [planAIScore, setPlanAIScore] = useState<AIScore|null>(null)
  const [planComments, setPlanComments] = useState<any[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [adminId, setAdminId] = useState('')
  const [commentText, setCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [showUserForm, setShowUserForm] = useState(false)
  const [userForm, setUserForm] = useState({ name:'', email:'', role:'Employee', department:'', bu:'', experience_years:0 })
  const [detailTab, setDetailTab] = useState<'details'|'milestones'|'ai'|'comments'>('details')

  useEffect(() => { checkAuth() }, [])
  useEffect(() => { if (activeTab === 'users') fetchEmployees(); else if (activeTab === 'plans') fetchPlans(); else if (activeTab === 'notifications') fetchNotifications() }, [activeTab])
  useEffect(() => { applyFilters() }, [allPlans, searchTerm, filterType, filterStatus])
  useEffect(() => { if (selectedPlan) { fetchPlanDetails(selectedPlan.plan_id, selectedPlan.employee_id); setDetailTab('details') } }, [selectedPlan])

  const checkAuth = async () => {
    const { data:{ session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    const { data:emp } = await supabase.from('employee_master').select('employee_id').eq('email', session.user.email).single()
    if (emp) setAdminId(emp.employee_id)
  }

  const fetchEmployees = async () => {
    setLoading(true)
    const { data } = await supabase.from('employee_master').select('*').order('name')
    if (data) setEmployees(data)
    setLoading(false)
  }

  const fetchPlans = async () => {
    setLoading(true)
    const { data } = await supabase.from('learning_plans').select('*, employee_master(name, email, department, bu)').order('created_at', { ascending:false })
    if (data) setAllPlans(data)
    setLoading(false)
  }

  const applyFilters = () => {
    let filtered = [...allPlans]
    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      filtered = filtered.filter(p => {
        const name = Array.isArray(p.employee_master) ? p.employee_master[0]?.name : p.employee_master?.name || ''
        return p.title?.toLowerCase().includes(s) || name.toLowerCase().includes(s) || p.plan_type?.toLowerCase().includes(s)
      })
    }
    if (filterType !== 'All') filtered = filtered.filter(p => p.plan_type === filterType)
    if (filterStatus !== 'All') filtered = filtered.filter(p => p.status === filterStatus)
    setFilteredPlans(filtered)
  }

  const fetchPlanDetails = async (planId:string, empId:string) => {
    const [msRes, scoreRes, commentsRes] = await Promise.all([
      supabase.from('plan_milestones').select('*, learning_tasks(*)').eq('plan_id', planId).order('order_number'),
      supabase.from('ai_evaluation_scores').select('*').eq('plan_id', planId).eq('employee_id', empId).single(),
      supabase.from('plan_comments').select('*, employee_master(name)').eq('plan_id', planId).order('created_at')
    ])
    setPlanMilestones(msRes.data || [])
    setPlanAIScore(scoreRes.data || null)
    setPlanComments(commentsRes.data || [])
  }

  const fetchNotifications = async () => {
    setLoading(true)
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const in3Days = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: plans } = await supabase
      .from('learning_plans')
      .select('*, employee_master(name), plan_milestones(*, learning_tasks(*))')
      .neq('status', 'Completed')

    const notifs: Notification[] = []
    for (const plan of (plans || [])) {
      const empName = Array.isArray(plan.employee_master) ? plan.employee_master[0]?.name : plan.employee_master?.name || 'Unknown'

      // Overdue plan
      if (plan.end_date && plan.end_date < todayStr) {
        const daysOver = Math.floor((today.getTime() - new Date(plan.end_date).getTime()) / (1000 * 60 * 60 * 24))
        notifs.push({ type:'overdue', plan_id:plan.plan_id, plan_title:plan.title, employee_name:empName, message:`Plan end date was ${new Date(plan.end_date).toLocaleDateString()} - ${daysOver} day${daysOver>1?'s':''} overdue`, days_overdue:daysOver })
      }

      // Approaching deadline
      if (plan.end_date && plan.end_date >= todayStr && plan.end_date <= in3Days) {
        notifs.push({ type:'approaching', plan_id:plan.plan_id, plan_title:plan.title, employee_name:empName, message:`Plan deadline in ${Math.ceil((new Date(plan.end_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} days - ${new Date(plan.end_date).toLocaleDateString()}` })
      }

      // Tasks with no evidence and overdue
      for (const ms of (plan.plan_milestones || [])) {
        for (const task of (ms.learning_tasks || [])) {
          const noEvidence = !task.github_link && !task.pr_link && !task.demo_url && !task.certificate_url && !task.file_urls
          const taskOverdue = task.due_date && task.due_date < todayStr && task.status !== 'Done'
          if (taskOverdue && noEvidence) {
            notifs.push({ type:'no_evidence', plan_id:plan.plan_id, plan_title:plan.title, employee_name:empName, message:`Task "${task.title}" is overdue with no evidence submitted`, task_title:task.title })
          }
        }
      }
    }
    // Sort: overdue first, then approaching, then no_evidence
    notifs.sort((a,b) => { const order = { overdue:0, no_evidence:1, approaching:2 }; return order[a.type] - order[b.type] })
    setNotifications(notifs)
    setLoading(false)
  }

  const handleCreateUser = async (e:React.FormEvent) => {
    e.preventDefault()
    await supabase.from('employee_master').insert([userForm])
    setShowUserForm(false)
    setUserForm({ name:'', email:'', role:'Employee', department:'', bu:'', experience_years:0 })
    fetchEmployees()
  }

  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedPlan || !adminId) return
    setSendingComment(true)
    const { error } = await supabase.from('plan_comments').insert([{ plan_id:selectedPlan.plan_id, commenter_id:adminId, comment_text:commentText.trim() }])
    if (!error) { setCommentText(''); fetchPlanDetails(selectedPlan.plan_id, selectedPlan.employee_id) }
    else alert(error.message)
    setSendingComment(false)
  }

  const getEmpName = (plan:LearningPlan) => Array.isArray(plan.employee_master) ? plan.employee_master[0]?.name||'Unknown' : (plan.employee_master as any)?.name||'Unknown'
  const getEmpEmail = (plan:LearningPlan) => Array.isArray(plan.employee_master) ? plan.employee_master[0]?.email||'' : (plan.employee_master as any)?.email||''
  const statusColor = (s:string) => s==='Completed'?'bg-green-100 text-green-700':s==='In Progress'?'bg-blue-100 text-blue-700':s==='Active'?'bg-purple-100 text-purple-700':'bg-gray-100 text-gray-600'
  const safe = (j:string|undefined):any[] => { try { return j?JSON.parse(j):[]} catch { return [] } }
  const safeObj = (j:string|undefined):any => { try { return j?JSON.parse(j):{}} catch { return {} } }
  const scoreColor = (s:number) => s>=80?'text-green-600':s>=60?'text-blue-600':s>=40?'text-yellow-600':'text-red-600'
  const barColor = (s:number) => s>=80?'bg-green-500':s>=60?'bg-blue-500':s>=40?'bg-yellow-500':'bg-red-500'
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-screen-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <div><h1 className="text-xl font-bold text-gray-900">AI Learning Platform</h1><p className="text-sm text-gray-500">Admin Dashboard</p></div>
          <div className="flex gap-3">
            <button onClick={() => router.push('/scoring')} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium">Score Plans</button>
            <button onClick={handleLogout} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Logout</button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          {[
            ['Total Users', employees.length || '...', 'blue'],
            ['Total Plans', allPlans.length, 'green'],
            ['Active', allPlans.filter(p=>p.status==='Active'||p.status==='In Progress').length, 'purple'],
            ['Completed', allPlans.filter(p=>p.status==='Completed').length, 'teal'],
            ['Notifications', notifications.length, notifications.length>0?'red':'gray'],
          ].map(([label, val, color]) => (
            <div key={String(label)} onClick={() => { if(label==='Notifications') setActiveTab('notifications') }} className={`bg-white rounded-xl shadow-sm p-4 ${label==='Notifications'&&notifications.length>0?'cursor-pointer border-2 border-red-200':''}`}>
              <p className={`text-2xl font-bold ${String(color)==='red'&&Number(val)>0?'text-red-600':'text-gray-800'}`}>{val}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex border-b">
            {(['plans','users','notifications'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 text-sm font-medium capitalize flex items-center gap-2 ${activeTab===tab?'border-b-2 border-blue-600 text-blue-600':'text-gray-500 hover:text-gray-700'}`}>
                {tab === 'notifications' && notifications.length > 0 && <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{notifications.length}</span>}
                {tab === 'plans' ? `All Plans (${allPlans.length})` : tab === 'users' ? `Users (${employees.length})` : 'Notifications'}
              </button>
            ))}
          </div>

          {/* ─── PLANS TAB ─────────────────────────────────────────────────────── */}
          {activeTab === 'plans' && (
            <div className="flex h-[80vh]">
              {/* LEFT: Plan List */}
              <div className="w-80 shrink-0 border-r flex flex-col">
                {/* Filters */}
                <div className="p-3 border-b space-y-2">
                  <input type="text" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs" placeholder="Search plans or employees..." />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={filterType} onChange={e=>setFilterType(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded text-xs">
                      <option value="All">All Types</option>
                      {PLAN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded text-xs">
                      {['All','Active','In Progress','Completed','On Hold'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Plan List */}
                <div className="overflow-y-auto flex-1">
                  {loading ? <p className="text-sm text-gray-400 p-4">Loading...</p> :
                    filteredPlans.map(plan => {
                      const isOverdue = plan.end_date && plan.end_date < new Date().toISOString().split('T')[0] && plan.status !== 'Completed'
                      return (
                        <div key={plan.plan_id} onClick={() => setSelectedPlan(plan)}
                          className={`p-3 border-b cursor-pointer transition ${selectedPlan?.plan_id===plan.plan_id?'bg-blue-50 border-l-4 border-l-blue-600':'hover:bg-gray-50'}`}>
                          <div className="flex justify-between items-start mb-0.5">
                            <p className="font-medium text-sm truncate flex-1">{plan.title}</p>
                            {isOverdue && <span className="text-xs bg-red-100 text-red-600 px-1.5 rounded ml-1 shrink-0">Overdue</span>}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{getEmpName(plan)}</p>
                          <div className="flex gap-1 mt-1">
                            <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{plan.plan_type}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${statusColor(plan.status)}`}>{plan.status}</span>
                          </div>
                        </div>
                      )
                    })
                  }
                </div>
              </div>

              {/* RIGHT: Plan Detail */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {!selectedPlan ? (
                  <div className="flex-1 flex items-center justify-center text-gray-400">
                    <p className="text-sm">Select a plan to view full details</p>
                  </div>
                ) : (
                  <>
                    {/* Plan Header */}
                    <div className="p-4 border-b bg-white">
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="text-lg font-bold text-gray-900">{selectedPlan.title}</h2>
                          <div className="flex gap-2 mt-1 flex-wrap text-xs text-gray-500">
                            <span className="font-semibold text-blue-700">{getEmpName(selectedPlan)}</span>
                            <span>{getEmpEmail(selectedPlan)}</span>
                            <span className={`px-2 py-0.5 rounded font-medium ${statusColor(selectedPlan.status)}`}>{selectedPlan.status}</span>
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{selectedPlan.plan_type}</span>
                            {selectedPlan.technology_area && <span>{selectedPlan.technology_area}</span>}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(selectedPlan.start_date).toLocaleDateString()} - {new Date(selectedPlan.end_date).toLocaleDateString()}
                            {selectedPlan.end_date < new Date().toISOString().split('T')[0] && selectedPlan.status !== 'Completed' && (
                              <span className="ml-2 bg-red-100 text-red-600 px-2 py-0.5 rounded font-medium">OVERDUE</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Detail Sub-Tabs */}
                      <div className="flex gap-1 mt-3">
                        {(['details','milestones','ai','comments'] as const).map(t => (
                          <button key={t} onClick={() => setDetailTab(t)} className={`px-3 py-1 rounded text-xs font-medium capitalize ${detailTab===t?'bg-blue-600 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                            {t === 'ai' ? 'AI Score' : t === 'comments' ? `Comments (${planComments.length})` : t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Detail Content */}
                    <div className="flex-1 overflow-y-auto p-4">

                      {/* ── Plan Details Tab ── */}
                      {detailTab === 'details' && (
                        <div className="space-y-3">
                          {selectedPlan.objective && <div className="bg-blue-50 rounded-lg p-3"><p className="text-xs font-bold text-blue-700 mb-1">OBJECTIVE</p><p className="text-sm text-gray-700">{selectedPlan.objective}</p></div>}
                          {selectedPlan.learning_objectives && <div className="bg-green-50 rounded-lg p-3"><p className="text-xs font-bold text-green-700 mb-1">LEARNING OBJECTIVES</p><p className="text-sm text-gray-700 whitespace-pre-line">{selectedPlan.learning_objectives}</p></div>}
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {[['Priority', ['','Low','Medium','High'][selectedPlan.priority]||selectedPlan.priority],['Status', selectedPlan.status],['Business Use Case', selectedPlan.business_use_case||'Not specified'],['GitHub Repo', selectedPlan.github_repo||'Not provided']].map(([k,v]) => (
                              <div key={String(k)} className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-0.5">{k}</p>
                                {String(k)==='GitHub Repo'&&String(v)!=='Not provided' ? <a href={String(v)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm truncate block">{v}</a> : <p className="font-medium">{v}</p>}
                              </div>
                            ))}
                          </div>
                          {selectedPlan.skills_tags && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Skills Tags</p>
                              <div className="flex gap-1 flex-wrap">{selectedPlan.skills_tags.split(',').map(t => <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{t.trim()}</span>)}</div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Milestones Tab ── */}
                      {detailTab === 'milestones' && (
                        <div className="space-y-4">
                          {planMilestones.length === 0 ? <p className="text-sm text-gray-400">No milestones added yet.</p> :
                            planMilestones.map((ms, idx) => (
                              <div key={ms.milestone_id} className="border rounded-xl overflow-hidden">
                                <div className="bg-blue-600 px-4 py-2.5 flex justify-between items-center">
                                  <div>
                                    <p className="text-white font-semibold text-sm">Milestone {idx+1}: {ms.title}</p>
                                    {ms.goal && <p className="text-blue-200 text-xs mt-0.5">{ms.goal}</p>}
                                  </div>
                                  <div className="text-right text-xs text-blue-200">
                                    {ms.start_date && <p>{new Date(ms.start_date).toLocaleDateString()} - {new Date(ms.end_date).toLocaleDateString()}</p>}
                                    {ms.skills_covered && <p>{ms.skills_covered}</p>}
                                    {ms.evidence_expected && <p className="italic">{ms.evidence_expected}</p>}
                                  </div>
                                </div>
                                <div className="p-3 space-y-2">
                                  {ms.learning_tasks?.length > 0 ? ms.learning_tasks.map((task:any) => {
                                    const hasEvidence = task.github_link||task.pr_link||task.demo_url||task.certificate_url||task.jira_link||task.file_urls
                                    const isTaskOverdue = task.due_date && task.due_date < new Date().toISOString().split('T')[0] && task.status !== 'Done'
                                    return (
                                      <div key={task.task_id} className={`p-3 rounded-lg border ${isTaskOverdue&&!hasEvidence?'bg-red-50 border-red-200':hasEvidence?'bg-green-50 border-green-200':'bg-gray-50 border-gray-200'}`}>
                                        <div className="flex justify-between items-start mb-1.5">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                              <p className="text-sm font-medium">{task.title}</p>
                                              {isTaskOverdue && !hasEvidence && <span className="text-xs bg-red-100 text-red-600 px-1.5 rounded">Overdue + No Evidence</span>}
                                              {hasEvidence && <span className="text-xs bg-green-100 text-green-600 px-1.5 rounded">Evidence Added</span>}
                                            </div>
                                            <div className="flex gap-2 text-xs text-gray-400 mt-0.5 flex-wrap">
                                              <span className="bg-gray-200 px-1.5 py-0.5 rounded">{task.task_type}</span>
                                              {task.estimated_hours > 0 && <span>{task.estimated_hours}h est</span>}
                                              {task.hours_spent > 0 && <span className="text-blue-500">{task.hours_spent}h spent</span>}
                                              {task.due_date && <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>}
                                            </div>
                                          </div>
                                          <span className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${task.status==='Done'?'bg-green-100 text-green-700':task.status==='In Progress'?'bg-blue-100 text-blue-700':task.status==='Blocked'?'bg-red-100 text-red-700':'bg-gray-100 text-gray-600'}`}>{task.status}</span>
                                        </div>

                                        {/* Evidence Section */}
                                        {hasEvidence ? (
                                          <div className="mt-2 pt-2 border-t border-gray-200">
                                            <p className="text-xs font-semibold text-gray-500 mb-1.5">EVIDENCE SUBMITTED</p>
                                            <div className="flex gap-3 flex-wrap">
                                              {task.github_link && <a href={task.github_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline bg-white px-2 py-1 rounded border"><span>⚙️</span>GitHub</a>}
                                              {task.pr_link && <a href={task.pr_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-purple-600 hover:underline bg-white px-2 py-1 rounded border"><span>🔀</span>Pull Request</a>}
                                              {task.demo_url && <a href={task.demo_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-green-600 hover:underline bg-white px-2 py-1 rounded border"><span>🌐</span>Demo</a>}
                                              {task.certificate_url && <a href={task.certificate_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-yellow-600 hover:underline bg-white px-2 py-1 rounded border"><span>🏆</span>Certificate</a>}
                                              {task.jira_link && <a href={task.jira_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-orange-600 hover:underline bg-white px-2 py-1 rounded border"><span>📋</span>Jira</a>}
                                              {task.file_urls && (() => { try { return JSON.parse(task.file_urls).map((f:any,i:number) => <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-gray-600 hover:underline bg-white px-2 py-1 rounded border"><span>📎</span>{f.name}</a>) } catch { return null } })()}
                                            </div>
                                            {task.notes && <p className="text-xs text-gray-500 mt-1.5 italic bg-white px-2 py-1 rounded">Notes: {task.notes}</p>}
                                          </div>
                                        ) : (
                                          <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
                                            <p className="text-xs text-gray-400 italic">No evidence submitted yet</p>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  }) : <p className="text-xs text-gray-400">No tasks</p>}
                                </div>
                              </div>
                            ))
                          }
                        </div>
                      )}

                      {/* ── AI Score Tab ── */}
                      {detailTab === 'ai' && (
                        <div className="space-y-4">
                          {!planAIScore ? (
                            <p className="text-sm text-gray-400 text-center py-8">No AI evaluation yet for this plan.</p>
                          ) : (
                            <>
                              <div className="text-center p-4 bg-gray-50 rounded-xl">
                                <p className={`text-5xl font-bold ${scoreColor(planAIScore.final_score)}`}>{Number(planAIScore.final_score).toFixed(1)}</p>
                                <p className="text-gray-500 text-sm mt-1">AI Score / 100</p>
                              </div>
                              {planAIScore.overall_feedback && (
                                <div className="bg-blue-50 rounded-xl p-4 border-l-4 border-blue-500">
                                  <p className="text-xs font-bold text-blue-700 mb-2">OVERALL ASSESSMENT</p>
                                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{planAIScore.overall_feedback}</p>
                                </div>
                              )}
                              <div className="space-y-2">
                                {[['Learning Quality','25%',planAIScore.learning_score],['Market Relevance','20%',planAIScore.relevance_score],['Execution Focus','25%',planAIScore.execution_score],['Delivery Readiness','20%',planAIScore.delivery_score],['Authenticity','10%',planAIScore.authenticity_score]].map(([label,weight,score]) => (
                                  <div key={String(label)} className="bg-white border rounded-lg p-3">
                                    <div className="flex justify-between items-center mb-1.5">
                                      <div><span className="font-medium text-sm">{label}</span><span className="ml-2 text-xs text-gray-400">{weight}</span></div>
                                      <span className={`text-xl font-bold ${scoreColor(Number(score))}`}>{score}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2"><div className={`${barColor(Number(score))} h-2 rounded-full`} style={{width:`${score}%`}} /></div>
                                  </div>
                                ))}
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                {safe(planAIScore.strengths).length > 0 && (
                                  <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                                    <p className="text-xs font-bold text-green-700 mb-2">STRENGTHS</p>
                                    {safe(planAIScore.strengths).map((s:string,i:number) => <p key={i} className="text-xs text-green-700 flex gap-1"><span>✓</span>{s}</p>)}
                                  </div>
                                )}
                                {safe(planAIScore.gaps).length > 0 && (
                                  <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                                    <p className="text-xs font-bold text-red-700 mb-2">GAPS</p>
                                    {safe(planAIScore.gaps).map((g:string,i:number) => <p key={i} className="text-xs text-red-700 flex gap-1"><span>!</span>{g}</p>)}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* ── Comments Tab ── */}
                      {detailTab === 'comments' && (
                        <div className="space-y-4">
                          <div className="bg-white border rounded-xl p-4">
                            <p className="text-xs font-semibold text-gray-600 mb-2">ADD COMMENT FOR EMPLOYEE</p>
                            <textarea value={commentText} onChange={e=>setCommentText(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="Add feedback, guidance, or note for this employee's plan..." />
                            <button onClick={handleAddComment} disabled={!commentText.trim()||sendingComment} className="mt-2 w-full py-2 bg-blue-600 text-white rounded-lg text-sm disabled:bg-gray-300 font-medium">
                              {sendingComment ? 'Sending...' : 'Add Comment'}
                            </button>
                            <p className="text-xs text-gray-400 mt-1">Employee will see this on their dashboard.</p>
                          </div>
                          {planComments.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">No comments yet.</p> : (
                            <div className="space-y-2">
                              {planComments.map(c => (
                                <div key={c.comment_id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                  <p className="text-sm text-gray-700">{c.comment_text}</p>
                                  <p className="text-xs text-gray-400 mt-1">{Array.isArray(c.employee_master)?c.employee_master[0]?.name:c.employee_master?.name} · {new Date(c.created_at).toLocaleDateString()}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ─── USERS TAB ─────────────────────────────────────────────────────── */}
          {activeTab === 'users' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold">All Users ({employees.length})</h2>
                <button onClick={() => setShowUserForm(!showUserForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">+ Add User</button>
              </div>
              {showUserForm && (
                <div className="mb-6 p-5 border rounded-xl bg-blue-50">
                  <h3 className="font-semibold mb-4 text-sm">Create New User</h3>
                  <form onSubmit={handleCreateUser} className="grid grid-cols-3 gap-3">
                    <div><label className={lbl}>Name *</label><input type="text" value={userForm.name} onChange={e=>setUserForm({...userForm,name:e.target.value})} className={inp} required /></div>
                    <div><label className={lbl}>Email *</label><input type="email" value={userForm.email} onChange={e=>setUserForm({...userForm,email:e.target.value})} className={inp} required /></div>
                    <div><label className={lbl}>Role</label><select value={userForm.role} onChange={e=>setUserForm({...userForm,role:e.target.value})} className={inp}>{['Employee','Admin','Manager','Delivery Head','BU Head','AI Evaluator','HR/L&D'].map(r=><option key={r}>{r}</option>)}</select></div>
                    <div><label className={lbl}>Department</label><input type="text" value={userForm.department} onChange={e=>setUserForm({...userForm,department:e.target.value})} className={inp} /></div>
                    <div><label className={lbl}>Business Unit</label><input type="text" value={userForm.bu} onChange={e=>setUserForm({...userForm,bu:e.target.value})} className={inp} /></div>
                    <div><label className={lbl}>Experience (years)</label><input type="number" value={userForm.experience_years} onChange={e=>setUserForm({...userForm,experience_years:parseInt(e.target.value)})} className={inp} min={0} /></div>
                    <div className="col-span-3 flex gap-2">
                      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Create User</button>
                      <button type="button" onClick={() => setShowUserForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm">Cancel</button>
                    </div>
                  </form>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50">{['Name','Email','Role','Department','BU','Exp'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {employees.map(emp => (
                      <tr key={emp.employee_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{emp.name}</td>
                        <td className="px-4 py-3 text-gray-500">{emp.email}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${emp.role==='Admin'?'bg-purple-100 text-purple-700':emp.role==='Manager'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-600'}`}>{emp.role}</span></td>
                        <td className="px-4 py-3 text-gray-500">{emp.department||'-'}</td>
                        <td className="px-4 py-3 text-gray-500">{emp.bu||'-'}</td>
                        <td className="px-4 py-3 text-gray-500">{emp.experience_years}y</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── NOTIFICATIONS TAB ─────────────────────────────────────────────── */}
          {activeTab === 'notifications' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold">Notifications & Alerts ({notifications.length})</h2>
                <button onClick={fetchNotifications} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs hover:bg-gray-200">Refresh</button>
              </div>

              {loading ? <p className="text-sm text-gray-400">Loading...</p> : notifications.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">✅</div>
                  <p className="text-gray-700 font-medium">All clear!</p>
                  <p className="text-sm text-gray-400 mt-1">No overdue plans or missing evidence right now.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                      ['Overdue Plans', notifications.filter(n=>n.type==='overdue').length, 'red'],
                      ['Missing Evidence', notifications.filter(n=>n.type==='no_evidence').length, 'orange'],
                      ['Approaching Deadline', notifications.filter(n=>n.type==='approaching').length, 'yellow'],
                    ].map(([label, count, color]) => (
                      <div key={String(label)} className={`p-4 rounded-xl border-2 ${String(color)==='red'?'bg-red-50 border-red-200':String(color)==='orange'?'bg-orange-50 border-orange-200':'bg-yellow-50 border-yellow-200'}`}>
                        <p className={`text-2xl font-bold ${String(color)==='red'?'text-red-600':String(color)==='orange'?'text-orange-600':'text-yellow-600'}`}>{count}</p>
                        <p className="text-sm text-gray-600">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Notification List */}
                  {notifications.map((notif, idx) => (
                    <div key={idx} onClick={() => { setSelectedPlan(allPlans.find(p=>p.plan_id===notif.plan_id)||null); setActiveTab('plans') }}
                      className={`p-4 rounded-xl border cursor-pointer hover:shadow-md transition ${notif.type==='overdue'?'bg-red-50 border-red-200':notif.type==='no_evidence'?'bg-orange-50 border-orange-200':'bg-yellow-50 border-yellow-200'}`}>
                      <div className="flex items-start gap-3">
                        <span className="text-xl shrink-0">{notif.type==='overdue'?'🔴':notif.type==='no_evidence'?'🟠':'🟡'}</span>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-sm">{notif.plan_title}</p>
                              <p className="text-xs text-gray-600 mt-0.5">Employee: {notif.employee_name}</p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${notif.type==='overdue'?'bg-red-100 text-red-700':notif.type==='no_evidence'?'bg-orange-100 text-orange-700':'bg-yellow-100 text-yellow-700'}`}>
                              {notif.type==='overdue'?'Overdue':notif.type==='no_evidence'?'No Evidence':'Deadline Soon'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mt-1">{notif.message}</p>
                          <p className="text-xs text-blue-600 mt-1.5 hover:underline">Click to view plan →</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
