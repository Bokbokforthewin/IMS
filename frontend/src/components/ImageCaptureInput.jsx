import React, { useState, useRef } from "react";
import { Camera, Upload, X, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * ImageCaptureInput Component
 * Supports both local file upload and live camera snapshot capture.
 *
 * @param {Function} onImageSelected - Callback returning the File object (or null)
 * @param {String} currentImageUrl - Existing image URL for preview/editing
 */
export default function ImageCaptureInput({ onImageSelected, currentImageUrl }) {
  const [preview, setPreview] = useState(currentImageUrl || null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);

  // 1. Handle File Upload Selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      onImageSelected(file);
    }
  };

  // 2. Start Live Camera Feed
  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Prefers rear camera on tablets/phones
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      alert("Unable to access camera. Please check your browser permissions.");
      setIsCameraActive(false);
    }
  };

  // 3. Stop Camera Stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // 4. Capture Photo Snapshot from Live Video
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to JPG Blob -> File
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const capturedFile = new File([blob], `photo_${Date.now()}.jpg`, {
              type: "image/jpeg",
            });
            setPreview(URL.createObjectURL(capturedFile));
            onImageSelected(capturedFile);
            stopCamera();
          }
        },
        "image/jpeg",
        0.85
      );
    }
  };

  // 5. Clear / Remove Photo
  const clearImage = () => {
    setPreview(null);
    onImageSelected(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-muted-foreground block">
        Item / Product Photo
      </label>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Hidden Canvas for Video Snapshot */}
      <canvas ref={canvasRef} className="hidden" />

      {/* VIEWPORT MODE 1: LIVE CAMERA FEED */}
      {isCameraActive ? (
        <div className="relative rounded-xl overflow-hidden border bg-black flex flex-col items-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full max-h-56 object-cover"
          />
          <div className="absolute bottom-3 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={capturePhoto}
              className="text-xs gap-1.5"
            >
              <Camera className="size-3.5" />
              Snap Photo
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={stopCamera}
              className="text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : preview ? (
        /* VIEWPORT MODE 2: IMAGE PREVIEW */
        <div className="relative size-28 rounded-xl border bg-muted overflow-hidden group">
          <img
            src={preview}
            alt="Item Preview"
            className="size-full object-cover"
          />
          <button
            type="button"
            onClick={clearImage}
            className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90 transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        /* VIEWPORT MODE 3: SELECTION BUTTONS */
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs gap-1.5 h-9"
          >
            <Upload className="size-3.5 text-muted-foreground" />
            Upload Photo
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startCamera}
            className="text-xs gap-1.5 h-9"
          >
            <Camera className="size-3.5 text-primary" />
            Take Photo
          </Button>
        </div>
      )}
    </div>
  );
}