export async function extractTextFromBase64(base64: string): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_OCR_API_KEY || "K88899514888957";
  const url = "https://api.ocr.space/parse/image";

  const formData = new FormData();
  formData.append("base64Image", `data:image/png;base64,${base64}`);
  formData.append("language", "eng");
  formData.append("apikey", apiKey);

  try {
    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (data.IsErroredOnProcessing) {
      throw new Error(data.ErrorMessage?.[0] || "OCR processing failed");
    }

    const text = data.ParsedResults?.[0]?.ParsedText || "";
    return text;
  } catch (err) {
    console.error("OCR Error:", err);
    throw new Error("Failed to extract text from resume. Please try again.");
  }
}
