'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const PlanImportExport = dynamic(() => import('@/components/PlanImportExport'), { ssr: false })

const PLAN_TYPES = ['GenAI','AI Engineering','MLOps','Data Engineering','AI Agents','LLMOps','RAG','MCP','Cloud AI','AI Security','Custom']
const TASK_TYPES = ['Learning','Coding','POC','Documentation','Demo','Assessment','Certification','Project']
const TASK_STATUSES = ['Pending','In Progress','Done','Blocked']
const MS_STATUSES = ['Not Started','In Progress','Completed']

const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
const lbl = "block text-xs font-medium text-gray-500 mb-1"

type Modal = 'none'|'createPlan'|'editPlan'|'addMs'|'editMs'|'addTask'|'editTask'|'evidence'|'ai'|'taskReview'|'import'

export default function UserDashboard() {
  const router = useRouter()
  const [me, setMe] = useState<any>(null)
  const [plans, setPlans] = useState<any[]>([])
  const [sel, setSel] = useState<any>(null)
  const [milestones, setMilestones] = useState<any[]>([])
  const [aiScore, setAiScore] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<Modal>('none')
  const [activeMs, setActiveMs] = useState<any>(null)
  const [activeTask, setActiveTask] = useState<any>(null)
  const [taskReview, setTaskReview] = useState<any>(null)
  const [loadingReview, setLoadingReview] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [expandedMs, setExpandedMs] = useState<Set<string>>(new Set())

  const [pf, setPf] = useState({ title:'', plan_type:'GenAI', technology_area:'', objective:'', learning_objectives:'', skills_tags:'', github_repo:'', business_use_case:'', start_date:'', end_date:'', priority:2 })
  const [mf, setMf] = useState({ title:'', goal:'', start_date:'', end_date:'', skills_covered:'', evidence_expected:'' })
  const [tf, setTf] = useState({ title:'', task_type:'Learning', due_date:'', estimated_hours:2, description:'', expected_output:'' })
  const [ef, setEf] = useState({ github_link:'', pr_link:'', demo_url:'', jira_link:'', certificate_url:'', notes:'', hours_spent:0 })

  useEffect(() => { checkAuth() }, [])
  useEffect(() => { if (sel && me) { fetchMs(); fetchScore(); fetchComments() } }, [sel, me])

  const checkAuth = async () => {
    const { data:{session} } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    const { data:emp } = await supabase.from('employee_master').select('*').eq('email', session.user.email).single()
    if (emp) { setMe(emp); fetchPlans(emp.employee_id) }
  }
  const fetchPlans = async (id:string) => {
    setLoading(true)
    const { data } = await supabase.from('learning_plans').select('*').eq('employee_id', id).order('created_at', {ascending:false})
    if (data) { setPlans(data); if (data.length && !sel) setSel(data[0]) }
    setLoading(false)
  }
  const fetchMs = async () => {
    const { data } = await supabase.from('plan_milestones').select('*, learning_tasks(*)').eq('plan_id', sel.plan_id).order('order_number')
    if (data) {
      setMilestones(data)
      if (data.length) setExpandedMs(new Set(data.map((m:any) => m.milestone_id)))
    }
  }
  const fetchScore = async () => {
    const { data } = await supabase.from('ai_evaluation_scores').select('*').eq('plan_id', sel.plan_id).eq('employee_id', me.employee_id).single()
    setAiScore(data || null)
  }
  const fetchComments = async () => {
    const { data } = await supabase.from('plan_comments').select('*, employee_master(name)').eq('plan_id', sel.plan_id).order('created_at')
    setComments(data || [])
  }

  // Plan ops
  const openCreate = () => { setPf({ title:'', plan_type:'GenAI', technology_area:'', objective:'', learning_objectives:'', skills_tags:'', github_repo:'', business_use_case:'', start_date:'', end_date:'', priority:2 }); setModal('createPlan') }
  const openEdit = () => { setPf({ title:sel.title||'', plan_type:sel.plan_type||'GenAI', technology_area:sel.technology_area||'', objective:sel.objective||'', learning_objectives:sel.learning_objectives||'', skills_tags:sel.skills_tags||'', github_repo:sel.github_repo||'', business_use_case:sel.business_use_case||'', start_date:sel.start_date||'', end_date:sel.end_date||'', priority:sel.priority||2 }); setModal('editPlan') }

  const savePlan = async (isEdit:boolean) => {
    if (!pf.title||!pf.objective||!pf.start_date||!pf.end_date) { alert('Fill required fields'); return }
    setSaving(true)
    try {
      if (isEdit) {
        await supabase.from('learning_plans').update({...pf}).eq('plan_id', sel.plan_id)
        setModal('none'); fetchPlans(me.employee_id)
      } else {
        const { data:np, error } = await supabase.from('learning_plans').insert([{ employee_id:me.employee_id, ...pf, status:'Active' }]).select().single()
        if (error) throw error
        setModal('none'); await fetchPlans(me.employee_id); setSel(np)
        fetch('/api/evaluate-plan', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ plan_id:np.plan_id, employee_id:me.employee_id, plan_data:pf }) })
      }
    } catch(e:any) { alert(e.message) }
    setSaving(false)
  }

  const deletePlan = async () => {
    if (!sel) return
    if (!confirm(`Delete plan "${sel.title}" and all its milestones and tasks? This cannot be undone.`)) return
    setSaving(true)
    // Delete tasks first, then milestones, then plan
    const msIds = milestones.map(m => m.milestone_id)
    if (msIds.length) await supabase.from('learning_tasks').delete().in('milestone_id', msIds)
    await supabase.from('plan_milestones').delete().eq('plan_id', sel.plan_id)
    await supabase.from('ai_evaluation_scores').delete().eq('plan_id', sel.plan_id)
    await supabase.from('ai_recommendations').delete().eq('employee_id', me.employee_id)
    await supabase.from('plan_comments').delete().eq('plan_id', sel.plan_id)
    await supabase.from('learning_plans').delete().eq('plan_id', sel.plan_id)
    setSel(null); setSaving(false)
    fetchPlans(me.employee_id)
  }

  // Status updates
  const updateTaskStatus = async (taskId:string, status:string) => {
    await supabase.from('learning_tasks').update({ status }).eq('task_id', taskId)
    fetchMs()
  }
  const updateMsStatus = async (msId:string, status:string) => {
    await supabase.from('plan_milestones').update({ status }).eq('milestone_id', msId)
    fetchMs()
  }
  const updatePlanStatus = async (status:string) => {
    await supabase.from('learning_plans').update({ status }).eq('plan_id', sel.plan_id)
    const updated = { ...sel, status }; setSel(updated)
    setPlans(p => p.map(x => x.plan_id === sel.plan_id ? updated : x))
  }

  // Milestone ops
  const saveMs = async (isEdit:boolean) => {
    if (!mf.title) { alert('Title required'); return }
    setSaving(true)
    if (isEdit) {
      await supabase.from('plan_milestones').update({...mf}).eq('milestone_id', activeMs.milestone_id)
    } else {
      await supabase.from('plan_milestones').insert([{ plan_id:sel.plan_id, ...mf, order_number:milestones.length+1, status:'Not Started' }])
    }
    setModal('none'); fetchMs(); setSaving(false)
  }
  const deleteMs = async (ms:any) => {
    if (!confirm(`Delete milestone "${ms.title}" and all its tasks?`)) return
    await supabase.from('learning_tasks').delete().eq('milestone_id', ms.milestone_id)
    await supabase.from('plan_milestones').delete().eq('milestone_id', ms.milestone_id)
    fetchMs()
  }

  // Task ops
  const saveTask = async (isEdit:boolean) => {
    if (!tf.title) { alert('Title required'); return }
    setSaving(true)
    if (isEdit) {
      await supabase.from('learning_tasks').update({...tf}).eq('task_id', activeTask.task_id)
    } else {
      await supabase.from('learning_tasks').insert([{ plan_id:sel.plan_id, milestone_id:activeMs.milestone_id, ...tf, status:'Pending' }])
    }
    setModal('none'); fetchMs(); setSaving(false)
  }
  const deleteTask = async (task:any) => {
    if (!confirm(`Delete task "${task.title}"?`)) return
    await supabase.from('learning_tasks').delete().eq('task_id', task.task_id)
    fetchMs()
  }

  // Evidence
  const openEvidence = (task:any) => { setActiveTask(task); setEf({ github_link:task.github_link||'', pr_link:task.pr_link||'', demo_url:task.demo_url||'', jira_link:task.jira_link||'', certificate_url:task.certificate_url||'', notes:task.notes||'', hours_spent:task.hours_spent||0 }); setModal('evidence') }
  const saveEvidence = async () => {
    setSaving(true)
    await supabase.from('learning_tasks').update({ ...ef, status:'In Progress' }).eq('task_id', activeTask.task_id)
    setModal('none'); fetchMs(); setSaving(false)
  }
  const handleFileUpload = async (e:React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try {
      const path = `${me.employee_id}/${activeTask.task_id}/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('evidence').upload(path, file)
      if (error) throw error
      const { data:urlData } = supabase.storage.from('evidence').getPublicUrl(path)
      const existing = activeTask.file_urls ? JSON.parse(activeTask.file_urls) : []
      const updated = [...existing, { name:file.name, url:urlData.publicUrl }]
      await supabase.from('learning_tasks').update({ file_urls:JSON.stringify(updated) }).eq('task_id', activeTask.task_id)
      setActiveTask({ ...activeTask, file_urls:JSON.stringify(updated) }); fetchMs()
    } catch(e:any) { alert(e.message) }
    setUploading(false)
  }

  // Task review
  const openTaskReview = async (task:any) => {
    setActiveTask(task); setTaskReview(null); setLoadingReview(true); setModal('taskReview')
    const { data } = await supabase.from('task_ai_reviews').select('*').eq('task_id', task.task_id).single()
    setTaskReview(data||null); setLoadingReview(false)
  }

  const handleImportDone = async (planId:string) => {
    setModal('none'); await fetchPlans(me.employee_id)
    const { data } = await supabase.from('learning_plans').select('*').eq('plan_id', planId).single()
    if (data) setSel(data)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }

  const statusBadge = (s:string) => {
    const map: Record<string,string> = { 'Pending':'bg-gray-100 text-gray-600', 'In Progress':'bg-blue-100 text-blue-700', 'Done':'bg-green-100 text-green-700', 'Blocked':'bg-red-100 text-red-700', 'Not Started':'bg-gray-100 text-gray-500', 'Completed':'bg-green-100 text-green-700', 'Active':'bg-blue-100 text-blue-700', 'On Hold':'bg-yellow-100 text-yellow-700' }
    return `inline-flex px-2 py-0.5 rounded text-xs font-medium ${map[s]||'bg-gray-100 text-gray-600'}`
  }

  const scoreBar = (s:number) => <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1"><div className={`h-1.5 rounded-full ${s>=80?'bg-green-500':s>=60?'bg-blue-500':s>=40?'bg-yellow-500':'bg-red-500'}`} style={{width:`${s}%`}} /></div>

  const safe = (j:string|undefined):any[] => { try { return j?JSON.parse(j):[]} catch { return [] } }
  const safeObj = (j:string|undefined):any => { try { return j?JSON.parse(j):{}} catch { return {} } }

  // Reusable small modal
  const SM = ({ title, onSave, label='Save', children }:any) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={()=>setModal('none')} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-3">{children}</div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t">
          <button onClick={()=>setModal('none')} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={onSave} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving?'Saving…':label}</button>
        </div>
      </div>
    </div>
  )

  const PlanFields = () => <>
    <div><label className={lbl}>Title *</label><input type="text" value={pf.title} onChange={e=>setPf({...pf,title:e.target.value})} className={inp} placeholder="e.g. Master RAG in 90 days" /></div>
    <div className="grid grid-cols-2 gap-3">
      <div><label className={lbl}>Type</label><select value={pf.plan_type} onChange={e=>setPf({...pf,plan_type:e.target.value})} className={inp}>{PLAN_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
      <div><label className={lbl}>Technology</label><input type="text" value={pf.technology_area} onChange={e=>setPf({...pf,technology_area:e.target.value})} className={inp} placeholder="LangChain, Azure…" /></div>
    </div>
    <div><label className={lbl}>Objective *</label><textarea value={pf.objective} onChange={e=>setPf({...pf,objective:e.target.value})} className={inp} rows={2} placeholder="What will you be able to do?" /></div>
    <div><label className={lbl}>Learning Objectives</label><textarea value={pf.learning_objectives} onChange={e=>setPf({...pf,learning_objectives:e.target.value})} className={inp} rows={3} placeholder={"- Goal 1\n- Goal 2"} /></div>
    <div><label className={lbl}>Skills (comma-separated)</label><input type="text" value={pf.skills_tags} onChange={e=>setPf({...pf,skills_tags:e.target.value})} className={inp} placeholder="RAG, LangChain, Azure OpenAI" /></div>
    <div className="grid grid-cols-2 gap-3">
      <div><label className={lbl}>Start *</label><input type="date" value={pf.start_date} onChange={e=>setPf({...pf,start_date:e.target.value})} className={inp} /></div>
      <div><label className={lbl}>End *</label><input type="date" value={pf.end_date} onChange={e=>setPf({...pf,end_date:e.target.value})} className={inp} /></div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div><label className={lbl}>Priority</label><select value={pf.priority} onChange={e=>setPf({...pf,priority:parseInt(e.target.value)})} className={inp}><option value={1}>Low</option><option value={2}>Medium</option><option value={3}>High</option></select></div>
      <div><label className={lbl}>GitHub Repo</label><input type="text" value={pf.github_repo} onChange={e=>setPf({...pf,github_repo:e.target.value})} className={inp} placeholder="https://github.com/…" /></div>
    </div>
    <div><label className={lbl}>Business Use Case</label><input type="text" value={pf.business_use_case} onChange={e=>setPf({...pf,business_use_case:e.target.value})} className={inp} placeholder="Client or project this supports" /></div>
  </>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div>
          <span className="font-bold text-gray-900">AI Learning Platform</span>
          <span className="ml-3 text-sm text-gray-400">Hi, {me?.name}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setModal('import')} className="px-3 py-1.5 text-sm border border-green-500 text-green-600 rounded-lg hover:bg-green-50">Import Excel</button>
          <button onClick={openCreate} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ New Plan</button>
          <button onClick={handleLogout} className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Logout</button>
        </div>
      </nav>

      {/* Modals */}
      {modal==='import' && me && <PlanImportExport employeeId={me.employee_id} onPlanCreated={handleImportDone} onClose={()=>setModal('none')} />}

      {modal==='createPlan' && <SM title="New Learning Plan" onSave={()=>savePlan(false)} label="Create"><PlanFields /></SM>}
      {modal==='editPlan' && <SM title="Edit Plan" onSave={()=>savePlan(true)} label="Save Changes"><PlanFields /></SM>}

      {modal==='addMs' && <SM title="Add Milestone" onSave={()=>saveMs(false)} label="Add">
        <div><label className={lbl}>Title *</label><input type="text" value={mf.title} onChange={e=>setMf({...mf,title:e.target.value})} className={inp} placeholder="e.g. Week 1: RAG Fundamentals" /></div>
        <div><label className={lbl}>Goal</label><input type="text" value={mf.goal} onChange={e=>setMf({...mf,goal:e.target.value})} className={inp} placeholder="What will be achieved?" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Start</label><input type="date" value={mf.start_date} onChange={e=>setMf({...mf,start_date:e.target.value})} className={inp} /></div>
          <div><label className={lbl}>End</label><input type="date" value={mf.end_date} onChange={e=>setMf({...mf,end_date:e.target.value})} className={inp} /></div>
        </div>
        <div><label className={lbl}>Skills</label><input type="text" value={mf.skills_covered} onChange={e=>setMf({...mf,skills_covered:e.target.value})} className={inp} placeholder="RAG, FAISS…" /></div>
        <div><label className={lbl}>Expected Evidence</label><input type="text" value={mf.evidence_expected} onChange={e=>setMf({...mf,evidence_expected:e.target.value})} className={inp} placeholder="GitHub commit, demo…" /></div>
      </SM>}

      {modal==='editMs' && activeMs && <SM title="Edit Milestone" onSave={()=>saveMs(true)} label="Save">
        <div><label className={lbl}>Title *</label><input type="text" value={mf.title} onChange={e=>setMf({...mf,title:e.target.value})} className={inp} /></div>
        <div><label className={lbl}>Goal</label><input type="text" value={mf.goal} onChange={e=>setMf({...mf,goal:e.target.value})} className={inp} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Start</label><input type="date" value={mf.start_date} onChange={e=>setMf({...mf,start_date:e.target.value})} className={inp} /></div>
          <div><label className={lbl}>End</label><input type="date" value={mf.end_date} onChange={e=>setMf({...mf,end_date:e.target.value})} className={inp} /></div>
        </div>
        <div><label className={lbl}>Skills</label><input type="text" value={mf.skills_covered} onChange={e=>setMf({...mf,skills_covered:e.target.value})} className={inp} /></div>
        <div><label className={lbl}>Expected Evidence</label><input type="text" value={mf.evidence_expected} onChange={e=>setMf({...mf,evidence_expected:e.target.value})} className={inp} /></div>
      </SM>}

      {(modal==='addTask'||modal==='editTask') && <SM title={modal==='addTask'?`Add Task — ${activeMs?.title}`:'Edit Task'} onSave={()=>saveTask(modal==='editTask')} label={modal==='addTask'?'Add':'Save'}>
        <div><label className={lbl}>Title *</label><input type="text" value={tf.title} onChange={e=>setTf({...tf,title:e.target.value})} className={inp} placeholder="e.g. Build RAG pipeline with FAISS" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Type</label><select value={tf.task_type} onChange={e=>setTf({...tf,task_type:e.target.value})} className={inp}>{TASK_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
          <div><label className={lbl}>Due Date</label><input type="date" value={tf.due_date} onChange={e=>setTf({...tf,due_date:e.target.value})} className={inp} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Est. Hours</label><input type="number" value={tf.estimated_hours} onChange={e=>setTf({...tf,estimated_hours:parseFloat(e.target.value)})} className={inp} min={0} step={0.5} /></div>
          <div><label className={lbl}>Expected Output</label><input type="text" value={tf.expected_output} onChange={e=>setTf({...tf,expected_output:e.target.value})} className={inp} placeholder="GitHub link, demo URL…" /></div>
        </div>
        <div><label className={lbl}>Description</label><textarea value={tf.description} onChange={e=>setTf({...tf,description:e.target.value})} className={inp} rows={3} placeholder="What exactly needs to be done?" /></div>
      </SM>}

      {modal==='evidence' && activeTask && <SM title="Evidence & Progress" onSave={saveEvidence} label="Save">
        <p className="text-sm font-medium text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">{activeTask.title}</p>
        <div><label className={lbl}>GitHub / Commit Link</label><input type="url" value={ef.github_link} onChange={e=>setEf({...ef,github_link:e.target.value})} className={inp} placeholder="https://github.com/…" /></div>
        <div><label className={lbl}>Pull Request Link</label><input type="url" value={ef.pr_link} onChange={e=>setEf({...ef,pr_link:e.target.value})} className={inp} /></div>
        <div><label className={lbl}>Demo / Deployed URL</label><input type="url" value={ef.demo_url} onChange={e=>setEf({...ef,demo_url:e.target.value})} className={inp} /></div>
        <div><label className={lbl}>Jira / ADO Link</label><input type="url" value={ef.jira_link} onChange={e=>setEf({...ef,jira_link:e.target.value})} className={inp} /></div>
        <div><label className={lbl}>Certificate URL</label><input type="url" value={ef.certificate_url} onChange={e=>setEf({...ef,certificate_url:e.target.value})} className={inp} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Hours Spent</label><input type="number" value={ef.hours_spent} onChange={e=>setEf({...ef,hours_spent:parseFloat(e.target.value)})} className={inp} min={0} step={0.5} /></div>
        </div>
        <div><label className={lbl}>Notes</label><textarea value={ef.notes} onChange={e=>setEf({...ef,notes:e.target.value})} className={inp} rows={2} placeholder="Progress notes, blockers…" /></div>
        <div>
          <label className={lbl}>Upload File</label>
          <input type="file" onChange={handleFileUpload} disabled={uploading} className="text-sm text-gray-500 file:mr-2 file:px-3 file:py-1 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-600" />
          {uploading && <p className="text-xs text-blue-500 mt-1">Uploading…</p>}
          {activeTask.file_urls && (() => { try { return JSON.parse(activeTask.file_urls).map((f:any,i:number) => <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="flex gap-1 text-xs text-blue-600 hover:underline mt-1">📎 {f.name}</a>) } catch { return null } })()}
        </div>
      </SM>}

      {modal==='taskReview' && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl my-4">
            <div className="flex justify-between items-center px-5 py-4 border-b">
              <div><p className="font-semibold">AI Task Review</p><p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{activeTask?.title}</p></div>
              <button onClick={()=>setModal('none')} className="text-gray-400 text-xl">×</button>
            </div>
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {loadingReview ? <div className="text-center py-10 text-gray-400">Loading review…</div> :
              !taskReview ? <div className="text-center py-10 text-gray-500"><p className="font-medium mb-1">No review yet</p><p className="text-sm">AI reviews run after plan creation. Try refreshing in a moment.</p><button onClick={()=>openTaskReview(activeTask)} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Refresh</button></div> : <>
                <div className={`text-center p-4 rounded-xl ${taskReview.overall_verdict==='Strong'?'bg-green-50':taskReview.overall_verdict==='Good'?'bg-blue-50':taskReview.overall_verdict==='Needs Work'?'bg-yellow-50':'bg-red-50'}`}>
                  <p className="text-4xl font-bold text-gray-800">{taskReview.task_score}<span className="text-lg text-gray-400">/100</span></p>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-semibold ${taskReview.overall_verdict==='Strong'?'bg-green-100 text-green-700':taskReview.overall_verdict==='Good'?'bg-blue-100 text-blue-700':taskReview.overall_verdict==='Needs Work'?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'}`}>{taskReview.overall_verdict}</span>
                </div>
                {[['Task Quality',taskReview.quality_review],['Plan Alignment',taskReview.alignment_review],['Deliverable',taskReview.deliverable_review],['2026 Market Value',taskReview.market_value_review]].map(([title,text]) => text && (
                  <div key={String(title)} className="border rounded-xl p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{title}</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
                  </div>
                ))}
                {safe(taskReview.missing_items).length > 0 && <div className="bg-red-50 border border-red-200 rounded-xl p-3"><p className="text-xs font-semibold text-red-600 uppercase mb-1">Missing</p>{safe(taskReview.missing_items).map((s:string,i:number) => <p key={i} className="text-sm text-red-700">• {s}</p>)}</div>}
                {safe(taskReview.recommendations).length > 0 && <div className="bg-amber-50 border border-amber-200 rounded-xl p-3"><p className="text-xs font-semibold text-amber-700 uppercase mb-1">What to Improve</p>{safe(taskReview.recommendations).map((r:string,i:number) => <p key={i} className="text-sm text-gray-700">{i+1}. {r}</p>)}</div>}
              </>}
            </div>
          </div>
        </div>
      )}

      {modal==='ai' && aiScore && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl my-4">
            <div className="flex justify-between items-center px-5 py-4 border-b">
              <p className="font-semibold">AI Evaluation Report</p>
              <button onClick={()=>setModal('none')} className="text-gray-400 text-xl">×</button>
            </div>
            <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs">
                <p className="font-semibold text-blue-800 mb-1">Scoring Formula</p>
                <p className="font-mono text-blue-700">Final = (Learning×25%) + (Relevance×20%) + (Execution×25%) + (Delivery×20%) + (Authenticity×10%)</p>
              </div>
              <div className="text-center"><p className="text-5xl font-bold text-gray-800">{Number(aiScore.final_score).toFixed(1)}</p><p className="text-sm text-gray-400">/ 100</p></div>
              {aiScore.overall_feedback && <div className="bg-gray-50 rounded-xl p-4 border-l-4 border-blue-500"><p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{aiScore.overall_feedback}</p></div>}
              {[['Learning Quality','25%','learning'],['Market Relevance','20%','relevance'],['Execution Focus','25%','execution'],['Delivery Readiness','20%','delivery'],['Authenticity','10%','authenticity']].map(([label,weight,key]) => {
                const score = (aiScore as any)[`${key}_score`]
                const reason = (aiScore as any)[`${key}_reason`]
                const actions = safeObj(aiScore.recommendations)[key] as string[]||[]
                return (
                  <div key={String(key)} className="border rounded-xl overflow-hidden">
                    <div className="flex justify-between items-center px-4 py-3 bg-gray-50">
                      <div><span className="font-medium text-sm">{label}</span><span className="ml-2 text-xs text-gray-400">{weight}</span></div>
                      <span className="text-xl font-bold text-gray-800">{score}</span>
                    </div>
                    {scoreBar(score)}
                    {reason && <div className="px-4 py-3"><p className="text-xs text-gray-500 font-semibold uppercase mb-1">Why this score</p><p className="text-sm text-gray-700 leading-relaxed">{reason}</p></div>}
                    {actions.length > 0 && <div className="px-4 pb-3 border-t bg-amber-50"><p className="text-xs text-amber-700 font-semibold uppercase mt-2 mb-1">What to change</p>{actions.map((a,i) => <p key={i} className="text-sm text-gray-700">{i+1}. {a}</p>)}</div>}
                  </div>
                )
              })}
              <div className="grid grid-cols-2 gap-3">
                {safe(aiScore.strengths).length>0 && <div className="bg-green-50 border border-green-200 rounded-xl p-3"><p className="text-xs font-semibold text-green-700 uppercase mb-1">Strengths</p>{safe(aiScore.strengths).map((s:string,i:number) => <p key={i} className="text-sm text-green-700">✓ {s}</p>)}</div>}
                {safe(aiScore.gaps).length>0 && <div className="bg-red-50 border border-red-200 rounded-xl p-3"><p className="text-xs font-semibold text-red-700 uppercase mb-1">Gaps</p>{safe(aiScore.gaps).map((g:string,i:number) => <p key={i} className="text-sm text-red-700">• {g}</p>)}</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="flex h-[calc(100vh-57px)]">
        {/* Left: Plan list */}
        <div className="w-64 shrink-0 border-r bg-white flex flex-col">
          <div className="p-3 border-b">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">My Plans ({plans.length})</p>
          </div>
          <div className="overflow-y-auto flex-1">
            {loading ? <p className="text-sm text-gray-400 p-4">Loading…</p> :
              plans.length === 0 ? <p className="text-sm text-gray-400 p-4">No plans yet.</p> :
              plans.map(p => (
                <button key={p.plan_id} onClick={()=>setSel(p)} className={`w-full text-left px-3 py-3 border-b hover:bg-gray-50 transition ${sel?.plan_id===p.plan_id?'bg-blue-50 border-l-4 border-l-blue-600':''}`}>
                  <p className="text-sm font-medium text-gray-800 truncate">{p.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{p.plan_type}</p>
                  <span className={statusBadge(p.status)}>{p.status}</span>
                </button>
              ))
            }
          </div>
        </div>

        {/* Right: Plan detail */}
        <div className="flex-1 overflow-y-auto">
          {!sel ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>Select a plan or create a new one</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">

              {/* Plan header */}
              <div className="bg-white rounded-2xl border p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-bold text-gray-900 truncate">{sel.title}</h1>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">{sel.plan_type}</span>
                      {sel.technology_area && <span className="text-xs text-gray-500">{sel.technology_area}</span>}
                      <span className="text-xs text-gray-400">{sel.start_date && new Date(sel.start_date).toLocaleDateString()} – {sel.end_date && new Date(sel.end_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center ml-3 shrink-0">
                    {/* Plan status selector */}
                    <select value={sel.status} onChange={e=>updatePlanStatus(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white">
                      {['Active','In Progress','On Hold','Completed'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={openEdit} className="text-xs px-2.5 py-1.5 border rounded-lg hover:bg-gray-50">Edit</button>
                    <button onClick={deletePlan} className="text-xs px-2.5 py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50">Delete</button>
                  </div>
                </div>

                {sel.objective && <div className="mt-3 bg-blue-50 rounded-xl px-4 py-3"><p className="text-xs font-semibold text-blue-600 mb-1">OBJECTIVE</p><p className="text-sm text-gray-700">{sel.objective}</p></div>}
                {sel.learning_objectives && <div className="mt-2 bg-green-50 rounded-xl px-4 py-3"><p className="text-xs font-semibold text-green-600 mb-1">LEARNING OBJECTIVES</p><p className="text-sm text-gray-700 whitespace-pre-line">{sel.learning_objectives}</p></div>}

                <div className="mt-3 flex gap-4 items-center flex-wrap">
                  {sel.skills_tags && <div className="flex gap-1 flex-wrap">{sel.skills_tags.split(',').map((t:string) => <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{t.trim()}</span>)}</div>}
                  {aiScore && (
                    <button onClick={()=>setModal('ai')} className="ml-auto text-xs flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100">
                      <span>🤖 AI Score:</span>
                      <span className="font-bold">{Number(aiScore.final_score).toFixed(1)}/100</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Milestones */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h2 className="font-semibold text-gray-800">Milestones</h2>
                  <button onClick={()=>{ setMf({ title:'', goal:'', start_date:'', end_date:'', skills_covered:'', evidence_expected:'' }); setModal('addMs') }} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ Add Milestone</button>
                </div>

                {milestones.length === 0 ? (
                  <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-400 text-sm">No milestones yet. Add your first milestone.</div>
                ) : milestones.map((ms,idx) => (
                  <div key={ms.milestone_id} className="bg-white rounded-2xl border mb-3 overflow-hidden">
                    {/* Milestone header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b">
                      <button onClick={()=>setExpandedMs(p=>{ const n=new Set(p); n.has(ms.milestone_id)?n.delete(ms.milestone_id):n.add(ms.milestone_id); return n })} className="text-gray-400 text-sm w-5 shrink-0">{expandedMs.has(ms.milestone_id)?'▾':'▸'}</button>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900">{idx+1}. {ms.title}</p>
                        {ms.goal && <p className="text-xs text-gray-400 truncate">{ms.goal}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Milestone status selector */}
                        <select value={ms.status||'Not Started'} onChange={e=>updateMsStatus(ms.milestone_id, e.target.value)} className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white">
                          {MS_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                        </select>
                        <button onClick={()=>{ setActiveMs(ms); setMf({ title:ms.title||'', goal:ms.goal||'', start_date:ms.start_date||'', end_date:ms.end_date||'', skills_covered:ms.skills_covered||'', evidence_expected:ms.evidence_expected||'' }); setModal('editMs') }} className="text-xs text-gray-500 hover:text-gray-700 px-1.5 py-1 hover:bg-gray-100 rounded">Edit</button>
                        <button onClick={()=>deleteMs(ms)} className="text-xs text-red-400 hover:text-red-600 px-1.5 py-1 hover:bg-red-50 rounded">Delete</button>
                      </div>
                    </div>

                    {/* Tasks */}
                    {expandedMs.has(ms.milestone_id) && (
                      <div className="p-3 space-y-2">
                        {(ms.learning_tasks||[]).map((task:any) => (
                          <div key={task.task_id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium text-gray-800">{task.title}</p>
                                <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">{task.task_type}</span>
                                {task.estimated_hours > 0 && <span className="text-xs text-gray-400">{task.estimated_hours}h</span>}
                                {task.due_date && <span className="text-xs text-gray-400">Due {new Date(task.due_date).toLocaleDateString()}</span>}
                              </div>
                              {task.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>}
                              {/* Evidence links */}
                              <div className="flex gap-2 mt-1 flex-wrap">
                                {task.github_link && <a href={task.github_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">GitHub</a>}
                                {task.pr_link && <a href={task.pr_link} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-500 hover:underline">PR</a>}
                                {task.demo_url && <a href={task.demo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-500 hover:underline">Demo</a>}
                                {task.certificate_url && <a href={task.certificate_url} target="_blank" rel="noopener noreferrer" className="text-xs text-yellow-600 hover:underline">Certificate</a>}
                              </div>
                            </div>
                            {/* Task actions */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Status dropdown */}
                              <select value={task.status||'Pending'} onChange={e=>updateTaskStatus(task.task_id, e.target.value)} className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white">
                                {TASK_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                              </select>
                              <button onClick={()=>openEvidence(task)} title="Add Evidence" className="p-1.5 text-blue-500 hover:bg-blue-50 rounded text-xs">📎</button>
                              <button onClick={()=>openTaskReview(task)} title="AI Review" className="p-1.5 text-purple-500 hover:bg-purple-50 rounded text-xs">🤖</button>
                              <button onClick={()=>{ setActiveTask(task); setActiveMs(ms); setTf({ title:task.title||'', task_type:task.task_type||'Learning', due_date:task.due_date||'', estimated_hours:task.estimated_hours||2, description:task.description||'', expected_output:task.expected_output||'' }); setModal('editTask') }} title="Edit" className="p-1.5 text-gray-400 hover:bg-gray-100 rounded text-xs">✏️</button>
                              <button onClick={()=>deleteTask(task)} title="Delete" className="p-1.5 text-red-400 hover:bg-red-50 rounded text-xs">🗑️</button>
                            </div>
                          </div>
                        ))}
                        <button onClick={()=>{ setActiveMs(ms); setTf({ title:'', task_type:'Learning', due_date:ms.end_date||'', estimated_hours:2, description:'', expected_output:'' }); setModal('addTask') }} className="w-full py-2 text-xs text-gray-500 border border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50">+ Add Task</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Comments from manager */}
              {comments.length > 0 && (
                <div className="bg-white rounded-2xl border p-5">
                  <h2 className="font-semibold text-gray-800 mb-3">Manager Comments</h2>
                  <div className="space-y-2">
                    {comments.map(c => (
                      <div key={c.comment_id} className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <p className="text-sm text-gray-700">{c.comment_text}</p>
                        <p className="text-xs text-gray-400 mt-1">{Array.isArray(c.employee_master)?c.employee_master[0]?.name:c.employee_master?.name} · {new Date(c.created_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
