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
  ".svg": "image/svg+xml"
};

module.exports = async function (context, req) {
  context.log("Request URL:", req.url);
  try {
    let rel = (req.params?.path || "").replace(/^\//, "");
    if (!rel || rel.endsWith("/")) rel = "index.html";
    const filePath = path.join(__dirname, rel);
    context.log("Attempting to serve file:", filePath);

    if (!filePath.startsWith(__dirname)) {
      context.log.error("Path traversal attempt detected:", filePath);
      context.res = { status: 400, body: "Bad path" };
      return;
    }

    let data;
    try {
      data = await fs.readFile(filePath);
      context.log("File read successfully:", rel);
    } catch (err) {
      context.log.error("File read failed:", err.message);
      context.res = { status: 404, body: `Not found: ${rel}` };
      return;
    }

    const ext = path.extname(rel).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";
    const headers = {
      "Content-Type": contentType,
      "Cache-Control": contentType.startsWith("text/html") ? "no-store" : "public, max-age=31536000, immutable"
    };

    context.res = { status: 200, headers, body: data };
  } catch (err) {
    context.log.error("Unexpected error:", err.message);
    context.res = { status: 500, body: "Server error" };
  }
};
