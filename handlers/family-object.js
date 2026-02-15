module.exports = {
    prefix: 'object',
    label: 'Object Diagram',
    diagrams: { types: ['UMLObjectDiagram'] },
    resources: [
        {
            name: 'objects',
            types: ['UMLObject'],
            children: [
                { name: 'slots', type: 'UMLSlot', field: 'slots' }
            ]
        }
    ],
    relations: [
        { name: 'links', type: 'UMLLink' }
    ]
}
