module.exports = {
    prefix: 'flowchart',
    label: 'Flowchart Diagram',
    diagrams: { types: ['FCFlowchartDiagram'] },
    resources: [
        {
            name: 'nodes',
            types: [
                'FCProcess', 'FCTerminator', 'FCDecision', 'FCDelay', 'FCPredefinedProcess',
                'FCAlternateProcess', 'FCData', 'FCDocument', 'FCMultiDocument', 'FCPreparation',
                'FCDisplay', 'FCManualInput', 'FCManualOperation', 'FCCard', 'FCPunchedTape',
                'FCConnector', 'FCOffPageConnector', 'FCOr', 'FCSummingJunction', 'FCCollate',
                'FCSort', 'FCMerge', 'FCExtract', 'FCStoredData', 'FCDatabase',
                'FCDirectAccessStorage', 'FCInternalStorage'
            ]
        }
    ],
    relations: [
        { name: 'flows', type: 'FCFlow' }
    ]
}
