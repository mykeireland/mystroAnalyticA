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
  ".ico": "image/x-icon"
};

module.exports = async function (context, req) {
  context.log("Request URL:", req.url);

  try {
    // Determine relative file path
    let rel = (req.params?.path || "").replace(/^\//, "");
    if (!rel || rel === "" || rel === "index") rel = "index.html";
    
    const filePath = path.join(__dirname, rel);
    context.log("Resolved file path:", filePath);

    // Security: Prevent path traversal
    if (!filePath.startsWith(__dirname)) {
      context.log.error("Blocked path traversal:", filePath);
      context.res = { status: 400, body: "Bad request" };
      return;
    }

    // Try reading the file
    let data;
    try {
      data = await fs.readFile(filePath);
      context.log("File served:", rel);
    } catch (err) {
      context.log.error("File not found:", rel);
      context.res = { status: 404, body: `Not found: ${rel}` };
      return;
    }

    // Determine content type
    const ext = path.extname(rel).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";

    // Set cache headers
    const headers = {
      "Content-Type": contentType,
      "Cache-Control": contentType.includes("text/html")
        ? "no-store"
        : "public, max-age=31536000, immutable"
    };

    context.res = {
      status: 200,
      headers,
      body: data
    };

  } catch (err) {
    context.log.error("Unhandled error:", err.message);
    context.res = { status: 500, body: "Server error" };
  }
};
