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
            ]
        }
    ],
    relations: [
        { name: 'relationships', type: 'C4Relationship' }
    ]
}
