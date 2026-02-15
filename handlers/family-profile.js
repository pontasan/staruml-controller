module.exports = {
    prefix: 'profile',
    label: 'Profile Diagram',
    diagrams: { types: ['UMLProfileDiagram'] },
    resources: [
        { name: 'profiles', types: ['UMLProfile'] },
        { name: 'stereotypes', types: ['UMLStereotype'] },
        { name: 'metaclasses', types: ['UMLMetaClass'] }
    ],
    relations: [
        { name: 'extensions', type: 'UMLExtension' }
    ]
}
