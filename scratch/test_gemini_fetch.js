async function testGemini() {
  const apiKey = "AIzaSyCcI9S4YlrAV9TsynXwsIG_cyAE1weaCgk";
  const model = "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: "Hello" }] }]
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    console.log("Response Status:", response.status);
    console.log("Response Body:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

testGemini();
