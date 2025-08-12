const { DefaultAzureCredential } = require("@azure/identity");
const { BlobServiceClient } = require("@azure/storage-blob");

const MAX_RESULTS = 50;

module.exports = async function (context, req) {
  try {
    const account = process.env.STORAGE_ACCOUNT_NAME;
    const containerName = process.env.CONTAINER_NAME || "json-outbound";

    if (!account) {
      context.res = { status: 500, body: { error: "Missing STORAGE_ACCOUNT_NAME" } };
      return;
    }

    const url = `https://${account}.blob.core.windows.net`;
    const credential = new DefaultAzureCredential();
    const service = new BlobServiceClient(url, credential);
    const container = service.getContainerClient(containerName);

    const items = [];
    for await (const blob of container.listBlobsFlat({ includeMetadata: false })) {
      if (!blob.name.endsWith(".json") || !blob.name.includes("assessment_")) continue;
      items.push({ name: blob.name, lastModified: blob.properties.lastModified });
      if (items.length >= MAX_RESULTS) break;
    }

    items.sort((a, b) => b.name.localeCompare(a.name));
    context.res = { headers: { "Content-Type": "application/json" }, body: { items } };
  } catch (err) {
    context.log.error("List error:", err);
    context.res = { status: 500, body: { error: "List failed", detail: String(err) } };
  }
};
