// Ponto de entrada do servidor online: `npm run server` (desenvolvimento) ou, depois de
// `npm run server:build`, `npm run server:start`. A porta vem de PORT (as hospedagens definem).

import { startServer } from './server';

const port = Number(process.env.PORT) || 8787;
void startServer({ port, log: (m) => console.log(`[${new Date().toISOString()}] ${m}`) });
