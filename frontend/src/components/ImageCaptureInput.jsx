// Save as: src/components/ImageCaptureInput.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/*
 * Photos are shrunk in the browser before they are uploaded.
 * Phone photos are often 3-8 MB, which is over PHP's default 2 MB upload limit and the
 * API's 5 MB rule (that is what made the request fail with a 422), and far more than
 * a catalog thumbnail needs.
 */
const MAX_SIDE = 1280; // longest edge in pixels
const JPEG_QUALITY = 0.85;
const KEEP_AS_IS_UNDER = 400 * 1024; // small files are sent untouched
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // keep in step with the API rule (max:5120)

function loadImage(file) {
  // createImageBitmap applies the photo's rotation (EXIF) for us
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file, { imageOrientation: "from-image" }).catch(() =>
      loadWithImageElement(file)
    );
  }
  return loadWithImageElement(file);
}

function loadWithImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The browser could not read this image."));
    };
    img.src = url;
  });
}

/** Returns a smaller JPEG File, or the original file if it is already small or cannot be read. */
async function optimizeImage(file) {
  if (!file || !file.type.startsWith("image/")) return file;

  try {
    const source = await loadImage(file);
    const width = source.naturalWidth || source.width;
    const height = source.naturalHeight || source.height;
    const scale = Math.min(1, MAX_SIDE / Math.max(width, height));

    if (scale === 1 && file.size <= KEEP_AS_IS_UNDER) {
      source.close?.();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);

    const context = canvas.getContext("2d");
    // Flatten transparency (PNG/WebP), otherwise it turns black in a JPEG
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    source.close?.();

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );

    if (!blob || (scale === 1 && blob.size >= file.size)) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn("Photo shrinking skipped:", err);
    return file;
  }
}

/**
 * ImageCaptureInput
 * Local file upload and live camera snapshot, with automatic photo shrinking.
 *
 * @param {Function}  onImageSelected  Called with the File, or null when the photo is removed
 * @param {File|null} value            Optional. Pass the form's current image so the preview
 *                                     clears when the form resets. Leave out to let the
 *                                     component keep its own state.
 * @param {String}    currentImageUrl  Optional URL of an already-saved image (edit screens)
 */
export default function ImageCaptureInput({ onImageSelected, value, currentImageUrl }) {
  const isControlled = value !== undefined;
  const [localFile, setLocalFile] = useState(null);
  const [hideExisting, setHideExisting] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [processing, setProcessing] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const streamRef = useRef(null);

  const file = isControlled ? value : localFile;

  const previewUrl = useMemo(
    () => (file instanceof File ? URL.createObjectURL(file) : null),
    [file]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const preview = previewUrl || (hideExisting ? null : currentImageUrl) || null;

  const select = (newFile) => {
    setLocalFile(newFile);
    setHideExisting(false);
    onImageSelected?.(newFile);
  };

  // Stop the camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Attach the stream once the <video> element exists
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraActive]);

  // 1. Upload from the gallery, or the phone's camera app (both inputs end up here)
  const handleFileChange = async (e) => {
    const picked = e.target.files?.[0];
    e.target.value = ""; // lets the same file be picked again
    if (!picked) return;

    setProcessing(true);
    try {
      const ready = await optimizeImage(picked);

      if (ready.size > MAX_UPLOAD_BYTES) {
        toast.error("That photo is too large, even after shrinking. Please choose a smaller one.");
        return;
      }

      select(ready);
    } finally {
      setProcessing(false);
    }
  };

  // 2. Live camera. Browsers only allow it on https:// or localhost, so on a plain
  //    http:// address (for example the PC's IP on the local network) the phone's own
  //    camera app is opened instead.
  const liveCameraSupported =
    typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  const startCamera = async () => {
    if (!liveCameraSupported) {
      cameraInputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // rear camera on phones and tablets
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      setIsCameraActive(true);
    } catch (err) {
      console.error("Camera access failed:", err);
      toast.error("Unable to access the camera. Check the browser permission, or use Upload Photo.");
    }
  };

  // 3. Snapshot from the live video
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const capturedFile = new File([blob], `photo_${Date.now()}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        select(capturedFile);
        stopCamera();
      },
      "image/jpeg",
      0.9
    );
  };

  // 4. Remove the photo
  const clearImage = () => {
    setLocalFile(null);
    setHideExisting(true);
    onImageSelected?.(null);
  };

  return (
    <div className="space-y-1.5 min-w-0 w-full">
      <label className="text-xs font-semibold text-muted-foreground block">
        Item / Product Photo
      </label>

      {/* Hidden inputs: gallery, and the phone's camera app */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/jpg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Hidden canvas for the video snapshot */}
      <canvas ref={canvasRef} className="hidden" />

      {isCameraActive ? (
        /* LIVE CAMERA */
        <div className="relative rounded-xl overflow-hidden border border-border bg-black flex flex-col items-center shadow-2xs">
          <video ref={videoRef} autoPlay playsInline className="w-full max-h-60 object-cover" />
          <div className="absolute bottom-3 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={capturePhoto}
              className="text-xs gap-1.5 h-8 shadow-2xs"
            >
              <Camera className="h-3.5 w-3.5" />
              Snap Photo
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={stopCamera}
              className="text-xs h-8 shadow-2xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : processing ? (
        /* SHRINKING */
        <div className="flex items-center gap-2 text-xs text-muted-foreground h-8">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Preparing photo...
        </div>
      ) : preview ? (
        /* PREVIEW */
        <div className="relative size-28 rounded-xl border border-border bg-muted/40 overflow-hidden group shadow-2xs">
          <img src={preview} alt="Item Preview" className="size-full object-cover" />
          <button
            type="button"
            onClick={clearImage}
            className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90 transition-colors"
            title="Remove Photo"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        /* CHOOSE */
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs gap-1.5 h-8 border-border bg-card shadow-2xs"
            >
              <Upload className="h-3.5 w-3.5 text-muted-foreground" />
              Upload Photo
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={startCamera}
              className="text-xs gap-1.5 h-8 border-border bg-card shadow-2xs"
            >
              <Camera className="h-3.5 w-3.5 text-primary" />
              Take Photo
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            JPG, PNG or WebP. Large photos are resized automatically.
          </p>
        </div>
      )}
    </div>
  );
}