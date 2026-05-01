import React, { useState } from 'react';
import { X, Bug, Lightbulb, Check } from 'lucide-react';

const MAX_LENGTH = 2000;
const MIN_LENGTH = 10;

export default function FeedbackModal({ onClose, t }) {
  const [type, setType] = useState(null);
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorText, setErrorText] = useState('');

  const trimmedLength = message.trim().length;
  const canSubmit = type !== null && trimmedLength >= MIN_LENGTH && status !== 'sending';

  async function handleSubmit() {
    if (!canSubmit) return;
    setStatus('sending');
    setErrorText('');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message: message.trim(), honeypot }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Er ging iets mis');
      }

      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorText(err.message || 'Er ging iets mis');
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`${t.card} rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto my-4`}
        onClick={(e) => e.stopPropagation()}
      >
        {status === 'success' ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className={`text-lg font-medium mb-1 ${t.text}`}>
              Bedankt voor je feedback
            </h3>
            <p className={`text-sm ${t.textMuted} mb-4`}>
              Je bericht is verstuurd naar de ontwikkelaar.
            </p>
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${t.cardSecondary} ${t.hover} ${t.textSecondary}`}
            >
              Sluiten
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${t.text}`}>
                Feedback geven
              </h3>
              <button
                onClick={onClose}
                className={`p-2 ${t.hover} rounded-lg`}
                aria-label="Sluiten"
              >
                <X className={`w-5 h-5 ${t.textSecondary}`} />
              </button>
            </div>

            <p className={`text-sm ${t.textSecondary} mb-2`}>
              Wat voor soort feedback?
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setType('bug')}
                className={`p-3 rounded-lg border text-left transition ${
                  type === 'bug'
                    ? 'border-blue-500 bg-blue-50 text-slate-800'
                    : `${t.border} ${t.hover} ${t.textSecondary}`
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Bug className="w-4 h-4" />
                  <span className="text-sm font-medium">Probleem</span>
                </div>
                <span className={`text-xs ${type === 'bug' ? 'text-slate-600' : t.textMuted}`}>
                  Iets werkt niet
                </span>
              </button>
              <button
                onClick={() => setType('feature')}
                className={`p-3 rounded-lg border text-left transition ${
                  type === 'feature'
                    ? 'border-blue-500 bg-blue-50 text-slate-800'
                    : `${t.border} ${t.hover} ${t.textSecondary}`
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="w-4 h-4" />
                  <span className="text-sm font-medium">Suggestie</span>
                </div>
                <span className={`text-xs ${type === 'feature' ? 'text-slate-600' : t.textMuted}`}>
                  Idee voor verbetering
                </span>
              </button>
            </div>

            <p className={`text-sm ${t.textSecondary} mb-2`}>
              Beschrijf je feedback
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
              rows={5}
              placeholder="Bijvoorbeeld: het toevoegen van een nieuwe taak in module X werkt niet als..."
              className={`w-full p-3 rounded-lg border ${t.border} ${t.input} text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            <div className={`flex justify-between mt-1 text-xs ${t.textMuted}`}>
              <span>Vermijd persoonlijke gegevens.</span>
              <span>{message.length} / {MAX_LENGTH}</span>
            </div>

            <input
              type="text"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
            />

            {status === 'error' && (
              <p className="mt-3 text-sm text-red-500">
                {errorText}
              </p>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${t.cardSecondary} ${t.hover} ${t.textSecondary}`}
              >
                Annuleren
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'sending' ? 'Versturen...' : 'Versturen'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
