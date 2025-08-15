module.exports = async function (context, event) {
  context.log("✅ Event Grid trigger received:", JSON.stringify(event));

  // Optional: extract blob info and call your AI API
};
