'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// --- 1. CONFIGURATION WITH PERSISTENCE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// We explicitly tell Supabase to use LocalStorage and Keep the session
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'tuition-tracker-session',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
})

// --- 2. MAIN APP CONTAINER ---
export default function Home() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session immediately on load
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) setSession(session)
      } catch (error) {
        console.error('Session check error', error)
      } finally {
        setLoading(false)
      }
    }
    checkSession()

    // Listen for background changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center animate-pulse">
          <div className="text-xl font-bold text-slate-400">Restoring Session...</div>
        </div>
      </div>
    )
  }

  return session ? <AppShell session={session} /> : <LoginScreen />
}

// --- 3. LOGIN SCREEN ---
function LoginScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ 
      email,
      options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined }
    })
    
    if (error) alert(error.message)
    else setSent(true)
    setLoading(false)
  }

  const handleGoogle = async () => supabase.auth.signInWithOAuth({ 
    provider: 'google',
    options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined }
  })

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border border-slate-200">
          <h2 className="text-2xl font-bold text-green-600 mb-2">Check your Email!</h2>
          <p className="text-slate-600">We sent a magic link to <b>{email}</b>.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border border-slate-200">
        <h1 className="text-3xl font-extrabold text-slate-800 mb-2">TuitionTracker</h1>
        <p className="text-slate-500 mb-8">Sign in once, stay logged in.</p>
        
        <form onSubmit={handleLogin} className="space-y-4 mb-6">
          <input type="email" placeholder="Enter your email" required 
            className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            value={email} onChange={e => setEmail(e.target.value)} />
          <button disabled={loading} className="w-full bg-blue-600 text-white font-bold p-3 rounded-lg hover:bg-blue-700 transition-all">
            {loading ? 'Sending Link...' : 'Sign in with Email'}
          </button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
          <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-500">Or</span></div>
        </div>
        
        <button onClick={handleGoogle} className="w-full border bg-white text-slate-700 font-bold p-3 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2 transition-all">
          <span className="text-lg">G</span> Sign in with Google
        </button>
      </div>
    </div>
  )
}

// --- 4. APP SHELL (NAVIGATION TABS) ---
function AppShell({ session }: { session: any }) {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <main className="min-h-screen bg-slate-100">
      <nav className="bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-extrabold text-slate-800">TuitionTracker</h1>
        <div className="flex gap-2">
           {['dashboard', 'students', 'reports'].map(tab => (
             <button key={tab} onClick={() => setActiveTab(tab)} 
               className={`px-4 py-2 rounded-full text-sm font-bold capitalize transition-colors ${activeTab === tab ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}>
               {tab}
             </button>
           ))}
           <button onClick={() => supabase.auth.signOut()} className="ml-2 text-sm text-red-500 font-bold hover:text-red-700">Exit</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-4 md:p-8">
        {activeTab === 'dashboard' && <Dashboard session={session} />}
        {activeTab === 'students' && <StudentsManager session={session} />}
        {activeTab === 'reports' && <ReportsView session={session} />}
      </div>
    </main>
  )
}

// --- 5. DASHBOARD TAB ---
function Dashboard({ session }: { session: any }) {
  const [lessons, setLessons] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], studentId: '', topic: '' })
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    const { data: lData } = await supabase.from('lessons').select('*').eq('user_id', session.user.id).order('id', { ascending: false }).limit(20)
    const { data: sData } = await supabase.from('students').select('*').eq('user_id', session.user.id)
    if (lData) setLessons(lData)
    if (sData) setStudents(sData)
  }
  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const selectedStudent = students.find(s => s.id.toString() === formData.studentId)
    if (!selectedStudent) { alert('Please select a student'); setLoading(false); return; }

    const { error } = await supabase.from('lessons').insert([{
      user_id: session.user.id,
      student_name: selectedStudent.name,
      class_no: 'N/A', // Simplified for now
      batch: selectedStudent.batch,
      subject: selectedStudent.subject,
      lesson_topic: formData.topic,
      lesson_date: formData.date
    }])
    if (!error) { setFormData({ ...formData, topic: '' }); fetchData(); }
    else { alert('Error: ' + error.message) }
    setLoading(false)
  }

  const handleDelete = async (id: number) => {
    if(confirm('Delete this lesson?')) { await supabase.from('lessons').delete().eq('id', id); fetchData(); }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
        <h2 className="text-lg font-bold mb-4 text-slate-800">New Lesson Entry</h2>
        {students.length === 0 ? (
           <div className="text-center p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
             ⚠ You need to add Students first! Go to the <b>Students</b> tab.
           </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input type="date" required className="p-2 border rounded-md text-slate-800 outline-none focus:border-blue-500" 
              value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            
            <select required className="p-2 border rounded-md text-slate-800 outline-none focus:border-blue-500 bg-white"
              value={formData.studentId} onChange={e => setFormData({...formData, studentId: e.target.value})}>
              <option value="">Select Student...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.subject})</option>)}
            </select>

            <textarea required rows={3} placeholder="What was taught?" className="p-2 border rounded-md text-slate-800 outline-none focus:border-blue-500"
              value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
            
            <button disabled={loading} className="bg-blue-600 text-white font-bold py-2 rounded-md hover:bg-blue-700 transition">
              {loading ? 'Saving...' : 'Add Lesson'}
            </button>
          </form>
        )}
      </div>

      <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b bg-slate-50"><h2 className="font-bold text-slate-700">Recent Activity</h2></div>
        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
          {lessons.length === 0 ? <p className="p-8 text-center text-slate-400">No lessons recorded yet.</p> : lessons.map((l) => (
            <div key={l.id} className="p-4 hover:bg-slate-50 flex justify-between items-start group">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">{l.student_name}</span>
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded border">{l.subject}</span>
                  <span className="text-xs text-slate-400">{l.batch}</span>
                </div>
                <p className="text-slate-600 text-sm mt-1">{l.lesson_topic}</p>
              </div>
              <div className="text-right">
                <span className="block text-xs font-bold text-slate-400">{l.lesson_date}</span>
                <button onClick={() => handleDelete(l.id)} className="text-xs text-red-400 hover:text-red-600 mt-1 opacity-0 group-hover:opacity-100">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- 6. STUDENTS TAB ---
function StudentsManager({ session }: { session: any }) {
  const [students, setStudents] = useState<any[]>([])
  const [form, setForm] = useState({ name: '', batch: '', subject: '', target: '' })
  
  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('*').eq('user_id', session.user.id)
    if(data) setStudents(data)
  }
  useEffect(() => { fetchStudents() }, [])

  const addStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('students').insert([{
      user_id: session.user.id,
      name: form.name,
      batch: form.batch,
      subject: form.subject,
      target_classes: parseInt(form.target) || 0
    }])
    if(!error) { setForm({ name: '', batch: '', subject: '', target: '' }); fetchStudents(); }
  }

  const deleteStudent = async (id: number) => {
    if(confirm('Delete this student?')) { await supabase.from('students').delete().eq('id', id); fetchStudents(); }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
        <h2 className="text-lg font-bold mb-4 text-slate-800">Add New Student</h2>
        <form onSubmit={addStudent} className="flex flex-col gap-3">
          <input type="text" placeholder="Name (e.g. John)" required className="p-2 border rounded text-slate-800" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <input type="text" placeholder="Batch (e.g. HSC 2025)" className="p-2 border rounded text-slate-800" value={form.batch} onChange={e => setForm({...form, batch: e.target.value})} />
          <input type="text" placeholder="Subject (e.g. Physics)" required className="p-2 border rounded text-slate-800" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} />
          <input type="number" placeholder="Total Classes (e.g. 12)" className="p-2 border rounded text-slate-800" value={form.target} onChange={e => setForm({...form, target: e.target.value})} />
          <button className="bg-green-600 text-white font-bold py-2 rounded hover:bg-green-700">Add Student</button>
        </form>
      </div>

      <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b bg-slate-50"><h2 className="font-bold text-slate-700">Your Students ({students.length})</h2></div>
        <div className="divide-y divide-slate-100">
          {students.map(s => (
            <div key={s.id} className="p-4 flex justify-between items-center hover:bg-slate-50 group">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">{s.name}</h3>
                <p className="text-sm text-slate-500">{s.subject} • {s.batch}</p>
              </div>
              <div className="text-right">
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold">Target: {s.target_classes} Classes</span>
                <button onClick={() => deleteStudent(s.id)} className="block ml-auto mt-2 text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100">Remove</button>
              </div>
            </div>
          ))}
          {students.length === 0 && <p className="p-8 text-center text-slate-400">No students added yet.</p>}
        </div>
      </div>
    </div>
  )
}

// --- 7. REPORTS TAB ---
function ReportsView({ session }: { session: any }) {
  const [filterType, setFilterType] = useState('student') // student, batch, subject
  const [filterValue, setFilterValue] = useState('')
  const [lessons, setLessons] = useState<any[]>([])
  const [options, setOptions] = useState<string[]>([])

  // Load distinct options for the dropdown based on filterType
  useEffect(() => {
    const loadOptions = async () => {
      // We fetch from 'students' table to get the list of names/batches/subjects
      const { data } = await supabase.from('students').select('*').eq('user_id', session.user.id)
      if (data) {
        const unique = Array.from(new Set(data.map((item: any) => 
          filterType === 'student' ? item.name : 
          filterType === 'batch' ? item.batch : item.subject
        ))).filter(Boolean) as string[]
        setOptions(unique)
        setFilterValue('')
        setLessons([])
      }
    }
    loadOptions()
  }, [filterType])

  // Fetch filtered lessons when user selects a value
  useEffect(() => {
    const fetchFiltered = async () => {
      if (!filterValue) return
      
      let query = supabase.from('lessons').select('*').eq('user_id', session.user.id)
      
      if (filterType === 'student') query = query.eq('student_name', filterValue)
      else if (filterType === 'batch') query = query.eq('batch', filterValue)
      else if (filterType === 'subject') query = query.eq('subject', filterValue)
      
      const { data } = await query.order('lesson_date', { ascending: false })
      if (data) setLessons(data)
    }
    fetchFiltered()
  }, [filterValue])

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Filter By</label>
          <div className="flex bg-slate-100 rounded-lg p-1">
            {['student', 'batch', 'subject'].map(t => (
              <button key={t} onClick={() => setFilterType(t)} 
                className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize ${filterType === t ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Select {filterType}</label>
          <select className="w-full p-2.5 border rounded-lg text-slate-800 bg-white" value={filterValue} onChange={e => setFilterValue(e.target.value)}>
            <option value="">-- Select --</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      {/* Results */}
      {filterValue && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
            <h2 className="font-bold text-slate-700">Results for "{filterValue}"</h2>
            <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">{lessons.length} Classes Found</span>
          </div>
          
          <div className="divide-y divide-slate-100">
            {lessons.length === 0 ? <p className="p-8 text-center text-slate-400">No records found.</p> : lessons.map(l => (
              <div key={l.id} className="p-4 hover:bg-slate-50">
                <div className="flex justify-between">
                   <div className="font-bold text-slate-800">{l.lesson_topic}</div>
                   <div className="text-sm text-slate-500">{l.lesson_date}</div>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {filterType !== 'student' && <span className="mr-2">👤 {l.student_name}</span>}
                  {filterType !== 'batch' && <span className="mr-2">🎓 {l.batch}</span>}
                  {filterType !== 'subject' && <span>📚 {l.subject}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}