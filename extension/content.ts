import type { PlasmoCSConfig } from "plasmo";

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/problems/*", "https://practice.geeksforgeeks.org/problems/*"],
  run_at: "document_idle",
};

/**
 * Submission Interceptor: Listens for successful submission events
 * or intercepts the underlying XHR request.
 */
function listenForSubmissions() {
  const platform = window.location.host.includes("leetcode") ? "LEETCODE" : "GFG";

  // Using a mutation observer to look for "Success" or "Accepted" elements
  // which appear only after a correct submission on LeetCode.
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          const text = node.innerText?.toLowerCase();
          if (text?.includes("accepted") || text?.includes("success")) {
            captureSubmission(platform);
            break;
          }
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Capture solution code and meta-info from the page DOM and send it 
 * to the parent website's API.
 */
async function captureSubmission(platform: "LEETCODE" | "GFG") {
  const title = document.querySelector("h4")?.innerText || document.title;
  const slug = window.location.pathname.split("/").filter(Boolean).pop();
  
  // Extract code from monaco or other editor divs
  const code = document.querySelector(".monaco-editor")?.textContent || "";
  
  const payload = {
    title,
    slug,
    platform,
    solutionCode: code,
    language: "PYTHON", // Fallback, would ideally detect from UI
    submittedAt: new Date().toISOString(),
    captureSource: "submission_intercept",
  };

  try {
    // Send to our main application API
    const response = await fetch("https://your-domain.com/api/extension/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log("✅ Problem captured and synced!");
    }
  } catch (error) {
    console.error("❌ Failed to sync capture", error);
  }
}

listenForSubmissions();
