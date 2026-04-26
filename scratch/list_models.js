const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
  const apiKey = "AIzaSyCcI9S4YlrAV9TsynXwsIG_cyAE1weaCgk"; // From .env.local
  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    const result = await genAI.listModels();
    console.log("Available Models:");
    result.models.forEach((m) => {
      console.log(`${m.name} - ${m.supportedMethods.join(", ")}`);
    });
  } catch (err) {
    console.error("Error listing models:", err);
  }
}

listModels();
