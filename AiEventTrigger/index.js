module.exports = async function (context, event) {
  context.log("[AiEventTrigger] Received event:", event);

  // Optional: log out blob URL if available
  if (event?.data?.url) {
    context.log("📂 Blob URL:", event.data.url);
  }

  context.done();
};
