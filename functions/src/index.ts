import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";
import { createApp } from "./app";

setGlobalOptions({
  region: "us-central1",
  maxInstances: 10
});

const app = createApp();

export const api = onRequest(app);
