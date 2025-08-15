module.exports = async function (context, eventGridEvent) {
  const eventData = eventGridEvent.data;
  const blobUrl = eventData.url;

  context.log("📦 New blob created:", blobUrl);

  // Optional: parse blob name if needed
  const blobName = blobUrl.split('/').pop();

  // TODO: Add logic to:
  // - Download the blob
  // - Send it to your AI endpoint
  // - Upload the resulting JSON to json-outbound

  context.done();
};
