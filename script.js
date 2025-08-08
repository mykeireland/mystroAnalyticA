document.addEventListener("DOMContentLoaded", function () {
  const isDashboard = document.title.includes("Dashboard");
  if (isDashboard) {
    loadDashboard();
    setInterval(loadDashboard, 60000);
  }

  const isSettings = document.title.includes("Settings");
  if (isSettings) {
    const form = document.getElementById("settingsForm");
    const account = document.getElementById("account");
    const container = document.getElementById("container");
    const sas = document.getElementById("sas");

    account.value = localStorage.getItem("account") || "";
    container.value = localStorage.getItem("container") || "";
    sas.value = localStorage.getItem("sas") || "";

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      localStorage.setItem("account", account.value);
      localStorage.setItem("container", container.value);
      localStorage.setItem("sas", sas.value);
      alert("Settings saved!");
    });
  }
});

async function loadDashboard() {
  const account = localStorage.getItem("account");
  const container = localStorage.getItem("container");
  const sas = localStorage.getItem("sas");
  if (!account || !container || !sas) {
    updateStatus("Missing settings.", "status-red");
    return;
  }

  const listUrl = `https://${account}.blob.core.windows.net/${container}?restype=container&comp=list&${sas}`;

  try {
    const res = await fetch(listUrl);
    const text = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "application/xml");
    const blobs = Array.from(xml.getElementsByTagName("Blob"))
      .map(b => ({
        name: b.getElementsByTagName("Name")[0].textContent,
        lastModified: b.getElementsByTagName("Last-Modified")[0].textContent
      }))
      .filter(b => b.name.endsWith(".json") && b.name.includes("assessment_"))
      .sort((a, b) => b.name.localeCompare(a.name));

    let whiteboard = null, bin = null, errorDetected = false;
    let whiteboardTime = null, binTime = null;

    for (const blob of blobs) {
      const url = `https://${account}.blob.core.windows.net/${container}/${blob.name}?${sas}`;
      const meta = blob.lastModified;
      const response = await fetch(url);
      const json = await response.json();

      if (json.error) {
        errorDetected = true;
        break;
      }

      if (json.type === "whiteboard" && !whiteboard) {
        whiteboard = json;
        whiteboardTime = new Date(meta);
      } else if (json.type === "bin" && !bin) {
        bin = json;
        binTime = new Date(meta);
      }

      if (whiteboard && bin) break;
    }

    if (errorDetected) {
      resetSection("whiteboard");
      resetSection("bin");
      updateStatus("Neither whiteboard nor bin detected in image", "status-red blinking");
      return;
    }

    // Render Whiteboard
    if (whiteboard) {
      document.getElementById("whiteboard-content").innerHTML = `
        <div class="sub-item">Present: ${icon(whiteboard.present)}</div>
        <div class="sub-item">Damaged: ${icon(whiteboard.damaged)}</div>
        <div class="sub-item">Clean: ${icon(whiteboard.clean)}</div>
        <div class="sub-item">Description: ${capitalize(whiteboard.description || "")}</div>
        <div class="sub-item">Pass: ${icon(whiteboard.pass)}</div>
      `;
      document.getElementById("whiteboard-timestamp").innerText = "Last image received: " + whiteboardTime.toLocaleTimeString();
    } else {
      document.getElementById("whiteboard-content").innerText = "Awaiting Data…";
      document.getElementById("whiteboard-timestamp").innerText = "";
    }

    // Render Bin
    if (bin) {
      const isEmpty = bin.status === "empty" ? "yes" : "no";
      document.getElementById("bin-content").innerHTML = `
        <div class="sub-item">Present: ${icon(bin.present)}</div>
        <div class="sub-item">Empty: ${icon(isEmpty)}</div>
        <div class="sub-item">Needs Changing: ${icon(bin.needs_changing)}</div>
        <div class="sub-item">Pass: ${icon(bin.pass)}</div>
      `;
      document.getElementById("bin-timestamp").innerText = "Last image received: " + binTime.toLocaleTimeString();
    } else {
      document.getElementById("bin-content").innerText = "Awaiting Data…";
      document.getElementById("bin-timestamp").innerText = "";
    }

    // Determine Status Circles
    const whiteboardStatus = whiteboard && bin
      ? (whiteboardTime > binTime ? "status-yellow" : "status-green")
      : (whiteboard ? "status-yellow" : "status-red");

    const binStatus = whiteboard && bin
      ? (binTime > whiteboardTime ? "status-yellow" : "status-green")
      : (bin ? "status-yellow" : "status-red");

    setStatus("whiteboard-status", whiteboardStatus);
    setStatus("bin-status", binStatus);

    updateStatus("Valid data detected.", "");
  } catch (err) {
    updateStatus("Error loading data.", "status-red");
    console.error(err);
  }
}

function icon(val) {
  return val === "yes" ? '<span class="tick">&#10004;</span>' : '<span class="cross">&#10006;</span>';
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function setStatus(id, className) {
  const el = document.getElementById(id);
  el.className = `status-indicator ${className}`;
}

function updateStatus(text, statusClass) {
  const el = document.getElementById("status-content");
  el.innerText = text;
  el.className = statusClass;
}

function resetSection(section) {
  document.getElementById(`${section}-content`).innerText = "Awaiting Data…";
  document.getElementById(`${section}-timestamp`).innerText = "";
  setStatus(`${section}-status`, "status-red");
}