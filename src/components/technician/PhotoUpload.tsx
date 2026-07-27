import { useRef } from "react";
import { Camera, X } from "lucide-react";

interface PhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  max?: number;
}

export function PhotoUpload({ photos, onChange, max = 6 }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = max - photos.length;
    if (remaining <= 0) return;

    const toRead = Array.from(files).slice(0, remaining);
    Promise.all(
      toRead.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          }),
      ),
    ).then((newPhotos) => {
      onChange([...photos, ...newPhotos]);
    });
  }

  function removeAt(index: number) {
    onChange(photos.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, i) => (
          <div
            key={i}
            className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
          >
            <img src={photo} alt={`Job photo ${i + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label={`Remove photo ${i + 1}`}
              className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}

        {photos.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-slate-300 text-slate-500 transition-colors hover:border-primary-400 hover:text-primary-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-primary-700 dark:hover:text-primary-400"
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
        {photos.length} of {max} photos
      </p>
    </div>
  );
}
