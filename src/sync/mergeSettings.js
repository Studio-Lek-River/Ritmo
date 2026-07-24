// Pure merge-functie voor gesyncte `user_data`-waarden.
//
// Probleem: `settings` is één monolithische blob waarin alle
// gezondheidsdata leeft (measurement-events, bodymap-log, medicatie-
// intakeLog, injectieschema-entries). Bij een kale "laatste schrijver
// wint"-sync overschrijft een apparaat met een oudere staat de cloud-rij
// zodra het om welke reden dan ook zijn settings wegschrijft (dark mode,
// tab wisselen, ...) — een net gesyncte meting van een ander apparaat gaat
// dan permanent verloren.
//
// Oplossing: voor de `settings`-key worden de health-append-arrays
// samengevoegd (union) op id (of, voor medicatie-intakeLog, op de
// composietsleutel `date|time`) in plaats van overschreven. Scalars en
// overige config komen uit `local` — alleen de expliciet genoemde
// append-verzamelingen worden gemerged. Modules/metrics/meds die alleen in
// cloud bestaan blijven behouden.
//
// Voor elke andere key blijft het bestaande "laatste schrijver wint"-gedrag
// intact: retourneer `localValue` ongewijzigd.
//
// Trade-off: merge is add-wins (geen tombstones) — een lokaal verwijderde
// meting kan bij sync heropduiken zolang de cloud hem nog heeft. Acceptabel:
// het opgeloste probleem is verloren toevoegingen, niet verwijderingen.
//
// Puur en idempotent: mergeSyncedValue('settings', cloud, mergeSyncedValue
// ('settings', cloud, local)) === mergeSyncedValue('settings', cloud, local)
// voor de append-verzamelingen (dedup op id/compositesleutel).
//
// Input mag zowel een geparst object als een JSON-string zijn (spiegelt
// toJsonValue/toStorageValue uit userDataStorage.js). Retourneert voor
// `settings` altijd een geparst object — callers converteren zelf naar hun
// eigen opslagformaat (string voor lokale IndexedDB, object voor de
// Supabase jsonb-kolom), net zoals ze dat nu al doen met
// toJsonValue/toStorageValue.

function toJsonValue(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// Union van twee arrays op een id-veld. Items uit `localArr` gaan voor
// (scalars/config uit local); items die alleen in `cloudArr` voorkomen
// worden aan het eind toegevoegd.
function unionById(cloudArr, localArr, idKey = 'id') {
  const local = Array.isArray(localArr) ? localArr : [];
  const cloud = Array.isArray(cloudArr) ? cloudArr : [];
  const result = [...local];
  const seen = new Set(local.map((item) => item?.[idKey]));
  for (const item of cloud) {
    const id = item?.[idKey];
    if (!seen.has(id)) {
      result.push(item);
      seen.add(id);
    }
  }
  return result;
}

// Zelfde als unionById, maar met een custom sleutel-functie i.p.v. een enkel
// id-veld. Gebruikt voor medicatie-intakeLog, waarvan de entries ({date,
// time}) geen id hebben.
function unionByKey(cloudArr, localArr, keyFn) {
  const local = Array.isArray(localArr) ? localArr : [];
  const cloud = Array.isArray(cloudArr) ? cloudArr : [];
  const result = [...local];
  const seen = new Set(local.map(keyFn));
  for (const item of cloud) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      result.push(item);
      seen.add(key);
    }
  }
  return result;
}

const intakeLogKey = (entry) => `${entry?.date ?? ''}|${entry?.time ?? ''}`;

// Mergt één module: scalars/config uit local, health-append-arrays union.
// `cloudModule`/`localModule` bestaan hier allebei (module-only-in-één-kant
// wordt al afgehandeld door de caller, die de andere kant verbatim teruggeeft).
function mergeModule(cloudModule, localModule) {
  const merged = { ...localModule };

  if (Array.isArray(localModule?.metrics) || Array.isArray(cloudModule?.metrics)) {
    const cloudMetrics = Array.isArray(cloudModule?.metrics) ? cloudModule.metrics : [];
    const localMetrics = Array.isArray(localModule?.metrics) ? localModule.metrics : [];
    merged.metrics = unionById(cloudMetrics, localMetrics, 'id').map((metric) => {
      const cloudMetric = cloudMetrics.find((m) => m?.id === metric?.id);
      const localMetric = localMetrics.find((m) => m?.id === metric?.id);
      if (!cloudMetric || !localMetric) return metric;
      return { ...metric, events: unionById(cloudMetric.events, localMetric.events, 'id') };
    });
  }

  if (Array.isArray(localModule?.log) || Array.isArray(cloudModule?.log)) {
    merged.log = unionById(cloudModule?.log, localModule?.log, 'id');
  }

  if (Array.isArray(localModule?.entries) || Array.isArray(cloudModule?.entries)) {
    merged.entries = unionById(cloudModule?.entries, localModule?.entries, 'id');
  }

  if (Array.isArray(localModule?.meds) || Array.isArray(cloudModule?.meds)) {
    const cloudMeds = Array.isArray(cloudModule?.meds) ? cloudModule.meds : [];
    const localMeds = Array.isArray(localModule?.meds) ? localModule.meds : [];
    merged.meds = unionById(cloudMeds, localMeds, 'id').map((med) => {
      const cloudMed = cloudMeds.find((m) => m?.id === med?.id);
      const localMed = localMeds.find((m) => m?.id === med?.id);
      if (!cloudMed || !localMed) return med;
      return {
        ...med,
        intakeLog: unionByKey(cloudMed.intakeLog, localMed.intakeLog, intakeLogKey),
      };
    });
  }

  return merged;
}

function mergeSettingsObjects(cloud, local) {
  const cloudObj = cloud && typeof cloud === 'object' ? cloud : null;
  const localObj = local && typeof local === 'object' ? local : null;

  if (!cloudObj) return localObj;
  if (!localObj) return cloudObj;

  const merged = { ...localObj };

  const cloudModules = Array.isArray(cloudObj.modules) ? cloudObj.modules : [];
  const localModules = Array.isArray(localObj.modules) ? localObj.modules : [];

  if (cloudModules.length > 0 || localModules.length > 0) {
    const localById = new Map(localModules.map((m) => [m?.id, m]));
    const cloudById = new Map(cloudModules.map((m) => [m?.id, m]));

    const orderedIds = localModules.map((m) => m?.id);
    for (const m of cloudModules) {
      if (!localById.has(m?.id)) orderedIds.push(m?.id);
    }

    merged.modules = orderedIds.map((id) => {
      const localModule = localById.get(id);
      const cloudModule = cloudById.get(id);
      if (!localModule) return cloudModule;
      if (!cloudModule) return localModule;
      return mergeModule(cloudModule, localModule);
    });
  }

  return merged;
}

// Mergt een gesyncte waarde tussen cloud en lokaal. Voor elke key behalve
// `settings` is dit een no-op (huidig "laatste schrijver wint"-gedrag): geeft
// `localValue` ongewijzigd terug. Voor `settings` mergt hij de health-
// append-arrays (zie boven) en geeft hij altijd een geparst object terug.
export function mergeSyncedValue(key, cloudValue, localValue) {
  if (key !== 'settings') return localValue;
  return mergeSettingsObjects(toJsonValue(cloudValue), toJsonValue(localValue));
}
