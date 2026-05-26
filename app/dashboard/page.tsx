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
  milestones: string
  completion_percentage: number
}

interface Task {
  task_id: string
  title: string
  description: string
  due_date: string
  status: string
  completion_percent: number
}

interface AIScore {
  learning_score: number
  relevance_score: number
  execution_score: number
  delivery_score: number
  authenticity_score: number
  final_score: number
}

export default function UserDashboard() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [learningPlans, setLearningPlans] = useState<LearningPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [aiScore, setAiScore] = useState<AIScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreatePlan, setShowCreatePlan] = useState(false)
  const [creatingPlan, setCreatingPlan] = useState(false)

  // Plan form state
  const [planForm, setPlanForm] = useState({
    title: '',
    plan_type: 'GenAI',
    technology_area: '',
    objective: '',
    learning_objectives: '',
    milestones: '',
    start_date: '',
    end_date: '',
    priority: 2,
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (selectedPlan) {
      fetchTasks()
      fetchAIScore()
    }
  }, [selectedPlan])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/')
      return
    }

    setUserEmail(session.user.email || '')

    // Get employee details
    const { data: empData } = await supabase
      .from('employee_master')
      .select('*')
      .eq('email', session.user.email)
      .single()

    if (empData) {
      setEmployeeId(empData.employee_id)
      setUserName(empData.name)
      fetchLearningPlans(empData.employee_id)
    }
  }

  const fetchLearningPlans = async (empId: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('learning_plans')
      .select('*')
      .eq('employee_id', empId)
      .order('start_date', { ascending: false })

    if (!error && data) {
      setLearningPlans(data)
      if (data.length > 0) {
        setSelectedPlan(data[0].plan_id)
      }
    }
    setLoading(false)
  }

  const fetchTasks = async () => {
    if (!selectedPlan) return

    const { data, error } = await supabase
      .from('learning_tasks')
      .select('*')
      .eq('plan_id', selectedPlan)
      .order('due_date')

    if (!error) setTasks(data || [])
  }

  const fetchAIScore = async () => {
    if (!selectedPlan) return

    const { data } = await supabase
      .from('ai_evaluation_scores')
      .select('*')
      .eq('plan_id', selectedPlan)
      .eq('employee_id', employeeId)
      .single()

    if (data) setAiScore(data)
    else setAiScore(null)
  }

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingPlan(true)

    try {
      // Insert plan with pending approval status
      const { data: newPlan, error: planError } = await supabase
        .from('learning_plans')
        .insert([{
          employee_id: employeeId,
          ...planForm,
          status: 'Pending Approval',
          ai_generated: false,
        }])
        .select()
        .single()

      if (planError) throw planError

      // Call AI evaluation API
      const response = await fetch('/api/evaluate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: newPlan.plan_id,
          employee_id: employeeId,
          plan_data: {
            title: planForm.title,
            plan_type: planForm.plan_type,
            technology_area: planForm.technology_area,
            objective: planForm.objective,
            learning_objectives: planForm.learning_objectives,
            milestones: planForm.milestones,
            timeline: `${planForm.start_date} to ${planForm.end_date}`,
          }
        })
      })

      if (response.ok) {
        alert('Plan created! AI evaluation complete. Waiting for manager approval.')
      } else {
        alert('Plan created but AI evaluation pending. Manager will review.')
      }

      // Reset form
      setPlanForm({
        title: '',
        plan_type: 'GenAI',
        technology_area: '',
        objective: '',
        learning_objectives: '',
        milestones: '',
        start_date: '',
        end_date: '',
        priority: 2,
      })
      setShowCreatePlan(false)
      fetchLearningPlans(employeeId)

    } catch (error: any) {
      alert('Error creating plan: ' + error.message)
    } finally {
      setCreatingPlan(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const currentPlan = learningPlans.find(p => p.plan_id === selectedPlan)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Learning Platform</h1>
            <p className="text-sm text-gray-600">Welcome, {userName}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Create Plan Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowCreatePlan(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Create My Learning Plan
          </button>
        </div>

        {/* Create Plan Modal */}
        {showCreatePlan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Create Learning Plan</h2>
                <button
                  onClick={() => setShowCreatePlan(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreatePlan} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Plan Title *</label>
                  <input
                    type="text"
                    value={planForm.title}
                    onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="e.g., Master RAG and AI Agents"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Plan Type *</label>
                    <select
                      value={planForm.plan_type}
                      onChange={(e) => setPlanForm({ ...planForm, plan_type: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                    >
                      <option value="GenAI">GenAI</option>
                      <option value="AI Engineering">AI Engineering</option>
                      <option value="MLOps">MLOps</option>
                      <option value="Data Engineering">Data Engineering</option>
                      <option value="AI Agents">AI Agents</option>
                      <option value="LLMOps">LLMOps</option>
                      <option value="RAG">RAG</option>
                      <option value="MCP">MCP</option>
                      <option value="Cloud AI">Cloud AI</option>
                      <option value="AI Security">AI Security</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Technology Area</label>
                    <input
                      type="text"
                      value={planForm.technology_area}
                      onChange={(e) => setPlanForm({ ...planForm, technology_area: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                      placeholder="e.g., LangChain, OpenAI, Azure"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Objective *</label>
                  <textarea
                    value={planForm.objective}
                    onChange={(e) => setPlanForm({ ...planForm, objective: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    rows={2}
                    placeholder="What do you want to achieve?"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Learning Objectives (detailed)</label>
                  <textarea
                    value={planForm.learning_objectives}
                    onChange={(e) => setPlanForm({ ...planForm, learning_objectives: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    rows={4}
                    placeholder="List specific skills you want to learn (one per line or comma-separated)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Milestones & Timeline</label>
                  <textarea
                    value={planForm.milestones}
                    onChange={(e) => setPlanForm({ ...planForm, milestones: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    rows={4}
                    placeholder="Week 1: Setup environment&#10;Week 2: Build first RAG prototype&#10;Week 3: Deploy to Azure..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Date *</label>
                    <input
                      type="date"
                      value={planForm.start_date}
                      onChange={(e) => setPlanForm({ ...planForm, start_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Date *</label>
                    <input
                      type="date"
                      value={planForm.end_date}
                      onChange={(e) => setPlanForm({ ...planForm, end_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    value={planForm.priority}
                    onChange={(e) => setPlanForm({ ...planForm, priority: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value={1}>Low</option>
                    <option value={2}>Medium</option>
                    <option value={3}>High</option>
                  </select>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-4 rounded">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Note:</strong> After you submit, our AI will automatically evaluate your plan for:
                    market relevance, realistic timeline, skill gaps, and provide recommendations.
                    Your manager will review the AI evaluation before approval.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={creatingPlan}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {creatingPlan ? 'Creating & AI Evaluating...' : 'Submit for Approval'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreatePlan(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Learning Plans Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-4">My Learning Plans</h2>
              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : learningPlans.length === 0 ? (
                <p className="text-gray-500 text-sm">No learning plans yet. Create your first plan!</p>
              ) : (
                <div className="space-y-2">
                  {learningPlans.map((plan) => (
                    <div
                      key={plan.plan_id}
                      onClick={() => setSelectedPlan(plan.plan_id)}
                      className={`p-3 border rounded cursor-pointer transition ${
                        selectedPlan === plan.plan_id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <h3 className="font-medium text-sm">{plan.title}</h3>
                      <p className="text-xs text-gray-600 mt-1">{plan.plan_type}</p>
                      <span className={`inline-block mt-2 px-2 py-1 rounded text-xs ${
                        plan.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        plan.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                        plan.status === 'Approved' ? 'bg-purple-100 text-purple-800' :
                        plan.status === 'Pending Approval' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {plan.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Score Card */}
            {aiScore && (
              <div className="bg-white rounded-lg shadow p-4 mt-4">
                <h3 className="text-sm font-semibold mb-3">AI Evaluation Score</h3>
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {aiScore.final_score.toFixed(1)}
                  </div>
                  <p className="text-xs text-gray-500 mb-3">Overall Score</p>
                  <div className="space-y-2 text-left">
                    <div className="flex justify-between text-xs">
                      <span>Learning Quality</span>
                      <span className="font-medium">{aiScore.learning_score}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Market Relevance</span>
                      <span className="font-medium">{aiScore.relevance_score}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Execution</span>
                      <span className="font-medium">{aiScore.execution_score}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Delivery Ready</span>
                      <span className="font-medium">{aiScore.delivery_score}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow p-4 mt-4">
              <h3 className="text-sm font-semibold mb-3">Quick Stats</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Plans</span>
                  <span className="font-medium">{learningPlans.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Active</span>
                  <span className="font-medium">
                    {learningPlans.filter(p => p.status === 'In Progress' || p.status === 'Approved').length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Completed</span>
                  <span className="font-medium">
                    {learningPlans.filter(p => p.status === 'Completed').length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pending Approval</span>
                  <span className="font-medium text-yellow-600">
                    {learningPlans.filter(p => p.status === 'Pending Approval').length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Plan Details */}
          <div className="lg:col-span-2">
            {currentPlan ? (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="mb-6">
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-2xl font-bold">{currentPlan.title}</h2>
                    <span className={`px-3 py-1 rounded text-sm font-medium ${
                      currentPlan.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      currentPlan.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                      currentPlan.status === 'Approved' ? 'bg-purple-100 text-purple-800' :
                      currentPlan.status === 'Pending Approval' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {currentPlan.status}
                    </span>
                  </div>
                  
                  <div className="flex gap-4 text-sm text-gray-600 mb-4">
                    <span>📦 {currentPlan.plan_type}</span>
                    <span>📚 {currentPlan.technology_area || 'General'}</span>
                    <span>📅 {new Date(currentPlan.start_date).toLocaleDateString()} - {new Date(currentPlan.end_date).toLocaleDateString()}</span>
                  </div>

                  {currentPlan.objective && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded mb-4">
                      <h3 className="font-medium text-sm mb-1">Objective</h3>
                      <p className="text-sm text-gray-700">{currentPlan.objective}</p>
                    </div>
                  )}

                  {currentPlan.learning_objectives && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded mb-4">
                      <h3 className="font-medium text-sm mb-1">Learning Objectives</h3>
                      <p className="text-sm text-gray-700 whitespace-pre-line">{currentPlan.learning_objectives}</p>
                    </div>
                  )}

                  {currentPlan.milestones && (
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded">
                      <h3 className="font-medium text-sm mb-1">Milestones</h3>
                      <p className="text-sm text-gray-700 whitespace-pre-line">{currentPlan.milestones}</p>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                {currentPlan.status === 'In Progress' && (
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Overall Progress</span>
                      <span className="text-sm font-bold">{currentPlan.completion_percentage || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all"
                        style={{ width: `${currentPlan.completion_percentage || 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Tasks Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Learning Tasks</h3>
                  {tasks.length === 0 ? (
                    <p className="text-gray-500 text-sm">No tasks added yet. Tasks will be added by your manager or AI recommendations.</p>
                  ) : (
                    <div className="space-y-3">
                      {tasks.map((task) => (
                        <div key={task.task_id} className="p-4 border rounded-lg hover:shadow-sm transition">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{task.title}</h4>
                            <span className={`px-2 py-1 rounded text-xs ${
                              task.status === 'Done' ? 'bg-green-100 text-green-800' :
                              task.status === 'Skipped' ? 'bg-red-100 text-red-800' :
                              task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                              task.status === 'Blocked' ? 'bg-orange-100 text-orange-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {task.status}
                            </span>
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                          )}
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Due: {new Date(task.due_date).toLocaleDateString()}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${task.completion_percent}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium">{task.completion_percent}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <p className="text-gray-500">Select a learning plan to view details or create your first plan!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
