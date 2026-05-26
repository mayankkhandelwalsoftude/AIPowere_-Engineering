import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { plan_id, employee_id, plan_data } = await request.json()

    // Call OpenAI for evaluation
    const openaiApiKey = process.env.OPENAI_API_KEY
    
    if (!openaiApiKey) {
      // If no OpenAI key, use rule-based scoring
      return await ruleBasedEvaluation(plan_id, employee_id, plan_data)
    }

    const evaluationPrompt = `You are an AI Learning Governance expert evaluating enterprise engineering learning plans.

Evaluate this learning plan on a scale of 0-100 for each criterion:

**Plan Details:**
Title: ${plan_data.title}
Type: ${plan_data.plan_type}
Technology: ${plan_data.technology_area}
Timeline: ${plan_data.timeline}

Objective: ${plan_data.objective}

Learning Objectives: ${plan_data.learning_objectives}

Milestones: ${plan_data.milestones}

**Evaluation Criteria:**

1. **Learning Score (0-100)**: Assess the depth and comprehensiveness of learning objectives. Are they specific, measurable, and challenging enough?

2. **Relevance Score (0-100)**: Evaluate market relevance for 2026 AI industry. Is this aligned with current GenAI, AI Agents, LLMOps, RAG, MCP trends? Is it enterprise-useful?

3. **Execution Score (0-100)**: Assess if the plan includes practical implementation, code work, POCs, demos, not just theoretical learning.

4. **Delivery Readiness Score (0-100)**: Check if plan covers deployment, architecture, production skills, not just development.

5. **Timeline Realism (0-100)**: Is the timeline realistic for the objectives? Not too ambitious, not too easy.

**Response Format (JSON only, no markdown):**
{
  "learning_score": <number>,
  "relevance_score": <number>,
  "execution_score": <number>,
  "delivery_score": <number>,
  "authenticity_score": <number based on plan detail/depth>,
  "recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"],
  "gaps": ["<gap 1>", "<gap 2>"],
  "strengths": ["<strength 1>", "<strength 2>"],
  "timeline_assessment": "<realistic|ambitious|too_easy>"
}

Provide constructive, actionable feedback.`

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an AI Learning Governance expert. Respond only with valid JSON, no markdown formatting.'
          },
          {
            role: 'user',
            content: evaluationPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    })

    if (!openaiResponse.ok) {
      throw new Error('OpenAI API error')
    }

    const openaiData = await openaiResponse.json()
    const aiResponse = openaiData.choices[0].message.content

    // Parse AI response
    let evaluation
    try {
      // Remove markdown code blocks if present
      const cleanedResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      evaluation = JSON.parse(cleanedResponse)
    } catch (e) {
      // Fallback to rule-based if parsing fails
      return await ruleBasedEvaluation(plan_id, employee_id, plan_data)
    }

    // Calculate final score
    const finalScore = (
      evaluation.learning_score * 0.25 +
      evaluation.relevance_score * 0.20 +
      evaluation.execution_score * 0.25 +
      evaluation.delivery_score * 0.20 +
      evaluation.authenticity_score * 0.10
    )

    // Store evaluation in database
    const { error: scoreError } = await supabase
      .from('ai_evaluation_scores')
      .insert([{
        employee_id,
        plan_id,
        learning_score: evaluation.learning_score,
        relevance_score: evaluation.relevance_score,
        execution_score: evaluation.execution_score,
        delivery_score: evaluation.delivery_score,
        authenticity_score: evaluation.authenticity_score,
        final_score: finalScore
      }])

    if (scoreError) {
      console.error('Error storing score:', scoreError)
    }

    // Store recommendations
    if (evaluation.recommendations && evaluation.recommendations.length > 0) {
      const recommendations = evaluation.recommendations.map((rec: string) => ({
        employee_id,
        type: 'Learning Plan Improvement',
        description: rec,
        severity: 'Medium'
      }))

      await supabase
        .from('ai_recommendations')
        .insert(recommendations)
    }

    return NextResponse.json({
      success: true,
      evaluation,
      final_score: finalScore
    })

  } catch (error: any) {
    console.error('Evaluation error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// Fallback rule-based evaluation
async function ruleBasedEvaluation(plan_id: string, employee_id: string, plan_data: any) {
  // Simple rule-based scoring when OpenAI is not available
  let learning_score = 50
  let relevance_score = 50
  let execution_score = 50
  let delivery_score = 50
  let authenticity_score = 50

  // Check for detailed objectives
  if (plan_data.learning_objectives && plan_data.learning_objectives.length > 100) {
    learning_score += 20
  }

  // Check for milestones
  if (plan_data.milestones && plan_data.milestones.length > 50) {
    execution_score += 15
  }

  // Check for trending technologies
  const trendingKeywords = ['genai', 'rag', 'mcp', 'agents', 'llmops', 'langchain', 'azure', 'openai']
  const planText = `${plan_data.title} ${plan_data.objective} ${plan_data.learning_objectives}`.toLowerCase()
  
  const matchCount = trendingKeywords.filter(keyword => planText.includes(keyword)).length
  relevance_score += matchCount * 5

  // Check for practical work mentions
  const practicalKeywords = ['build', 'implement', 'deploy', 'poc', 'demo', 'project']
  const practicalCount = practicalKeywords.filter(keyword => planText.includes(keyword)).length
  execution_score += practicalCount * 5

  // Check for deployment/production mentions
  const deliveryKeywords = ['deploy', 'production', 'architecture', 'cloud', 'azure', 'aws']
  const deliveryCount = deliveryKeywords.filter(keyword => planText.includes(keyword)).length
  delivery_score += deliveryCount * 5

  // Cap at 100
  learning_score = Math.min(learning_score, 100)
  relevance_score = Math.min(relevance_score, 100)
  execution_score = Math.min(execution_score, 100)
  delivery_score = Math.min(delivery_score, 100)
  authenticity_score = Math.min(authenticity_score, 100)

  const finalScore = (
    learning_score * 0.25 +
    relevance_score * 0.20 +
    execution_score * 0.25 +
    delivery_score * 0.20 +
    authenticity_score * 0.10
  )

  // Store in database
  await supabase
    .from('ai_evaluation_scores')
    .insert([{
      employee_id,
      plan_id,
      learning_score,
      relevance_score,
      execution_score,
      delivery_score,
      authenticity_score,
      final_score: finalScore
    }])

  return NextResponse.json({
    success: true,
    evaluation: {
      learning_score,
      relevance_score,
      execution_score,
      delivery_score,
      authenticity_score,
      recommendations: [
        'Add more specific implementation milestones',
        'Include deployment and architecture planning',
        'Consider adding production-readiness goals'
      ],
      gaps: ['Deployment strategy', 'Architecture design'],
      strengths: ['Good technology selection'],
      timeline_assessment: 'realistic'
    },
    final_score: finalScore,
    method: 'rule-based'
  })
}
