import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "public");
const MIME = { ".html":"text/html; charset=utf-8", ".js":"application/javascript; charset=utf-8", ".css":"text/css; charset=utf-8",
               ".json":"application/json; charset=utf-8", ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".svg":"image/svg+xml" };

export default async function (context, req) {
  try {
    let rel = (req.params?.path || "").replace(/^\//, "");
    if (!rel || rel.endsWith("/")) rel += "index.html";
    const filePath = path.join(PUBLIC, rel);
    if (!filePath.startsWith(PUBLIC)) { context.res = { status: 400, body: "Bad path" }; return; }
    let data;
    try { data = await fs.readFile(filePath); }
    catch { data = await fs.readFile(path.join(PUBLIC, "index.html")); }
    const ext = path.extname(rel).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";
    const headers = { "Content-Type": contentType,
      "Cache-Control": contentType.startsWith("text/html") ? "no-store" : "public, max-age=31536000, immutable" };
    context.res = { status: 200, headers, body: data };
  } catch {
    context.res = { status: 404, body: "Not found" };
  }
}
