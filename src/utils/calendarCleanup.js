// Opruim-lus voor alle Ritmo-blokken in Outlook (S12/#155, endpoint
// api/connections/outlook/cleanup.js). Was tot #160 een lokale lus in
// CalendarCleanupSection.jsx:64-101; verhuisd naar hier zodat zowel de losse
// opruimknop in Instellingen als de disconnect-flow (#160,
// ConnectionsSection.jsx) hem zonder tweede kopie kunnen aanroepen. Gedrag
// ongewijzigd overgenomen.
import { cleanupOutlookRitmoBlocks } from '../sync/connections';

// Client-cap op het aantal opruim-rondes per aanroep: één ronde ruimt maximaal
// CLEANUP_DELETE_BATCH (server, cleanup.js) events op. 25 rondes is dus 5000
// events per aanroep — ruim boven wat een reële mailbox aan Ritmo-blokken
// bevat zonder dat het opruimen bij een onverwacht grote mailbox eindeloos
// doorloopt (AC6 van #155): wordt de cap geraakt, dan meldt de aanroeper dat
// opnieuw proberen de rest opruimt, nooit stilzwijgend "klaar".
export const MAX_CLEANUP_ROUNDS = 25;

// Herhaalt cleanupOutlookRitmoBlocks() zolang de server `more` teruggeeft, tot
// de ronde-cap. `onProgress({ deleted })` wordt na elke ronde aangeroepen met
// het cumulatieve aantal verwijderd, zodat de aanroeper een voortgangslabel
// kan tonen (bv. "{deleted} verwijderd…").
//
// Bij een API-fout onderweg gooit deze functie de Error door, aangevuld met
// `.deleted`/`.failed` tot dat punt — de aanroeper kan zo alsnog `onCleaned`
// (of de #160-equivalent) aanroepen als er al iets verwijderd is vóór de fout.
export async function runCalendarCleanup({ onProgress } = {}) {
  let deleted = 0;
  let failed = 0;
  let more = true;
  let capped = false;

  try {
    for (let round = 0; round < MAX_CLEANUP_ROUNDS && more; round += 1) {
      // eslint-disable-next-line no-await-in-loop
      const result = await cleanupOutlookRitmoBlocks();
      deleted += result?.deleted || 0;
      failed += result?.failed || 0;
      more = !!result?.more;
      onProgress?.({ deleted });
    }
    capped = more;
  } catch (err) {
    err.deleted = deleted;
    err.failed = failed;
    throw err;
  }

  return { deleted, failed, capped };
}
