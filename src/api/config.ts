/**
 * Where the mobile app talks to the API.
 *
 * `EXPO_PUBLIC_` variables are inlined at build time, so this works in Expo Go,
 * in a development build and in a store binary without code changes.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://10.82.175.123:8000/api";

/** Preview of the host machine's LAN address, the usual fix for "localhost" on a phone. */
export const LAN_API_URL = process.env.EXPO_PUBLIC_API_URL_LAN;
