"use strict";

/**
 * Centralized public file uploader.
 *
 * Uploads a Buffer to a public file host (default https://catbox.moe) and
 * returns a validated, publicly-reachable HTTPS URL. The WhatsApp document flow
 * (AOC portal) requires media to be delivered as a public HTTP(S) link, so
 * invoice PDFs are uploaded here first.
 *
 * Configuration (env):
 *   FILE_UPLOAD_URL    upload endpoint            (default catbox.moe api)
 *   FILE_UPLOAD_FIELD  multipart file field name  (default "fileToUpload")
 *
 * Behaviour:
 *   - POSTs multipart/form-data with the correct field name.
 *   - Retries the upload up to MAX_ATTEMPTS times with linear back-off.
 *   - Each network call is bounded by a timeout (AbortController).
 *   - Parses the response safely: extracts the first http(s) URL and trims
 *     stray wrapping characters.
 *   - Validates the returned URL is HTTPS and confirms it is reachable.
 *   - Logs are sanitized (no secrets are handled in this module).
 */

// The public file host. catbox.moe is used because 0x0.st disabled uploads.
// Both share the same multipart API (reqtype=fileupload + fileToUpload), so
// FILE_UPLOAD_URL can point at either without code changes.
const DEFAULT_UPLOAD_URL = "https://catbox.moe/user/api.php";
const DEFAULT_FIELD_NAME = "fileToUpload";

const MAX_ATTEMPTS = 3;
const UPLOAD_TIMEOUT_MS = 10_000;
const REACHABLE_TIMEOUT_MS = 10_000;
const REACHABLE_ATTEMPTS = 2;

// Many file hosts reject requests without a User-Agent with HTTP 403.
// Sending a real one is required for uploads to succeed.
const USER_AGENT = "VasifyCRM/1.0 (+https://www.vasifytech.com)";

const getUploadUrl = () => process.env.FILE_UPLOAD_URL || DEFAULT_UPLOAD_URL;
const getFieldName = () => process.env.FILE_UPLOAD_FIELD || DEFAULT_FIELD_NAME;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Extract the first http(s) URL from a host response, trimming wrapping chars
 * such as <>, () and trailing punctuation.
 * @param {string} responseText
 * @returns {string|null}
 */
function extractUrl(responseText) {
  if (!responseText) return null;
  const match = String(responseText).match(/https?:\/\/[^\s'")>\]]+/i);
  if (!match) return null;
  return match[0].replace(/^[<(]+|[>)\].,;:]+$/g, "").trim();
}

/** fetch() wrapper that aborts after `timeoutMs`. */
async function fetchWithTimeout(url, options = {}, timeoutMs = UPLOAD_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Confirm a URL is reachable (HTTP 2xx). Retries briefly to absorb the short
 * delay some hosts have between accepting an upload and serving the file.
 * @returns {Promise<{ ok: boolean, status: number, contentType: string, error?: string }>}
 */
async function verifyReachable(url) {
  let last = { ok: false, status: 0, contentType: "", error: "not attempted" };
  for (let attempt = 1; attempt <= REACHABLE_ATTEMPTS; attempt++) {
    try {
      const res = await fetchWithTimeout(
        url,
        { method: "GET", headers: { "User-Agent": USER_AGENT } },
        REACHABLE_TIMEOUT_MS
      );
      last = {
        ok: res.ok,
        status: res.status,
        contentType: res.headers.get("content-type") || "",
      };
      if (res.ok) return last;
    } catch (err) {
      last = { ok: false, status: 0, contentType: "", error: err.message };
    }
    if (attempt < REACHABLE_ATTEMPTS) await sleep(400 * attempt);
  }
  return last;
}

/**
 * Upload a buffer to the configured public file host.
 *
 * @param {Buffer} buffer            file contents
 * @param {string} filename          suggested file name (e.g. "invoice-123.pdf")
 * @param {string} [mimeType]        content type (default "application/octet-stream")
 * @returns {Promise<{ url: string, contentType: string }>} validated public URL
 * @throws {Error} if the upload fails after all retries or validation fails
 */
async function uploadFileToPublicUrl(buffer, filename, mimeType = "application/octet-stream") {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("uploadFileToPublicUrl: a non-empty Buffer is required");
  }

  const endpoint = getUploadUrl();
  const field = getFieldName();
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const form = new FormData();
      form.append("reqtype", "fileupload");
      form.append(field, new Blob([buffer], { type: mimeType }), filename);

      const res = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: { "User-Agent": USER_AGENT },
        body: form,
      });

      const text = (await res.text()).trim();

      if (!res.ok) {
        throw new Error(`upload host returned HTTP ${res.status}: ${text.slice(0, 200)}`);
      }

      const url = extractUrl(text);
      if (!url) {
        throw new Error(`no URL found in upload response: "${text.slice(0, 200)}"`);
      }
      if (!/^https:\/\//i.test(url)) {
        throw new Error(`upload host returned a non-HTTPS URL: ${url}`);
      }

      const reach = await verifyReachable(url);
      if (!reach.ok) {
        throw new Error(
          `uploaded URL not reachable (status ${reach.status}${reach.error ? `, ${reach.error}` : ""}): ${url}`
        );
      }

      console.log(
        `[fileUploader] Uploaded "${filename}" (${buffer.length} bytes) -> ${url} ` +
          `[attempt ${attempt}/${MAX_ATTEMPTS}, content-type: ${reach.contentType || "unknown"}]`
      );
      return { url, contentType: reach.contentType };
    } catch (err) {
      lastError = err;
      console.warn(`[fileUploader] Upload attempt ${attempt}/${MAX_ATTEMPTS} failed: ${err.message}`);
      if (attempt < MAX_ATTEMPTS) await sleep(500 * attempt);
    }
  }

  throw new Error(
    `File upload failed after ${MAX_ATTEMPTS} attempts: ${lastError ? lastError.message : "unknown error"}`
  );
}

module.exports = {
  uploadFileToPublicUrl,
  verifyReachable,
  extractUrl,
  getUploadUrl,
  getFieldName,
};
