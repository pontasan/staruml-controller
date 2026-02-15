module.exports = {
    prefix: 'azure',
    label: 'Azure Diagram',
    diagrams: { types: ['AzureDiagram'] },
    resources: [
        {
            name: 'elements',
            types: ['AzureGroup', 'AzureService', 'AzureCallout']
        }
    ],
    relations: [
        { name: 'connectors', type: 'AzureConnector' }
    ]
}
