import { sep } from "node:path";

export function isInsideDir(filePath: string, dir: string): boolean {
  return filePath === dir || filePath.startsWith(dir + sep);
}
