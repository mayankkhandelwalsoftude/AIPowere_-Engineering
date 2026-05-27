'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface LearningPlan {
  plan_id: string
  title: string
  plan_type: string
  technology_area: string
  status: string
  start_date: string
  end_date: string
  priority: number
  objective: string
  learning_objectives: string
  github_repo: string
  business_use_case: string
  skills_tags: string
  completion_percentage: number
}

interface Milestone {
  milestone_id?: string
  title: string
  goal: string
  start_date: string
  end_date: string
  order_number: number
  skills_covered: string
  evidence_expected: string
  tasks: Task[]
}

interface Task {
  task_id?: string
  title: string
  task_type: string
  due_date: string
  estimated_hours: number
  description: string
  expected_output: string
}

interface AIScore {
  learning_score: number
  relevance_score: number
  execution_score: number
  delivery_score: number
  authenticity_score: number
  final_score: number
}

interface Comment {
  comment_id: string
  comment_text: string
  created_at: string
  employee_master: { name: string } | { name: string }[]
}

const PLAN_TYPES = ['GenAI','AI Engineering','MLOps','Data Engineering','AI Agents','LLMOps','RAG','MCP','Cloud AI','AI Security','Custom']
const TASK_TYPES = ['Learning','Coding','POC','Documentation','Demo','Assessment','Certification','Project']

const emptyTask = (): Task => ({
  title: '', task_type: 'Learning', due_date: '', estimated_hours: 2, description: '', expected_output: ''
})

const emptyMilestone = (order: number): Milestone => ({
  title: '', goal: '', start_date: '', end_date: '',
  order_number: order, skills_covered: '', evidence_expected: '',
  tasks: [emptyTask()]
})

export default function UserDashboard() {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [learningPlans, setLearningPlans] = useState<LearningPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [milestones, setMilestones] = useState<any[]>([])
  const [aiScore, setAiScore] = useState<AIScore | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreatePlan, setShowCreatePlan] = useState(false)
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState(1) // 1=plan header, 2=milestones

  const [planForm, setPlanForm] = useState({
    title: '', plan_type: 'GenAI', technology_area: '', objective: '',
    learning_objectives: '', skills_tags: '', github_repo: '',
    business_use_case: '', start_date: '', end_date: '', priority: 2,
  })
  const [formMilestones, setFormMilestones] = useState<Milestone[]>([emptyMilestone(1)])

  useEffect(() => { checkAuth() }, [])

  useEffect(() => {
    if (selectedPlan && employeeId) {
      fetchMilestones()
      fetchAIScore()
      fetchComments()
    }
  }, [selectedPlan, employeeId])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    const { data: emp } = await supabase.from('employee_master').select('*').eq('email', session.user.email).single()
    if (emp) {
      setEmployeeId(emp.employee_id)
      setUserName(emp.name)
      fetchPlans(emp.employee_id)
    }
  }

  const fetchPlans = async (empId: string) => {
    setLoading(true)
    const { data } = await supabase.from('learning_plans').select('*').eq('employee_id', empId).order('created_at', { ascending: false })
    if (data) { setLearningPlans(data); if (data.length > 0) setSelectedPlan(data[0].plan_id) }
    setLoading(false)
  }

  const fetchMilestones = async () => {
    if (!selectedPlan) return
    const { data } = await supabase.from('plan_milestones').select(`*, learning_tasks(*)`).eq('plan_id', selectedPlan).order('order_number')
    if (data) setMilestones(data)
  }

  const fetchAIScore = async () => {
    if (!selectedPlan) return
    const { data } = await supabase.from('ai_evaluation_scores').select('*').eq('plan_id', selectedPlan).eq('employee_id', employeeId).single()
    setAiScore(data || null)
  }

  const fetchComments = async () => {
    if (!selectedPlan) return
    const { data } = await supabase.from('plan_comments').select(`*, employee_master(name)`).eq('plan_id', selectedPlan).order('created_at')
    setComments(data || [])
  }

  const handleCreatePlan = async () => {
    if (!planForm.title || !planForm.objective || !planForm.start_date || !planForm.end_date) {
      alert('Please fill required fields: Title, Objective, Start Date, End Date')
      return
    }
    setSaving(true)
    try {
      const { data: newPlan, error } = await supabase.from('learning_plans').insert([{
        employee_id: employeeId, ...planForm, status: 'Active', ai_generated: false,
      }]).select().single()
      if (error) throw error

      for (const ms of formMilestones) {
        if (!ms.title) continue
        const { data: newMs, error: msError } = await supabase.from('plan_milestones').insert([{
          plan_id: newPlan.plan_id, title: ms.title, goal: ms.goal,
          start_date: ms.start_date, end_date: ms.end_date,
          order_number: ms.order_number, skills_covered: ms.skills_covered,
          evidence_expected: ms.evidence_expected,
        }]).select().single()
        if (msError || !newMs) continue

        const validTasks = ms.tasks.filter(t => t.title)
        if (validTasks.length > 0) {
          await supabase.from('learning_tasks').insert(
            validTasks.map(t => ({
              plan_id: newPlan.plan_id, milestone_id: newMs.milestone_id,
              title: t.title, task_type: t.task_type, due_date: t.due_date || ms.end_date,
              estimated_hours: t.estimated_hours, description: t.description,
              expected_output: t.expected_output, status: 'Pending',
            }))
          )
        }
      }

      fetch('/api/evaluate-plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: newPlan.plan_id, employee_id: employeeId, plan_data: { ...planForm, milestones: formMilestones.map(m => m.title).join(', ') } })
      })

      setShowCreatePlan(false)
      setStep(1)
      setPlanForm({ title: '', plan_type: 'GenAI', technology_area: '', objective: '', learning_objectives: '', skills_tags: '', github_repo: '', business_use_case: '', start_date: '', end_date: '', priority: 2 })
      setFormMilestones([emptyMilestone(1)])
      fetchPlans(employeeId)
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const addMilestone = () => setFormMilestones(prev => [...prev, emptyMilestone(prev.length + 1)])
  const removeMilestone = (idx: number) => setFormMilestones(prev => prev.filter((_, i) => i !== idx))
  const updateMilestone = (idx: number, field: string, value: any) =>
    setFormMilestones(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m))

  const addTask = (msIdx: number) =>
    setFormMilestones(prev => prev.map((m, i) => i === msIdx ? { ...m, tasks: [...m.tasks, emptyTask()] } : m))
  const removeTask = (msIdx: number, tIdx: number) =>
    setFormMilestones(prev => prev.map((m, i) => i === msIdx ? { ...m, tasks: m.tasks.filter((_, j) => j !== tIdx) } : m))
  const updateTask = (msIdx: number, tIdx: number, field: string, value: any) =>
    setFormMilestones(prev => prev.map((m, i) => i === msIdx ? {
      ...m, tasks: m.tasks.map((t, j) => j === tIdx ? { ...t, [field]: value } : t)
    } : m))

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }
  const currentPlan = learningPlans.find(p => p.plan_id === selectedPlan)

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  const labelCls = "block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide"

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">AI Learning Platform</h1>
            <p className="text-sm text-gray-500">Welcome back, {userName}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setShowCreatePlan(true); setStep(1) }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              + New Learning Plan
            </button>
            <button onClick={handleLogout} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">Logout</button>
          </div>
        </div>
      </div>

      {/* CREATE PLAN MODAL */}
      {showCreatePlan && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-4">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h2 className="text-xl font-bold">Create Learning Plan</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {step === 1 ? 'Step 1 of 2: Plan Details' : 'Step 2 of 2: Milestones & Tasks'}
                </p>
              </div>
              <button onClick={() => setShowCreatePlan(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-light">×</button>
            </div>

            {/* Step Indicator */}
            <div className="flex border-b">
              <div className={`flex-1 py-3 text-center text-sm font-medium border-b-2 ${step === 1 ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}>
                1. Plan Details
              </div>
              <div className={`flex-1 py-3 text-center text-sm font-medium border-b-2 ${step === 2 ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}>
                2. Milestones & Tasks
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {/* STEP 1: PLAN HEADER */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className={labelCls}>Plan Title *</label>
                    <input type="text" value={planForm.title} onChange={e => setPlanForm({...planForm, title: e.target.value})}
                      className={inputCls} placeholder="e.g. Master RAG and AI Agents in 90 days" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Plan Type *</label>
                      <select value={planForm.plan_type} onChange={e => setPlanForm({...planForm, plan_type: e.target.value})} className={inputCls}>
                        {PLAN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Technology Area</label>
                      <input type="text" value={planForm.technology_area} onChange={e => setPlanForm({...planForm, technology_area: e.target.value})}
                        className={inputCls} placeholder="LangChain, OpenAI, Azure, Pinecone" />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Objective *</label>
                    <textarea value={planForm.objective} onChange={e => setPlanForm({...planForm, objective: e.target.value})}
                      className={inputCls} rows={3} placeholder="What will you be able to DO after completing this plan?" />
                  </div>

                  <div>
                    <label className={labelCls}>Learning Objectives (detailed)</label>
                    <textarea value={planForm.learning_objectives} onChange={e => setPlanForm({...planForm, learning_objectives: e.target.value})}
                      className={inputCls} rows={4} placeholder={"- Understand RAG architecture and vector databases\n- Build production RAG pipeline with LangChain\n- Deploy to Azure and optimize costs"} />
                  </div>

                  <div>
                    <label className={labelCls}>Skills Tags</label>
                    <input type="text" value={planForm.skills_tags} onChange={e => setPlanForm({...planForm, skills_tags: e.target.value})}
                      className={inputCls} placeholder="RAG, LangChain, Vector DB, Azure OpenAI, Prompt Engineering" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Start Date *</label>
                      <input type="date" value={planForm.start_date} onChange={e => setPlanForm({...planForm, start_date: e.target.value})} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>End Date *</label>
                      <input type="date" value={planForm.end_date} onChange={e => setPlanForm({...planForm, end_date: e.target.value})} className={inputCls} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Priority</label>
                      <select value={planForm.priority} onChange={e => setPlanForm({...planForm, priority: parseInt(e.target.value)})} className={inputCls}>
                        <option value={1}>Low</option>
                        <option value={2}>Medium</option>
                        <option value={3}>High</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>GitHub Repo (optional)</label>
                      <input type="text" value={planForm.github_repo} onChange={e => setPlanForm({...planForm, github_repo: e.target.value})}
                        className={inputCls} placeholder="https://github.com/you/repo" />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Business Use Case (optional)</label>
                    <input type="text" value={planForm.business_use_case} onChange={e => setPlanForm({...planForm, business_use_case: e.target.value})}
                      className={inputCls} placeholder="Which client project or delivery does this support?" />
                  </div>
                </div>
              )}

              {/* STEP 2: MILESTONES & TASKS */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                    Add milestones (weeks or phases). Add tasks under each milestone. Tasks are specific actions.
                  </div>

                  {formMilestones.map((ms, msIdx) => (
                    <div key={msIdx} className="border-2 border-blue-200 rounded-xl overflow-hidden">
                      {/* Milestone Header */}
                      <div className="bg-blue-600 px-4 py-3 flex justify-between items-center">
                        <span className="text-white font-semibold text-sm">Milestone {msIdx + 1}</span>
                        {formMilestones.length > 1 && (
                          <button onClick={() => removeMilestone(msIdx)} className="text-blue-200 hover:text-white text-xl">×</button>
                        )}
                      </div>

                      <div className="p-4 bg-white space-y-3">
                        <div>
                          <label className={labelCls}>Milestone Title *</label>
                          <input type="text" value={ms.title} onChange={e => updateMilestone(msIdx, 'title', e.target.value)}
                            className={inputCls} placeholder="e.g. Week 1: RAG Fundamentals" />
                        </div>

                        <div>
                          <label className={labelCls}>Goal</label>
                          <input type="text" value={ms.goal} onChange={e => updateMilestone(msIdx, 'goal', e.target.value)}
                            className={inputCls} placeholder="What will be achieved by end of this milestone?" />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>Start Date</label>
                            <input type="date" value={ms.start_date} onChange={e => updateMilestone(msIdx, 'start_date', e.target.value)} className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}>End Date</label>
                            <input type="date" value={ms.end_date} onChange={e => updateMilestone(msIdx, 'end_date', e.target.value)} className={inputCls} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>Skills Covered</label>
                            <input type="text" value={ms.skills_covered} onChange={e => updateMilestone(msIdx, 'skills_covered', e.target.value)}
                              className={inputCls} placeholder="RAG, FAISS, LangChain" />
                          </div>
                          <div>
                            <label className={labelCls}>Expected Evidence</label>
                            <input type="text" value={ms.evidence_expected} onChange={e => updateMilestone(msIdx, 'evidence_expected', e.target.value)}
                              className={inputCls} placeholder="GitHub commit, demo video" />
                          </div>
                        </div>

                        {/* TASKS */}
                        <div className="mt-4">
                          <div className="flex justify-between items-center mb-2">
                            <label className={labelCls}>Tasks ({ms.tasks.length})</label>
                            <button onClick={() => addTask(msIdx)}
                              className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">
                              + Add Task
                            </button>
                          </div>

                          <div className="space-y-2">
                            {ms.tasks.map((task, tIdx) => (
                              <div key={tIdx} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <div className="flex gap-2 items-start">
                                  <span className="text-xs font-bold text-gray-400 mt-2 w-5 shrink-0">{tIdx + 1}</span>
                                  <div className="flex-1 grid grid-cols-2 gap-2">
                                    <div className="col-span-2">
                                      <input type="text" value={task.title} onChange={e => updateTask(msIdx, tIdx, 'title', e.target.value)}
                                        className={inputCls} placeholder="Task title e.g. Build document Q&A with FAISS" />
                                    </div>
                                    <select value={task.task_type} onChange={e => updateTask(msIdx, tIdx, 'task_type', e.target.value)} className={inputCls}>
                                      {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <input type="date" value={task.due_date} onChange={e => updateTask(msIdx, tIdx, 'due_date', e.target.value)} className={inputCls} />
                                    <input type="number" value={task.estimated_hours} onChange={e => updateTask(msIdx, tIdx, 'estimated_hours', parseFloat(e.target.value))}
                                      className={inputCls} placeholder="Hours" min={0} step={0.5} />
                                    <input type="text" value={task.expected_output} onChange={e => updateTask(msIdx, tIdx, 'expected_output', e.target.value)}
                                      className={inputCls} placeholder="Expected output" />
                                  </div>
                                  {ms.tasks.length > 1 && (
                                    <button onClick={() => removeTask(msIdx, tIdx)} className="text-red-400 hover:text-red-600 text-lg mt-1 shrink-0">×</button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button onClick={addMilestone}
                    className="w-full py-3 border-2 border-dashed border-blue-300 text-blue-600 rounded-xl hover:border-blue-500 hover:bg-blue-50 text-sm font-medium">
                    + Add Another Milestone
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center p-6 border-t bg-gray-50 rounded-b-xl">
              <div>
                {step === 2 && (
                  <button onClick={() => setStep(1)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm">
                    Back
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowCreatePlan(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm">Cancel</button>
                {step === 1 ? (
                  <button onClick={() => {
                    if (!planForm.title || !planForm.objective || !planForm.start_date || !planForm.end_date) {
                      alert('Fill required fields: Title, Objective, Start Date, End Date')
                      return
                    }
                    setStep(2)
                  }} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                    Next: Add Milestones
                  </button>
                ) : (
                  <button onClick={handleCreatePlan} disabled={saving}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium">
                    {saving ? 'Creating...' : 'Create Plan'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Plan List */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="font-semibold text-gray-900 mb-3">My Plans ({learningPlans.length})</h2>
              {loading ? <p className="text-sm text-gray-400">Loading...</p> :
                learningPlans.length === 0 ? (
                  <p className="text-sm text-gray-400">No plans yet. Create your first!</p>
                ) : (
                  <div className="space-y-2">
                    {learningPlans.map(plan => (
                      <div key={plan.plan_id} onClick={() => setSelectedPlan(plan.plan_id)}
                        className={`p-3 rounded-lg cursor-pointer border transition ${selectedPlan === plan.plan_id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-blue-300'}`}>
                        <p className="font-medium text-sm text-gray-900 truncate">{plan.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{plan.plan_type}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                          plan.status === 'Completed' ? 'bg-green-100 text-green-700' :
                          plan.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'}`}>{plan.status}</span>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {/* AI Score */}
            {aiScore && (
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h3 className="font-semibold text-sm text-gray-700 mb-3">AI Evaluation Score</h3>
                <div className="text-center mb-3">
                  <span className="text-4xl font-bold text-blue-600">{Number(aiScore.final_score).toFixed(1)}</span>
                  <span className="text-gray-400 text-sm">/100</span>
                </div>
                {[
                  ['Learning', aiScore.learning_score, 'blue'],
                  ['Relevance', aiScore.relevance_score, 'green'],
                  ['Execution', aiScore.execution_score, 'purple'],
                  ['Delivery', aiScore.delivery_score, 'orange'],
                ].map(([label, score, color]) => (
                  <div key={String(label)} className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{label}</span>
                      <span className="font-medium">{score}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-semibold text-sm text-gray-700 mb-3">Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Total', learningPlans.length],
                  ['Active', learningPlans.filter(p => p.status === 'In Progress' || p.status === 'Active').length],
                  ['Done', learningPlans.filter(p => p.status === 'Completed').length],
                  ['Milestones', milestones.length],
                ].map(([label, val]) => (
                  <div key={String(label)} className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-gray-800">{val}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Plan Detail */}
          <div className="lg:col-span-2 space-y-4">
            {currentPlan ? (
              <>
                {/* Plan Header */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{currentPlan.title}</h2>
                      <div className="flex gap-3 mt-2 flex-wrap text-sm text-gray-500">
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">{currentPlan.plan_type}</span>
                        {currentPlan.technology_area && <span>{currentPlan.technology_area}</span>}
                        <span>{new Date(currentPlan.start_date).toLocaleDateString()} to {new Date(currentPlan.end_date).toLocaleDateString()}</span>
                        <span>Priority: {['','Low','Medium','High'][currentPlan.priority] || currentPlan.priority}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      currentPlan.status === 'Completed' ? 'bg-green-100 text-green-700' :
                      currentPlan.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'}`}>{currentPlan.status}</span>
                  </div>

                  {currentPlan.objective && (
                    <div className="bg-blue-50 rounded-lg p-3 mb-3">
                      <p className="text-xs font-semibold text-blue-700 mb-1">OBJECTIVE</p>
                      <p className="text-sm text-gray-700">{currentPlan.objective}</p>
                    </div>
                  )}

                  {currentPlan.learning_objectives && (
                    <div className="bg-green-50 rounded-lg p-3 mb-3">
                      <p className="text-xs font-semibold text-green-700 mb-1">LEARNING OBJECTIVES</p>
                      <p className="text-sm text-gray-700 whitespace-pre-line">{currentPlan.learning_objectives}</p>
                    </div>
                  )}

                  {currentPlan.skills_tags && (
                    <div className="flex gap-2 flex-wrap mt-2">
                      {currentPlan.skills_tags.split(',').map(tag => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">{tag.trim()}</span>
                      ))}
                    </div>
                  )}

                  {currentPlan.github_repo && (
                    <a href={currentPlan.github_repo} target="_blank" rel="noopener noreferrer"
                      className="inline-block mt-3 text-xs text-blue-600 hover:underline">
                      GitHub: {currentPlan.github_repo}
                    </a>
                  )}
                </div>

                {/* Milestones & Tasks */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800">Milestones & Tasks ({milestones.length})</h3>
                  {milestones.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-400 text-sm">No milestones added.</div>
                  ) : milestones.map((ms, idx) => (
                    <div key={ms.milestone_id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 flex justify-between items-center">
                        <div>
                          <p className="text-white font-semibold">Milestone {idx + 1}: {ms.title}</p>
                          {ms.goal && <p className="text-blue-200 text-xs mt-0.5">{ms.goal}</p>}
                        </div>
                        <div className="text-right text-xs text-blue-200">
                          {ms.start_date && <p>{new Date(ms.start_date).toLocaleDateString()} - {new Date(ms.end_date).toLocaleDateString()}</p>}
                          {ms.skills_covered && <p className="mt-0.5">{ms.skills_covered}</p>}
                        </div>
                      </div>
                      <div className="p-4">
                        {ms.learning_tasks && ms.learning_tasks.length > 0 ? (
                          <div className="space-y-2">
                            {ms.learning_tasks.map((task: any) => (
                              <div key={task.task_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <div className={`w-2 h-2 rounded-full shrink-0 ${
                                  task.status === 'Done' ? 'bg-green-500' :
                                  task.status === 'In Progress' ? 'bg-blue-500' :
                                  'bg-gray-300'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                                  <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                                    <span className="bg-gray-200 px-1.5 py-0.5 rounded">{task.task_type}</span>
                                    {task.estimated_hours > 0 && <span>{task.estimated_hours}h</span>}
                                    {task.due_date && <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>}
                                  </div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded font-medium shrink-0 ${
                                  task.status === 'Done' ? 'bg-green-100 text-green-700' :
                                  task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                  task.status === 'Blocked' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-600'}`}>{task.status}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 text-center py-2">No tasks</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Admin Comments */}
                {comments.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm p-5">
                    <h3 className="font-semibold text-gray-800 mb-3">Comments ({comments.length})</h3>
                    <div className="space-y-3">
                      {comments.map(c => (
                        <div key={c.comment_id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-sm text-gray-700">{c.comment_text}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {Array.isArray(c.employee_master) ? c.employee_master[0]?.name : (c.employee_master as any)?.name} · {new Date(c.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <p className="text-gray-400">Select a plan or create your first learning plan</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
