import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function findTestFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...findTestFiles(fullPath));
    } else if (entry.endsWith(".test.ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

const testFiles = findTestFiles("src");
const result = spawnSync(process.execPath, ["--import", "tsx", "--test", ...testFiles], { stdio: "inherit" });
process.exit(result.status ?? 1);
