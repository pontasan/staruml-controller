const VALID_PSEUDOSTATE_KINDS = [
    'initial', 'deepHistory', 'shallowHistory', 'join', 'fork',
    'junction', 'choice', 'entryPoint', 'exitPoint'
]

module.exports = {
    prefix: 'statemachine',
    label: 'State Machine Diagram',
    diagrams: { types: ['UMLStatechartDiagram'] },
    resources: [
        {
            name: 'states',
            types: ['UMLState', 'UMLSubmachineState'],
            children: [
                { name: 'regions', type: 'UMLRegion', field: 'regions' }
            ]
        },
        {
            name: 'pseudostates',
            types: ['UMLPseudostate'],
            createFields: ['pseudostateKind'],
            serialize: function (elem) {
                if (!elem) return null
                return {
                    _id: elem._id,
                    _type: elem.constructor.name,
                    name: elem.name || '',
                    kind: elem.kind || 'initial',
                    documentation: elem.documentation || undefined,
                    _parentId: elem._parent ? elem._parent._id : null
                }
            }
        },
        { name: 'final-states', types: ['UMLFinalState'] }
    ],
    relations: [
        {
            name: 'transitions',
            type: 'UMLTransition',
            updateFields: ['name', 'documentation', 'guard'],
            createFields: ['guard']
        }
    ],
    _constants: {
        validPseudostateKinds: VALID_PSEUDOSTATE_KINDS
    }
}
