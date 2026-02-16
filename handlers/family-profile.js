module.exports = {
    prefix: 'profile',
    label: 'Profile Diagram',
    diagrams: { types: ['UMLProfileDiagram'] },
    resources: [
        { name: 'profiles', types: ['UMLProfile'] },
        {
            name: 'stereotypes',
            types: ['UMLStereotype'],
            children: [
                { name: 'attributes', type: 'UMLAttribute', field: 'attributes', createFields: ['name', 'type'] },
                { name: 'operations', type: 'UMLOperation', field: 'operations', createFields: ['name', 'visibility', 'isStatic'] }
            ]
        },
        { name: 'metaclasses', types: ['UMLMetaClass'] }
    ],
    relations: [
        { name: 'extensions', type: 'UMLExtension' }
    ]
}
