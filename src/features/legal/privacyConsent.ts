import AsyncStorage from "@react-native-async-storage/async-storage";

const PRIVACY_CONSENT_STORAGE_KEY = "@privacy_consent_v1";

// Increment this when policy terms change materially.
export const CURRENT_PRIVACY_POLICY_VERSION = 1;

type PrivacyConsentRecord = {
  accepted: boolean;
  version: number;
  acceptedAt: string;
};

export async function hasAcceptedCurrentPrivacyPolicy(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(PRIVACY_CONSENT_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<PrivacyConsentRecord>;
    return parsed.accepted === true && parsed.version === CURRENT_PRIVACY_POLICY_VERSION;
  } catch {
    return false;
  }
}

export async function savePrivacyPolicyConsent(): Promise<void> {
  const payload: PrivacyConsentRecord = {
    accepted: true,
    version: CURRENT_PRIVACY_POLICY_VERSION,
    acceptedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(PRIVACY_CONSENT_STORAGE_KEY, JSON.stringify(payload));
}
