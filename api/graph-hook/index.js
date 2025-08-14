const { DefaultAzureCredential } = require("@azure/identity");
const { BlobServiceClient } = require("@azure/storage-blob");
const { Client } = require("@microsoft/microsoft-graph-client");

module.exports = async function (context, req) {
  context.log("graph-hook triggered with request:", req.body);

  try {
    // Validate request (basic check for notification)
    if (!req.body || !req.body.value || !Array.isArray(req.body.value)) {
      context.res = { status: 400, body: "Invalid notification payload" };
      return;
    }

    const credential = new DefaultAzureCredential();
    const graphClient = Client.initWithCredential({
      authProvider: (done) => {
        credential.getToken("https://graph.microsoft.com/.default").then((tokenResponse) => {
          done(null, tokenResponse.accessToken);
        }).catch((err) => done(err, null));
      }
    });

    const blobServiceClient = new BlobServiceClient(
      `https://mystroblobstore.blob.core.windows.net`,
      credential
    );
    const containerClient = blobServiceClient.getContainerClient("images-inbound");

    for (const change of req.body.value) {
      if (change.resourceData && change.resourceData["@microsoft.graph.downloadUrl"]) {
        const downloadUrl = change.resourceData["@microsoft.graph.downloadUrl"];
        const fileName = change.resourceData.name || `image-${Date.now()}.jpg`;
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);

        context.log(`Downloading file: ${fileName} from ${downloadUrl}`);
        const response = await fetch(downloadUrl, { headers: { Authorization: `Bearer ${await credential.getToken("https://graph.microsoft.com/.default")}` } });
        const arrayBuffer = await response.arrayBuffer();
        context.log(`Uploading ${arrayBuffer.byteLength} bytes to images-inbound/${fileName}`);
        await blockBlobClient.uploadData(arrayBuffer, {
          blobHTTPHeaders: { blobContentType: response.headers.get("content-type") || "application/octet-stream" }
        });
      }
    }

    context.res = { status: 200, body: "Files processed successfully" };
  } catch (err) {
    context.log.error("Error in graph-hook:", err.message);
    context.res = { status: 500, body: `Error: ${err.message}` };
  }
};
