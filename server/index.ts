// Ponto de entrada do servidor online: `npm run server` (desenvolvimento) ou, depois de
// `npm run server:build`, `npm run server:start`. A porta vem de PORT (as hospedagens definem) e
// o arquivo do ranking de TRUCADO_STATS (padrão: trucado-stats.json na pasta em que roda).

import { startServer } from './server';

const port = Number(process.env.PORT) || 8787;
void startServer({
  port,
  statsFile: process.env.TRUCADO_STATS ?? 'trucado-stats.json',
  log: (m) => console.log(`[${new Date().toISOString()}] ${m}`),
});
