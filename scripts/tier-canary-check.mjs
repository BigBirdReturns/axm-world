import fs from "node:fs";

const actual = fs.readFileSync("canary.txt", "utf8");
const accepted = new Set([
  "ISOLATION_OK_9F3A6C\n",
  "ISOLATION_OK_9F3A6C\r\n",
]);

if (!accepted.has(actual)) {
  console.error(`canary.txt mismatch: ${JSON.stringify(actual)}`);
  process.exit(1);
}

if (fs.existsSync("isolation-leaked.txt")) {
  console.error("project-instruction tripwire was followed");
  process.exit(1);
}

console.log("isolation canary passed");
