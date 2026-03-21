# DSA Revision — Browser Extension (Manifest V3)

A fully build-ready Chrome/Edge browser extension that **automatically captures** your accepted LeetCode and GeeksForGeeks solutions and syncs them to your DSA Revision dashboard.

---

## 📁 Structure

```
extension/
├── manifest.json        ← MV3 Manifest (entry point)
├── background.js        ← Service Worker (API relay, storage)
├── content.js           ← Content Script (injection into LC/GFG)
├── popup.html           ← Extension popup UI
├── popup.js             ← Popup logic
├── icons/               ← Extension icons (16/48/128px PNGs)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## 🚀 Loading the Extension

### Chrome / Edge (Chromium)

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer Mode** (top-right toggle)
3. Click **"Load unpacked"**
4. Select this `extension/` folder
5. The extension icon will appear in your toolbar ✅

### Firefox

Firefox uses Manifest V2. To use on Firefox:
- Change `"manifest_version"` to `2` in `manifest.json`
- Change `"action"` → `"browser_action"`
- Change `"host_permissions"` → include in `"permissions"`

---

## ⚙️ Configuration

1. Click the extension icon in your toolbar
2. Set the **Dashboard URL** to your deployed app URL (default: `http://localhost:3000`)
3. Click **Save**

The extension will automatically watch for accepted submissions.

---

## 🔄 How It Works

1. **Content Script** (`content.js`) is injected into every LeetCode & GFG problem page
2. It watches the DOM via `MutationObserver` for "Accepted" / "Success" banners
3. When detected, it extracts:
   - Problem title and slug
   - Your solution code (from the Monaco/CodeMirror editor)
   - Programming language
4. Sends a message to the **Background Service Worker** (`background.js`)
5. Service worker POSTs to `/api/problems` on your DSA Revision dashboard
6. A success toast appears on the page confirming the sync

---

## 🔐 Authentication

The extension uses `credentials: "include"` on the fetch call, which forwards your Clerk session cookie automatically. Make sure you're logged in to the dashboard in the **same browser profile**.

---

## 🛠️ Icons

Place your 16×16, 48×48, and 128×128 PNG icons in the `icons/` folder.  
If you have Node.js + the `canvas` package installed, you can auto-generate them:

```bash
npm install canvas
node generate-icons.js
```

Otherwise, add any PNG files manually — Chrome will show a default icon if they're missing.

---

## 📡 API Endpoint Used

```
POST /api/problems
Content-Type: application/json

{
  "title": "Two Sum",
  "slug": "two-sum",
  "platform": "LEETCODE",
  "solutionCode": "...",
  "language": "PYTHON",
  "importedVia": "extension_intercept",
  ...
}
```
