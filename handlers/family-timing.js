module.exports = {
    prefix: 'timing',
    label: 'Timing Diagram',
    diagrams: { types: ['UMLTimingDiagram'] },
    resources: [
        { name: 'lifelines', types: ['UMLLifeline'] },
        { name: 'timing-states', types: ['UMLTimingState'], modelTypes: ['UMLConstraint'] }
    ],
    relations: [
        { name: 'time-segments', type: 'UMLTimeSegment' }
    ]
}
