// Device-local "laatst weggeschreven om"-log per dag voor "Zet in agenda"
// (S12). Bewust géén `settings`/`day:`-prefix: `isUserSyncKey`
// (src/sync/userDataStorage.js) laat alleen die drie prefixen naar het
// account syncen en `src/utils/backup.js` exporteert alleen die drie — dit is
// per-apparaat metadata (wanneer schreef DIT apparaat voor het laatst naar
// Outlook), hoort niet in de cloud of in een backup. Zelfde afweging als
// agendaCache.js. Wissen gebeurt op dezelfde plek waar de agendacache al
// gewist wordt bij een verbroken koppeling (App.jsx).
const LOG_KEY = 'agenda:outlook:writes';

// `{ [dateKey]: isoString }`. Onleesbaar of ontbrekend -> lege log, nooit een
// crash op een corrupte device-storage-waarde.
export async function readCalendarWriteLog() {
  try {
    const result = await window.storage.get(LOG_KEY);
    if (!result?.value) return {};
    const parsed = JSON.parse(result.value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

// Legt vast wanneer dag `dateKey` voor het laatst is weggeschreven en geeft
// de bijgewerkte log terug, zodat de aanroeper zijn React-state in dezelfde
// call kan bijwerken zonder opnieuw te hoeven lezen.
export async function recordCalendarWrite(dateKey) {
  const log = await readCalendarWriteLog();
  const next = { ...log, [dateKey]: new Date().toISOString() };
  await window.storage.set(LOG_KEY, JSON.stringify(next));
  return next;
}

export async function clearCalendarWriteLog() {
  await window.storage.delete(LOG_KEY);
}
