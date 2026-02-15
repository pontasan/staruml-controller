module.exports = {
    prefix: 'timing',
    label: 'Timing Diagram',
    diagrams: { types: ['UMLTimingDiagram'] },
    resources: [
        { name: 'timing-states', types: ['UMLTimingState'] },
        { name: 'duration-constraints', types: ['UMLDurationConstraint'] },
        { name: 'time-ticks', types: ['UMLTimeTick'] },
        { name: 'time-constraints', types: ['UMLTimeConstraint'] }
    ],
    relations: [
        { name: 'time-segments', type: 'UMLTimeSegment' }
    ]
}
