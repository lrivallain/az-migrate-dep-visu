var nodeColorsElement = document.getElementById('nodeColors');
if (nodeColorsElement) {
    var nodeColors = JSON.parse(nodeColorsElement.textContent);
} else {
    var nodeColors = {}; // Fallback to an empty object if the element is not found
}

var table;
$(document).ready(function () {
    $('#column-select').select2(
        { width: '100%' }
    );

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
        }

        var enableClustering = getCookie('enableClustering');
        if (enableClustering) {
            $('#enable-clustering').prop('checked', enableClustering === 'true');
        }

        var groupNonRFC1918 = getCookie('groupNonRFC1918');
        if (groupNonRFC1918) {
            $('#group-nonrfc1918').prop('checked', groupNonRFC1918 === 'true');
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
        setCookie('selectedColumns', '', -1);
        setCookie('enableClustering', '', -1);
        setCookie('groupNonRFC1918', '', -1);
        location.reload();
    }

    $('#reset-preferences').on('click', function () {
        resetPreferences();
    });

    loadSettings();

    if (!$.fn.DataTable.isDataTable('#flows-table')) {
        table = $('#flows-table').DataTable({
            orderCellsTop: true,
            fixedHeader: true,
            columnDefs: [
                { targets: [0, 2, 3, 4, 6, 7, 9, 10], visible: false }  // Hide columns by default
            ]
        });
    }

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

    var network;
    var physicsEnabled = true;

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
                arrows: 'to'
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

        table.column(8).search(port).column(9).search(sourceVlan).column(10).search(destinationVlan).draw();

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
        var csv = 'Source Server Name,Source IP,Source Application,Source Process,Destination Server Name,Destination IP,Destination Application,Destination Process,Destination Port,Source VLAN,Destination VLAN,Count\n';
        table.rows({ filter: 'applied' }).every(function (rowIdx, tableLoop, rowLoop) {
            var data = this.data();
            csv += data.join(',') + '\n';
        });

        var hiddenElement = document.createElement('a');
        hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
        hiddenElement.target = '_blank';
        hiddenElement.download = 'network_flows.csv';
        hiddenElement.click();
    });

    updateGraph();
});
