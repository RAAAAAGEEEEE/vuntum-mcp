import { createServer, request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { installGracefulShutdown } from './graceful-shutdown.js';

function listen(http: Server): Promise<number> {
  return new Promise((done) =>
    http.listen(0, '127.0.0.1', () => done((http.address() as AddressInfo).port)),
  );
}

function get(port: number): Promise<{ status: number; connection: string | undefined; body: string }> {
  return new Promise((done, fail) => {
    const req = request({ port, host: '127.0.0.1', agent: false }, (res) => {
      let body = '';
      res.on('data', (chunk: Buffer) => (body += chunk.toString()));
      res.on('end', () =>
        done({ status: res.statusCode ?? 0, connection: res.headers.connection, body }),
      );
    });
    req.on('error', fail);
    req.end();
  });
}

const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));

describe('graceful shutdown', () => {
  it('finishes a request in progress, answers during the drain with Connection: close, then refuses', async () => {
    const http = createServer((_req, res) => setTimeout(() => res.end('done'), 150));
    const port = await listen(http);
    let exitCode: number | undefined;
    let exited!: () => void;
    const exitedPromise = new Promise<void>((done) => (exited = done));
    const { stop } = installGracefulShutdown(http, {
      drainMs: 300,
      forceMs: 2000,
      exit: (code) => {
        exitCode = code;
        exited();
      },
    });
    const inFlight = get(port);
    void stop();
    await wait(50);
    // Sent while draining: still served, and the connection is not kept.
    const during = await get(port);
    expect(during.status).toBe(200);
    expect(during.connection).toBe('close');
    expect((await inFlight).body).toBe('done');
    await exitedPromise;
    expect(exitCode).toBe(0);
    await expect(get(port)).rejects.toMatchObject({ code: 'ECONNREFUSED' });
  });

  it('survives handlers that answer synchronously and force keep-alive while draining', async () => {
    const http = createServer((req, res) => {
      if (req.url === '/limited') {
        res.writeHead(429, { 'content-type': 'application/json' });
        res.end('{}');
        return;
      }
      res.writeHead(200, { Connection: 'keep-alive', 'content-type': 'text/event-stream' });
      res.end('ok');
    });
    const port = await listen(http);
    let exitCode: number | undefined;
    let exited!: () => void;
    const exitedPromise = new Promise<void>((done) => (exited = done));
    const { stop } = installGracefulShutdown(http, {
      drainMs: 300,
      forceMs: 2000,
      exit: (code) => {
        exitCode = code;
        exited();
      },
    });
    const crashed: Error[] = [];
    const onCrash = (error: Error) => crashed.push(error);
    process.on('uncaughtException', onCrash);
    void stop();
    await wait(30);
    const limited = await new Promise<number>((done, fail) => {
      const req = request({ port, host: '127.0.0.1', path: '/limited', agent: false }, (res) => {
        res.resume();
        res.on('end', () => done(res.statusCode ?? 0));
      });
      req.on('error', fail);
      req.end();
    });
    const streamed = await get(port);
    await exitedPromise;
    process.off('uncaughtException', onCrash);
    expect(crashed).toEqual([]);
    expect(limited).toBe(429);
    expect(streamed.status).toBe(200);
    expect(streamed.connection).toBe('close');
    expect(exitCode).toBe(0);
  });

  it('cuts a request that never ends after forceMs', async () => {
    const http = createServer(() => undefined);
    const port = await listen(http);
    const exited = new Promise<number>((done) => {
      const { stop } = installGracefulShutdown(http, { drainMs: 10, forceMs: 100, exit: done });
      void get(port).catch(() => undefined);
      setTimeout(() => void stop(), 30);
    });
    expect(await exited).toBe(0);
  });
});
