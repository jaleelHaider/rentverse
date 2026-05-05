import React, { useEffect, useState } from 'react'
import KBAdmin from '@/components/admin/KBAdmin'
import { apiJsonRequest } from '@/api/clients'

const KBManagement: React.FC = () => {
  const [faqs, setFaqs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchFaqs = async () => {
    setLoading(true)
    try {
      const data = await apiJsonRequest<any[]>('/ai/admin/kb/faq_entries', { method: 'GET', auth: true })
      setFaqs(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFaqs()
  }, [])

  const [newQ, setNewQ] = useState('')
  const [newA, setNewA] = useState('')

  const createFaq = async () => {
    try {
      await apiJsonRequest('/ai/admin/kb/faq_entries', { method: 'POST', body: { question: newQ, answer: newA }, auth: true })
      setNewQ('')
      setNewA('')
      fetchFaqs()
    } catch (err) {
      console.error(err)
    }
  }

  const deleteFaq = async (id: string) => {
    try {
      await apiJsonRequest(`/ai/admin/kb/faq_entries/${id}`, { method: 'DELETE', auth: true })
      fetchFaqs()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Knowledge Base Management</h2>
      <div className="mb-6">
        <KBAdmin />
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Create FAQ</h3>
        <div className="space-y-2 max-w-lg">
          <input value={newQ} onChange={(e) => setNewQ(e.target.value)} placeholder="Question" className="w-full p-2 border rounded" />
          <textarea value={newA} onChange={(e) => setNewA(e.target.value)} placeholder="Answer" className="w-full p-2 border rounded" />
          <button onClick={createFaq} className="px-3 py-2 bg-green-600 text-white rounded">Create</button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">FAQ Entries</h3>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="space-y-2">
            {faqs.map((f) => (
              <div key={f.id} className="p-3 border rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{f.question}</div>
                    <div className="text-sm text-gray-700">{f.answer}</div>
                  </div>
                  <div>
                    <button onClick={() => deleteFaq(f.id)} className="ml-2 px-2 py-1 bg-red-600 text-white rounded">Delete</button>
                  </div>
                </div>
              </div>
            ))}
            {faqs.length === 0 && <div className="text-sm text-muted">No FAQ entries</div>}
          </div>
        )}
      </div>
    </div>
  )
}

export default KBManagement
