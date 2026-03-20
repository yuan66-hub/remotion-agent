'use client';

import { useState, useCallback } from 'react';
import { useEditorStore } from '@/stores/editorStore';

interface UploadZoneProps {
  onUploadComplete?: (videoData: {
    id: string;
    url: string;
    duration: number;
    width: number;
    height: number;
  }) => void;
}

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setVideo } = useEditorStore();

  const handleUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/video/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();

      setVideo({
        id: data.id,
        name: file.name,
        url: data.url,
        duration: data.duration,
        width: data.width,
        height: data.height,
      });

      onUploadComplete?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [setVideo, onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      handleUpload(file);
    } else {
      setError('Please upload a video file (MP4, MOV, or WebM)');
    }
  }, [handleUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  }, [handleUpload]);

  return (
    <div
      className={`relative flex flex-col items-center justify-center h-full min-h-[300px] border-2 border-dashed rounded-lg transition-colors ${
        isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {isUploading ? (
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-gray-600">Uploading video...</p>
        </div>
      ) : (
        <>
          <svg
            className="w-16 h-16 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="mt-4 text-lg text-gray-600">
            Drag and drop your video here
          </p>
          <p className="mt-1 text-sm text-gray-500">
            or click to browse
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Supported formats: MP4, MOV, WebM
          </p>
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </>
      )}

      {error && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
