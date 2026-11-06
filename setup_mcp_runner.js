import { execSync } from "child_process";
import fs from "fs";

console.log("Installing mcp-remote dependencies...");

const pkgJson = {
  "name": "weweb-mcp-runner",
  "type": "module",
  "dependencies": {
    "express": "^4.21.2",
    "open": "^10.1.0",
    "undici": "^7.12.0",
    "mcp-remote": "^0.1.38"
  }
};

fs.writeFileSync("C:/Users/bpupp/.gemini/antigravity/scratch/mcp_runner_pkg.json", JSON.stringify(pkgJson, null, 2));
console.log("Created runner package definition.");
