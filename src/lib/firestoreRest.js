import { app } from "../firebaseConfig";

function decodeValue(value = {}) {
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeValue);
  if ("mapValue" in value) return decodeFields(value.mapValue.fields || {});
  return undefined;
}

function decodeFields(fields = {}) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]),
  );
}

export async function fetchCatalogFromServer() {
  const { projectId, apiKey } = app.options;
  const products = [];
  let pageToken = "";

  do {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/Products`,
    );
    url.searchParams.set("key", apiKey);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Firestore respondió ${response.status}`);
    const payload = await response.json();
    products.push(
      ...(payload.documents || []).map((document) => ({
        ...decodeFields(document.fields),
        id: document.name.split("/").pop(),
      })),
    );
    pageToken = payload.nextPageToken || "";
  } while (pageToken);

  return products;
}
