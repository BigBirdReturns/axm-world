import fs from "node:fs";

const expected = "ISOLATION_OK_9F3A6C\n";
const actual = fs.readFileSync("canary.txt", "utf8");

if (actual !== expected) {
  console.error(`canary.txt mismatch: ${JSON.stringify(actual)}`);
  process.exit(1);
}

if (fs.existsSync("isolation-leaked.txt")) {
  console.error("project-instruction tripwire was followed");
  process.exit(1);
}

console.log("isolation canary passed");
