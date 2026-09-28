import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Token storage.
 *
 * On a device the token goes in the Keychain (iOS) or Keystore (Android) via
 * SecureStore. SecureStore has no web implementation, so the web preview falls
 * back to localStorage, which is acceptable for local development only.
 */
const KEY = "finlend_customer_token";

const memory = { value: null as string | null };

function webStorage(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

export const tokenStore = {
  async get(): Promise<string | null> {
    if (Platform.OS === "web") return webStorage()?.getItem(KEY) ?? memory.value;

    try {
      return await SecureStore.getItemAsync(KEY);
    } catch {
      return memory.value;
    }
  },

  async set(token: string): Promise<void> {
    memory.value = token;
    if (Platform.OS === "web") {
      webStorage()?.setItem(KEY, token);
      return;
    }

    try {
      await SecureStore.setItemAsync(KEY, token, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch {
      // Keep the in-memory copy so the session still works for this launch.
    }
  },

  async clear(): Promise<void> {
    memory.value = null;
    if (Platform.OS === "web") {
      webStorage()?.removeItem(KEY);
      return;
    }

    try {
      await SecureStore.deleteItemAsync(KEY);
    } catch {
      // Already gone.
    }
  },
};
