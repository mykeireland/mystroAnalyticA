function renderDashboard(data) {
    const dashboard = document.getElementById('dashboard');
    dashboard.innerHTML = '';
    const categories = [
        { name: 'whiteboard', icon: 'fa-chalkboard' },
        { name: 'bin', icon: 'fa-trash' }
    ];

    categories.forEach(cat => {
        const itemData = data[cat.name]; // Get the nested object (e.g., data.whiteboard)

        const section = document.createElement('div');
        section.className = 'category';
        section.innerHTML = `<h2><i class="fas ${cat.icon}"></i>${cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}</h2>`;

        if (itemData && Object.keys(itemData).length > 0) { // Check if the item data exists
            for (const key in itemData) {
                if (itemData.hasOwnProperty(key)) {
                    let display = `<span class="sub-item">${key.replace(/_/g, ' ')}: `;
                    const value = itemData[key];

                    if (typeof value === 'boolean') {
                        display += value ? '<i class="fas fa-check tick"></i>' : '<i class="fas fa-times cross"></i>';
                    } else {
                        display += value;
                    }
                    display += '</span>';
                    section.innerHTML += display;
                }
            }
        } else {
            section.innerHTML += '<span class="sub-item">No data</span>';
        }

        dashboard.appendChild(section);
    });
}
