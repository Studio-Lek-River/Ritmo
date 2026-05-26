import { useEffect, useState } from 'react';
import { Cloud, LogOut, ChevronRight, KeyRound } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import { signOut } from '../../sync/auth';
import { getMyHouseholds } from '../../sync/households';
import ConfirmDialog from '../ConfirmDialog';

export default function SignedInPanel({ theme, user, onChangePassword, onNavigateHousehold }) {
  const { t } = useTranslation();
  const [households, setHouseholds] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyHouseholds()
      .then((rows) => {
        if (!cancelled) setHouseholds(rows ?? []);
      })
      .catch(() => {
        if (!cancelled) setHouseholds([]);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  const hasHouseholds = households.length > 0;

  return (
    <div className="space-y-3">
      <h3 className={`font-semibold ${theme.textSecondary}`}>{t('auth.sectionTitleSignedIn')}</h3>

      <div className={`${theme.cardSecondary} rounded-2xl p-3 flex items-center gap-2`}>
        <Cloud size={18} className={theme.textMuted} />
        <span className={`text-sm ${theme.textSecondary}`}>{user?.email}</span>
      </div>

      <hr className="border-gray-200 dark:border-gray-700" />

      <div className="space-y-2">
        <h4 className={`text-sm font-medium ${theme.textSecondary}`}>
          {hasHouseholds && households.length > 1
            ? t('auth.householdSectionPlural')
            : t('auth.householdSection')}
        </h4>

        {hasHouseholds ? (
          <div className="space-y-2">
            {households.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={onNavigateHousehold}
                className={`w-full flex items-center justify-between p-3 rounded-xl ${theme.cardSecondary} hover:opacity-80 transition text-left`}
              >
                <div>
                  <div className={`text-sm font-medium ${theme.textSecondary}`}>{h.name}</div>
                  <div className={`text-xs ${theme.textMuted}`}>
                    {h.role === 'admin' ? t('auth.roleAdmin') : t('auth.roleMember')}
                  </div>
                </div>
                <ChevronRight size={16} className={theme.textMuted} />
              </button>
            ))}
            <button
              type="button"
              onClick={onNavigateHousehold}
              className={`w-full py-2 rounded-lg text-sm font-medium ${theme.cardSecondary} ${theme.textSecondary} hover:opacity-80 transition`}
            >
              {t('auth.addAnotherHousehold')}
            </button>
          </div>
        ) : (
          <>
            <p className={`text-sm ${theme.textMuted}`}>{t('auth.noHouseholdYet')}</p>
            <button
              type="button"
              onClick={onNavigateHousehold}
              className="w-full py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
            >
              {t('auth.createHousehold')}
            </button>
            <button
              type="button"
              onClick={onNavigateHousehold}
              className={`w-full py-2 rounded-lg text-sm font-medium ${theme.cardSecondary} ${theme.textSecondary} hover:opacity-80 transition`}
            >
              {t('auth.joinHousehold')}
            </button>
          </>
        )}
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
