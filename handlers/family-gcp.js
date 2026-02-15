module.exports = {
    prefix: 'gcp',
    label: 'GCP Diagram',
    diagrams: { types: ['GCPDiagram'] },
    resources: [
        {
            name: 'elements',
            types: ['GCPElement', 'GCPUser', 'GCPZone', 'GCPProduct', 'GCPService']
        }
    ],
    relations: [
        { name: 'paths', type: 'GCPPath' }
    ]
}
