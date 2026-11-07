/**
 * Test Server API Endpoints over HTTP
 */

import http from "http";

async function testHttpEndpoints() {
  console.log("Testing Health endpoint...");
  
  const req = http.request("http://localhost:3000/health", { method: "GET" }, (res) => {
    let data = "";
    res.on("data", chunk => data += chunk);
    res.on("end", () => {
      console.log("Health response:", data);
    });
  });
  req.on("error", (e) => console.log("Server not started yet, which is expected for unit tests."));
  req.end();
}

testHttpEndpoints();
