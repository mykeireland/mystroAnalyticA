// CommonJS. Node 20 on Azure Functions.
const { DefaultAzureCredential } = require("@azure/identity");
const { BlobServiceClient } = require("@azure/storage-blob");

const ALLOWED_ORIGIN =
  process.env.ALLOWED_ORIGIN ||
  "https://mystro-sec-endpoint-bjecbgefdbgmhbdv.australiaeast-01.azurewebsites.net";

// CORS helper
function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    ...extra,
  };
}

module.exports = async function (context, req) {
  const log = context.log;

  // Preflight check
  if ((req.method || "").toUpperCase() === "OPTIONS") {
    context.res = { status: 204, headers: corsHeaders() };
    return;
  }

  try {
    const account = process.env.STORAGE_ACCOUNT_NAME;
    const containerName = (
      req.query.container ||
      process.env.CONTAINER_NAME ||
      "json-outbound"
    ).toString();
    const name = (req.query.name || "").toString();

    log("GET DEBUG: Incoming request", { account, containerName, name });

    if (!account) {
      context.res = {
        status: 500,
        headers: corsHeaders({ "Content-Type": "application/json" }),
        body: { error: "Missing STORAGE_ACCOUNT_NAME" },
      };
      return;
    }

    if (!name) {
      context.res = {
        status: 400,
        headers: corsHeaders({ "Content-Type": "application/json" }),
        body: { error: "Missing query parameter 'name'" },
      };
      return;
    }

    const cred = new DefaultAzureCredential();
    const service = new BlobServiceClient(
      `https://${account}.blob.core.windows.net`,
      cred
    );
    const container = service.getContainerClient(containerName);

    if (!(await container.exists())) {
      context.res = {
        status: 404,
        headers: corsHeaders({ "Content-Type": "application/json" }),
        body: { error: "Container not found", account, container: containerName },
      };
      return;
    }

    const blob = container.getBlobClient(name);
    if (!(await blob.exists())) {
      context.res = {
        status: 404,
        headers: corsHeaders({ "Content-Type": "application/json" }),
        body: { error: "Blob not found", name },
      };
      return;
    }

    const props = await blob.getProperties();
    const dl = await blob.download();
    const text = await streamToString(dl.readableStreamBody);

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      parsed = { raw: text };
    }

    context.res = {
      status: 200,
      headers: corsHeaders({ "Content-Type": "application/json" }),
      body: {
        lastModified: props.lastModified,
        name,
        data: parsed,
      },
    };
  } catch (err) {
    log.error("GET ERROR:", err);
    context.res = {
      status: 500,
      headers: corsHeaders({ "Content-Type": "application/json" }),
      body: { error: "Get failed", detail: String(err) },
    };
  }
};

// Helper to consume a stream into a string
function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (d) => chunks.push(Buffer.from(d)));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stream.on("error", reject);
  });
}
