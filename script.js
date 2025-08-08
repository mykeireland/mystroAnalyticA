document.addEventListener("DOMContentLoaded", function () {
    const isDashboard = document.title.includes("Dashboard");
    const isSettings = document.title.includes("Settings");

    if (isDashboard) {
        loadDashboard();
        setInterval(loadDashboard, 60000);
    }

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
        updateContent("status-content", "Missing settings.");
        return;
    }

    const url = `https://${account}.blob.core.windows.net/${container}?restype=container&comp=list&${sas}`;

    try {
        const res = await fetch(url);
        const text = await res.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "application/xml");
        const blobs = Array.from(xml.getElementsByTagName("Name"))
            .map(node => node.textContent)
            .filter(name => name.endsWith(".json") && name.includes("assessment_"));

        blobs.sort((a, b) => b.localeCompare(a));

        let whiteboardBlob = null;
        let binBlob = null;
        let invalidBlob = null;

        for (const name of blobs) {
            const blobUrl = `https://${account}.blob.core.windows.net/${container}/${name}?${sas}`;
            const res = await fetch(blobUrl);
            const json = await res.json();

            if (json.type === "whiteboard" && !whiteboardBlob) {
                whiteboardBlob = json;
            } else if (json.type === "bin" && !binBlob) {
                binBlob = json;
            } else if (json.error && !invalidBlob) {
                invalidBlob = json;
            }

            if (whiteboardBlob && binBlob && invalidBlob) break;
        }

        updateContent("whiteboard-content", whiteboardBlob ? formatWhiteboard(whiteboardBlob) : "Awaiting Data…");
        updateContent("bin-content", binBlob ? formatBin(binBlob) : "Awaiting Data…");
        updateContent("status-content", invalidBlob ? invalidBlob.error : "Valid data detected.");

    } catch (e) {
        updateContent("status-content", "Error loading data.");
        console.error(e);
    }
}

function updateContent(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

function formatWhiteboard(data) {
    return `
        <div class="sub-item">Present: ${data.present}</div>
        <div class="sub-item">Damaged: ${data.damaged}</div>
        <div class="sub-item">Clean: ${data.clean}</div>
        <div class="sub-item">Description: ${data.description}</div>
        <div class="sub-item">Pass: <span class="${data.pass === "yes" ? "tick" : "cross"}">${data.pass}</span></div>
    `;
}

function formatBin(data) {
    return `
        <div class="sub-item">Present: ${data.present}</div>
        <div class="sub-item">Status: ${data.status}</div>
        <div class="sub-item">Needs Changing: ${data.needs_changing}</div>
        <div class="sub-item">Pass: <span class="${data.pass === "yes" ? "tick" : "cross"}">${data.pass}</span></div>
    `;
}