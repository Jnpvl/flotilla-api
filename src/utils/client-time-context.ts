import { AsyncLocalStorage } from "node:async_hooks";
import {
  nowLocalWallClock,
  resolveClientLocalWallClock,
} from "./local-datetime.js";

type ClientTimeStore = {
  localWallClock: string;
};

export const clientTimeContext = new AsyncLocalStorage<ClientTimeStore>();

export function getClientLocalWallClock(): string {
  return (
    clientTimeContext.getStore()?.localWallClock ?? nowLocalWallClock()
  );
}

export function runWithClientLocalTime<T>(
  headerValue: string | string[] | undefined,
  fn: () => T,
): T {
  const localWallClock = resolveClientLocalWallClock(headerValue);
  return clientTimeContext.run({ localWallClock }, fn);
}
