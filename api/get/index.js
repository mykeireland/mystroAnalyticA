const { DefaultAzureCredential } = require("@azure/identity");
const { BlobServiceClient } = require("@azure/storage-blob");

module.exports = async function (context, req) {
  try {
    const account = process.env.STORAGE_ACCOUNT_NAME;
    const containerName = process.env.CONTAINER_NAME || "json-outbound";
    const name = (req.query.name || "").toString();

    if (!account) {
      context.res = { status: 500, body: { error: "Missing STORAGE_ACCOUNT_NAME" } };
      return;
    }
    if (!name) {
      context.res = { status: 400, body: { error: "Missing query parameter 'name'" } };
      return;
    }

    const url = `https://${account}.blob.core.windows.net`;
    const credential = new DefaultAzureCredential();
    const service = new BlobServiceClient(url, credential);
    const container = service.getContainerClient(containerName);
    const blob = container.getBlobClient(name);

    const props = await blob.getProperties();
    const download = await blob.download();
    const text = await streamToString(download.readableStreamBody);

    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    context.res = {
      headers: { "Content-Type": "application/json" },
      body: { lastModified: props.lastModified, name, data: json }
    };
  } catch (err) {
    context.log.error("Get error:", err);
    context.res = { status: 500, body: { error: "Get failed", detail: String(err) } };
  }
};

function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", d => chunks.push(Buffer.from(d)));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stream.on("error", reject);
  });
}
