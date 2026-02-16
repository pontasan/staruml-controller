/**
 * Serialize a UMLAction that represents an inline interaction or interaction use.
 * Includes the linked UMLInteraction and child UMLSequenceDiagram IDs so that
 * callers can add lifelines/messages to the child sequence diagram.
 *
 * Link chain:
 *   Inline:  UMLAction.target → UMLSequenceDiagram → ._parent → UMLInteraction
 *   Ref:     UMLAction.target → UMLInteractionUse → .refersTo → UMLInteraction
 */
function serializeOverviewAction(elem) {
    if (!elem) return null
    const result = {
        _id: elem._id,
        _type: elem.constructor.name,
        name: elem.name || ''
    }
    if (elem.documentation) {
        result.documentation = elem.documentation
    }
    if (elem._parent) {
        result._parentId = elem._parent._id
    }
    if (elem.target) {
        const target = elem.target
        const targetType = target.constructor.name
        if (targetType === 'UMLSequenceDiagram') {
            result.sequenceDiagramId = target._id
            if (target._parent && target._parent.constructor.name === 'UMLInteraction') {
                result.interactionId = target._parent._id
            }
        } else if (targetType === 'UMLInteractionUse') {
            if (target.refersTo && target.refersTo.constructor.name === 'UMLInteraction') {
                result.interactionId = target.refersTo._id
            }
        }
    }
    return result
}

module.exports = {
    prefix: 'overview',
    label: 'Interaction Overview Diagram',
    diagrams: { types: ['UMLInteractionOverviewDiagram'] },
    resources: [
        { name: 'interaction-uses', types: ['UMLInteractionUseInOverview'], modelTypes: ['UMLAction'], serialize: serializeOverviewAction },
        { name: 'interactions', types: ['UMLInteractionInOverview'], modelTypes: ['UMLAction'], serialize: serializeOverviewAction },
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
