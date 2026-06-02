import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const apiKey = process.env.OCR_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OCR service not configured" }, { status: 500 });
  }

  const ocrForm = new FormData();
  ocrForm.append("file", file);
  ocrForm.append("language", "eng");
  ocrForm.append("isOverlayRequired", "false");
  ocrForm.append("filetype", "PDF");
  ocrForm.append("isCreateSearchablePdf", "false");
  ocrForm.append("isSearchablePdfHideTextLayer", "false");

  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: { apikey: apiKey },
    body: ocrForm,
  });

  const data = await response.json();

  if (data.IsErroredOnProcessing) {
    return NextResponse.json(
      { error: data.ErrorMessage?.[0] || "OCR processing failed" },
      { status: 500 }
    );
  }

  const text: string =
    data.ParsedResults?.map((r: { ParsedText: string }) => r.ParsedText).join("\n") || "";

  return NextResponse.json({ text });
}
