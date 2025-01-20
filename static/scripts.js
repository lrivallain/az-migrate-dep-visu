var nodeColorsElement = document.getElementById('nodeColors');
if (nodeColorsElement) {
    var nodeColors = JSON.parse(nodeColorsElement.textContent);
} else {
    var nodeColors = {}; // Fallback to an empty object if the element is not found
}

var physicsEnabled = true;

function getCookie(name) {
    var value = "; " + document.cookie;
    var parts = value.split("; " + name + "=");
    if (parts.length === 2) return parts.pop().split(";").shift();
}

function setCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function loadSettings() {
    var selectedColumns = getCookie('selectedColumns');
    if (selectedColumns) {
        selectedColumns = selectedColumns.split(',');
        $('#column-select').val(selectedColumns).trigger('change');
    } else {
        // Default selected columns
        $('#column-select').val(['1', '5', '8', '11']).trigger('change');
    }

    var enableClustering = getCookie('enableClustering');
    if (enableClustering) {
        $('#enable-clustering').prop('checked', enableClustering === 'true');
    }

    var groupNonRFC1918 = getCookie('groupNonRFC1918');
    if (groupNonRFC1918) {
        $('#group-nonrfc1918').prop('checked', groupNonRFC1918 === 'true');
    } else {
        $('#group-nonrfc1918').prop('checked', true); // Enable by default
    }
}

function saveSettings() {
    var selectedColumns = $('#column-select').val();
    setCookie('selectedColumns', selectedColumns.join(','), 7);

    var enableClustering = $('#enable-clustering').is(':checked');
    setCookie('enableClustering', enableClustering, 7);

    var groupNonRFC1918 = $('#group-nonrfc1918').is(':checked');
    setCookie('groupNonRFC1918', groupNonRFC1918, 7);
}

function resetPreferences() {
    setCookie('selectedColumns', '1,5,8,11', 7); // Default selected columns
    setCookie('enableClustering', 'false', 7);
    setCookie('groupNonRFC1918', 'true', 7);
    location.reload();
}

function isRFC1918(ip) {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    const first = parseInt(parts[0]);
    const second = parseInt(parts[1]);
    return (first === 10) || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}

function groupNonRFC1918(nodes, edges) {
    const nonRFC1918Node = { id: 'non-rfc1918', label: 'Non-RFC1918', shape: 'icon', icon: { face: 'FontAwesome', code: '\uf0c2', size: 75, color: '#00aaff' } };
    const newNodes = [];
    const newEdges = [];
    let nonRFC1918Involved = false;

    nodes.forEach(node => {
        if (isRFC1918(node.id)) {
            newNodes.push(node);
        } else {
            newEdges.push({ from: 'non-rfc1918', to: node.id });
            nonRFC1918Involved = true;
        }
    });

    edges.forEach(edge => {
        if (!isRFC1918(edge.from)) {
            edge.from = 'non-rfc1918';
        }
        if (!isRFC1918(edge.to)) {
            edge.to = 'non-rfc1918';
        }
        if (edge.from !== 'non-rfc1918' || edge.to !== 'non-rfc1918') {
            newEdges.push(edge);
        }
    });

    if (nonRFC1918Involved) {
        newNodes.push(nonRFC1918Node);
    }

    // Remove loop edge on the non-RFC1918 node
    return {
        nodes: newNodes,
        edges: newEdges.filter(edge => edge.from !== 'non-rfc1918' || edge.to !== 'non-rfc1918')
    };
}

function groupByVLAN(nodes, edges) {
    const vlanNodes = {};
    const newNodes = [];
    const newEdges = [];

    nodes.forEach(node => {
        if (node.vlan) {
            if (!vlanNodes[node.vlan]) {
                vlanNodes[node.vlan] = { id: `vlan-${node.vlan}`, label: `VLAN ${node.vlan}`, color: nodeColors[node.id] };
            }
        } else {
            newNodes.push(node);
        }
    });

    for (const vlan in vlanNodes) {
        newNodes.push(vlanNodes[vlan]);
    }

    edges.forEach(edge => {
        if (nodes.find(node => node.id === edge.from).vlan) {
            edge.from = `vlan-${nodes.find(node => node.id === edge.from).vlan}`;
        }
        if (nodes.find(node => node.id === edge.to).vlan) {
            edge.to = `vlan-${nodes.find(node => node.id === edge.to).vlan}`;
        }
        newEdges.push(edge);
    });

    return { nodes: newNodes, edges: newEdges };
}

function updateGraph() {
    var filteredData = table.rows({ filter: 'applied' }).data().toArray();
    var nodes = [];
    var edges = [];
    var nodeSet = new Set();
    var clusters = {};
    var enableClustering = $('#enable-clustering').is(':checked');
    var groupNonRFC1918Checked = $('#group-nonrfc1918').is(':checked');

    var groupedFlows = {};

    filteredData.forEach(function (row) {
        var source = row[1];
        var target = row[5];
        var port = row[8];
        var sourceVlan = row[9];
        var destinationVlan = row[10];
        var count = parseInt(row[11]);

        if (groupNonRFC1918Checked) {
            if (!isRFC1918(source)) {
                source = 'non-rfc1918';
            }
            if (!isRFC1918(target)) {
                target = 'non-rfc1918';
            }
        }

        var key = `${source}-${target}-${port}`;
        if (groupedFlows[key]) {
            groupedFlows[key].count += count;
        } else {
            groupedFlows[key] = {
                source: source,
                target: target,
                port: port,
                sourceVlan: sourceVlan,
                destinationVlan: destinationVlan,
                count: count
            };
        }

        if (!nodeSet.has(source)) {
            nodes.push({
                id: source,
                label: source,
                color: nodeColors[source],
                vlan: sourceVlan,
                group: sourceVlan || null // Add group property if VLAN is available
            });
            nodeSet.add(source);
        }
        if (!nodeSet.has(target)) {
            nodes.push({
                id: target,
                label: target,
                color: nodeColors[target],
                vlan: destinationVlan,
                group: destinationVlan || null // Add group property if VLAN is available
            });
            nodeSet.add(target);
        }
    });

    for (var key in groupedFlows) {
        var flow = groupedFlows[key];
        if (flow.source !== 'non-rfc1918' || flow.target !== 'non-rfc1918') {
            edges.push({
                from: flow.source,
                to: flow.target,
                label: flow.port,
                value: flow.count,
                title: `Port: ${flow.port}<br>Count: ${flow.count}${flow.sourceVlan ? `<br>Source VLAN: ${flow.sourceVlan}` : ''}${flow.destinationVlan ? `<br>Destination VLAN: ${flow.destinationVlan}` : ''}`
            });
        }
    }

    if (groupNonRFC1918Checked) {
        const groupedData = groupNonRFC1918(nodes, edges);
        nodes = groupedData.nodes;
        edges = groupedData.edges;
    }

    if (enableClustering) {
        const groupedData = groupByVLAN(nodes, edges);
        nodes = groupedData.nodes;
        edges = groupedData.edges;

        // Ensure only one edge is drawn for flows with the same VLAN source, VLAN destination, and port
        const uniqueEdges = {};
        edges.forEach(edge => {
            const edgeKey = `${edge.from}-${edge.to}-${edge.label}`;
            if (!uniqueEdges[edgeKey]) {
                uniqueEdges[edgeKey] = edge;
            } else {
                uniqueEdges[edgeKey].value += edge.value;
            }
        });
        edges = Object.values(uniqueEdges);
    }

    var container = document.getElementById('network');
    var data = {
        nodes: new vis.DataSet(nodes),
        edges: new vis.DataSet(edges)
    };

    if (nodes.length === 0 && edges.length === 0) {
        container.innerHTML = '<p class="text-center text-warning">No matching records found.</p>';
        document.getElementById('loading-bar').style.display = 'none';
        return;
    }

    var options = {
        nodes: {
            shape: 'dot',
            size: 16,
            font: {
                size: 16,
                color: '#ffffff'
            },
            borderWidth: 2,
        },
        edges: {
            arrows: 'to',
            font: {
                color: '#ffffff', // Set font color to white
                strokeWidth: 0 // Remove border around font
            }
        },
        physics: {
            enabled: physicsEnabled,
            barnesHut: {
                gravitationalConstant: -20000,
                centralGravity: 0.3,
                springLength: 200,
                springConstant: 0.04,
                damping: 0.09
            }
        },
        layout: {
            improvedLayout: false
        }
    };
    network = new vis.Network(container, data, options);

    document.getElementById('loading-bar').style.display = 'block';
    document.getElementById('loading-bar-progress').style.width = '0%';
    document.getElementById('loading-bar-progress').innerHTML = '0%';

    network.on("stabilizationProgress", function (params) {
        var widthFactor = params.iterations / params.total;
        var width = Math.max(0, 100 * widthFactor);

        document.getElementById('loading-bar-progress').style.width = width + '%';
        document.getElementById('loading-bar-progress').innerHTML = Math.round(widthFactor * 100) + '%';
        // wait 20ms
        setTimeout(function () { }, 20);
    });

    network.once("stabilizationIterationsDone", function () {
        network.setOptions({ physics: false });
    });

    network.once("stabilized", function () {
        document.getElementById('loading-bar').style.display = 'none';

        // Wait before enforcing a small move in the graph
        // This move to fix a rendering issue of icons in the graph
        setTimeout(function () {
            network.moveTo({
                offset: { x: 1, y: 1 }, // Move by 1 pixel
                duration: 0 // No animation
            });
            network.moveTo({
                offset: { x: -1, y: -1 }, // Move back by 1 pixel
                duration: 0 // No animation
            });
        }, 100);
    });

    network.setData(data);
}

function updateFilters() {
    var groupNonRFC1918Checked = $('#group-nonrfc1918').is(':checked');

    $('#source-ip-filter option').each(function () {
        var value = $(this).val();
        if (value && value !== 'non-rfc1918' && value !== 'rfc1918' && !isRFC1918(value)) {
            $(this).toggle(!groupNonRFC1918Checked);
        }
    });

    $('#destination-ip-filter option').each(function () {
        var value = $(this).val();
        if (value && value !== 'non-rfc1918' && value !== 'rfc1918' && !isRFC1918(value)) {
            $(this).toggle(!groupNonRFC1918Checked);
        }
    });
}

var table;
$(document).ready(function () {
    $('#column-select').select2(
        { width: '100%' }
    );

    $('#reset-preferences').on('click', function () {
        resetPreferences();
    });

    loadSettings();
});

function downloadCSV() {
    var csv = [];
    var rows = table.rows().nodes(); // Get all rows, not just the current page

    for (var i = 0; i < rows.length; i++) {
        var row = [], cols = rows[i].querySelectorAll("td, th");

        for (var j = 0; j < cols.length; j++) {
            // Escape double quotes by doubling them
            var cellText = cols[j].innerText.replace(/"/g, '""');
            // Wrap each cell value in double quotes
            row.push('"' + cellText + '"');
        }

        csv.push(row.join(","));
    }

    // Download CSV
    var csvFile = new Blob([csv.join("\n")], { type: "text/csv" });
    var downloadLink = document.createElement("a");
    downloadLink.download = "flows.csv";
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

function initializeTooltips() {
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

function initializeUploadButton() {
    document.getElementById('upload-button').addEventListener('click', function () {
        var fileInput = document.getElementById('file-input');
        var file = fileInput.files[0];
        if (file) {
            var reader = new FileReader();
            reader.onload = function (e) {
                var csvData = e.target.result;
                document.getElementById('file-name').textContent = file.name;
                processCSVData(csvData);
                document.getElementById('upload-section').style.display = 'none';
                document.getElementById('result-section').style.display = 'block';
            };
            reader.readAsText(file);
        } else {
            alert('Please select a file to upload.');
        }
    });
}

function processCSVData(csvData) {
    const rows = csvData.split('\n').slice(1);
    const data = rows.map(row => {
        const cols = row.split(',');
        return {
            source_server_name: cols[1],
            source: cols[2],
            source_application: cols[3],
            source_process: cols[4],
            destination_server_name: cols[5],
            target: cols[6],
            destination_application: cols[7],
            destination_process: cols[8],
            port: cols[9],
            source_vlan: cols[10],
            destination_vlan: cols[11],
            count: 1 // Assuming each row represents a single count
        };
    });

    // Group data by matching values and update count
    const groupedData = {};
    data.forEach(entry => {
        const key = `${entry.source_server_name}-${entry.source}-${entry.source_application}-${entry.source_process}-${entry.destination_server_name}-${entry.target}-${entry.destination_application}-${entry.destination_process}-${entry.port}-${entry.source_vlan}-${entry.destination_vlan}`;
        if (groupedData[key]) {
            groupedData[key].count += 1;
        } else {
            groupedData[key] = entry;
        }
    });

    const uniqueSourceIps = [...new Set(data.map(d => d.source))].sort();
    const uniqueDestinationIps = [...new Set(data.map(d => d.target))].sort();
    const uniquePorts = [...new Set(data.map(d => d.port))].sort((a, b) => a - b);
    const uniqueSourceVlans = [...new Set(data.map(d => d.source_vlan))].sort((a, b) => a - b);
    const uniqueDestinationVlans = [...new Set(data.map(d => d.destination_vlan))].sort((a, b) => a - b);

    const sourceIpFilter = document.getElementById('source-ip-filter');
    const destinationIpFilter = document.getElementById('destination-ip-filter');
    const portFilter = document.getElementById('port-filter');
    const sourceVlanFilter = document.getElementById('source-vlan-filter');
    const destinationVlanFilter = document.getElementById('destination-vlan-filter');

    uniqueSourceIps.forEach(ip => {
        const option = document.createElement('option');
        option.value = ip;
        option.textContent = ip;
        sourceIpFilter.appendChild(option);
    });

    uniqueDestinationIps.forEach(ip => {
        const option = document.createElement('option');
        option.value = ip;
        option.textContent = ip;
        destinationIpFilter.appendChild(option);
    });

    uniquePorts.forEach(port => {
        const option = document.createElement('option');
        option.value = port;
        option.textContent = port;
        portFilter.appendChild(option);
    });

    uniqueSourceVlans.forEach(vlan => {
        if (vlan && vlan.trim() != "") { // Check if VLAN is not empty
            //console.log("src vlan added: " + vlan);
            const option = document.createElement('option');
            option.value = vlan;
            option.textContent = vlan;
            sourceVlanFilter.appendChild(option);
        }
    });

    uniqueDestinationVlans.forEach(vlan => {
        if (vlan && vlan.trim() != "") { // Check if VLAN is not empty
            //console.log("dst vlan added: " + vlan + " type: " + typeof vlan);
            const option = document.createElement('option');
            option.value = vlan;
            option.textContent = vlan;
            destinationVlanFilter.appendChild(option);
        }
    });

    const tableBody = document.getElementById('flows-table-body');
    // remove all rows
    while (tableBody.firstChild) {
        tableBody.removeChild(tableBody.firstChild);
    }
    Object.values(groupedData).forEach(entry => {
        const row = document.createElement('tr');
        Object.values(entry).forEach(value => {
            const cell = document.createElement('td');
            cell.textContent = value;
            row.appendChild(cell);
        });
        tableBody.appendChild(row);
    });

    table = $('#flows-table').DataTable();

    $('#column-select').on('change', function () {
        var selectedColumns = $(this).val();
        table.columns().visible(false);
        if (selectedColumns) {
            selectedColumns.forEach(function (colIndex) {
                table.column(colIndex).visible(true);
            });
        }
        saveSettings();
    });

    // trigger change event to show selected columns
    $('#column-select').trigger('change');

    $('#source-ip-filter, #destination-ip-filter, #port-filter, #source-vlan-filter, #destination-vlan-filter, #enable-clustering, #group-nonrfc1918').on('change', function () {
        var sourceIp = $('#source-ip-filter').val();
        var destinationIp = $('#destination-ip-filter').val();
        var port = $('#port-filter').val();
        var sourceVlan = $('#source-vlan-filter').val();
        var destinationVlan = $('#destination-vlan-filter').val();

        if (sourceIp === 'non-rfc1918') {
            table.column(1).search('^(?!10\\.|172\\.(1[6-9]|2[0-9]|3[0-1])\\.|192\\.168\\.).*$', true, false);
        } else if (sourceIp === 'rfc1918') {
            table.column(1).search('^(10\\.|172\\.(1[6-9]|2[0-9]|3[0-1])\\.|192\\.168\\.)', true, false);
        } else {
            table.column(1).search(sourceIp);
        }

        if (destinationIp === 'non-rfc1918') {
            table.column(5).search('^(?!10\\.|172\\.(1[6-9]|2[0-9]|3[0-1])\\.|192\\.168\\.).*$', true, false);
        } else if (destinationIp === 'rfc1918') {
            table.column(5).search('^(10\\.|172\\.(1[6-9]|2[0-9]|3[0-1])\\.|192\\.168\\.)', true, false);
        } else {
            table.column(5).search(destinationIp);
        }

        if (port) {
            table.column(8).search('^' + port + '$', true, false); // Exact match for port
        } else {
            table.column(8).search('');
        }

        if (sourceVlan) {
            table.column(9).search('^' + sourceVlan + '$', true, false); // Exact match for source VLAN
        } else {
            table.column(9).search('');
        }

        if (destinationVlan) {
            table.column(10).search('^' + destinationVlan + '$', true, false); // Exact match for destination VLAN
        } else {
            table.column(10).search('');
        }

        table.draw();

        if ($('#group-nonrfc1918').is(':checked')) {
            table.rows().every(function () {
                var data = this.data();
                if (!data.originalSource) {
                    data.originalSource = data[1];
                }
                if (!data.originalTarget) {
                    data.originalTarget = data[5];
                }
                if (!isRFC1918(data[1])) {
                    data[1] = 'non-rfc1918';
                }
                if (!isRFC1918(data[5])) {
                    data[5] = 'non-rfc1918';
                }
                this.data(data);
            });
        } else {
            table.rows().every(function () {
                var data = this.data();
                if (data[1] === 'non-rfc1918') {
                    data[1] = data.originalSource;
                }
                if (data[5] === 'non-rfc1918') {
                    data[5] = data.originalTarget;
                }
                this.data(data);
            });
        }

        updateFilters();
        updateGraph();
        saveSettings();
    });

    $('#flows-table_filter input').on('keyup change', function () {
        table.search(this.value).draw();
        updateGraph();
    });

    $('#download-csv').off('click').on('click', function () {
        downloadCSV();
    });

    updateGraph();
}