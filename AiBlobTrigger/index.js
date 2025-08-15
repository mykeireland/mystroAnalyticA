const axios = require("axios");
const { BlobServiceClient } = require("@azure/storage-blob");

module.exports = async function (context, inputBlob) {
  const fileName = context.bindingData.name;
  context.log(`🔔 New image blob detected: ${fileName}`);

  const base64Image = inputBlob.toString("base64");

  const requestBody = {
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant that analyzes room equipment photos and returns structured assessment results."
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Please analyze the following image and return room assessment information as structured JSON."
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`
            }
          }
        ]
      }
    ],
    temperature: 0.3,
    max_tokens: 1000,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    tools: [],
    tool_choice: "none"
  };

  try {
    const aiResponse = await axios.post(
      "https://mykei-mdd1avar-australiaeast.services.ai.azure.com/models/chat/completions?api-version=2024-05-01-preview",
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.AZURE_OPENAI_API_KEY
        }
      }
    );

    const result = aiResponse.data;
    const output = JSON.stringify(result, null, 2);

    const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AzureWebJobsStorage);
    const containerClient = blobServiceClient.getContainerClient("json-outbound");
    await containerClient.uploadBlockBlob(`${fileName}.json`, output, Buffer.byteLength(output));

    context.log(`✅ AI result saved to json-outbound/${fileName}.json`);
  } catch (err) {
    context.log.error("❌ AI processing error:", err.message);
  }
};
