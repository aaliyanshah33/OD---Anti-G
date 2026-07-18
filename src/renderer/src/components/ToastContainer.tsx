import React from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { useToastStore } from '../stores/toastStore'

export default function ToastContainer(): React.ReactElement {
  const { toasts, removeToast } = useToastStore()
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span className="toast-icon">
            {t.type === 'success' && <CheckCircle size={16} />}
            {t.type === 'error'   && <XCircle size={16} />}
            {t.type === 'info'    && <Info size={16} />}
          </span>
          <span style={{ flex: 1, fontSize: 13 }}>{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2 }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
