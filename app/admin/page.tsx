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
  technology_area: string
  status: string
  start_date: string
  end_date: string
  priority: number
  employee_master?: { name: string }
}

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'users' | 'plans'>('users')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [learningPlans, setLearningPlans] = useState<LearningPlan[]>([])
  const [loading, setLoading] = useState(true)
  
  // User form state
  const [showUserForm, setShowUserForm] = useState(false)
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'Employee',
    department: '',
    bu: '',
    experience_years: 0,
  })

  // Plan form state
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [planForm, setPlanForm] = useState({
    employee_id: '',
    title: '',
    plan_type: 'GenAI',
    technology_area: '',
    objective: '',
    learning_objectives: '',
    milestones: '',
    start_date: '',
    end_date: '',
    priority: 1,
    status: 'Draft',
  })

  useEffect(() => {
    checkAuth()
    fetchData()
  }, [activeTab])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/')
    }
  }

  const fetchData = async () => {
    setLoading(true)
    if (activeTab === 'users') {
      const { data, error } = await supabase
        .from('employee_master')
        .select('*')
        .order('name')
      if (!error) setEmployees(data || [])
    } else {
      const { data, error } = await supabase
        .from('learning_plans')
        .select(`
          *,
          employee_master (name)
        `)
        .order('created_at', { ascending: false })
      if (!error) setLearningPlans(data || [])
    }
    setLoading(false)
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase
      .from('employee_master')
      .insert([userForm])
    
    if (!error) {
      setShowUserForm(false)
      setUserForm({ name: '', email: '', role: 'Employee', department: '', bu: '', experience_years: 0 })
      fetchData()
    }
  }

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase
      .from('learning_plans')
      .insert([planForm])
    
    if (!error) {
      setShowPlanForm(false)
      setPlanForm({
        employee_id: '',
        title: '',
        plan_type: 'GenAI',
        technology_area: '',
        objective: '',
        learning_objectives: '',
        milestones: '',
        start_date: '',
        end_date: '',
        priority: 1,
        status: 'Draft',
      })
      fetchData()
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Learning Platform</h1>
            <p className="text-sm text-gray-600">Admin Dashboard</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'users'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              User Management
            </button>
            <button
              onClick={() => setActiveTab('plans')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'plans'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Learning Plans
            </button>
          </div>

          <div className="p-6">
            {/* User Management Tab */}
            {activeTab === 'users' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Users ({employees.length})</h2>
                  <button
                    onClick={() => setShowUserForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add User
                  </button>
                </div>

                {showUserForm && (
                  <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                    <h3 className="text-lg font-medium mb-4">Create New User</h3>
                    <form onSubmit={handleCreateUser} className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Name"
                        value={userForm.name}
                        onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                        className="px-3 py-2 border rounded"
                        required
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={userForm.email}
                        onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                        className="px-3 py-2 border rounded"
                        required
                      />
                      <select
                        value={userForm.role}
                        onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                        className="px-3 py-2 border rounded"
                      >
                        <option value="Employee">Employee</option>
                        <option value="Admin">Admin</option>
                        <option value="Manager">Manager</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Department"
                        value={userForm.department}
                        onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                        className="px-3 py-2 border rounded"
                      />
                      <input
                        type="text"
                        placeholder="Business Unit"
                        value={userForm.bu}
                        onChange={(e) => setUserForm({ ...userForm, bu: e.target.value })}
                        className="px-3 py-2 border rounded"
                      />
                      <input
                        type="number"
                        placeholder="Experience (years)"
                        value={userForm.experience_years}
                        onChange={(e) => setUserForm({ ...userForm, experience_years: parseInt(e.target.value) })}
                        className="px-3 py-2 border rounded"
                        min="0"
                      />
                      <div className="col-span-2 flex gap-2">
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                          Create User
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowUserForm(false)}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-4 py-2 text-left">Email</th>
                        <th className="px-4 py-2 text-left">Role</th>
                        <th className="px-4 py-2 text-left">Department</th>
                        <th className="px-4 py-2 text-left">Experience</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp) => (
                        <tr key={emp.employee_id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">{emp.name}</td>
                          <td className="px-4 py-3">{emp.email}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              emp.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                              emp.role === 'Manager' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {emp.role}
                            </span>
                          </td>
                          <td className="px-4 py-3">{emp.department || '-'}</td>
                          <td className="px-4 py-3">{emp.experience_years} years</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Learning Plans Tab */}
            {activeTab === 'plans' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Learning Plans ({learningPlans.length})</h2>
                  <button
                    onClick={() => setShowPlanForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Plan
                  </button>
                </div>

                {showPlanForm && (
                  <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                    <h3 className="text-lg font-medium mb-4">Create Learning Plan</h3>
                    <form onSubmit={handleCreatePlan} className="space-y-4">
                      <select
                        value={planForm.employee_id}
                        onChange={(e) => setPlanForm({ ...planForm, employee_id: e.target.value })}
                        className="w-full px-3 py-2 border rounded"
                        required
                      >
                        <option value="">Select Employee</option>
                        {employees.map((emp) => (
                          <option key={emp.employee_id} value={emp.employee_id}>
                            {emp.name} ({emp.email})
                          </option>
                        ))}
                      </select>
                      
                      <input
                        type="text"
                        placeholder="Plan Title"
                        value={planForm.title}
                        onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
                        className="w-full px-3 py-2 border rounded"
                        required
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <select
                          value={planForm.plan_type}
                          onChange={(e) => setPlanForm({ ...planForm, plan_type: e.target.value })}
                          className="px-3 py-2 border rounded"
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
                        
                        <input
                          type="text"
                          placeholder="Technology Area (e.g., Python, TensorFlow)"
                          value={planForm.technology_area}
                          onChange={(e) => setPlanForm({ ...planForm, technology_area: e.target.value })}
                          className="px-3 py-2 border rounded"
                        />
                      </div>
                      
                      <textarea
                        placeholder="Objective"
                        value={planForm.objective}
                        onChange={(e) => setPlanForm({ ...planForm, objective: e.target.value })}
                        className="w-full px-3 py-2 border rounded"
                        rows={2}
                      />

                      <textarea
                        placeholder="Learning Objectives (bullet points or comma-separated)"
                        value={planForm.learning_objectives}
                        onChange={(e) => setPlanForm({ ...planForm, learning_objectives: e.target.value })}
                        className="w-full px-3 py-2 border rounded"
                        rows={3}
                      />

                      <textarea
                        placeholder="Milestones (e.g., Week 1: Setup, Week 2: Build POC...)"
                        value={planForm.milestones}
                        onChange={(e) => setPlanForm({ ...planForm, milestones: e.target.value })}
                        className="w-full px-3 py-2 border rounded"
                        rows={3}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="date"
                          placeholder="Start Date"
                          value={planForm.start_date}
                          onChange={(e) => setPlanForm({ ...planForm, start_date: e.target.value })}
                          className="px-3 py-2 border rounded"
                        />
                        <input
                          type="date"
                          placeholder="End Date"
                          value={planForm.end_date}
                          onChange={(e) => setPlanForm({ ...planForm, end_date: e.target.value })}
                          className="px-3 py-2 border rounded"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <select
                          value={planForm.priority}
                          onChange={(e) => setPlanForm({ ...planForm, priority: parseInt(e.target.value) })}
                          className="px-3 py-2 border rounded"
                        >
                          <option value={1}>Priority: Low</option>
                          <option value={2}>Priority: Medium</option>
                          <option value={3}>Priority: High</option>
                        </select>
                        <select
                          value={planForm.status}
                          onChange={(e) => setPlanForm({ ...planForm, status: e.target.value })}
                          className="px-3 py-2 border rounded"
                        >
                          <option value="Draft">Draft</option>
                          <option value="Pending Approval">Pending Approval</option>
                          <option value="Approved">Approved</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                          Create Plan
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPlanForm(false)}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="space-y-4">
                  {learningPlans.map((plan) => (
                    <div key={plan.plan_id} className="p-4 border rounded-lg hover:shadow-md transition">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">{plan.title}</h3>
                          <p className="text-sm text-gray-600">
                            {plan.employee_master?.name || 'Unknown Employee'}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded text-sm font-medium ${
                          plan.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          plan.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          plan.status === 'Approved' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {plan.status}
                        </span>
                      </div>
                      <div className="flex gap-4 text-sm text-gray-600">
                        <span>📦 {plan.plan_type || 'General'}</span>
                        <span>📚 {plan.technology_area || 'General'}</span>
                        <span>📅 {new Date(plan.start_date).toLocaleDateString()} - {new Date(plan.end_date).toLocaleDateString()}</span>
                        <span>🎯 Priority: {plan.priority}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
