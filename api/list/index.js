// CommonJS. Node 20 on Azure Functions.
const { DefaultAzureCredential } = require("@azure/identity");
const { BlobServiceClient } = require("@azure/storage-blob");

const MAX_RESULTS = 50;

// CORS
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://mystro-sec-endpoint-bjecbgefdbgmhbdv.australiaeast-01.azurewebsites.net";
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
  // Preflight
  if ((req.method || "").toUpperCase() === "OPTIONS") {
    context.res = { status: 204, headers: corsHeaders() };
    return;
  }

  try {
    const account = process.env.STORAGE_ACCOUNT_NAME;
    const containerName = (req.query.container || process.env.CONTAINER_NAME || "json-outbound").toString();

    if (!account) {
      context.res = { status: 500, headers: corsHeaders({ "Content-Type": "application/json" }), body: { error: "Missing STORAGE_ACCOUNT_NAME" } };
      return;
    }

    const cred = new DefaultAzureCredential();
    const service = new BlobServiceClient(`https://${account}.blob.core.windows.net`, cred);
    const container = service.getContainerClient(containerName);

    if (!(await container.exists())) {
      context.res = {
        status: 404,
        headers: corsHeaders({ "Content-Type": "application/json" }),
        body: { error: "Container not found", account, container: containerName }
      };
      return;
    }

    const items = [];
    for await (const blob of container.listBlobsFlat()) {
      const name = blob.name || "";
      if (!name.endsWith(".json") || !name.includes("assessment_")) continue;
      items.push({ name, lastModified: blob.properties.lastModified });
      if (items.length >= MAX_RESULTS) break;
    }

    // newest-first by name (your naming already sorts lexicographically)
    items.sort((a, b) => (b.name || "").localeCompare(a.name || ""));

    context.res = { status: 200, headers: corsHeaders({ "Content-Type": "application/json" }), body: { items } };
  } catch (err) {
    context.log.error("List failed:", err);
    context.res = {
      status: 500,
      headers: corsHeaders({ "Content-Type": "application/json" }),
      body: { error: "List failed", detail: String(err) }
    };
  }
};
