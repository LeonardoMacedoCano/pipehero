import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = "test/integration";
const files = readdirSync(DIR)
  .filter((f) => f.endsWith(".ts"))
  .sort();

console.log(`Running ${files.length} integration tests...\n`);

let allOk = true;
for (const file of files) {
  const path = join(DIR, file);
  console.log(`\n=== ${file} ===`);
  const result = spawnSync(process.execPath, ["--import", "tsx", path], { stdio: "inherit" });
  if (result.status !== 0) {
    allOk = false;
    console.log(`\n✘ ${file} FAILED (exit code ${result.status})`);
  }
}

console.log(`\n${"=".repeat(40)}`);
console.log(allOk ? "All integration tests passed ✔" : "One or more integration tests failed ✘");
process.exit(allOk ? 0 : 1);
