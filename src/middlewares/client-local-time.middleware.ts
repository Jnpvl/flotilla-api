import type { NextFunction, Request, Response } from "express";
import { clientTimeContext } from "../utils/client-time-context.js";
import { resolveClientLocalWallClock } from "../utils/local-datetime.js";

export function clientLocalTimeMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const localWallClock = resolveClientLocalWallClock(
    req.headers["x-client-local-time"],
  );

  clientTimeContext.run({ localWallClock }, () => {
    const release = () => {
      res.removeListener("finish", release);
      res.removeListener("close", release);
    };
    res.on("finish", release);
    res.on("close", release);
    next();
  });
}
