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
    if (!openaiApiKey) return await ruleBasedEvaluation(plan_id, employee_id, plan_data)

    const prompt = `You are a senior AI Engineering Learning Governance expert evaluating a learning plan for 2026 enterprise AI market.

PLAN SUBMITTED:
Title: ${plan_data.title}
Type: ${plan_data.plan_type}
Technology: ${plan_data.technology_area || 'Not specified'}
Timeline: ${plan_data.start_date} to ${plan_data.end_date}
Objective: ${plan_data.objective}
Learning Objectives: ${plan_data.learning_objectives || 'Not specified'}
Skills: ${plan_data.skills_tags || 'Not specified'}
Milestones: ${plan_data.milestones || 'Not specified'}
GitHub Repo: ${plan_data.github_repo || 'Not provided'}
Business Use Case: ${plan_data.business_use_case || 'Not specified'}

You must evaluate on 5 criteria. For each criterion give:
- A score 0-100
- A detailed explanation (8-10 lines) explaining EXACTLY why this score was given - reference specific parts of their plan
- A detailed action list (5-7 specific things) of what they must change or add to improve this score

Respond ONLY with valid JSON, no markdown, no backticks:
{
  "learning_score": <number>,
  "learning_reason": "<8-10 lines: reference exact objectives they wrote, what is missing, what is too vague, what is strong>",
  "learning_actions": ["<specific action 1>","<specific action 2>","<specific action 3>","<specific action 4>","<specific action 5>"],
  
  "relevance_score": <number>,
  "relevance_reason": "<8-10 lines: which technologies they chose are trending in 2026, which are outdated, what is missing from current AI market demand, how their plan aligns with enterprise AI needs>",
  "relevance_actions": ["<action 1>","<action 2>","<action 3>","<action 4>","<action 5>"],
  
  "execution_score": <number>,
  "execution_reason": "<8-10 lines: does the plan include real coding tasks, POCs, demos, or just theory reading? reference what milestones they mentioned, what practical work is present or missing>",
  "execution_actions": ["<action 1>","<action 2>","<action 3>","<action 4>","<action 5>"],
  
  "delivery_score": <number>,
  "delivery_reason": "<8-10 lines: can this employee work on a client AI project after this plan? does it cover deployment, architecture, production systems, scaling, cost optimization? what delivery gaps exist>",
  "delivery_actions": ["<action 1>","<action 2>","<action 3>","<action 4>","<action 5>"],
  
  "authenticity_score": <number>,
  "authenticity_reason": "<8-10 lines: does this plan look original and thought through, or is it generic? is it specific to their role/BU/technology stack? does the milestone structure show real planning effort?>",
  "authenticity_actions": ["<action 1>","<action 2>","<action 3>","<action 4>","<action 5>"],
  
  "strengths": ["<strength 1>","<strength 2>","<strength 3>"],
  "gaps": ["<gap 1>","<gap 2>","<gap 3>","<gap 4>"],
  "timeline_assessment": "<Realistic|Ambitious|Too Easy|Too Short>",
  "timeline_reason": "<2-3 lines explaining why the timeline is realistic or not>",
  "overall_feedback": "<5-6 lines: holistic assessment of the plan quality, readiness for enterprise AI delivery, and top 2 things to fix immediately>"
}`

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiApiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an AI Learning Governance expert. Respond ONLY with valid JSON. No markdown. No backticks.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 2500
      })
    })

    if (!res.ok) return await ruleBasedEvaluation(plan_id, employee_id, plan_data)

    const aiData = await res.json()
    let ev: any
    try {
      const raw = aiData.choices[0].message.content
      const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
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
      recommendations: JSON.stringify({
        learning: ev.learning_actions || [],
        relevance: ev.relevance_actions || [],
        execution: ev.execution_actions || [],
        delivery: ev.delivery_actions || [],
        authenticity: ev.authenticity_actions || [],
        top: ev.strengths || []
      }),
      gaps: JSON.stringify(ev.gaps || []),
      strengths: JSON.stringify(ev.strengths || []),
      timeline_assessment: ev.timeline_assessment,
      overall_feedback: (ev.overall_feedback || '') + (ev.timeline_reason ? '\n\nTimeline: ' + ev.timeline_reason : ''),
    }])

    return NextResponse.json({ success: true, final_score: finalScore })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

async function ruleBasedEvaluation(plan_id: string, employee_id: string, plan_data: any) {
  const text = `${plan_data.title} ${plan_data.objective} ${plan_data.learning_objectives} ${plan_data.technology_area}`.toLowerCase()
  const trending = ['genai','rag','mcp','agents','llmops','langchain','azure','openai','vector','pinecone','crewai','llamaindex']
  const practical = ['build','implement','deploy','poc','demo','project','code','develop','create','integrate']
  const delivery = ['deploy','production','architecture','cloud','azure','aws','scale','optimize','client','enterprise']

  const tCount = trending.filter(k => text.includes(k)).length
  const pCount = practical.filter(k => text.includes(k)).length
  const dCount = delivery.filter(k => text.includes(k)).length
  const hasObjs = (plan_data.learning_objectives || '').length > 100
  const hasMilestones = (plan_data.milestones || '').length > 30
  const hasGitHub = !!(plan_data.github_repo)

  const ls = Math.min(100, 40 + (hasObjs ? 25 : 0) + (hasMilestones ? 15 : 0) + 20)
  const rs = Math.min(100, 40 + tCount * 7)
  const es = Math.min(100, 35 + pCount * 7 + (hasGitHub ? 12 : 0))
  const ds = Math.min(100, 35 + dCount * 8)
  const as = Math.min(100, 40 + (hasObjs ? 20 : 0) + (hasMilestones ? 25 : 0) + (hasGitHub ? 15 : 0))
  const fs = ls * 0.25 + rs * 0.20 + es * 0.25 + ds * 0.20 + as * 0.10

  await supabase.from('ai_evaluation_scores').delete().eq('plan_id', plan_id).eq('employee_id', employee_id)
  await supabase.from('ai_evaluation_scores').insert([{
    employee_id, plan_id,
    learning_score: ls, relevance_score: rs, execution_score: es, delivery_score: ds, authenticity_score: as, final_score: fs,
    learning_reason: hasObjs
      ? 'Your plan has learning objectives with reasonable detail. The objectives are present but may benefit from more specific, measurable outcomes. Consider breaking each objective into verifiable skills. The plan shows awareness of what needs to be learned. However depth of each topic is not fully described. Adding estimated hours per topic and expected depth (beginner/intermediate/expert) would help. The current objectives are a good starting point but need more granularity for proper assessment. Link each objective to a real business outcome to strengthen this score further.'
      : 'Learning objectives are missing or too short. A strong plan needs 5-8 specific, measurable learning goals. Each objective should describe what you will be able to DO, not just what you will study. Currently the objectives section is too brief for proper evaluation. Without clear objectives, it is impossible to measure learning progress. Add at least 5 specific skills with depth level expected. Example: "Build a RAG pipeline using LangChain and FAISS that answers questions from PDF documents with 90% accuracy." This level of detail is required.',
    relevance_reason: tCount >= 4
      ? `Your plan covers ${tCount} trending AI technologies which is strong for 2026 market demand. The technology choices show awareness of current enterprise AI direction. RAG and AI Agents are among the highest demand skills. Your selection aligns with what enterprises are actively hiring for. The plan addresses real implementation challenges. However consider adding MCP (Model Context Protocol) which is rapidly growing. LLMOps and production monitoring skills are also increasingly required. Overall the market relevance is solid.`
      : `Your plan covers only ${tCount} trending technologies out of 12+ that are in high demand for 2026. Enterprise AI market is moving fast. RAG, AI Agents, MCP, LLMOps are the highest demand skills right now. Your current plan may become outdated within 6 months if not updated. Generic AI knowledge without specific framework expertise is not enough for client delivery. Review recent job postings for AI Engineer roles to see what skills are being asked for. Update your technology choices to match current market demand.`,
    execution_reason: pCount >= 3
      ? `Your plan includes ${pCount} practical work items which shows implementation focus. Building real systems is the most valuable learning activity. The presence of POC and demo tasks shows you understand that theory alone is insufficient. Hands-on implementation also generates GitHub evidence which is verifiable. Continue ensuring each milestone has at least one coding deliverable. The execution focus in your plan is a strong indicator of real learning intent.`
      : `Your plan has only ${pCount} practical tasks. A strong AI learning plan should have 70% hands-on work. Currently the plan appears too theoretical. Each milestone should end with a working demo, GitHub commit, or deployed POC. Employers and delivery heads need proof of implementation, not just course completion. Add at least 3-4 coding tasks: build a working pipeline, deploy to cloud, integrate with real data, optimize performance. Without execution evidence, the learning cannot be validated.`,
    delivery_reason: dCount >= 2
      ? `Your plan includes ${dCount} delivery-focused topics. Production readiness is what separates a learner from a practitioner. The plan shows awareness of deployment and enterprise requirements. Continue adding cost optimization, monitoring, and scaling topics. Client-facing AI solutions require production-grade architecture knowledge.`
      : `Your plan lacks delivery and production focus. Only ${dCount} delivery-related topics found. Enterprise clients expect solutions that are deployed, monitored, and optimized - not just prototype code. Add: Azure/AWS deployment, cost optimization, API design, monitoring with LangSmith or similar, error handling, security. Without this, the employee will be able to build demos but not production systems. This is the most common gap in AI learning plans.`,
    authenticity_reason: hasMilestones
      ? 'Your plan has structured milestones showing real planning effort. The milestone structure suggests you have thought through the learning journey. The plan does not appear to be a copy-paste from the internet. The business use case connection adds credibility. The specificity of your objectives and timeline shows personal investment in the plan. To further strengthen authenticity, add specific project ideas tied to your current client work or BU needs.'
      : 'The plan lacks structured milestones which reduces authenticity score. Generic plans without milestones often indicate copy-paste from a course syllabus. A genuine learning plan should show your personal roadmap with weekly targets tied to your actual work context. Add 4-6 milestones with specific deliverables. Reference your actual project context, team needs, or client requirements. This will show the plan is genuinely yours and not a generic template.',
    recommendations: JSON.stringify({ learning: ['Add 5+ specific measurable learning objectives','Define expected skill depth per topic','Link objectives to business outcomes'], relevance: ['Add MCP Model Context Protocol to plan','Include LLMOps and production monitoring','Study current AI job requirements'], execution: ['Add minimum 1 GitHub commit per milestone','Build a working end-to-end POC','Deploy something to cloud environment'], delivery: ['Add Azure/AWS deployment milestone','Include cost optimization topic','Add API design and monitoring'], authenticity: ['Reference actual client project needs','Add business use case for each milestone','Tie learning to current BU delivery gaps'], top: ['Plan shows initiative','Technology selection is relevant'] }),
    gaps: JSON.stringify(['No production deployment plan', 'Missing LLMOps and monitoring', 'No architecture design milestone', 'GitHub repo not connected']),
    strengths: JSON.stringify(['Clear learning intent', 'Relevant technology area']),
    timeline_assessment: 'Realistic',
    overall_feedback: 'This plan has a reasonable foundation but needs more depth in practical execution and delivery readiness. The learning objectives should be more specific and measurable. Focus on adding real implementation tasks with GitHub evidence. Production deployment and monitoring are critical gaps. Fix the execution and delivery sections first as they carry the most weight in scoring.',
  }])

  return NextResponse.json({ success: true, method: 'rule-based', final_score: fs })
}
