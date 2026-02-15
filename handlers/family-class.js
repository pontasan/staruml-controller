module.exports = {
    prefix: 'class',
    label: 'Class/Package Diagram',
    diagrams: { types: ['UMLClassDiagram', 'UMLPackageDiagram'] },
    resources: [
        {
            name: 'classes',
            types: ['UMLClass'],
            updateFields: [
                'name', 'documentation',
                { name: 'isAbstract', type: 'boolean' },
                { name: 'isLeaf', type: 'boolean' },
                { name: 'isActive', type: 'boolean' }
            ],
            children: [
                { name: 'attributes', type: 'UMLAttribute', field: 'attributes', createFields: ['name', 'type', 'visibility', 'isStatic', 'defaultValue'] },
                { name: 'operations', type: 'UMLOperation', field: 'operations', createFields: ['name', 'visibility', 'isStatic'] },
                { name: 'receptions', type: 'UMLReception', field: 'receptions' },
                { name: 'template-parameters', type: 'UMLTemplateParameter', field: 'templateParameters' }
            ],
            serialize: function (elem) {
                if (!elem) return null
                const result = {
                    _id: elem._id,
                    _type: elem.constructor.name,
                    name: elem.name || '',
                    _parentId: elem._parent ? elem._parent._id : null
                }
                if (elem.documentation) result.documentation = elem.documentation
                if (elem.isAbstract) result.isAbstract = true
                if (elem.isLeaf) result.isLeaf = true
                if (elem.isActive) result.isActive = true
                result.attributes = (elem.attributes || []).map(function (a) {
                    return { _id: a._id, name: a.name || '', type: a.type || '', visibility: a.visibility, isStatic: a.isStatic || false }
                })
                result.operations = (elem.operations || []).map(function (o) {
                    return { _id: o._id, name: o.name || '', visibility: o.visibility, isStatic: o.isStatic || false }
                })
                return result
            }
        },
        {
            name: 'interfaces',
            types: ['UMLInterface'],
            children: [
                { name: 'attributes', type: 'UMLAttribute', field: 'attributes', createFields: ['name', 'type', 'visibility'] },
                { name: 'operations', type: 'UMLOperation', field: 'operations', createFields: ['name', 'visibility'] }
            ]
        },
        {
            name: 'enumerations',
            types: ['UMLEnumeration'],
            children: [
                { name: 'literals', type: 'UMLEnumerationLiteral', field: 'literals' }
            ]
        },
        {
            name: 'data-types',
            types: ['UMLDataType', 'UMLPrimitiveType', 'UMLSignal']
        },
        {
            name: 'packages',
            types: ['UMLPackage', 'UMLModel', 'UMLSubsystem']
        }
    ],
    relations: [
        {
            name: 'associations',
            type: 'UMLAssociation',
            hasEnds: true,
            endFields: ['name', 'navigable', 'aggregation', 'multiplicity']
        },
        { name: 'generalizations', type: 'UMLGeneralization' },
        { name: 'dependencies', type: 'UMLDependency' },
        { name: 'interface-realizations', type: 'UMLInterfaceRealization' },
        { name: 'realizations', type: 'UMLRealization' },
        { name: 'template-bindings', type: 'UMLTemplateBinding' }
    ]
}
