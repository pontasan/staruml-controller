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
            ]
        }
    ],
    relations: [
        { name: 'relationships', type: 'C4Relationship' }
    ]
}
