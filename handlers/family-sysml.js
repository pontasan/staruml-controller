const { defaultSerializeNode } = require('./crud-factory')

module.exports = {
    prefix: 'sysml',
    label: 'SysML Diagram',
    diagrams: {
        types: [
            'SysMLRequirementDiagram', 'SysMLBlockDefinitionDiagram',
            'SysMLInternalBlockDiagram', 'SysMLParametricDiagram'
        ]
    },
    resources: [
        {
            name: 'requirements',
            types: ['SysMLRequirement'],
            createFields: ['text', { param: 'requirementId', prop: 'id' }],
            updateFields: [
                'name', 'documentation', 'text',
                { name: 'requirementId', type: 'string', prop: 'id' }
            ],
            serialize: function (elem) {
                const result = defaultSerializeNode(elem)
                if (elem.text !== undefined) result.text = elem.text || ''
                if (elem.id !== undefined) result.requirementId = elem.id || ''
                return result
            }
        },
        {
            name: 'blocks',
            types: ['SysMLBlock', 'SysMLValueType', 'SysMLInterfaceBlock', 'SysMLConstraintBlock'],
            children: [
                { name: 'properties', type: 'SysMLProperty', field: 'properties', createFields: ['name', 'type'] },
                { name: 'operations', type: 'UMLOperation', field: 'operations', createFields: ['name'] },
                { name: 'flow-properties', type: 'SysMLFlowProperty', field: 'flowProperties', createFields: ['name'] }
            ]
        },
        {
            name: 'stakeholders',
            types: ['SysMLStakeholder'],
            createFields: ['concern'],
            updateFields: ['name', 'documentation', 'concern'],
            serialize: function (elem) {
                const result = defaultSerializeNode(elem)
                if (elem.concern !== undefined) result.concern = elem.concern || ''
                return result
            }
        },
        {
            name: 'viewpoints',
            types: ['SysMLViewpoint'],
            createFields: ['purpose', 'language', 'presentation'],
            updateFields: ['name', 'documentation', 'purpose', 'language', 'presentation'],
            serialize: function (elem) {
                const result = defaultSerializeNode(elem)
                if (elem.purpose !== undefined) result.purpose = elem.purpose || ''
                if (elem.language !== undefined) result.language = elem.language || ''
                if (elem.presentation !== undefined) result.presentation = elem.presentation || ''
                return result
            }
        },
        { name: 'views', types: ['SysMLView'] },
        {
            name: 'parts',
            types: ['SysMLPart', 'SysMLReference', 'SysMLValue', 'SysMLPort', 'SysMLConstraintProperty', 'SysMLConstraintParameter'],
            // SysMLReference, SysMLValue, SysMLConstraintProperty, SysMLConstraintParameter
            // all create SysMLProperty as the actual model type (factory ID ≠ model type).
            modelTypes: ['SysMLPart', 'SysMLPort', 'SysMLProperty'],
            // SysMLConstraintParameter's factory function (parameterFn) expects the diagram
            // itself as parent, not diagram._parent. It internally resolves the SysMLBlock
            // from diagram._parent.
            diagramAsParent: ['SysMLConstraintParameter']
        }
    ],
    relations: [
        { name: 'conforms', type: 'SysMLConform' },
        { name: 'exposes', type: 'SysMLExpose' },
        { name: 'copies', type: 'SysMLCopy' },
        { name: 'derive-reqts', type: 'SysMLDeriveReqt' },
        { name: 'verifies', type: 'SysMLVerify' },
        { name: 'satisfies', type: 'SysMLSatisfy' },
        { name: 'refines', type: 'SysMLRefine' },
        { name: 'connectors', type: 'SysMLConnector' }
    ]
}
