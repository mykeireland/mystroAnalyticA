module.exports = async function (context, req) {
  context.log("✅ Home function HIT");
  context.res = {
    status: 302,
    headers: {
      Location: "/static/index"
    }
  };
};
