import 'dotenv/config';
import http from 'http';
import { createApp } from './app';
import { attachRealtime } from './realtime/socket';

const port = process.env.PORT || 4000;
const corsOrigin = process.env.CORS_ORIGIN || '*';

const app = createApp();
const server = http.createServer(app);
attachRealtime(server, corsOrigin);

server.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
