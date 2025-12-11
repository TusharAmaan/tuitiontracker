'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

// --- CONFIGURATION ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'tuition-tracker-session',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
})

const getCurrentMonthYear = () => {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

// --- MAIN CONTAINER ---
export default function Home() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) setSession(session)
      setLoading(false)
    }
    checkSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400 font-bold animate-pulse">Loading...</div>
  return session ? <AppShell session={session} /> : <LoginScreen />
}

// --- LOGIN SCREEN ---
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

  if (sent) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow text-center max-w-md border w-full">
        <h2 className="text-2xl font-bold text-green-600 mb-2">Check Email!</h2>
        <p className="text-slate-600">Magic link sent to <b>{email}</b>.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg max-w-md w-full text-center border">
        <h1 className="text-3xl font-extrabold text-slate-800 mb-2">TuitionTracker</h1>
        <p className="text-slate-500 mb-6">Sign in to manage lessons.</p>
        <form onSubmit={handleLogin} className="space-y-4 mb-6">
          <input type="email" placeholder="Enter email" required className="w-full p-3 border rounded-lg text-base text-slate-800" value={email} onChange={e => setEmail(e.target.value)} />
          <button disabled={loading} className="w-full bg-blue-600 text-white font-bold p-3 rounded hover:bg-blue-700">{loading ? 'Sending...' : 'Sign in with Email'}</button>
        </form>
        <div className="border-t border-slate-200 pt-4">
          <button onClick={handleGoogle} className="w-full border bg-white text-slate-700 font-bold p-3 rounded hover:bg-slate-50">G Sign in with Google</button>
        </div>
      </div>
    </div>
  )
}

// --- PROFILE MODAL ---
function ProfileModal({ session, onClose, onUpdate }: any) {
  const [loading, setLoading] = useState(false)
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const getProfile = async () => {
      setLoading(true)
      const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', session.user.id).single()
      if (data) {
        setFullName(data.full_name || '')
        setAvatarUrl(data.avatar_url || '')
      }
      setLoading(false)
    }
    getProfile()
  }, [session])

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return
    setLoading(true)
    const file = event.target.files[0]
    const fileExt = file.name.split('.').pop()
    const fileName = `${session.user.id}-${Math.random()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)
    
    if (uploadError) {
      alert('Error uploading image: ' + uploadError.message)
    } else {
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      setAvatarUrl(data.publicUrl)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setLoading(true)
    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id,
      full_name: fullName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString()
    })
    
    if (error) {
        alert('Error saving profile: ' + error.message)
    } else {
        onUpdate()
        onClose()
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full animate-bounce-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-extrabold text-slate-800">Edit Profile</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 rounded-full bg-slate-100 mb-3 overflow-hidden border-2 border-slate-200 relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300 text-3xl font-bold">
                {fullName ? fullName[0].toUpperCase() : session.user.email[0].toUpperCase()}
              </div>
            )}
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="text-sm text-blue-600 font-bold hover:underline">
            {loading ? 'Uploading...' : 'Change Photo'}
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Email (Read Only)</label>
            <input type="text" disabled value={session.user.email} className="w-full p-3 border rounded-lg bg-slate-50 text-slate-500 text-sm" />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Full Name</label>
            <input type="text" placeholder="e.g. Mr. Anderson" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-3 border rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <button onClick={handleSave} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg mt-2">
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- APP SHELL ---
function AppShell({ session }: { session: any }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showProfile, setShowProfile] = useState(false)
  const [profileName, setProfileName] = useState('Profile')
  const [avatar, setAvatar] = useState('')

  const fetchProfileName = async () => {
    const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', session.user.id).single()
    if (data?.full_name) { setProfileName(data.full_name) }
    if (data?.avatar_url) { setAvatar(data.avatar_url) }
  }

  useEffect(() => { fetchProfileName() }, [session])

  return (
    <main className="min-h-screen bg-slate-100 pb-20 md:pb-0 relative">
      <nav className="bg-white border-b px-4 py-3 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-lg md:text-xl font-extrabold text-slate-800">TuitionTracker</h1>
          
          <div className="flex gap-4 items-center">
            <button onClick={() => setShowProfile(true)} className="text-xs md:text-sm font-bold text-slate-600 hover:text-blue-600 flex items-center gap-2">
              {avatar ? ( <img src={avatar} alt="User" className="w-6 h-6 rounded-full object-cover border border-slate-200" /> ) : ( <span>👤</span> )}
              <span className="hidden md:inline max-w-[100px] truncate">{profileName}</span>
            </button>
            <button onClick={() => supabase.auth.signOut()} className="text-xs md:text-sm text-red-500 font-bold hover:text-red-700 border border-red-100 bg-red-50 px-3 py-1.5 rounded-full transition">Sign Out</button>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto flex gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
           {['dashboard', 'students', 'reports'].map(tab => (
             <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 md:flex-none text-center px-4 py-2 rounded-lg text-sm font-bold capitalize whitespace-nowrap transition-colors ${activeTab === tab ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-500'}`}>{tab}</button>
           ))}
        </div>
      </nav>

      {showProfile && <ProfileModal session={session} onClose={() => setShowProfile(false)} onUpdate={fetchProfileName} />}

      <div className="max-w-6xl mx-auto p-4 md:p-8">
        {activeTab === 'dashboard' && <Dashboard session={session} />}
        {activeTab === 'students' && <StudentsManager session={session} />}
        {activeTab === 'reports' && <ReportsView session={session} />}
      </div>
    </main>
  )
}

// --- PAYMENT MODAL ---
function PaymentModal({ studentName, target, currentSerial, onConfirm, onCancel }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full animate-bounce-in">
        <h2 className="text-xl font-extrabold text-slate-800 mb-2">Payment Alert! 💰</h2>
        <p className="text-slate-600 mb-4"><b>{studentName}</b> has reached class <b>#{currentSerial}</b>.<br/>Target: <b>{target} classes</b>.</p>
        <p className="font-bold text-slate-700 mb-6">Have they paid for this month?</p>
        <div className="flex flex-col gap-3">
          <button onClick={() => onConfirm('paid')} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg">✅ Yes, Mark as Paid</button>
          <button onClick={() => onConfirm('due')} className="w-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 font-bold py-3 rounded-lg">❌ No, Mark as Due</button>
        </div>
        <button onClick={onCancel} className="mt-4 text-center w-full text-sm text-slate-400 hover:underline">Cancel Entry</button>
      </div>
    </div>
  )
}

// --- DASHBOARD (UPDATED LOGIC) ---
function Dashboard({ session }: { session: any }) {
  const [lessons, setLessons] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], studentId: '', topic: '', serial: '' })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [tempLessonData, setTempLessonData] = useState<any>(null)
  const [modalStudentInfo, setModalStudentInfo] = useState<any>(null)

  // UPDATED: Fetch students AND their current month's payment status
  const fetchData = async () => {
    const { month, year } = getCurrentMonthYear()
    
    // 1. Fetch Lessons
    const { data: lData } = await supabase.from('lessons').select('*').eq('user_id', session.user.id).order('lesson_date', { ascending: false }).order('id', { ascending: false }).limit(20)
    if (lData) setLessons(lData)

    // 2. Fetch Students
    const { data: sData, error: sError } = await supabase.from('students').select('*').eq('user_id', session.user.id)
    if (sError || !sData) return

    // 3. Fetch Payments for this month
    const { data: pData, error: pError } = await supabase.from('payments').select('student_id, status').eq('user_id', session.user.id).eq('payment_month', month).eq('payment_year', year)
    if (pError) return

    // 4. Merge payment status into student data
    const combinedStudents = sData.map(student => {
        const paymentRecord = pData.find(p => p.student_id === student.id)
        return { ...student, payment_status: paymentRecord ? paymentRecord.status : null }
    })
    setStudents(combinedStudents)
  }
  useEffect(() => { fetchData() }, [])

  const handleEdit = (lesson: any) => {
    setEditingId(lesson.id)
    const student = students.find(s => s.name === lesson.student_name)
    setFormData({ date: lesson.lesson_date, studentId: student ? student.id.toString() : '', topic: lesson.lesson_topic, serial: lesson.class_serial || '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancel = () => {
    setEditingId(null)
    setFormData({ date: new Date().toISOString().split('T')[0], studentId: '', topic: '', serial: '' })
  }

  const handleDelete = async (id: number) => {
    if(confirm('Delete this lesson permanently?')) { await supabase.from('lessons').delete().eq('id', id); fetchData(); }
  }

  const saveLessonOnly = async (payload: any) => {
    let error
    if (editingId) {
       const { error: err } = await supabase.from('lessons').update(payload).eq('id', editingId)
       error = err
    } else {
       const { error: err } = await supabase.from('lessons').insert([payload])
       error = err
    }
    finalizeSubmission(error)
  }

  const finalizeSubmission = (error: any) => {
    if (!error) { handleCancel(); fetchData(); } 
    else { alert('Error saving lesson: ' + error.message) }
    setLoading(false)
    setTempLessonData(null)
    setModalStudentInfo(null)
  }

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const selectedStudent = students.find(s => s.id.toString() === formData.studentId)
    if (!selectedStudent) { alert('Select student'); setLoading(false); return }
    if (!formData.serial) { alert('Enter class serial number'); setLoading(false); return }

    const currentSerial = parseInt(formData.serial)
    const target = selectedStudent.target_classes

    const lessonPayload = {
      user_id: session.user.id,
      student_name: selectedStudent.name,
      class_no: 'N/A',
      batch: selectedStudent.batch,
      subject: selectedStudent.subject,
      lesson_topic: formData.topic,
      lesson_date: formData.date,
      class_serial: currentSerial
    }

    // UPDATED LOGIC: Trigger if (New Entry) AND (Target Reached OR Exceeded) AND (Not yet Paid this month)
    if (!editingId && target > 0 && currentSerial >= target && selectedStudent.payment_status !== 'paid') {
        setTempLessonData(lessonPayload)
        setModalStudentInfo({ name: selectedStudent.name, target: target, serial: currentSerial, studentId: selectedStudent.id })
        setShowPaymentModal(true)
        setLoading(false)
        return
    }
    await saveLessonOnly(lessonPayload)
  }

  const handlePaymentSelection = async (status: 'paid' | 'due') => {
      setShowPaymentModal(false)
      setLoading(true)
      const { month, year } = getCurrentMonthYear()
      const { error: paymentError } = await supabase.from('payments').upsert({
          user_id: session.user.id,
          student_id: modalStudentInfo.studentId,
          payment_month: month,
          payment_year: year,
          status: status
      }, { onConflict: 'student_id, payment_month, payment_year' })

      if(paymentError) { alert('Error saving payment status: ' + paymentError.message); setLoading(false); return; }
      const { error: lessonError } = await supabase.from('lessons').insert([tempLessonData])
      finalizeSubmission(lessonError)
  }

  return (
    <>
    {showPaymentModal && modalStudentInfo && (
      <PaymentModal 
        studentName={modalStudentInfo.name} 
        target={modalStudentInfo.target}
        currentSerial={modalStudentInfo.serial}
        onConfirm={handlePaymentSelection}
        onCancel={() => { setShowPaymentModal(false); setLoading(false); }}
      />
    )}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 h-fit md:sticky md:top-24 z-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">{editingId ? 'Edit Lesson' : 'New Lesson'}</h2>
          {editingId && <button onClick={handleCancel} className="text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded">Cancel</button>}
        </div>
        {students.length === 0 ? <div className="text-center p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm">⚠ Add Students first!</div> : (
          <form onSubmit={handleInitialSubmit} className="flex flex-col gap-3">
            <input type="date" required className="p-3 border rounded-lg text-base text-slate-800 bg-white" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            <select required className="p-3 border rounded-lg text-base text-slate-800 bg-white" value={formData.studentId} onChange={e => setFormData({...formData, studentId: e.target.value})}><option value="">Select Student...</option>{students.map(s => <option key={s.id} value={s.id}>{s.name} (Target: {s.target_classes})</option>)}</select>
            <input type="number" required placeholder="Class Serial No. (e.g. 12)" className="p-3 border rounded-lg text-base text-slate-800 bg-white" value={formData.serial} onChange={e => setFormData({...formData, serial: e.target.value})} />
            <textarea required rows={3} placeholder="What was taught?" className="p-3 border rounded-lg text-base text-slate-800 bg-white" value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
            <button disabled={loading} className={`w-full text-white font-bold py-3 rounded-lg transition shadow-sm ${editingId ? 'bg-orange-500 active:bg-orange-600' : 'bg-blue-600 active:bg-blue-700'}`}>{loading ? 'Saving...' : (editingId ? 'Update Lesson' : 'Add Lesson')}</button>
          </form>
        )}
      </div>
      <div className="md:col-span-2 space-y-4">
        <h2 className="font-bold text-slate-700 px-2">Recent Lessons</h2>
        {lessons.length === 0 ? <p className="p-8 text-center text-slate-400 bg-white rounded-xl border">No lessons yet.</p> : lessons.map((l) => (
          <div key={l.id} className={`bg-white p-4 rounded-xl shadow-sm border border-slate-200 ${editingId === l.id ? 'ring-2 ring-orange-400' : ''}`}>
            <div className="flex justify-between items-start mb-3">
              <div><div className="flex flex-wrap items-center gap-2 mb-1"><span className="font-bold text-lg text-slate-800">{l.student_name}</span><span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md border font-medium">{l.subject}</span>{l.class_serial && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-md border border-blue-100 font-bold">Class #{l.class_serial}</span>}</div><div className="text-xs text-slate-400">{l.batch}</div></div><span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">{l.lesson_date}</span>
            </div>
            <p className="text-slate-700 text-sm mb-4 whitespace-pre-wrap leading-relaxed">{l.lesson_topic}</p>
            <div className="flex gap-3 border-t pt-3 mt-2"><button onClick={() => handleEdit(l)} className="flex-1 py-2 text-xs font-bold text-orange-600 bg-orange-50 rounded hover:bg-orange-100">Edit</button><button onClick={() => handleDelete(l.id)} className="flex-1 py-2 text-xs font-bold text-red-600 bg-red-50 rounded hover:bg-red-100">Delete</button></div>
          </div>
        ))}
      </div>
    </div>
    </>
  )
}

// --- NEW COMPONENT: Subject Selector ---
function SubjectSelector({ session, selectedSubjects, onChange }: any) {
  const [subjects, setSubjects] = useState<any[]>([])
  const [newSubject, setNewSubject] = useState('')
  const [showInput, setShowInput] = useState(false)

  // Load existing subjects
  useEffect(() => {
    const fetchSubs = async () => {
      const { data } = await supabase.from('subjects').select('*').eq('user_id', session.user.id)
      if (data) setSubjects(data)
    }
    fetchSubs()
  }, [session])

  // Create new subject
  const handleCreate = async () => {
    if (!newSubject.trim()) return
    const { data, error } = await supabase.from('subjects').insert([{ user_id: session.user.id, name: newSubject.trim() }]).select()
    if (data) {
      setSubjects([...subjects, data[0]])
      setNewSubject('')
      setShowInput(false)
      // Auto-select the new one
      onChange([...selectedSubjects, data[0].name]) 
    }
  }

  // Toggle selection
  const toggleSubject = (name: string) => {
    if (selectedSubjects.includes(name)) {
      onChange(selectedSubjects.filter((s: string) => s !== name))
    } else {
      onChange([...selectedSubjects, name])
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-slate-500 uppercase">Subjects</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {subjects.map(sub => (
          <button
            key={sub.id}
            type="button"
            onClick={() => toggleSubject(sub.name)}
            className={`px-3 py-1 text-sm rounded-full border ${selectedSubjects.includes(sub.name) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
          >
            {sub.name}
          </button>
        ))}
        <button type="button" onClick={() => setShowInput(!showInput)} className="px-3 py-1 text-sm rounded-full border border-dashed border-slate-400 text-slate-500 hover:bg-slate-50">+ Add New</button>
      </div>
      
      {showInput && (
        <div className="flex gap-2">
          <input 
            type="text" 
            autoFocus
            placeholder="New Subject Name" 
            className="flex-1 p-2 border rounded text-sm text-slate-800"
            value={newSubject}
            onChange={e => setNewSubject(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleCreate())}
          />
          <button type="button" onClick={handleCreate} className="px-4 bg-green-600 text-white rounded text-sm font-bold">Save</button>
        </div>
      )}
    </div>
  )
}

// --- STUDENTS MANAGER (UPDATED FOR MULTI-SUBJECT) ---
function StudentsManager({ session }: { session: any }) {
  const [students, setStudents] = useState<any[]>([])
  // 'subject' is now an array of strings
  const [form, setForm] = useState({ name: '', batch: '', subjects: [] as string[], target: '' })
  const [editingId, setEditingId] = useState<number | null>(null)

  const fetchStudents = async () => {
    const { month, year } = getCurrentMonthYear()
    const { data: sData, error: sError } = await supabase.from('students').select('*').eq('user_id', session.user.id).order('id', { ascending: false })
    if (sError || !sData) return

    // Fetch payments
    const { data: pData } = await supabase.from('payments').select('student_id, status').eq('user_id', session.user.id).eq('payment_month', month).eq('payment_year', year)
    
    const combinedData = sData.map(student => {
        const paymentRecord = pData?.find(p => p.student_id === student.id)
        // Convert old string subject to array if needed (migration logic)
        let subList = []
        try {
           subList = JSON.parse(student.subject) 
        } catch {
           subList = student.subject ? [student.subject] : [] // Handle legacy single string
        }
        
        return { ...student, subjects: Array.isArray(subList) ? subList : [subList], payment_status: paymentRecord ? paymentRecord.status : null }
    })
    setStudents(combinedData)
  }

  useEffect(() => { fetchStudents() }, [])

  const handleEdit = (s: any) => { 
    setEditingId(s.id); 
    setForm({ name: s.name, batch: s.batch, subjects: s.subjects || [], target: s.target_classes }); 
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  }
  
  const handleCancel = () => { setEditingId(null); setForm({ name: '', batch: '', subjects: [], target: '' }); }
  
  const handleSave = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    // Save subjects as JSON string in the 'subject' column (simple way to handle arrays in existing schema)
    const payload = { 
      user_id: session.user.id, 
      name: form.name, 
      batch: form.batch, 
      subject: JSON.stringify(form.subjects), // Storing array as string
      target_classes: parseInt(form.target) || 0 
    }; 
    
    let error; 
    if (editingId) { 
        const { error: err } = await supabase.from('students').update(payload).eq('id', editingId); 
        error = err 
    } else { 
        const { error: err } = await supabase.from('students').insert([payload]); 
        error = err 
    }; 
    if(!error) { handleCancel(); fetchStudents(); } else { alert(error.message) } 
  }

  const handleDelete = async (id: number) => { 
    if(!confirm('Delete this student?')) return;
    await supabase.from('payments').delete().eq('student_id', id);
    await supabase.from('students').delete().eq('id', id); 
    fetchStudents(); 
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 h-fit md:sticky md:top-24 z-10">
        <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold text-slate-800">{editingId ? 'Edit Student' : 'Add Student'}</h2>{editingId && <button onClick={handleCancel} className="text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded font-bold">Cancel</button>}</div>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <input type="text" placeholder="Name" required className="p-3 border rounded-lg text-base text-slate-800" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <input type="text" placeholder="Batch" className="p-3 border rounded-lg text-base text-slate-800" value={form.batch} onChange={e => setForm({...form, batch: e.target.value})} />
          
          {/* NEW SUBJECT SELECTOR */}
          <SubjectSelector 
            session={session} 
            selectedSubjects={form.subjects} 
            onChange={(newSubs: string[]) => setForm({...form, subjects: newSubs})} 
          />

          <input type="number" placeholder="Class Target" className="p-3 border rounded-lg text-base text-slate-800" value={form.target} onChange={e => setForm({...form, target: e.target.value})} />
          <button className={`w-full text-white font-bold py-3 rounded-lg transition shadow-sm ${editingId ? 'bg-orange-500' : 'bg-green-600'}`}>{editingId ? 'Update Student' : 'Add Student'}</button>
        </form>
      </div>
      
      <div className="md:col-span-2 space-y-4">
        <h2 className="font-bold text-slate-700 px-2">Your Students</h2>
        {students.map(s => (
          <div key={s.id} className={`bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3 ${editingId === s.id ? 'ring-2 ring-orange-400' : ''}`}>
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-800 text-lg">{s.name}</h3>
                        {s.payment_status === 'paid' && <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">Paid</span>}
                        {s.payment_status === 'due' && <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200 animate-pulse">Due</span>}
                    </div>
                    <div className="text-sm text-slate-500 mt-1 flex flex-wrap gap-1 items-center">
                        <span className="font-medium text-slate-700">{s.batch}</span>
                        <span className="text-slate-300">•</span>
                        {/* Display Subjects Tags */}
                        {s.subjects && s.subjects.map((sub: string) => (
                            <span key={sub} className="bg-slate-100 px-2 py-0.5 rounded text-xs border">{sub}</span>
                        ))}
                    </div>
                </div>
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold">Target: {s.target_classes}</span>
            </div>
            <div className="flex gap-3 border-t pt-3"><button onClick={() => handleEdit(s)} className="flex-1 py-2 text-xs font-bold text-orange-600 bg-orange-50 rounded hover:bg-orange-100">Edit</button><button onClick={() => handleDelete(s.id)} className="flex-1 py-2 text-xs font-bold text-red-600 bg-red-50 rounded hover:bg-red-100">Delete</button></div>
          </div>
        ))}
        {students.length === 0 && <p className="p-8 text-center text-slate-400 bg-white rounded-xl border">No students yet.</p>}
      </div>
    </div>
  )
}

// --- REPORTS (UPDATED FOR MULTI-SUBJECT) ---
function ReportsView({ session }: { session: any }) {
  const [filterType, setFilterType] = useState('student'); const [filterValue, setFilterValue] = useState(''); const [lessons, setLessons] = useState<any[]>([]); const [options, setOptions] = useState<string[]>([]);
  
  useEffect(() => { 
    const load = async () => { 
      // 1. Get Students
      const { data: sData } = await supabase.from('students').select('*').eq('user_id', session.user.id);
      // 2. Get Subjects List
      const { data: subData } = await supabase.from('subjects').select('*').eq('user_id', session.user.id);
      
      if (sData) { 
        let unique: string[] = []
        if (filterType === 'student') unique = Array.from(new Set(sData.map((s: any) => s.name)))
        else if (filterType === 'batch') unique = Array.from(new Set(sData.map((s: any) => s.batch)))
        else if (filterType === 'subject') unique = subData ? subData.map((s: any) => s.name) : []
        
        setOptions(unique.filter(Boolean))
        setFilterValue('')
        setLessons([])
      } 
    }; load(); 
  }, [filterType])

  useEffect(() => { 
    const loadL = async () => { 
        if (!filterValue) return; 
        let q = supabase.from('lessons').select('*').eq('user_id', session.user.id); 
        if (filterType === 'student') q = q.eq('student_name', filterValue); 
        else if (filterType === 'batch') q = q.eq('batch', filterValue); 
        else if (filterType === 'subject') q = q.eq('subject', filterValue); 
        const { data } = await q.order('lesson_date', { ascending: false }); 
        if (data) setLessons(data); 
    }; loadL(); 
  }, [filterValue])

  return (
    <div className="space-y-6"><div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200"><label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Filter By</label><div className="flex bg-slate-100 rounded-lg p-1 mb-4 overflow-x-auto">{['student', 'batch', 'subject'].map(t => <button key={t} onClick={() => setFilterType(t)} className={`flex-1 px-3 py-2 rounded-md text-sm font-bold capitalize whitespace-nowrap ${filterType === t ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>{t}</button>)}</div><label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Select {filterType}</label><select className="w-full p-3 border rounded-lg text-base text-slate-800 bg-white" value={filterValue} onChange={e => setFilterValue(e.target.value)}><option value="">-- Select --</option>{options.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
      {filterValue && (<div className="space-y-4"><div className="flex justify-between items-center px-2"><h2 className="font-bold text-slate-700">Results: "{filterValue}"</h2><span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">{lessons.length}</span></div>{lessons.length === 0 ? <p className="p-8 text-center text-slate-400 bg-white rounded-xl border">No records.</p> : lessons.map(l => (<div key={l.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200"><div className="flex justify-between mb-2"><span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">{l.lesson_date}</span>{l.class_serial && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-md border border-blue-200 font-bold">Class #{l.class_serial}</span>}</div><div className="font-bold text-slate-800 mb-2">{l.lesson_topic}</div><div className="text-xs text-slate-500 flex gap-2">{filterType !== 'student' && <span className="bg-slate-100 px-2 py-1 rounded">👤 {l.student_name}</span>}{filterType !== 'batch' && <span className="bg-slate-100 px-2 py-1 rounded">🎓 {l.batch}</span>}{filterType !== 'subject' && <span className="bg-slate-100 px-2 py-1 rounded">📚 {l.subject}</span>}</div></div>))}</div>)}</div>
  )
}