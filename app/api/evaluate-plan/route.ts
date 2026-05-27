import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { plan_id, employee_id, plan_data } = await request.json()
    const openaiApiKey = process.env.OPENAI_API_KEY

    if (!openaiApiKey) {
      return await ruleBasedEvaluation(plan_id, employee_id, plan_data)
    }

    const prompt = `You are an AI Learning Governance expert evaluating enterprise engineering learning plans for 2026.

Plan Details:
Title: ${plan_data.title}
Type: ${plan_data.plan_type}
Technology: ${plan_data.technology_area}
Timeline: ${plan_data.start_date} to ${plan_data.end_date}
Objective: ${plan_data.objective}
Learning Objectives: ${plan_data.learning_objectives}
Skills Tags: ${plan_data.skills_tags || 'Not specified'}
Milestones: ${plan_data.milestones || 'Not specified'}
GitHub Repo: ${plan_data.github_repo || 'Not provided'}
Business Use Case: ${plan_data.business_use_case || 'Not specified'}

Evaluate this plan on 5 criteria. For each, give a score (0-100) AND a specific reason why, AND what exactly the employee should change or improve.

Scoring criteria:
1. Learning Score (25% weight): Depth of learning objectives, specificity, knowledge breadth
2. Market Relevance Score (20%): Alignment with 2026 AI trends (RAG, Agents, MCP, LLMOps = high; outdated tech = low)
3. Execution Score (25%): Practical work - coding, POCs, demos, not just theory
4. Delivery Readiness Score (20%): Production, deployment, architecture, client-ready skills
5. Authenticity Score (10%): Plan detail and originality - not generic or copy-pasted

Respond ONLY with valid JSON, no markdown:
{
  "learning_score": <0-100>,
  "learning_reason": "<why this score - 1-2 sentences>",
  "learning_change": "<specific improvement needed>",
  "relevance_score": <0-100>,
  "relevance_reason": "<why this score>",
  "relevance_change": "<specific improvement needed>",
  "execution_score": <0-100>,
  "execution_reason": "<why this score>",
  "execution_change": "<specific improvement needed>",
  "delivery_score": <0-100>,
  "delivery_reason": "<why this score>",
  "delivery_change": "<specific improvement needed>",
  "authenticity_score": <0-100>,
  "authenticity_reason": "<why this score>",
  "authenticity_change": "<specific improvement needed>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "gaps": ["<gap 1>", "<gap 2>", "<gap 3>"],
  "recommendations": ["<actionable recommendation 1>", "<actionable recommendation 2>", "<actionable recommendation 3>"],
  "timeline_assessment": "<Realistic|Ambitious|Too Easy>",
  "overall_feedback": "<2-3 sentence overall assessment of the plan>"
}`

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiApiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an AI Learning Governance expert. Respond only with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.6,
        max_tokens: 1500
      })
    })

    if (!res.ok) return await ruleBasedEvaluation(plan_id, employee_id, plan_data)

    const aiData = await res.json()
    let ev: any
    try {
      const clean = aiData.choices[0].message.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      ev = JSON.parse(clean)
    } catch {
      return await ruleBasedEvaluation(plan_id, employee_id, plan_data)
    }

    const finalScore = (
      ev.learning_score * 0.25 +
      ev.relevance_score * 0.20 +
      ev.execution_score * 0.25 +
      ev.delivery_score * 0.20 +
      ev.authenticity_score * 0.10
    )

    // Delete old score if exists, then insert fresh
    await supabase.from('ai_evaluation_scores').delete().eq('plan_id', plan_id).eq('employee_id', employee_id)

    await supabase.from('ai_evaluation_scores').insert([{
      employee_id, plan_id,
      learning_score: ev.learning_score,
      relevance_score: ev.relevance_score,
      execution_score: ev.execution_score,
      delivery_score: ev.delivery_score,
      authenticity_score: ev.authenticity_score,
      final_score: finalScore,
      learning_reason: ev.learning_reason,
      relevance_reason: ev.relevance_reason,
      execution_reason: ev.execution_reason,
      delivery_reason: ev.delivery_reason,
      authenticity_reason: ev.authenticity_reason,
      recommendations: JSON.stringify(ev.recommendations || []),
      gaps: JSON.stringify(ev.gaps || []),
      strengths: JSON.stringify(ev.strengths || []),
      timeline_assessment: ev.timeline_assessment,
      overall_feedback: ev.overall_feedback,
    }])

    if (ev.recommendations?.length) {
      await supabase.from('ai_recommendations').delete().eq('employee_id', employee_id)
      await supabase.from('ai_recommendations').insert(
        ev.recommendations.map((r: string) => ({ employee_id, type: 'Plan Improvement', description: r, severity: 'Medium' }))
      )
    }

    return NextResponse.json({ success: true, evaluation: ev, final_score: finalScore })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

async function ruleBasedEvaluation(plan_id: string, employee_id: string, plan_data: any) {
  const text = `${plan_data.title} ${plan_data.objective} ${plan_data.learning_objectives} ${plan_data.technology_area}`.toLowerCase()
  const trending = ['genai','rag','mcp','agents','llmops','langchain','azure','openai','vector','pinecone']
  const practical = ['build','implement','deploy','poc','demo','project','code','develop']
  const delivery = ['deploy','production','architecture','cloud','azure','aws','scale','optimize']

  const tCount = trending.filter(k => text.includes(k)).length
  const pCount = practical.filter(k => text.includes(k)).length
  const dCount = delivery.filter(k => text.includes(k)).length
  const hasObjectives = (plan_data.learning_objectives || '').length > 100
  const hasMilestones = (plan_data.milestones || '').length > 50
  const hasGitHub = !!(plan_data.github_repo)

  const learning_score = Math.min(100, 50 + (hasObjectives ? 20 : 0) + (hasMilestones ? 15 : 0) + 15)
  const relevance_score = Math.min(100, 50 + tCount * 8)
  const execution_score = Math.min(100, 45 + pCount * 8 + (hasGitHub ? 10 : 0))
  const delivery_score = Math.min(100, 45 + dCount * 8)
  const authenticity_score = Math.min(100, 50 + (hasObjectives ? 15 : 0) + (hasMilestones ? 20 : 0) + (hasGitHub ? 15 : 0))

  const finalScore = learning_score * 0.25 + relevance_score * 0.20 + execution_score * 0.25 + delivery_score * 0.20 + authenticity_score * 0.10

  await supabase.from('ai_evaluation_scores').delete().eq('plan_id', plan_id).eq('employee_id', employee_id)
  await supabase.from('ai_evaluation_scores').insert([{
    employee_id, plan_id,
    learning_score, relevance_score, execution_score, delivery_score, authenticity_score,
    final_score: finalScore,
    learning_reason: hasObjectives ? 'Learning objectives are detailed and specific.' : 'Learning objectives need more detail and specificity.',
    relevance_reason: tCount >= 3 ? 'Plan covers multiple trending 2026 AI technologies.' : 'Plan could include more trending technologies like RAG, MCP, or AI Agents.',
    execution_reason: pCount >= 2 ? 'Plan includes practical implementation tasks.' : 'Add more hands-on coding tasks, POCs and demos.',
    delivery_reason: dCount >= 2 ? 'Good coverage of deployment and production skills.' : 'Plan lacks deployment and production readiness focus.',
    authenticity_reason: hasMilestones ? 'Plan has structured milestones showing original planning.' : 'Add detailed milestones to show original planning.',
    recommendations: JSON.stringify(['Add specific POC or demo deliverable', 'Include deployment to cloud (Azure/AWS)', 'Add vector database implementation task']),
    gaps: JSON.stringify(['Production deployment strategy missing', 'Architecture design phase not mentioned']),
    strengths: JSON.stringify(['Technology selection is relevant', 'Clear learning goal defined']),
    timeline_assessment: 'Realistic',
    overall_feedback: 'Plan has a good foundation. Adding more practical implementation details and deployment focus will significantly improve the score.',
  }])

  return NextResponse.json({ success: true, method: 'rule-based', final_score: finalScore })
}
