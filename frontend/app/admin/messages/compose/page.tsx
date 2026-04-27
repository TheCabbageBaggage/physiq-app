'use client'

import { useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { apiUrl, getAuthToken } from '@/lib/api'
import { AlertCircle, CheckCircle, Send, Eye } from 'lucide-react'

const TARGET_GROUPS = [
  { value: 'all', label: 'All Users' },
  { value: 'active_users', label: 'Active Subscribers' },
  { value: 'waitlist', label: 'Waitlist Signups' },
  { value: 'custom', label: 'Custom Email List' },
]

const TEMPLATE_VARIABLES = [
  { key: '{{name}}', desc: 'Recipient name' },
]

export default function ComposeMessagePage() {
  const [subject, setSubject] = useState('')
  const [htmlBody, setHtmlBody] = useState('')
  const [targetGroup, setTargetGroup] = useState('all')
  const [customEmails, setCustomEmails] = useState('')
  const [preview, setPreview] = useState<any>(null)
  const [sending, setSending] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [error, setError] = useState('')

  const token = getAuthToken()
  const headers = (contentType?: string) => ({
    'Content-Type': contentType || 'application/json',
    Authorization: `Bearer ${token}`,
  })

  const handlePreview = async () => {
    if (!subject.trim() || !htmlBody.trim()) {
      setError('Subject and email body are required')
      return
    }
    setPreviewLoading(true)
    setError('')
    try {
      const res = await fetch(apiUrl('/admin/messages/preview'), {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          subject: subject.trim(),
          html_body: htmlBody,
          target_group: targetGroup,
          custom_emails: targetGroup === 'custom' ? customEmails.split('\n').map((e) => e.trim()).filter(Boolean) : undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Preview failed')
      }
      setPreview(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleSend = async () => {
    if (!subject.trim() || !htmlBody.trim()) {
      setError('Subject and email body are required')
      return
    }
    if (!confirm('Are you sure you want to send this email to the selected recipients?')) return

    setSending(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch(apiUrl('/admin/messages/send'), {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          subject: subject.trim(),
          html_body: htmlBody,
          target_group: targetGroup,
          custom_emails: targetGroup === 'custom' ? customEmails.split('\n').map((e) => e.trim()).filter(Boolean) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Send failed')
      setResult({
        success: true,
        message: `Email sent! ${data.sent} delivered, ${data.failed} failed out of ${data.total} recipients.`,
      })
      setPreview(null)
    } catch (e: any) {
      setError(e.message)
      setResult({ success: false, message: e.message })
    } finally {
      setSending(false)
    }
  }

  const insertTemplateVar = (key: string) => {
    setHtmlBody((prev) => prev + key)
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Mass Email Compose</h2>
          <p className="text-sm text-gray-500 mt-1">Create and send emails to user groups</p>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && result.success && (
          <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{result.message}</span>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          {/* Target Group */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Group</label>
            <select
              value={targetGroup}
              onChange={(e) => setTargetGroup(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {TARGET_GROUPS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>

          {/* Custom Emails */}
          {targetGroup === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email List <span className="text-gray-400">(one per line)</span>
              </label>
              <textarea
                value={customEmails}
                onChange={(e) => setCustomEmails(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="user1@example.com&#10;user2@example.com"
              />
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Email subject line"
            />
          </div>

          {/* HTML Body */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Email Body (HTML)</label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">Variables:</span>
                {TEMPLATE_VARIABLES.map((v) => (
                  <button
                    key={v.key}
                    onClick={() => insertTemplateVar(v.key)}
                    className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                    title={v.desc}
                  >
                    {v.key}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={htmlBody}
              onChange={(e) => setHtmlBody(e.target.value)}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              placeholder="<h1>Hello {{name}}!</h1><p>Your message here...</p>"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handlePreview}
              disabled={previewLoading || sending}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Eye className="h-4 w-4" />
              {previewLoading ? 'Loading...' : 'Preview Audience'}
            </button>
            <button
              onClick={handleSend}
              disabled={sending || previewLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {sending ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </div>

        {/* Preview Results */}
        {preview && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <h3 className="font-semibold text-gray-900">Preview</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <p><strong>Subject:</strong> {preview.subject}</p>
              <p>
                <strong>Estimated Recipients:</strong>{' '}
                <span className="text-blue-700 font-semibold">{preview.estimated_recipients}</span>
              </p>
            </div>
            {preview.sample_recipients && preview.sample_recipients.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Sample recipients (showing first {preview.sample_recipients.length}):</p>
                <div className="space-y-1">
                  {preview.sample_recipients.map((r: any, i: number) => (
                    <div key={i} className="text-sm bg-gray-50 rounded px-3 py-1.5">
                      {r.name} &lt;{r.email}&gt;
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
