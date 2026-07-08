// Eén gedeelde bron voor "is dit een gezondheidsmodule?"-logica, gebruikt door
// de Health-appmodus (H07) om de menubalk en modulefilters te schakelen.
//
// Health-lidmaatschap is hybride: sommige modules zijn altijd health (type-based,
// bv. measurements/medication/bodymap), andere zijn generieke module-types
// (counter/checklist) die alleen via een expliciete `health: true`-vlag op de
// module meetellen (zie presets.js: beweging- en bijwerkingen-preset).
export const HEALTH_MODULE_TYPES = ['measurements', 'medication', 'bodymap'];

export function isHealthModule(m) {
  return HEALTH_MODULE_TYPES.includes(m.type) || m.health === true;
}
