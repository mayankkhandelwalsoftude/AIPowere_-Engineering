'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface LearningPlan {
  plan_id: string
  title: string
  technology_area: string
  status: string
  start_date: string
  end_date: string
  priority: number
  objective: string
}

interface Task {
  task_id: string
  title: string
  description: string
  due_date: string
  status: string
  completion_percent: number
}

export default function UserDashboard() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [learningPlans, setLearningPlans] = useState<LearningPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (selectedPlan) {
      fetchTasks()
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Learning Plans Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-4">My Learning Plans</h2>
              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : learningPlans.length === 0 ? (
                <p className="text-gray-500 text-sm">No learning plans assigned yet.</p>
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
                      <p className="text-xs text-gray-600 mt-1">{plan.technology_area}</p>
                      <span className={`inline-block mt-2 px-2 py-1 rounded text-xs ${
                        plan.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        plan.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {plan.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
                    {learningPlans.filter(p => p.status === 'In Progress').length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Completed</span>
                  <span className="font-medium">
                    {learningPlans.filter(p => p.status === 'Completed').length}
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
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {currentPlan.status}
                    </span>
                  </div>
                  
                  <div className="flex gap-4 text-sm text-gray-600 mb-4">
                    <span>📚 {currentPlan.technology_area}</span>
                    <span>📅 {new Date(currentPlan.start_date).toLocaleDateString()} - {new Date(currentPlan.end_date).toLocaleDateString()}</span>
                    <span>🎯 Priority: {currentPlan.priority}</span>
                  </div>

                  {currentPlan.objective && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                      <h3 className="font-medium text-sm mb-1">Objective</h3>
                      <p className="text-sm text-gray-700">{currentPlan.objective}</p>
                    </div>
                  )}
                </div>

                {/* Tasks Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Learning Tasks</h3>
                  {tasks.length === 0 ? (
                    <p className="text-gray-500 text-sm">No tasks added yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {tasks.map((task) => (
                        <div key={task.task_id} className="p-4 border rounded-lg hover:shadow-sm transition">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{task.title}</h4>
                            <span className={`px-2 py-1 rounded text-xs ${
                              task.status === 'Done' ? 'bg-green-100 text-green-800' :
                              task.status === 'Skipped' ? 'bg-red-100 text-red-800' :
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
                <p className="text-gray-500">Select a learning plan to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
