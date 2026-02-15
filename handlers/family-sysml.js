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
        { name: 'requirements', types: ['SysMLRequirement'] },
        {
            name: 'blocks',
            types: ['SysMLBlock', 'SysMLValueType', 'SysMLInterfaceBlock', 'SysMLConstraintBlock'],
            children: [
                { name: 'properties', type: 'SysMLProperty', field: 'ownedElements', createFields: ['name', 'type'] },
                { name: 'operations', type: 'SysMLOperation', field: 'operations', createFields: ['name'] },
                { name: 'flow-properties', type: 'SysMLFlowProperty', field: 'ownedElements', createFields: ['name'] }
            ]
        },
        { name: 'stakeholders', types: ['SysMLStakeholder'] },
        { name: 'viewpoints', types: ['SysMLViewpoint'] },
        { name: 'views', types: ['SysMLView'] },
        {
            name: 'parts',
            types: ['SysMLPart', 'SysMLReference', 'SysMLValue', 'SysMLPort', 'SysMLConstraintProperty', 'SysMLConstraintParameter']
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
