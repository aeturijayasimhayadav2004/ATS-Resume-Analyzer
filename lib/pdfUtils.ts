"use client";

// Convert the first page of a PDF file to a base64-encoded PNG image
export async function pdfToBase64Image(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");

  // Point the worker at the bundled worker file served from public/
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale: 2.0 }); // 2× for sharper text
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, canvas, viewport }).promise;

  // Strip the "data:image/png;base64," prefix — Gemini wants raw base64
  return canvas.toDataURL("image/png").split(",")[1];
}

// Generate a thumbnail data-URL for preview (smaller scale)
export async function pdfToThumbnail(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale: 0.5 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, canvas, viewport }).promise;

  return canvas.toDataURL("image/png");
}
