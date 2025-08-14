const { DefaultAzureCredential } = require("@azure/identity");
const { BlobServiceClient } = require("@azure/storage-blob");

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
  const log = context.log;

  // Preflight
  if ((req.method || "").toUpperCase() === "OPTIONS") {
    context.res = { status: 204, headers: corsHeaders() };
    return;
  }

  try {
    const account = process.env.STORAGE_ACCOUNT_NAME;
    const containerName = (req.query.container || process.env.CONTAINER_NAME || "json-outbound").toString();

    log("LIST DEBUG: account, container:", account, containerName);
    if (!account) {
      context.res = { status: 500, headers: corsHeaders({ "Content-Type": "application/json" }), body: { error: "Missing STORAGE_ACCOUNT_NAME" } };
      return;
    }

    const credential = new DefaultAzureCredential();
    const service = new BlobServiceClient(`https://${account}.blob.core.windows.net`, credential);
    const container = service.getContainerClient(containerName);

    const exists = await container.exists();
    log("LIST DEBUG: container exists?", exists);
    if (!exists) {
      context.res = { status: 404, headers: corsHeaders({ "Content-Type": "application/json" }), body: { error: "Container not found", account, container: containerName } };
      return;
    }

    const names = [];
    for await (const b of container.listBlobsFlat()) names.push(b.name);

    context.res = {
      status: 200,
      headers: corsHeaders({ "Content-Type": "application/json" }),
      body: names
    };
  } catch (err) {
    log.error("LIST ERROR:", err);
    context.res = { status: 500, headers: corsHeaders({ "Content-Type": "application/json" }), body: { error: "List failed", detail: String(err) } };
  }
};
