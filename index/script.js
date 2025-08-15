const API_BASE = "";
const POLL_MS = 60000;

document.addEventListener("DOMContentLoaded", function () {
  const isDashboard = document.title.includes("Dashboard");
  console.log("[boot] title:", document.title, "isDashboard:", isDashboard);
  if (!isDashboard) return;
  const requiredIds = [
    "whiteboard-content","whiteboard-timestamp","whiteboard-status",
    "bin-content","bin-timestamp","bin-status","status-content"
  ];
  const missing = requiredIds.filter(id => !document.getElementById(id));
  if (missing.length) {
    console.error("[boot] Missing required DOM IDs:", missing);
    return;
  }
  loadDashboard();
  setInterval(loadDashboard, POLL_MS);
});

async function fetchJSON(url, options = {}) {
  console.log("[fetchJSON]", url);
  const res = await fetch(url, { cache: "no-store", credentials: "include", ...options });
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const text = await res.text();
  if (!res.ok) {
    console.error("[fetchJSON] HTTP error", res.status, res.statusText, text.slice(0,200));
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  if (!ct.includes("application/json")) {
    const firstChar = text.trim().charAt(0);
    console.error("[fetchJSON] Non-JSON content-type:", ct, "Body starts:", text.slice(0,120));
    if (firstChar === "<") {
      throw new Error("Expected JSON but received HTML/XML (wrong endpoint, CORS, or auth).");
    }
    try { return JSON.parse(text); } catch {
      throw new Error(`Expected JSON but got ${ct || "unknown"}`);
    }
  }
  try { return JSON.parse(text); } catch (e) {
    console.error("[fetchJSON] JSON parse fail:", e, "Body starts:", text.slice(0,120));
    throw e;
  }
}

async function loadDashboard() {
  try {
    updateStatus("Loading…", "");
    const list = await fetchJSON(`/list`);
    const items = Array.isArray(list.items) ? list.items : [];
    console.log("[load] list count:", items.length, items.slice(0,3));
    if (!items.length) {
      resetSection("whiteboard");
      resetSection("bin");
      updateStatus("No data available.", "status-red");
      return;
    }
    items.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
    let wb = null, bin = null, wbTime = null, binTime = null, errorDetected = false;
    for (const it of items) {
      const name = it.name;
      if (!name) continue;
      const got  = await fetchJSON(`/get?name=${encodeURIComponent(name)}`);
      const lm = got.lastModified ? new Date(got.lastModified) : null;
      const data = got.data || {};
      console.log("[load] checked:", name, "type:", data.type);
      if (data.error) { errorDetected = true; break; }
      if (data.type === "whiteboard" && !wb) { wb = data; wbTime = lm; }
      if (data.type === "bin" && !bin) { bin = data; binTime = lm; }
      if (wb && bin) break;
    }
    if (errorDetected) {
      resetSection("whiteboard");
      resetSection("bin");
      updateStatus("Neither whiteboard nor bin detected in image", "status-red blinking");
      return;
    }
    if (!wb && !bin) {
      resetSection("whiteboard");
      resetSection("bin");
      updateStatus("No valid whiteboard or bin data found.", "status-red");
      return;
    }
    if (wb) {
      document.getElementById("whiteboard-content").innerHTML = `
        <div class="sub-item">Present: ${icon(wb.present)}</div>
        <div class="sub-item">Damaged: ${icon(wb.damaged)}</div>
        <div class="sub-item">Clean: ${icon(wb.clean)}</div>
        <div class="sub-item">Description: ${capitalize(wb.description || "")}</div>
        <div class="sub-item">Pass: ${icon(wb.pass)}</div>
      `;
      document.getElementById("whiteboard-timestamp").innerText = wbTime ? "Last image received: " + wbTime.toLocaleTimeString() : "";
    } else {
      resetSection("whiteboard");
    }
    if (bin) {
      const isEmpty = bin.status === "empty" ? "yes" : "no";
      document.getElementById("bin-content").innerHTML = `
        <div class="sub-item">Present: ${icon(bin.present)}</div>
        <div class="sub-item">Empty: ${icon(isEmpty)}</div>
        <div class="sub-item">Needs Changing: ${icon(bin.needs_changing)}</div>
        <div class="sub-item">Pass: ${icon(bin.pass)}</div>
      `;
      document.getElementById("bin-timestamp").innerText = binTime ? "Last image received: " + binTime.toLocaleTimeString() : "";
    } else {
      resetSection("bin");
    }
    const close = (a, b) => Math.abs(a - b) < 3000;
    const wMs = wbTime ? wbTime.getTime() : 0;
    const bMs = binTime ? binTime.getTime() : 0;
    const latest = Math.max(wMs, bMs);
    setStatus("whiteboard-status", wb ? (close(wMs, latest) ? "status-green" : "status-yellow") : "status-red");
    setStatus("bin-status", bin ? (close(bMs, latest) ? "status-green" : "status-yellow") : "status-red");
    updateStatus("Valid data detected.", "");
  } catch (e) {
    console.error("[loadDashboard] error:", e);
    resetSection("whiteboard");
    resetSection("bin");
    updateStatus(`Error loading data: ${e.message || e}`, "status-red");
  }
}

function icon(val) {
  return val === "yes" ? '<span class="tick">&#10004;</span>' : '<span class="cross">&#10006;</span>';
}
function capitalize(str) {
  return str ? (str.charAt(0).toUpperCase() + str.slice(1)) : "";
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
  const c = document.getElementById(`${section}-content`);
  const t = document.getElementById(`${section}-timestamp`);
  if (c) c.innerText = "Awaiting Data…";
  if (t) t.innerText = "";
  setStatus(`${section}-status`, "status-red");
}
