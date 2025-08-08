async function loadData() {
    // Hardcode the values here
    const account = 'mystroblobstore';
    const container = 'json-outbound';
    // Paste your full SAS token string here, including the '?'
    const sas = '?sv=2024-11-04&ss=b&srt=co&sp=rl&se=2025-09-07T01:46Z&st=2025-08-08T01:46Z&spr=https&sig=...';

    if (!account || !container || !sas) {
        document.getElementById('dashboard').innerHTML = '<p>Configuration missing.</p>';
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
