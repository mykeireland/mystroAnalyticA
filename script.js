document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        loadData(); // Initial load
        setInterval(loadData, 60000); // Refresh every minute
    } else if (window.location.pathname.endsWith('settings.html')) {
        loadSettingsForm();
    }
});

function loadSettingsForm() {
    const form = document.getElementById('settingsForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        localStorage.setItem('account', document.getElementById('account').value);
        localStorage.setItem('container', document.getElementById('container').value);
        localStorage.setItem('sas', document.getElementById('sas').value);
        alert('Settings saved');
        if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
            loadData();
        }
    });
    document.getElementById('account').value = localStorage.getItem('account') || '';
    document.getElementById('container').value = localStorage.getItem('container') || 'logicapp-outputs';
    document.getElementById('sas').value = localStorage.getItem('sas') || '';
}

async function loadData() {
    // --- HARDCODED VALUES ---
    const account = 'mystroblobstore';
    const container = 'json-outbound';
    const sasTokenWithoutPrefix = 'sp=rl&st=2025-08-08T03:47:18Z&se=2025-08-09T12:02:18Z&spr=https&sv=2024-11-04&sr=c&sig=%2BNDFwyDsvSfbvxtemoNoHoUg2kQb7WHT7612ot9n8jo%3D';

    if (!account || !container || !sasTokenWithoutPrefix) {
        document.getElementById('dashboard').innerHTML = '<p>Configuration missing.</p>';
        return;
    }

    document.getElementById('dashboard').innerHTML = '<p>Loading...</p>';
    try {
        const listUrl = `https://${account}.blob.core.windows.net/${container}?${sasTokenWithoutPrefix}&restype=container&comp=list`;
        const response = await fetch(listUrl);
        if (!response.ok) throw new Error(`List failed: ${response.status} ${response.statusText}`);

        const xml = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xml, 'text/xml');
        const blobs = xmlDoc.getElementsByTagName('Name');
        let latestBlob = '';
        let latestTime = 0;
        
        for (let blob of blobs) {
            const name = blob.textContent;
            if (name.startsWith('assessment_') && name.endsWith('.json')) {
                const timeMatch = name.match(/(\d{8}_\d{6})/);
                if (timeMatch) {
                    const year = parseInt(timeMatch[0].substring(0, 4));
                    const month = parseInt(timeMatch[0].substring(4, 6)) - 1;
                    const day = parseInt(timeMatch[0].substring(6, 8));
                    const hour = parseInt(timeMatch[0].substring(9, 11));
                    const minute = parseInt(timeMatch[0].substring(11, 13));
                    const second = parseInt(timeMatch[0].substring(13, 15));
                    const time = new Date(year, month, day, hour, minute, second).getTime();
                    
                    if (time > latestTime) {
                        latestTime = time;
                        latestBlob = name;
                    }
                }
            }
        }
        
        if (!latestBlob) throw new Error('No JSON blob found.');
        
        const blobUrl = `https://${account}.blob.core.windows.net/${container}/${latestBlob}?${sasTokenWithoutPrefix}`;
        const dataResponse = await fetch(blobUrl);
        if (!dataResponse.ok) throw new Error(`Fetch failed: ${dataResponse.status} ${dataResponse.statusText}`);
        let data = await dataResponse.json();

        // ✅ Handle case where JSON is inside message.content
        if (data?.choices?.[0]?.message?.content) {
            try {
                data = JSON.parse(data.choices[0].message.content);
            } catch (e) {
                throw new Error("Invalid nested JSON inside message.content");
            }
        }

        renderDashboard(data);
    } catch (error) {
        document.getElementById('dashboard').innerHTML = `<p>Error: ${error.message}</p>`;
        console.error('Load Error:', error);
    }
}

function renderDashboard(data) {
    const dashboard = document.getElementById('dashboard');
    dashboard.innerHTML = '';

    if (!data || !data.type) {
        dashboard.innerHTML = '<p>No valid data found.</p>';
        return;
    }

    let category = {};
    if (data.type === 'whiteboard') {
        category = { name: 'Whiteboard', icon: 'fa-chalkboard' };
    } else if (data.type === 'bin') {
        category = { name: 'Bin', icon: 'fa-trash' };
    } else if (data.type === 'table') {
        category = { name: 'Table', icon: 'fa-table' };
    } else {
        dashboard.innerHTML = `<p>Unknown item type: ${data.type}</p>`;
        return;
    }

    const section = document.createElement('div');
    section.className = 'category';
    section.innerHTML = `<h2><i class="fas ${category.icon}"></i> ${category.name}</h2>`;

    for (const [key, value] of Object.entries(data)) {
        if (key === 'type') continue;
        let display = `<span class="sub-item">${key.replace(/_/g, ' ')}: `;
        if (typeof value === 'string' && (value.toLowerCase() === 'yes' || value.toLowerCase() === 'no')) {
            display += (value.toLowerCase() === 'yes')
                ? '<i class="fas fa-check tick"></i>'
                : '<i class="fas fa-times cross"></i>';
        } else {
            display += value;
        }
        display += '</span>';
        section.innerHTML += display;
    }

    dashboard.appendChild(section);
}

