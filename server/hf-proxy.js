// Minimal Hugging Face proxy to avoid browser CORS.
// Run: node server/hf-proxy.js
// Env:
// - HUGGINGFACE_API_TOKEN (preferred)
// - EXPO_PUBLIC_HUGGINGFACE_API_TOKEN (fallback for local dev)
// - HF_INFERENCE_BASE_URL (optional; defaults to router.huggingface.co)
// - AI_PROXY_PORT (default 8787)

const http = require("http");
const fs = require("fs");
const path = require("path");
const { InferenceClient } = require("@huggingface/inference");

function loadDotEnvIfPresent() {
  try {
    const envPath = path.resolve(__dirname, "..", ".env");
    if (!fs.existsSync(envPath)) return;

    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!key) continue;
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

loadDotEnvIfPresent();

const PORT = Number(process.env.AI_PROXY_PORT || 8787);
const TOKEN =
  (process.env.HUGGINGFACE_API_TOKEN || "").trim() ||
  (process.env.EXPO_PUBLIC_HUGGINGFACE_API_TOKEN || "").trim();

const ENDPOINT_URL = (
  process.env.HF_INFERENCE_ENDPOINT_URL ||
  process.env.HUGGINGFACE_INFERENCE_ENDPOINT_URL ||
  process.env.HF_INFERENCE_BASE_URL ||
  process.env.HUGGINGFACE_INFERENCE_BASE_URL ||
  ""
).trim();

const VISION_PROVIDER = (process.env.HF_VISION_PROVIDER || "publicai").trim();
const VISION_MODEL = (process.env.HF_VISION_MODEL || "allenai/Molmo2-8B").trim();

const PROMPT_CAPTION =
  "You are a task assistant. Based on the image, suggest up to 3 tasks the user should create. " +
  "Return ONLY a JSON array of objects in this exact shape: [{\"title\":\"...\",\"category\":\"Personal|Academic|Health|Finance|Work|General\"}]. " +
  "Titles must be imperative actions (e.g., \"Do laundry\", \"Wash the dishes\"). " +
  "Do NOT describe the image or mention \"photo\"/\"picture\". Do NOT add explanations or markdown. " +
  "Only suggest tasks that are strongly implied by the image; if you are not confident, return []. " +
  "Examples: if you see a laundry hamper/clothes -> [{\"title\":\"Do laundry\",...}]. If you see dirty dishes/sink -> [{\"title\":\"Wash the dishes\",...}].";
const PROMPT_OCR =
  "Extract any text you can read from the image. " +
  "Return ONLY a JSON object of the exact form: {\"text\":\"...\"}. " +
  "If there is no readable text, return {\"text\":\"\"}. " +
  "Do not add explanations, markdown, or extra keys.";

const ALLOWED_CATEGORIES = new Map([
  ["personal", "Personal"],
  ["academic", "Academic"],
  ["health", "Health"],
  ["finance", "Finance"],
  ["work", "Work"],
  ["general", "General"],
]);

function stripCodeFences(text) {
  return String(text || "")
    .replace(/^```[a-zA-Z]*\s*/m, "")
    .replace(/```\s*$/m, "")
    .trim();
}

function extractJsonArray(text) {
  const s = String(text || "");
  const start = s.indexOf("[");
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

function normalizeCategory(raw) {
  const key = String(raw || "").trim().toLowerCase();
  return ALLOWED_CATEGORIES.get(key) || "General";
}

function isBadTaskTitle(title) {
  const t = String(title || "").trim().toLowerCase();
  if (!t) return true;
  if (t.startsWith("a ") || t.startsWith("an ") || t.startsWith("the ")) return true;
  if (t.includes("photo") || t.includes("picture") || t.includes("image")) return true;
  return false;
}

function titleCase(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

function postProcessSuggestions(suggestions) {
  if (!Array.isArray(suggestions)) return [];
  const lowerTitles = suggestions.map((s) => String(s?.title || "").toLowerCase());
  const hasDishes = lowerTitles.some((t) => t.includes("dish") || t.includes("dishes") || t.includes("sink"));
  if (!hasDishes) return suggestions;
  return suggestions.filter((s) => {
    const t = String(s?.title || "").toLowerCase();
    return !(t.includes("meal") || t.includes("cook") || t.includes("cooking") || t.includes("prepare") || t.includes("recipe"));
  });
}

function sanitizeTaskSuggestions(text) {
  const raw = stripCodeFences(text);
  const jsonCandidate = extractJsonArray(raw);
  if (!jsonCandidate) return [];

  try {
    const data = JSON.parse(jsonCandidate);
    if (!Array.isArray(data)) return [];

    const out = [];
    for (const item of data) {
      const titleRaw = typeof item?.title === "string" ? item.title.trim() : "";
      if (titleRaw.length < 3 || titleRaw.length > 80) continue;
      if (isBadTaskTitle(titleRaw)) continue;

      out.push({
        title: titleCase(titleRaw),
        category: normalizeCategory(item?.category),
      });
      if (out.length >= 3) break;
    }

    return postProcessSuggestions(out);
  } catch {
    return [];
  }
}

function send(res, status, obj, extraHeaders) {
  const body = typeof obj === "string" ? obj : JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": typeof obj === "string" ? "text/plain" : "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    ...(extraHeaders || {}),
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

function base64ToBuffer(base64) {
  // Accept raw base64 or data URL
  const s = String(base64 || "");
  const comma = s.indexOf(",");
  const raw = comma >= 0 ? s.slice(comma + 1) : s;
  return Buffer.from(raw, "base64");
}

function bufferToArrayBuffer(buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function serializeInferenceError(err) {
  const status = Number(err?.httpResponse?.status) || 500;
  const body = err?.httpResponse?.body;
  const message = err?.message ? String(err.message) : String(err);

  const asString = (() => {
    try {
      return typeof body === "string" ? body : JSON.stringify(body);
    } catch {
      return typeof body === "string" ? body : "";
    }
  })();

  const hint =
    status === 404
      ?
        "If you're seeing 404 from router.huggingface.co, your token likely lacks Inference Providers access. " +
        "Create a fine-grained token with 'Make calls to Inference Providers' permission and set HUGGINGFACE_API_TOKEN / EXPO_PUBLIC_HUGGINGFACE_API_TOKEN."
      : null;

  return {
    status,
    body: {
      error: message,
      ...(asString ? { details: asString } : {}),
      ...(hint ? { hint } : {}),
    },
  };
}

async function hfImageToText({ model, imageBase64 }) {
  if (!TOKEN) {
    return { ok: false, status: 500, body: { error: "Missing HUGGINGFACE_API_TOKEN" } };
  }
  if (!model) {
    return { ok: false, status: 400, body: { error: "Missing model" } };
  }
  if (!imageBase64) {
    return { ok: false, status: 400, body: { error: "Missing imageBase64" } };
  }

  const client = new InferenceClient(TOKEN, ENDPOINT_URL ? { endpointUrl: ENDPOINT_URL } : undefined);
  const imageBytes = base64ToBuffer(imageBase64);
  const imageArrayBuffer = bufferToArrayBuffer(imageBytes);

  try {
    const out = await client.imageToText({
      model,
      provider: "hf-inference",
      data: imageArrayBuffer,
    });

    return { ok: true, status: 200, body: out };
  } catch (err) {
    const mapped = serializeInferenceError(err);
    return { ok: false, status: mapped.status, body: mapped.body };
  }
}

function normalizeImageDataUrl(imageBase64) {
  const s = String(imageBase64 || "").trim();
  if (!s) return "";
  if (s.startsWith("data:image/")) return s;
  return `data:image/jpeg;base64,${s}`;
}

async function hfVisionChat({ prompt, imageBase64 }) {
  if (!TOKEN) {
    return { ok: false, status: 500, body: { error: "Missing HUGGINGFACE_API_TOKEN" } };
  }
  if (!imageBase64) {
    return { ok: false, status: 400, body: { error: "Missing imageBase64" } };
  }

  const client = new InferenceClient(TOKEN, ENDPOINT_URL ? { endpointUrl: ENDPOINT_URL } : undefined);
  const imageUrl = normalizeImageDataUrl(imageBase64);
  if (!imageUrl) {
    return { ok: false, status: 400, body: { error: "Missing imageBase64" } };
  }

  try {
    const out = await client.chatCompletion({
      provider: VISION_PROVIDER,
      model: VISION_MODEL,
      max_tokens: 160,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
    });

    const content = out?.choices?.[0]?.message?.content;
    const text = typeof content === "string" ? content : "";

    return {
      ok: true,
      status: 200,
      body: {
        generated_text: text,
      },
    };
  } catch (err) {
    const mapped = serializeInferenceError(err);
    return { ok: false, status: mapped.status, body: mapped.body };
  }
}

function extractJsonObjectString(maybeText) {
  const s = String(maybeText || "").trim();
  if (!s) return "";
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start < 0 || end <= start) return "";
  return s.slice(start, end + 1);
}

async function hfVisionOcr({ imageBase64 }) {
  const base = await hfVisionChat({ prompt: PROMPT_OCR, imageBase64 });
  if (!base.ok) return base;

  const raw = base.body?.generated_text;
  const jsonStr = extractJsonObjectString(raw);
  if (!jsonStr) {
    return { ok: true, status: 200, body: { generated_text: "" } };
  }
  try {
    const parsed = JSON.parse(jsonStr);
    const text = typeof parsed?.text === "string" ? parsed.text : "";
    return { ok: true, status: 200, body: { generated_text: text } };
  } catch {
    return { ok: true, status: 200, body: { generated_text: "" } };
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    return send(res, 204, "", {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    });
  }

  if (req.method !== "POST") return send(res, 404, { error: "Not found" });

  if (req.url !== "/caption" && req.url !== "/ocr") {
    return send(res, 404, { error: "Not found" });
  }

  try {
    const payload = await readJson(req);
    const imageBase64 = payload.imageBase64;

    // Guard against tiny/invalid images causing hallucinated tasks.
    if (req.url === "/caption") {
      const bytes = base64ToBuffer(imageBase64);
      if (!bytes || bytes.length < 750) {
        return send(res, 200, { generated_text: "[]" });
      }
    }

    // Prefer vision chat-completion model (Inference Providers supported).
    // Legacy image-to-text models may not be available on Inference Providers.
    const result =
      req.url === "/ocr"
        ? await hfVisionOcr({ imageBase64 })
        : await hfVisionChat({ prompt: PROMPT_CAPTION, imageBase64 });

    if (req.url === "/caption" && result?.ok) {
      const suggestions = sanitizeTaskSuggestions(result.body?.generated_text);
      return send(res, 200, { generated_text: JSON.stringify(suggestions) });
    }

    return send(res, result.status, result.body);
  } catch (e) {
    return send(res, 500, { error: String(e && e.message ? e.message : e) });
  }
});

server.listen(PORT, () => {
  console.log(`[hf-proxy] listening on http://localhost:${PORT}`);
  console.log(`[hf-proxy] token present: ${Boolean(TOKEN)}`);
  if (ENDPOINT_URL) console.log(`[hf-proxy] endpointUrl override: ${ENDPOINT_URL}`);
  console.log(`[hf-proxy] vision model: ${VISION_MODEL} (provider: ${VISION_PROVIDER})`);
});
