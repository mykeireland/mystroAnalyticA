document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        loadData();
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
        loadData(); // Reload data after save if on index
    });

    document.getElementById('account').value = localStorage.getItem('account') || '';
    document.getElementById('container').value = localStorage.getItem('container') || 'logicapp-outputs'; // Default to new container
    document.getElementById('sas').value = localStorage.getItem('sas') || '';
}

async function loadData() {
    const account = localStorage.getItem('account');
    const container = localStorage.getItem('container');
    const sas = localStorage.getItem('sas');

    if (!account || !container || !sas) {
        document.getElementById('dashboard').innerHTML = '<p>Please configure settings first.</p>';
        return;
    }

    const listUrl = `https://${account}.blob.core.windows.net/${container}?restype=container&comp=list${sas}`;
    try {
        const response = await fetch(listUrl, { method: 'GET' });
        if (!response.ok) throw new Error('List failed');
        const xml = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xml, 'text/xml');
        const blobs = xmlDoc.getElementsByTagName('Name');
        let latestBlob = '';
        let latestTime = 0;
        for (let blob of blobs) {
            const name = blob.textContent;
            if (name.endsWith('.json')) {
                const timeMatch = name.match(/(\d{8}_\d{6})/);
                if (timeMatch) {
                    const time = new Date(timeMatch[0].replace(/_/g, '/')).getTime();
                    if (time > latestTime) {
                        latestTime = time;
                        latestBlob = name;
                    }
                }
            }
        }

        if (!latestBlob) throw new Error('No JSON blob found');
        const url = `https://${account}.blob.core.windows.net/${container}/${latestBlob}${sas}`;
        const dataResponse = await fetch(url);
        if (!dataResponse.ok) throw new Error('Fetch failed');
        const data = await dataResponse.json();
        renderDashboard(data);
    } catch (error) {
        document.getElementById('dashboard').innerHTML = `<p>Error: ${error.message}</p>`;
    }
}

function renderDashboard(data) {
    const dashboard = document.getElementById('dashboard');
    dashboard.innerHTML = '';

    const categories = [
        { name: 'whiteboard', icon: 'fa-chalkboard' },
        { name: 'bin', icon: 'fa-trash' },
        { name: 'desktop', icon: 'fa-desktop' }
    ];

    categories.forEach(cat => {
        const section = document.createElement('div');
        section.className = 'category';
        section.innerHTML = `<h2><i class="fas ${cat.icon}"></i>${cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}</h2>`;
        const items = data[cat.name] || {};
        for (const [key, value] of Object.entries(items)) {
            let display = `<span class="sub-item">${key}: `;
            if (typeof value === 'boolean') {
                display += value ? '<i class="fas fa-check tick"></i>' : '<i class="fas fa-times cross"></i>';
            } else {
                display += value;
            }
            display += '</span>';
            section.innerHTML += display;
        }
        dashboard.appendChild(section);
    });
}
