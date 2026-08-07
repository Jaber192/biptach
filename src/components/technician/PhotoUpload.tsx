import { useRef, useState } from "react";
import { Camera, X, Loader2 } from "lucide-react";

interface PhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  max?: number;
}

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.7;

/**
 * Compress an image file using the Canvas API.
 * Resizes to MAX_DIMENSION on the longest side and exports as JPEG.
 * A typical 10 MB phone photo becomes ~200-400 KB.
 */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;

        // Scale down if either dimension exceeds MAX_DIMENSION
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);

        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        resolve(dataUrl);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for compression"));
    };
    img.src = url;
  });
}

export function PhotoUpload({ photos, onChange, max = 6 }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Number of placeholder tiles shown in the grid while photos are compressing
  const [pendingCount, setPendingCount] = useState(0);
  const replaceIndexRef = useRef<number | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const replaceIdx = replaceIndexRef.current;
    replaceIndexRef.current = null;

    if (replaceIdx !== null) {
      // Replace mode: compress one file and swap it into the existing slot.
      // Show a placeholder tile in that slot while compressing.
      setPendingCount(1);
      try {
        const compressed = await compressImage(files[0]);
        const updated = [...photos];
        updated[replaceIdx] = compressed;
        onChange(updated);
      } catch (err) {
        console.error("Photo compression failed:", err);
      }
      setPendingCount(0);
      return;
    }

    // Add mode: append new photos. Show one placeholder tile per pending photo.
    const remaining = max - photos.length;
    if (remaining <= 0) return;

    const toProcess = Array.from(files).slice(0, remaining);
    setPendingCount(toProcess.length);

    try {
      const newPhotos: string[] = [];
      for (const file of toProcess) {
        const compressed = await compressImage(file);
        newPhotos.push(compressed);
        // Remove one placeholder as each photo finishes
        setPendingCount((p) => Math.max(0, p - 1));
      }
      onChange([...photos, ...newPhotos]);
    } catch (err) {
      console.error("Photo compression failed:", err);
    }
    setPendingCount(0);
  }

  function removeAt(index: number) {
    onChange(photos.filter((_, i) => i !== index));
  }

  function triggerReplace(index: number) {
    replaceIndexRef.current = index;
    inputRef.current?.click();
  }

  const isBusy = pendingCount > 0;
  // Total tiles to render: existing photos + placeholders, capped at max
  const placeholderTiles = Math.min(pendingCount, max - photos.length);

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, i) => (
          <div
            key={i}
            className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
          >
            <img src={photo} alt={`Job photo ${i + 1}`} className="h-full w-full object-cover" />

            {/* Delete button — always visible on touch, hover on desktop */}
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label={`Remove photo ${i + 1}`}
              className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-red-600/90 text-white shadow-sm sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Replace button — always visible on touch, hover on desktop */}
            <button
              type="button"
              onClick={() => triggerReplace(i)}
              aria-label={`Replace photo ${i + 1}`}
              className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/70 text-white shadow-sm sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
        ))}

        {/* Placeholder tiles shown while photos are being compressed */}
        {Array.from({ length: placeholderTiles }).map((_, i) => (
          <div
            key={`pending-${i}`}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-primary-300 bg-primary-50/50 dark:border-primary-800 dark:bg-primary-950/30"
          >
            <Loader2 className="h-6 w-6 animate-spin text-primary-600 dark:text-primary-400" />
            <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
              Compressing…
            </span>
          </div>
        ))}

        {photos.length + placeholderTiles < max && (
          <button
            type="button"
            onClick={() => {
              replaceIndexRef.current = null;
              inputRef.current?.click();
            }}
            disabled={isBusy}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-slate-300 text-slate-500 transition-colors hover:border-primary-400 hover:text-primary-600 disabled:opacity-60 dark:border-slate-700 dark:text-slate-400 dark:hover:border-primary-700 dark:hover:text-primary-400"
          >
            <Camera className="h-6 w-6" />
            <span className="text-xs font-medium">Add photo</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        {photos.length} of {max} photos · Tap ✕ to delete, 📷 to retake
      </p>
    </div>
  );
}
