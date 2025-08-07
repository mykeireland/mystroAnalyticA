// script.js
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
        localStorage.setItem('blob', document.getElementById('blob').value);
        localStorage.setItem('sas', document.getElementById('sas').value);
        alert('Settings saved');
    });

    document.getElementById('account').value = localStorage.getItem('account') || '';
    document.getElementById('container').value = localStorage.getItem('container') || '';
    document.getElementById('blob').value = localStorage.getItem('blob') || '';
    document.getElementById('sas').value = localStorage.getItem('sas') || '';
}

async function loadData() {
    const account = localStorage.getItem('account');
    const container = localStorage.getItem('container');
    const blob = localStorage.getItem('blob');
    const sas = localStorage.getItem('sas');

    if (!account || !container || !blob || !sas) {
        document.getElementById('dashboard').innerHTML = '<p>Please configure settings first.</p>';
        return;
    }

    const url = `https://${account}.blob.core.windows.net/${container}/${blob}${sas}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Fetch failed');
        const data = await response.json();
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