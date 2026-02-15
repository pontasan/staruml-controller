module.exports = {
    prefix: 'communication',
    label: 'Communication Diagram',
    diagrams: { types: ['UMLCommunicationDiagram'] },
    resources: [
        { name: 'lifelines', types: ['UMLLifeline'] }
    ],
    relations: [
        { name: 'connectors', type: 'UMLConnector' }
    ]
}
