"use client";

import type React from "react";
import { useState, useRef } from "react";
import { useCRM } from "@/contexts/crm-context";
import { getAuthToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Upload, FileSpreadsheet, Download, CheckCircle2,
  AlertCircle, X, Loader2, FileWarning,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BulkUploadLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SkippedRow { row: number; reason: string }
interface UploadResult { created: number; skipped: SkippedRow[]; totalRows: number }

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://crm-api.vasifytech.com/api";

export function BulkUploadLeadsDialog({ open, onOpenChange }: BulkUploadLeadsDialogProps) {
  const { refreshLeads } = useCRM();

  const [file,        setFile]        = useState<File | null>(null);
  const [uploading,   setUploading]   = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [result,      setResult]      = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setUploading(false);
    setError(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    // If an import actually happened, make sure the leads list reflects it
    // even if the user closes the dialog before clicking "Done".
    if (result && result.created > 0) void refreshLeads();
    reset();
    onOpenChange(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setError(null);
    setResult(null);
    if (!f) { setFile(null); return; }
    if (!/\.(xlsx|xls|csv)$/i.test(f.name)) {
      setError("Please choose a .xlsx, .xls, or .csv file.");
      setFile(null);
      return;
    }
    setFile(f);
  };

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/leads/bulk-upload/template`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to download template");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "leads-upload-template.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Template download failed:", err);
      setError("Couldn't download the template. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/leads/bulk-upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }, // no Content-Type — browser sets the multipart boundary
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || "Upload failed. Please check your file and try again.");
        return;
      }

      setResult({
        created: data.created ?? 0,
        skipped: data.skipped ?? [],
        totalRows: data.totalRows ?? 0,
      });

      if ((data.created ?? 0) > 0) {
        await refreshLeads();
      }
    } catch (err) {
      console.error("Bulk upload failed:", err);
      setError("Something went wrong uploading the file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else onOpenChange(o); }}>
      <DialogContent className="max-w-md rounded-2xl border border-gray-200 shadow-xl p-0 gap-0">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <DialogTitle className="text-base font-semibold text-gray-900">
              Bulk Upload Leads
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400 mt-0.5">
              Import many leads at once from an Excel or CSV file.
            </DialogDescription>
          </div>
          <button
            type="button" onClick={handleClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mt-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Template download */}
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-blue-50 border border-blue-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileSpreadsheet className="h-4 w-4 text-blue-500 shrink-0" />
              <p className="text-xs text-blue-700 font-medium leading-snug">
                Not sure of the format? Download a starter template.
              </p>
            </div>
            <Button
              type="button" variant="outline" size="sm" onClick={handleDownloadTemplate}
              disabled={downloading}
              className="h-8 px-3 text-xs font-semibold rounded-lg border-blue-200 text-blue-700 hover:bg-blue-100 shrink-0"
            >
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            </Button>
          </div>

          {/* File picker */}
          {!result && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
                id="bulk-lead-file"
              />
              <label
                htmlFor="bulk-lead-file"
                className={cn(
                  "flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors",
                  file ? "border-blue-300 bg-blue-50/40" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                <Upload className={cn("h-6 w-6", file ? "text-blue-500" : "text-gray-300")} />
                {file ? (
                  <p className="text-sm font-semibold text-blue-700 px-4 text-center truncate max-w-full">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-600">Click to choose a file</p>
                    <p className="text-xs text-gray-400">.xlsx, .xls, or .csv — up to 5MB</p>
                  </>
                )}
              </label>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 px-3.5 py-3 rounded-xl">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}

          {/* Result summary */}
          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 text-sm text-green-700 bg-green-50 border border-green-200 px-3.5 py-3 rounded-xl">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="font-semibold">
                  Imported {result.created} of {result.totalRows} lead{result.totalRows !== 1 ? "s" : ""}
                </span>
              </div>

              {result.skipped.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
                  <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-amber-200">
                    <FileWarning className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                      {result.skipped.length} row{result.skipped.length !== 1 ? "s" : ""} skipped
                    </p>
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-amber-100">
                    {result.skipped.map((s, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 px-3.5 py-2 text-xs">
                        <span className="text-amber-800 font-semibold shrink-0">Row {s.row}</span>
                        <span className="text-amber-600 text-right truncate">{s.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            {!result ? (
              <>
                <Button type="button" variant="outline" onClick={handleClose} disabled={uploading}
                  className="flex-1 h-9 rounded-xl border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancel
                </Button>
                <Button type="button" onClick={handleUpload} disabled={!file || uploading}
                  className="flex-1 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
                  {uploading ? (
                    <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />Uploading…</span>
                  ) : "Upload"}
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={reset}
                  className="flex-1 h-9 rounded-xl border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Upload Another
                </Button>
                <Button type="button" onClick={handleClose}
                  className="flex-1 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
                  Done
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}