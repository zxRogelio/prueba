export async function checkoutAttemptSignature(authToken: string, deliverySignature: string, quoteToken: string) {
  let digest: unknown;
  try {
    const encoded = quoteToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    digest = (JSON.parse(atob(encoded)) as { digest?: unknown }).digest;
  } catch {
    throw new Error("Consulta de nuevo la cotización antes de pagar.");
  }
  if (typeof digest !== "string" || !/^[a-f0-9]{64}$/.test(digest)) {
    throw new Error("Consulta de nuevo la cotización antes de pagar.");
  }
  // Used only for local retry identity. The server verifies the JWT signature,
  // account, expiry and quote contents before creating an order.
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(
    JSON.stringify({ authToken, deliverySignature, digest })
  ));
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
