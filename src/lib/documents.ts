import { Alert, Platform, Share } from "react-native";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { SelfServiceClient } from "@/api/client";

/**
 * Saving a customer document on a device.
 *
 * The API returns real PDF bytes, so the app writes them to a cache file and
 * hands that to the platform share sheet, which is how a customer saves to
 * Files, emails it or prints it. On the web preview the PDF is opened directly.
 */
export async function saveDocument(
  client: SelfServiceClient,
  path: string,
  filename: string,
): Promise<void> {
  return shareBytes(client.document(path), filename, "application/pdf");
}

/**
 * Saves any downloaded file and offers it to the share sheet. Split out because
 * uploaded documents are images or PDFs, not only generated PDFs.
 */
export async function shareBytes(
  pending: Promise<Response>,
  filename: string,
  mimeType = "application/pdf",
): Promise<void> {
  const response = await pending;
  const bytes = new Uint8Array(await response.arrayBuffer());

  if (Platform.OS === "web") {
    // Blob from raw bytes keeps this working without a File polyfill.
    const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }

  const directory = new Directory(Paths.cache, "documents");
  if (!directory.exists) directory.create({ intermediates: true });

  const file = new File(directory, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(bytes);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: filename });
    return;
  }

  // Sharing unavailable: still let them send the file by whatever means they have.
  await Share.share({ url: file.uri, title: filename });
}

export async function saveOrReport(
  client: SelfServiceClient,
  path: string,
  filename: string,
): Promise<void> {
  try {
    await saveDocument(client, path, filename);
  } catch (caught) {
    Alert.alert(
      "Could not download",
      caught instanceof Error ? caught.message : "The document could not be produced. Please try again.",
    );
  }
}
