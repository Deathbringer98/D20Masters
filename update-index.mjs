// Runs automatically after `npm run build` via the postbuild hook.
// Reads dist/index.html, rewrites asset paths to /dist/assets/..., and
// copies it to the root index.html so GitHub Pages (branch mode) always
// serves the freshest built bundle.
import { readFileSync, writeFileSync } from "fs";

const AMP_SCRIPT = '    <script async custom-element="amp-auto-ads" src="https://cdn.ampproject.org/v0/amp-auto-ads-0.1.js"></script>';
const AMP_TAG = '    <amp-auto-ads type="adsense" data-ad-client="ca-pub-7133328677668199"></amp-auto-ads>';

let dist = readFileSync("dist/index.html", "utf8");
if (!dist.includes("amp-auto-ads")) {
	dist = dist.replace("</head>", AMP_SCRIPT + "\n  </head>");
	dist = dist.replace("<body>", "<body>\n" + AMP_TAG);
	writeFileSync("dist/index.html", dist, "utf8");
}
const updated = dist.replace(/\/(assets\/)/g, "/dist/$1");
writeFileSync("index.html", updated, "utf8");
console.log("✅  root index.html updated with current build hashes.");
