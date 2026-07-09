// Gedeelde navigatie-definitie voor mobiele TabBar en desktop-sidebar, zodat beide
// exact dezelfde tabs en labels tonen en niet uit elkaar lopen.
//
// Geeft een array van groepen terug; elke groep is een array van { id, label }.
// De mobiele TabBar rendert elke groep als een eigen rij pill-tabs; de desktop
// sidebar rendert de groepen onder elkaar met een scheiding ertussen.
export function getNavGroups(t, appMode) {
  if (appMode === 'health') {
    // Health-modus: één groep. De 'today'-tab is het gecombineerde Health-scherm
    // (dagelijks dashboard + gezondheidsmodules) en draagt het label "Gezondheid".
    return [
      [
        { id: 'today',     label: t('nav.measurements') },
        { id: 'week',      label: t('nav.week') },
        { id: 'month',     label: t('nav.month') },
        { id: 'household', label: t('nav.household') },
      ],
    ];
  }

  return [
    [
      { id: 'today',      label: t('nav.today') },
      { id: 'week',       label: t('nav.week') },
      { id: 'month',      label: t('nav.month') },
      { id: 'reflection', label: t('nav.reflection') },
    ],
    [
      { id: 'household',    label: t('nav.household') },
      { id: 'projects',     label: t('nav.projects') },
      { id: 'collections',  label: t('nav.collections') },
      { id: 'measurements', label: t('nav.measurements') },
    ],
  ];
}
