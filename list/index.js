// CommonJS, Node 20 on Azure Functions
const { DefaultAzureCredential } = require("@azure/identity");
const { BlobServiceClient } = require("@azure/storage-blob");

const MAX_RESULTS = 50;

// CORS
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ||
  "https://mystro-sec-endpoint-bjecbgefdbgmhbdv.australiaeast-01.azurewebsites.net";
function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    ...extra
  };
}

module.exports = async function (context, req) {
  if ((req.method || "").toUpperCase() === "OPTIONS") {
    context.res = { status: 204, headers: corsHeaders() };
    return;
  }

  try {
    const account = process.env.STORAGE_ACCOUNT_NAME;
    const containerName = (req.query.container || process.env.CONTAINER_NAME || "json-outbound").toString();

    // TTL in minutes (default 5). Can override via ?maxAgeMinutes=NN
    const ttlMin = Number(req.query.maxAgeMinutes ?? process.env.MAX_AGE_MINUTES ?? 5);
    const cutoff = new Date(Date.now() - ttlMin * 60_000);

    if (!account) {
      context.res = { status: 500, headers: corsHeaders({ "Content-Type": "application/json" }), body: { error: "Missing STORAGE_ACCOUNT_NAME" } };
      return;
    }

    const cred = new DefaultAzureCredential();
    const service = new BlobServiceClient(`https://${account}.blob.core.windows.net`, cred);
    const container = service.getContainerClient(containerName);

    if (!(await container.exists())) {
      context.res = { status: 404, headers: corsHeaders({ "Content-Type": "application/json" }), body: { error: "Container not found", account, container: containerName } };
      return;
    }

    const items = [];
    for await (const blob of container.listBlobsFlat()) {
      const name = blob.name || "";
      const lm = blob.properties.lastModified;
      if (!name.endsWith(".json")) continue;
      if (!name.includes("assessment_")) continue; // keep your dashboard naming rule
      if (!lm || lm < cutoff) continue;            // TTL filter
      items.push({ name, lastModified: lm });
      if (items.length >= MAX_RESULTS) break;
    }

    // newest-first by time (more reliable than lexicographic)
    items.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    context.res = { status: 200, headers: corsHeaders({ "Content-Type": "application/json" }), body: { items } };
  } catch (err) {
    context.log.error("List failed:", err);
    context.res = { status: 500, headers: corsHeaders({ "Content-Type": "application/json" }), body: { error: "List failed", detail: String(err) } };
  }
};
