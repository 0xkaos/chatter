
export async function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function convertPdfToImages(file: File): Promise<string[]> {
  // Dynamic import to avoid SSR issues
  const pdfjsLib = await import('pdfjs-dist');
  
  // Set worker
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    // Use unpkg or cdnjs. Note: .mjs extension for newer versions
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const images: string[] = [];

  // Limit to 10 pages to prevent overload
  const maxPages = Math.min(pdf.numPages, 10);

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (context) {
      await page.render({ canvasContext: context, viewport }).promise;
      images.push(canvas.toDataURL('image/jpeg', 0.8));
    }
  }

  return images;
}
