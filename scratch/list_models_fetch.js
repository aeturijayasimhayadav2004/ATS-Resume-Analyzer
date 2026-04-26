async function listModels() {
  const apiKey = "AIzaSyCcI9S4YlrAV9TsynXwsIG_cyAE1weaCgk";
  const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log("Response Body:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

listModels();
