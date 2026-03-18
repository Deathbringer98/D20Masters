// Runs automatically after `npm run build` via the postbuild hook.
// Reads dist/index.html, rewrites asset paths to /dist/assets/..., and
// copies it to the root index.html so GitHub Pages (branch mode) always
// serves the freshest built bundle.
import { readFileSync, writeFileSync } from "fs";

const dist = readFileSync("dist/index.html", "utf8");
const updated = dist.replace(/\/(assets\/)/g, "/dist/$1");
writeFileSync("index.html", updated, "utf8");
console.log("✅  root index.html updated with current build hashes.");
