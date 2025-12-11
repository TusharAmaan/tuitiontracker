'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// --- Initialize Supabase ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export default function Home() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Check if user is logged in on load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div className="p-10 text-center">Loading TuitionTracker...</div>

  // If logged in, show Dashboard. If not, show Login.
  return session ? <Dashboard session={session} /> : <LoginScreen />
}

// --- Component 1: Login Screen ---
function LoginScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Sends a "Magic Link" to email (Passwordless login - very secure)
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) alert(error.message)
    else alert('Check your email for the login link!')
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-slate-800 mb-6">TuitionTracker</h1>
        <p className="text-gray-500 mb-6">Sign in to manage your lessons securely.</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full p-3 border border-gray-300 rounded-lg text-black focus:ring-2 focus:ring-blue-500 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button disabled={loading} className="w-full bg-blue-600 text-white font-bold p-3 rounded-lg hover:bg-blue-700 transition">
            {loading ? 'Sending Link...' : 'Sign in with Email'}
          </button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-3 text-gray-500 text-sm">OR</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        <button onClick={handleGoogleLogin} className="w-full border border-gray-300 bg-white text-gray-700 font-bold p-3 rounded-lg hover:bg-gray-50 transition flex justify-center items-center gap-2">
           Sign in with Google
        </button>
      </div>
    </div>
  )
}

// --- Component 2: Dashboard (Your App) ---
function Dashboard({ session }: { session: any }) {
  const [lessons, setLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    student: '',
    classNo: '',
    batch: '',
    topic: ''
  })

  // Fetch Data (Only for this user)
  useEffect(() => { fetchLessons() }, [])

  const fetchLessons = async () => {
    const { data } = await supabase
      .from('lessons')
      .select('*')
      .eq('user_id', session.user.id) // Secure filter
      .order('id', { ascending: false })
    if (data) setLessons(data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Add user_id to the data
    const { error } = await supabase.from('lessons').insert([{ 
        user_id: session.user.id, // CRITICAL FIX
        student_name: formData.student,
        class_no: formData.classNo,
        batch: formData.batch,
        lesson_topic: formData.topic,
        lesson_date: formData.date
    }])

    if (error) {
      console.error(error)
      alert('Error saving data: ' + error.message)
    } else {
      setFormData({ ...formData, student: '', topic: '' })
      fetchLessons()
    }
    setLoading(false)
  }

  const handleDelete = async (id: number) => {
    if(confirm('Delete this track?')) {
      await supabase.from('lessons').delete().eq('id', id).eq('user_id', session.user.id)
      fetchLessons()
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">TuitionTracker</h1>
          <button onClick={() => supabase.auth.signOut()} className="text-sm text-red-600 hover:underline font-medium">
            Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Input Form */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
            <h2 className="text-lg font-bold mb-4 text-slate-800">Add Entry</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Date</label>
                <input type="date" required 
                  className="w-full mt-1 p-2 border border-slate-300 rounded-md text-black bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Student Name</label>
                <input type="text" required placeholder="Student Name"
                  className="w-full mt-1 p-2 border border-slate-300 rounded-md text-black bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.student} onChange={e => setFormData({...formData, student: e.target.value})} />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Class</label>
                  <input type="text" placeholder="10"
                    className="w-full mt-1 p-2 border border-slate-300 rounded-md text-black bg-white outline-none"
                    value={formData.classNo} onChange={e => setFormData({...formData, classNo: e.target.value})} />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Batch</label>
                  <input type="text" placeholder="A"
                    className="w-full mt-1 p-2 border border-slate-300 rounded-md text-black bg-white outline-none"
                    value={formData.batch} onChange={e => setFormData({...formData, batch: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Lesson Taught</label>
                <textarea required rows={3} placeholder="Details..."
                  className="w-full mt-1 p-2 border border-slate-300 rounded-md text-black bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
              </div>
              <button disabled={loading} className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-md transition-colors">
                {loading ? 'Saving...' : 'Add Track'}
              </button>
            </form>
          </div>

          {/* History List */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                <h2 className="font-bold text-slate-700">My Lessons</h2>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">{lessons.length}</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {lessons.length === 0 ? (
                    <p className="p-8 text-center text-slate-400">No lessons yet.</p>
                ) : (
                    lessons.map((lesson) => (
                    <div key={lesson.id} className="p-4 hover:bg-slate-50 transition group">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <span className="font-bold text-slate-800 text-lg">{lesson.student_name}</span>
                                <span className="ml-2 text-xs font-medium text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded">
                                    {lesson.class_no} • {lesson.batch}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="block text-xs font-bold text-slate-400 uppercase">{lesson.lesson_date}</span>
                                <button onClick={() => handleDelete(lesson.id)} className="text-xs text-red-400 hover:text-red-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Delete</button>
                            </div>
                        </div>
                        <p className="text-slate-700 text-sm bg-slate-50 p-2 rounded border border-slate-100">{lesson.lesson_topic}</p>
                    </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}