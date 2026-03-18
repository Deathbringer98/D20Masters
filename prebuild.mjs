import { copyFileSync } from "fs";
copyFileSync("index.template.html", "index.html");
console.log("✅  index.html restored from template for Vite build.");
