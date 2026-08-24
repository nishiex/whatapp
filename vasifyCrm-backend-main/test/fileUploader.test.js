"use strict";

const test = require("node:test");
const assert = require("node:assert");

const {
  extractUrl,
  uploadFileToPublicUrl,
  getUploadUrl,
  getFieldName,
} = require("../config/fileUploader");

// ─── extractUrl ────────────────────────────────────────────────────────────

test("extractUrl: returns a bare https URL unchanged", () => {
  assert.strictEqual(extractUrl("https://0x0.st/abc.pdf"), "https://0x0.st/abc.pdf");
});

test("extractUrl: trims wrapping brackets and trailing punctuation", () => {
  assert.strictEqual(extractUrl("<https://0x0.st/abc.pdf>."), "https://0x0.st/abc.pdf");
  assert.strictEqual(extractUrl("(https://0x0.st/abc.pdf)"), "https://0x0.st/abc.pdf");
});

test("extractUrl: pulls the URL out of a noisy multi-line response", () => {
  assert.strictEqual(
    extractUrl("uploaded:\nhttps://0x0.st/xY.pdf\ntoken: abc"),
    "https://0x0.st/xY.pdf"
  );
});

test("extractUrl: returns null when there is no URL", () => {
  assert.strictEqual(extractUrl("error: rate limited"), null);
  assert.strictEqual(extractUrl(""), null);
  assert.strictEqual(extractUrl(null), null);
});

// ─── config helpers ──────────────────────────────────────────────────────────

test("getUploadUrl / getFieldName: honour env with sensible defaults", () => {
  const prevUrl = process.env.FILE_UPLOAD_URL;
  const prevField = process.env.FILE_UPLOAD_FIELD;
  try {
    delete process.env.FILE_UPLOAD_URL;
    delete process.env.FILE_UPLOAD_FIELD;
    assert.strictEqual(getUploadUrl(), "https://catbox.moe/user/api.php");
    assert.strictEqual(getFieldName(), "fileToUpload");

    process.env.FILE_UPLOAD_URL = "https://example.test/up";
    assert.strictEqual(getUploadUrl(), "https://example.test/up");
  } finally {
    if (prevUrl === undefined) delete process.env.FILE_UPLOAD_URL;
    else process.env.FILE_UPLOAD_URL = prevUrl;
    if (prevField === undefined) delete process.env.FILE_UPLOAD_FIELD;
    else process.env.FILE_UPLOAD_FIELD = prevField;
  }
});

// ─── uploadFileToPublicUrl (mocked fetch) ────────────────────────────────────

// Build a fake fetch that answers POST (upload) and GET (reachability check).
function makeFetchStub({ onPost, contentType = "application/pdf" }) {
  return async (url, options = {}) => {
    const method = (options.method || "GET").toUpperCase();
    if (method === "POST") return onPost(url, options);
    // GET → reachability probe
    return {
      ok: true,
      status: 200,
      headers: { get: (h) => (h.toLowerCase() === "content-type" ? contentType : null) },
      text: async () => "%PDF-1.4",
    };
  };
}

test("uploadFileToPublicUrl: rejects an empty buffer", async () => {
  await assert.rejects(
    () => uploadFileToPublicUrl(Buffer.alloc(0), "x.pdf"),
    /non-empty Buffer/
  );
});

test("uploadFileToPublicUrl: returns the parsed URL on success", async () => {
  const original = global.fetch;
  let sentField = null;
  global.fetch = makeFetchStub({
    onPost: async (_url, options) => {
      // The multipart body must carry the configured file field.
      sentField = options.body instanceof FormData ? options.body.has("fileToUpload") : false;
      return { ok: true, status: 200, text: async () => "https://0x0.st/abc.pdf\n" };
    },
  });
  try {
    const { url, contentType } = await uploadFileToPublicUrl(
      Buffer.from("%PDF-1.4 hello"),
      "invoice-1.pdf",
      "application/pdf"
    );
    assert.strictEqual(url, "https://0x0.st/abc.pdf");
    assert.strictEqual(contentType, "application/pdf");
    assert.strictEqual(sentField, true, "multipart body should include fileToUpload field");
  } finally {
    global.fetch = original;
  }
});

test("uploadFileToPublicUrl: retries after a transient failure, then succeeds", async () => {
  const original = global.fetch;
  let postCalls = 0;
  global.fetch = makeFetchStub({
    onPost: async () => {
      postCalls += 1;
      if (postCalls < 2) throw new Error("simulated network reset");
      return { ok: true, status: 200, text: async () => "https://0x0.st/retry.pdf" };
    },
  });
  try {
    const { url } = await uploadFileToPublicUrl(Buffer.from("data"), "r.pdf");
    assert.strictEqual(url, "https://0x0.st/retry.pdf");
    assert.ok(postCalls >= 2, "should have retried at least once");
  } finally {
    global.fetch = original;
  }
});

test("uploadFileToPublicUrl: rejects a non-HTTPS URL from the host", async () => {
  const original = global.fetch;
  global.fetch = makeFetchStub({
    onPost: async () => ({ ok: true, status: 200, text: async () => "http://0x0.st/insecure.pdf" }),
  });
  try {
    await assert.rejects(() => uploadFileToPublicUrl(Buffer.from("x"), "x.pdf"), /failed after 3 attempts/);
  } finally {
    global.fetch = original;
  }
});

test("uploadFileToPublicUrl: fails clearly when the host returns no URL", async () => {
  const original = global.fetch;
  global.fetch = makeFetchStub({
    onPost: async () => ({ ok: false, status: 429, text: async () => "rate limited" }),
  });
  try {
    await assert.rejects(() => uploadFileToPublicUrl(Buffer.from("x"), "x.pdf"), /failed after 3 attempts/);
  } finally {
    global.fetch = original;
  }
});
