import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/** Al crashear la app, toca un archivo que nodemon observa → reinicio automático. */
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const flag = resolve(root, ".nodemon-restart");
writeFileSync(flag, `${Date.now()}\n`, "utf8");
console.log("[nodemon] crash detectado → reiniciando…");
