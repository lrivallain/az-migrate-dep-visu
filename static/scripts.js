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
    });

    var network;
    var physicsEnabled = true;

    function updateGraph() {
        var filteredData = table.rows({ filter: 'applied' }).data().toArray();
        var nodes = [];
        var edges = [];
        var nodeSet = new Set();
        var clusters = {};
        var enableClustering = $('#enable-clustering').is(':checked');

        filteredData.forEach(function (row) {
            var source = row[1];
            var target = row[5];
            var port = row[8];
            var sourceVlan = row[9];
            var destinationVlan = row[10];
            var count = row[11];

            if (!nodeSet.has(source)) {
                nodes.push({ id: source, label: source, color: nodeColors[source] });
                nodeSet.add(source);
            }
            if (!nodeSet.has(target)) {
                nodes.push({ id: target, label: target, color: nodeColors[target] });
                nodeSet.add(target);
            }
            edges.push({
                from: source,
                to: target,
                label: port,
                value: count,
                title: `Port: ${port}<br>Count: ${count}${sourceVlan ? `<br>Source VLAN: ${sourceVlan}` : ''}${destinationVlan ? `<br>Destination VLAN: ${destinationVlan}` : ''}`
            });

            // Cluster nodes by source VLAN
            if (enableClustering && sourceVlan) {
                if (!clusters[sourceVlan]) {
                    clusters[sourceVlan] = [];
                }
                clusters[sourceVlan].push(source);
            }
        });

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
                }
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

        // Apply clustering
        if (enableClustering) {
            for (var vlan in clusters) {
                network.cluster({
                    joinCondition: function (nodeOptions) {
                        return clusters[vlan].includes(nodeOptions.id);
                    },
                    clusterNodeProperties: {
                        id: 'cluster_' + vlan,
                        label: 'VLAN ' + vlan,
                        borderWidth: 3,
                        shape: 'database',
                        color: nodeColors[clusters[vlan][0]]
                    }
                });
            }
        }
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
            document.getElementById('loading-bar').style.display = 'none';
            network.setOptions({ physics: false });
        });

        network.once("stabilized", function () {
            document.getElementById('loading-bar').style.display = 'none';
        });

        network.setData(data);
    }

    $('#source-ip-filter, #destination-ip-filter, #port-filter, #source-vlan-filter, #destination-vlan-filter, #enable-clustering').on('change', function () {
        var sourceIp = $('#source-ip-filter').val();
        var destinationIp = $('#destination-ip-filter').val();
        var port = $('#port-filter').val();
        var sourceVlan = $('#source-vlan-filter').val();
        var destinationVlan = $('#destination-vlan-filter').val();

        table.column(1).search(sourceIp).column(5).search(destinationIp).column(8).search(port).column(9).search(sourceVlan).column(10).search(destinationVlan).draw();
        updateGraph();
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
