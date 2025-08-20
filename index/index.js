// CommonJS – Node 20 on Azure Functions
const { promises: fs } = require("fs");
const path = require("path");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

const NO_STORE = new Set([".html", ".css", ".js"]); // ensure new CSS/JS loads

module.exports = async function (context, req) {
  try {
    let rel = (req.params?.path || "").replace(/^\//, "");
    if (!rel || rel === "" || rel === "index") rel = "index.html";

    const resolved = path.resolve(path.join(__dirname, rel));

    // Block traversal
    if (!resolved.startsWith(path.resolve(__dirname))) {
      context.res = { status: 400, body: "Bad request" };
      return;
    }

    let data;
    try {
      data = await fs.readFile(resolved);
    } catch {
      context.res = { status: 404, body: `Not found: ${rel}` };
      return;
    }

    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";

    const headers = {
      "Content-Type": contentType,
      "Cache-Control": NO_STORE.has(ext)
        ? "no-store"
        : "public, max-age=31536000, immutable"
    };

    context.res = { status: 200, headers, body: data };
  } catch (err) {
    context.log.error("Unhandled error:", err);
    context.res = { status: 500, body: "Server error" };
  }
};
