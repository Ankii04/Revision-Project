/**
 * background.js — DSA Revision Extension Service Worker (MV3)
 *
 * Handles:
 *  - Installation setup
 *  - Message relay from content scripts
 *  - Auth token management via chrome.storage
 */

const DEFAULT_WEBSITE_URL = "http://localhost:3000";

// ── Install / Update ─────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    console.log("✅ DSA Revision Extension installed.");
    // Open the popup / options page on first install
    chrome.storage.local.set({
      websiteUrl: DEFAULT_WEBSITE_URL,
      captureEnabled: true,
      totalCaptured: 0,
    });
  }
});

// ── Message Handling ──────────────────────────────────────────────────────────
/**
 * Messages from content.js arrive here.
 * { type: "SYNC_PROBLEM", payload: { ... } }
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SYNC_PROBLEM") {
    handleSync(message.payload)
      .then((result) => sendResponse({ success: true, result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    // Return true to keep the async message channel open
    return true;
  }

  if (message.type === "GET_STATUS") {
    chrome.storage.local.get(["websiteUrl", "captureEnabled", "totalCaptured"], (data) => {
      sendResponse(data);
    });
    return true;
  }

  if (message.type === "UPDATE_SETTINGS") {
    chrome.storage.local.set(message.payload, () => sendResponse({ ok: true }));
    return true;
  }
});

// ── Core Sync Logic ───────────────────────────────────────────────────────────
async function handleSync(payload) {
  const { websiteUrl = DEFAULT_WEBSITE_URL } = await chrome.storage.local.get("websiteUrl");

  console.log(`📡 [BG] Syncing: "${payload.title}" to ${websiteUrl}`);

  const response = await fetch(`${websiteUrl}/api/problems`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Forward the Clerk session cookie automatically (same-site)
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Server returned ${response.status}: ${text}`);
  }

  const json = await response.json();

  // Increment the total captured counter
  const { totalCaptured = 0 } = await chrome.storage.local.get("totalCaptured");
  await chrome.storage.local.set({ totalCaptured: totalCaptured + 1 });

  console.log(`✅ [BG] Sync complete for: "${payload.title}"`);
  return json;
}
