module.exports = {
    prefix: 'component',
    label: 'Component Diagram',
    diagrams: { types: ['UMLComponentDiagram'] },
    resources: [
        { name: 'components', types: ['UMLComponent'] },
        {
            name: 'artifacts',
            types: ['UMLArtifact'],
            createFields: ['fileName'],
            updateFields: ['name', 'documentation', 'fileName'],
            serialize: function (elem) {
                const result = require('./crud-factory').defaultSerializeNode(elem)
                if (elem.fileName !== undefined) result.fileName = elem.fileName || ''
                return result
            }
        }
    ],
    relations: [
        { name: 'component-realizations', type: 'UMLComponentRealization' },
        { name: 'dependencies', type: 'UMLDependency' },
        { name: 'generalizations', type: 'UMLGeneralization' },
        { name: 'interface-realizations', type: 'UMLInterfaceRealization' }
    ]
}
