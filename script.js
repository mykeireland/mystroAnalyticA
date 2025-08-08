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
            loadData(); // Reload data if on index page
        }
    });

    document.getElementById('account').value = localStorage.getItem('account') || '';
    document.getElementById('container').value = localStorage.getItem('container') || 'logicapp-outputs';
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

    document.getElementById('dashboard').innerHTML = '<p>Loading...</p>'; // Show loading state
    try {
        const listUrl = `https://${account}.blob.core.windows.net/${container}?restype=container&comp=list${sas}`;
        const response = await fetch(listUrl, { method: 'GET' });
        if (!response.ok) throw new Error(`List failed: ${response.status} ${response.statusText}`);
        const xml = await response.text();
        console.log('Blob List XML:', xml); // Debug log
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
        console.log('Latest Blob:', latestBlob); // Debug log
        const url = `https://${account}.blob.core.windows.net/${container}/${latestBlob}${sas}`;
        const dataResponse = await fetch(url);
        if (!dataResponse.ok) throw new Error(`Fetch failed: ${dataResponse.status} ${dataResponse.statusText}`);
        const data = await dataResponse.json();
        console.log('Fetched JSON:', data); // Debug log
        renderDashboard(data);
    } catch (error) {
        document.getElementById('dashboard').innerHTML = `<p>Error: ${error.message}</p>`;
        console.error('Load Error:', error); // Debug log
    }
}

function renderDashboard(data) {
    const dashboard = document.getElementById('dashboard');
    dashboard.innerHTML = ''; // Clear previous content

    const categories = [
        { name: 'whiteboard', key: 'whiteboard_clean', icon: 'fa-chalkboard' },
        { name: 'bin', key: 'bin_present', icon: 'fa-trash' },
        { name: 'desktop', key: 'desktop_clean', icon: 'fa-desktop' }
    ];

    categories.forEach(cat => {
        const section = document.createElement('div');
        section.className = 'category';
        section.innerHTML = `<h2><i class="fas ${cat.icon}"></i>${cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}</h2>`;
        let display = `<span class="sub-item">${cat.name} status: `;
        if (typeof data[cat.key] === 'boolean') {
            display += data[cat.key] ? '<i class="fas fa-check tick"></i>' : '<i class="fas fa-times cross"></i>';
        } else if (data[cat.key] !== undefined) {
            display += data[cat.key];
        } else {
            display += 'N/A';
        }
        display += '</span>';
        section.innerHTML += display;
        dashboard.appendChild(section);
    });
}
