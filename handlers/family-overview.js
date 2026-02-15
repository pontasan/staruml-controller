module.exports = {
    prefix: 'overview',
    label: 'Interaction Overview Diagram',
    diagrams: { types: ['UMLInteractionOverviewDiagram'] },
    resources: [
        { name: 'interaction-uses', types: ['UMLInteractionUseInOverview'] },
        { name: 'interactions', types: ['UMLInteractionInOverview'] },
        {
            name: 'control-nodes',
            types: [
                'UMLInitialNode', 'UMLActivityFinalNode', 'UMLFlowFinalNode',
                'UMLForkNode', 'UMLJoinNode', 'UMLMergeNode', 'UMLDecisionNode'
            ]
        }
    ],
    relations: [
        { name: 'control-flows', type: 'UMLControlFlow' }
    ]
}
