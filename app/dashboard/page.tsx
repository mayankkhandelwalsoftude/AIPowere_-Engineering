'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface LearningPlan {
  plan_id: string; title: string; plan_type: string; technology_area: string
  status: string; start_date: string; end_date: string; priority: number
  objective: string; learning_objectives: string; github_repo: string
  business_use_case: string; skills_tags: string; completion_percentage: number
}
interface Milestone {
  milestone_id?: string; title: string; goal: string; start_date: string
  end_date: string; order_number: number; skills_covered: string; evidence_expected: string
  tasks: Task[]
}
interface Task {
  task_id?: string; title: string; task_type: string; due_date: string
  estimated_hours: number; description: string; expected_output: string; status?: string
}
interface AIScore {
  learning_score: number; relevance_score: number; execution_score: number
  delivery_score: number; authenticity_score: number; final_score: number
  learning_reason?: string; relevance_reason?: string; execution_reason?: string
  delivery_reason?: string; authenticity_reason?: string
  recommendations?: string; gaps?: string; strengths?: string
  timeline_assessment?: string; overall_feedback?: string
}
interface Comment { comment_id: string; comment_text: string; created_at: string; employee_master: any }

const PLAN_TYPES = ['GenAI','AI Engineering','MLOps','Data Engineering','AI Agents','LLMOps','RAG','MCP','Cloud AI','AI Security','Custom']
const TASK_TYPES = ['Learning','Coding','POC','Documentation','Demo','Assessment','Certification','Project']
const inp = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
const lbl = "block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide"
const emptyTask = (dueDate = ''): Task => ({ title:'', task_type:'Learning', due_date:dueDate, estimated_hours:2, description:'', expected_output:'', status:'Pending' })
const emptyMs = (n: number): Milestone => ({ title:'', goal:'', start_date:'', end_date:'', order_number:n, skills_covered:'', evidence_expected:'', tasks:[emptyTask()] })

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
  const [modal, setModal] = useState<'none'|'create'|'edit'|'evidence'|'ai'>('none')
  const [step, setStep] = useState(1)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [uploading, setUploading] = useState(false)
  const [evidenceForm, setEvidenceForm] = useState({ github_link:'', pr_link:'', demo_url:'', jira_link:'', certificate_url:'', notes:'', hours_spent:0 })

  const [planForm, setPlanForm] = useState({ title:'', plan_type:'GenAI', technology_area:'', objective:'', learning_objectives:'', skills_tags:'', github_repo:'', business_use_case:'', start_date:'', end_date:'', priority:2 })
  const [formMilestones, setFormMilestones] = useState<Milestone[]>([emptyMs(1)])

  useEffect(() => { checkAuth() }, [])
  useEffect(() => { if (selectedPlan && employeeId) { fetchMilestones(); fetchAIScore(); fetchComments() } }, [selectedPlan, employeeId])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    const { data: emp } = await supabase.from('employee_master').select('*').eq('email', session.user.email).single()
    if (emp) { setEmployeeId(emp.employee_id); setUserName(emp.name); fetchPlans(emp.employee_id) }
  }
  const fetchPlans = async (id: string) => {
    setLoading(true)
    const { data } = await supabase.from('learning_plans').select('*').eq('employee_id', id).order('created_at', { ascending: false })
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

  const openCreate = () => {
    setPlanForm({ title:'', plan_type:'GenAI', technology_area:'', objective:'', learning_objectives:'', skills_tags:'', github_repo:'', business_use_case:'', start_date:'', end_date:'', priority:2 })
    setFormMilestones([emptyMs(1)])
    setStep(1)
    setModal('create')
  }

  const openEdit = () => {
    const p = plans.find(x => x.plan_id === selectedPlan)
    if (!p) return
    setPlanForm({ title:p.title||'', plan_type:p.plan_type||'GenAI', technology_area:p.technology_area||'', objective:p.objective||'', learning_objectives:p.learning_objectives||'', skills_tags:p.skills_tags||'', github_repo:p.github_repo||'', business_use_case:p.business_use_case||'', start_date:p.start_date||'', end_date:p.end_date||'', priority:p.priority||2 })
    // Load existing milestones with their tasks
    const loadedMilestones: Milestone[] = milestones.map(ms => ({
      milestone_id: ms.milestone_id,
      title: ms.title || '',
      goal: ms.goal || '',
      start_date: ms.start_date || '',
      end_date: ms.end_date || '',
      order_number: ms.order_number || 1,
      skills_covered: ms.skills_covered || '',
      evidence_expected: ms.evidence_expected || '',
      tasks: (ms.learning_tasks || []).map((t: any) => ({
        task_id: t.task_id,
        title: t.title || '',
        task_type: t.task_type || 'Learning',
        due_date: t.due_date || '',
        estimated_hours: t.estimated_hours || 2,
        description: t.description || '',
        expected_output: t.expected_output || '',
        status: t.status || 'Pending'
      }))
    }))
    setFormMilestones(loadedMilestones.length > 0 ? loadedMilestones : [emptyMs(1)])
    setStep(1)
    setModal('edit')
  }

  const savePlan = async (isEdit: boolean) => {
    if (!planForm.title || !planForm.objective || !planForm.start_date || !planForm.end_date) { alert('Fill required fields: Title, Objective, Start Date, End Date'); return }
    setSaving(true)
    try {
      let planId = selectedPlan
      if (isEdit) {
        const { error } = await supabase.from('learning_plans').update({ ...planForm }).eq('plan_id', selectedPlan!)
        if (error) throw error

        // Update each milestone and its tasks
        for (const ms of formMilestones) {
          if (!ms.title) continue
          if (ms.milestone_id) {
            // Update existing milestone
            await supabase.from('plan_milestones').update({ title:ms.title, goal:ms.goal, start_date:ms.start_date, end_date:ms.end_date, order_number:ms.order_number, skills_covered:ms.skills_covered, evidence_expected:ms.evidence_expected }).eq('milestone_id', ms.milestone_id)
            // Update tasks
            for (const t of ms.tasks) {
              if (!t.title) continue
              if (t.task_id) {
                await supabase.from('learning_tasks').update({ title:t.title, task_type:t.task_type, due_date:t.due_date||ms.end_date, estimated_hours:t.estimated_hours, description:t.description, expected_output:t.expected_output }).eq('task_id', t.task_id)
              } else {
                await supabase.from('learning_tasks').insert([{ plan_id: planId!, milestone_id: ms.milestone_id, title:t.title, task_type:t.task_type, due_date:t.due_date||ms.end_date, estimated_hours:t.estimated_hours, description:t.description, expected_output:t.expected_output, status:'Pending' }])
              }
            }
          } else {
            // New milestone added during edit
            const { data: newMs } = await supabase.from('plan_milestones').insert([{ plan_id: planId!, title:ms.title, goal:ms.goal, start_date:ms.start_date, end_date:ms.end_date, order_number:ms.order_number, skills_covered:ms.skills_covered, evidence_expected:ms.evidence_expected }]).select().single()
            if (newMs) {
              const validTasks = ms.tasks.filter(t => t.title)
              if (validTasks.length > 0) {
                await supabase.from('learning_tasks').insert(validTasks.map(t => ({ plan_id: planId!, milestone_id: newMs.milestone_id, title:t.title, task_type:t.task_type, due_date:t.due_date||ms.end_date, estimated_hours:t.estimated_hours, description:t.description, expected_output:t.expected_output, status:'Pending' })))
              }
            }
          }
        }
      } else {
        // Create new plan
        const { data: np, error } = await supabase.from('learning_plans').insert([{ employee_id: employeeId, ...planForm, status:'Active' }]).select().single()
        if (error) throw error
        planId = np.plan_id
        for (const ms of formMilestones) {
          if (!ms.title) continue
          const { data: newMs } = await supabase.from('plan_milestones').insert([{ plan_id: planId, title:ms.title, goal:ms.goal, start_date:ms.start_date, end_date:ms.end_date, order_number:ms.order_number, skills_covered:ms.skills_covered, evidence_expected:ms.evidence_expected }]).select().single()
          if (!newMs) continue
          const validTasks = ms.tasks.filter(t => t.title)
          if (validTasks.length > 0) {
            await supabase.from('learning_tasks').insert(validTasks.map(t => ({ plan_id: planId!, milestone_id: newMs.milestone_id, title:t.title, task_type:t.task_type, due_date:t.due_date||ms.end_date, estimated_hours:t.estimated_hours, description:t.description, expected_output:t.expected_output, status:'Pending' })))
          }
        }
        fetch('/api/evaluate-plan', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ plan_id: planId, employee_id: employeeId, plan_data: { ...planForm, milestones: formMilestones.map(m=>m.title).join(', ') } }) })
      }

      setModal('none')
      await fetchPlans(employeeId)
      if (planId) { setSelectedPlan(planId); }
    } catch (err: any) { alert('Error: ' + err.message) }
    finally { setSaving(false) }
  }

  const deleteMilestone = async (ms: Milestone, idx: number) => {
    if (!confirm(`Delete milestone "${ms.title}" and all its tasks?`)) return
    if (ms.milestone_id) {
      await supabase.from('learning_tasks').delete().eq('milestone_id', ms.milestone_id)
      await supabase.from('plan_milestones').delete().eq('milestone_id', ms.milestone_id)
    }
    setFormMilestones(p => p.filter((_,i) => i !== idx))
  }

  const deleteTask = async (t: Task, msIdx: number, tIdx: number) => {
    if (t.task_id && !confirm(`Delete task "${t.title}"?`)) return
    if (t.task_id) await supabase.from('learning_tasks').delete().eq('task_id', t.task_id)
    setFormMilestones(p => p.map((m,i) => i === msIdx ? { ...m, tasks: m.tasks.filter((_,j) => j !== tIdx) } : m))
  }

  const openEvidence = (task: any) => {
    setEditingTask(task)
    setEvidenceForm({ github_link:task.github_link||'', pr_link:task.pr_link||'', demo_url:task.demo_url||'', jira_link:task.jira_link||'', certificate_url:task.certificate_url||'', notes:task.notes||'', hours_spent:task.hours_spent||0 })
    setModal('evidence')
  }
  const saveEvidence = async () => {
    if (!editingTask) return
    setSaving(true)
    const { error } = await supabase.from('learning_tasks').update({ ...evidenceForm, status:'In Progress' }).eq('task_id', editingTask.task_id)
    if (!error) { setModal('none'); fetchMilestones() } else alert('Error: ' + error.message)
    setSaving(false)
  }
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editingTask) return
    setUploading(true)
    try {
      const path = `${employeeId}/${editingTask.task_id}/${Date.now()}-${file.name}`
      const { error: upErr } = await supabase.storage.from('evidence').upload(path, file)
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('evidence').getPublicUrl(path)
      const existing = editingTask.file_urls ? JSON.parse(editingTask.file_urls) : []
      const updated = [...existing, { name: file.name, url: urlData.publicUrl }]
      await supabase.from('learning_tasks').update({ file_urls: JSON.stringify(updated) }).eq('task_id', editingTask.task_id)
      setEditingTask({ ...editingTask, file_urls: JSON.stringify(updated) })
      fetchMilestones()
    } catch (err: any) { alert('Upload error: ' + err.message) }
    setUploading(false)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }
  const currentPlan = plans.find(p => p.plan_id === selectedPlan)
  const safe = (j: string|undefined): any[] => { try { const p = j ? JSON.parse(j) : []; return Array.isArray(p) ? p : [] } catch { return [] } }
  const safeObj = (j: string|undefined): any => { try { return j ? JSON.parse(j) : {} } catch { return {} } }
  const scoreColor = (s: number) => s >= 80 ? 'text-green-600' : s >= 60 ? 'text-blue-600' : s >= 40 ? 'text-yellow-600' : 'text-red-600'
  const barColor = (s: number) => s >= 80 ? 'bg-green-500' : s >= 60 ? 'bg-blue-500' : s >= 40 ? 'bg-yellow-500' : 'bg-red-500'

  const MilestoneForm = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        {modal === 'edit' ? 'Edit milestones and tasks. Changes save when you click Save.' : 'Add milestones and tasks for your plan.'}
      </div>
      {formMilestones.map((ms, mi) => (
        <div key={mi} className="border-2 border-blue-200 rounded-xl overflow-hidden">
          <div className="bg-blue-600 px-4 py-2 flex justify-between items-center">
            <span className="text-white font-semibold text-sm">Milestone {mi + 1} {ms.milestone_id ? '(existing)' : '(new)'}</span>
            <button onClick={() => deleteMilestone(ms, mi)} className="text-blue-200 hover:text-white text-sm px-2 py-0.5 rounded border border-blue-400 hover:border-white">Delete</button>
          </div>
          <div className="p-4 space-y-3 bg-white">
            <input type="text" value={ms.title} onChange={e => setFormMilestones(p => p.map((m,i) => i===mi?{...m,title:e.target.value}:m))} className={inp} placeholder="Milestone title e.g. Week 1: RAG Fundamentals *" />
            <input type="text" value={ms.goal} onChange={e => setFormMilestones(p => p.map((m,i) => i===mi?{...m,goal:e.target.value}:m))} className={inp} placeholder="Goal: What will be achieved?" />
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Start Date</label><input type="date" value={ms.start_date} onChange={e => setFormMilestones(p => p.map((m,i) => i===mi?{...m,start_date:e.target.value}:m))} className={inp} /></div>
              <div><label className={lbl}>End Date</label><input type="date" value={ms.end_date} onChange={e => setFormMilestones(p => p.map((m,i) => i===mi?{...m,end_date:e.target.value}:m))} className={inp} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={ms.skills_covered} onChange={e => setFormMilestones(p => p.map((m,i) => i===mi?{...m,skills_covered:e.target.value}:m))} className={inp} placeholder="Skills covered: RAG, FAISS" />
              <input type="text" value={ms.evidence_expected} onChange={e => setFormMilestones(p => p.map((m,i) => i===mi?{...m,evidence_expected:e.target.value}:m))} className={inp} placeholder="Evidence: GitHub commit, demo" />
            </div>

            {/* Tasks */}
            <div className="mt-2">
              <div className="flex justify-between items-center mb-2">
                <label className={lbl}>Tasks ({ms.tasks.length})</label>
                <button onClick={() => setFormMilestones(p => p.map((m,i) => i===mi?{...m,tasks:[...m.tasks,emptyTask(ms.end_date)]}:m))} className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">+ Add Task</button>
              </div>
              <div className="space-y-2">
                {ms.tasks.map((t, ti) => (
                  <div key={ti} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex gap-2 items-start">
                      <span className="text-xs font-bold text-gray-400 mt-2 w-5 shrink-0">{ti+1}</span>
                      <div className="flex-1 space-y-2">
                        <input type="text" value={t.title} onChange={e => setFormMilestones(p => p.map((m,i) => i===mi?{...m,tasks:m.tasks.map((tk,j)=>j===ti?{...tk,title:e.target.value}:tk)}:m))} className={inp} placeholder="Task title *" />
                        <div className="grid grid-cols-2 gap-2">
                          <select value={t.task_type} onChange={e => setFormMilestones(p => p.map((m,i) => i===mi?{...m,tasks:m.tasks.map((tk,j)=>j===ti?{...tk,task_type:e.target.value}:tk)}:m))} className={inp}>
                            {TASK_TYPES.map(tt => <option key={tt}>{tt}</option>)}
                          </select>
                          <input type="date" value={t.due_date} onChange={e => setFormMilestones(p => p.map((m,i) => i===mi?{...m,tasks:m.tasks.map((tk,j)=>j===ti?{...tk,due_date:e.target.value}:tk)}:m))} className={inp} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input type="number" value={t.estimated_hours} onChange={e => setFormMilestones(p => p.map((m,i) => i===mi?{...m,tasks:m.tasks.map((tk,j)=>j===ti?{...tk,estimated_hours:parseFloat(e.target.value)}:tk)}:m))} className={inp} placeholder="Hours" min={0} step={0.5} />
                          <input type="text" value={t.expected_output} onChange={e => setFormMilestones(p => p.map((m,i) => i===mi?{...m,tasks:m.tasks.map((tk,j)=>j===ti?{...tk,expected_output:e.target.value}:tk)}:m))} className={inp} placeholder="Expected output" />
                        </div>
                        <input type="text" value={t.description} onChange={e => setFormMilestones(p => p.map((m,i) => i===mi?{...m,tasks:m.tasks.map((tk,j)=>j===ti?{...tk,description:e.target.value}:tk)}:m))} className={inp} placeholder="Description (optional)" />
                      </div>
                      <button onClick={() => deleteTask(t, mi, ti)} className="text-red-400 hover:text-red-600 text-lg mt-1 shrink-0">×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
      <button onClick={() => setFormMilestones(p => [...p, emptyMs(p.length+1)])} className="w-full py-3 border-2 border-dashed border-blue-300 text-blue-600 rounded-xl text-sm hover:bg-blue-50">+ Add Milestone</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div><h1 className="text-xl font-bold text-gray-900">AI Learning Platform</h1><p className="text-sm text-gray-500">Welcome back, {userName}</p></div>
          <div className="flex gap-3">
            <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">+ New Plan</button>
            <button onClick={handleLogout} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Logout</button>
          </div>
        </div>
      </div>

      {/* CREATE MODAL */}
      {modal === 'create' && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-4">
            <div className="flex justify-between items-center p-5 border-b">
              <div><h2 className="text-lg font-bold">Create Learning Plan</h2><p className="text-xs text-gray-400 mt-0.5">Step {step} of 2</p></div>
              <button onClick={() => setModal('none')} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="flex border-b">
              {['Plan Details','Milestones & Tasks'].map((t,i) => <div key={t} className={`flex-1 py-2 text-center text-xs font-medium border-b-2 ${step===i+1?'border-blue-600 text-blue-600':'border-transparent text-gray-400'}`}>{t}</div>)}
            </div>
            <div className="p-5 overflow-y-auto max-h-[65vh]">
              {step === 1 ? (
                <div className="space-y-4">
                  <div><label className={lbl}>Plan Title *</label><input type="text" value={planForm.title} onChange={e => setPlanForm({...planForm,title:e.target.value})} className={inp} placeholder="e.g. Master RAG and AI Agents in 90 days" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={lbl}>Plan Type *</label><select value={planForm.plan_type} onChange={e => setPlanForm({...planForm,plan_type:e.target.value})} className={inp}>{PLAN_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                    <div><label className={lbl}>Technology Area</label><input type="text" value={planForm.technology_area} onChange={e => setPlanForm({...planForm,technology_area:e.target.value})} className={inp} placeholder="LangChain, OpenAI, Azure" /></div>
                  </div>
                  <div><label className={lbl}>Objective *</label><textarea value={planForm.objective} onChange={e => setPlanForm({...planForm,objective:e.target.value})} className={inp} rows={3} placeholder="What will you be able to DO after this plan?" /></div>
                  <div><label className={lbl}>Learning Objectives</label><textarea value={planForm.learning_objectives} onChange={e => setPlanForm({...planForm,learning_objectives:e.target.value})} className={inp} rows={4} placeholder={"- Understand RAG architecture\n- Build production pipeline\n- Deploy to Azure"} /></div>
                  <div><label className={lbl}>Skills Tags</label><input type="text" value={planForm.skills_tags} onChange={e => setPlanForm({...planForm,skills_tags:e.target.value})} className={inp} placeholder="RAG, LangChain, Vector DB, Azure OpenAI" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={lbl}>Start Date *</label><input type="date" value={planForm.start_date} onChange={e => setPlanForm({...planForm,start_date:e.target.value})} className={inp} /></div>
                    <div><label className={lbl}>End Date *</label><input type="date" value={planForm.end_date} onChange={e => setPlanForm({...planForm,end_date:e.target.value})} className={inp} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={lbl}>Priority</label><select value={planForm.priority} onChange={e => setPlanForm({...planForm,priority:parseInt(e.target.value)})} className={inp}><option value={1}>Low</option><option value={2}>Medium</option><option value={3}>High</option></select></div>
                    <div><label className={lbl}>GitHub Repo</label><input type="text" value={planForm.github_repo} onChange={e => setPlanForm({...planForm,github_repo:e.target.value})} className={inp} placeholder="https://github.com/..." /></div>
                  </div>
                  <div><label className={lbl}>Business Use Case</label><input type="text" value={planForm.business_use_case} onChange={e => setPlanForm({...planForm,business_use_case:e.target.value})} className={inp} placeholder="Which client or delivery does this support?" /></div>
                </div>
              ) : <MilestoneForm />}
            </div>
            <div className="flex justify-between p-5 border-t bg-gray-50 rounded-b-xl">
              <div>{step===2 && <button onClick={() => setStep(1)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm">Back</button>}</div>
              <div className="flex gap-3">
                <button onClick={() => setModal('none')} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm">Cancel</button>
                {step===1 ? <button onClick={() => { if(!planForm.title||!planForm.objective||!planForm.start_date||!planForm.end_date){alert('Fill required fields');return} setStep(2) }} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm">Next: Milestones</button>
                  : <button onClick={() => savePlan(false)} disabled={saving} className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm disabled:bg-gray-400">{saving?'Creating...':'Create Plan'}</button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {modal === 'edit' && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-4">
            <div className="flex justify-between items-center p-5 border-b">
              <div><h2 className="text-lg font-bold">Edit Learning Plan</h2><p className="text-xs text-gray-400 mt-0.5">Edit plan details, milestones, and tasks</p></div>
              <button onClick={() => setModal('none')} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="flex border-b">
              {['Plan Details','Milestones & Tasks'].map((t,i) => <button key={t} onClick={() => setStep(i+1)} className={`flex-1 py-2 text-center text-xs font-medium border-b-2 ${step===i+1?'border-blue-600 text-blue-600':'border-transparent text-gray-400 hover:text-gray-600'}`}>{t}</button>)}
            </div>
            <div className="p-5 overflow-y-auto max-h-[65vh]">
              {step === 1 ? (
                <div className="space-y-4">
                  <div><label className={lbl}>Plan Title *</label><input type="text" value={planForm.title} onChange={e => setPlanForm({...planForm,title:e.target.value})} className={inp} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={lbl}>Plan Type</label><select value={planForm.plan_type} onChange={e => setPlanForm({...planForm,plan_type:e.target.value})} className={inp}>{PLAN_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                    <div><label className={lbl}>Technology Area</label><input type="text" value={planForm.technology_area} onChange={e => setPlanForm({...planForm,technology_area:e.target.value})} className={inp} /></div>
                  </div>
                  <div><label className={lbl}>Objective *</label><textarea value={planForm.objective} onChange={e => setPlanForm({...planForm,objective:e.target.value})} className={inp} rows={3} /></div>
                  <div><label className={lbl}>Learning Objectives</label><textarea value={planForm.learning_objectives} onChange={e => setPlanForm({...planForm,learning_objectives:e.target.value})} className={inp} rows={4} /></div>
                  <div><label className={lbl}>Skills Tags</label><input type="text" value={planForm.skills_tags} onChange={e => setPlanForm({...planForm,skills_tags:e.target.value})} className={inp} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={lbl}>Start Date *</label><input type="date" value={planForm.start_date} onChange={e => setPlanForm({...planForm,start_date:e.target.value})} className={inp} /></div>
                    <div><label className={lbl}>End Date *</label><input type="date" value={planForm.end_date} onChange={e => setPlanForm({...planForm,end_date:e.target.value})} className={inp} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={lbl}>Priority</label><select value={planForm.priority} onChange={e => setPlanForm({...planForm,priority:parseInt(e.target.value)})} className={inp}><option value={1}>Low</option><option value={2}>Medium</option><option value={3}>High</option></select></div>
                    <div><label className={lbl}>GitHub Repo</label><input type="text" value={planForm.github_repo} onChange={e => setPlanForm({...planForm,github_repo:e.target.value})} className={inp} /></div>
                  </div>
                  <div><label className={lbl}>Business Use Case</label><input type="text" value={planForm.business_use_case} onChange={e => setPlanForm({...planForm,business_use_case:e.target.value})} className={inp} /></div>
                </div>
              ) : <MilestoneForm />}
            </div>
            <div className="flex justify-between p-5 border-t bg-gray-50 rounded-b-xl">
              <div className="text-xs text-gray-400">Tip: Switch between tabs to edit all details</div>
              <div className="flex gap-3">
                <button onClick={() => setModal('none')} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm">Cancel</button>
                <button onClick={() => savePlan(true)} disabled={saving} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:bg-gray-400">{saving?'Saving...':'Save All Changes'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EVIDENCE MODAL */}
      {modal === 'evidence' && editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-lg font-bold">Add Evidence & Progress</h2>
              <button onClick={() => setModal('none')} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              <p className="text-sm font-semibold bg-gray-100 px-3 py-2 rounded">{editingTask.title}</p>
              <div><label className={lbl}>GitHub / Commit Link</label><input type="url" value={evidenceForm.github_link} onChange={e => setEvidenceForm({...evidenceForm,github_link:e.target.value})} className={inp} placeholder="https://github.com/..." /></div>
              <div><label className={lbl}>Pull Request Link</label><input type="url" value={evidenceForm.pr_link} onChange={e => setEvidenceForm({...evidenceForm,pr_link:e.target.value})} className={inp} placeholder="https://github.com/.../pull/..." /></div>
              <div><label className={lbl}>Demo / Deployed URL</label><input type="url" value={evidenceForm.demo_url} onChange={e => setEvidenceForm({...evidenceForm,demo_url:e.target.value})} className={inp} placeholder="https://..." /></div>
              <div><label className={lbl}>Jira / ADO Link</label><input type="url" value={evidenceForm.jira_link} onChange={e => setEvidenceForm({...evidenceForm,jira_link:e.target.value})} className={inp} placeholder="https://..." /></div>
              <div><label className={lbl}>Certificate URL</label><input type="url" value={evidenceForm.certificate_url} onChange={e => setEvidenceForm({...evidenceForm,certificate_url:e.target.value})} className={inp} placeholder="https://..." /></div>
              <div><label className={lbl}>Hours Spent</label><input type="number" value={evidenceForm.hours_spent} onChange={e => setEvidenceForm({...evidenceForm,hours_spent:parseFloat(e.target.value)})} className={inp} min={0} step={0.5} /></div>
              <div><label className={lbl}>Progress Notes</label><textarea value={evidenceForm.notes} onChange={e => setEvidenceForm({...evidenceForm,notes:e.target.value})} className={inp} rows={3} placeholder="What did you complete? Any blockers?" /></div>
              <div>
                <label className={lbl}>Upload File (Screenshot, PDF, Doc)</label>
                <input type="file" onChange={handleFileUpload} disabled={uploading} className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                {uploading && <p className="text-xs text-blue-500 mt-1">Uploading...</p>}
                {editingTask.file_urls && (() => { try { const f = JSON.parse(editingTask.file_urls); return f.map((x:any,i:number) => <a key={i} href={x.url} target="_blank" rel="noopener noreferrer" className="flex gap-1 text-xs text-blue-600 hover:underline mt-1"><span>📎</span>{x.name}</a>) } catch { return null } })()}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t">
              <button onClick={() => setModal('none')} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm">Cancel</button>
              <button onClick={saveEvidence} disabled={saving} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:bg-gray-400">{saving?'Saving...':'Save Evidence'}</button>
            </div>
          </div>
        </div>
      )}

      {/* AI REPORT MODAL */}
      {modal === 'ai' && aiScore && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-4">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="text-lg font-bold">AI Evaluation Report</h2>
              <button onClick={() => setModal('none')} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="p-5 space-y-5 max-h-[85vh] overflow-y-auto">

              {/* Scoring Formula */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="font-bold text-blue-800 text-sm mb-2">How Your Score is Calculated</h3>
                <p className="text-xs font-mono bg-white rounded p-2 border border-blue-200 text-blue-900">
                  Final = (Learning × 25%) + (Relevance × 20%) + (Execution × 25%) + (Delivery × 20%) + (Authenticity × 10%)
                </p>
                <div className="grid grid-cols-5 gap-1 mt-2">
                  {[['Learning','25%'],['Relevance','20%'],['Execution','25%'],['Delivery','20%'],['Authentic','10%']].map(([n,w]) => (
                    <div key={n} className="text-center bg-white rounded p-1.5 border text-xs"><p className="font-bold text-blue-700">{w}</p><p className="text-gray-500">{n}</p></div>
                  ))}
                </div>
              </div>

              {/* Final Score + Overall */}
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className={`text-5xl font-bold ${scoreColor(aiScore.final_score)}`}>{Number(aiScore.final_score).toFixed(1)}</p>
                <p className="text-gray-500 text-sm mt-1">Final Score / 100</p>
                {aiScore.timeline_assessment && (
                  <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${aiScore.timeline_assessment==='Realistic'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>
                    Timeline: {aiScore.timeline_assessment}
                  </span>
                )}
              </div>

              {aiScore.overall_feedback && (
                <div className="bg-gray-50 rounded-xl p-4 border-l-4 border-blue-500">
                  <h3 className="font-bold text-sm mb-2 text-blue-700">Overall Assessment</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{aiScore.overall_feedback}</p>
                </div>
              )}

              {/* Per-Criterion with reasons and action lists */}
              {[
                { label:'Learning Quality', key:'learning', score:aiScore.learning_score, weight:'25%', reason:aiScore.learning_reason, color:'blue' },
                { label:'Market Relevance', key:'relevance', score:aiScore.relevance_score, weight:'20%', reason:aiScore.relevance_reason, color:'green' },
                { label:'Execution Focus', key:'execution', score:aiScore.execution_score, weight:'25%', reason:aiScore.execution_reason, color:'purple' },
                { label:'Delivery Readiness', key:'delivery', score:aiScore.delivery_score, weight:'20%', reason:aiScore.delivery_reason, color:'orange' },
                { label:'Authenticity', key:'authenticity', score:aiScore.authenticity_score, weight:'10%', reason:aiScore.authenticity_reason, color:'red' },
              ].map(({ label, key, score, weight, reason }) => {
                const rec = safeObj(aiScore.recommendations)
                const actions: string[] = Array.isArray(rec[key]) ? rec[key] : []
                return (
                  <div key={key} className="border rounded-xl overflow-hidden">
                    <div className="flex justify-between items-center p-3 bg-gray-50">
                      <div>
                        <span className="font-bold text-sm">{label}</span>
                        <span className="ml-2 text-xs text-gray-400">Weight: {weight}</span>
                      </div>
                      <span className={`text-2xl font-bold ${scoreColor(score)}`}>{score}</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2">
                      <div className={`${barColor(score)} h-2 transition-all`} style={{width:`${score}%`}} />
                    </div>
                    {reason && (
                      <div className="p-4 border-t">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Why this score</p>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{reason}</p>
                      </div>
                    )}
                    {actions.length > 0 && (
                      <div className="p-4 border-t bg-yellow-50">
                        <p className="text-xs font-bold text-yellow-700 uppercase mb-2">What you need to change</p>
                        <ol className="space-y-1">
                          {actions.map((a, i) => (
                            <li key={i} className="flex gap-2 text-sm text-gray-700">
                              <span className="font-bold text-yellow-600 shrink-0">{i+1}.</span>
                              <span>{a}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Strengths + Gaps */}
              <div className="grid grid-cols-2 gap-4">
                {safe(aiScore.strengths).length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <h3 className="font-bold text-green-800 text-xs uppercase mb-2">Strengths</h3>
                    {safe(aiScore.strengths).map((s:string,i:number) => <p key={i} className="text-sm text-green-700 flex gap-1"><span>✓</span>{s}</p>)}
                  </div>
                )}
                {safe(aiScore.gaps).length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <h3 className="font-bold text-red-800 text-xs uppercase mb-2">Gaps Detected</h3>
                    {safe(aiScore.gaps).map((g:string,i:number) => <p key={i} className="text-sm text-red-700 flex gap-1"><span>!</span>{g}</p>)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Plan List */}
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
                  <button onClick={() => setModal('ai')} className="text-xs text-blue-600 hover:underline font-medium">View Full Report</button>
                </div>
                <div className="text-center mb-3">
                  <span className={`text-4xl font-bold ${scoreColor(aiScore.final_score)}`}>{Number(aiScore.final_score).toFixed(1)}</span>
                  <span className="text-gray-400 text-sm">/100</span>
                </div>
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
                <div className="bg-white rounded-xl shadow-sm p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h2 className="text-xl font-bold">{currentPlan.title}</h2>
                      <div className="flex gap-2 mt-1 flex-wrap text-xs text-gray-500">
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">{currentPlan.plan_type}</span>
                        {currentPlan.technology_area && <span>{currentPlan.technology_area}</span>}
                        <span>{new Date(currentPlan.start_date).toLocaleDateString()} - {new Date(currentPlan.end_date).toLocaleDateString()}</span>
                        <span>Priority: {['','Low','Medium','High'][currentPlan.priority]||currentPlan.priority}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${currentPlan.status==='Completed'?'bg-green-100 text-green-700':currentPlan.status==='In Progress'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-600'}`}>{currentPlan.status}</span>
                      <button onClick={openEdit} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 font-medium">Edit Plan</button>
                    </div>
                  </div>
                  {currentPlan.objective && <div className="bg-blue-50 rounded-lg p-3 mb-2"><p className="text-xs font-bold text-blue-700 mb-1">OBJECTIVE</p><p className="text-sm text-gray-700">{currentPlan.objective}</p></div>}
                  {currentPlan.learning_objectives && <div className="bg-green-50 rounded-lg p-3 mb-2"><p className="text-xs font-bold text-green-700 mb-1">LEARNING OBJECTIVES</p><p className="text-sm text-gray-700 whitespace-pre-line">{currentPlan.learning_objectives}</p></div>}
                  {currentPlan.skills_tags && <div className="flex gap-1 flex-wrap mt-2">{currentPlan.skills_tags.split(',').map(t => <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{t.trim()}</span>)}</div>}
                  {currentPlan.github_repo && <a href={currentPlan.github_repo} target="_blank" rel="noopener noreferrer" className="block mt-2 text-xs text-blue-600 hover:underline">GitHub: {currentPlan.github_repo}</a>}
                  {currentPlan.business_use_case && <p className="text-xs text-gray-500 mt-1">Business: {currentPlan.business_use_case}</p>}
                </div>

                {/* Milestones */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800">Milestones & Tasks ({milestones.length})</h3>
                  {milestones.length === 0 ? <div className="bg-white rounded-xl p-6 text-center text-gray-400 text-sm">No milestones. Click Edit Plan to add milestones and tasks.</div> :
                    milestones.map((ms, idx) => (
                      <div key={ms.milestone_id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 flex justify-between">
                          <div><p className="text-white font-semibold text-sm">Milestone {idx+1}: {ms.title}</p>{ms.goal && <p className="text-blue-200 text-xs mt-0.5">{ms.goal}</p>}</div>
                          {ms.start_date && <div className="text-right text-xs text-blue-200"><p>{new Date(ms.start_date).toLocaleDateString()} - {new Date(ms.end_date).toLocaleDateString()}</p>{ms.skills_covered && <p>{ms.skills_covered}</p>}</div>}
                        </div>
                        <div className="p-4">
                          {ms.learning_tasks?.length > 0 ? (
                            <div className="space-y-2">
                              {ms.learning_tasks.map((task: any) => (
                                <div key={task.task_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                  <div className={`w-2 h-2 rounded-full shrink-0 ${task.status==='Done'?'bg-green-500':task.status==='In Progress'?'bg-blue-500':'bg-gray-300'}`} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{task.title}</p>
                                    <div className="flex gap-2 text-xs text-gray-400 mt-0.5 flex-wrap">
                                      <span className="bg-gray-200 px-1.5 py-0.5 rounded">{task.task_type}</span>
                                      {task.estimated_hours > 0 && <span>{task.estimated_hours}h est</span>}
                                      {task.hours_spent > 0 && <span className="text-blue-500">{task.hours_spent}h done</span>}
                                      {task.due_date && <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>}
                                    </div>
                                    <div className="flex gap-2 mt-1 flex-wrap">
                                      {task.github_link && <a href={task.github_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">GitHub</a>}
                                      {task.pr_link && <a href={task.pr_link} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-500 hover:underline">PR</a>}
                                      {task.demo_url && <a href={task.demo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-500 hover:underline">Demo</a>}
                                      {task.certificate_url && <a href={task.certificate_url} target="_blank" rel="noopener noreferrer" className="text-xs text-yellow-600 hover:underline">Certificate</a>}
                                      {task.jira_link && <a href={task.jira_link} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-500 hover:underline">Jira</a>}
                                    </div>
                                    {task.notes && <p className="text-xs text-gray-500 mt-1 italic">"{task.notes}"</p>}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${task.status==='Done'?'bg-green-100 text-green-700':task.status==='In Progress'?'bg-blue-100 text-blue-700':task.status==='Blocked'?'bg-red-100 text-red-700':'bg-gray-100 text-gray-600'}`}>{task.status}</span>
                                    <button onClick={() => openEvidence(task)} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">+ Evidence</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : <p className="text-xs text-gray-400 text-center py-2">No tasks. Click Edit Plan to add tasks.</p>}
                        </div>
                      </div>
                    ))
                  }
                </div>

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
