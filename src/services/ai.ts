import { Platform } from "react-native";
import { readAsStringAsync } from "expo-file-system/legacy";

export type AiSuggestion = {
  title: string;
  category?: string;
};

let didLogTokenPresence = false;
let lastAiDebugMessage: string | null = null;

function isDev(): boolean {
  return (globalThis as any)?.__DEV__ === true;
}

function setLastAiDebugMessage(message: string) {
  lastAiDebugMessage = message;
  if (isDev()) console.log("[AI]", message);
}

function setLastAiDebugMessageIfEmpty(message: string) {
  if (lastAiDebugMessage) return;
  setLastAiDebugMessage(message);
}

export function getLastAiDebugMessage(): string | null {
  return lastAiDebugMessage;
}

function getHuggingFaceToken(): string {
  const raw =
    process.env.EXPO_PUBLIC_HUGGINGFACE_API_TOKEN ||
    process.env.EXPO_PUBLIC_HF_TOKEN ||
    process.env.HUGGINGFACE_API_TOKEN ||
    process.env.HF_TOKEN;

  const token = typeof raw === "string" ? raw.trim() : "";

  if (isDev() && !didLogTokenPresence) {
    didLogTokenPresence = true;
    console.log("[AI] HuggingFace token present:", Boolean(token));
  }

  return token;
}

function getAiProxyUrl(): string {
  const raw = process.env.EXPO_PUBLIC_AI_PROXY_URL;
  return typeof raw === "string" ? raw.trim().replace(/\/$/, "") : "";
}

function getHfInferenceBaseUrl(): string {
  const raw =
    process.env.EXPO_PUBLIC_HF_INFERENCE_BASE_URL ||
    process.env.EXPO_PUBLIC_HUGGINGFACE_INFERENCE_BASE_URL;

  const base = typeof raw === "string" ? raw.trim() : "";
  // Default: Hugging Face router endpoint (legacy api-inference now returns 410).
  return (base || "https://router.huggingface.co/hf-inference/models/").replace(/\/+$/, "");
}

const HF_VISION_CHAT_URL = "https://router.huggingface.co/v1/chat/completions";
const HF_VISION_MODEL = "allenai/Molmo2-8B:publicai";
const HF_VISION_PROMPT_CAPTION =
  "You are a task assistant. Based on the image, suggest up to 3 tasks the user should create. " +
  "Return ONLY a JSON array of objects in this exact shape: [{\"title\":\"...\",\"category\":\"Personal|Academic|Health|Finance|Work|General\"}]. " +
  "Titles must be imperative actions (e.g., \"Do laundry\", \"Wash the dishes\"). " +
  "Do NOT describe the image or mention \"photo\"/\"picture\". Do NOT add explanations or markdown. " +
  "Only suggest tasks that are strongly implied by the image; if you are not confident, return []. " +
  "Examples: if you see a laundry hamper/clothes -> [{\"title\":\"Do laundry\",...}]. If you see dirty dishes/sink -> [{\"title\":\"Wash the dishes\",...}].";
const HF_VISION_PROMPT_OCR =
  "Extract any text you can read from the image. " +
  "Return ONLY a JSON object of the exact form: {\"text\":\"...\"}. " +
  "If there is no readable text, return {\"text\":\"\"}. " +
  "Do not add explanations, markdown, or extra keys.";

function toModelPath(model: string): string {
  return String(model || "")
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function hasHuggingFaceToken(): boolean {
  return Boolean(getHuggingFaceToken());
}

function titleCase(s: string) {
  return s
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

export async function suggestLabel(raw: string): Promise<AiSuggestion> {
  const cleaned = raw.trim();

  const lower = cleaned.toLowerCase();
  let category: string | undefined;
  if (lower.includes("dish") || lower.includes("clean") || lower.includes("laundry")) category = "Home";
  else if (lower.includes("study") || lower.includes("homework") || lower.includes("assignment")) category = "Study";
  else if (lower.includes("gym") || lower.includes("run")) category = "Fitness";

  let title = titleCase(cleaned);
  if (lower === "dish" || lower === "dishes") title = "Wash the Dishes";
  if (lower === "laundry") title = "Do Laundry";

  return { title, category };
}

export async function suggestLabelFromImage(
  imageUri: string,
  imageBase64?: string | null
): Promise<AiSuggestion[]> {
  lastAiDebugMessage = null;

  if (Platform.OS === "web") {
    const proxyUrl = getAiProxyUrl();
    if (!proxyUrl) {
      setLastAiDebugMessage(
        "Web requires a local AI proxy to avoid browser CORS blocking Hugging Face. " +
          "Set EXPO_PUBLIC_AI_PROXY_URL (example: http://localhost:8787) and run: npm run proxy"
      );
      return [];
    }
  }

  try {
    const fromOcr = await tryOcrSuggestions(imageUri, imageBase64 ?? undefined);
    if (fromOcr && fromOcr.length > 0) return fromOcr;

    const fromVision = await tryVisionTaskSuggestions(imageUri, imageBase64 ?? undefined);
    if (fromVision && fromVision.length > 0) return fromVision;

    setLastAiDebugMessageIfEmpty("No OCR text and no visual suggestions returned.");
    return [];
  } catch (e) {
    setLastAiDebugMessage(`AI request failed: ${String((e as any)?.message || e)}`);
    return [];
  }
}

async function tryOcrSuggestions(
  imageUri: string,
  imageBase64?: string
): Promise<AiSuggestion[] | null> {
  const isWeb = Platform.OS === "web";
  const token = isWeb ? "" : getHuggingFaceToken();
  if (!isWeb && !token) {
    setLastAiDebugMessage(
      "Missing Hugging Face token. Set EXPO_PUBLIC_HUGGINGFACE_API_TOKEN in .env and restart Expo with -c."
    );
    return null;
  }

  // Stable, widely-available OCR model via HF Inference API.
  // TroCR expects image bytes and returns generated text.
  const model = "microsoft/trocr-base-printed";

  const result = await (async () => {
    if (Platform.OS === "web") {
      const imageB64 = await imageToBase64({ imageUri, imageBase64 });
      const proxyRes = await proxyPostImageWithRetry({
        path: "/ocr",
        model,
        imageBase64: imageB64,
        label: `TroCR (${model})`,
      });
      if (!proxyRes.ok) {
        setLastAiDebugMessage(`OCR proxy HTTP ${proxyRes.status}: ${truncateDebugBody(proxyRes.body)}`);
        return null;
      }
      return proxyRes.body;
    }

    // Hugging Face deprecated the legacy image-to-text REST API for many Hub models.
    // Use an inference-provider backed vision chat-completions model instead.
    const imageB64 = await imageToBase64({ imageUri, imageBase64 });
    const content = await hfVisionChatCompletion({
      token,
      prompt: HF_VISION_PROMPT_OCR,
      imageBase64: imageB64,
      label: "OCR (vision chat)",
    });

    const ocrText = parseVisionOcrJson(content);
    return { generated_text: ocrText };
  })();

  if (!result) return null;
  const extractedText = cleanOcrText(extractGeneratedText(result));
  if (!extractedText) {
    setLastAiDebugMessageIfEmpty("OCR returned empty content.");
    return [];
  }

  const parsed = parseOCRText(extractedText);
  if (parsed.length === 0) {
    setLastAiDebugMessageIfEmpty("OCR extracted text, but it looked like a watermark or not a task.");
  }
  return parsed;
}

async function tryVisionTaskSuggestions(
  imageUri: string,
  imageBase64?: string
): Promise<AiSuggestion[] | null> {
  const isWeb = Platform.OS === "web";
  const token = isWeb ? "" : getHuggingFaceToken();
  if (!isWeb && !token) return null;

  const model = "Salesforce/blip-image-captioning-base";

  const result = await (async () => {
    if (Platform.OS === "web") {
      const imageB64 = await imageToBase64({ imageUri, imageBase64 });
      const proxyRes = await proxyPostImageWithRetry({
        path: "/caption",
        model,
        imageBase64: imageB64,
        label: `BLIP (${model})`,
      });
      if (!proxyRes.ok) {
        setLastAiDebugMessage(`Caption proxy HTTP ${proxyRes.status}: ${truncateDebugBody(proxyRes.body)}`);
        return null;
      }
      return proxyRes.body;
    }

    const imageB64 = await imageToBase64({ imageUri, imageBase64 });
    const content = await hfVisionChatCompletion({
      token,
      prompt: HF_VISION_PROMPT_CAPTION,
      imageBase64: imageB64,
      label: "Caption (vision chat)",
    });
    if (!content) return null;
    return { generated_text: content };
  })();

  if (!result) return null;
  const visionText = (extractGeneratedText(result) || "").trim();
  if (!visionText) {
    setLastAiDebugMessageIfEmpty("Caption model returned empty content.");
    return [];
  }

  const fromModel = parseVisionTaskSuggestions(visionText);
  if (fromModel.length > 0) return fromModel;

  // Fallback: if model output is not JSON/lines (or is still descriptive),
  // apply a simple keyword mapper so common cases still work.
  const fallback = mapCaptionToTasks(visionText);
  if (fallback.length > 0) return fallback;

  setLastAiDebugMessageIfEmpty(`Vision text received but no task suggestions parsed: ${visionText}`);
  return [];
}

async function imageToBlob({
  imageUri,
  imageBase64,
}: {
  imageUri: string;
  imageBase64?: string;
}): Promise<Blob> {
  if (!imageUri) throw new Error("Missing imageUri");

  // Prefer base64 if provided.
  if (typeof imageBase64 === "string" && imageBase64.trim()) {
    const dataUrl = `data:image/jpeg;base64,${imageBase64.trim()}`;
    return await fetchDataUrlBlob(dataUrl);
  }

  // If already a data URL.
  if (imageUri.startsWith("data:image/")) {
    return await fetchDataUrlBlob(imageUri);
  }

  // Web: regular fetch works.
  if (Platform.OS === "web") {
    const res = await fetch(imageUri);
    if (!res.ok) throw new Error(`Failed to fetch image: HTTP ${res.status}`);
    return await res.blob();
  }

  // Native: try fetch(file://...) first (often works in Expo).
  try {
    const res = await fetch(imageUri);
    if (res.ok) return await res.blob();
  } catch {
    // ignore and fall back
  }

  // Native fallback: read base64 and convert via data URL.
  const base64 = await readAsStringAsync(imageUri, { encoding: "base64" });
  const dataUrl = `data:image/jpeg;base64,${base64}`;
  return await fetchDataUrlBlob(dataUrl);
}

async function imageToBase64({
  imageUri,
  imageBase64,
}: {
  imageUri: string;
  imageBase64?: string;
}): Promise<string> {
  if (typeof imageBase64 === "string" && imageBase64.trim()) return imageBase64.trim();

  if (Platform.OS !== "web") {
    return await readAsStringAsync(imageUri, { encoding: "base64" });
  }

  // Web: fetch to blob, then FileReader to base64.
  const res = await fetch(imageUri);
  if (!res.ok) throw new Error(`Failed to fetch image: HTTP ${res.status}`);
  const blob = await res.blob();
  const dataUrl = await blobToDataUrl(blob);
  const comma = dataUrl.indexOf(",");
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image blob"));
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(blob);
  });
}

async function fetchDataUrlBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  if (!res.ok) throw new Error(`Failed to read data URL: HTTP ${res.status}`);
  return await res.blob();
}

function extractGeneratedText(result: any): string {
  // Common shapes for image-to-text models:
  // - [{ generated_text: "..." }]
  // - { generated_text: "..." }
  // - { text: "..." }
  if (Array.isArray(result) && result.length > 0) {
    const first = result[0];
    const t = first?.generated_text ?? first?.text;
    return typeof t === "string" ? t : "";
  }
  if (typeof result?.generated_text === "string") return result.generated_text;
  if (typeof result?.text === "string") return result.text;
  return "";
}

async function safeReadJson(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function truncateDebugBody(body: any): string {
  if (body == null) return "";
  const asString =
    typeof body === "string"
      ? body
      : (() => {
          try {
            return JSON.stringify(body);
          } catch {
            return String(body);
          }
        })();

  const trimmed = asString.trim();
  return trimmed.length > 700 ? trimmed.slice(0, 700) + "…" : trimmed;
}

async function proxyPostImageWithRetry({
  path,
  model,
  imageBase64,
  label,
}: {
  path: "/ocr" | "/caption";
  model: string;
  imageBase64: string;
  label: string;
}): Promise<{ ok: boolean; status: number; body: any }> {
  const proxyUrl = getAiProxyUrl();
  if (!proxyUrl) {
    return { ok: false, status: 400, body: { error: "Missing EXPO_PUBLIC_AI_PROXY_URL" } };
  }

  const url = `${proxyUrl}${path}`;

  const maxAttempts = 3;
  let last: { ok: boolean; status: number; body: any } | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, imageBase64 }),
      });

      const text = await resp.text();
      let parsed: any = text;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = text;
      }

      last = { ok: resp.ok, status: resp.status, body: parsed };
    } catch (e) {
      const message = String((e as any)?.message || e);
      setLastAiDebugMessage(`${label} proxy network error: ${message}`);
      throw e;
    }

    if (!last || last.status !== 503) return last as any;

    const estimated = typeof last.body?.estimated_time === "number" ? last.body.estimated_time : null;
    const waitMs = Math.min(5000, Math.max(750, (estimated ? estimated * 1000 : 1200) * attempt));
    setLastAiDebugMessage(`${label} is loading (503). Retrying in ${Math.round(waitMs)}ms...`);
    await new Promise((r) => setTimeout(r, waitMs));
  }

  return last as any;
}

async function hfPostImageWithRetry({
  url,
  token,
  blob,
  label,
}: {
  url: string;
  token: string;
  blob: Blob;
  label: string;
}): Promise<Response> {
  // 503 is common while HF is loading a model. Retry briefly.
  const maxAttempts = 3;
  let lastResponse: Response | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: blob,
      });
    } catch (e) {
      const message = String((e as any)?.message || e);
      // On Web, this is commonly a CORS/network policy issue (no HTTP status available).
      if (Platform.OS === "web") {
        setLastAiDebugMessage(
          `${label} network error: ${message}. ` +
            "If you're running in the browser, Hugging Face Inference API calls may be blocked by CORS. " +
            "Try running the app on Android/iOS (Expo Go) or use a small backend proxy to call Hugging Face server-side."
        );
      } else {
        setLastAiDebugMessage(`${label} network error: ${message}`);
      }
      throw e;
    }
    lastResponse = response;

    if (response.status !== 503) return response;

    const json = await safeReadJson(response);
    const estimated = typeof json?.estimated_time === "number" ? json.estimated_time : null;
    const waitMs = Math.min(5000, Math.max(750, (estimated ? estimated * 1000 : 1200) * attempt));
    setLastAiDebugMessage(`${label} is loading (503). Retrying in ${Math.round(waitMs)}ms...`);
    await new Promise((r) => setTimeout(r, waitMs));
  }

  return lastResponse as Response;
}

function mapCaptionToTasks(caption: string): AiSuggestion[] {
  const lower = caption.toLowerCase();

  // --- Household / Cleaning ---
  if (
    lower.includes("laundry") ||
    lower.includes("clothes") ||
    lower.includes("clothing") ||
    lower.includes("hamper") ||
    lower.includes("washing machine")
  ) {
    return [{ title: "Do Laundry", category: "Personal" }];
  }

  if (
    lower.includes("dish") ||
    lower.includes("dishes") ||
    lower.includes("sink") ||
    lower.includes("plate") ||
    lower.includes("dirty cup")
  ) {
    return [{ title: "Wash The Dishes", category: "Personal" }];
  }

  if (
    lower.includes("vacuum") ||
    lower.includes("mop") ||
    lower.includes("broom") ||
    lower.includes("dusty") ||
    lower.includes("sweep")
  ) {
    return [{ title: "Clean The House", category: "Personal" }];
  }

  if (
    lower.includes("trash") ||
    lower.includes("garbage") ||
    lower.includes("bin") ||
    lower.includes("rubbish")
  ) {
    return [{ title: "Take Out Trash", category: "Personal" }];
  }

  if (
    lower.includes("iron") ||
    lower.includes("ironing") ||
    lower.includes("wrinkle")
  ) {
    return [{ title: "Iron Clothes", category: "Personal" }];
  }

  // --- Finance ---
  if (
    lower.includes("receipt") ||
    lower.includes("invoice") ||
    lower.includes("bill") ||
    lower.includes("payment")
  ) {
    return [{ title: "Review Receipt", category: "Finance" }];
  }

  // --- Academic ---
  if (
    lower.includes("book") ||
    lower.includes("notebook") ||
    lower.includes("paper") ||
    lower.includes("document") ||
    lower.includes("textbook")
  ) {
    return [{ title: "Review Notes", category: "Academic" }];
  }

  if (
    lower.includes("homework") ||
    lower.includes("assignment") ||
    lower.includes("exam") ||
    lower.includes("study")
  ) {
    return [{ title: "Complete Assignment", category: "Academic" }];
  }

  if (
    lower.includes("laptop") ||
    lower.includes("computer") ||
    lower.includes("code") ||
    lower.includes("programming")
  ) {
    return [{ title: "Finish Project", category: "Work" }];
  }

  // --- Health / Fitness ---
  if (
    lower.includes("gym") ||
    lower.includes("dumbbell") ||
    lower.includes("treadmill") ||
    lower.includes("exercise") ||
    lower.includes("workout")
  ) {
    return [{ title: "Go To The Gym", category: "Health" }];
  }

  if (
    lower.includes("medicine") ||
    lower.includes("pill") ||
    lower.includes("prescription") ||
    lower.includes("pharmacy")
  ) {
    return [{ title: "Take Medication", category: "Health" }];
  }

  // --- Shopping / Grocery ---
  if (
    lower.includes("grocery") ||
    lower.includes("market") ||
    lower.includes("shopping") ||
    lower.includes("cart") ||
    lower.includes("supermarket")
  ) {
    return [{ title: "Go Grocery Shopping", category: "Personal" }];
  }

  // --- Car / Vehicle ---
  if (
    lower.includes("car") ||
    lower.includes("vehicle") ||
    lower.includes("gas") ||
    lower.includes("fuel")
  ) {
    return [{ title: "Car Maintenance", category: "Personal" }];
  }

  // --- Mail / Package ---
  if (
    lower.includes("package") ||
    lower.includes("parcel") ||
    lower.includes("mail") ||
    lower.includes("delivery")
  ) {
    return [{ title: "Pick Up Package", category: "Personal" }];
  }

  // --- Garden ---
  if (
    lower.includes("plant") ||
    lower.includes("garden") ||
    lower.includes("flower") ||
    lower.includes("water")
  ) {
    return [{ title: "Water The Plants", category: "Personal" }];
  }

  // --- Pet ---
  if (
    lower.includes("dog") ||
    lower.includes("cat") ||
    lower.includes("pet") ||
    lower.includes("feed")
  ) {
    return [{ title: "Feed The Pet", category: "Personal" }];
  }

  // --- Kitchen/Cooking (only if no dish keywords) ---
  if (
    lower.includes("food") ||
    lower.includes("meal") ||
    lower.includes("kitchen") ||
    lower.includes("cook")
  ) {
    return [{ title: "Prepare Meal", category: "Personal" }];
  }

  return [];
}

function cleanOcrText(text: string): string {
  if (!text) return "";
  let cleaned = text
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, ""))
    .trim();

  cleaned = cleaned.replace(/^text\s*recognition\s*:\s*/i, "");
  cleaned = cleaned.replace(/^the\s+text\s+in\s+the\s+image\s+is\s*[:\-]\s*/i, "");
  cleaned = cleaned.replace(/^ocr\s*[:\-]\s*/i, "");
  cleaned = cleaned.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (!cleaned) return "";
  if (/^text\s*recognition\s*:?$/i.test(cleaned)) return "";
  return cleaned;
}

async function safeReadText(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.length > 700 ? text.slice(0, 700) + "…" : text;
  } catch {
    return "";
  }
}

function parseVisionTaskSuggestions(text: string): AiSuggestion[] {
  const raw = stripCodeFences((text || "").trim());
  if (!raw) return [];

  const jsonCandidate = extractJsonArray(raw);
  const fromJson = jsonCandidate ? parseSuggestionsJson(jsonCandidate) : [];
  if (fromJson.length > 0) return fromJson;

  return parseSuggestionsFromLines(raw);
}

function extractJsonArray(text: string): string | null {
  const start = text.indexOf("[");
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function parseSuggestionsJson(jsonCandidate: string): AiSuggestion[] {
  try {
    const data = JSON.parse(jsonCandidate);
    if (!Array.isArray(data)) return [];

    const allowedCategories = new Map<string, string>([
      ["personal", "Personal"],
      ["academic", "Academic"],
      ["health", "Health"],
      ["finance", "Finance"],
      ["work", "Work"],
      ["general", "General"],
    ]);

    const normalizeCategory = (raw: string): string => {
      const key = (raw || "").trim().toLowerCase();
      return allowedCategories.get(key) || "General";
    };

    const isBadTaskTitle = (title: string): boolean => {
      const t = (title || "").trim().toLowerCase();
      if (!t) return true;
      if (t.startsWith("a ") || t.startsWith("an ") || t.startsWith("the ")) return true;
      if (t.includes("photo") || t.includes("picture") || t.includes("image")) return true;
      return false;
    };

    const postProcess = (suggestions: AiSuggestion[]): AiSuggestion[] => {
      const lowerTitles = suggestions.map((s) => (s.title || "").toLowerCase());
      const hasDishes = lowerTitles.some((t) => t.includes("dish") || t.includes("dishes") || t.includes("sink"));
      if (!hasDishes) return suggestions;
      return suggestions.filter((s) => {
        const t = (s.title || "").toLowerCase();
        return !(t.includes("meal") || t.includes("cook") || t.includes("cooking") || t.includes("prepare") || t.includes("recipe"));
      });
    };

    const suggestions: AiSuggestion[] = [];
    for (const item of data) {
      const title = typeof item?.title === "string" ? item.title.trim() : "";
      const categoryRaw = typeof item?.category === "string" ? item.category.trim() : "";
      const category = normalizeCategory(categoryRaw);

      if (title.length < 3 || title.length > 80) continue;
      if (isLikelyWatermarkLine(title)) continue;
      if (isBadTaskTitle(title)) continue;

      suggestions.push({ title: titleCase(title), category });
      if (suggestions.length >= 3) break;
    }

    return postProcess(suggestions);
  } catch {
    return [];
  }
}

function parseSuggestionsFromLines(raw: string): AiSuggestion[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const isBadTaskTitle = (title: string): boolean => {
    const t = (title || "").trim().toLowerCase();
    if (!t) return true;
    if (t.startsWith("a ") || t.startsWith("an ") || t.startsWith("the ")) return true;
    if (t.includes("photo") || t.includes("picture") || t.includes("image")) return true;
    return false;
  };

  const postProcess = (suggestions: AiSuggestion[]): AiSuggestion[] => {
    const lowerTitles = suggestions.map((s) => (s.title || "").toLowerCase());
    const hasDishes = lowerTitles.some((t) => t.includes("dish") || t.includes("dishes") || t.includes("sink"));
    if (!hasDishes) return suggestions;
    return suggestions.filter((s) => {
      const t = (s.title || "").toLowerCase();
      return !(t.includes("meal") || t.includes("cook") || t.includes("cooking") || t.includes("prepare") || t.includes("recipe"));
    });
  };

  const suggestions: AiSuggestion[] = [];
  for (const line of lines) {
    const cleaned = line.replace(/^[-*\s]+/, "").replace(/^\d+[.)]\s+/, "").trim();
    if (!cleaned) continue;
    if (cleaned.startsWith("{")) continue;
    if (cleaned.startsWith("[")) continue;
    if (isLikelyWatermarkLine(cleaned)) continue;
    if (isBadTaskTitle(cleaned)) continue;
    if (cleaned.length < 3 || cleaned.length > 80) continue;
    suggestions.push({ title: titleCase(cleaned), category: "General" });
    if (suggestions.length >= 3) break;
  }
  return postProcess(suggestions);
}

function stripCodeFences(text: string): string {
  return text.replace(/^```[a-zA-Z]*\s*/m, "").replace(/```\s*$/m, "").trim();
}

function extractJsonObjectString(maybeText: string): string {
  const s = String(maybeText || "").trim();
  if (!s) return "";
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start < 0 || end <= start) return "";
  return s.slice(start, end + 1);
}

function parseVisionOcrJson(content: string | null): string {
  if (!content) return "";
  const jsonStr = extractJsonObjectString(stripCodeFences(content));
  if (!jsonStr) return "";
  try {
    const parsed = JSON.parse(jsonStr);
    return typeof parsed?.text === "string" ? parsed.text : "";
  } catch {
    return "";
  }
}

async function hfVisionChatCompletion({
  token,
  prompt,
  imageBase64,
  label,
}: {
  token: string;
  prompt: string;
  imageBase64: string;
  label: string;
}): Promise<string | null> {
  const imageUrl = imageBase64.startsWith("data:image/")
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  const response = await fetch(HF_VISION_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: HF_VISION_MODEL,
      stream: false,
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
    }),
  });

  if (!response.ok) {
    const text = await safeReadText(response);
    setLastAiDebugMessage(`${label} HTTP ${response.status}: ${text}`);
    return null;
  }

  const json = await safeReadJson(response);
  const content = json?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content : null;
}

function parseOCRText(extractedText: string): AiSuggestion[] {
  const lowerText = extractedText.toLowerCase();

  const firstLine = extractedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0);

  if (
    firstLine &&
    firstLine.length >= 3 &&
    firstLine.length <= 70 &&
    !isLikelyPromptLine(firstLine) &&
    !isLikelyWatermarkLine(firstLine)
  ) {
    const cleaned = firstLine.replace(/^[-*\s]+/, "");
    if (cleaned.length >= 3) {
      return [{ title: titleCase(cleaned), category: "General" }];
    }
  }

  if (
    lowerText.includes("receipt") ||
    lowerText.includes("total") ||
    lowerText.includes("tax") ||
    lowerText.includes("subtotal") ||
    lowerText.includes("payment") ||
    lowerText.includes("store") ||
    lowerText.includes("grocery") ||
    lowerText.includes("market")
  ) {
    return [
      { title: "Review Receipt", category: "Finance" },
      { title: "File Expense", category: "Finance" },
      { title: "Update Budget", category: "Finance" },
    ];
  }

  if (
    lowerText.includes("todo") ||
    lowerText.includes("note") ||
    lowerText.includes("reminder") ||
    lowerText.includes("remember") ||
    lowerText.includes("call") ||
    lowerText.includes("meeting")
  ) {
    return [
      { title: "Review Notes", category: "General" },
      { title: "Follow Up", category: "Work" },
      { title: "Important Reminder", category: "Personal" },
    ];
  }

  const snippet = extractedText
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 8)
    .join(" ");

  if (snippet.length >= 3 && !isLikelyWatermarkLine(snippet)) {
    return [{ title: titleCase(snippet), category: "General" }];
  }

  return [];
}

function isLikelyPromptLine(line: string): boolean {
  const lower = line.trim().toLowerCase();
  return (
    lower === "text recognition:" ||
    lower === "text recognition" ||
    lower.startsWith("text recognition") ||
    lower.startsWith("describe this image")
  );
}

function isLikelyWatermarkLine(line: string): boolean {
  const lower = line.trim().toLowerCase();
  return (
    lower.includes("istock") ||
    lower.includes("shutterstock") ||
    lower.includes("getty") ||
    lower.includes("dreamstime") ||
    lower.includes("alamy") ||
    lower.includes("depositphotos") ||
    lower.includes("123rf") ||
    lower.includes("adobe stock") ||
    lower.includes("credit")
  );
}
