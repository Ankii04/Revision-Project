/**
 * content.js — DSA Revision Extension Content Script (MV3)
 *
 * Injected into LeetCode & GeeksForGeeks problem pages.
 * Watches for "Accepted" / "Success" submission banners, captures
 * the solution code and metadata, then sends to the background
 * service worker to relay to the DSA Revision API.
 */

// ── Platform Detection ────────────────────────────────────────────────────────
const PLATFORM = (() => {
  const host = window.location.hostname;
  if (host.includes("leetcode")) return "LEETCODE";
  if (host.includes("geeksforgeeks")) return "GFG";
  return "MANUAL";
})();

// ── Language mapping ──────────────────────────────────────────────────────────
const LANGUAGE_MAP = {
  python: "PYTHON",
  python3: "PYTHON",
  java: "JAVA",
  "c++": "CPP",
  cpp: "CPP",
  javascript: "JAVASCRIPT",
  typescript: "TYPESCRIPT",
  go: "GO",
  golang: "GO",
  rust: "RUST",
  kotlin: "KOTLIN",
  swift: "SWIFT",
  "c#": "CSHARP",
  csharp: "CSHARP",
};

function normalizeLanguage(raw = "") {
  return LANGUAGE_MAP[raw.toLowerCase().trim()] ?? "PYTHON";
}

// ── Code Extraction ───────────────────────────────────────────────────────────
function extractCode() {
  // 1. Try LeetCode Monaco editor - active lines
  const monacoLines = document.querySelectorAll(".view-line");
  if (monacoLines.length > 0) {
    return Array.from(monacoLines)
      .map((l) => l.textContent ?? "")
      .join("\n")
      .trim();
  }

  // 2. Try LeetCode Submission - static code block
  const submissionCode = document.querySelector(".monaco-editor .view-lines")
    ?? document.querySelector("pre[class*='language-']")
    ?? document.querySelector(".monaco-editor");
  if (submissionCode) return (submissionCode.innerText || submissionCode.textContent || "").trim();

  // 3. Try GFG CodeMirror
  const codeMirror = document.querySelector(".CodeMirror")?.querySelector(".CodeMirror-code");
  if (codeMirror) {
    return Array.from(codeMirror.querySelectorAll(".CodeMirror-line"))
      .map((l) => l.textContent ?? "")
      .join("\n")
      .trim();
  }

  // 4. Try generic <pre> fallback
  const genericPre = document.querySelector("pre code") ?? document.querySelector("pre");
  if (genericPre) return (genericPre.innerText || genericPre.textContent || "").trim();

  return "// Code could not be captured automatically. Please copy-paste it into the dashboard.";
}

// ── Title & Slug Extraction ───────────────────────────────────────────────────
function extractTitle() {
  // 1. Try specific LeetCode selectors (Old and New UI)
  const selectors = [
    '[data-cy="question-title"]',
    '.question-title',
    'div[class*="title"]',
    'h4',
    '.css-v3d350', // New UI title class
    '[data-path="/problems/"]' // Breadcrumb-ish
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    const text = el?.textContent?.trim();
    if (text && text.length > 2) return text;
  }

  // 2. Try GFG selectors
  const gfgSelectors = [".problem-statement h2", ".problems_header_content h3"];
  for (const selector of gfgSelectors) {
    const el = document.querySelector(selector);
    if (el?.textContent?.trim()) return el.textContent.trim();
  }

  // 3. Fallback to document.title (usually "Problem Name - LeetCode")
  let title = document.title.split(" - ")[0].split(" | ")[0].trim();
  if (title && title !== "LeetCode" && title !== "GeeksforGeeks") return title;

  // 4. Absolute fallback: Humanize the slug
  const slug = extractSlug();
  return slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function extractSlug() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  // /problems/two-sum → "two-sum"
  const idx = parts.indexOf("problems");
  if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
  return parts[parts.length - 1] ?? "unknown-problem";
}

function extractDescription() {
  if (PLATFORM === "LEETCODE") {
    const meta = document.querySelector('[data-track-load="description_content"]')
      || document.querySelector(".content__u49b")
      || document.querySelector(".question-content");
    return meta ? meta.innerHTML : "";
  }
  if (PLATFORM === "GFG") {
    const gfgMeta = document.querySelector(".problem-statement");
    return gfgMeta ? gfgMeta.innerHTML : "";
  }
  return "";
}

// ── Language Detection ────────────────────────────────────────────────────────
function detectLanguage() {
  // LeetCode: language selector button
  const langBtn = document.querySelector('[data-cy="lang-select"] button')
    ?? document.querySelector(".ant-select-selection-item")
    ?? document.querySelector("[id*='headlessui-listbox-button']");
  if (langBtn) return normalizeLanguage(langBtn.textContent ?? "");

  // LeetCode: check file extension hints in code area
  const codeArea = document.querySelector(".monaco-editor");
  if (codeArea) {
    const lang = codeArea.getAttribute("data-mode-id") ?? "";
    if (lang) return normalizeLanguage(lang);
  }

  return "PYTHON"; // safe default
}

// ── Notification Toast ────────────────────────────────────────────────────────
function showToast(title, success = true) {
  const toast = document.createElement("div");
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    background: success ? "#0f172a" : "#1a0000",
    color: "#fff",
    padding: "16px 22px",
    borderRadius: "16px",
    zIndex: "2147483647",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    boxShadow: success
      ? "0 12px 48px rgba(0,0,0,0.6), 0 0 24px rgba(59,130,246,0.35)"
      : "0 12px 48px rgba(0,0,0,0.6), 0 0 24px rgba(239,68,68,0.35)",
    border: success ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(239,68,68,0.5)",
    fontFamily: "system-ui, sans-serif",
    fontSize: "13px",
    transform: "translateY(80px)",
    opacity: "0",
    transition: "all 0.45s cubic-bezier(0.19,1,0.22,1)",
    maxWidth: "340px",
  });

  const icon = success
    ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 6L9 17L4 12" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
       </svg>`
    : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 8v4m0 4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>
       </svg>`;

  toast.innerHTML = `
    <div style="background:${success ? "rgba(59,130,246,0.15)" : "rgba(239,68,68,0.15)"};border-radius:10px;padding:6px;display:flex;align-items:center;justify-content:center;">
      ${icon}
    </div>
    <div>
      <div style="font-weight:800;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;${success ? "color:#93c5fd" : "color:#fca5a5"}">
        ${success ? "Synced to Revision" : "Sync Failed"}
      </div>
      <div style="font-size:11px;opacity:0.7;margin-top:2px;line-height:1.4;">${title}</div>
    </div>
  `;

  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.transform = "translateY(0)";
    toast.style.opacity = "1";
  });
  setTimeout(() => {
    toast.style.transform = "translateY(20px)";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 500);
  }, 4500);
}

// ── Debounce Guard ────────────────────────────────────────────────────────────
let lastCapturedSlug = "";
let captureDebounceTimer = null;

// ── Core Capture Function ─────────────────────────────────────────────────────
async function captureSubmission() {
  const slug = extractSlug();

  // Debounce: avoid double-firing for the same submission
  if (slug === lastCapturedSlug) return;
  clearTimeout(captureDebounceTimer);
  captureDebounceTimer = setTimeout(() => { lastCapturedSlug = ""; }, 10000);
  lastCapturedSlug = slug;

  const title = extractTitle();
  const solutionCode = extractCode();
  const language = detectLanguage();

  const payload = {
    title,
    slug,
    platform: PLATFORM,
    platformId: slug,
    platformUrl: window.location.href.split("?")[0],
    solutionCode: solutionCode || "// Code not captured",
    language,
    description: extractDescription(),
    difficulty: "UNKNOWN",
    tags: [],
    companies: [],
    isPremium: false,
    submittedAt: new Date().toISOString(),
    importedVia: "extension_intercept",
    captureSource: "submission_intercept",
  };

  console.log(`📦 [DSA Revision] Attempting sync for: "${title}" (${language})`);

  try {
    const response = await chrome.runtime.sendMessage({
      type: "SYNC_PROBLEM",
      payload,
    });

    if (response?.success) {
      console.log(`✅ [DSA Revision] Synced: "${title}"`);
      showToast(`Captured: ${title}`, true);
    } else {
      console.warn(`⚠️ [DSA Revision] Sync failed:`, response?.error);
      showToast(`Failed: ${response?.error ?? "Unknown error"}`, false);
    }
  } catch (err) {
    console.error(`❌ [DSA Revision] Extension error:`, err);
    showToast("Extension error. Check console.", false);
  }
}

// ── Submission Detection (MutationObserver) ───────────────────────────────────
const ACCEPTED_PHRASES = [
  "accepted",
  "success",
  "congrats",
  "solved",
  "correct answer",
];

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof HTMLElement)) continue;

      const text = (node.innerText ?? node.textContent ?? "").toLowerCase().trim();
      const isSuccess = ACCEPTED_PHRASES.some((phrase) => text.includes(phrase));

      if (isSuccess) {
        // Short delay to let the page render the final code state
        setTimeout(captureSubmission, 1200);
        return;
      }
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });
console.log(`🔍 [DSA Revision] Watching for accepted submissions on ${PLATFORM}...`);
