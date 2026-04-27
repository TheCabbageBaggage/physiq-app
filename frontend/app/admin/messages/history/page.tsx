'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { apiUrl, getAuthToken } from '@/lib/api'
import { PackageOpen, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react'

export default function MessageHistoryPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [selectedMessage, setSelectedMessage] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const perPage = 20

  const token = getAuthToken()
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(apiUrl(`/admin/messages/history?page=${page}&per_page=${perPage}`), { headers })
        if (res.ok) {
          const data = await res.json()
          setMessages(data.messages || [])
          setTotal(data.total || 0)
        }
      } catch (e) {
        console.error('Failed to load message history', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [page])

  const loadDetail = async (id: number) => {
    try {
      const res = await fetch(apiUrl(`/admin/messages/${id}`), { headers })
      if (res.ok) setSelectedMessage(await res.json())
    } catch (e) {
      console.error('Failed to load message detail', e)
    }
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'partial': return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />
      default: return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Email History</h2>
          <p className="text-sm text-gray-500 mt-1">View sent mass emails and their delivery status</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <PackageOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No emails sent yet.</p>
          </div>
        ) : (
          <>
            {/* Message List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Subject</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Recipients</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Sent</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600"></th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((msg) => (
                    <tr key={msg.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[300px] truncate">{msg.subject}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 capitalize">
                          {statusIcon(msg.status)}
                          {msg.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {msg.sent_count + msg.failed_count}/{msg.total_recipients}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-green-600 font-medium">{msg.sent_count}</span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className="text-red-600 font-medium">{msg.failed_count}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {msg.sent_at
                          ? new Date(msg.sent_at).toLocaleString('de-DE')
                          : msg.created_at
                            ? new Date(msg.created_at).toLocaleString('de-DE')
                            : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => loadDetail(msg.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* Detail Modal */}
        {selectedMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedMessage(null)}>
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Message Detail</h3>
                  <button onClick={() => setSelectedMessage(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <div className="space-y-2 text-sm">
                  <p><strong>Subject:</strong> {selectedMessage.subject}</p>
                  <p><strong>Status:</strong> <span className="capitalize">{selectedMessage.status}</span></p>
                  <p><strong>Target Group:</strong> {selectedMessage.target_group || '—'}</p>
                  <p><strong>Sent:</strong> {selectedMessage.sent_count} / <strong>Failed:</strong> {selectedMessage.failed_count} / <strong>Total:</strong> {selectedMessage.total_recipients}</p>
                  <p><strong>Created:</strong> {selectedMessage.created_at ? new Date(selectedMessage.created_at).toLocaleString('de-DE') : '—'}</p>
                  {selectedMessage.sent_at && <p><strong>Sent at:</strong> {new Date(selectedMessage.sent_at).toLocaleString('de-DE')}</p>}
                </div>

                {/* HTML Preview */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Email Preview:</p>
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-[300px] overflow-y-auto">
                    <div dangerouslySetInnerHTML={{ __html: selectedMessage.html_body }} />
                  </div>
                </div>

                {/* Recipients */}
                {selectedMessage.recipients && selectedMessage.recipients.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Recipients ({selectedMessage.recipients_total} total, showing {selectedMessage.recipients.length}):
                    </p>
                    <div className="max-h-[200px] overflow-y-auto space-y-1">
                      {selectedMessage.recipients.map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-1.5">
                          <span>{r.email}</span>
                          <span className={`text-xs font-medium ${r.status === 'sent' ? 'text-green-600' : 'text-red-600'}`}>
                            {r.status}
                            {r.error && ` - ${r.error}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
