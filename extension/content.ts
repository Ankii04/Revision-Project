import type { PlasmoCSConfig } from "plasmo";

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/problems/*", "https://practice.geeksforgeeks.org/problems/*"],
  run_at: "document_idle",
};

/**
 * Creates and displays a premium-style notification directly on LeetCode/GFG page.
 */
function showNotification(title: string) {
  const toast = document.createElement("div");
  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.right = "20px";
  toast.style.backgroundColor = "#1a1a1a";
  toast.style.color = "#ffffff";
  toast.style.padding = "16px 24px";
  toast.style.borderRadius = "14px";
  toast.style.zIndex = "999999";
  toast.style.display = "flex";
  toast.style.alignItems = "center";
  toast.style.gap = "12px";
  toast.style.boxShadow = "0 10px 40px rgba(0,0,0,0.5), 0 0 20px rgba(59,130,246,0.3)";
  toast.style.border = "1px solid rgba(59,130,246,0.5)";
  toast.style.fontFamily = "sans-serif";
  toast.style.transform = "translateY(100px)";
  toast.style.opacity = "0";
  toast.style.transition = "all 0.5s cubic-bezier(0.19, 1, 0.22, 1)";

  toast.innerHTML = `
    <div style="background: #3b82f6; border-radius: 8px; padding: 6px; display: inline-flex;">
      <svg style="width: 16px; height: 16px; fill: white;" viewBox="0 0 24 24"><path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>
    </div>
    <div style="flex: 1;">
      <div style="font-weight: 900; font-size: 13px; font-style: italic; letter-spacing: -0.02em; text-transform: uppercase;">Synced to Revision</div>
      <div style="font-size: 11px; opacity: 0.6; font-weight: 600;">Captured: ${title}</div>
    </div>
  `;

  document.body.appendChild(toast);

  // Animate In
  requestAnimationFrame(() => {
    toast.style.transform = "translateY(0)";
    toast.style.opacity = "1";
  });

  // Animate Out 
  setTimeout(() => {
    toast.style.transform = "translateY(20px)";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

/**
 * The website URL to send submissions to.
 * Change this to your deployed URL in production.
 */
const WEBSITE_URL = "http://localhost:3000";

/**
 * Capture solution code and meta-info from the page DOM and send it 
 * to the parent website's API.
 */
async function captureSubmission(platform: "LEETCODE" | "GFG") {
  const title = (document.querySelector("h4") as HTMLElement)?.innerText || (document.querySelector(".question-title") as HTMLElement)?.innerText || document.title;


  const slug = window.location.pathname.split("/").filter(Boolean).pop() || "unknown-problem";
  
  // Attempt to select the actual code from commonly used editor divs
  const code = Array.from(document.querySelectorAll(".view-line"))
    .map(line => line.textContent)
    .join("\n") || document.querySelector(".monaco-editor")?.textContent || "";

  // Capture the problem description from the DOM
  const descriptionElement = 
    document.querySelector('[data-key="description-content"]') || 
    document.querySelector(".problem-description") || 
    document.querySelector(".problem-statement") ||
    document.querySelector(".question-content");
  const description = descriptionElement ? descriptionElement.innerHTML : "";

  const payload = {
    title,
    slug,
    platform,
    description,
    solutionCode: code || "// Code not captured",
    language: "PYTHON", 
    submittedAt: new Date().toISOString(),
    // Must match the ExtensionCaptureSchema's captureSource enum
    captureSource: "submission_intercept",
    // Must match the CreateProblemSchema's importedVia enum (updated to include this value)
    importedVia: "extension_intercept",
  };

  try {
    const response = await fetch(`${WEBSITE_URL}/api/problems`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log("✅ Sync successful!");
      showNotification(title);
    } else {
      console.warn("⚠️ Sync rejection:", await response.text());
    }
  } catch (error) {
    console.error("❌ Network error during sync", error);
  }
}

/**
 * Logic to detect accepted submissions on the page
 */
function listenForSubmissions() {
  const platform = window.location.host.includes("leetcode") ? "LEETCODE" : "GFG";

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          const text = node.innerText?.toLowerCase();
          // Triggers on "Accepted" for LeetCode or "Success" for GFG
          if (text === "accepted" || text === "success") {
            captureSubmission(platform);
          }
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

listenForSubmissions();
