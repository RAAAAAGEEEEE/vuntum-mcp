import type { Server } from 'node:http';

/**
 * Orderly stop of the HTTP server on SIGTERM.
 *
 * nginx always tries the main port first and never replays a POST it has
 * already sent. Cutting the process at once therefore answered 502 to a
 * request sent to the old container at the instant it stopped. The stop is
 * done in three steps:
 *   1. keep answering for `drainMs`, each response carrying `Connection:
 *      close`, so nginx stops reusing connections to this process and its idle
 *      ones (nginx closes them after 4 s) are gone;
 *   2. stop listening: a newcomer is refused before anything is sent, which
 *      nginx does replay on the relay;
 *   3. let the requests in progress finish, then exit (`forceMs` at most).
 */
export interface ShutdownOptions {
  drainMs?: number;
  forceMs?: number;
  exit?: (code: number) => void;
  log?: (message: string) => void;
}

export function installGracefulShutdown(
  http: Server,
  options: ShutdownOptions = {},
): { isDraining: () => boolean; stop: () => Promise<void> } {
  const drainMs = options.drainMs ?? 5000;
  const forceMs = options.forceMs ?? 12_000;
  const exit = options.exit ?? ((code: number) => process.exit(code));
  const log = options.log ?? (() => undefined);
  let draining = false;
  let stopping: Promise<void> | null = null;

  // Runs before the application listener: a handler that answers synchronously (404, 405, 429)
  // has already sent its headers when a later listener runs, and setHeader would then throw
  // ERR_HTTP_HEADERS_SENT and kill the process in the middle of the drain.
  // The MCP transport also passes `Connection: keep-alive` to writeHead, which would win over
  // setHeader: drop it so the connection really closes.
  http.prependListener('request', (_req, res) => {
    if (!draining) return;
    res.setHeader('Connection', 'close');
    const writeHead = res.writeHead.bind(res) as (...args: unknown[]) => typeof res;
    res.writeHead = ((status: number, ...rest: unknown[]) => {
      for (const part of rest) {
        if (part && typeof part === 'object' && !Array.isArray(part)) {
          for (const key of Object.keys(part)) {
            if (key.toLowerCase() === 'connection') delete (part as Record<string, unknown>)[key];
          }
        }
      }
      return writeHead(status, ...rest);
    }) as typeof res.writeHead;
  });

  const stop = (): Promise<void> => {
    stopping ??= (async () => {
      draining = true;
      log('draining');
      await new Promise((done) => setTimeout(done, drainMs));
      const closed = new Promise<void>((done) => http.close(() => done()));
      http.closeIdleConnections();
      const forced = new Promise<void>((done) =>
        setTimeout(() => {
          http.closeAllConnections();
          done();
        }, forceMs).unref(),
      );
      await Promise.race([closed, forced]);
      log('stopped');
      exit(0);
    })();
    return stopping;
  };

  return { isDraining: () => draining, stop };
}
