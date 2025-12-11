'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'

export default function Home() {
  const [lessons, setLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    student: '',
    classNo: '',
    batch: '',
    topic: ''
  })

  useEffect(() => {
    fetchLessons()
  }, [])

  const fetchLessons = async () => {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .order('id', { ascending: false })
      
    if (data) setLessons(data)
    if (error) console.error(error)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('lessons')
      .insert([
        { 
          student_name: formData.student,
          class_no: formData.classNo,
          batch: formData.batch,
          lesson_topic: formData.topic,
          lesson_date: formData.date
        }
      ])

    if (error) {
      alert('Error saving data')
    } else {
      setFormData({ ...formData, student: '', topic: '' }) // Reset fields
      fetchLessons() // Refresh list
    }
    setLoading(false)
  }

  const handleDelete = async (id: number) => {
    if(confirm('Are you sure you want to delete this entry?')) {
      await supabase.from('lessons').delete().eq('id', id)
      fetchLessons()
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-extrabold text-slate-800 mb-8 tracking-tight">TuitionTracker</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* INPUT FORM */}
          <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
            <h2 className="text-lg font-bold mb-4 text-slate-700">Add Entry</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Date</label>
                <input 
                  type="date" 
                  required
                  className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Student Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="Student Name"
                  className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.student}
                  onChange={e => setFormData({...formData, student: e.target.value})}
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Class</label>
                  <input 
                    type="text" 
                    placeholder="Class"
                    className="w-full mt-1 p-2 border rounded-md outline-none"
                    value={formData.classNo}
                    onChange={e => setFormData({...formData, classNo: e.target.value})}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Batch</label>
                  <input 
                    type="text" 
                    placeholder="Batch"
                    className="w-full mt-1 p-2 border rounded-md outline-none"
                    value={formData.batch}
                    onChange={e => setFormData({...formData, batch: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Lesson Taught</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Details..."
                  className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.topic}
                  onChange={e => setFormData({...formData, topic: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-md transition-colors"
              >
                {loading ? 'Saving...' : 'Add Track'}
              </button>
            </form>
          </div>

          {/* HISTORY LIST */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                <h2 className="font-bold text-slate-700">Recent Lessons</h2>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">{lessons.length} Total</span>
              </div>
              
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {lessons.length === 0 ? (
                    <p className="p-8 text-center text-slate-400">No data found. Add your first lesson!</p>
                ) : (
                    lessons.map((lesson) => (
                    <div key={lesson.id} className="p-4 hover:bg-slate-50 transition group">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <span className="font-bold text-slate-800 text-lg">{lesson.student_name}</span>
                                <span className="ml-2 text-xs font-medium text-slate-500 border px-1.5 py-0.5 rounded">
                                    {lesson.class_no} {lesson.batch ? `• ${lesson.batch}` : ''}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="block text-xs font-bold text-slate-400 uppercase">{lesson.lesson_date}</span>
                                <button 
                                    onClick={() => handleDelete(lesson.id)}
                                    className="text-xs text-red-400 hover:text-red-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                        <p className="text-slate-600 text-sm bg-slate-50 p-2 rounded border border-slate-100">
                            {lesson.lesson_topic}
                        </p>
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