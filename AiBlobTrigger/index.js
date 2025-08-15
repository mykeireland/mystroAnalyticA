module.exports = async function (context, req) {
  const events = req.body;

  for (const event of events) {
    if (event.eventType === "Microsoft.Storage.BlobCreated") {
      const blobUrl = event.data.url;
      context.log("New blob created at:", blobUrl);
      
      // Optionally: extract container + filename and call your AI
    }
  }

  context.res = {
    status: 200,
    body: "Event received"
  };
};
