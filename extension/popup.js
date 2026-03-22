/**
 * popup.js — DSA Revision Extension Popup Script
 * Handles settings display and UI interactions.
 */

// 🚀 PRODUCTION: Change this to your Vercel URL before distributing the extension
// e.g. "https://your-revision-app.vercel.app"
const DEFAULT_URL = "http://localhost:3000";

// ── DOM refs ──────────────────────────────────────────────────────────────────
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const toggleBtn = document.getElementById("toggleBtn");
const totalCaptured = document.getElementById("totalCaptured");
const totalAllTime = document.getElementById("totalAllTime");
const urlInput = document.getElementById("urlInput");
const saveUrl = document.getElementById("saveUrl");
const openDashboard = document.getElementById("openDashboard");
const openRevision = document.getElementById("openRevision");
const toast = document.getElementById("toast");

// ── Load stored settings ──────────────────────────────────────────────────────
chrome.storage.local.get(
  ["websiteUrl", "captureEnabled", "totalCaptured", "todayCaptured", "lastCaptureDate"],
  (data) => {
    const url = data.websiteUrl ?? DEFAULT_URL;
    const enabled = data.captureEnabled !== false; // default: true
    const total = data.totalCaptured ?? 0;

    // Reset today's count if date changed
    const today = new Date().toDateString();
    const todayCount =
      data.lastCaptureDate === today ? (data.todayCaptured ?? 0) : 0;

    urlInput.value = url;
    totalAllTime.textContent = total;
    totalCaptured.textContent = todayCount;

    openDashboard.href = url + "/dashboard";
    openRevision.href = url + "/revision";

    setStatus(enabled);
  }
);

// ── Status toggle ─────────────────────────────────────────────────────────────
function setStatus(enabled) {
  if (enabled) {
    statusDot.classList.remove("inactive");
    statusText.textContent = "ACTIVE — Watching LeetCode & GFG";
    statusText.className = "status-text on";
    toggleBtn.textContent = "Pause";
  } else {
    statusDot.classList.add("inactive");
    statusText.textContent = "PAUSED — Submissions not captured";
    statusText.className = "status-text off";
    toggleBtn.textContent = "Resume";
  }
}

toggleBtn.addEventListener("click", () => {
  chrome.storage.local.get("captureEnabled", (data) => {
    const current = data.captureEnabled !== false;
    const next = !current;
    chrome.storage.local.set({ captureEnabled: next }, () => setStatus(next));
  });
});

// ── Save URL ──────────────────────────────────────────────────────────────────
saveUrl.addEventListener("click", () => {
  const url = urlInput.value.trim().replace(/\/$/, "");
  if (!url) return;

  chrome.storage.local.set({ websiteUrl: url }, () => {
    openDashboard.href = url + "/dashboard";
    openRevision.href = url + "/revision";
    showToast();
  });
});

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast() {
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}
