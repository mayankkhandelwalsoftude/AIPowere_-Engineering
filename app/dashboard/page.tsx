'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const PlanImportExport = dynamic(() => import('@/components/PlanImportExport'), { ssr: false })

interface LearningPlan { plan_id:string; title:string; plan_type:string; technology_area:string; status:string; start_date:string; end_date:string; priority:number; objective:string; learning_objectives:string; github_repo:string; business_use_case:string; skills_tags:string; completion_percentage:number }
interface AIScore { learning_score:number; relevance_score:number; execution_score:number; delivery_score:number; authenticity_score:number; final_score:number; learning_reason?:string; relevance_reason?:string; execution_reason?:string; delivery_reason?:string; authenticity_reason?:string; recommendations?:string; gaps?:string; strengths?:string; timeline_assessment?:string; overall_feedback?:string }
interface Comment { comment_id:string; comment_text:string; created_at:string; employee_master:any }
interface TaskReview { review_id:string; task_score:number; overall_verdict:string; quality_review:string; alignment_review:string; deliverable_review:string; market_value_review:string; missing_items:string; recommendations:string }

const PLAN_TYPES = ['GenAI','AI Engineering','MLOps','Data Engineering','AI Agents','LLMOps','RAG','MCP','Cloud AI','AI Security','Custom']
const TASK_TYPES = ['Learning','Coding','POC','Documentation','Demo','Assessment','Certification','Project']
const inp = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
const lbl = "block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide"

export default function UserDashboard() {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [plans, setPlans] = useState<LearningPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<string|null>(null)
  const [milestones, setMilestones] = useState<any[]>([])
  const [aiScore, setAiScore] = useState<AIScore|null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [modal, setModal] = useState<'none'|'createPlan'|'editPlan'|'addMilestone'|'editMilestone'|'addTask'|'editTask'|'evidence'|'ai'|'taskReview'>('none')
  const [activeMilestone, setActiveMilestone] = useState<any>(null)
  const [activeTask, setActiveTask] = useState<any>(null)
  const [taskReview, setTaskReview] = useState<TaskReview|null>(null)
  const [loadingReview, setLoadingReview] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [planForm, setPlanForm] = useState({ title:'', plan_type:'GenAI', technology_area:'', objective:'', learning_objectives:'', skills_tags:'', github_repo:'', business_use_case:'', start_date:'', end_date:'', priority:2 })
  const [msForm, setMsForm] = useState({ title:'', goal:'', start_date:'', end_date:'', skills_covered:'', evidence_expected:'' })
  const [taskForm, setTaskForm] = useState({ title:'', task_type:'Learning', due_date:'', estimated_hours:2, description:'', expected_output:'' })
  const [evidenceForm, setEvidenceForm] = useState({ github_link:'', pr_link:'', demo_url:'', jira_link:'', certificate_url:'', notes:'', hours_spent:0 })

  useEffect(() => { checkAuth() }, [])
  useEffect(() => { if (selectedPlan && employeeId) { fetchMilestones(); fetchAIScore(); fetchComments() } }, [selectedPlan, employeeId])

  const checkAuth = async () => {
    const { data:{ session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    const { data:emp } = await supabase.from('employee_master').select('*').eq('email', session.user.email).single()
    if (emp) { setEmployeeId(emp.employee_id); setUserName(emp.name); fetchPlans(emp.employee_id) }
  }
  const fetchPlans = async (id:string) => {
    setLoading(true)
    const { data } = await supabase.from('learning_plans').select('*').eq('employee_id', id).order('created_at', { ascending:false })
    if (data) { setPlans(data); if (data.length > 0 && !selectedPlan) setSelectedPlan(data[0].plan_id) }
    setLoading(false)
  }
  const fetchMilestones = async () => {
    const { data } = await supabase.from('plan_milestones').select('*, learning_tasks(*)').eq('plan_id', selectedPlan!).order('order_number')
    if (data) setMilestones(data)
  }
  const fetchAIScore = async () => {
    const { data } = await supabase.from('ai_evaluation_scores').select('*').eq('plan_id', selectedPlan!).eq('employee_id', employeeId).single()
    setAiScore(data || null)
  }
  const fetchComments = async () => {
    const { data } = await supabase.from('plan_comments').select('*, employee_master(name)').eq('plan_id', selectedPlan!).order('created_at')
    setComments(data || [])
  }

  // Plan CRUD
  const openCreatePlan = () => { setPlanForm({ title:'', plan_type:'GenAI', technology_area:'', objective:'', learning_objectives:'', skills_tags:'', github_repo:'', business_use_case:'', start_date:'', end_date:'', priority:2 }); setModal('createPlan') }
  const openEditPlan = () => {
    const p = plans.find(x => x.plan_id === selectedPlan)
    if (!p) return
    setPlanForm({ title:p.title||'', plan_type:p.plan_type||'GenAI', technology_area:p.technology_area||'', objective:p.objective||'', learning_objectives:p.learning_objectives||'', skills_tags:p.skills_tags||'', github_repo:p.github_repo||'', business_use_case:p.business_use_case||'', start_date:p.start_date||'', end_date:p.end_date||'', priority:p.priority||2 })
    setModal('editPlan')
  }
  const savePlanHeader = async (isEdit:boolean) => {
    if (!planForm.title||!planForm.objective||!planForm.start_date||!planForm.end_date) { alert('Fill required fields'); return }
    setSaving(true)
    try {
      if (isEdit) {
        await supabase.from('learning_plans').update({ ...planForm }).eq('plan_id', selectedPlan!)
        setModal('none')
        fetchPlans(employeeId)
      } else {
        const { data:np, error } = await supabase.from('learning_plans').insert([{ employee_id:employeeId, ...planForm, status:'Active' }]).select().single()
        if (error) throw error
        setModal('none')
        await fetchPlans(employeeId)
        setSelectedPlan(np.plan_id)
        fetch('/api/evaluate-plan', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ plan_id:np.plan_id, employee_id:employeeId, plan_data:planForm }) })
      }
    } catch(e:any) { alert(e.message) }
    setSaving(false)
  }

  // Milestone CRUD
  const openAddMilestone = () => { setMsForm({ title:'', goal:'', start_date:'', end_date:'', skills_covered:'', evidence_expected:'' }); setModal('addMilestone') }
  const openEditMilestone = (ms:any) => { setActiveMilestone(ms); setMsForm({ title:ms.title||'', goal:ms.goal||'', start_date:ms.start_date||'', end_date:ms.end_date||'', skills_covered:ms.skills_covered||'', evidence_expected:ms.evidence_expected||'' }); setModal('editMilestone') }
  const saveMilestone = async (isEdit:boolean) => {
    if (!msForm.title) { alert('Milestone title required'); return }
    setSaving(true)
    try {
      if (isEdit) {
        await supabase.from('plan_milestones').update({ ...msForm }).eq('milestone_id', activeMilestone.milestone_id)
      } else {
        await supabase.from('plan_milestones').insert([{ plan_id:selectedPlan!, ...msForm, order_number: milestones.length + 1 }])
      }
      setModal('none')
      fetchMilestones()
    } catch(e:any) { alert(e.message) }
    setSaving(false)
  }
  const deleteMilestone = async (ms:any) => {
    if (!confirm(`Delete milestone "${ms.title}" and all its tasks?`)) return
    await supabase.from('learning_tasks').delete().eq('milestone_id', ms.milestone_id)
    await supabase.from('plan_milestones').delete().eq('milestone_id', ms.milestone_id)
    fetchMilestones()
  }

  // Task CRUD
  const openAddTask = (ms:any) => { setActiveMilestone(ms); setTaskForm({ title:'', task_type:'Learning', due_date:ms.end_date||'', estimated_hours:2, description:'', expected_output:'' }); setModal('addTask') }
  const openEditTask = (task:any, ms:any) => { setActiveTask(task); setActiveMilestone(ms); setTaskForm({ title:task.title||'', task_type:task.task_type||'Learning', due_date:task.due_date||'', estimated_hours:task.estimated_hours||2, description:task.description||'', expected_output:task.expected_output||'' }); setModal('editTask') }
  const saveTask = async (isEdit:boolean) => {
    if (!taskForm.title) { alert('Task title required'); return }
    setSaving(true)
    try {
      if (isEdit) {
        await supabase.from('learning_tasks').update({ ...taskForm }).eq('task_id', activeTask.task_id)
      } else {
        await supabase.from('learning_tasks').insert([{ plan_id:selectedPlan!, milestone_id:activeMilestone.milestone_id, ...taskForm, status:'Pending' }])
      }
      setModal('none')
      fetchMilestones()
    } catch(e:any) { alert(e.message) }
    setSaving(false)
  }
  const deleteTask = async (task:any) => {
    if (!confirm(`Delete task "${task.title}"?`)) return
    await supabase.from('learning_tasks').delete().eq('task_id', task.task_id)
    fetchMilestones()
  }

  const openTaskReview = async (task: any) => {
    setActiveTask(task)
    setTaskReview(null)
    setLoadingReview(true)
    setModal('taskReview')
    const { data } = await supabase.from('task_ai_reviews').select('*').eq('task_id', task.task_id).single()
    setTaskReview(data || null)
    setLoadingReview(false)
  }

  const handleImportDone = async (planId: string) => {
    setShowImport(false)
    await fetchPlans(employeeId)
    setSelectedPlan(planId)
  }

  // Evidence
  const openEvidence = (task:any) => { setActiveTask(task); setEvidenceForm({ github_link:task.github_link||'', pr_link:task.pr_link||'', demo_url:task.demo_url||'', jira_link:task.jira_link||'', certificate_url:task.certificate_url||'', notes:task.notes||'', hours_spent:task.hours_spent||0 }); setModal('evidence') }
  const saveEvidence = async () => {
    setSaving(true)
    const { error } = await supabase.from('learning_tasks').update({ ...evidenceForm, status:'In Progress' }).eq('task_id', activeTask.task_id)
    if (!error) { setModal('none'); fetchMilestones() } else alert(error.message)
    setSaving(false)
  }
  const handleFileUpload = async (e:React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file||!activeTask) return
    setUploading(true)
    try {
      const path = `${employeeId}/${activeTask.task_id}/${Date.now()}-${file.name}`
      const { error:upErr } = await supabase.storage.from('evidence').upload(path, file)
      if (upErr) throw upErr
      const { data:urlData } = supabase.storage.from('evidence').getPublicUrl(path)
      const existing = activeTask.file_urls ? JSON.parse(activeTask.file_urls) : []
      const updated = [...existing, { name:file.name, url:urlData.publicUrl }]
      await supabase.from('learning_tasks').update({ file_urls:JSON.stringify(updated) }).eq('task_id', activeTask.task_id)
      setActiveTask({ ...activeTask, file_urls:JSON.stringify(updated) })
      fetchMilestones()
    } catch(e:any) { alert(e.message) }
    setUploading(false)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }
  const currentPlan = plans.find(p => p.plan_id === selectedPlan)
  const safe = (j:string|undefined):any[] => { try { const p = j?JSON.parse(j):[]; return Array.isArray(p)?p:[] } catch { return [] } }
  const safeObj = (j:string|undefined):any => { try { return j?JSON.parse(j):{} } catch { return {} } }
  const scoreColor = (s:number) => s>=80?'text-green-600':s>=60?'text-blue-600':s>=40?'text-yellow-600':'text-red-600'
  const barColor = (s:number) => s>=80?'bg-green-500':s>=60?'bg-blue-500':s>=40?'bg-yellow-500':'bg-red-500'

  const PlanFormFields = () => (
    <div className="space-y-4 p-5 overflow-y-auto max-h-[65vh]">
      <div><label className={lbl}>Plan Title *</label><input type="text" value={planForm.title} onChange={e=>setPlanForm({...planForm,title:e.target.value})} className={inp} placeholder="e.g. Master RAG and AI Agents in 90 days" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className={lbl}>Plan Type</label><select value={planForm.plan_type} onChange={e=>setPlanForm({...planForm,plan_type:e.target.value})} className={inp}>{PLAN_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
        <div><label className={lbl}>Technology Area</label><input type="text" value={planForm.technology_area} onChange={e=>setPlanForm({...planForm,technology_area:e.target.value})} className={inp} placeholder="LangChain, OpenAI, Azure" /></div>
      </div>
      <div><label className={lbl}>Objective *</label><textarea value={planForm.objective} onChange={e=>setPlanForm({...planForm,objective:e.target.value})} className={inp} rows={3} placeholder="What will you be able to DO after this plan?" /></div>
      <div><label className={lbl}>Learning Objectives</label><textarea value={planForm.learning_objectives} onChange={e=>setPlanForm({...planForm,learning_objectives:e.target.value})} className={inp} rows={4} placeholder={"- Understand RAG architecture\n- Build production pipeline\n- Deploy to Azure"} /></div>
      <div><label className={lbl}>Skills Tags</label><input type="text" value={planForm.skills_tags} onChange={e=>setPlanForm({...planForm,skills_tags:e.target.value})} className={inp} placeholder="RAG, LangChain, Vector DB, Azure OpenAI" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className={lbl}>Start Date *</label><input type="date" value={planForm.start_date} onChange={e=>setPlanForm({...planForm,start_date:e.target.value})} className={inp} /></div>
        <div><label className={lbl}>End Date *</label><input type="date" value={planForm.end_date} onChange={e=>setPlanForm({...planForm,end_date:e.target.value})} className={inp} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className={lbl}>Priority</label><select value={planForm.priority} onChange={e=>setPlanForm({...planForm,priority:parseInt(e.target.value)})} className={inp}><option value={1}>Low</option><option value={2}>Medium</option><option value={3}>High</option></select></div>
        <div><label className={lbl}>GitHub Repo</label><input type="text" value={planForm.github_repo} onChange={e=>setPlanForm({...planForm,github_repo:e.target.value})} className={inp} placeholder="https://github.com/..." /></div>
      </div>
      <div><label className={lbl}>Business Use Case</label><input type="text" value={planForm.business_use_case} onChange={e=>setPlanForm({...planForm,business_use_case:e.target.value})} className={inp} placeholder="Which client or delivery does this support?" /></div>
    </div>
  )

  const MilestoneFormFields = () => (
    <div className="space-y-3 p-5">
      <div><label className={lbl}>Milestone Title *</label><input type="text" value={msForm.title} onChange={e=>setMsForm({...msForm,title:e.target.value})} className={inp} placeholder="e.g. Week 1: RAG Fundamentals" /></div>
      <div><label className={lbl}>Goal</label><input type="text" value={msForm.goal} onChange={e=>setMsForm({...msForm,goal:e.target.value})} className={inp} placeholder="What will be achieved by end of this milestone?" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={lbl}>Start Date</label><input type="date" value={msForm.start_date} onChange={e=>setMsForm({...msForm,start_date:e.target.value})} className={inp} /></div>
        <div><label className={lbl}>End Date</label><input type="date" value={msForm.end_date} onChange={e=>setMsForm({...msForm,end_date:e.target.value})} className={inp} /></div>
      </div>
      <div><label className={lbl}>Skills Covered</label><input type="text" value={msForm.skills_covered} onChange={e=>setMsForm({...msForm,skills_covered:e.target.value})} className={inp} placeholder="RAG, FAISS, LangChain" /></div>
      <div><label className={lbl}>Expected Evidence</label><input type="text" value={msForm.evidence_expected} onChange={e=>setMsForm({...msForm,evidence_expected:e.target.value})} className={inp} placeholder="GitHub commit, demo video" /></div>
    </div>
  )

  const TaskFormFields = () => (
    <div className="space-y-3 p-5">
      <div><label className={lbl}>Task Title *</label><input type="text" value={taskForm.title} onChange={e=>setTaskForm({...taskForm,title:e.target.value})} className={inp} placeholder="e.g. Build document Q&A with FAISS" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={lbl}>Task Type</label><select value={taskForm.task_type} onChange={e=>setTaskForm({...taskForm,task_type:e.target.value})} className={inp}>{TASK_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
        <div><label className={lbl}>Due Date</label><input type="date" value={taskForm.due_date} onChange={e=>setTaskForm({...taskForm,due_date:e.target.value})} className={inp} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={lbl}>Estimated Hours</label><input type="number" value={taskForm.estimated_hours} onChange={e=>setTaskForm({...taskForm,estimated_hours:parseFloat(e.target.value)})} className={inp} min={0} step={0.5} /></div>
        <div><label className={lbl}>Expected Output</label><input type="text" value={taskForm.expected_output} onChange={e=>setTaskForm({...taskForm,expected_output:e.target.value})} className={inp} placeholder="GitHub commit, demo URL" /></div>
      </div>
      <div><label className={lbl}>Description</label><textarea value={taskForm.description} onChange={e=>setTaskForm({...taskForm,description:e.target.value})} className={inp} rows={3} placeholder="What exactly needs to be done?" /></div>
    </div>
  )

  const Modal = ({ title, onSave, saveLabel='Save', children }: any) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-5 border-b shrink-0">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={() => setModal('none')} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
        <div className="flex justify-end gap-3 p-5 border-t shrink-0">
          <button onClick={() => setModal('none')} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm">Cancel</button>
          <button onClick={onSave} disabled={saving} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:bg-gray-400 font-medium">{saving ? 'Saving...' : saveLabel}</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div><h1 className="text-xl font-bold text-gray-900">AI Learning Platform</h1><p className="text-sm text-gray-500">Welcome back, {userName}</p></div>
          <div className="flex gap-3">
            <button onClick={() => setShowImport(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">📊 Import from Excel</button>
            <button onClick={openCreatePlan} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">+ New Plan</button>
            <button onClick={handleLogout} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Logout</button>
          </div>
        </div>
      </div>

      {/* IMPORT MODAL */}
      {showImport && <PlanImportExport employeeId={employeeId} onPlanCreated={handleImportDone} onClose={() => setShowImport(false)} />}

      {/* TASK REVIEW MODAL */}
      {modal === 'taskReview' && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-4">
            <div className="flex justify-between items-center p-5 border-b">
              <div>
                <h2 className="text-lg font-bold">AI Task Review</h2>
                {activeTask && <p className="text-sm text-gray-500 mt-0.5">{activeTask.title}</p>}
              </div>
              <button onClick={() => setModal('none')} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="p-5 space-y-5 max-h-[85vh] overflow-y-auto">
              {loadingReview ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3 animate-spin">⟳</div>
                  <p className="text-gray-500">Loading AI review...</p>
                  <p className="text-xs text-gray-400 mt-1">AI review runs in background after plan creation. May take a moment.</p>
                </div>
              ) : !taskReview ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">🤖</div>
                  <p className="text-gray-700 font-medium mb-2">AI review not available yet</p>
                  <p className="text-sm text-gray-500 mb-4">AI reviews tasks automatically after plan is created. This may take 1-2 minutes for new plans.</p>
                  <button onClick={() => openTaskReview(activeTask)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Refresh</button>
                </div>
              ) : (
                <>
                  {/* Score + Verdict */}
                  <div className={`p-5 rounded-xl text-center border-2 ${taskReview.overall_verdict==='Strong'?'bg-green-50 border-green-300':taskReview.overall_verdict==='Good'?'bg-blue-50 border-blue-300':taskReview.overall_verdict==='Needs Work'?'bg-yellow-50 border-yellow-300':'bg-red-50 border-red-300'}`}>
                    <p className={`text-5xl font-bold mb-1 ${taskReview.overall_verdict==='Strong'?'text-green-600':taskReview.overall_verdict==='Good'?'text-blue-600':taskReview.overall_verdict==='Needs Work'?'text-yellow-600':'text-red-600'}`}>{taskReview.task_score}</p>
                    <p className="text-gray-500 text-sm">Task Score / 100</p>
                    <span className={`inline-block mt-2 px-4 py-1 rounded-full font-bold text-sm ${taskReview.overall_verdict==='Strong'?'bg-green-100 text-green-700':taskReview.overall_verdict==='Good'?'bg-blue-100 text-blue-700':taskReview.overall_verdict==='Needs Work'?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'}`}>{taskReview.overall_verdict}</span>
                  </div>

                  {/* 4 Review Dimensions */}
                  {[
                    { title: 'Task Quality', icon: '📋', text: taskReview.quality_review, color: 'blue' },
                    { title: 'Plan Alignment', icon: '🎯', text: taskReview.alignment_review, color: 'green' },
                    { title: 'Deliverable Assessment', icon: '📦', text: taskReview.deliverable_review, color: 'purple' },
                    { title: '2026 Market Value', icon: '📈', text: taskReview.market_value_review, color: 'orange' },
                  ].map(({ title, icon, text }) => (
                    <div key={title} className="border rounded-xl p-4">
                      <h3 className="font-bold text-sm mb-2 flex items-center gap-2"><span>{icon}</span>{title}</h3>
                      <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
                    </div>
                  ))}

                  {/* Missing Items */}
                  {(() => { try { const items = JSON.parse(taskReview.missing_items||'[]'); return items.length > 0 ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <h3 className="font-bold text-red-800 text-sm mb-2">What is Missing</h3>
                      <ul className="space-y-1">{items.map((s:string,i:number) => <li key={i} className="flex gap-2 text-sm text-red-700"><span className="shrink-0">•</span>{s}</li>)}</ul>
                    </div>
                  ) : null } catch { return null } })()}

                  {/* Recommendations */}
                  {(() => { try { const recs = JSON.parse(taskReview.recommendations||'[]'); return recs.length > 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <h3 className="font-bold text-yellow-800 text-sm mb-2">What to Improve</h3>
                      <ol className="space-y-2">{recs.map((r:string,i:number) => <li key={i} className="flex gap-2 text-sm text-gray-700"><span className="font-bold text-yellow-600 shrink-0">{i+1}.</span>{r}</li>)}</ol>
                    </div>
                  ) : null } catch { return null } })()}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {modal === 'createPlan' && <Modal title="Create Learning Plan" onSave={() => savePlanHeader(false)} saveLabel="Create Plan"><PlanFormFields /></Modal>}
      {modal === 'editPlan' && <Modal title="Edit Plan Details" onSave={() => savePlanHeader(true)} saveLabel="Save Changes"><PlanFormFields /></Modal>}
      {modal === 'addMilestone' && <Modal title="Add Milestone" onSave={() => saveMilestone(false)} saveLabel="Add Milestone"><MilestoneFormFields /></Modal>}
      {modal === 'editMilestone' && <Modal title="Edit Milestone" onSave={() => saveMilestone(true)} saveLabel="Save Milestone"><MilestoneFormFields /></Modal>}
      {modal === 'addTask' && <Modal title={`Add Task to: ${activeMilestone?.title}`} onSave={() => saveTask(false)} saveLabel="Add Task"><TaskFormFields /></Modal>}
      {modal === 'editTask' && <Modal title="Edit Task" onSave={() => saveTask(true)} saveLabel="Save Task"><TaskFormFields /></Modal>}

      {modal === 'evidence' && activeTask && (
        <Modal title="Add Evidence & Progress" onSave={saveEvidence} saveLabel="Save Evidence">
          <div className="space-y-3 p-5">
            <p className="text-sm font-semibold bg-gray-100 px-3 py-2 rounded">{activeTask.title}</p>
            <div><label className={lbl}>GitHub / Commit Link</label><input type="url" value={evidenceForm.github_link} onChange={e=>setEvidenceForm({...evidenceForm,github_link:e.target.value})} className={inp} placeholder="https://github.com/..." /></div>
            <div><label className={lbl}>Pull Request Link</label><input type="url" value={evidenceForm.pr_link} onChange={e=>setEvidenceForm({...evidenceForm,pr_link:e.target.value})} className={inp} placeholder="https://github.com/.../pull/..." /></div>
            <div><label className={lbl}>Demo / Deployed URL</label><input type="url" value={evidenceForm.demo_url} onChange={e=>setEvidenceForm({...evidenceForm,demo_url:e.target.value})} className={inp} placeholder="https://..." /></div>
            <div><label className={lbl}>Jira / ADO Link</label><input type="url" value={evidenceForm.jira_link} onChange={e=>setEvidenceForm({...evidenceForm,jira_link:e.target.value})} className={inp} placeholder="https://..." /></div>
            <div><label className={lbl}>Certificate URL</label><input type="url" value={evidenceForm.certificate_url} onChange={e=>setEvidenceForm({...evidenceForm,certificate_url:e.target.value})} className={inp} placeholder="https://..." /></div>
            <div><label className={lbl}>Hours Spent</label><input type="number" value={evidenceForm.hours_spent} onChange={e=>setEvidenceForm({...evidenceForm,hours_spent:parseFloat(e.target.value)})} className={inp} min={0} step={0.5} /></div>
            <div><label className={lbl}>Progress Notes</label><textarea value={evidenceForm.notes} onChange={e=>setEvidenceForm({...evidenceForm,notes:e.target.value})} className={inp} rows={3} placeholder="What did you complete? Any blockers?" /></div>
            <div>
              <label className={lbl}>Upload File (Screenshot, PDF, Doc)</label>
              <input type="file" onChange={handleFileUpload} disabled={uploading} className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700" />
              {uploading && <p className="text-xs text-blue-500 mt-1">Uploading...</p>}
              {activeTask.file_urls && (() => { try { return JSON.parse(activeTask.file_urls).map((x:any,i:number) => <a key={i} href={x.url} target="_blank" rel="noopener noreferrer" className="flex gap-1 text-xs text-blue-600 hover:underline mt-1"><span>📎</span>{x.name}</a>) } catch { return null } })()}
            </div>
          </div>
        </Modal>
      )}

      {modal === 'ai' && aiScore && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-4">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-lg font-bold">AI Evaluation Report</h2>
              <button onClick={() => setModal('none')} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="p-5 space-y-5 max-h-[85vh] overflow-y-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="font-bold text-blue-800 text-sm mb-2">Scoring Formula</h3>
                <p className="text-xs font-mono bg-white rounded p-2 border border-blue-200 text-blue-900">Final = (Learning × 25%) + (Relevance × 20%) + (Execution × 25%) + (Delivery × 20%) + (Authenticity × 10%)</p>
                <div className="grid grid-cols-5 gap-1 mt-2">
                  {[['Learning','25%'],['Relevance','20%'],['Execution','25%'],['Delivery','20%'],['Authentic','10%']].map(([n,w]) => (
                    <div key={n} className="text-center bg-white rounded p-1.5 border text-xs"><p className="font-bold text-blue-700">{w}</p><p className="text-gray-500">{n}</p></div>
                  ))}
                </div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className={`text-5xl font-bold ${scoreColor(aiScore.final_score)}`}>{Number(aiScore.final_score).toFixed(1)}</p>
                <p className="text-gray-500 text-sm mt-1">Final Score / 100</p>
                {aiScore.timeline_assessment && <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${aiScore.timeline_assessment==='Realistic'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>Timeline: {aiScore.timeline_assessment}</span>}
              </div>
              {aiScore.overall_feedback && (
                <div className="bg-gray-50 rounded-xl p-4 border-l-4 border-blue-500">
                  <h3 className="font-bold text-sm mb-2 text-blue-700">Overall Assessment</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{aiScore.overall_feedback}</p>
                </div>
              )}
              {[
                { label:'Learning Quality', key:'learning', score:aiScore.learning_score, weight:'25%', reason:aiScore.learning_reason },
                { label:'Market Relevance', key:'relevance', score:aiScore.relevance_score, weight:'20%', reason:aiScore.relevance_reason },
                { label:'Execution Focus', key:'execution', score:aiScore.execution_score, weight:'25%', reason:aiScore.execution_reason },
                { label:'Delivery Readiness', key:'delivery', score:aiScore.delivery_score, weight:'20%', reason:aiScore.delivery_reason },
                { label:'Authenticity', key:'authenticity', score:aiScore.authenticity_score, weight:'10%', reason:aiScore.authenticity_reason },
              ].map(({ label, key, score, weight, reason }) => {
                const rec = safeObj(aiScore.recommendations)
                const actions:string[] = Array.isArray(rec[key]) ? rec[key] : []
                return (
                  <div key={key} className="border rounded-xl overflow-hidden">
                    <div className="flex justify-between items-center p-3 bg-gray-50">
                      <div><span className="font-bold text-sm">{label}</span><span className="ml-2 text-xs text-gray-400">Weight: {weight}</span></div>
                      <span className={`text-2xl font-bold ${scoreColor(score)}`}>{score}</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2"><div className={`${barColor(score)} h-2`} style={{width:`${score}%`}} /></div>
                    {reason && <div className="p-4 border-t"><p className="text-xs font-bold text-gray-500 uppercase mb-2">Why this score</p><p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{reason}</p></div>}
                    {actions.length > 0 && (
                      <div className="p-4 border-t bg-yellow-50">
                        <p className="text-xs font-bold text-yellow-700 uppercase mb-2">What you need to change</p>
                        <ol className="space-y-1">{actions.map((a,i) => <li key={i} className="flex gap-2 text-sm text-gray-700"><span className="font-bold text-yellow-600 shrink-0">{i+1}.</span><span>{a}</span></li>)}</ol>
                      </div>
                    )}
                  </div>
                )
              })}
              <div className="grid grid-cols-2 gap-4">
                {safe(aiScore.strengths).length > 0 && <div className="bg-green-50 border border-green-200 rounded-xl p-4"><h3 className="font-bold text-green-800 text-xs uppercase mb-2">Strengths</h3>{safe(aiScore.strengths).map((s:string,i:number) => <p key={i} className="text-sm text-green-700 flex gap-1"><span>✓</span>{s}</p>)}</div>}
                {safe(aiScore.gaps).length > 0 && <div className="bg-red-50 border border-red-200 rounded-xl p-4"><h3 className="font-bold text-red-800 text-xs uppercase mb-2">Gaps Detected</h3>{safe(aiScore.gaps).map((g:string,i:number) => <p key={i} className="text-sm text-red-700 flex gap-1"><span>!</span>{g}</p>)}</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="font-semibold mb-3">My Plans ({plans.length})</h2>
              {loading ? <p className="text-sm text-gray-400">Loading...</p> : plans.length === 0 ? <p className="text-sm text-gray-400">No plans yet.</p> : (
                <div className="space-y-2">
                  {plans.map(p => (
                    <div key={p.plan_id} onClick={() => setSelectedPlan(p.plan_id)} className={`p-3 rounded-lg cursor-pointer border transition ${selectedPlan===p.plan_id?'border-blue-500 bg-blue-50':'border-gray-100 hover:border-blue-300'}`}>
                      <p className="font-medium text-sm truncate">{p.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.plan_type}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${p.status==='Completed'?'bg-green-100 text-green-700':p.status==='In Progress'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-600'}`}>{p.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {aiScore && (
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-sm">AI Score</h3>
                  <button onClick={() => setModal('ai')} className="text-xs text-blue-600 hover:underline font-medium">Full Report</button>
                </div>
                <div className="text-center mb-3"><span className={`text-4xl font-bold ${scoreColor(aiScore.final_score)}`}>{Number(aiScore.final_score).toFixed(1)}</span><span className="text-gray-400 text-sm">/100</span></div>
                {[['Learning',aiScore.learning_score],['Relevance',aiScore.relevance_score],['Execution',aiScore.execution_score],['Delivery',aiScore.delivery_score]].map(([l,s]) => (
                  <div key={String(l)} className="mb-1.5">
                    <div className="flex justify-between text-xs mb-0.5"><span className="text-gray-500">{l}</span><span className="font-medium">{s}</span></div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5"><div className={`${barColor(Number(s))} h-1.5 rounded-full`} style={{width:`${s}%`}} /></div>
                  </div>
                ))}
              </div>
            )}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="grid grid-cols-2 gap-2">
                {[['Plans',plans.length],['Active',plans.filter(p=>p.status==='Active'||p.status==='In Progress').length],['Done',plans.filter(p=>p.status==='Completed').length],['Milestones',milestones.length]].map(([l,v]) => (
                  <div key={String(l)} className="bg-gray-50 rounded-lg p-3 text-center"><p className="text-xl font-bold">{v}</p><p className="text-xs text-gray-500">{l}</p></div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Plan Detail */}
          <div className="lg:col-span-2 space-y-4">
            {currentPlan ? (
              <>
                {/* Plan Header Card */}
                <div className="bg-white rounded-xl shadow-sm p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h2 className="text-xl font-bold">{currentPlan.title}</h2>
                      <div className="flex gap-2 mt-1 flex-wrap text-xs text-gray-500">
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">{currentPlan.plan_type}</span>
                        {currentPlan.technology_area && <span>{currentPlan.technology_area}</span>}
                        <span>{new Date(currentPlan.start_date).toLocaleDateString()} - {new Date(currentPlan.end_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button onClick={openEditPlan} className="shrink-0 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs hover:bg-gray-200 font-medium flex items-center gap-1">
                      ✏️ Edit Plan
                    </button>
                  </div>
                  {currentPlan.objective && <div className="bg-blue-50 rounded-lg p-3 mb-2"><p className="text-xs font-bold text-blue-700 mb-1">OBJECTIVE</p><p className="text-sm text-gray-700">{currentPlan.objective}</p></div>}
                  {currentPlan.learning_objectives && <div className="bg-green-50 rounded-lg p-3 mb-2"><p className="text-xs font-bold text-green-700 mb-1">LEARNING OBJECTIVES</p><p className="text-sm text-gray-700 whitespace-pre-line">{currentPlan.learning_objectives}</p></div>}
                  {currentPlan.skills_tags && <div className="flex gap-1 flex-wrap mt-2">{currentPlan.skills_tags.split(',').map(t => <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{t.trim()}</span>)}</div>}
                  {currentPlan.github_repo && <a href={currentPlan.github_repo} target="_blank" rel="noopener noreferrer" className="block mt-2 text-xs text-blue-600 hover:underline">GitHub: {currentPlan.github_repo}</a>}
                </div>

                {/* Milestones Section */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {/* Section Header with Add Milestone button */}
                  <div className="flex justify-between items-center px-5 py-4 border-b bg-gray-50">
                    <h3 className="font-semibold text-gray-800">Milestones ({milestones.length})</h3>
                    <button onClick={openAddMilestone} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 font-medium">+ Add Milestone</button>
                  </div>

                  {milestones.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">No milestones yet. Click "+ Add Milestone" to add your first milestone.</div>
                  ) : (
                    <div className="divide-y">
                      {milestones.map((ms, idx) => (
                        <div key={ms.milestone_id}>
                          {/* Milestone Header with Edit/Delete */}
                          <div className="flex justify-between items-center px-5 py-3 bg-blue-600">
                            <div>
                              <p className="text-white font-semibold text-sm">Milestone {idx+1}: {ms.title}</p>
                              {ms.goal && <p className="text-blue-200 text-xs mt-0.5">{ms.goal}</p>}
                              {ms.start_date && <p className="text-blue-200 text-xs">{new Date(ms.start_date).toLocaleDateString()} - {new Date(ms.end_date).toLocaleDateString()} {ms.skills_covered && `· ${ms.skills_covered}`}</p>}
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button onClick={() => openEditMilestone(ms)} className="px-2.5 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-400 font-medium">✏️ Edit</button>
                              <button onClick={() => deleteMilestone(ms)} className="px-2.5 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-400 font-medium">🗑️</button>
                            </div>
                          </div>

                          {/* Tasks */}
                          <div className="p-4 space-y-2">
                            {ms.learning_tasks?.length > 0 ? ms.learning_tasks.map((task:any) => (
                              <div key={task.task_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <div className={`w-2 h-2 rounded-full shrink-0 ${task.status==='Done'?'bg-green-500':task.status==='In Progress'?'bg-blue-500':'bg-gray-300'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{task.title}</p>
                                  <div className="flex gap-2 text-xs text-gray-400 mt-0.5 flex-wrap">
                                    <span className="bg-gray-200 px-1.5 py-0.5 rounded">{task.task_type}</span>
                                    {task.estimated_hours > 0 && <span>{task.estimated_hours}h est</span>}
                                    {task.hours_spent > 0 && <span className="text-blue-500">{task.hours_spent}h spent</span>}
                                    {task.due_date && <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>}
                                  </div>
                                  <div className="flex gap-2 mt-1 flex-wrap">
                                    {task.github_link && <a href={task.github_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">GitHub</a>}
                                    {task.pr_link && <a href={task.pr_link} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-500 hover:underline">PR</a>}
                                    {task.demo_url && <a href={task.demo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-500 hover:underline">Demo</a>}
                                    {task.certificate_url && <a href={task.certificate_url} target="_blank" rel="noopener noreferrer" className="text-xs text-yellow-600 hover:underline">Cert</a>}
                                  </div>
                                  {task.notes && <p className="text-xs text-gray-400 mt-1 italic">"{task.notes}"</p>}
                                </div>
                                {/* Task Action Buttons */}
                                <div className="flex gap-1 shrink-0">
                                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${task.status==='Done'?'bg-green-100 text-green-700':task.status==='In Progress'?'bg-blue-100 text-blue-700':task.status==='Blocked'?'bg-red-100 text-red-700':'bg-gray-100 text-gray-600'}`}>{task.status}</span>
                                  <button onClick={() => openEditTask(task, ms)} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200 font-medium" title="Edit task">✏️</button>
                                  <button onClick={() => openEvidence(task)} className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100 font-medium" title="Add evidence">📎</button>
                                  <button onClick={() => openTaskReview(task)} className="px-2 py-1 bg-purple-50 text-purple-600 rounded text-xs hover:bg-purple-100 font-medium" title="AI Review">🤖</button>
                                  <button onClick={() => deleteTask(task)} className="px-2 py-1 bg-red-50 text-red-500 rounded text-xs hover:bg-red-100" title="Delete task">🗑️</button>
                                </div>
                              </div>
                            )) : <p className="text-xs text-gray-400 text-center py-2">No tasks yet.</p>}

                            {/* Add Task Button under each milestone */}
                            <button onClick={() => openAddTask(ms)} className="w-full py-2 border border-dashed border-gray-300 text-gray-500 rounded-lg text-xs hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition">
                              + Add Task to this Milestone
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Comments */}
                {comments.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm p-5">
                    <h3 className="font-semibold text-sm mb-3">Manager Comments ({comments.length})</h3>
                    <div className="space-y-2">
                      {comments.map(c => (
                        <div key={c.comment_id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-sm text-gray-700">{c.comment_text}</p>
                          <p className="text-xs text-gray-400 mt-1">{Array.isArray(c.employee_master)?c.employee_master[0]?.name:c.employee_master?.name} · {new Date(c.created_at).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center"><p className="text-gray-400 text-sm">Select a plan or create your first learning plan</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
