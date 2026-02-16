const { defaultSerializeNode, defaultSerializeRelation } = require('./crud-factory')

module.exports = {
    prefix: 'bpmn',
    label: 'BPMN Diagram',
    diagrams: { types: ['BPMNDiagram'] },
    resources: [
        {
            name: 'participants',
            types: ['BPMNParticipant'],
            children: [
                { name: 'lanes', type: 'BPMNLane', field: 'ownedElements' }
            ]
        },
        {
            name: 'tasks',
            types: [
                'BPMNTask', 'BPMNSendTask', 'BPMNReceiveTask', 'BPMNServiceTask',
                'BPMNUserTask', 'BPMNManualTask', 'BPMNBusinessRuleTask', 'BPMNScriptTask',
                'BPMNCallActivity'
            ],
            createFields: ['script'],
            updateFields: ['name', 'documentation', 'script'],
            serialize: function (elem) {
                const result = defaultSerializeNode(elem)
                if (elem.script !== undefined) result.script = elem.script || ''
                return result
            }
        },
        {
            name: 'sub-processes',
            types: ['BPMNSubProcess', 'BPMNAdHocSubProcess', 'BPMNTransaction']
        },
        {
            name: 'events',
            types: [
                'BPMNStartEvent', 'BPMNIntermediateThrowEvent', 'BPMNIntermediateCatchEvent',
                'BPMNBoundaryEvent', 'BPMNEndEvent'
            ],
            children: [
                {
                    name: 'event-definitions',
                    type: 'BPMNTimerEventDefinition',
                    field: 'eventDefinitions',
                    createFields: ['name', 'type'],
                    _allTypes: [
                        'BPMNCompensateEventDefinition', 'BPMNCancelEventDefinition',
                        'BPMNErrorEventDefinition', 'BPMNLinkEventDefinition',
                        'BPMNSignalEventDefinition', 'BPMNTimerEventDefinition',
                        'BPMNEscalationEventDefinition', 'BPMNMessageEventDefinition',
                        'BPMNTerminateEventDefinition', 'BPMNConditionalEventDefinition'
                    ]
                }
            ]
        },
        {
            name: 'gateways',
            types: [
                'BPMNExclusiveGateway', 'BPMNInclusiveGateway', 'BPMNComplexGateway',
                'BPMNParallelGateway', 'BPMNEventBasedGateway'
            ]
        },
        {
            name: 'data-objects',
            types: ['BPMNDataObject', 'BPMNDataStore', 'BPMNDataInput', 'BPMNDataOutput', 'BPMNMessage']
        },
        {
            name: 'conversations',
            types: ['BPMNConversation', 'BPMNSubConversation', 'BPMNCallConversation']
        },
        {
            name: 'choreographies',
            types: ['BPMNChoreographyTask', 'BPMNSubChoreography']
        },
        {
            name: 'annotations',
            types: ['BPMNTextAnnotation', 'BPMNGroup'],
            createFields: ['text'],
            updateFields: ['name', 'documentation', 'text'],
            serialize: function (elem) {
                const result = defaultSerializeNode(elem)
                if (elem.text !== undefined) result.text = elem.text || ''
                return result
            }
        }
    ],
    relations: [
        {
            name: 'sequence-flows',
            type: 'BPMNSequenceFlow',
            createFields: ['condition'],
            updateFields: ['name', 'documentation', 'condition'],
            serialize: function (elem) {
                const result = defaultSerializeRelation(elem)
                if (elem.condition !== undefined) result.condition = elem.condition || ''
                return result
            }
        },
        { name: 'message-flows', type: 'BPMNMessageFlow' },
        { name: 'associations', type: 'BPMNAssociation' },
        { name: 'data-associations', type: 'BPMNDataAssociation' },
        { name: 'message-links', type: 'BPMNMessageLink' },
        { name: 'conversation-links', type: 'BPMNConversationLink' }
    ]
}
