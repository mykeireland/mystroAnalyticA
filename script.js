// =========================
// Config
// =========================
// 
const API_BASE = "https://mystro-sec-endpoint.azurewebsites.net"; // <-- update if your host differs
const POLL_MS = 60000; // refresh interval

// =========================
// Boot
// =========================
document.addEventListener("DOMContentLoaded", function () {
  const isDashboard = document.title.includes("Dashboard");
  if (!isDashboard) return;

  // Ensure required elements exist
  if (!document.getElementById("whiteboard-content") || !document.getElementById("bin-content")) {
    console.warn("Dashboard elements not found.");
    return;
  }

  loadDashboard();
  setInterval(loadDashboard, POLL_MS);
});

// =========================
/** Safe JSON fetch with clear diagnostics (avoids 'Unrecognized token <' crashes) */
// =========================
async function fetchJSON(url, options = {}) {
  const res = await fetch(url, { cache: "no-store", ...options });
  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} from ${url}\n${text.slice(0, 300)}`);
  }
  if (!contentType.includes("application/json")) {
    const firstChar = text.trim().charAt(0);
    if (firstChar === "<") {
      throw new Error(`Expected JSON from ${url} but received HTML/XML (check route/CORS/auth).`);
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Expected JSON from ${url} but got '${contentType || "unknown"}'. Body: ${text.slice(0, 120)}`);
    }
  }
  return JSON.parse(text);
}

// =========================
// Main loader
// =========================
async function loadDashboard() {
  try {
    // 1) Ask the API for the latest assessment JSON blob names
    const list = await fetchJSON(`${API_BASE}/api/list`);
    const items = Array.isArray(list.items) ? list.items : [];
    if (!items.length) {
      resetSection("whiteboard");
      resetSection("bin");
      updateStatus("No data available.", "status-red");
      return;
    }

    // newest-first already (defensive sort anyway)
    items.sort((a, b) => (b.name || "").localeCompare(a.name || ""));

    // 2) Walk newest → oldest until we have both a whiteboard and a bin
    let whiteboard = null, bin = null, errorDetected = false;
    let whiteboardTime = null, binTime = null;

    for (const it of items) {
      const name = it.name;
      // pull content via API
      const got = await fetchJSON(`${API_BASE}/api/get?name=${encodeURIComponent(name)}`);

      // shape: { lastModified, name, data: {...} }
      const lm = got.lastModified ? new Date(got.lastModified) : null;
      const json = got.data || {};

      if (json.error) { errorDetected = true; break; }

      if (json.type === "whiteboard" && !whiteboard) {
        whiteboard = json;
        whiteboardTime = lm;
      } else if (json.type === "bin" && !bin) {
        bin = json;
        binTime = lm;
      }

      if (whiteboard && bin) break;
    }

    // 3) Handle error/empty cases
    if (errorDetected) {
      resetSection("whiteboard");
      resetSection("bin");
      updateStatus("Neither whiteboard nor bin detected in image", "status-red blinking");
      return;
    }

    if (!whiteboard && !bin) {
      resetSection("whiteboard");
      resetSection("bin");
      updateStatus("No valid whiteboard or bin data found.", "status-red");
      return;
    }

    // 4) Render whiteboard
    if (whiteboard) {
      document.getElementById("whiteboard-content").innerHTML = `
        <div class="sub-item">Present: ${icon(whiteboard.present)}</div>
        <div class="sub-item">Damaged: ${icon(whiteboard.damaged)}</div>
        <div class="sub-item">Clean: ${icon(whiteboard.clean)}</div>
        <div class="sub-item">Description: ${capitalize(whiteboard.description || "")}</div>
        <div class="sub-item">Pass: ${icon(whiteboard.pass)}</div>
      `;
      if (whiteboardTime) {
        document.getElementById("whiteboard-timestamp").innerText =
          "Last image received: " + whiteboardTime.toLocaleTimeString();
      } else {
        document.getElementById("whiteboard-timestamp").innerText = "";
      }
    } else {
      resetSection("whiteboard");
    }

    // 5) Render bin
    if (bin) {
      const isEmpty = bin.status === "empty" ? "yes" : "no";
      document.getElementById("bin-content").innerHTML = `
        <div class="sub-item">Present: ${icon(bin.present)}</div>
        <div class="sub-item">Empty: ${icon(isEmpty)}</div>
        <div class="sub-item">Needs Changing: ${icon(bin.needs_changing)}</div>
        <div class="sub-item">Pass: ${icon(bin.pass)}</div>
      `;
      if (binTime) {
        document.getElementById("bin-timestamp").innerText =
          "Last image received: " + binTime.toLocaleTimeString();
      } else {
        document.getElementById("bin-timestamp").innerText = "";
      }
    } else {
      resetSection("bin");
    }

    // 6) Status indicators (green/yellow/red) with 3s tolerance window
    const timestampsClose = (a, b) => Math.abs(a - b) < 3000;
    const whiteMs = whiteboardTime ? whiteboardTime.getTime() : 0;
    const binMs = binTime ? binTime.getTime() : 0;
    const latest = Math.max(whiteMs, binMs);

    setStatus("whiteboard-status",
      whiteboard ? (timestampsClose(whiteMs, latest) ? "status-green" : "status-yellow") : "status-red");

    setStatus("bin-status",
      bin ? (timestampsClose(binMs, latest) ? "status-green" : "status-yellow") : "status-red");

    updateStatus("Valid data detected.", "");
  } catch (e) {
    console.error("Fetch error:", e);
    resetSection("whiteboard");
    resetSection("bin");
    updateStatus("Error loading data.", "status-red");
  }
}

// =========================
// UI helpers (unchanged)
// =========================
function icon(val) {
  return val === "yes" ? '<span class="tick">&#10004;</span>' : '<span class="cross">&#10006;</span>';
}
function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function setStatus(id, cls) {
  const el = document.getElementById(id);
  if (el) el.className = "status-indicator " + cls;
}
function updateStatus(text, cls) {
  const el = document.getElementById("status-content");
  if (el) {
    el.innerText = text;
    el.className = cls || "";
  }
}
function resetSection(section) {
  const content = document.getElementById(`${section}-content`);
  const timestamp = document.getElementById(`${section}-timestamp`);
  if (content) content.innerText = "Awaiting Data…";
  if (timestamp) timestamp.innerText = "";
  setStatus(`${section}-status`, "status-red");
}
