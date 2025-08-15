module.exports = async function (context, event) {
  context.log("✅ Event Grid trigger received event:");
  context.log(JSON.stringify(event, null, 2));

  const url = event.data?.url || "No URL provided";
  const eventType = event.eventType || "Unknown event type";

  context.log(`👉 Event Type: ${eventType}`);
  context.log(`📂 Blob URL: ${url}`);

  // Just return for now — add AI processing later
  context.done();
};
