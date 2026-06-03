'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'

interface Props {
  employeeId: string
  onPlanCreated: (planId: string) => void
  onClose: () => void
}

export default function PlanImportExport({ employeeId, onPlanCreated, onClose }: Props) {
  const [tab, setTab] = useState<'download'|'upload'>('download')
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string[]>([])
  const [error, setError] = useState('')

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new()

    // ─── Sheet 1: Plan Details ───────────────────────────────────────
    const planData = [
      ['PLAN DETAILS - Fill in the Value column only', '', ''],
      ['Field', 'Value', 'Notes / Options'],
      ['Plan Title *', '', 'e.g. Master RAG and AI Agents in 90 days'],
      ['Plan Type *', 'GenAI', 'GenAI / AI Engineering / MLOps / Data Engineering / AI Agents / LLMOps / RAG / MCP / Cloud AI / AI Security / Custom'],
      ['Technology Area', '', 'e.g. LangChain, OpenAI, Azure, Pinecone'],
      ['Objective *', '', 'What will you be able to DO after completing this plan?'],
      ['Learning Objectives', '', 'List goals separated by semicolons (;)'],
      ['Skills Tags', '', 'e.g. RAG, LangChain, Vector DB, Azure OpenAI'],
      ['Start Date *', '', 'YYYY-MM-DD format e.g. 2025-06-01'],
      ['End Date *', '', 'YYYY-MM-DD format e.g. 2025-08-31'],
      ['Priority *', 'Medium', 'Low / Medium / High'],
      ['GitHub Repo', '', 'https://github.com/yourname/repo (optional)'],
      ['Business Use Case', '', 'Which client or project does this support? (optional)'],
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(planData)
    ws1['!cols'] = [{ wch: 22 }, { wch: 40 }, { wch: 65 }]
    // Style header rows
    XLSX.utils.book_append_sheet(wb, ws1, 'Plan Details')

    // ─── Sheet 2: Milestones ─────────────────────────────────────────
    const msHeaders = ['Milestone No *', 'Title *', 'Goal', 'Start Date *', 'End Date *', 'Skills Covered', 'Expected Evidence']
    const msData = [
      ['MILESTONES - Add one milestone per row. Milestone No must be sequential: 1, 2, 3...', '', '', '', '', '', ''],
      msHeaders,
      ['1', 'Week 1: RAG Fundamentals', 'Understand RAG architecture and build first pipeline', '2025-06-01', '2025-06-07', 'RAG, FAISS, LangChain', 'GitHub commit with working RAG demo'],
      ['2', 'Week 2: Vector Databases', 'Learn Pinecone and Weaviate', '2025-06-08', '2025-06-14', 'Pinecone, Weaviate, Embeddings', 'Working vector search demo'],
      ['3', 'Week 3: Production Deployment', 'Deploy RAG pipeline to Azure', '2025-06-15', '2025-06-21', 'Azure, Docker, FastAPI', 'Live deployment URL'],
    ]
    const ws2 = XLSX.utils.aoa_to_sheet(msData)
    ws2['!cols'] = [{ wch: 16 }, { wch: 30 }, { wch: 40 }, { wch: 14 }, { wch: 14 }, { wch: 25 }, { wch: 35 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'Milestones')

    // ─── Sheet 3: Tasks ──────────────────────────────────────────────
    const taskHeaders = ['Milestone No *', 'Task Title *', 'Task Type *', 'Due Date', 'Estimated Hours', 'Expected Output', 'Description']
    const taskData = [
      ['TASKS - Add one task per row. Milestone No must match a Milestone No from the Milestones sheet.', '', '', '', '', '', ''],
      ['Task Type options: Learning / Coding / POC / Documentation / Demo / Assessment / Certification / Project', '', '', '', '', '', ''],
      taskHeaders,
      ['1', 'Study RAG architecture concepts', 'Learning', '2025-06-02', '3', 'Summary notes with architecture diagram', 'Read RAG paper, watch tutorials, summarize key concepts in a document'],
      ['1', 'Build basic document Q&A with FAISS', 'Coding', '2025-06-05', '6', 'GitHub repo with working Q&A demo on PDF files', 'Build Python script that loads PDF, creates FAISS index, answers questions using OpenAI'],
      ['1', 'Create RAG architecture diagram', 'Documentation', '2025-06-07', '2', 'Architecture diagram PDF in GitHub repo', 'Draw and explain RAG pipeline from document ingestion to answer generation'],
      ['2', 'Set up Pinecone free tier and load data', 'Coding', '2025-06-09', '2', 'Working Pinecone index with 500 documents loaded', 'Create account, set up index, upload documents and verify semantic search works'],
      ['2', 'Compare FAISS vs Pinecone performance', 'POC', '2025-06-12', '4', 'Comparison report with latency benchmarks', 'Run 100 queries on both, compare latency, accuracy, cost'],
      ['3', 'Dockerize RAG application', 'Coding', '2025-06-16', '4', 'Docker image on Docker Hub', 'Create Dockerfile and docker-compose for RAG application with all dependencies'],
      ['3', 'Deploy to Azure Container Apps', 'Demo', '2025-06-19', '5', 'Live URL: https://rag-demo.azurecontainerapps.io', 'Deploy dockerized app to Azure Container Apps with proper configuration'],
    ]
    const ws3 = XLSX.utils.aoa_to_sheet(taskData)
    ws3['!cols'] = [{ wch: 15 }, { wch: 38 }, { wch: 16 }, { wch: 13 }, { wch: 17 }, { wch: 38 }, { wch: 55 }]
    XLSX.utils.book_append_sheet(wb, ws3, 'Tasks')

    // ─── Sheet 4: Instructions ───────────────────────────────────────
    const instrData = [
      ['AI LEARNING PLATFORM - PLAN IMPORT INSTRUCTIONS'],
      [''],
      ['HOW TO USE THIS TEMPLATE:'],
      ['1. Fill in the "Plan Details" sheet - enter your values in the Value column only'],
      ['2. Fill in the "Milestones" sheet - replace sample rows with your milestones (keep Milestone No as 1, 2, 3...)'],
      ['3. Fill in the "Tasks" sheet - replace sample rows with your tasks (Milestone No must match milestones)'],
      ['4. Delete the sample rows before uploading'],
      ['5. Upload the file on the Import from Excel screen'],
      [''],
      ['IMPORTANT RULES:'],
      ['- Do NOT change sheet names or column headers'],
      ['- Fields marked with * are required'],
      ['- Dates must be in YYYY-MM-DD format (e.g. 2025-06-01)'],
      ['- Milestone No in Tasks sheet must exactly match Milestone No in Milestones sheet'],
      ['- Plan Type must be one of the listed options exactly'],
      ['- Priority must be: Low, Medium, or High'],
      ['- Task Type must be: Learning, Coding, POC, Documentation, Demo, Assessment, Certification, or Project'],
      [''],
      ['WHAT HAPPENS AFTER UPLOAD:'],
      ['- System creates your plan automatically'],
      ['- AI evaluates the entire plan (score 0-100 with detailed feedback)'],
      ['- AI reviews each individual task and gives task-level feedback'],
      ['- You can view all reviews on your dashboard'],
      [''],
      ['QUESTIONS? Contact your admin or manager.'],
    ]
    const ws4 = XLSX.utils.aoa_to_sheet(instrData)
    ws4['!cols'] = [{ wch: 80 }]
    XLSX.utils.book_append_sheet(wb, ws4, 'Instructions')

    XLSX.writeFile(wb, 'AI-Learning-Plan-Template.xlsx')
  }

  const parseAndCreatePlan = async (file: File) => {
    setUploading(true)
    setUploadStatus([])
    setError('')

    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })

      // ─── Parse Plan Details ─────────────────────────────────────
      setUploadStatus(p => [...p, 'Reading Plan Details sheet...'])
      const ws1 = wb.Sheets['Plan Details']
      if (!ws1) throw new Error('Sheet "Plan Details" not found. Do not rename sheets.')

      const planRaw = XLSX.utils.sheet_to_json<any[]>(ws1, { header: 1 })
      const planMap: Record<string, string> = {}
      planRaw.forEach((row: any[]) => {
        if (row[0] && row[1] !== undefined && row[0] !== 'Field' && !String(row[0]).startsWith('PLAN')) {
          planMap[String(row[0]).replace(' *', '').trim()] = String(row[1] || '').trim()
        }
      })

      const requiredFields = ['Plan Title', 'Plan Type', 'Objective', 'Start Date', 'End Date']
      for (const f of requiredFields) {
        if (!planMap[f]) throw new Error(`Required field "${f}" is empty in Plan Details sheet.`)
      }

      setUploadStatus(p => [...p, `Plan: "${planMap['Plan Title']}" found. Validating...`])

      // ─── Parse Milestones ───────────────────────────────────────
      setUploadStatus(p => [...p, 'Reading Milestones sheet...'])
      const ws2 = wb.Sheets['Milestones']
      if (!ws2) throw new Error('Sheet "Milestones" not found.')

      const msRaw = XLSX.utils.sheet_to_json<any[]>(ws2, { header: 1 })
      const milestoneMap: Record<string, any> = {}
      let msHeaderIdx = -1

      for (let i = 0; i < msRaw.length; i++) {
        if (msRaw[i][0] === 'Milestone No *') { msHeaderIdx = i; break }
      }
      if (msHeaderIdx === -1) throw new Error('Could not find Milestone headers. Do not change column names.')

      for (let i = msHeaderIdx + 1; i < msRaw.length; i++) {
        const row = msRaw[i]
        if (!row[0] || !row[1]) continue
        const msNo = String(row[0]).trim()
        milestoneMap[msNo] = {
          order_number: parseInt(msNo) || i,
          title: String(row[1] || '').trim(),
          goal: String(row[2] || '').trim(),
          start_date: formatDate(row[3]),
          end_date: formatDate(row[4]),
          skills_covered: String(row[5] || '').trim(),
          evidence_expected: String(row[6] || '').trim(),
          tasks: []
        }
      }

      const msCount = Object.keys(milestoneMap).length
      if (msCount === 0) throw new Error('No milestones found. Add at least one milestone.')
      setUploadStatus(p => [...p, `Found ${msCount} milestones.`])

      // ─── Parse Tasks ────────────────────────────────────────────
      setUploadStatus(p => [...p, 'Reading Tasks sheet...'])
      const ws3 = wb.Sheets['Tasks']
      if (!ws3) throw new Error('Sheet "Tasks" not found.')

      const taskRaw = XLSX.utils.sheet_to_json<any[]>(ws3, { header: 1 })
      let taskHeaderIdx = -1
      for (let i = 0; i < taskRaw.length; i++) {
        if (taskRaw[i][0] === 'Milestone No *') { taskHeaderIdx = i; break }
      }

      let taskCount = 0
      if (taskHeaderIdx !== -1) {
        for (let i = taskHeaderIdx + 1; i < taskRaw.length; i++) {
          const row = taskRaw[i]
          if (!row[0] || !row[1]) continue
          const msNo = String(row[0]).trim()
          if (!milestoneMap[msNo]) {
            setUploadStatus(p => [...p, `Warning: Task "${row[1]}" has Milestone No ${msNo} which doesn't exist. Skipping.`])
            continue
          }
          milestoneMap[msNo].tasks.push({
            title: String(row[1] || '').trim(),
            task_type: String(row[2] || 'Learning').trim(),
            due_date: formatDate(row[3]),
            estimated_hours: parseFloat(String(row[4] || '2')) || 2,
            expected_output: String(row[5] || '').trim(),
            description: String(row[6] || '').trim(),
            status: 'Pending'
          })
          taskCount++
        }
      }
      setUploadStatus(p => [...p, `Found ${taskCount} tasks.`])

      // ─── Create Plan in Database ────────────────────────────────
      setUploadStatus(p => [...p, 'Creating plan in database...'])
      const priorityMap: Record<string, number> = { Low: 1, Medium: 2, High: 3 }

      const VALID_TYPES = ['GenAI','AI Engineering','MLOps','Data Engineering','AI Agents','LLMOps','RAG','MCP','Cloud AI','AI Security','Custom']
      const rawType = planMap['Plan Type'] || ''
      const planType = VALID_TYPES.includes(rawType.trim())
        ? rawType.trim()
        : (VALID_TYPES.find(t => rawType.toLowerCase().includes(t.toLowerCase())) || 'Custom')

      if (planType === 'Custom' && rawType) {
        setUploadStatus(p => [...p, `Note: Plan Type "${rawType}" mapped to "Custom" (not a standard type)`])
      }

      const { data: newPlan, error: planErr } = await supabase
        .from('learning_plans')
        .insert([{
          employee_id: employeeId,
          title: planMap['Plan Title'],
          plan_type: planType,
          technology_area: planMap['Technology Area'] || '',
          objective: planMap['Objective'],
          learning_objectives: planMap['Learning Objectives'] || '',
          skills_tags: planMap['Skills Tags'] || '',
          start_date: formatDate(planMap['Start Date']),
          end_date: formatDate(planMap['End Date']),
          priority: priorityMap[planMap['Priority'] || 'Medium'] || 2,
          github_repo: planMap['GitHub Repo'] || '',
          business_use_case: planMap['Business Use Case'] || '',
          status: 'Active',
        }])
        .select().single()

      if (planErr) throw new Error('Failed to create plan: ' + planErr.message)
      setUploadStatus(p => [...p, `Plan created: ${newPlan.plan_id}`])

      // ─── Create Milestones and Tasks ────────────────────────────
      setUploadStatus(p => [...p, 'Creating milestones and tasks...'])
      for (const msNo of Object.keys(milestoneMap).sort()) {
        const ms = milestoneMap[msNo]
        if (!ms.title) continue

        const { data: newMs, error: msErr } = await supabase
          .from('plan_milestones')
          .insert([{
            plan_id: newPlan.plan_id,
            title: ms.title,
            goal: ms.goal,
            start_date: ms.start_date || null,
            end_date: ms.end_date || null,
            order_number: ms.order_number,
            skills_covered: ms.skills_covered,
            evidence_expected: ms.evidence_expected,
          }]).select().single()

        if (msErr || !newMs) { setUploadStatus(p => [...p, `Warning: Could not create milestone "${ms.title}"`]); continue }

        if (ms.tasks.length > 0) {
          await supabase.from('learning_tasks').insert(
            ms.tasks.map((t: any) => ({
              plan_id: newPlan.plan_id,
              milestone_id: newMs.milestone_id,
              title: t.title,
              task_type: t.task_type,
              due_date: t.due_date || ms.end_date || null,
              estimated_hours: t.estimated_hours,
              expected_output: t.expected_output,
              description: t.description,
              status: 'Pending',
            }))
          )
        }
        setUploadStatus(p => [...p, `Milestone ${msNo}: "${ms.title}" created with ${ms.tasks.length} tasks`])
      }

      // ─── Trigger AI Evaluation (plan level) ─────────────────────
      setUploadStatus(p => [...p, 'Triggering AI plan evaluation...'])
      fetch('/api/evaluate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: newPlan.plan_id,
          employee_id: employeeId,
          plan_data: {
            title: planMap['Plan Title'],
            plan_type: planMap['Plan Type'],
            technology_area: planMap['Technology Area'],
            objective: planMap['Objective'],
            learning_objectives: planMap['Learning Objectives'],
            skills_tags: planMap['Skills Tags'],
            start_date: planMap['Start Date'],
            end_date: planMap['End Date'],
            github_repo: planMap['GitHub Repo'],
            business_use_case: planMap['Business Use Case'],
            milestones: Object.values(milestoneMap).map((m: any) => m.title).join(', ')
          }
        })
      })

      // ─── Trigger AI Task Reviews ─────────────────────────────────
      setUploadStatus(p => [...p, 'Triggering AI task reviews (running in background)...'])
      fetch('/api/review-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: newPlan.plan_id, employee_id: employeeId })
      })

      setUploadStatus(p => [...p, '✓ Import complete! AI is evaluating your plan and tasks...'])
      setTimeout(() => { onPlanCreated(newPlan.plan_id) }, 2000)

    } catch (err: any) {
      setError(err.message)
      setUploading(false)
    }
  }

  const formatDate = (val: any): string => {
    if (!val) return ''
    const s = String(val).trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    // Excel serial date
    if (/^\d+$/.test(s)) {
      const d = XLSX.SSF.parse_date_code(parseInt(s))
      if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
    }
    // Try parsing
    try {
      const d = new Date(s)
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    } catch {}
    return s
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl">
        <div className="flex justify-between items-center p-5 border-b">
          <h2 className="text-lg font-bold">Import Plan from Excel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button onClick={() => setTab('download')} className={`flex-1 py-3 text-sm font-medium ${tab==='download'?'border-b-2 border-blue-600 text-blue-600':'text-gray-500'}`}>1. Download Template</button>
          <button onClick={() => setTab('upload')} className={`flex-1 py-3 text-sm font-medium ${tab==='upload'?'border-b-2 border-blue-600 text-blue-600':'text-gray-500'}`}>2. Upload Filled File</button>
        </div>

        <div className="p-6">
          {tab === 'download' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="font-bold text-blue-800 mb-2">How it works</h3>
                <ol className="space-y-1.5">
                  {[
                    'Download the Excel template below',
                    'Fill in Plan Details sheet (your plan info)',
                    'Fill in Milestones sheet (your weekly/phase plan)',
                    'Fill in Tasks sheet (specific actions per milestone)',
                    'Upload the filled file in Step 2',
                    'AI will auto-evaluate the entire plan and each task',
                  ].map((s, i) => <li key={i} className="flex gap-2 text-sm text-blue-700"><span className="font-bold shrink-0">{i+1}.</span>{s}</li>)}
                </ol>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                <div className="text-4xl mb-3">📊</div>
                <p className="font-semibold text-gray-800 mb-1">AI Learning Plan Template</p>
                <p className="text-sm text-gray-500 mb-4">Excel file with 4 sheets: Plan Details, Milestones, Tasks, Instructions</p>
                <button onClick={downloadTemplate} className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                  Download Template (.xlsx)
                </button>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800 space-y-1">
                <p className="font-bold">Important rules:</p>
                <p>• Do NOT rename the sheets</p>
                <p>• Delete sample rows before uploading</p>
                <p>• Dates must be YYYY-MM-DD format</p>
                <p>• Milestone No in Tasks must match Milestones sheet</p>
              </div>

              <button onClick={() => setTab('upload')} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                I have filled the template → Go to Upload
              </button>
            </div>
          )}

          {tab === 'upload' && (
            <div className="space-y-4">
              {!uploading && uploadStatus.length === 0 && (
                <>
                  <div className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center">
                    <div className="text-4xl mb-3">📤</div>
                    <p className="font-semibold text-gray-800 mb-1">Upload your filled template</p>
                    <p className="text-sm text-gray-500 mb-4">Select the .xlsx file you downloaded and filled in</p>
                    <label className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium cursor-pointer">
                      Select Excel File
                      <input type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) parseAndCreatePlan(f) }} />
                    </label>
                  </div>
                  <p className="text-xs text-gray-400 text-center">System will read all 3 sheets and create your plan automatically</p>
                </>
              )}

              {(uploading || uploadStatus.length > 0) && (
                <div className="space-y-3">
                  <div className="bg-gray-50 border rounded-xl p-4 max-h-64 overflow-y-auto">
                    {uploadStatus.map((s, i) => (
                      <div key={i} className={`flex gap-2 text-sm py-1 ${s.startsWith('Warning') ? 'text-yellow-600' : s.startsWith('✓') ? 'text-green-600 font-semibold' : 'text-gray-700'}`}>
                        <span>{s.startsWith('✓') ? '✓' : s.startsWith('Warning') ? '⚠️' : '→'}</span>
                        <span>{s}</span>
                      </div>
                    ))}
                    {uploading && !uploadStatus.some(s => s.startsWith('✓')) && (
                      <div className="flex gap-2 text-sm text-blue-600 py-1"><span className="animate-spin">⟳</span><span>Processing...</span></div>
                    )}
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-sm font-bold text-red-700 mb-1">Error</p>
                      <p className="text-sm text-red-600">{error}</p>
                      <button onClick={() => { setUploadStatus([]); setError(''); setUploading(false) }} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Try Again</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
