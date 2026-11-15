import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

const local = resolve("public");
const fromRepo = resolve("../../apps/app/public");
for (const name of ["demo", "ilustracoes"]) {
  const dest = resolve(local, name);
  if (existsSync(dest)) continue;
  const source = resolve(fromRepo, name);
  if (!existsSync(source)) throw Error(`No asset directory: ${source}`);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(source, dest, { recursive: true });
}
