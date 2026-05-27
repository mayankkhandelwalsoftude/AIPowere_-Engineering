import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { plan_id, employee_id } = await request.json()

    // Fetch all tasks for this plan with milestone context
    const { data: milestones } = await supabase
      .from('plan_milestones')
      .select('*, learning_tasks(*)')
      .eq('plan_id', plan_id)

    const { data: plan } = await supabase
      .from('learning_plans')
      .select('*')
      .eq('plan_id', plan_id)
      .single()

    if (!milestones || !plan) {
      return NextResponse.json({ success: false, error: 'Plan not found' })
    }

    const openaiApiKey = process.env.OPENAI_API_KEY

    for (const ms of milestones) {
      for (const task of (ms.learning_tasks || [])) {
        if (!task.title) continue

        let review: any

        if (openaiApiKey) {
          const prompt = `You are a senior AI Engineering Learning Governance expert reviewing a single learning task.

PLAN CONTEXT:
Plan Title: ${plan.title}
Plan Type: ${plan.plan_type}
Plan Objective: ${plan.objective}
Milestone: ${ms.title} (Goal: ${ms.goal || 'Not specified'})

TASK BEING REVIEWED:
Title: ${task.title}
Type: ${task.task_type}
Description: ${task.description || 'Not provided'}
Expected Output: ${task.expected_output || 'Not specified'}
Estimated Hours: ${task.estimated_hours || 'Not specified'}
Due Date: ${task.due_date || 'Not specified'}

Review this task deeply across 5 dimensions. Each review should be 4-6 sentences minimum.

Respond ONLY with valid JSON, no markdown:
{
  "task_score": <0-100>,
  "overall_verdict": "<Strong|Good|Needs Work|Weak>",
  "quality_review": "<4-6 sentences: Is this task well-defined? Is it specific enough? Does it have clear success criteria? Is the time estimate realistic? Is the description sufficient to execute?>",
  "alignment_review": "<4-6 sentences: How well does this task align with the plan objective and milestone goal? Does completing this task actually move the employee closer to the plan goal? Is this the right task for this milestone?>",
  "deliverable_review": "<4-6 sentences: Does this task produce a real, verifiable deliverable? Is it purely theoretical or does it involve hands-on work? What evidence will prove this task is done? Is the expected output concrete enough?>",
  "market_value_review": "<4-6 sentences: What is the 2026 enterprise AI market value of this specific task? Is this skill in demand? Will completing this task make the employee more deployable to client projects?>",
  "missing_items": ["<specific thing missing 1>", "<specific thing missing 2>", "<specific thing missing 3>"],
  "recommendations": ["<specific actionable improvement 1>", "<specific actionable improvement 2>", "<specific actionable improvement 3>"]
}`

          const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiApiKey}` },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: 'You are an AI Learning Governance expert. Respond ONLY with valid JSON.' },
                { role: 'user', content: prompt }
              ],
              temperature: 0.5,
              max_tokens: 1200
            })
          })

          if (res.ok) {
            const aiData = await res.json()
            try {
              const raw = aiData.choices[0].message.content
              const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
              review = JSON.parse(clean)
            } catch {
              review = ruleBasedTaskReview(task, ms, plan)
            }
          } else {
            review = ruleBasedTaskReview(task, ms, plan)
          }
        } else {
          review = ruleBasedTaskReview(task, ms, plan)
        }

        // Delete old review if exists
        await supabase.from('task_ai_reviews').delete().eq('task_id', task.task_id)

        // Insert new review
        await supabase.from('task_ai_reviews').insert([{
          task_id: task.task_id,
          plan_id,
          employee_id,
          task_score: review.task_score,
          overall_verdict: review.overall_verdict,
          quality_review: review.quality_review,
          alignment_review: review.alignment_review,
          deliverable_review: review.deliverable_review,
          market_value_review: review.market_value_review,
          missing_items: JSON.stringify(review.missing_items || []),
          recommendations: JSON.stringify(review.recommendations || []),
        }])
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

function ruleBasedTaskReview(task: any, ms: any, plan: any) {
  const text = `${task.title} ${task.description || ''} ${task.expected_output || ''}`.toLowerCase()
  const hasDescription = (task.description || '').length > 30
  const hasOutput = (task.expected_output || '').length > 10
  const hasHours = task.estimated_hours > 0
  const isPractical = ['build','create','implement','deploy','code','develop','integrate'].some(k => text.includes(k))
  const isTrending = ['rag','agent','mcp','llm','openai','langchain','azure','vector'].some(k => text.includes(k))

  let score = 40
  if (hasDescription) score += 15
  if (hasOutput) score += 15
  if (hasHours) score += 10
  if (isPractical) score += 12
  if (isTrending) score += 8
  score = Math.min(100, score)

  const verdict = score >= 80 ? 'Strong' : score >= 60 ? 'Good' : score >= 40 ? 'Needs Work' : 'Weak'

  return {
    task_score: score,
    overall_verdict: verdict,
    quality_review: hasDescription
      ? `Task "${task.title}" has a reasonable description. The task has some definition but could benefit from more specific success criteria. The estimated time of ${task.estimated_hours} hours seems reasonable for this type of work. Overall the task quality is adequate but not exceptional. Adding specific acceptance criteria would significantly improve this score.`
      : `Task "${task.title}" lacks sufficient description. Without a detailed description, it is difficult to know exactly what needs to be done. The task title alone is not enough for proper execution. Add at least 3-4 sentences explaining the exact steps, tools to use, and how to know when the task is complete. This is the most critical improvement needed.`,
    alignment_review: `This task is part of milestone "${ms.title}" which contributes to the overall plan goal of ${plan.objective?.substring(0,100) || 'learning new skills'}. The alignment appears reasonable based on the task type selected. ${isPractical ? 'The practical nature of this task aligns well with real learning outcomes.' : 'This task appears more theoretical and may not fully contribute to demonstrable skills.'} Ensure this task directly produces a skill or artifact that a delivery head can assess.`,
    deliverable_review: hasOutput
      ? `Task has a defined expected output: "${task.expected_output}". This is good as it creates accountability. However the output should be more specific and verifiable. A good deliverable is something that can be linked to GitHub, deployed to a URL, or demonstrated live. Ensure the output is not just a document but a working implementation or demonstrable skill.`
      : `No expected output defined for this task. This is a significant gap. Every task must have a concrete, verifiable deliverable. Without an expected output, there is no way to confirm the task was completed properly. Add an expected output such as: GitHub repository link, deployed demo URL, document URL, or test results. This makes the task auditable and prevents fake completion.`,
    market_value_review: isTrending
      ? `This task covers skills that are in high demand in the 2026 enterprise AI market. The technologies referenced align with current hiring trends. Completing this task will improve the employee's deployability to AI projects. Clients actively request engineers with these specific skills. This is a strong investment of learning time.`
      : `The market value of this specific task is moderate. The task could be enhanced by referencing specific AI frameworks that are trending in 2026 such as LangChain, RAG, MCP, or AI Agents. Generic tasks without specific technology context are less valuable than tasks tied to in-demand frameworks. Consider adding a specific technology reference to increase this task's market value.`,
    missing_items: [
      !hasDescription ? 'Detailed step-by-step description of what to do' : 'Specific acceptance criteria (how to know task is done)',
      !hasOutput ? 'Concrete expected output (GitHub link, demo URL, document)' : 'Verification method for the deliverable',
      'Reference to specific AI tool or framework being used'
    ],
    recommendations: [
      `Add a specific deliverable: "Expected output: GitHub repository at github.com/yourname/project-name with working ${task.task_type.toLowerCase()} implementation"`,
      `Expand description to include: exact tools to use, steps to follow, and definition of done`,
      `Add a real-world context: how does completing this task help in a client AI project?`
    ]
  }
}
