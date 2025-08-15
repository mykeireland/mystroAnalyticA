const fs = require("fs").promises;
const path = require("path");

module.exports = async function (context, req) {
  const filePath = path.join(__dirname, "../index/index.html"); // Adjust path as needed

  try {
    const html = await fs.readFile(filePath, "utf8");
    context.res = {
      status: 200,
      headers: {
        "Content-Type": "text/html"
      },
      body: html
    };
  } catch (err) {
    context.log.error("❌ Failed to read index.html", err);
    context.res = {
      status: 500,
      body: "Failed to load page"
    };
  }
};
