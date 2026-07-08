import { useState } from 'react';
import { Cloud, LogOut, KeyRound } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import { signOut } from '../../sync/auth';
import ConfirmDialog from '../ConfirmDialog';

export default function SignedInPanel({ theme, user, onChangePassword }) {
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="space-y-3">
      <h3 className={`font-semibold ${theme.textSecondary}`}>{t('auth.sectionTitleSignedIn')}</h3>

      <div className={`${theme.cardSecondary} rounded-2xl p-3 flex items-center gap-2`}>
        <Cloud size={18} className={theme.textMuted} />
        <span className={`text-sm ${theme.textSecondary}`}>{user?.email}</span>
      </div>

      <hr className="border-gray-200 dark:border-gray-700" />

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onChangePassword}
          className={`flex items-center gap-2 text-sm ${theme.textMuted} hover:underline`}
        >
          <KeyRound size={14} />
          {t('auth.changePassword')}
        </button>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="flex items-center gap-2 text-sm text-red-500 hover:underline"
        >
          <LogOut size={14} />
          {t('auth.signOut')}
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={t('auth.signOutConfirmTitle')}
        description={t('auth.signOutConfirmBody')}
        confirmLabel={t('auth.signOut')}
        cancelLabel={t('auth.cancel')}
        variant="danger"
        onConfirm={async () => {
          setConfirmOpen(false);
          await signOut();
        }}
        onCancel={() => setConfirmOpen(false)}
        theme={theme}
      />
    </div>
  );
}
