import { Share2 } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

export default function ShareToggle({ enabled, onClick, disabled }) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={enabled ? t('share.unshare') : t('share.share')}
      title={enabled ? t('share.sharedTitle') : t('share.notSharedTitle')}
      className={`p-1.5 rounded-full transition ${
        enabled
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      <Share2 size={16} />
    </button>
  );
}
