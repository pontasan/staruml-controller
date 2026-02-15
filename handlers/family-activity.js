module.exports = {
    prefix: 'activity',
    label: 'Activity Diagram',
    diagrams: { types: ['UMLActivityDiagram'] },
    resources: [
        {
            name: 'actions',
            types: ['UMLAction'],
            children: [
                { name: 'pins', type: 'UMLInputPin', field: 'inputs', createFields: ['name'] },
                { name: 'output-pins', type: 'UMLOutputPin', field: 'outputs', createFields: ['name'] }
            ]
        },
        {
            name: 'control-nodes',
            types: [
                'UMLInitialNode', 'UMLActivityFinalNode', 'UMLFlowFinalNode',
                'UMLForkNode', 'UMLJoinNode', 'UMLMergeNode', 'UMLDecisionNode',
                'UMLActivityEdgeConnector'
            ]
        },
        {
            name: 'object-nodes',
            types: ['UMLObjectNode', 'UMLCentralBufferNode', 'UMLDataStoreNode']
        },
        { name: 'partitions', types: ['UMLActivityPartition'] },
        { name: 'regions', types: ['UMLExpansionRegion', 'UMLInterruptibleActivityRegion'] }
    ],
    relations: [
        { name: 'control-flows', type: 'UMLControlFlow', updateFields: ['name', 'documentation', 'guard'] },
        { name: 'object-flows', type: 'UMLObjectFlow' },
        { name: 'exception-handlers', type: 'UMLExceptionHandler' },
        { name: 'activity-interrupts', type: 'UMLActivityInterrupt' }
    ]
}
