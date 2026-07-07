#!/usr/bin/env node
// Controleert dat src/i18n/nl.js en src/i18n/en.js dezelfde key-paden hebben.
import nlMod from "../src/i18n/nl.js";
import enMod from "../src/i18n/en.js";

const nl = nlMod.default ?? nlMod;
const en = enMod.default ?? enMod;

function keys(obj, prefix = "") {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) out.push(...keys(v, path));
    else out.push(path);
  }
  return out;
}

const nlKeys = new Set(keys(nl));
const enKeys = new Set(keys(en));
const missingInEn = [...nlKeys].filter((k) => !enKeys.has(k));
const missingInNl = [...enKeys].filter((k) => !nlKeys.has(k));

if (missingInEn.length || missingInNl.length) {
  console.error("i18n-pariteit gefaald:");
  if (missingInEn.length) console.error("  Ontbreekt in en.js:", missingInEn.join(", "));
  if (missingInNl.length) console.error("  Ontbreekt in nl.js:", missingInNl.join(", "));
  process.exit(1);
}
console.log(`i18n-pariteit OK: ${nlKeys.size} keys in beide.`);
