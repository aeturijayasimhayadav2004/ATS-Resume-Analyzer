export async function extractTextFromPDF(file: File): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_OCR_API_KEY || "K88899514888957";
  const url = "https://api.ocr.space/parse/image";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("language", "eng");
  formData.append("isOverlayRequired", "false");
  formData.append("filetype", "PDF");
  formData.append("isCreateSearchablePdf", "false");
  formData.append("isSearchablePdfHideTextLayer", "false");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        apikey: apiKey,
      },
      body: formData,
    });

    const data = await response.json();
    
    if (data.IsErroredOnProcessing) {
      throw new Error(data.ErrorMessage?.[0] || "OCR processing failed");
    }

    const text = data.ParsedResults?.map((res: any) => res.ParsedText).join("\n") || "";
    return text;
  } catch (err) {
    console.error("OCR Error:", err);
    throw new Error("Failed to extract text from resume. Ensure it is a valid PDF under 5MB.");
  }
}
