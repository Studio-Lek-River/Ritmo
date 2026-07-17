// De enige Vercel-route voor àlle `/api/connections/**`-aanroepen. Vercels
// filesystem-routing maakt van elk bestand in `api/` dat niet met `_` begint
// een eigen Serverless Function, en het Hobby-plan staat er maximaal 12 toe.
// Met een endpoint of vier per koppeling was dat plafond met S09 (GitHub)
// bereikt: 13 functions, deploy geweigerd. Deze catch-all vangt alle paden op
// en roept de handler zelf aan, zodat het hele connections-oppervlak één
// function is en een volgende provider er nul kost.
//
// De URL's veranderen hier niet van: de frontend blijft POSTen naar
// `/api/connections/<pad>` (zie callConnectionsApi in src/sync/connections.js)
// en de OAuth-redirect-URI's die bij Microsoft en GitHub geregistreerd staan
// blijven kloppen. Alleen wie ze afhandelt verschuift naar dit bestand.
//
// Een nieuw endpoint toevoegen = het bestand een `_`-prefix geven (anders
// wordt het alsnog een eigen function en telt het mee voor de limiet) en het
// hieronder in ROUTES zetten.
import disconnect from './_disconnect.js';
import outlookStart from './outlook/_start.js';
import outlookCallback from './outlook/_callback.js';
import outlookEvents from './outlook/_events.js';
import trelloStart from './trello/_start.js';
import trelloToken from './trello/_token.js';
import trelloBoards from './trello/_boards.js';
import trelloCards from './trello/_cards.js';
import githubStart from './github/_start.js';
import githubCallback from './github/_callback.js';
import githubRepos from './github/_repos.js';
import githubIssues from './github/_issues.js';

// Pad achter `/api/connections/` -> handler. Letterlijke sleutels, geen
// opbouw uit segmenten: alleen wat hier staat is bereikbaar.
const ROUTES = {
  'disconnect': disconnect,
  'outlook/start': outlookStart,
  'outlook/callback': outlookCallback,
  'outlook/events': outlookEvents,
  'trello/start': trelloStart,
  'trello/token': trelloToken,
  'trello/boards': trelloBoards,
  'trello/cards': trelloCards,
  'github/start': githubStart,
  'github/callback': githubCallback,
  'github/repos': githubRepos,
  'github/issues': githubIssues,
};

export default async function handler(req, res) {
  // Vercel zet de segmenten van de catch-all onder de naam van de parameter
  // (`path`) in req.query; de handlers lezen hun eigen query-keys (code,
  // state) daar gewoon naast.
  const segments = Array.isArray(req.query.path) ? req.query.path : [];
  const target = ROUTES[segments.join('/')];
  if (!target) {
    return res.status(404).json({ error: 'Niet gevonden', code: 'not_found' });
  }
  return target(req, res);
}
