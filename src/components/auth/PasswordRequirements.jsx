import { Check, Circle } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import { validatePassword } from '../../utils/passwordValidation';

export default function PasswordRequirements({ password, theme }) {
  const { t } = useTranslation();
  const { hasLength, hasMix } = validatePassword(password);

  const rule = (ok, label) => (
    <div className="flex items-center gap-2">
      {ok ? (
        <Check size={14} className="text-green-500 shrink-0" />
      ) : (
        <Circle size={14} className={`${theme.textMuted} shrink-0`} />
      )}
      <span className={`text-xs ${ok ? 'text-green-600 dark:text-green-400' : theme.textMuted}`}>
        {label}
      </span>
    </div>
  );

  return (
    <div className={`${theme.cardSecondary} rounded-lg p-3 space-y-1`}>
      {rule(hasLength, t('auth.passwordRequirementLength'))}
      {rule(hasMix, t('auth.passwordRequirementMix'))}
    </div>
  );
}
