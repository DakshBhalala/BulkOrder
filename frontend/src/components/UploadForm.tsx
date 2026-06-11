"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api, type UploadResponse } from "@/lib/api";

export function UploadForm({
  onUploadComplete,
}: {
  onUploadComplete: (result: UploadResponse) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith(".csv")) {
      setError("Please upload a CSV file.");
      return;
    }
    setFile(f);
    setError(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile]
  );

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const result = await api.uploadOrders(file);
      onUploadComplete(result);
      setFile(null);
      toast.success("CSV Uploaded Successfully", {
        description: `Imported ${result.valid_rows} valid orders out of ${result.total_rows} total rows.`
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
      toast.error("Upload Failed", { description: msg });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Drop Zone */}
      <div
        className={`
          relative border border-dashed rounded-2xl p-12 text-center cursor-pointer shadow-sm
          transition-all duration-300
          ${
            isDragging
              ? "border-primary bg-primary/5"
              : file
              ? "border-primary bg-primary/5 shadow-md"
              : "border-border hover:border-primary/50 hover:bg-muted/50"
          }
        `}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />

        {file ? (
          <div>
            <svg className="w-14 h-14 mx-auto text-primary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-foreground font-semibold text-lg">{file.name}</p>
            <p className="text-muted-foreground text-sm mt-1">
              {(file.size / 1024).toFixed(1)} KB — Ready to upload
            </p>
          </div>
        ) : (
          <div>
            <svg className="w-14 h-14 mx-auto text-muted-foreground/50 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-foreground font-semibold text-lg">
              Drop your CSV file here
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              or click to browse — Required columns: order_id, product_name, quantity, customer_name
            </p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 bg-destructive/5 border border-destructive/20 text-destructive rounded-lg p-3 text-sm animate-scale-in">
          {error}
        </div>
      )}

      {/* Upload Button */}
      {file && (
        <div className="flex justify-end gap-3 mt-8 animate-slide-up">
          <Button
            variant="outline"
            onClick={() => { setFile(null); setError(null); }}
            className="rounded-full px-6"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={isUploading}
            className="rounded-full px-8 shadow-sm"
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Uploading...
              </span>
            ) : (
              "Import Orders"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
