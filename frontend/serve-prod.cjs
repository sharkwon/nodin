const http = require("http");
const fs = require("fs");
const path = require("path");

const DIST = path.join(__dirname, "dist");
const PORT = 5173;
const API_TARGET = "http://localhost:3000";

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  const url = req.url || "/";

  // API proxy
  if (url.startsWith("/api/")) {
    const isSSE = url.includes("/stream");
    const headers = { ...req.headers, host: "localhost:3000" };
    if (isSSE) {
      headers["accept"] = "text/event-stream";
    }
    const proxyReq = http.request(
      API_TARGET + url,
      { method: req.method, headers },
      (proxyRes) => {
        // For SSE: disable buffering, keep connection alive
        if (isSSE) {
          res.writeHead(proxyRes.statusCode || 200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          });
          res.flushHeaders?.();
        } else {
          res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
        }
        proxyRes.pipe(res);
      }
    );
    proxyReq.on("error", () => {
      res.writeHead(502);
      res.end("Bad Gateway");
    });
    req.pipe(proxyReq);
    return;
  }

  // Static files
  let filePath = path.join(DIST, url === "/" ? "index.html" : url);
  if (!fs.existsSync(filePath)) {
    // SPA fallback
    filePath = path.join(DIST, "index.html");
  }

  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`NODIN prod server on :${PORT}`);
});
