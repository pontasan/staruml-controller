module.exports = {
    prefix: 'mindmap',
    label: 'MindMap Diagram',
    diagrams: { types: ['MMMindmapDiagram'] },
    resources: [
        { name: 'nodes', types: ['MMNode'] }
    ],
    relations: [
        { name: 'edges', type: 'MMEdge' }
    ]
}
