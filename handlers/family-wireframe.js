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
            ]
        }
    ],
    relations: []
}
