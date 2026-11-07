import https from "https";
import fs from "fs";
import path from "path";

const TARBALL_URL = "https://registry.npmjs.org/mcp-remote/-/mcp-remote-0.1.38.tgz";
const OUT_FILE = "C:/Users/bpupp/.gemini/antigravity/scratch/mcp-remote.tgz";

console.log("Downloading mcp-remote tarball...");
const file = fs.createWriteStream(OUT_FILE);

https.get(TARBALL_URL, (response) => {
  response.pipe(file);
  file.on("finish", () => {
    file.close(() => {
      console.log("Downloaded mcp-remote.tgz successfully!");
    });
  });
}).on("error", (err) => {
  fs.unlink(OUT_FILE, () => {});
  console.error("Download error:", err.message);
});
