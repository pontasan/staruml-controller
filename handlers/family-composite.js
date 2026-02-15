module.exports = {
    prefix: 'composite',
    label: 'Composite Structure Diagram',
    diagrams: { types: ['UMLCompositeStructureDiagram'] },
    resources: [
        { name: 'ports', types: ['UMLPort'] },
        { name: 'parts', types: ['UMLPart'] },
        { name: 'collaborations', types: ['UMLCollaboration'] },
        { name: 'collaboration-uses', types: ['UMLCollaborationUse'] },
        { name: 'association-classes', types: ['UMLAssociationClass'] }
    ],
    relations: [
        { name: 'role-bindings', type: 'UMLRoleBinding' },
        { name: 'dependencies', type: 'UMLDependency' },
        { name: 'realizations', type: 'UMLRealization' }
    ]
}
