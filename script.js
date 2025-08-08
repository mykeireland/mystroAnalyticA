document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        loadData();
        setInterval(loadData, 60000);
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
    const account = 'mystroblobstore';
    const container = 'json-outbound';
    // This is a correct SAS token string. It does NOT have a leading '?'
    // Please regenerate a new one in the portal with both Read and List permissions.
    const sasTokenWithoutPrefix = 'sp=r&st=2025-08-08T01:38:10Z&se=2025-08-08T09:53:10Z&spr=https&sv=2024-11-04&sr=c&sig=AexFNBahN1Nudz2cjzu8Jg44fxX95q1Wpc5Edjc5Bsc%3D';

    if (!account || !container || !sasTokenWithoutPrefix) {
        document.getElementById('dashboard').innerHTML = '<p>Configuration missing.</p>';
        return;
    }

    document.getElementById('dashboard').innerHTML = '<p>Loading...</p>';
    try {
        // Use a URLSearchParams object for robust URL building
        const params = new URLSearchParams(sasTokenWithoutPrefix);
        params.append('restype', 'container');
        params.append('comp', 'list');

        const listUrl = `https://${account}.blob.core.windows.net/${container}?${params.toString()}`;
        console.log('Fetching URL:', listUrl);

        const response = await fetch(listUrl, { method: 'GET' });
        if (!response.ok) throw new Error(`List failed: ${response.status} ${response.statusText}`);
        const xml = await response.text();
        console.log('Blob List XML:', xml);
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
                    const timeString = timeMatch[0];
                    const year = parseInt(timeString.substring(0, 4));
                    const month = parseInt(timeString.substring(4, 6)) - 1;
                    const day = parseInt(timeString.substring(6, 8));
                    const hour = parseInt(timeString.substring(9, 11));
                    const minute = parseInt(timeString.substring(11, 13));
                    const second = parseInt(timeString.substring(13, 15));
                    
                    const time = new Date(year, month, day, hour, minute, second).getTime();
                    
                    if (time > latestTime) {
                        latestTime = time;
                        latestBlob = name;
                    }
                }
            }
        }
        
        if (!latestBlob) throw new Error('No JSON blob matching the "assessment_YYYYMMDD_HHMMSS.json" format was found.');
        console.log('Latest Blob:', latestBlob);
        
        // Build the URL for the latest blob
        const blobUrl = `https://${account}.blob.core.windows.net/${container}/${latestBlob}?${sasTokenWithoutPrefix}`;
        const dataResponse = await fetch(blobUrl);
        if (!dataResponse.ok) throw new Error(`Fetch failed: ${dataResponse.status} ${dataResponse.statusText}`);
        const data = await dataResponse.json();
        console.log('Fetched JSON:', data);
        renderDashboard(data);
    } catch (error) {
        document.getElementById('dashboard').innerHTML = `<p>Error: ${error.message}</p>`;
        console.error('Load Error:', error);
    }
}

function renderDashboard(data) {
    const dashboard = document.getElementById('dashboard');
    dashboard.innerHTML = '';

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
