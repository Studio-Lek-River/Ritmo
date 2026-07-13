// __APP_VERSION__ is een build-time define uit vite.config.js, gevuld met de
// versie uit package.json. In dev/build vervangt Vite deze constante; als hij
// om wat voor reden dan ook niet bestaat valt dit terug op een lege string.
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';
