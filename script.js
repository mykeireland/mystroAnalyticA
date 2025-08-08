// Show "Awaiting new data..." on initial load
const dashboard = document.getElementById('dashboard');
dashboard.innerHTML = '<p>Awaiting new data...</p>';

// Load and process the API/JSON data
async function loadData() {
    try {
        // Change 'data.json' to your actual API or file path
        const response = await fetch('data.json');
        const blobData = await response.json();

        // Make sure we have valid structure
        if (!blobData.choices || !blobData.choices[0]?.message?.content) {
            renderDashboard(null, false);
            return;
        }

        // Parse the inner JSON string into an object
        const parsedData = JSON.parse(blobData.choices[0].message.content);

        // Render to dashboard
        renderDashboard(parsedData, true);
    } catch (err) {
        console.error('Error loading data:', err);
        renderDashboard(null, false);
    }
}

// Render the dashboard based on parsed data
function renderDashboard(data, isData) {
    dashboard.innerHTML = '';

    if (!data || !data.type) {
        dashboard.innerHTML = isData
            ? '<p>Awaiting new data...</p>'
            : '<p>No valid data found.</p>';
        return;
    }

    // Decide category info
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

    // Create the section
    const section = document.createElement('div');
    section.className = 'category';
    section.innerHTML = `
        <h2><i class="fas ${category.icon}"></i> ${category.name}</h2>
        <div class="category-content"></div>
    `;

    const contentContainer = section.querySelector('.category-content');

    // Loop through keys and render each field
    for (const [key, value] of Object.entries(data)) {
        if (key === 'type') continue;

        const item = document.createElement('div');

        const label = document.createElement('strong');
        label.textContent = key.replace(/_/g, ' ') + ':';
        item.appendChild(label);

        if (typeof value === 'string' && (value.toLowerCase() === 'yes' || value.toLowerCase() === 'no')) {
            const icon = document.createElement('i');
            icon.className = value.toLowerCase() === 'yes'
                ? 'fas fa-check tick'
                : 'fas fa-times cross';
            item.appendChild(icon);
        } else {
            const text = document.createElement('span');
            text.textContent = value;
            item.appendChild(text);
        }

        contentContainer.appendChild(item);
    }

    dashboard.appendChild(section);
}

// Run on page load
loadData();
