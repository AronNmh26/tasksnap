import { Platform } from "react-native";
import { readAsStringAsync } from "expo-file-system/legacy";

export type AiSuggestion = { title: string; category?: string };

let didLogTokenPresence = false;
let lastAiDebugMessage: string | null = null;

function isDev(): boolean { return (globalThis as any)?.__DEV__ === true; }

function setLastAiDebugMessage(message: string) {
  lastAiDebugMessage = message;
  if (isDev()) console.log("[AI]", message);
}

function setLastAiDebugMessageIfEmpty(message: string) {
  if (lastAiDebugMessage) return;
  setLastAiDebugMessage(message);
}

export function getLastAiDebugMessage(): string | null { return lastAiDebugMessage; }

function getHuggingFaceToken(): string {
  const raw = process.env.EXPO_PUBLIC_HUGGINGFACE_API_TOKEN || process.env.EXPO_PUBLIC_HF_TOKEN ||
    process.env.HUGGINGFACE_API_TOKEN || process.env.HF_TOKEN;
  const token = typeof raw === "string" ? raw.trim() : "";
  if (isDev() && !didLogTokenPresence) { didLogTokenPresence = true; console.log("[AI] HuggingFace token present:", Boolean(token)); }
  return token;
}

function getAiProxyUrl(): string {
  const raw = process.env.EXPO_PUBLIC_AI_PROXY_URL;
  return typeof raw === "string" ? raw.trim().replace(/\/$/, "") : "";
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

export function hasHuggingFaceToken(): boolean { return Boolean(getHuggingFaceToken()); }

function titleCase(s: string) {
  return s.trim().replace(/\s+/g, " ").split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w)).join(" ");
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

async function imageToBase64({ imageUri, imageBase64 }: { imageUri: string; imageBase64?: string }): Promise<string> {
  if (typeof imageBase64 === "string" && imageBase64.trim()) return imageBase64.trim();
  if (Platform.OS !== "web") return await readAsStringAsync(imageUri, { encoding: "base64" });
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

function extractGeneratedText(result: any): string {
  if (Array.isArray(result) && result.length > 0) {
    const t = result[0]?.generated_text ?? result[0]?.text;
    return typeof t === "string" ? t : "";
  }
  if (typeof result?.generated_text === "string") return result.generated_text;
  if (typeof result?.text === "string") return result.text;
  return "";
}

async function safeReadJson(response: Response): Promise<any> {
  try { return await response.json(); } catch { return null; }
}

function truncateDebugBody(body: any): string {
  if (body == null) return "";
  const asString = typeof body === "string" ? body
    : (() => { try { return JSON.stringify(body); } catch { return String(body); } })();
  const trimmed = asString.trim();
  return trimmed.length > 700 ? trimmed.slice(0, 700) + "…" : trimmed;
}

async function proxyPostImageWithRetry({ path, model, imageBase64, label }: {
  path: "/ocr" | "/caption"; model: string; imageBase64: string; label: string;
}): Promise<{ ok: boolean; status: number; body: any }> {
  const proxyUrl = getAiProxyUrl();
  if (!proxyUrl) {
    return { ok: false, status: 400, body: { error: "Missing EXPO_PUBLIC_AI_PROXY_URL" } };
  }
  const url = `${proxyUrl}${path}`;
  let last: { ok: boolean; status: number; body: any } | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const resp = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, imageBase64 }),
      });
      const text = await resp.text();
      let parsed: any = text;
      try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
      last = { ok: resp.ok, status: resp.status, body: parsed };
    } catch (e) {
      setLastAiDebugMessage(`${label} proxy network error: ${String((e as any)?.message || e)}`);
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

const CAPTION_TASK_MAP: { kw: string[]; title: string; cat: string }[] = [
  { kw: ["laundry", "clothes", "clothing", "hamper", "washing machine"], title: "Do Laundry", cat: "Personal" },
  { kw: ["dish", "dishes", "sink", "plate", "dirty cup"], title: "Wash The Dishes", cat: "Personal" },
  { kw: ["vacuum", "mop", "broom", "dusty", "sweep"], title: "Clean The House", cat: "Personal" },
  { kw: ["trash", "garbage", "bin", "rubbish"], title: "Take Out Trash", cat: "Personal" },
  { kw: ["iron", "ironing", "wrinkle"], title: "Iron Clothes", cat: "Personal" },
  { kw: ["receipt", "invoice", "bill", "payment"], title: "Review Receipt", cat: "Finance" },
  { kw: ["book", "notebook", "paper", "document", "textbook"], title: "Review Notes", cat: "Academic" },
  { kw: ["homework", "assignment", "exam", "study"], title: "Complete Assignment", cat: "Academic" },
  { kw: ["laptop", "computer", "code", "programming"], title: "Finish Project", cat: "Work" },
  { kw: ["gym", "dumbbell", "treadmill", "exercise", "workout"], title: "Go To The Gym", cat: "Health" },
  { kw: ["medicine", "pill", "prescription", "pharmacy"], title: "Take Medication", cat: "Health" },
  { kw: ["grocery", "market", "shopping", "cart", "supermarket"], title: "Go Grocery Shopping", cat: "Personal" },
  { kw: ["car", "vehicle", "gas", "fuel"], title: "Car Maintenance", cat: "Personal" },
  { kw: ["package", "parcel", "mail", "delivery"], title: "Pick Up Package", cat: "Personal" },
  { kw: ["plant", "garden", "flower", "water"], title: "Water The Plants", cat: "Personal" },
  { kw: ["dog", "cat", "pet", "feed"], title: "Feed The Pet", cat: "Personal" },
  { kw: ["food", "meal", "kitchen", "cook"], title: "Prepare Meal", cat: "Personal" },
];

function mapCaptionToTasks(caption: string): AiSuggestion[] {
  const lower = caption.toLowerCase();
  for (const { kw, title, cat } of CAPTION_TASK_MAP) {
    if (kw.some((k) => lower.includes(k))) return [{ title, category: cat }];
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
  try { const text = await response.text(); return text.length > 700 ? text.slice(0, 700) + "…" : text; }
  catch { return ""; }
}

function parseVisionTaskSuggestions(text: string): AiSuggestion[] {
  const raw = stripCodeFences((text || "").trim());
  if (!raw) return [];
  const jsonCandidate = extractJsonArray(raw);
  const fromJson = jsonCandidate ? parseSuggestionsJson(jsonCandidate) : [];
  return fromJson.length > 0 ? fromJson : parseSuggestionsFromLines(raw);
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

function isBadTaskTitle(title: string): boolean {
  const t = (title || "").trim().toLowerCase();
  if (!t) return true;
  if (t.startsWith("a ") || t.startsWith("an ") || t.startsWith("the ")) return true;
  if (t.includes("photo") || t.includes("picture") || t.includes("image")) return true;
  return false;
}

function postProcessSuggestions(suggestions: AiSuggestion[]): AiSuggestion[] {
  const lowerTitles = suggestions.map((s) => (s.title || "").toLowerCase());
  const hasDishes = lowerTitles.some((t) => t.includes("dish") || t.includes("dishes") || t.includes("sink"));
  if (!hasDishes) return suggestions;
  return suggestions.filter((s) => {
    const t = (s.title || "").toLowerCase();
    return !(t.includes("meal") || t.includes("cook") || t.includes("cooking") || t.includes("prepare") || t.includes("recipe"));
  });
}

const ALLOWED_CATEGORIES = new Map<string, string>([
  ["personal", "Personal"], ["academic", "Academic"], ["health", "Health"],
  ["finance", "Finance"], ["work", "Work"], ["general", "General"],
]);

function normalizeCategory(raw: string): string {
  return ALLOWED_CATEGORIES.get((raw || "").trim().toLowerCase()) || "General";
}

function parseSuggestionsJson(jsonCandidate: string): AiSuggestion[] {
  try {
    const data = JSON.parse(jsonCandidate);
    if (!Array.isArray(data)) return [];
    const suggestions: AiSuggestion[] = [];
    for (const item of data) {
      const title = typeof item?.title === "string" ? item.title.trim() : "";
      const category = normalizeCategory(typeof item?.category === "string" ? item.category.trim() : "");
      if (title.length < 3 || title.length > 80) continue;
      if (isLikelyWatermarkLine(title) || isBadTaskTitle(title)) continue;
      suggestions.push({ title: titleCase(title), category });
      if (suggestions.length >= 3) break;
    }
    return postProcessSuggestions(suggestions);
  } catch { return []; }
}

function parseSuggestionsFromLines(raw: string): AiSuggestion[] {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const suggestions: AiSuggestion[] = [];
  for (const line of lines) {
    const cleaned = line.replace(/^[-*\s]+/, "").replace(/^\d+[.)]\s+/, "").trim();
    if (!cleaned || cleaned.startsWith("{") || cleaned.startsWith("[")) continue;
    if (isLikelyWatermarkLine(cleaned) || isBadTaskTitle(cleaned)) continue;
    if (cleaned.length < 3 || cleaned.length > 80) continue;
    suggestions.push({ title: titleCase(cleaned), category: "General" });
    if (suggestions.length >= 3) break;
  }
  return postProcessSuggestions(suggestions);
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
  try { const parsed = JSON.parse(jsonStr); return typeof parsed?.text === "string" ? parsed.text : ""; }
  catch { return ""; }
}

async function hfVisionChatCompletion({ token, prompt, imageBase64, label }: {
  token: string; prompt: string; imageBase64: string; label: string;
}): Promise<string | null> {
  const imageUrl = imageBase64.startsWith("data:image/") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
  const response = await fetch(HF_VISION_CHAT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: HF_VISION_MODEL, stream: false, max_tokens: 160,
      messages: [{ role: "user", content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: imageUrl } },
      ]}],
    }),
  });
  if (!response.ok) {
    setLastAiDebugMessage(`${label} HTTP ${response.status}: ${await safeReadText(response)}`);
    return null;
  }
  const json = await safeReadJson(response);
  const content = json?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content : null;
}

function parseOCRText(extractedText: string): AiSuggestion[] {
  const lowerText = extractedText.toLowerCase();
  const firstLine = extractedText.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 0);
  if (firstLine && firstLine.length >= 3 && firstLine.length <= 70 &&
      !isLikelyPromptLine(firstLine) && !isLikelyWatermarkLine(firstLine)) {
    const cleaned = firstLine.replace(/^[-*\s]+/, "");
    if (cleaned.length >= 3) return [{ title: titleCase(cleaned), category: "General" }];
  }
  if (["receipt", "total", "tax", "subtotal", "payment", "store", "grocery", "market"]
      .some((kw) => lowerText.includes(kw))) {
    return [
      { title: "Review Receipt", category: "Finance" },
      { title: "File Expense", category: "Finance" },
      { title: "Update Budget", category: "Finance" },
    ];
  }
  if (["todo", "note", "reminder", "remember", "call", "meeting"]
      .some((kw) => lowerText.includes(kw))) {
    return [
      { title: "Review Notes", category: "General" },
      { title: "Follow Up", category: "Work" },
      { title: "Important Reminder", category: "Personal" },
    ];
  }
  const snippet = extractedText.replace(/\s+/g, " ").trim().split(" ").slice(0, 8).join(" ");
  if (snippet.length >= 3 && !isLikelyWatermarkLine(snippet)) {
    return [{ title: titleCase(snippet), category: "General" }];
  }
  return [];
}

function isLikelyPromptLine(line: string): boolean {
  const lower = line.trim().toLowerCase();
  return lower.startsWith("text recognition") || lower.startsWith("describe this image");
}

function isLikelyWatermarkLine(line: string): boolean {
  const lower = line.trim().toLowerCase();
  return ["istock", "shutterstock", "getty", "dreamstime", "alamy", "depositphotos", "123rf", "adobe stock", "credit"]
    .some((kw) => lower.includes(kw));
}
