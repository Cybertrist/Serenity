// Refreshes the CSP hashes of setup.html: its one <style> and its one <script> are allowed by
// their SHA-256 only, so any edit to either needs new hashes. Run: node src/setup-csp.js
"use strict";

const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const file = path.join(__dirname, "setup.html");
const html = fs.readFileSync(file, "utf8");
const block = (tag) => {
  const match = html.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  if (!match) throw new Error(`no <${tag}> in setup.html`);
  return `sha256-${createHash("sha256").update(match[1], "utf8").digest("base64")}`;
};
const csp = html.replace(
  /style-src '[^']*'; script-src '[^']*'/,
  `style-src '${block("style")}'; script-src '${block("script")}'`,
);
fs.writeFileSync(file, csp);
console.log("setup.html: CSP hashes updated");
