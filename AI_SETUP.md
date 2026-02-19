# AI Service Setup Guide

## Current Status

The app uses Hugging Face Inference API models for:

- OCR (image → text): `microsoft/trocr-base-printed`
- Captioning (image → text description): `Salesforce/blip-image-captioning-base`

OCR is attempted first; if OCR returns nothing useful, the app falls back to caption-based task suggestions.

## 1) Add a Hugging Face token

1. **Sign up for Hugging Face:**
   - Go to https://huggingface.co
   - Create an account

2. **Get your API token:**
   - Go to https://huggingface.co/settings/tokens
   - Create a new token (read access is sufficient)
   - Copy the token (starts with `hf_`)

3. **Add it to `.env` in the project root:**

```bash
EXPO_PUBLIC_HUGGINGFACE_API_TOKEN=hf_your_token_here
```

4. **Restart Expo with cache cleared:**

```bash
npx expo start -c
```

## 2) Web requires a local proxy (to avoid CORS)

In the browser, direct calls to `https://api-inference.huggingface.co` often fail with "Failed to fetch" due to CORS.

This repo includes a tiny proxy server that calls Hugging Face server-side.

1. **Run the proxy in a second terminal:**

```bash
npm run proxy
```

2. **Set the proxy URL in `.env`:**

```bash
EXPO_PUBLIC_AI_PROXY_URL=http://localhost:8787
```

3. **Restart Expo again (so the env var is picked up):**

```bash
npx expo start -c
```

Tip: one-touch web dev (starts proxy + Expo web):

```bash
npm run dev:web
```

Notes:
- The proxy reads `HUGGINGFACE_API_TOKEN` (preferred) or `EXPO_PUBLIC_HUGGINGFACE_API_TOKEN` from `.env`.
- The proxy exposes `POST /ocr` and `POST /caption`.
- On Android/iOS, the app calls Hugging Face directly (no CORS), so the proxy is only needed for Web.