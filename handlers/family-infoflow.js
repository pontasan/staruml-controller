module.exports = {
    prefix: 'infoflow',
    label: 'Information Flow Diagram',
    diagrams: { types: ['UMLInformationFlowDiagram'] },
    resources: [
        { name: 'info-items', types: ['UMLInformationItem'] }
    ],
    relations: [
        { name: 'information-flows', type: 'UMLInformationFlow' }
    ]
}
