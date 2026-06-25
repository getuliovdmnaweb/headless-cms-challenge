import http from 'http';
import { type AddressInfo } from 'net';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { type Server as IOServer } from 'socket.io';
import { emit } from './bus';
import { attachRealtime } from './socket';

describe('attachRealtime', () => {
  let server: http.Server;
  let io: IOServer;
  let client: ClientSocket;

  beforeEach((done) => {
    server = http.createServer();
    io = attachRealtime(server, '*');
    server.listen(0, () => {
      const port = (server.address() as AddressInfo).port;
      client = ioClient(`http://localhost:${port}`);
      client.on('connect', done);
    });
  });

  afterEach((done) => {
    client.disconnect();
    io.close();
    server.close(done);
  });

  it('broadcasts a contentType:updated event emitted on the bus to connected clients', (done) => {
    client.on('contentType:updated', (payload) => {
      expect(payload).toEqual({ contentTypeId: 'ct1' });
      done();
    });

    emit('contentType:updated', { contentTypeId: 'ct1' });
  });

  it('broadcasts an entry:created event emitted on the bus to connected clients', (done) => {
    client.on('entry:created', (payload) => {
      expect(payload).toEqual({ contentTypeId: 'ct1', entryId: 'e1' });
      done();
    });

    emit('entry:created', { contentTypeId: 'ct1', entryId: 'e1' });
  });
});
