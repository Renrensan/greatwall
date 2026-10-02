/**
 * Client-side image compression utility.
 * Resizes images to a maximum dimension (default: 1600px) and converts to standard JPEG.
 * This reduces 10-25MB camera uploads down to ~150-350KB, ensuring fast mobile uploads,
 * avoiding serverless/axum body limits, and standardizing format for OCR compatibility.
 */

export interface CompressImageOptions {
  maxDimension?: number;
  quality?: number;
  outputType?: string;
  outputFileName?: string;
}

export async function compressImageFile(
  file: File,
  options: CompressImageOptions = {}
): Promise<File> {
  const {
    maxDimension = 1600,
    quality = 0.82,
    outputType = "image/jpeg",
    outputFileName = "ktp.jpg",
  } = options;

  // If the file is not an image, return original
  if (!file.type.startsWith("image/") && !file.name.toLowerCase().match(/\.(jpg|jpeg|png|webp|heic|heif)$/)) {
    return file;
  }

  try {
    const bitmap = await loadImageToCanvas(file);
    if (!bitmap) {
      return file;
    }

    const { width, height } = calculateDimensions(
      bitmap.width,
      bitmap.height,
      maxDimension
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return file;
    }

    // Ensure white background in case of transparent PNGs
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    ctx.drawImage(bitmap.source, 0, 0, width, height);

    // Clean up temporary image/bitmap resources
    bitmap.cleanup();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), outputType, quality);
    });

    if (!blob) {
      return file;
    }

    return new File([blob], outputFileName, {
      type: outputType,
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn("[imageCompression] Failed to compress image, using original:", err);
    return file;
  }
}

interface LoadedBitmap {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
}

async function loadImageToCanvas(file: File): Promise<LoadedBitmap | null> {
  // Method 1: Try createImageBitmap (modern, high-performance, auto-handles EXIF orientation)
  if (typeof window !== "undefined" && "createImageBitmap" in window) {
    try {
      const imgBitmap = await createImageBitmap(file);
      return {
        source: imgBitmap,
        width: imgBitmap.width,
        height: imgBitmap.height,
        cleanup: () => {
          try {
            imgBitmap.close();
          } catch (_) {}
        },
      };
    } catch (_) {
      // Fallback to HTMLImageElement if createImageBitmap fails
    }
  }

  // Method 2: Fallback to HTMLImageElement
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      resolve({
        source: img,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        cleanup: () => {
          URL.revokeObjectURL(url);
        },
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
}

function calculateDimensions(
  srcWidth: number,
  srcHeight: number,
  maxDimension: number
): { width: number; height: number } {
  let width = srcWidth;
  let height = srcHeight;

  if (width > maxDimension || height > maxDimension) {
    if (width >= height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  return { width, height };
}
