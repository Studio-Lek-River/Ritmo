import React from 'react';
import CustomList from './CustomList';
import { useTranslation } from '../../i18n/useTranslation';

export default function CustomTab({ area, items, setItems, theme }) {
  const { t } = useTranslation();
  return (
    <div>
      <p className={`${theme.textMuted} text-sm mb-3`}>
        {t('onboarding.customTab.description')}
      </p>
      <CustomList
        items={items}
        setItems={setItems}
        withTypePicker={area === 'modules'}
        area={area}
        theme={theme}
      />
    </div>
  );
}
