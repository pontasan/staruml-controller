module.exports = {
    prefix: 'wireframe',
    label: 'Wireframe Diagram',
    diagrams: { types: ['WFWireframeDiagram'] },
    resources: [
        {
            name: 'frames',
            types: ['WFFrame', 'WFMobileFrame', 'WFWebFrame', 'WFDesktopFrame']
        },
        {
            name: 'widgets',
            types: [
                'WFButton', 'WFText', 'WFRadio', 'WFCheckbox', 'WFSwitch', 'WFLink',
                'WFTabList', 'WFTab', 'WFInput', 'WFDropdown', 'WFPanel', 'WFImage',
                'WFSeparator', 'WFAvatar', 'WFSlider'
            ],
            createFields: [{ param: 'checked', prop: 'checked' }],
            updateFields: ['name', 'documentation', { name: 'checked', type: 'boolean', prop: 'checked' }],
            serialize: function (elem) {
                const result = require('./crud-factory').defaultSerializeNode(elem)
                if (elem.checked !== undefined) result.checked = !!elem.checked
                return result
            }
        }
    ],
    relations: []
}
