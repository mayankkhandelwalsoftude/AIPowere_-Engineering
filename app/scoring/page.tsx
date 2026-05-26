'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Employee {
  employee_id: string
  name: string
  email: string
}

interface LearningPlan {
  plan_id: string
  title: string
  plan_type: string
  employee_id: string
  employee_master?: { name: string }
}

interface ScoreData {
  learning_score: number
  relevance_score: number
  execution_score: number
  delivery_score: number
  authenticity_score: number
}

export default function ScoringPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [plans, setPlans] = useState<LearningPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState('')
  const [scores, setScores] = useState<ScoreData>({
    learning_score: 0,
    relevance_score: 0,
    execution_score: 0,
    delivery_score: 0,
    authenticity_score: 0,
  })
  const [existingScore, setExistingScore] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkAuth()
    fetchEmployees()
  }, [])

  useEffect(() => {
    if (selectedEmployee) {
      fetchPlans()
    }
  }, [selectedEmployee])

  useEffect(() => {
    if (selectedPlan) {
      fetchExistingScore()
    }
  }, [selectedPlan])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/')
    }
  }

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('employee_master')
      .select('employee_id, name, email')
      .order('name')
    if (data) setEmployees(data)
  }

  const fetchPlans = async () => {
    const { data } = await supabase
      .from('learning_plans')
      .select(`
        plan_id,
        title,
        plan_type,
        employee_id,
        employee_master (name)
      `)
      .eq('employee_id', selectedEmployee)
      .order('created_at', { ascending: false })
    if (data) setPlans(data)
  }

  const fetchExistingScore = async () => {
    const { data } = await supabase
      .from('ai_evaluation_scores')
      .select('*')
      .eq('plan_id', selectedPlan)
      .eq('employee_id', selectedEmployee)
      .single()
    
    if (data) {
      setExistingScore(data)
      setScores({
        learning_score: data.learning_score || 0,
        relevance_score: data.relevance_score || 0,
        execution_score: data.execution_score || 0,
        delivery_score: data.delivery_score || 0,
        authenticity_score: data.authenticity_score || 0,
      })
    } else {
      setExistingScore(null)
      setScores({
        learning_score: 0,
        relevance_score: 0,
        execution_score: 0,
        delivery_score: 0,
        authenticity_score: 0,
      })
    }
  }

  const calculateFinalScore = () => {
    return (
      scores.learning_score * 0.25 +
      scores.relevance_score * 0.20 +
      scores.execution_score * 0.25 +
      scores.delivery_score * 0.20 +
      scores.authenticity_score * 0.10
    ).toFixed(2)
  }

  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const finalScore = calculateFinalScore()
    const scoreData = {
      employee_id: selectedEmployee,
      plan_id: selectedPlan,
      ...scores,
      final_score: parseFloat(finalScore),
    }

    try {
      if (existingScore) {
        // Update existing score
        const { error } = await supabase
          .from('ai_evaluation_scores')
          .update(scoreData)
          .eq('score_id', existingScore.score_id)
        
        if (error) throw error
        alert('Score updated successfully!')
      } else {
        // Insert new score
        const { error } = await supabase
          .from('ai_evaluation_scores')
          .insert([scoreData])
        
        if (error) throw error
        alert('Score saved successfully!')
      }
      
      fetchExistingScore()
    } catch (error: any) {
      alert('Error saving score: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const selectedPlanData = plans.find(p => p.plan_id === selectedPlan)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Evaluation & Scoring</h1>
            <p className="text-sm text-gray-600">Evaluate Learning Plans & Delivery Readiness</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Back to Admin
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          {/* Employee & Plan Selection */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Employee
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => {
                  setSelectedEmployee(e.target.value)
                  setSelectedPlan('')
                }}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Choose an employee...</option>
                {employees.map((emp) => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.name} ({emp.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Learning Plan
              </label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                disabled={!selectedEmployee}
              >
                <option value="">Choose a plan...</option>
                {plans.map((plan) => (
                  <option key={plan.plan_id} value={plan.plan_id}>
                    {plan.title} ({plan.plan_type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedPlan && selectedPlanData && (
            <>
              {/* Plan Info */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">{selectedPlanData.title}</h3>
                <p className="text-sm text-gray-600">
                  Type: {selectedPlanData.plan_type} | Employee: {selectedPlanData.employee_master?.name}
                </p>
              </div>

              {/* Scoring Form */}
              <form onSubmit={handleSubmitScore}>
                <div className="space-y-6">
                  {/* Learning Score */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Learning Score (25%)
                      </label>
                      <span className="text-lg font-bold text-blue-600">{scores.learning_score}/100</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={scores.learning_score}
                      onChange={(e) => setScores({ ...scores, learning_score: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Depth of learning, concept understanding, knowledge application
                    </p>
                  </div>

                  {/* Relevance Score */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Relevance Score (20%)
                      </label>
                      <span className="text-lg font-bold text-green-600">{scores.relevance_score}/100</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={scores.relevance_score}
                      onChange={(e) => setScores({ ...scores, relevance_score: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Market relevance, industry demand, alignment with AI trends
                    </p>
                  </div>

                  {/* Execution Score */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Execution Score (25%)
                      </label>
                      <span className="text-lg font-bold text-purple-600">{scores.execution_score}/100</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={scores.execution_score}
                      onChange={(e) => setScores({ ...scores, execution_score: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Code quality, architecture, implementation, real-world application
                    </p>
                  </div>

                  {/* Delivery Score */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Delivery Readiness (20%)
                      </label>
                      <span className="text-lg font-bold text-orange-600">{scores.delivery_score}/100</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={scores.delivery_score}
                      onChange={(e) => setScores({ ...scores, delivery_score: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Production readiness, client readiness, deployment capability
                    </p>
                  </div>

                  {/* Authenticity Score */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Authenticity Score (10%)
                      </label>
                      <span className="text-lg font-bold text-red-600">{scores.authenticity_score}/100</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={scores.authenticity_score}
                      onChange={(e) => setScores({ ...scores, authenticity_score: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Real contribution %, original work, genuine learning vs copy-paste
                    </p>
                  </div>
                </div>

                {/* Final Score Display */}
                <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600 mb-2">Final Weighted Score</p>
                    <p className="text-5xl font-bold text-blue-600">{calculateFinalScore()}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Formula: 25% Learning + 20% Relevance + 25% Execution + 20% Delivery + 10% Authenticity
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="mt-6 flex gap-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
                  >
                    {loading ? 'Saving...' : existingScore ? 'Update Score' : 'Save Score'}
                  </button>
                  {existingScore && (
                    <div className="px-4 py-3 bg-green-100 border border-green-300 rounded-lg text-sm text-green-800">
                      ✓ Previously scored on {new Date(existingScore.created_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </form>
            </>
          )}

          {!selectedPlan && (
            <div className="text-center py-12 text-gray-500">
              Select an employee and learning plan to start scoring
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
