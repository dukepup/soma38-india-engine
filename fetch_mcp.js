import https from "https";

console.log("Fetching mcp-remote package from npm...");

https.get("https://registry.npmjs.org/mcp-remote/latest", (res) => {
  let body = "";
  res.on("data", chunk => body += chunk);
  res.on("end", () => {
    try {
      const data = JSON.parse(body);
      console.log("mcp-remote latest version:", data.version);
      console.log("tarball URL:", data.dist.tarball);
    } catch (e) {
      console.error("Parse error:", e.message);
    }
  });
}).on("error", e => console.error(e));
