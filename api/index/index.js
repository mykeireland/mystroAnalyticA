const fs = require("fs");
const path = require("path");

module.exports = async function (context, req) {
  const fileMap = {
    "/": "index.html",
    "/styles.css": "styles.css",
    "/script.js": "script.js",
  };

  const filePath = fileMap[req.url.replace(/^.*\/api/, "")] || "index.html";
  const fullPath = path.join(__dirname, filePath);

  try {
    const content = fs.readFileSync(fullPath, "utf8");
    const ext = path.extname(filePath).toLowerCase();

    const contentType = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "application/javascript",
    }[ext] || "text/plain";

    context.res = {
      headers: { "Content-Type": contentType },
      body: content,
    };
  } catch (err) {
    context.res = {
      status: 404,
      body: "File not found",
    };
  }
};
