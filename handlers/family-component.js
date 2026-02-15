module.exports = {
    prefix: 'component',
    label: 'Component Diagram',
    diagrams: { types: ['UMLComponentDiagram'] },
    resources: [
        { name: 'components', types: ['UMLComponent'] },
        { name: 'artifacts', types: ['UMLArtifact'] }
    ],
    relations: [
        { name: 'component-realizations', type: 'UMLComponentRealization' },
        { name: 'dependencies', type: 'UMLDependency' },
        { name: 'generalizations', type: 'UMLGeneralization' },
        { name: 'interface-realizations', type: 'UMLInterfaceRealization' }
    ]
}
