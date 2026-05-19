import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from '../i18n/useTranslation';
import { getLocale } from '../i18n/useTranslation';

export default function InviteModal({ token, expiresAt, onClose, theme }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const inviteUrl = `${window.location.origin}/join/${token}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the text
    }
  }

  const expiresFormatted = expiresAt
    ? new Date(expiresAt).toLocaleDateString(getLocale(), { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className={`w-full max-w-sm rounded-2xl p-6 shadow-xl ${theme?.card || 'bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-semibold ${theme?.text || 'text-slate-900'}`}>
            {t('household.inviteTitle')}
          </h2>
          <button onClick={onClose} className={`p-1 rounded ${theme?.hover || 'hover:bg-slate-100'}`}>
            <X size={20} className={theme?.textMuted || 'text-slate-500'} />
          </button>
        </div>

        <p className={`text-sm mb-4 ${theme?.textMuted || 'text-slate-500'}`}>
          {t('household.inviteShareText')}
        </p>

        <div className="flex justify-center mb-4">
          <QRCodeSVG value={inviteUrl} size={150} />
        </div>

        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 mb-3 ${
          theme?.card === 'bg-slate-900' ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'
        }`}>
          <span className={`flex-1 text-xs truncate ${theme?.textMuted || 'text-slate-500'}`}>
            {inviteUrl}
          </span>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 text-indigo-600 hover:text-indigo-700"
          >
            {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
          </button>
        </div>

        <button
          onClick={handleCopy}
          className="w-full py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
        >
          {copied ? <Check size={16} className="inline mr-1" /> : <Copy size={16} className="inline mr-1" />}
          {t('household.inviteCopyLink')}
        </button>

        {expiresFormatted && (
          <p className={`text-xs mt-3 text-center ${theme?.textMuted || 'text-slate-400'}`}>
            {t('household.inviteExpiresIn', { date: expiresFormatted })}
          </p>
        )}
      </div>
    </div>
  );
}
