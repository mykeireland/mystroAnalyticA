module.exports = async function (context, req) {
  context.log("✅ Home function HIT");
  context.res = {
    status: 200,
    headers: { "Content-Type": "text/plain" },
    body: "Home function successfully triggered"
  };
};
