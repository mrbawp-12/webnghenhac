const { getStore } = require("@netlify/blobs");

const uploadsStore = getStore("uploads", { consistency: "strong" });

function response(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers,
    body,
    isBase64Encoded: true,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET" && event.httpMethod !== "HEAD") {
    return response(405, Buffer.from("Method not allowed").toString("base64"), {
      "content-type": "text/plain; charset=utf-8",
      allow: "GET, HEAD",
    });
  }

  const key = event.queryStringParameters?.key;

  if (!key) {
    return response(400, Buffer.from("Missing key").toString("base64"), { "content-type": "text/plain; charset=utf-8" });
  }

  const entry = await uploadsStore.getWithMetadata(key, { type: "arrayBuffer" });
  if (!entry) {
    return response(404, Buffer.from("Not found").toString("base64"), { "content-type": "text/plain; charset=utf-8" });
  }

  const mimeType = entry.metadata?.mimeType || "application/octet-stream";
  const base64 = Buffer.from(entry.data).toString("base64");

  return response(200, base64, {
    "content-type": mimeType,
    "x-content-type-options": "nosniff",
    "cache-control": "public, max-age=31536000, immutable",
  });
};