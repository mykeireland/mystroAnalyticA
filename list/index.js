module.exports = async (context, req) => {
  context.res = {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: ["ok"]
  };
};
