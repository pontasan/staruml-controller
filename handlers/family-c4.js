const { defaultSerializeNode, defaultSerializeRelation } = require('./crud-factory')

function serializeC4Element(elem) {
    const result = defaultSerializeNode(elem)
    if (elem.technology !== undefined) result.technology = elem.technology || ''
    if (elem.description !== undefined) result.description = elem.description || ''
    return result
}

function serializeC4Relationship(elem) {
    const result = defaultSerializeRelation(elem)
    if (elem.technology !== undefined) result.technology = elem.technology || ''
    if (elem.description !== undefined) result.description = elem.description || ''
    return result
}

module.exports = {
    prefix: 'c4',
    label: 'C4 Diagram',
    diagrams: { types: ['C4Diagram'] },
    resources: [
        {
            name: 'elements',
            types: [
                'C4Person', 'C4SoftwareSystem', 'C4Container', 'C4ContainerDatabase',
                'C4ContainerWebApp', 'C4ContainerDesktopApp', 'C4ContainerMobileApp',
                'C4Component', 'C4Element'
            ],
            // Actual model class names for get/list filtering
            // (C4ContainerDatabase etc. are toolbox aliases that create C4Container with kind)
            modelTypes: [
                'C4Person', 'C4SoftwareSystem', 'C4Container',
                'C4Component', 'C4Element'
            ],
            createFields: ['technology', 'description'],
            updateFields: ['name', 'documentation', 'technology', 'description'],
            serialize: serializeC4Element
        }
    ],
    relations: [
        {
            name: 'relationships',
            type: 'C4Relationship',
            createFields: ['technology', 'description'],
            updateFields: ['name', 'documentation', 'technology', 'description'],
            serialize: serializeC4Relationship
        }
    ]
}
