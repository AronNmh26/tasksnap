import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const isWeb = Platform.OS === "web";

function normalizeKey(key: string): string {
  const cleaned = key.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned.length > 0 ? cleaned : "storage_key";
}

export async function secureGetItem(key: string): Promise<string | null> {
  if (!key) return null;
  const safeKey = normalizeKey(key);
  if (isWeb) {
    return AsyncStorage.getItem(safeKey);
  }
  return SecureStore.getItemAsync(safeKey);
}

export async function secureSetItem(key: string, value: string): Promise<void> {
  if (!key) return;
  const safeKey = normalizeKey(key);
  if (isWeb) {
    await AsyncStorage.setItem(safeKey, value);
    return;
  }
  await SecureStore.setItemAsync(safeKey, value);
}

export async function secureRemoveItem(key: string): Promise<void> {
  if (!key) return;
  const safeKey = normalizeKey(key);
  if (isWeb) {
    await AsyncStorage.removeItem(safeKey);
    return;
  }
  await SecureStore.deleteItemAsync(safeKey);
}
