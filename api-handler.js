/**
 * REST API Handler for StarUML Controller
 *
 * Provides CRUD operations for ERD elements with input validation
 * and detailed request/response logging.
 */

const ddlGenerator = require('./ddl-generator')
const crudFactory = require('./handlers/crud-factory')
const { autoExpandFrame, fitFrameToViews, clearEdgeWaypoints } = require('./handlers/shared-helpers')

// ============================================================
// Family Configs & Routers
// ============================================================

const familyConfigs = [
    require('./handlers/family-class'),
    require('./handlers/family-usecase'),
    require('./handlers/family-activity'),
    require('./handlers/family-statemachine'),
    require('./handlers/family-component'),
    require('./handlers/family-deployment'),
    require('./handlers/family-object'),
    require('./handlers/family-communication'),
    require('./handlers/family-composite'),
    require('./handlers/family-infoflow'),
    require('./handlers/family-profile'),
    require('./handlers/family-timing'),
    require('./handlers/family-overview'),
    require('./handlers/family-flowchart'),
    require('./handlers/family-dfd'),
    require('./handlers/family-bpmn'),
    require('./handlers/family-c4'),
    require('./handlers/family-sysml'),
    require('./handlers/family-wireframe'),
    require('./handlers/family-mindmap'),
    require('./handlers/family-aws'),
    require('./handlers/family-azure'),
    require('./handlers/family-gcp')
]

const familyRouters = familyConfigs.map(function (config) {
    return crudFactory.createRouter(config)
})

// Collect all family endpoints for /api/status
const familyEndpoints = []
familyConfigs.forEach(function (config) {
    const eps = crudFactory.getEndpointList(config)
    eps.forEach(function (ep) {
        familyEndpoints.push(ep)
    })
})

// ============================================================
// Constants
// ============================================================

// --- Sequence Diagram Constants ---

const VALID_MESSAGE_SORTS = [
    'synchCall', 'asynchCall', 'asynchSignal', 'createMessage', 'deleteMessage', 'reply'
]

const VALID_INTERACTION_OPERATORS = [
    'alt', 'opt', 'par', 'loop', 'critical', 'neg', 'assert', 'strict', 'seq', 'ignore', 'consider', 'break'
]

// --- ERD Constants ---

const ALLOWED_COLUMN_TYPES = [
    'CHAR', 'VARCHAR', 'TEXT', 'CLOB',
    'BOOLEAN',
    'SMALLINT', 'INTEGER', 'INT', 'BIGINT', 'TINYINT',
    'FLOAT', 'DOUBLE', 'REAL', 'DECIMAL', 'NUMERIC',
    'DATE', 'TIME', 'DATETIME', 'TIMESTAMP',
    'BLOB', 'BINARY', 'VARBINARY',
    'UUID', 'JSON', 'JSONB', 'XML',
    'SERIAL', 'BIGSERIAL'
]

const VALID_TAG_KINDS = [0, 1, 2, 3, 4]
const TAG_KIND_LABELS = {
    0: 'string', 1: 'boolean', 2: 'number', 3: 'reference', 4: 'hidden'
}

const SEQUENCE_PREFIX = 'sequence#'
const INDEX_PREFIX = 'index#'
const SEQUENCE_ALLOWED_FIELDS = ['name']
const INDEX_ALLOWED_FIELDS = ['name', 'definition']

// --- Generic Diagram Constants ---

const ALLOWED_DIAGRAM_TYPES = [
    // UML
    'UMLClassDiagram', 'UMLPackageDiagram', 'UMLObjectDiagram',
    'UMLComponentDiagram', 'UMLDeploymentDiagram', 'UMLUseCaseDiagram',
    'UMLStatechartDiagram', 'UMLActivityDiagram', 'UMLCommunicationDiagram',
    'UMLCompositeStructureDiagram', 'UMLProfileDiagram',
    'UMLTimingDiagram', 'UMLInteractionOverviewDiagram', 'UMLInformationFlowDiagram',
    // Flowchart / DFD
    'FCFlowchartDiagram', 'DFDDiagram',
    // BPMN / C4
    'BPMNDiagram', 'C4Diagram',
    // SysML
    'SysMLRequirementDiagram', 'SysMLBlockDefinitionDiagram',
    'SysMLInternalBlockDiagram', 'SysMLParametricDiagram',
    // Wireframe / MindMap
    'WFWireframeDiagram', 'MMMindmapDiagram',
    // Cloud
    'AWSDiagram', 'AzureDiagram', 'GCPDiagram'
]

const ALLOWED_NODE_TYPES = [
    // Class diagram
    'UMLClass', 'UMLInterface', 'UMLSignal', 'UMLDataType', 'UMLPrimitiveType',
    'UMLEnumeration', 'UMLPackage', 'UMLModel', 'UMLSubsystem', 'UMLNaryAssociationNode',
    // Use case diagram
    'UMLActor', 'UMLUseCase', 'UMLUseCaseSubject',
    // Activity diagram
    'UMLAction', 'UMLObjectNode', 'UMLCentralBufferNode', 'UMLDataStoreNode',
    'UMLInitialNode',
    'UMLActivityFinalNode', 'UMLFlowFinalNode', 'UMLForkNode', 'UMLJoinNode',
    'UMLMergeNode', 'UMLDecisionNode', 'UMLActivityPartition', 'UMLExpansionRegion',
    'UMLActivityParameterNode', 'UMLInputPin', 'UMLOutputPin',
    'UMLInputExpansionNode', 'UMLOutputExpansionNode', 'UMLInterruptibleActivityRegion',
    'UMLStructuredActivityNode', 'UMLActivityEdgeConnector',
    // State machine diagram
    'UMLState', 'UMLSubmachineState', 'UMLPseudostate', 'UMLFinalState',
    'UMLConnectionPointReference',
    // Composite structure diagram
    'UMLPort', 'UMLPart', 'UMLCollaboration', 'UMLCollaborationUse', 'UMLAssociationClass',
    // Information flow diagram
    'UMLInformationItem',
    // Profile diagram
    'UMLProfile', 'UMLStereotype', 'UMLMetaClass',
    // Timing diagram
    'UMLTimingState', 'UMLDurationConstraint', 'UMLTimeTick', 'UMLTimeConstraint',
    // Interaction overview diagram
    'UMLInteractionUseInOverview', 'UMLInteractionInOverview',
    // Sequence diagram additional
    'UMLEndpoint', 'UMLGate', 'UMLContinuation',
    // Component diagram
    'UMLComponent', 'UMLArtifact',
    // Deployment diagram
    'UMLNode', 'UMLArtifactInstance', 'UMLComponentInstance', 'UMLNodeInstance',
    // Object diagram
    'UMLObject',
    // Communication diagram
    'UMLLifeline',
    // Flowchart
    'FCProcess', 'FCTerminator', 'FCDecision', 'FCDelay', 'FCPredefinedProcess',
    'FCAlternateProcess', 'FCData', 'FCDocument', 'FCMultiDocument', 'FCPreparation',
    'FCDisplay', 'FCManualInput', 'FCManualOperation', 'FCCard', 'FCPunchedTape',
    'FCConnector', 'FCOffPageConnector', 'FCOr', 'FCSummingJunction', 'FCCollate',
    'FCSort', 'FCMerge', 'FCExtract', 'FCStoredData', 'FCDatabase',
    'FCDirectAccessStorage', 'FCInternalStorage',
    // DFD
    'DFDExternalEntity', 'DFDProcess', 'DFDDataStore',
    // BPMN
    'BPMNParticipant', 'BPMNLane',
    'BPMNCallActivity', 'BPMNTask', 'BPMNSendTask', 'BPMNReceiveTask', 'BPMNServiceTask',
    'BPMNUserTask', 'BPMNManualTask', 'BPMNBusinessRuleTask', 'BPMNScriptTask',
    'BPMNSubProcess', 'BPMNAdHocSubProcess', 'BPMNTransaction',
    'BPMNChoreographyTask', 'BPMNSubChoreography',
    'BPMNStartEvent', 'BPMNIntermediateThrowEvent', 'BPMNIntermediateCatchEvent',
    'BPMNBoundaryEvent', 'BPMNEndEvent',
    'BPMNExclusiveGateway', 'BPMNInclusiveGateway', 'BPMNComplexGateway',
    'BPMNParallelGateway', 'BPMNEventBasedGateway',
    'BPMNDataObject', 'BPMNDataStore', 'BPMNDataInput', 'BPMNDataOutput', 'BPMNMessage',
    'BPMNConversation', 'BPMNSubConversation', 'BPMNCallConversation',
    'BPMNTextAnnotation', 'BPMNGroup',
    // C4
    'C4Person', 'C4SoftwareSystem', 'C4Container', 'C4ContainerDatabase',
    'C4ContainerWebApp', 'C4ContainerDesktopApp', 'C4ContainerMobileApp', 'C4Component', 'C4Element',
    // SysML
    'SysMLStakeholder', 'SysMLView', 'SysMLViewpoint', 'SysMLRequirement',
    'SysMLBlock', 'SysMLValueType', 'SysMLInterfaceBlock', 'SysMLConstraintBlock',
    'SysMLPart', 'SysMLReference', 'SysMLValue', 'SysMLPort', 'SysMLConstraintProperty', 'SysMLConstraintParameter',
    // Wireframe
    'WFFrame', 'WFMobileFrame', 'WFWebFrame', 'WFDesktopFrame',
    'WFButton', 'WFText', 'WFRadio', 'WFCheckbox', 'WFSwitch', 'WFLink',
    'WFTabList', 'WFTab', 'WFInput', 'WFDropdown', 'WFPanel', 'WFImage', 'WFSeparator', 'WFAvatar', 'WFSlider',
    // MindMap
    'MMNode',
    // AWS
    'AWSElement', 'AWSGroup', 'AWSGenericGroup', 'AWSAvailabilityZone',
    'AWSSecurityGroup', 'AWSService', 'AWSResource', 'AWSGeneralResource', 'AWSCallout',
    // Azure
    'AzureElement', 'AzureGroup', 'AzureService', 'AzureCallout',
    // GCP
    'GCPElement', 'GCPUser', 'GCPZone', 'GCPProduct', 'GCPService'
]

const ALLOWED_RELATION_TYPES = [
    // Class diagram
    'UMLAssociation', 'UMLDependency', 'UMLGeneralization', 'UMLInterfaceRealization',
    'UMLTemplateBinding', 'UMLContainment', 'UMLRealization',
    // Use case diagram
    'UMLInclude', 'UMLExtend',
    // Activity diagram
    'UMLControlFlow', 'UMLObjectFlow', 'UMLExceptionHandler', 'UMLActivityInterrupt',
    // State machine diagram
    'UMLTransition',
    // Composite structure / Information flow
    'UMLRoleBinding', 'UMLInformationFlow',
    // Profile
    'UMLExtension',
    // Timing
    'UMLTimeSegment',
    // Component diagram
    'UMLComponentRealization',
    // Deployment diagram
    'UMLDeployment', 'UMLCommunicationPath',
    // Object diagram
    'UMLLink',
    // Communication diagram
    'UMLConnector',
    // Flowchart
    'FCFlow',
    // DFD
    'DFDDataFlow',
    // BPMN
    'BPMNSequenceFlow', 'BPMNMessageFlow', 'BPMNAssociation',
    'BPMNDataAssociation', 'BPMNMessageLink', 'BPMNConversationLink',
    // C4
    'C4Relationship',
    // SysML
    'SysMLConform', 'SysMLExpose', 'SysMLCopy', 'SysMLDeriveReqt',
    'SysMLVerify', 'SysMLSatisfy', 'SysMLRefine', 'SysMLConnector',
    // MindMap
    'MMEdge',
    // AWS
    'AWSArrow',
    // Azure
    'AzureConnector',
    // GCP
    'GCPPath'
]

const ALLOWED_CHILD_TYPES = [
    'UMLAttribute', 'UMLOperation', 'UMLParameter', 'UMLEnumerationLiteral',
    'UMLPort', 'UMLReception', 'UMLExtensionPoint', 'UMLSlot',
    'UMLTemplateParameter', 'UMLRegion', 'UMLConstraint',
    'UMLInteractionOperand',
    'SysMLProperty', 'SysMLOperation', 'SysMLFlowProperty',
    'UMLInputPin', 'UMLOutputPin',
    // BPMN Event Definitions
    'BPMNCompensateEventDefinition', 'BPMNCancelEventDefinition',
    'BPMNErrorEventDefinition', 'BPMNLinkEventDefinition',
    'BPMNSignalEventDefinition', 'BPMNTimerEventDefinition',
    'BPMNEscalationEventDefinition', 'BPMNMessageEventDefinition',
    'BPMNTerminateEventDefinition', 'BPMNConditionalEventDefinition'
]

const CHILD_TYPE_DEFAULT_FIELDS = {
    'UMLAttribute': 'attributes',
    'UMLOperation': 'operations',
    'UMLParameter': 'parameters',
    'UMLEnumerationLiteral': 'literals',
    'UMLPort': 'ports',
    'UMLReception': 'receptions',
    'UMLExtensionPoint': 'extensionPoints',
    'UMLSlot': 'slots',
    'UMLTemplateParameter': 'templateParameters',
    'UMLRegion': 'regions',
    'UMLConstraint': 'constraints',
    'UMLInteractionOperand': 'operands',
    'SysMLProperty': 'properties',
    'SysMLOperation': 'operations',
    'SysMLFlowProperty': 'flowProperties',
    'UMLInputPin': 'inputs',
    'UMLOutputPin': 'outputs',
    'BPMNCompensateEventDefinition': 'eventDefinitions',
    'BPMNCancelEventDefinition': 'eventDefinitions',
    'BPMNErrorEventDefinition': 'eventDefinitions',
    'BPMNLinkEventDefinition': 'eventDefinitions',
    'BPMNSignalEventDefinition': 'eventDefinitions',
    'BPMNTimerEventDefinition': 'eventDefinitions',
    'BPMNEscalationEventDefinition': 'eventDefinitions',
    'BPMNMessageEventDefinition': 'eventDefinitions',
    'BPMNTerminateEventDefinition': 'eventDefinitions',
    'BPMNConditionalEventDefinition': 'eventDefinitions'
}

const VALID_PSEUDOSTATE_KINDS = [
    'initial', 'deepHistory', 'shallowHistory', 'join', 'fork',
    'junction', 'choice', 'entryPoint', 'exitPoint'
]

const STYLE_ALLOWED_FIELDS = [
    'fillColor', 'lineColor', 'fontColor', 'fontFace', 'fontSize',
    'fontStyle', 'lineStyle', 'showShadow', 'autoResize', 'stereotypeDisplay',
    'suppressAttributes', 'suppressOperations', 'suppressReceptions',
    'suppressProperties'
]

const GENERIC_DIAGRAM_CREATE_FIELDS = ['type', 'name', 'parentId']
const GENERIC_ELEMENT_CREATE_FIELDS = ['type', 'name', 'x1', 'y1', 'x2', 'y2', 'pseudostateKind', 'attachToViewId']
const GENERIC_RELATION_CREATE_FIELDS = ['type', 'sourceId', 'targetId', 'name']
// Types whose factory functions expect the diagram itself as parent (not diagram._parent).
// These factory functions internally resolve the actual parent from the diagram.
const DIAGRAM_AS_PARENT_TYPES = ['SysMLConstraintParameter']
const GENERIC_CHILD_CREATE_FIELDS = ['type', 'name', 'field']
const LAYOUT_ALLOWED_FIELDS = ['direction', 'separations', 'edgeLineStyle']
const IMPORT_ALLOWED_FIELDS = ['path', 'parentId']
const VALID_LAYOUT_DIRECTIONS = ['TB', 'BT', 'LR', 'RL']

// ============================================================
// Validation Helpers
// ============================================================

/**
 * Check for unknown fields in body. Returns error string or null.
 */
function checkUnknownFields(body, allowedFields) {
    const unknown = Object.keys(body).filter(function (k) {
        return allowedFields.indexOf(k) === -1
    })
    if (unknown.length > 0) {
        return 'Unknown field(s): ' + unknown.join(', ') + '. Allowed fields: ' + allowedFields.join(', ')
    }
    return null
}

/**
 * Validate field type. Returns error string or null.
 */
function checkFieldType(body, field, expectedType) {
    if (body[field] === undefined) {
        return null
    }
    const val = body[field]
    if (expectedType === 'string' && typeof val !== 'string') {
        return 'Field "' + field + '" must be a string, got ' + typeof val
    }
    if (expectedType === 'boolean' && typeof val !== 'boolean') {
        return 'Field "' + field + '" must be a boolean, got ' + typeof val
    }
    if (expectedType === 'number' && typeof val !== 'number') {
        return 'Field "' + field + '" must be a number, got ' + typeof val
    }
    if (expectedType === 'object' && (typeof val !== 'object' || val === null || Array.isArray(val))) {
        return 'Field "' + field + '" must be an object'
    }
    if (expectedType === 'string|null' && val !== null && typeof val !== 'string') {
        return 'Field "' + field + '" must be a string or null, got ' + typeof val
    }
    return null
}

/**
 * Validate column type value against ALLOWED_COLUMN_TYPES.
 */
function checkColumnType(value) {
    if (value === undefined) {
        return null
    }
    const upper = String(value).toUpperCase()
    if (ALLOWED_COLUMN_TYPES.indexOf(upper) === -1) {
        return 'Invalid column type "' + value + '". Allowed types: ' + ALLOWED_COLUMN_TYPES.join(', ')
    }
    return null
}

/**
 * Validate tag kind value.
 */
function checkTagKind(value) {
    if (value === undefined) {
        return null
    }
    if (VALID_TAG_KINDS.indexOf(value) === -1) {
        const labels = VALID_TAG_KINDS.map(function (k) { return k + '=' + TAG_KIND_LABELS[k] })
        return 'Invalid tag kind ' + value + '. Allowed values: ' + labels.join(', ')
    }
    return null
}

/**
 * Validate tag value type (string, number, or boolean).
 */
function checkTagValue(value) {
    if (value === undefined) {
        return null
    }
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
        return 'Field "value" must be a string, number, or boolean, got ' + typeof value
    }
    return null
}

/**
 * Validate non-empty string.
 */
function checkNonEmptyString(body, field) {
    if (body[field] === undefined) {
        return null
    }
    if (typeof body[field] !== 'string' || body[field].trim() === '') {
        return 'Field "' + field + '" must be a non-empty string'
    }
    return null
}

/**
 * Run multiple validations. Returns first error or null.
 */
function validate(checks) {
    for (let i = 0; i < checks.length; i++) {
        if (checks[i]) {
            return checks[i]
        }
    }
    return null
}

/**
 * Build a 400 error response with request context.
 */
function validationError(error, requestInfo, body) {
    const result = { success: false, error: error, request: requestInfo }
    if (body && Object.keys(body).length > 0) {
        result.request = Object.assign({}, requestInfo, { body: body })
    }
    return result
}

// ============================================================
// Serialization
// ============================================================

function serializeElement(elem) {
    if (!elem) {
        return null
    }
    const result = {
        _id: elem._id,
        _type: elem.constructor.name,
        name: elem.name || ''
    }
    if (elem.documentation) {
        result.documentation = elem.documentation
    }
    return result
}

function serializeEntity(entity) {
    const result = serializeElement(entity)
    if (!result) {
        return null
    }
    result.columns = (entity.columns || []).map(function (col) {
        return serializeColumn(col)
    })
    result.tags = (entity.tags || []).filter(function (tag) {
        return !isSequenceTag(tag) && !isIndexTag(tag)
    }).map(function (tag) {
        return serializeTag(tag)
    })
    if (entity._parent) {
        result._parentId = entity._parent._id
    }
    return result
}

function serializeColumn(col) {
    if (!col) {
        return null
    }
    const result = {
        _id: col._id,
        _type: col.constructor.name,
        name: col.name || '',
        type: col.type || '',
        length: col.length || '',
        primaryKey: col.primaryKey || false,
        foreignKey: col.foreignKey || false,
        nullable: col.nullable || false,
        unique: col.unique || false
    }
    if (col.documentation) {
        result.documentation = col.documentation
    }
    if (col.referenceTo) {
        result.referenceTo = col.referenceTo._id
    }
    if (col._parent) {
        result._parentId = col._parent._id
    }
    result.tags = (col.tags || []).map(function (tag) {
        return serializeTag(tag)
    })
    return result
}

function serializeTag(tag) {
    if (!tag) {
        return null
    }
    const result = {
        _id: tag._id,
        _type: tag.constructor.name,
        name: tag.name || '',
        kind: tag.kind,
        value: tag.value
    }
    if (tag._parent) {
        result._parentId = tag._parent._id
    }
    return result
}

function serializeSequence(tag) {
    if (!tag) {
        return null
    }
    return {
        _id: tag._id,
        _type: 'Sequence',
        name: sequenceNameFromTag(tag),
        value: tag.value,
        _parentId: tag._parent ? tag._parent._id : null
    }
}

function serializeIndex(tag) {
    if (!tag) {
        return null
    }
    return {
        _id: tag._id,
        _type: 'Index',
        name: indexNameFromTag(tag),
        definition: tag.value,
        _parentId: tag._parent ? tag._parent._id : null
    }
}

function serializeRelationship(rel) {
    if (!rel) {
        return null
    }
    const result = {
        _id: rel._id,
        _type: rel.constructor.name,
        name: rel.name || '',
        identifying: rel.identifying || false
    }
    if (rel.end1) {
        result.end1 = {
            name: rel.end1.name || '',
            cardinality: rel.end1.cardinality || '',
            reference: rel.end1.reference ? rel.end1.reference._id : null
        }
    }
    if (rel.end2) {
        result.end2 = {
            name: rel.end2.name || '',
            cardinality: rel.end2.cardinality || '',
            reference: rel.end2.reference ? rel.end2.reference._id : null
        }
    }
    if (rel._parent) {
        result._parentId = rel._parent._id
    }
    return result
}

function serializeDiagram(diagram) {
    if (!diagram) {
        return null
    }
    const result = serializeElement(diagram)
    const entityIds = []
    if (diagram.ownedViews) {
        diagram.ownedViews.forEach(function (view) {
            if (view.model && view.model instanceof type.ERDEntity) {
                entityIds.push(view.model._id)
            }
        })
    }
    result.entityIds = entityIds
    if (diagram._parent) {
        result._parentId = diagram._parent._id
    }
    return result
}

function serializeGenericDiagram(diagram) {
    if (!diagram) {
        return null
    }
    return {
        _id: diagram._id,
        _type: diagram.constructor.name,
        name: diagram.name || '',
        _parentId: diagram._parent ? diagram._parent._id : null
    }
}

function serializeNoteView(view) {
    if (!view) {
        return null
    }
    return {
        _id: view._id,
        _type: view.constructor.name,
        text: view.text || '',
        left: view.left !== undefined ? view.left : 0,
        top: view.top !== undefined ? view.top : 0,
        width: view.width !== undefined ? view.width : 0,
        height: view.height !== undefined ? view.height : 0
    }
}

function serializeNoteLinkView(view) {
    if (!view) {
        return null
    }
    return {
        _id: view._id,
        _type: view.constructor.name,
        noteId: view.tail ? view.tail._id : null,
        targetId: view.head ? view.head._id : null
    }
}

function serializeFreeLineView(view) {
    if (!view) {
        return null
    }
    const result = {
        _id: view._id,
        _type: view.constructor.name
    }
    // Points is a StarUML Points collection: view.points.points is the internal array
    if (view.points) {
        let pts = null
        if (typeof view.points.count === 'function' && view.points.count() >= 2) {
            const p1 = view.points.getPoint(0)
            const p2 = view.points.getPoint(view.points.count() - 1)
            pts = { p1: p1, p2: p2 }
        } else if (view.points.points && view.points.points.length >= 2) {
            pts = { p1: view.points.points[0], p2: view.points.points[view.points.points.length - 1] }
        }
        if (pts) {
            result.x1 = pts.p1.x
            result.y1 = pts.p1.y
            result.x2 = pts.p2.x
            result.y2 = pts.p2.y
        }
    }
    return result
}

function serializeViewInfo(view) {
    if (!view) {
        return null
    }
    const result = {
        _id: view._id,
        _type: view.constructor.name
    }
    if (view.model) {
        result.modelId = view.model._id
    }
    if (view.left !== undefined) {
        result.left = view.left
    }
    if (view.top !== undefined) {
        result.top = view.top
    }
    if (view.width !== undefined) {
        result.width = view.width
    }
    if (view.height !== undefined) {
        result.height = view.height
    }
    return result
}

// ============================================================
// Helpers
// ============================================================

function findById(id) {
    return app.repository.get(id) || null
}

function isSequenceTag(tag) {
    return tag && tag.name && tag.name.indexOf(SEQUENCE_PREFIX) === 0
}

function isIndexTag(tag) {
    return tag && tag.name && tag.name.indexOf(INDEX_PREFIX) === 0
}

function sequenceNameFromTag(tag) {
    return tag.name.substring(SEQUENCE_PREFIX.length)
}

function indexNameFromTag(tag) {
    return tag.name.substring(INDEX_PREFIX.length)
}

/**
 * Find columns in other entities that reference the given column via referenceTo.
 */
function findColumnsReferencingColumn(columnId) {
    const allColumns = app.repository.select('@ERDColumn')
    const result = []
    for (let i = 0; i < allColumns.length; i++) {
        const col = allColumns[i]
        if (col.referenceTo && col.referenceTo._id === columnId) {
            result.push({
                columnId: col._id,
                columnName: col.name,
                entityId: col._parent ? col._parent._id : null,
                entityName: col._parent ? col._parent.name : ''
            })
        }
    }
    return result
}

/**
 * Find columns in other entities that reference any column of the given entity via referenceTo.
 */
function findColumnsReferencingEntity(entityId) {
    const entity = findById(entityId)
    if (!entity) {
        return []
    }
    const entityColumnIds = {}
    const entityColumnNames = {}
    const columns = entity.columns || []
    for (let i = 0; i < columns.length; i++) {
        entityColumnIds[columns[i]._id] = true
        entityColumnNames[columns[i]._id] = columns[i].name
    }
    const allColumns = app.repository.select('@ERDColumn')
    const result = []
    for (let j = 0; j < allColumns.length; j++) {
        const col = allColumns[j]
        if (col.referenceTo && entityColumnIds[col.referenceTo._id]) {
            if (col._parent && col._parent._id === entityId) {
                continue
            }
            result.push({
                columnId: col._id,
                columnName: col.name,
                entityId: col._parent ? col._parent._id : null,
                entityName: col._parent ? col._parent.name : '',
                referencedColumnId: col.referenceTo._id,
                referencedColumnName: entityColumnNames[col.referenceTo._id] || ''
            })
        }
    }
    return result
}

/**
 * Find relationships that reference the given entity via end1 or end2.
 */
function findRelationshipsReferencingEntity(entityId) {
    const allRels = app.repository.select('@ERDRelationship')
    const result = []
    for (let i = 0; i < allRels.length; i++) {
        const rel = allRels[i]
        const ends = []
        if (rel.end1 && rel.end1.reference && rel.end1.reference._id === entityId) {
            ends.push('end1')
        }
        if (rel.end2 && rel.end2.reference && rel.end2.reference._id === entityId) {
            ends.push('end2')
        }
        if (ends.length > 0) {
            result.push({
                relationshipId: rel._id,
                relationshipName: rel.name || rel._id,
                ends: ends
            })
        }
    }
    return result
}

// ============================================================
// Route Handlers
// ============================================================

const ENTITY_ALLOWED_FIELDS = ['parentId', 'name', 'documentation', 'diagramId', 'x1', 'y1', 'x2', 'y2']
const ENTITY_UPDATE_FIELDS = ['name', 'documentation']
const COLUMN_ALLOWED_FIELDS = ['name', 'type', 'length', 'primaryKey', 'foreignKey', 'nullable', 'unique', 'documentation', 'referenceToId']
const TAG_ALLOWED_FIELDS = ['name', 'kind', 'value']
const RELATIONSHIP_ALLOWED_FIELDS = ['parentId', 'name', 'identifying', 'end1', 'end2', 'diagramId']
const RELATIONSHIP_UPDATE_FIELDS = ['name', 'identifying', 'end1', 'end2']
const RELATIONSHIP_END_CREATE_FIELDS = ['reference', 'name', 'cardinality']
const RELATIONSHIP_END_FIELDS = ['name', 'cardinality', 'reference']
const DATA_MODEL_ALLOWED_FIELDS = ['name']
const DATA_MODEL_UPDATE_FIELDS = ['name']
const DIAGRAM_ALLOWED_FIELDS = ['parentId', 'name']
const DIAGRAM_UPDATE_FIELDS = ['name']
const PROJECT_SAVE_ALLOWED_FIELDS = ['path']
const PROJECT_OPEN_ALLOWED_FIELDS = ['path']

// --- Generic / Cross-diagram Constants ---
const NOTE_ALLOWED_FIELDS = ['text', 'x1', 'y1', 'x2', 'y2']
const NOTE_UPDATE_FIELDS = ['text']
const NOTE_LINK_ALLOWED_FIELDS = ['noteId', 'targetId']
const FREE_LINE_ALLOWED_FIELDS = ['x1', 'y1', 'x2', 'y2']
const VIEW_UPDATE_FIELDS = ['left', 'top', 'width', 'height']
const GENERIC_ELEMENT_UPDATE_FIELDS = ['name', 'documentation']
const EXPORT_ALLOWED_FIELDS = ['path', 'format']
const VALID_EXPORT_FORMATS = ['png', 'jpeg', 'svg', 'pdf']

// --- Shape (view-only) Constants ---
const ALLOWED_SHAPE_TYPES = ['Text', 'TextBox', 'Rect', 'RoundRect', 'Ellipse', 'Hyperlink', 'Image', 'UMLFrame']
const SHAPE_CREATE_FIELDS = ['type', 'text', 'url', 'imageFile', 'x1', 'y1', 'x2', 'y2']
const SHAPE_UPDATE_FIELDS = ['text', 'url', 'imageFile']
const SHAPE_VIEW_TYPE_MAP = {
    'UMLTextView': 'Text',
    'UMLTextBoxView': 'TextBox',
    'RectangleView': 'Rect',
    'RoundRectView': 'RoundRect',
    'EllipseView': 'Ellipse',
    'HyperlinkView': 'Hyperlink',
    'ImageView': 'Image',
    'UMLFrameView': 'UMLFrame'
}
const SHAPE_VIEW_TYPES = Object.keys(SHAPE_VIEW_TYPE_MAP)

// --- Diagrams ---

function getDiagrams(reqInfo) {
    const diagrams = app.repository.select('@ERDDiagram')
    return {
        success: true,
        message: 'Retrieved ' + diagrams.length + ' diagram(s)',
        request: reqInfo,
        data: diagrams.map(function (d) { return serializeDiagram(d) })
    }
}

function getDiagram(id, reqInfo) {
    const diagram = findById(id)
    if (!diagram || !(diagram instanceof type.ERDDiagram)) {
        return { success: false, error: 'Diagram not found: ' + id, request: reqInfo }
    }
    return {
        success: true,
        message: 'Retrieved diagram "' + diagram.name + '"',
        request: reqInfo,
        data: serializeDiagram(diagram)
    }
}

function createDiagram(body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, DIAGRAM_ALLOWED_FIELDS),
        checkFieldType(body, 'parentId', 'string'),
        checkFieldType(body, 'name', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (!body.parentId) {
        return validationError('Field "parentId" is required', reqInfo, body)
    }

    if (body.name !== undefined) {
        const nameErr = checkNonEmptyString(body, 'name')
        if (nameErr) {
            return validationError(nameErr, reqInfo, body)
        }
    }

    const parent = findById(body.parentId)
    if (!parent || !(parent instanceof type.ERDDataModel)) {
        return validationError('parentId must refer to an ERDDataModel. Not found or wrong type: ' + body.parentId, reqInfo, body)
    }

    const diagram = app.factory.createDiagram({
        id: 'ERDDiagram',
        parent: parent,
        diagramInitializer: function (d) {
            d.name = body.name || 'ERDDiagram1'
        }
    })

    return {
        success: true,
        message: 'Created diagram "' + diagram.name + '"',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeDiagram(diagram)
    }
}

function updateDiagram(id, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, DIAGRAM_UPDATE_FIELDS),
        checkFieldType(body, 'name', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (Object.keys(body).length === 0) {
        return validationError('At least one field must be provided. Allowed fields: ' + DIAGRAM_UPDATE_FIELDS.join(', '), reqInfo, body)
    }

    if (body.name !== undefined) {
        const nameErr = checkNonEmptyString(body, 'name')
        if (nameErr) {
            return validationError(nameErr, reqInfo, body)
        }
    }

    const diagram = findById(id)
    if (!diagram || !(diagram instanceof type.ERDDiagram)) {
        return { success: false, error: 'Diagram not found: ' + id, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const updated = []
    if (body.name !== undefined) {
        app.engine.setProperty(diagram, 'name', body.name)
        updated.push('name')
    }

    return {
        success: true,
        message: 'Updated diagram "' + diagram.name + '" (fields: ' + updated.join(', ') + ')',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeDiagram(diagram)
    }
}

function deleteDiagram(id, reqInfo) {
    const diagram = findById(id)
    if (!diagram || !(diagram instanceof type.ERDDiagram)) {
        return { success: false, error: 'Diagram not found: ' + id, request: reqInfo }
    }
    const name = diagram.name
    app.engine.deleteElements([diagram], [])
    return {
        success: true,
        message: 'Deleted diagram "' + name + '"',
        request: reqInfo,
        data: { deleted: id, name: name }
    }
}

// --- Data Models ---

function getDataModels(reqInfo) {
    const models = app.repository.select('@ERDDataModel')
    return {
        success: true,
        message: 'Retrieved ' + models.length + ' data model(s)',
        request: reqInfo,
        data: models.map(function (m) { return serializeElement(m) })
    }
}

function getDataModel(id, reqInfo) {
    const dm = findById(id)
    if (!dm || !(dm instanceof type.ERDDataModel)) {
        return { success: false, error: 'Data model not found: ' + id, request: reqInfo }
    }
    return {
        success: true,
        message: 'Retrieved data model "' + dm.name + '"',
        request: reqInfo,
        data: serializeElement(dm)
    }
}

function createDataModel(body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, DATA_MODEL_ALLOWED_FIELDS),
        checkFieldType(body, 'name', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (body.name !== undefined) {
        const nameErr = checkNonEmptyString(body, 'name')
        if (nameErr) {
            return validationError(nameErr, reqInfo, body)
        }
    }

    const project = app.repository.select('@Project')[0]
    if (!project) {
        return validationError('No project found. Open a project first.', reqInfo, body)
    }

    const dm = app.factory.createModel({
        id: 'ERDDataModel',
        parent: project,
        modelInitializer: function (m) {
            m.name = body.name || 'ERDDataModel1'
        }
    })

    return {
        success: true,
        message: 'Created data model "' + dm.name + '"',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeElement(dm)
    }
}

function updateDataModel(id, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, DATA_MODEL_UPDATE_FIELDS),
        checkFieldType(body, 'name', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (Object.keys(body).length === 0) {
        return validationError('At least one field must be provided. Allowed fields: ' + DATA_MODEL_UPDATE_FIELDS.join(', '), reqInfo, body)
    }

    if (body.name !== undefined) {
        const nameErr = checkNonEmptyString(body, 'name')
        if (nameErr) {
            return validationError(nameErr, reqInfo, body)
        }
    }

    const dm = findById(id)
    if (!dm || !(dm instanceof type.ERDDataModel)) {
        return { success: false, error: 'Data model not found: ' + id, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const updated = []
    if (body.name !== undefined) {
        app.engine.setProperty(dm, 'name', body.name)
        updated.push('name')
    }

    return {
        success: true,
        message: 'Updated data model "' + dm.name + '" (fields: ' + updated.join(', ') + ')',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeElement(dm)
    }
}

function deleteDataModel(id, reqInfo) {
    const dm = findById(id)
    if (!dm || !(dm instanceof type.ERDDataModel)) {
        return { success: false, error: 'Data model not found: ' + id, request: reqInfo }
    }
    const name = dm.name

    // Safety check: block deletion if entities, relationships, or diagrams exist under this data model
    const entities = app.repository.select('@ERDEntity').filter(function (e) {
        return e._parent && e._parent._id === id
    })
    const relationships = app.repository.select('@ERDRelationship').filter(function (r) {
        // ERDRelationship's _parent is set to an Entity, not the DataModel.
        // Walk up the parent chain to find if this relationship belongs to this data model.
        let p = r._parent
        while (p) {
            if (p._id === id) {
                return true
            }
            p = p._parent
        }
        return false
    })
    const diagrams = app.repository.select('@ERDDiagram').filter(function (d) {
        return d._parent && d._parent._id === id
    })

    if (entities.length > 0 || relationships.length > 0 || diagrams.length > 0) {
        return validationError(
            'Cannot delete data model "' + name + '": ' + entities.length + ' entity(ies), ' + relationships.length + ' relationship(s), and ' + diagrams.length + ' diagram(s) exist under it. Delete them first.',
            reqInfo
        )
    }

    app.engine.deleteElements([dm], [])
    return {
        success: true,
        message: 'Deleted data model "' + name + '"',
        request: reqInfo,
        data: { deleted: id, name: name }
    }
}

// --- Entities ---

function getEntities(query, reqInfo) {
    const allowedParams = ['dataModelId', 'diagramId']
    const unknownParams = Object.keys(query).filter(function (k) {
        return allowedParams.indexOf(k) === -1
    })
    if (unknownParams.length > 0) {
        return validationError('Unknown query parameter(s): ' + unknownParams.join(', ') + '. Allowed: ' + allowedParams.join(', '), reqInfo)
    }

    let entities = app.repository.select('@ERDEntity')

    if (query.dataModelId) {
        const dm = findById(query.dataModelId)
        if (!dm || !(dm instanceof type.ERDDataModel)) {
            return { success: false, error: 'Data model not found: ' + query.dataModelId, request: reqInfo }
        }
        entities = entities.filter(function (e) {
            return e._parent && e._parent._id === query.dataModelId
        })
    }
    if (query.diagramId) {
        const diagram = findById(query.diagramId)
        if (!diagram || !(diagram instanceof type.ERDDiagram)) {
            return { success: false, error: 'Diagram not found: ' + query.diagramId, request: reqInfo }
        }
        const entityIdSet = {}
        const views = diagram.ownedViews || []
        views.forEach(function (view) {
            if (view.model && view.model instanceof type.ERDEntity) {
                entityIdSet[view.model._id] = true
            }
        })
        entities = entities.filter(function (e) {
            return entityIdSet[e._id]
        })
    }

    return {
        success: true,
        message: 'Retrieved ' + entities.length + ' entity(ies)',
        request: reqInfo,
        data: entities.map(function (e) { return serializeEntity(e) })
    }
}

function getEntity(id, reqInfo) {
    const entity = findById(id)
    if (!entity || !(entity instanceof type.ERDEntity)) {
        return { success: false, error: 'Entity not found: ' + id, request: reqInfo }
    }
    return {
        success: true,
        message: 'Retrieved entity "' + entity.name + '"',
        request: reqInfo,
        data: serializeEntity(entity)
    }
}

function createEntity(body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, ENTITY_ALLOWED_FIELDS),
        checkFieldType(body, 'parentId', 'string'),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'documentation', 'string'),
        checkFieldType(body, 'diagramId', 'string'),
        checkFieldType(body, 'x1', 'number'),
        checkFieldType(body, 'y1', 'number'),
        checkFieldType(body, 'x2', 'number'),
        checkFieldType(body, 'y2', 'number')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (!body.parentId) {
        return validationError('Field "parentId" is required', reqInfo, body)
    }

    if (body.name !== undefined) {
        const nameErr = checkNonEmptyString(body, 'name')
        if (nameErr) {
            return validationError(nameErr, reqInfo, body)
        }
    }

    const parent = findById(body.parentId)
    if (!parent || !(parent instanceof type.ERDDataModel)) {
        return validationError('parentId must refer to an ERDDataModel. Not found or wrong type: ' + body.parentId, reqInfo, body)
    }

    const options = {
        id: 'ERDEntity',
        parent: parent,
        modelInitializer: function (elem) {
            elem.name = body.name || 'NewEntity'
            if (body.documentation !== undefined) {
                elem.documentation = body.documentation
            }
        }
    }

    if (body.diagramId) {
        const diagram = findById(body.diagramId)
        if (!diagram || !(diagram instanceof type.ERDDiagram)) {
            return validationError('diagramId must refer to an ERDDiagram. Not found or wrong type: ' + body.diagramId, reqInfo, body)
        }
        options.diagram = diagram
        options.x1 = body.x1 !== undefined ? body.x1 : 100
        options.y1 = body.y1 !== undefined ? body.y1 : 100
        options.x2 = body.x2 !== undefined ? body.x2 : 300
        options.y2 = body.y2 !== undefined ? body.y2 : 200
        const view = app.factory.createModelAndView(options)
        autoExpandFrame(diagram)
        return {
            success: true,
            message: 'Created entity "' + view.model.name + '" with view on diagram "' + diagram.name + '"',
            request: Object.assign({}, reqInfo, { body: body }),
            data: serializeEntity(view.model)
        }
    }

    const entity = app.factory.createModel(options)
    return {
        success: true,
        message: 'Created entity "' + entity.name + '"',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeEntity(entity)
    }
}

function updateEntity(id, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, ENTITY_UPDATE_FIELDS),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'documentation', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (Object.keys(body).length === 0) {
        return validationError('At least one field must be provided. Allowed fields: ' + ENTITY_UPDATE_FIELDS.join(', '), reqInfo, body)
    }

    if (body.name !== undefined) {
        const nameErr = checkNonEmptyString(body, 'name')
        if (nameErr) {
            return validationError(nameErr, reqInfo, body)
        }
    }

    const entity = findById(id)
    if (!entity || !(entity instanceof type.ERDEntity)) {
        return { success: false, error: 'Entity not found: ' + id, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const updated = []
    if (body.name !== undefined) {
        app.engine.setProperty(entity, 'name', body.name)
        updated.push('name')
    }
    if (body.documentation !== undefined) {
        app.engine.setProperty(entity, 'documentation', body.documentation)
        updated.push('documentation')
    }

    return {
        success: true,
        message: 'Updated entity "' + entity.name + '" (fields: ' + updated.join(', ') + ')',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeEntity(entity)
    }
}

function deleteEntity(id, reqInfo) {
    const entity = findById(id)
    if (!entity || !(entity instanceof type.ERDEntity)) {
        return { success: false, error: 'Entity not found: ' + id, request: reqInfo }
    }
    const name = entity.name

    // Check referential integrity: columns in other entities referencing this entity's columns
    const referencingCols = findColumnsReferencingEntity(id)
    if (referencingCols.length > 0) {
        const colDetails = referencingCols.map(function (ref) {
            return ref.entityName + '.' + ref.columnName + ' (column ' + ref.columnId + ') references ' + name + '.' + ref.referencedColumnName + ' (column ' + ref.referencedColumnId + ')'
        })
        return validationError(
            'Cannot delete entity "' + name + '": ' + referencingCols.length + ' column(s) in other entities reference columns of this entity. ' + colDetails.join(', '),
            reqInfo
        )
    }

    // Check referential integrity: relationships referencing this entity
    const referencingRels = findRelationshipsReferencingEntity(id)
    if (referencingRels.length > 0) {
        const relDetails = referencingRels.map(function (ref) {
            return ref.relationshipName + ' (relationship ' + ref.relationshipId + ') references via ' + ref.ends.join(', ')
        })
        return validationError(
            'Cannot delete entity "' + name + '": ' + referencingRels.length + ' relationship(s) reference this entity. ' + relDetails.join(', '),
            reqInfo
        )
    }

    app.engine.deleteElements([entity], [])
    return {
        success: true,
        message: 'Deleted entity "' + name + '"',
        request: reqInfo,
        data: { deleted: id, name: name }
    }
}

// --- Columns ---

function getColumns(entityId, reqInfo) {
    const entity = findById(entityId)
    if (!entity || !(entity instanceof type.ERDEntity)) {
        return { success: false, error: 'Entity not found: ' + entityId, request: reqInfo }
    }
    const cols = entity.columns || []
    return {
        success: true,
        message: 'Retrieved ' + cols.length + ' column(s) from entity "' + entity.name + '"',
        request: reqInfo,
        data: cols.map(function (c) { return serializeColumn(c) })
    }
}

function createColumn(entityId, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, COLUMN_ALLOWED_FIELDS),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'type', 'string'),
        checkFieldType(body, 'length', 'string'),
        checkFieldType(body, 'primaryKey', 'boolean'),
        checkFieldType(body, 'foreignKey', 'boolean'),
        checkFieldType(body, 'nullable', 'boolean'),
        checkFieldType(body, 'unique', 'boolean'),
        checkFieldType(body, 'documentation', 'string'),
        checkFieldType(body, 'referenceToId', 'string'),
        checkColumnType(body.type)
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (body.name !== undefined) {
        const nameErr = checkNonEmptyString(body, 'name')
        if (nameErr) {
            return validationError(nameErr, reqInfo, body)
        }
    }

    const entity = findById(entityId)
    if (!entity || !(entity instanceof type.ERDEntity)) {
        return { success: false, error: 'Entity not found: ' + entityId, request: Object.assign({}, reqInfo, { body: body }) }
    }

    if (body.referenceToId) {
        const refCol = findById(body.referenceToId)
        if (!refCol || !(refCol instanceof type.ERDColumn)) {
            return validationError('referenceToId must refer to an ERDColumn. Not found or wrong type: ' + body.referenceToId, reqInfo, body)
        }
    }

    const col = app.factory.createModel({
        id: 'ERDColumn',
        parent: entity,
        field: 'columns',
        modelInitializer: function (c) {
            c.name = body.name || 'new_column'
            if (body.type !== undefined) {
                c.type = body.type.toUpperCase()
            }
            if (body.length !== undefined) {
                c.length = body.length
            }
            if (body.primaryKey !== undefined) {
                c.primaryKey = body.primaryKey
            }
            if (body.foreignKey !== undefined) {
                c.foreignKey = body.foreignKey
            }
            if (body.nullable !== undefined) {
                c.nullable = body.nullable
            }
            if (body.unique !== undefined) {
                c.unique = body.unique
            }
            if (body.documentation !== undefined) {
                c.documentation = body.documentation
            }
            if (body.referenceToId) {
                const ref = findById(body.referenceToId)
                if (ref) {
                    c.referenceTo = ref
                }
            }
        }
    })

    return {
        success: true,
        message: 'Created column "' + col.name + '" in entity "' + entity.name + '"',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeColumn(col)
    }
}

function getColumn(id, reqInfo) {
    const col = findById(id)
    if (!col || !(col instanceof type.ERDColumn)) {
        return { success: false, error: 'Column not found: ' + id, request: reqInfo }
    }
    return {
        success: true,
        message: 'Retrieved column "' + col.name + '"',
        request: reqInfo,
        data: serializeColumn(col)
    }
}

function updateColumn(id, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, COLUMN_ALLOWED_FIELDS),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'type', 'string'),
        checkFieldType(body, 'length', 'string'),
        checkFieldType(body, 'primaryKey', 'boolean'),
        checkFieldType(body, 'foreignKey', 'boolean'),
        checkFieldType(body, 'nullable', 'boolean'),
        checkFieldType(body, 'unique', 'boolean'),
        checkFieldType(body, 'documentation', 'string'),
        checkFieldType(body, 'referenceToId', 'string|null'),
        checkColumnType(body.type)
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (Object.keys(body).length === 0) {
        return validationError('At least one field must be provided. Allowed fields: ' + COLUMN_ALLOWED_FIELDS.join(', '), reqInfo, body)
    }

    if (body.name !== undefined) {
        const nameErr = checkNonEmptyString(body, 'name')
        if (nameErr) {
            return validationError(nameErr, reqInfo, body)
        }
    }

    const col = findById(id)
    if (!col || !(col instanceof type.ERDColumn)) {
        return { success: false, error: 'Column not found: ' + id, request: Object.assign({}, reqInfo, { body: body }) }
    }

    if (body.referenceToId !== undefined && body.referenceToId !== null) {
        if (body.referenceToId === id) {
            return validationError('A column cannot reference itself via referenceToId', reqInfo, body)
        }
        const refCol = findById(body.referenceToId)
        if (!refCol || !(refCol instanceof type.ERDColumn)) {
            return validationError('referenceToId must refer to an ERDColumn. Not found or wrong type: ' + body.referenceToId, reqInfo, body)
        }
    }

    const updated = []
    const simpleProps = ['name', 'length', 'primaryKey', 'foreignKey', 'nullable', 'unique', 'documentation']
    simpleProps.forEach(function (prop) {
        if (body[prop] !== undefined) {
            app.engine.setProperty(col, prop, body[prop])
            updated.push(prop)
        }
    })
    if (body.type !== undefined) {
        app.engine.setProperty(col, 'type', body.type.toUpperCase())
        updated.push('type')
    }
    if (body.referenceToId !== undefined) {
        if (body.referenceToId === null) {
            app.engine.setProperty(col, 'referenceTo', null)
        } else {
            const ref = findById(body.referenceToId)
            if (ref) {
                app.engine.setProperty(col, 'referenceTo', ref)
            }
        }
        updated.push('referenceTo')
    }

    return {
        success: true,
        message: 'Updated column "' + col.name + '" (fields: ' + updated.join(', ') + ')',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeColumn(col)
    }
}

function deleteColumn(id, reqInfo) {
    const col = findById(id)
    if (!col || !(col instanceof type.ERDColumn)) {
        return { success: false, error: 'Column not found: ' + id, request: reqInfo }
    }
    const name = col.name

    // Check referential integrity: other columns referencing this column via referenceTo
    const referencingCols = findColumnsReferencingColumn(id)
    if (referencingCols.length > 0) {
        const colDetails = referencingCols.map(function (ref) {
            return ref.entityName + '.' + ref.columnName + ' (column ' + ref.columnId + ')'
        })
        return validationError(
            'Cannot delete column "' + name + '": ' + referencingCols.length + ' column(s) reference this column via referenceTo. ' + colDetails.join(', '),
            reqInfo
        )
    }

    app.engine.deleteElements([col], [])
    return {
        success: true,
        message: 'Deleted column "' + name + '"',
        request: reqInfo,
        data: { deleted: id, name: name }
    }
}

// --- Tags ---

function getTags(elementId, reqInfo) {
    const elem = findById(elementId)
    if (!elem) {
        return { success: false, error: 'Element not found: ' + elementId, request: reqInfo }
    }
    const tags = elem.tags || []
    return {
        success: true,
        message: 'Retrieved ' + tags.length + ' tag(s) from "' + (elem.name || elementId) + '"',
        request: reqInfo,
        data: tags.map(function (t) { return serializeTag(t) })
    }
}

function createTag(elementId, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, TAG_ALLOWED_FIELDS),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'kind', 'number'),
        checkTagKind(body.kind),
        checkTagValue(body.value)
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (body.name !== undefined) {
        const nameErr = checkNonEmptyString(body, 'name')
        if (nameErr) {
            return validationError(nameErr, reqInfo, body)
        }
    }

    const elem = findById(elementId)
    if (!elem) {
        return { success: false, error: 'Element not found: ' + elementId, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const tag = app.factory.createModel({
        id: 'Tag',
        parent: elem,
        field: 'tags',
        modelInitializer: function (t) {
            t.name = body.name || 'new_tag'
            if (body.kind !== undefined) {
                t.kind = body.kind
            }
            if (body.value !== undefined) {
                t.value = body.value
            }
        }
    })

    return {
        success: true,
        message: 'Created tag "' + tag.name + '" on "' + (elem.name || elementId) + '"',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeTag(tag)
    }
}

function getTag(id, reqInfo) {
    const tag = findById(id)
    if (!tag || !(tag instanceof type.Tag)) {
        return { success: false, error: 'Tag not found: ' + id, request: reqInfo }
    }
    return {
        success: true,
        message: 'Retrieved tag "' + tag.name + '"',
        request: reqInfo,
        data: serializeTag(tag)
    }
}

function updateTag(id, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, TAG_ALLOWED_FIELDS),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'kind', 'number'),
        checkTagKind(body.kind),
        checkTagValue(body.value)
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (Object.keys(body).length === 0) {
        return validationError('At least one field must be provided. Allowed fields: ' + TAG_ALLOWED_FIELDS.join(', '), reqInfo, body)
    }

    if (body.name !== undefined) {
        const nameErr = checkNonEmptyString(body, 'name')
        if (nameErr) {
            return validationError(nameErr, reqInfo, body)
        }
    }

    const tag = findById(id)
    if (!tag || !(tag instanceof type.Tag)) {
        return { success: false, error: 'Tag not found: ' + id, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const updated = []
    if (body.name !== undefined) {
        app.engine.setProperty(tag, 'name', body.name)
        updated.push('name')
    }
    if (body.kind !== undefined) {
        app.engine.setProperty(tag, 'kind', body.kind)
        updated.push('kind')
    }
    if (body.value !== undefined) {
        app.engine.setProperty(tag, 'value', body.value)
        updated.push('value')
    }

    return {
        success: true,
        message: 'Updated tag "' + tag.name + '" (fields: ' + updated.join(', ') + ')',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeTag(tag)
    }
}

function deleteTag(id, reqInfo) {
    const tag = findById(id)
    if (!tag || !(tag instanceof type.Tag)) {
        return { success: false, error: 'Tag not found: ' + id, request: reqInfo }
    }
    const name = tag.name
    app.engine.deleteElements([tag], [])
    return {
        success: true,
        message: 'Deleted tag "' + name + '"',
        request: reqInfo,
        data: { deleted: id, name: name }
    }
}

// --- Sequences ---

function getSequences(entityId, reqInfo) {
    const entity = findById(entityId)
    if (!entity || !(entity instanceof type.ERDEntity)) {
        return { success: false, error: 'Entity not found: ' + entityId, request: reqInfo }
    }
    const tags = entity.tags || []
    const sequences = tags.filter(isSequenceTag)
    return {
        success: true,
        message: 'Retrieved ' + sequences.length + ' sequence(s) from entity "' + entity.name + '"',
        request: reqInfo,
        data: sequences.map(function (t) { return serializeSequence(t) })
    }
}

function createSequence(entityId, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, SEQUENCE_ALLOWED_FIELDS),
        checkFieldType(body, 'name', 'string'),
        checkNonEmptyString(body, 'name')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (!body.name) {
        return validationError('Field "name" is required', reqInfo, body)
    }

    const entity = findById(entityId)
    if (!entity || !(entity instanceof type.ERDEntity)) {
        return { success: false, error: 'Entity not found: ' + entityId, request: Object.assign({}, reqInfo, { body: body }) }
    }

    // Check for duplicate sequence name on same entity
    const existing = (entity.tags || []).filter(isSequenceTag)
    for (let i = 0; i < existing.length; i++) {
        if (sequenceNameFromTag(existing[i]) === body.name) {
            return validationError('Sequence "' + body.name + '" already exists on entity "' + entity.name + '"', reqInfo, body)
        }
    }

    const tagName = SEQUENCE_PREFIX + body.name
    const tagValue = 'CREATE SEQUENCE ' + body.name

    const tag = app.factory.createModel({
        id: 'Tag',
        parent: entity,
        field: 'tags',
        modelInitializer: function (t) {
            t.name = tagName
            t.kind = 0
            t.value = tagValue
        }
    })

    return {
        success: true,
        message: 'Created sequence "' + body.name + '" on entity "' + entity.name + '"',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeSequence(tag)
    }
}

function getSequence(id, reqInfo) {
    const tag = findById(id)
    if (!tag || !(tag instanceof type.Tag) || !isSequenceTag(tag)) {
        return { success: false, error: 'Sequence not found: ' + id, request: reqInfo }
    }
    return {
        success: true,
        message: 'Retrieved sequence "' + sequenceNameFromTag(tag) + '"',
        request: reqInfo,
        data: serializeSequence(tag)
    }
}

function updateSequence(id, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, SEQUENCE_ALLOWED_FIELDS),
        checkFieldType(body, 'name', 'string'),
        checkNonEmptyString(body, 'name')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (Object.keys(body).length === 0) {
        return validationError('At least one field must be provided. Allowed fields: ' + SEQUENCE_ALLOWED_FIELDS.join(', '), reqInfo, body)
    }

    const tag = findById(id)
    if (!tag || !(tag instanceof type.Tag) || !isSequenceTag(tag)) {
        return { success: false, error: 'Sequence not found: ' + id, request: Object.assign({}, reqInfo, { body: body }) }
    }

    if (body.name !== undefined) {
        // Check for duplicate on same entity
        const parent = tag._parent
        if (parent) {
            const existing = (parent.tags || []).filter(isSequenceTag)
            for (let i = 0; i < existing.length; i++) {
                if (existing[i]._id !== id && sequenceNameFromTag(existing[i]) === body.name) {
                    return validationError('Sequence "' + body.name + '" already exists on entity "' + parent.name + '"', reqInfo, body)
                }
            }
        }

        const newTagName = SEQUENCE_PREFIX + body.name
        const newTagValue = 'CREATE SEQUENCE ' + body.name
        app.engine.setProperty(tag, 'name', newTagName)
        app.engine.setProperty(tag, 'value', newTagValue)
    }

    return {
        success: true,
        message: 'Updated sequence "' + sequenceNameFromTag(tag) + '"',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeSequence(tag)
    }
}

function deleteSequence(id, reqInfo) {
    const tag = findById(id)
    if (!tag || !(tag instanceof type.Tag) || !isSequenceTag(tag)) {
        return { success: false, error: 'Sequence not found: ' + id, request: reqInfo }
    }
    const name = sequenceNameFromTag(tag)
    app.engine.deleteElements([tag], [])
    return {
        success: true,
        message: 'Deleted sequence "' + name + '"',
        request: reqInfo,
        data: { deleted: id, name: name }
    }
}

// --- Indexes ---

function getIndexes(entityId, reqInfo) {
    const entity = findById(entityId)
    if (!entity || !(entity instanceof type.ERDEntity)) {
        return { success: false, error: 'Entity not found: ' + entityId, request: reqInfo }
    }
    const tags = entity.tags || []
    const indexes = tags.filter(isIndexTag)
    return {
        success: true,
        message: 'Retrieved ' + indexes.length + ' index(es) from entity "' + entity.name + '"',
        request: reqInfo,
        data: indexes.map(function (t) { return serializeIndex(t) })
    }
}

function createIndex(entityId, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, INDEX_ALLOWED_FIELDS),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'definition', 'string'),
        checkNonEmptyString(body, 'name'),
        checkNonEmptyString(body, 'definition')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (!body.name) {
        return validationError('Field "name" is required', reqInfo, body)
    }
    if (!body.definition) {
        return validationError('Field "definition" is required', reqInfo, body)
    }

    const entity = findById(entityId)
    if (!entity || !(entity instanceof type.ERDEntity)) {
        return { success: false, error: 'Entity not found: ' + entityId, request: Object.assign({}, reqInfo, { body: body }) }
    }

    // Check for duplicate index name on same entity
    const existing = (entity.tags || []).filter(isIndexTag)
    for (let i = 0; i < existing.length; i++) {
        if (indexNameFromTag(existing[i]) === body.name) {
            return validationError('Index "' + body.name + '" already exists on entity "' + entity.name + '"', reqInfo, body)
        }
    }

    const tagName = INDEX_PREFIX + body.name

    const tag = app.factory.createModel({
        id: 'Tag',
        parent: entity,
        field: 'tags',
        modelInitializer: function (t) {
            t.name = tagName
            t.kind = 0
            t.value = body.definition
        }
    })

    return {
        success: true,
        message: 'Created index "' + body.name + '" on entity "' + entity.name + '"',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeIndex(tag)
    }
}

function getIndex(id, reqInfo) {
    const tag = findById(id)
    if (!tag || !(tag instanceof type.Tag) || !isIndexTag(tag)) {
        return { success: false, error: 'Index not found: ' + id, request: reqInfo }
    }
    return {
        success: true,
        message: 'Retrieved index "' + indexNameFromTag(tag) + '"',
        request: reqInfo,
        data: serializeIndex(tag)
    }
}

function updateIndex(id, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, INDEX_ALLOWED_FIELDS),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'definition', 'string'),
        checkNonEmptyString(body, 'name'),
        checkNonEmptyString(body, 'definition')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (Object.keys(body).length === 0) {
        return validationError('At least one field must be provided. Allowed fields: ' + INDEX_ALLOWED_FIELDS.join(', '), reqInfo, body)
    }

    const tag = findById(id)
    if (!tag || !(tag instanceof type.Tag) || !isIndexTag(tag)) {
        return { success: false, error: 'Index not found: ' + id, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const updated = []

    if (body.name !== undefined) {
        // Check for duplicate on same entity
        const parent = tag._parent
        if (parent) {
            const existing = (parent.tags || []).filter(isIndexTag)
            for (let i = 0; i < existing.length; i++) {
                if (existing[i]._id !== id && indexNameFromTag(existing[i]) === body.name) {
                    return validationError('Index "' + body.name + '" already exists on entity "' + parent.name + '"', reqInfo, body)
                }
            }
        }
        app.engine.setProperty(tag, 'name', INDEX_PREFIX + body.name)
        updated.push('name')
    }

    if (body.definition !== undefined) {
        app.engine.setProperty(tag, 'value', body.definition)
        updated.push('definition')
    }

    return {
        success: true,
        message: 'Updated index "' + indexNameFromTag(tag) + '" (fields: ' + updated.join(', ') + ')',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeIndex(tag)
    }
}

function deleteIndex(id, reqInfo) {
    const tag = findById(id)
    if (!tag || !(tag instanceof type.Tag) || !isIndexTag(tag)) {
        return { success: false, error: 'Index not found: ' + id, request: reqInfo }
    }
    const name = indexNameFromTag(tag)
    app.engine.deleteElements([tag], [])
    return {
        success: true,
        message: 'Deleted index "' + name + '"',
        request: reqInfo,
        data: { deleted: id, name: name }
    }
}

// --- Relationships ---

function getRelationships(query, reqInfo) {
    const allowedParams = ['dataModelId']
    const unknownParams = Object.keys(query).filter(function (k) {
        return allowedParams.indexOf(k) === -1
    })
    if (unknownParams.length > 0) {
        return validationError('Unknown query parameter(s): ' + unknownParams.join(', ') + '. Allowed: ' + allowedParams.join(', '), reqInfo)
    }

    let rels = app.repository.select('@ERDRelationship')

    if (query.dataModelId) {
        const dm = findById(query.dataModelId)
        if (!dm || !(dm instanceof type.ERDDataModel)) {
            return { success: false, error: 'Data model not found: ' + query.dataModelId, request: reqInfo }
        }
        rels = rels.filter(function (r) {
            let current = r._parent
            while (current) {
                if (current._id === query.dataModelId) {
                    return true
                }
                current = current._parent
            }
            return false
        })
    }

    return {
        success: true,
        message: 'Retrieved ' + rels.length + ' relationship(s)',
        request: reqInfo,
        data: rels.map(function (r) { return serializeRelationship(r) })
    }
}

function createRelationship(body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, RELATIONSHIP_ALLOWED_FIELDS),
        checkFieldType(body, 'parentId', 'string'),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'identifying', 'boolean'),
        checkFieldType(body, 'end1', 'object'),
        checkFieldType(body, 'end2', 'object'),
        checkFieldType(body, 'diagramId', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (!body.parentId) {
        return validationError('Field "parentId" is required', reqInfo, body)
    }
    if (!body.end1 || !body.end1.reference) {
        return validationError('Field "end1.reference" is required', reqInfo, body)
    }
    if (!body.end2 || !body.end2.reference) {
        return validationError('Field "end2.reference" is required', reqInfo, body)
    }

    // Validate end1/end2 sub-fields
    const end1Err = validate([
        checkUnknownFields(body.end1, RELATIONSHIP_END_CREATE_FIELDS),
        checkFieldType(body.end1, 'reference', 'string'),
        checkFieldType(body.end1, 'name', 'string'),
        checkFieldType(body.end1, 'cardinality', 'string')
    ])
    if (end1Err) {
        return validationError('end1: ' + end1Err, reqInfo, body)
    }
    const end2Err = validate([
        checkUnknownFields(body.end2, RELATIONSHIP_END_CREATE_FIELDS),
        checkFieldType(body.end2, 'reference', 'string'),
        checkFieldType(body.end2, 'name', 'string'),
        checkFieldType(body.end2, 'cardinality', 'string')
    ])
    if (end2Err) {
        return validationError('end2: ' + end2Err, reqInfo, body)
    }

    if (body.name !== undefined) {
        const nameErr = checkNonEmptyString(body, 'name')
        if (nameErr) {
            return validationError(nameErr, reqInfo, body)
        }
    }

    const parent = findById(body.parentId)
    if (!parent || !(parent instanceof type.ERDDataModel)) {
        return validationError('parentId must refer to an ERDDataModel. Not found or wrong type: ' + body.parentId, reqInfo, body)
    }

    const entity1 = findById(body.end1.reference)
    if (!entity1 || !(entity1 instanceof type.ERDEntity)) {
        return validationError('end1.reference must refer to an ERDEntity. Not found or wrong type: ' + body.end1.reference, reqInfo, body)
    }

    const entity2 = findById(body.end2.reference)
    if (!entity2 || !(entity2 instanceof type.ERDEntity)) {
        return validationError('end2.reference must refer to an ERDEntity. Not found or wrong type: ' + body.end2.reference, reqInfo, body)
    }

    // diagramId is required for relationship creation (StarUML requires diagram context)
    if (!body.diagramId) {
        return validationError('Field "diagramId" is required for relationship creation', reqInfo, body)
    }

    const diagram = findById(body.diagramId)
    if (!diagram || !(diagram instanceof type.ERDDiagram)) {
        return validationError('diagramId must refer to an ERDDiagram. Not found or wrong type: ' + body.diagramId, reqInfo, body)
    }

    // Find entity views on the diagram
    const tailView = findViewOnDiagram(diagram, entity1._id)
    const headView = findViewOnDiagram(diagram, entity2._id)

    if (!tailView) {
        return validationError('end1 entity "' + entity1.name + '" does not have a view on diagram "' + diagram.name + '". Add the entity to the diagram first.', reqInfo, body)
    }
    if (!headView) {
        return validationError('end2 entity "' + entity2.name + '" does not have a view on diagram "' + diagram.name + '". Add the entity to the diagram first.', reqInfo, body)
    }

    const options = {
        id: 'ERDRelationship',
        parent: parent,
        diagram: diagram,
        tailModel: entity1,
        headModel: entity2,
        tailView: tailView,
        headView: headView,
        modelInitializer: function (rel) {
            rel.name = body.name || ''
            if (body.identifying !== undefined) {
                rel.identifying = body.identifying
            }
        }
    }

    const view = app.factory.createModelAndView(options)
    if (!view || !view.model) {
        return { success: false, error: 'Failed to create relationship. StarUML factory returned null.', request: Object.assign({}, reqInfo, { body: body }) }
    }
    const rel = view.model

    // Set end1 properties
    if (rel.end1) {
        app.engine.setProperty(rel.end1, 'reference', entity1)
        app.engine.setProperty(rel.end1, 'cardinality', body.end1.cardinality || '1')
        if (body.end1.name !== undefined) {
            app.engine.setProperty(rel.end1, 'name', body.end1.name)
        }
    }

    // Set end2 properties
    if (rel.end2) {
        app.engine.setProperty(rel.end2, 'reference', entity2)
        app.engine.setProperty(rel.end2, 'cardinality', body.end2.cardinality || '0..*')
        if (body.end2.name !== undefined) {
            app.engine.setProperty(rel.end2, 'name', body.end2.name)
        }
    }

    autoExpandFrame(diagram)
    return {
        success: true,
        message: 'Created relationship "' + (rel.name || rel._id) + '" with view on diagram "' + diagram.name + '"',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeRelationship(rel)
    }
}

function getRelationship(id, reqInfo) {
    const rel = findById(id)
    if (!rel || !(rel instanceof type.ERDRelationship)) {
        return { success: false, error: 'Relationship not found: ' + id, request: reqInfo }
    }
    return {
        success: true,
        message: 'Retrieved relationship "' + (rel.name || rel._id) + '"',
        request: reqInfo,
        data: serializeRelationship(rel)
    }
}

function updateRelationship(id, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, RELATIONSHIP_UPDATE_FIELDS),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'identifying', 'boolean'),
        checkFieldType(body, 'end1', 'object'),
        checkFieldType(body, 'end2', 'object')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (Object.keys(body).length === 0) {
        return validationError('At least one field must be provided. Allowed fields: ' + RELATIONSHIP_UPDATE_FIELDS.join(', '), reqInfo, body)
    }

    // Validate end1/end2 sub-fields
    if (body.end1) {
        const end1Err = validate([
            checkUnknownFields(body.end1, RELATIONSHIP_END_FIELDS),
            checkFieldType(body.end1, 'name', 'string'),
            checkFieldType(body.end1, 'cardinality', 'string'),
            checkFieldType(body.end1, 'reference', 'string')
        ])
        if (end1Err) {
            return validationError('end1: ' + end1Err, reqInfo, body)
        }
    }
    if (body.end2) {
        const end2Err = validate([
            checkUnknownFields(body.end2, RELATIONSHIP_END_FIELDS),
            checkFieldType(body.end2, 'name', 'string'),
            checkFieldType(body.end2, 'cardinality', 'string'),
            checkFieldType(body.end2, 'reference', 'string')
        ])
        if (end2Err) {
            return validationError('end2: ' + end2Err, reqInfo, body)
        }
    }

    // Reject empty end objects
    if (body.end1 && Object.keys(body.end1).length === 0) {
        return validationError('end1: At least one sub-field must be provided. Allowed fields: ' + RELATIONSHIP_END_FIELDS.join(', '), reqInfo, body)
    }
    if (body.end2 && Object.keys(body.end2).length === 0) {
        return validationError('end2: At least one sub-field must be provided. Allowed fields: ' + RELATIONSHIP_END_FIELDS.join(', '), reqInfo, body)
    }

    // Validate reference entities if provided
    if (body.end1 && body.end1.reference !== undefined) {
        const refEntity1 = findById(body.end1.reference)
        if (!refEntity1 || !(refEntity1 instanceof type.ERDEntity)) {
            return validationError('end1.reference must refer to an ERDEntity. Not found or wrong type: ' + body.end1.reference, reqInfo, body)
        }
    }
    if (body.end2 && body.end2.reference !== undefined) {
        const refEntity2 = findById(body.end2.reference)
        if (!refEntity2 || !(refEntity2 instanceof type.ERDEntity)) {
            return validationError('end2.reference must refer to an ERDEntity. Not found or wrong type: ' + body.end2.reference, reqInfo, body)
        }
    }

    const rel = findById(id)
    if (!rel || !(rel instanceof type.ERDRelationship)) {
        return { success: false, error: 'Relationship not found: ' + id, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const updated = []
    if (body.name !== undefined) {
        app.engine.setProperty(rel, 'name', body.name)
        updated.push('name')
    }
    if (body.identifying !== undefined) {
        app.engine.setProperty(rel, 'identifying', body.identifying)
        updated.push('identifying')
    }
    if (body.end1 && rel.end1) {
        if (body.end1.name !== undefined) {
            app.engine.setProperty(rel.end1, 'name', body.end1.name)
            updated.push('end1.name')
        }
        if (body.end1.cardinality !== undefined) {
            app.engine.setProperty(rel.end1, 'cardinality', body.end1.cardinality)
            updated.push('end1.cardinality')
        }
        if (body.end1.reference !== undefined) {
            const entity1 = findById(body.end1.reference)
            app.engine.setProperty(rel.end1, 'reference', entity1)
            updated.push('end1.reference')
        }
    }
    if (body.end2 && rel.end2) {
        if (body.end2.name !== undefined) {
            app.engine.setProperty(rel.end2, 'name', body.end2.name)
            updated.push('end2.name')
        }
        if (body.end2.cardinality !== undefined) {
            app.engine.setProperty(rel.end2, 'cardinality', body.end2.cardinality)
            updated.push('end2.cardinality')
        }
        if (body.end2.reference !== undefined) {
            const entity2 = findById(body.end2.reference)
            app.engine.setProperty(rel.end2, 'reference', entity2)
            updated.push('end2.reference')
        }
    }

    return {
        success: true,
        message: 'Updated relationship "' + (rel.name || rel._id) + '" (fields: ' + updated.join(', ') + ')',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeRelationship(rel)
    }
}

function deleteRelationship(id, reqInfo) {
    const rel = findById(id)
    if (!rel || !(rel instanceof type.ERDRelationship)) {
        return { success: false, error: 'Relationship not found: ' + id, request: reqInfo }
    }
    const name = rel.name || rel._id
    app.engine.deleteElements([rel], [])
    return {
        success: true,
        message: 'Deleted relationship "' + name + '"',
        request: reqInfo,
        data: { deleted: id, name: name }
    }
}

// --- Project ---

function saveProject(body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, PROJECT_SAVE_ALLOWED_FIELDS),
        checkFieldType(body, 'path', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (!body.path) {
        return validationError('Field "path" is required', reqInfo, body)
    }

    const nameErr = checkNonEmptyString(body, 'path')
    if (nameErr) {
        return validationError(nameErr, reqInfo, body)
    }

    // Validate absolute path (Unix: starts with /, Windows: starts with drive letter)
    if (body.path.charAt(0) !== '/' && !/^[a-zA-Z]:[/\\]/.test(body.path)) {
        return validationError('Field "path" must be an absolute path (e.g. "/Users/.../project.mdj")', reqInfo, body)
    }

    // Validate .mdj extension
    if (!/\.mdj$/i.test(body.path)) {
        return validationError('Field "path" must have .mdj extension (e.g. "/Users/.../project.mdj")', reqInfo, body)
    }

    const reqInfoWithBody = Object.assign({}, reqInfo, { body: body })

    try {
        const result = app.project.save(body.path)

        // Handle async (Promise) return
        if (result && typeof result.then === 'function') {
            return result.then(function () {
                return {
                    success: true,
                    message: 'Project saved to "' + body.path + '"',
                    request: reqInfoWithBody,
                    data: { path: body.path }
                }
            }).catch(function (e) {
                return {
                    success: false,
                    error: 'Failed to save project: ' + (e.message || String(e)),
                    request: reqInfoWithBody
                }
            })
        }

        // Synchronous return
        return {
            success: true,
            message: 'Project saved to "' + body.path + '"',
            request: reqInfoWithBody,
            data: { path: body.path }
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to save project: ' + (e.message || String(e)),
            request: reqInfoWithBody
        }
    }
}

function openProject(body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, PROJECT_OPEN_ALLOWED_FIELDS),
        checkFieldType(body, 'path', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (!body.path) {
        return validationError('Field "path" is required', reqInfo, body)
    }

    const nameErr = checkNonEmptyString(body, 'path')
    if (nameErr) {
        return validationError(nameErr, reqInfo, body)
    }

    // Validate absolute path (Unix: starts with /, Windows: starts with drive letter)
    if (body.path.charAt(0) !== '/' && !/^[a-zA-Z]:[/\\]/.test(body.path)) {
        return validationError('Field "path" must be an absolute path (e.g. "/Users/.../project.mdj")', reqInfo, body)
    }

    // Validate .mdj extension
    if (!/\.mdj$/i.test(body.path)) {
        return validationError('Field "path" must have .mdj extension (e.g. "/Users/.../project.mdj")', reqInfo, body)
    }

    const reqInfoWithBody = Object.assign({}, reqInfo, { body: body })

    try {
        const result = app.project.load(body.path)

        // Handle async (Promise) return
        if (result && typeof result.then === 'function') {
            return result.then(function () {
                const project = app.project.getProject()
                return {
                    success: true,
                    message: 'Project opened from "' + body.path + '"',
                    request: reqInfoWithBody,
                    data: {
                        path: body.path,
                        projectName: project ? project.name : ''
                    }
                }
            }).catch(function (e) {
                return {
                    success: false,
                    error: 'Failed to open project: ' + (e.message || String(e)),
                    request: reqInfoWithBody
                }
            })
        }

        // Synchronous return
        const project = app.project.getProject()
        return {
            success: true,
            message: 'Project opened from "' + body.path + '"',
            request: reqInfoWithBody,
            data: {
                path: body.path,
                projectName: project ? project.name : ''
            }
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to open project: ' + (e.message || String(e)),
            request: reqInfoWithBody
        }
    }
}

// ============================================================
// Sequence Diagram - Serialization
// ============================================================

function serializeInteraction(interaction) {
    if (!interaction) {
        return null
    }
    const result = serializeElement(interaction)
    result.participants = (interaction.participants || []).map(function (p) {
        return { _id: p._id, name: p.name || '' }
    })
    result.messages = (interaction.messages || []).map(function (m) {
        return { _id: m._id, name: m.name || '' }
    })
    result.fragments = (interaction.fragments || []).map(function (f) {
        return { _id: f._id, _type: f.constructor.name, name: f.name || '' }
    })
    if (interaction._parent) {
        result._parentId = interaction._parent._id
    }
    return result
}

function serializeSeqDiagram(diagram) {
    if (!diagram) {
        return null
    }
    const result = serializeElement(diagram)
    const lifelineIds = []
    if (diagram.ownedViews) {
        diagram.ownedViews.forEach(function (view) {
            if (view.model && view.model instanceof type.UMLLifeline) {
                if (lifelineIds.indexOf(view.model._id) === -1) {
                    lifelineIds.push(view.model._id)
                }
            }
        })
    }
    result.lifelineIds = lifelineIds
    if (diagram._parent) {
        result._parentId = diagram._parent._id
    }
    return result
}

function serializeLifeline(lifeline) {
    if (!lifeline) {
        return null
    }
    const result = serializeElement(lifeline)
    if (lifeline.represent) {
        result.represent = lifeline.represent._id
    }
    if (lifeline._parent) {
        result._parentId = lifeline._parent._id
    }
    return result
}

function serializeMessage(msg) {
    if (!msg) {
        return null
    }
    const result = {
        _id: msg._id,
        _type: msg.constructor.name,
        name: msg.name || '',
        messageSort: msg.messageSort || 'synchCall'
    }
    if (msg.source) {
        result.source = msg.source._id
    }
    if (msg.target) {
        result.target = msg.target._id
    }
    if (msg.signature) {
        result.signature = msg.signature._id
    }
    if (msg.connector) {
        result.connector = msg.connector._id
    }
    if (msg.documentation) {
        result.documentation = msg.documentation
    }
    if (msg._parent) {
        result._parentId = msg._parent._id
    }
    return result
}

function serializeCombinedFragment(fragment) {
    if (!fragment) {
        return null
    }
    const result = {
        _id: fragment._id,
        _type: fragment.constructor.name,
        name: fragment.name || '',
        interactionOperator: fragment.interactionOperator || 'alt'
    }
    result.operands = (fragment.operands || []).map(function (op) {
        return { _id: op._id, name: op.name || '', guard: op.guard || '' }
    })
    if (fragment.documentation) {
        result.documentation = fragment.documentation
    }
    if (fragment._parent) {
        result._parentId = fragment._parent._id
    }
    return result
}

function serializeInteractionOperand(operand) {
    if (!operand) {
        return null
    }
    const result = {
        _id: operand._id,
        _type: operand.constructor.name,
        name: operand.name || '',
        guard: operand.guard || ''
    }
    if (operand.documentation) {
        result.documentation = operand.documentation
    }
    if (operand._parent) {
        result._parentId = operand._parent._id
    }
    return result
}

function serializeStateInvariant(si) {
    if (!si) {
        return null
    }
    const result = {
        _id: si._id,
        _type: si.constructor.name,
        name: si.name || ''
    }
    if (si.covered) {
        result.covered = si.covered._id
    }
    if (si.invariant) {
        result.invariant = si.invariant
    }
    if (si.documentation) {
        result.documentation = si.documentation
    }
    if (si._parent) {
        result._parentId = si._parent._id
    }
    return result
}

function serializeInteractionUse(iu) {
    if (!iu) {
        return null
    }
    const result = {
        _id: iu._id,
        _type: iu.constructor.name,
        name: iu.name || ''
    }
    if (iu.refersTo) {
        result.refersTo = iu.refersTo._id
    }
    if (iu.arguments) {
        result.arguments = iu.arguments
    }
    if (iu.returnValue) {
        result.returnValue = iu.returnValue
    }
    if (iu.documentation) {
        result.documentation = iu.documentation
    }
    if (iu._parent) {
        result._parentId = iu._parent._id
    }
    return result
}

// ============================================================
// Sequence Diagram - Helpers
// ============================================================

/**
 * Find a view for a given model on a specific diagram.
 */
function findViewOnDiagram(diagram, modelId) {
    if (!diagram || !diagram.ownedViews) {
        return null
    }
    for (let i = 0; i < diagram.ownedViews.length; i++) {
        const view = diagram.ownedViews[i]
        if (view.model && view.model._id === modelId) {
            return view
        }
    }
    return null
}

/**
 * Find a view on a diagram by view _id or model _id.
 */
function findViewOnDiagramByAnyId(diagram, id) {
    if (!diagram || !diagram.ownedViews) {
        return null
    }
    for (let i = 0; i < diagram.ownedViews.length; i++) {
        const view = diagram.ownedViews[i]
        if (view._id === id) {
            return view
        }
        if (view.model && view.model._id === id) {
            return view
        }
    }
    return null
}

/**
 * Find messages that reference the given lifeline as source or target.
 */
function findMessagesReferencingLifeline(lifelineId) {
    const allMsgs = app.repository.select('@UMLMessage')
    const result = []
    for (let i = 0; i < allMsgs.length; i++) {
        const msg = allMsgs[i]
        const refs = []
        if (msg.source && msg.source._id === lifelineId) {
            refs.push('source')
        }
        if (msg.target && msg.target._id === lifelineId) {
            refs.push('target')
        }
        if (refs.length > 0) {
            result.push({
                messageId: msg._id,
                messageName: msg.name || msg._id,
                refs: refs
            })
        }
    }
    return result
}

/**
 * Find state invariants that reference the given lifeline via covered.
 */
function findStateInvariantsReferencingLifeline(lifelineId) {
    const allSI = app.repository.select('@UMLStateInvariant')
    const result = []
    for (let i = 0; i < allSI.length; i++) {
        const si = allSI[i]
        if (si.covered && si.covered._id === lifelineId) {
            result.push({
                stateInvariantId: si._id,
                stateInvariantName: si.name || si._id
            })
        }
    }
    return result
}

// ============================================================
// Sequence Diagram - Route Handlers
// ============================================================

// --- Allowed Fields ---

const INTERACTION_ALLOWED_FIELDS = ['name', 'documentation']
const INTERACTION_UPDATE_FIELDS = ['name', 'documentation']
const SEQ_DIAGRAM_ALLOWED_FIELDS = ['parentId', 'name', 'width', 'height', 'documentation']
const SEQ_DIAGRAM_UPDATE_FIELDS = ['name', 'documentation']
const LIFELINE_ALLOWED_FIELDS = ['name', 'documentation', 'diagramId', 'x', 'y', 'height']
const LIFELINE_UPDATE_FIELDS = ['name', 'documentation']
const MESSAGE_ALLOWED_FIELDS = ['name', 'messageSort', 'source', 'target', 'diagramId', 'y', 'x', 'activationHeight', 'documentation', 'messageType']
const VALID_MESSAGE_TYPES = ['UMLMessage', 'UMLFoundMessage', 'UMLLostMessage']
const MESSAGE_UPDATE_FIELDS = ['name', 'messageSort', 'documentation']
const COMBINED_FRAGMENT_ALLOWED_FIELDS = ['name', 'interactionOperator', 'diagramId', 'x', 'y', 'width', 'height', 'documentation']
const COMBINED_FRAGMENT_UPDATE_FIELDS = ['name', 'interactionOperator', 'documentation']
const OPERAND_ALLOWED_FIELDS = ['name', 'guard', 'documentation']
const OPERAND_UPDATE_FIELDS = ['name', 'guard', 'documentation']
const STATE_INVARIANT_ALLOWED_FIELDS = ['name', 'covered', 'invariant', 'diagramId', 'x', 'y', 'documentation']
const STATE_INVARIANT_UPDATE_FIELDS = ['name', 'covered', 'invariant', 'documentation']
const INTERACTION_USE_ALLOWED_FIELDS = ['name', 'refersTo', 'arguments', 'returnValue', 'diagramId', 'x', 'y', 'width', 'height', 'documentation']
const INTERACTION_USE_UPDATE_FIELDS = ['name', 'refersTo', 'arguments', 'returnValue', 'documentation']

// --- Interactions ---

function getInteractions(reqInfo) {
    const interactions = app.repository.select('@UMLInteraction')
    return {
        success: true,
        message: 'Retrieved ' + interactions.length + ' interaction(s)',
        request: reqInfo,
        data: interactions.map(function (i) { return serializeInteraction(i) })
    }
}

function getInteraction(id, reqInfo) {
    const interaction = findById(id)
    if (!interaction || !(interaction instanceof type.UMLInteraction)) {
        return { success: false, error: 'Interaction not found: ' + id, request: reqInfo }
    }
    return {
        success: true,
        message: 'Retrieved interaction "' + interaction.name + '"',
        request: reqInfo,
        data: serializeInteraction(interaction)
    }
}

function createInteraction(body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, INTERACTION_ALLOWED_FIELDS),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'documentation', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (body.name !== undefined) {
        const nameErr = checkNonEmptyString(body, 'name')
        if (nameErr) {
            return validationError(nameErr, reqInfo, body)
        }
    }

    const project = app.repository.select('@Project')[0]
    if (!project) {
        return validationError('No project found. Open a project first.', reqInfo, body)
    }

    // StarUML requires UMLInteraction to be under UMLCollaboration for proper diagram support.
    // Auto-create a UMLCollaboration under Project if one doesn't exist.
    // Scope to collaborations under this project to avoid using unrelated ones.
    let collaboration = app.repository.select('@UMLCollaboration').filter(function (c) {
        return c._parent && c._parent._id === project._id
    })[0]
    if (!collaboration) {
        collaboration = app.factory.createModel({
            id: 'UMLCollaboration',
            parent: project,
            modelInitializer: function (m) {
                m.name = 'Collaborations'
            }
        })
    }

    const interaction = app.factory.createModel({
        id: 'UMLInteraction',
        parent: collaboration,
        modelInitializer: function (m) {
            m.name = body.name || 'Interaction1'
            if (body.documentation !== undefined) {
                m.documentation = body.documentation
            }
        }
    })

    return {
        success: true,
        message: 'Created interaction "' + interaction.name + '"',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeInteraction(interaction)
    }
}

function updateInteraction(id, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, INTERACTION_UPDATE_FIELDS),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'documentation', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (Object.keys(body).length === 0) {
        return validationError('At least one field must be provided. Allowed fields: ' + INTERACTION_UPDATE_FIELDS.join(', '), reqInfo, body)
    }

    if (body.name !== undefined) {
        const nameErr = checkNonEmptyString(body, 'name')
        if (nameErr) {
            return validationError(nameErr, reqInfo, body)
        }
    }

    const interaction = findById(id)
    if (!interaction || !(interaction instanceof type.UMLInteraction)) {
        return { success: false, error: 'Interaction not found: ' + id, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const updated = []
    if (body.name !== undefined) {
        app.engine.setProperty(interaction, 'name', body.name)
        updated.push('name')
    }
    if (body.documentation !== undefined) {
        app.engine.setProperty(interaction, 'documentation', body.documentation)
        updated.push('documentation')
    }

    return {
        success: true,
        message: 'Updated interaction "' + interaction.name + '" (fields: ' + updated.join(', ') + ')',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeInteraction(interaction)
    }
}

function deleteInteraction(id, reqInfo) {
    const interaction = findById(id)
    if (!interaction || !(interaction instanceof type.UMLInteraction)) {
        return { success: false, error: 'Interaction not found: ' + id, request: reqInfo }
    }
    const name = interaction.name

    // Auto-cleanup UMLEndpoints (auto-created by FoundMessage/LostMessage)
    const endpoints = (interaction.participants || []).filter(function (p) {
        return p instanceof type.UMLEndpoint
    })
    if (endpoints.length > 0) {
        app.engine.deleteElements(endpoints, [])
    }

    // Safety check: block deletion if lifelines, messages, fragments, or diagrams exist
    const lifelines = (interaction.participants || [])
    const messages = (interaction.messages || [])
    const fragments = (interaction.fragments || [])
    const diagrams = app.repository.select('@UMLSequenceDiagram').filter(function (d) {
        return d._parent && d._parent._id === id
    })

    if (lifelines.length > 0 || messages.length > 0 || fragments.length > 0 || diagrams.length > 0) {
        return validationError(
            'Cannot delete interaction "' + name + '": ' + lifelines.length + ' lifeline(s), ' + messages.length + ' message(s), ' + fragments.length + ' fragment(s), and ' + diagrams.length + ' diagram(s) exist under it. Delete them first.',
            reqInfo
        )
    }

    const parent = interaction._parent
    app.engine.deleteElements([interaction], [])

    // Clean up auto-created UMLCollaboration if it became empty
    if (parent && parent instanceof type.UMLCollaboration && parent._parent) {
        const remaining = (parent.ownedElements || []).length
        if (remaining === 0) {
            app.engine.deleteElements([parent], [])
        }
    }

    return {
        success: true,
        message: 'Deleted interaction "' + name + '"',
        request: reqInfo,
        data: { deleted: id, name: name }
    }
}

// --- Sequence Diagrams ---

function getSeqDiagrams(reqInfo) {
    const diagrams = app.repository.select('@UMLSequenceDiagram')
    return {
        success: true,
        message: 'Retrieved ' + diagrams.length + ' sequence diagram(s)',
        request: reqInfo,
        data: diagrams.map(function (d) { return serializeSeqDiagram(d) })
    }
}

function getSeqDiagram(id, reqInfo) {
    const diagram = findById(id)
    if (!diagram || !(diagram instanceof type.UMLSequenceDiagram)) {
        return { success: false, error: 'Sequence diagram not found: ' + id, request: reqInfo }
    }
    return {
        success: true,
        message: 'Retrieved sequence diagram "' + diagram.name + '"',
        request: reqInfo,
        data: serializeSeqDiagram(diagram)
    }
}

function createSeqDiagram(body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, SEQ_DIAGRAM_ALLOWED_FIELDS),
        checkFieldType(body, 'parentId', 'string'),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'width', 'number'),
        checkFieldType(body, 'height', 'number'),
        checkFieldType(body, 'documentation', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (!body.parentId) {
        return validationError('Field "parentId" is required', reqInfo, body)
    }

    if (body.name !== undefined) {
        const nameErr = checkNonEmptyString(body, 'name')
        if (nameErr) {
            return validationError(nameErr, reqInfo, body)
        }
    }

    const parent = findById(body.parentId)
    if (!parent || !(parent instanceof type.UMLInteraction)) {
        return validationError('parentId must refer to a UMLInteraction. Not found or wrong type: ' + body.parentId, reqInfo, body)
    }

    const diagram = app.factory.createDiagram({
        id: 'UMLSequenceDiagram',
        parent: parent,
        diagramInitializer: function (d) {
            d.name = body.name || 'SequenceDiagram1'
            if (body.documentation !== undefined) {
                d.documentation = body.documentation
            }
        }
    })

    // Resize frame if width/height specified
    if (body.width !== undefined || body.height !== undefined) {
        const frameView = (diagram.ownedViews || []).filter(function (v) {
            return v.constructor && v.constructor.name === 'UMLFrameView'
        })[0]
        if (frameView) {
            if (body.width !== undefined) {
                app.engine.setProperty(frameView, 'width', body.width)
            }
            if (body.height !== undefined) {
                app.engine.setProperty(frameView, 'height', body.height)
            }
        }
    }

    return {
        success: true,
        message: 'Created sequence diagram "' + diagram.name + '"',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeSeqDiagram(diagram)
    }
}

function updateSeqDiagram(id, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, SEQ_DIAGRAM_UPDATE_FIELDS),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'documentation', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (Object.keys(body).length === 0) {
        return validationError('At least one field must be provided. Allowed fields: ' + SEQ_DIAGRAM_UPDATE_FIELDS.join(', '), reqInfo, body)
    }

    if (body.name !== undefined) {
        const nameErr = checkNonEmptyString(body, 'name')
        if (nameErr) {
            return validationError(nameErr, reqInfo, body)
        }
    }

    const diagram = findById(id)
    if (!diagram || !(diagram instanceof type.UMLSequenceDiagram)) {
        return { success: false, error: 'Sequence diagram not found: ' + id, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const updated = []
    if (body.name !== undefined) {
        app.engine.setProperty(diagram, 'name', body.name)
        updated.push('name')
    }
    if (body.documentation !== undefined) {
        app.engine.setProperty(diagram, 'documentation', body.documentation)
        updated.push('documentation')
    }

    return {
        success: true,
        message: 'Updated sequence diagram "' + diagram.name + '" (fields: ' + updated.join(', ') + ')',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeSeqDiagram(diagram)
    }
}

function deleteSeqDiagram(id, reqInfo) {
    const diagram = findById(id)
    if (!diagram || !(diagram instanceof type.UMLSequenceDiagram)) {
        return { success: false, error: 'Sequence diagram not found: ' + id, request: reqInfo }
    }
    const name = diagram.name
    app.engine.deleteElements([diagram], [])
    return {
        success: true,
        message: 'Deleted sequence diagram "' + name + '"',
        request: reqInfo,
        data: { deleted: id, name: name }
    }
}

// --- Lifelines ---

function getLifelines(interactionId, reqInfo) {
    const interaction = findById(interactionId)
    if (!interaction || !(interaction instanceof type.UMLInteraction)) {
        return { success: false, error: 'Interaction not found: ' + interactionId, request: reqInfo }
    }
    const lifelines = interaction.participants || []
    return {
        success: true,
        message: 'Retrieved ' + lifelines.length + ' lifeline(s) from interaction "' + interaction.name + '"',
        request: reqInfo,
        data: lifelines.map(function (l) { return serializeLifeline(l) })
    }
}

function createLifeline(interactionId, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, LIFELINE_ALLOWED_FIELDS),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'documentation', 'string'),
        checkFieldType(body, 'diagramId', 'string'),
        checkFieldType(body, 'x', 'number'),
        checkFieldType(body, 'y', 'number'),
        checkFieldType(body, 'height', 'number')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (body.name !== undefined) {
        const nameErr = checkNonEmptyString(body, 'name')
        if (nameErr) {
            return validationError(nameErr, reqInfo, body)
        }
    }

    const interaction = findById(interactionId)
    if (!interaction || !(interaction instanceof type.UMLInteraction)) {
        return { success: false, error: 'Interaction not found: ' + interactionId, request: Object.assign({}, reqInfo, { body: body }) }
    }

    if (body.diagramId) {
        const diagram = findById(body.diagramId)
        if (!diagram || !(diagram instanceof type.UMLSequenceDiagram)) {
            return validationError('diagramId must refer to a UMLSequenceDiagram. Not found or wrong type: ' + body.diagramId, reqInfo, body)
        }
        const options = {
            id: 'UMLLifeline',
            parent: interaction,
            diagram: diagram,
            x1: body.x !== undefined ? body.x : 100,
            y1: body.y !== undefined ? body.y : 50,
            x2: (body.x !== undefined ? body.x : 100) + 100,
            y2: (body.y !== undefined ? body.y : 50) + (body.height !== undefined ? body.height : 200),
            modelInitializer: function (m) {
                m.name = body.name || 'Lifeline1'
                if (body.documentation !== undefined) {
                    m.documentation = body.documentation
                }
            }
        }
        const view = app.factory.createModelAndView(options)
        if (!view || !view.model) {
            return { success: false, error: 'Failed to create lifeline view on diagram. Ensure the interaction has a valid parent hierarchy (UMLCollaboration).', request: Object.assign({}, reqInfo, { body: body }) }
        }
        autoExpandFrame(diagram)
        return {
            success: true,
            message: 'Created lifeline "' + view.model.name + '" with view on diagram "' + diagram.name + '"',
            request: Object.assign({}, reqInfo, { body: body }),
            data: serializeLifeline(view.model)
        }
    }

    const lifeline = app.factory.createModel({
        id: 'UMLLifeline',
        parent: interaction,
        field: 'participants',
        modelInitializer: function (m) {
            m.name = body.name || 'Lifeline1'
            if (body.documentation !== undefined) {
                m.documentation = body.documentation
            }
        }
    })

    if (!lifeline) {
        return { success: false, error: 'Failed to create lifeline model. Ensure the interaction has a valid parent hierarchy (UMLCollaboration).', request: Object.assign({}, reqInfo, { body: body }) }
    }

    return {
        success: true,
        message: 'Created lifeline "' + lifeline.name + '"',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeLifeline(lifeline)
    }
}

function getLifeline(id, reqInfo) {
    const lifeline = findById(id)
    if (!lifeline || !(lifeline instanceof type.UMLLifeline)) {
        return { success: false, error: 'Lifeline not found: ' + id, request: reqInfo }
    }
    return {
        success: true,
        message: 'Retrieved lifeline "' + lifeline.name + '"',
        request: reqInfo,
        data: serializeLifeline(lifeline)
    }
}

function updateLifeline(id, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, LIFELINE_UPDATE_FIELDS),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'documentation', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (Object.keys(body).length === 0) {
        return validationError('At least one field must be provided. Allowed fields: ' + LIFELINE_UPDATE_FIELDS.join(', '), reqInfo, body)
    }

    if (body.name !== undefined) {
        const nameErr = checkNonEmptyString(body, 'name')
        if (nameErr) {
            return validationError(nameErr, reqInfo, body)
        }
    }

    const lifeline = findById(id)
    if (!lifeline || !(lifeline instanceof type.UMLLifeline)) {
        return { success: false, error: 'Lifeline not found: ' + id, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const updated = []
    if (body.name !== undefined) {
        app.engine.setProperty(lifeline, 'name', body.name)
        updated.push('name')
    }
    if (body.documentation !== undefined) {
        app.engine.setProperty(lifeline, 'documentation', body.documentation)
        updated.push('documentation')
    }

    return {
        success: true,
        message: 'Updated lifeline "' + lifeline.name + '" (fields: ' + updated.join(', ') + ')',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeLifeline(lifeline)
    }
}

function deleteLifeline(id, reqInfo) {
    const lifeline = findById(id)
    if (!lifeline || !(lifeline instanceof type.UMLLifeline)) {
        return { success: false, error: 'Lifeline not found: ' + id, request: reqInfo }
    }
    const name = lifeline.name

    // Check referential integrity: messages referencing this lifeline
    const referencingMsgs = findMessagesReferencingLifeline(id)
    if (referencingMsgs.length > 0) {
        const msgDetails = referencingMsgs.map(function (ref) {
            return ref.messageName + ' (' + ref.refs.join(', ') + ')'
        })
        return validationError(
            'Cannot delete lifeline "' + name + '": ' + referencingMsgs.length + ' message(s) reference this lifeline. ' + msgDetails.join(', '),
            reqInfo
        )
    }

    // Check referential integrity: state invariants referencing this lifeline
    const referencingSI = findStateInvariantsReferencingLifeline(id)
    if (referencingSI.length > 0) {
        const siDetails = referencingSI.map(function (ref) {
            return ref.stateInvariantName + ' (' + ref.stateInvariantId + ')'
        })
        return validationError(
            'Cannot delete lifeline "' + name + '": ' + referencingSI.length + ' state invariant(s) reference this lifeline. ' + siDetails.join(', '),
            reqInfo
        )
    }

    const elementsToDelete = [lifeline]
    if (lifeline.represent) {
        elementsToDelete.push(lifeline.represent)
    }
    app.engine.deleteElements(elementsToDelete, [])
    return {
        success: true,
        message: 'Deleted lifeline "' + name + '"',
        request: reqInfo,
        data: { deleted: id, name: name }
    }
}

// --- Messages ---

function getMessages(interactionId, reqInfo) {
    const interaction = findById(interactionId)
    if (!interaction || !(interaction instanceof type.UMLInteraction)) {
        return { success: false, error: 'Interaction not found: ' + interactionId, request: reqInfo }
    }
    const messages = interaction.messages || []
    return {
        success: true,
        message: 'Retrieved ' + messages.length + ' message(s) from interaction "' + interaction.name + '"',
        request: reqInfo,
        data: messages.map(function (m) { return serializeMessage(m) })
    }
}

function createMessage(interactionId, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, MESSAGE_ALLOWED_FIELDS),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'messageSort', 'string'),
        checkFieldType(body, 'messageType', 'string'),
        checkFieldType(body, 'source', 'string'),
        checkFieldType(body, 'target', 'string'),
        checkFieldType(body, 'diagramId', 'string'),
        checkFieldType(body, 'y', 'number'),
        checkFieldType(body, 'x', 'number'),
        checkFieldType(body, 'activationHeight', 'number'),
        checkFieldType(body, 'documentation', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    const msgType = body.messageType || 'UMLMessage'
    if (VALID_MESSAGE_TYPES.indexOf(msgType) === -1) {
        return validationError('Invalid messageType "' + msgType + '". Allowed values: ' + VALID_MESSAGE_TYPES.join(', '), reqInfo, body)
    }

    if (body.messageSort !== undefined && VALID_MESSAGE_SORTS.indexOf(body.messageSort) === -1) {
        return validationError('Invalid messageSort "' + body.messageSort + '". Allowed values: ' + VALID_MESSAGE_SORTS.join(', '), reqInfo, body)
    }

    // Validate required fields based on messageType
    if (msgType === 'UMLFoundMessage') {
        if (!body.target) {
            return validationError('Field "target" is required for UMLFoundMessage (target lifeline ID)', reqInfo, body)
        }
    } else if (msgType === 'UMLLostMessage') {
        if (!body.source) {
            return validationError('Field "source" is required for UMLLostMessage (source lifeline ID)', reqInfo, body)
        }
    } else {
        if (!body.source) {
            return validationError('Field "source" is required (lifeline ID)', reqInfo, body)
        }
        if (!body.target) {
            return validationError('Field "target" is required (lifeline ID)', reqInfo, body)
        }
    }
    if (!body.diagramId) {
        return validationError('Field "diagramId" is required for message creation', reqInfo, body)
    }

    const interaction = findById(interactionId)
    if (!interaction || !(interaction instanceof type.UMLInteraction)) {
        return { success: false, error: 'Interaction not found: ' + interactionId, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const diagram = findById(body.diagramId)
    if (!diagram || !(diagram instanceof type.UMLSequenceDiagram)) {
        return validationError('diagramId must refer to a UMLSequenceDiagram. Not found or wrong type: ' + body.diagramId, reqInfo, body)
    }

    const options = {
        id: msgType,
        parent: interaction,
        diagram: diagram,
        modelInitializer: function (m) {
            m.name = body.name || ''
            if (body.messageSort !== undefined) {
                m.messageSort = body.messageSort
            }
            if (body.documentation !== undefined) {
                m.documentation = body.documentation
            }
        }
    }

    // Set up source/target based on messageType
    if (msgType === 'UMLFoundMessage') {
        // FoundMessage: auto-created endpoint as source, target lifeline required
        const targetLifeline = findById(body.target)
        if (!targetLifeline || !(targetLifeline instanceof type.UMLLifeline)) {
            return validationError('target must refer to a UMLLifeline. Not found or wrong type: ' + body.target, reqInfo, body)
        }
        const headView = findViewOnDiagram(diagram, targetLifeline._id)
        if (!headView) {
            return validationError('target lifeline "' + targetLifeline.name + '" does not have a view on diagram "' + diagram.name + '"', reqInfo, body)
        }
        options.headModel = targetLifeline
        options.headView = headView
        // x1,y1 = endpoint position; x2,y2 = head position
        if (body.x !== undefined) { options.x1 = body.x }
        if (body.y !== undefined) {
            options.y1 = body.y
            options.y2 = body.y
        }
    } else if (msgType === 'UMLLostMessage') {
        // LostMessage: source lifeline required, auto-created endpoint as target
        const sourceLifeline = findById(body.source)
        if (!sourceLifeline || !(sourceLifeline instanceof type.UMLLifeline)) {
            return validationError('source must refer to a UMLLifeline. Not found or wrong type: ' + body.source, reqInfo, body)
        }
        const tailView = findViewOnDiagram(diagram, sourceLifeline._id)
        if (!tailView) {
            return validationError('source lifeline "' + sourceLifeline.name + '" does not have a view on diagram "' + diagram.name + '"', reqInfo, body)
        }
        options.tailModel = sourceLifeline
        options.tailView = tailView
        // x2,y2 = endpoint position
        if (body.x !== undefined) { options.x2 = body.x }
        if (body.y !== undefined) {
            options.y1 = body.y
            options.y2 = body.y
        }
    } else {
        // Regular UMLMessage: both source and target required
        const sourceLifeline = findById(body.source)
        if (!sourceLifeline || !(sourceLifeline instanceof type.UMLLifeline)) {
            return validationError('source must refer to a UMLLifeline. Not found or wrong type: ' + body.source, reqInfo, body)
        }
        const targetLifeline = findById(body.target)
        if (!targetLifeline || !(targetLifeline instanceof type.UMLLifeline)) {
            return validationError('target must refer to a UMLLifeline. Not found or wrong type: ' + body.target, reqInfo, body)
        }
        const tailView = findViewOnDiagram(diagram, sourceLifeline._id)
        const headView = findViewOnDiagram(diagram, targetLifeline._id)
        if (!tailView) {
            return validationError('source lifeline "' + sourceLifeline.name + '" does not have a view on diagram "' + diagram.name + '". Add the lifeline to the diagram first.', reqInfo, body)
        }
        if (!headView) {
            return validationError('target lifeline "' + targetLifeline.name + '" does not have a view on diagram "' + diagram.name + '". Add the lifeline to the diagram first.', reqInfo, body)
        }
        options.tailModel = sourceLifeline
        options.headModel = targetLifeline
        options.tailView = tailView
        options.headView = headView
        if (body.y !== undefined) {
            options.y1 = body.y
            options.y2 = body.y
        }
    }

    const view = app.factory.createModelAndView(options)
    if (!view || !view.model) {
        return { success: false, error: 'Failed to create message. StarUML factory returned null.', request: Object.assign({}, reqInfo, { body: body }) }
    }
    const msg = view.model

    // Resize activation bar if activationHeight is specified
    if (body.activationHeight !== undefined && view.activation) {
        app.engine.setProperty(view.activation, 'height', body.activationHeight)
    }

    autoExpandFrame(diagram)
    return {
        success: true,
        message: 'Created ' + msgType + ' "' + (msg.name || msg._id) + '" with view on diagram "' + diagram.name + '"',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeMessage(msg)
    }
}

function getMessage(id, reqInfo) {
    const msg = findById(id)
    if (!msg || !(msg instanceof type.UMLMessage)) {
        return { success: false, error: 'Message not found: ' + id, request: reqInfo }
    }
    return {
        success: true,
        message: 'Retrieved message "' + (msg.name || msg._id) + '"',
        request: reqInfo,
        data: serializeMessage(msg)
    }
}

function updateMessage(id, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, MESSAGE_UPDATE_FIELDS),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'messageSort', 'string'),
        checkFieldType(body, 'documentation', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (Object.keys(body).length === 0) {
        return validationError('At least one field must be provided. Allowed fields: ' + MESSAGE_UPDATE_FIELDS.join(', '), reqInfo, body)
    }

    if (body.messageSort !== undefined && VALID_MESSAGE_SORTS.indexOf(body.messageSort) === -1) {
        return validationError('Invalid messageSort "' + body.messageSort + '". Allowed values: ' + VALID_MESSAGE_SORTS.join(', '), reqInfo, body)
    }

    const msg = findById(id)
    if (!msg || !(msg instanceof type.UMLMessage)) {
        return { success: false, error: 'Message not found: ' + id, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const updated = []
    if (body.name !== undefined) {
        app.engine.setProperty(msg, 'name', body.name)
        updated.push('name')
    }
    if (body.messageSort !== undefined) {
        app.engine.setProperty(msg, 'messageSort', body.messageSort)
        updated.push('messageSort')
    }
    if (body.documentation !== undefined) {
        app.engine.setProperty(msg, 'documentation', body.documentation)
        updated.push('documentation')
    }

    return {
        success: true,
        message: 'Updated message "' + (msg.name || msg._id) + '" (fields: ' + updated.join(', ') + ')',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeMessage(msg)
    }
}

function deleteMessage(id, reqInfo) {
    const msg = findById(id)
    if (!msg || !(msg instanceof type.UMLMessage)) {
        return { success: false, error: 'Message not found: ' + id, request: reqInfo }
    }
    const name = msg.name || msg._id
    app.engine.deleteElements([msg], [])
    return {
        success: true,
        message: 'Deleted message "' + name + '"',
        request: reqInfo,
        data: { deleted: id, name: name }
    }
}

// --- Combined Fragments ---

function getCombinedFragments(interactionId, reqInfo) {
    const interaction = findById(interactionId)
    if (!interaction || !(interaction instanceof type.UMLInteraction)) {
        return { success: false, error: 'Interaction not found: ' + interactionId, request: reqInfo }
    }
    const fragments = (interaction.fragments || []).filter(function (f) {
        return f instanceof type.UMLCombinedFragment
    })
    return {
        success: true,
        message: 'Retrieved ' + fragments.length + ' combined fragment(s) from interaction "' + interaction.name + '"',
        request: reqInfo,
        data: fragments.map(function (f) { return serializeCombinedFragment(f) })
    }
}

function createCombinedFragment(interactionId, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, COMBINED_FRAGMENT_ALLOWED_FIELDS),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'interactionOperator', 'string'),
        checkFieldType(body, 'diagramId', 'string'),
        checkFieldType(body, 'x', 'number'),
        checkFieldType(body, 'y', 'number'),
        checkFieldType(body, 'width', 'number'),
        checkFieldType(body, 'height', 'number'),
        checkFieldType(body, 'documentation', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (body.interactionOperator !== undefined && VALID_INTERACTION_OPERATORS.indexOf(body.interactionOperator) === -1) {
        return validationError('Invalid interactionOperator "' + body.interactionOperator + '". Allowed values: ' + VALID_INTERACTION_OPERATORS.join(', '), reqInfo, body)
    }

    const interaction = findById(interactionId)
    if (!interaction || !(interaction instanceof type.UMLInteraction)) {
        return { success: false, error: 'Interaction not found: ' + interactionId, request: Object.assign({}, reqInfo, { body: body }) }
    }

    if (body.diagramId) {
        const diagram = findById(body.diagramId)
        if (!diagram || !(diagram instanceof type.UMLSequenceDiagram)) {
            return validationError('diagramId must refer to a UMLSequenceDiagram. Not found or wrong type: ' + body.diagramId, reqInfo, body)
        }
        const cfX = body.x !== undefined ? body.x : 50
        const cfY = body.y !== undefined ? body.y : 100
        const cfW = body.width !== undefined ? body.width : 350
        const cfH = body.height !== undefined ? body.height : 200
        const options = {
            id: 'UMLCombinedFragment',
            parent: interaction,
            diagram: diagram,
            x1: cfX,
            y1: cfY,
            x2: cfX + cfW,
            y2: cfY + cfH,
            modelInitializer: function (m) {
                m.name = body.name || ''
                if (body.interactionOperator !== undefined) {
                    m.interactionOperator = body.interactionOperator
                }
                if (body.documentation !== undefined) {
                    m.documentation = body.documentation
                }
            }
        }
        let view
        try {
            view = app.factory.createModelAndView(options)
        } catch (e) {
            return { success: false, error: 'Failed to create combined fragment: ' + (e.message || String(e)), request: Object.assign({}, reqInfo, { body: body }) }
        }
        if (!view || !view.model) {
            return { success: false, error: 'Failed to create combined fragment view on diagram. StarUML factory returned null.', request: Object.assign({}, reqInfo, { body: body }) }
        }
        autoExpandFrame(diagram)
        return {
            success: true,
            message: 'Created combined fragment "' + (view.model.name || view.model.interactionOperator) + '" with view on diagram "' + diagram.name + '"',
            request: Object.assign({}, reqInfo, { body: body }),
            data: serializeCombinedFragment(view.model)
        }
    }

    const fragment = app.factory.createModel({
        id: 'UMLCombinedFragment',
        parent: interaction,
        field: 'fragments',
        modelInitializer: function (m) {
            m.name = body.name || ''
            if (body.interactionOperator !== undefined) {
                m.interactionOperator = body.interactionOperator
            }
            if (body.documentation !== undefined) {
                m.documentation = body.documentation
            }
        }
    })

    return {
        success: true,
        message: 'Created combined fragment "' + (fragment.name || fragment.interactionOperator) + '"',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeCombinedFragment(fragment)
    }
}

function getCombinedFragment(id, reqInfo) {
    const fragment = findById(id)
    if (!fragment || !(fragment instanceof type.UMLCombinedFragment)) {
        return { success: false, error: 'Combined fragment not found: ' + id, request: reqInfo }
    }
    return {
        success: true,
        message: 'Retrieved combined fragment "' + (fragment.name || fragment.interactionOperator) + '"',
        request: reqInfo,
        data: serializeCombinedFragment(fragment)
    }
}

function updateCombinedFragment(id, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, COMBINED_FRAGMENT_UPDATE_FIELDS),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'interactionOperator', 'string'),
        checkFieldType(body, 'documentation', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (Object.keys(body).length === 0) {
        return validationError('At least one field must be provided. Allowed fields: ' + COMBINED_FRAGMENT_UPDATE_FIELDS.join(', '), reqInfo, body)
    }

    if (body.interactionOperator !== undefined && VALID_INTERACTION_OPERATORS.indexOf(body.interactionOperator) === -1) {
        return validationError('Invalid interactionOperator "' + body.interactionOperator + '". Allowed values: ' + VALID_INTERACTION_OPERATORS.join(', '), reqInfo, body)
    }

    const fragment = findById(id)
    if (!fragment || !(fragment instanceof type.UMLCombinedFragment)) {
        return { success: false, error: 'Combined fragment not found: ' + id, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const updated = []
    if (body.name !== undefined) {
        app.engine.setProperty(fragment, 'name', body.name)
        updated.push('name')
    }
    if (body.interactionOperator !== undefined) {
        app.engine.setProperty(fragment, 'interactionOperator', body.interactionOperator)
        updated.push('interactionOperator')
    }
    if (body.documentation !== undefined) {
        app.engine.setProperty(fragment, 'documentation', body.documentation)
        updated.push('documentation')
    }

    return {
        success: true,
        message: 'Updated combined fragment "' + (fragment.name || fragment.interactionOperator) + '" (fields: ' + updated.join(', ') + ')',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeCombinedFragment(fragment)
    }
}

function deleteCombinedFragment(id, reqInfo) {
    const fragment = findById(id)
    if (!fragment || !(fragment instanceof type.UMLCombinedFragment)) {
        return { success: false, error: 'Combined fragment not found: ' + id, request: reqInfo }
    }
    const name = fragment.name || fragment.interactionOperator
    // Cascade delete: operands are children and will be deleted with the fragment
    app.engine.deleteElements([fragment], [])
    return {
        success: true,
        message: 'Deleted combined fragment "' + name + '" (operands cascade deleted)',
        request: reqInfo,
        data: { deleted: id, name: name }
    }
}

// --- Interaction Operands ---

function getOperands(fragmentId, reqInfo) {
    const fragment = findById(fragmentId)
    if (!fragment || !(fragment instanceof type.UMLCombinedFragment)) {
        return { success: false, error: 'Combined fragment not found: ' + fragmentId, request: reqInfo }
    }
    const operands = fragment.operands || []
    return {
        success: true,
        message: 'Retrieved ' + operands.length + ' operand(s) from combined fragment "' + (fragment.name || fragment.interactionOperator) + '"',
        request: reqInfo,
        data: operands.map(function (op) { return serializeInteractionOperand(op) })
    }
}

function createOperand(fragmentId, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, OPERAND_ALLOWED_FIELDS),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'guard', 'string'),
        checkFieldType(body, 'documentation', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    const fragment = findById(fragmentId)
    if (!fragment || !(fragment instanceof type.UMLCombinedFragment)) {
        return { success: false, error: 'Combined fragment not found: ' + fragmentId, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const operand = app.factory.createModel({
        id: 'UMLInteractionOperand',
        parent: fragment,
        field: 'operands',
        modelInitializer: function (m) {
            m.name = body.name || ''
            if (body.guard !== undefined) {
                m.guard = body.guard
            }
            if (body.documentation !== undefined) {
                m.documentation = body.documentation
            }
        }
    })

    return {
        success: true,
        message: 'Created operand on combined fragment "' + (fragment.name || fragment.interactionOperator) + '"',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeInteractionOperand(operand)
    }
}

function getOperand(id, reqInfo) {
    const operand = findById(id)
    if (!operand || !(operand instanceof type.UMLInteractionOperand)) {
        return { success: false, error: 'Operand not found: ' + id, request: reqInfo }
    }
    return {
        success: true,
        message: 'Retrieved operand "' + (operand.name || operand.guard || operand._id) + '"',
        request: reqInfo,
        data: serializeInteractionOperand(operand)
    }
}

function updateOperand(id, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, OPERAND_UPDATE_FIELDS),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'guard', 'string'),
        checkFieldType(body, 'documentation', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (Object.keys(body).length === 0) {
        return validationError('At least one field must be provided. Allowed fields: ' + OPERAND_UPDATE_FIELDS.join(', '), reqInfo, body)
    }

    const operand = findById(id)
    if (!operand || !(operand instanceof type.UMLInteractionOperand)) {
        return { success: false, error: 'Operand not found: ' + id, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const updated = []
    if (body.name !== undefined) {
        app.engine.setProperty(operand, 'name', body.name)
        updated.push('name')
    }
    if (body.guard !== undefined) {
        app.engine.setProperty(operand, 'guard', body.guard)
        updated.push('guard')
    }
    if (body.documentation !== undefined) {
        app.engine.setProperty(operand, 'documentation', body.documentation)
        updated.push('documentation')
    }

    return {
        success: true,
        message: 'Updated operand "' + (operand.name || operand.guard || operand._id) + '" (fields: ' + updated.join(', ') + ')',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeInteractionOperand(operand)
    }
}

function deleteOperand(id, reqInfo) {
    const operand = findById(id)
    if (!operand || !(operand instanceof type.UMLInteractionOperand)) {
        return { success: false, error: 'Operand not found: ' + id, request: reqInfo }
    }

    // Check: parent fragment must have at least 2 operands to allow deletion
    const parent = operand._parent
    if (parent && parent.operands && parent.operands.length <= 1) {
        return validationError(
            'Cannot delete the last operand of combined fragment "' + (parent.name || parent.interactionOperator) + '". A combined fragment must have at least one operand.',
            reqInfo
        )
    }

    const name = operand.name || operand.guard || operand._id
    app.engine.deleteElements([operand], [])
    return {
        success: true,
        message: 'Deleted operand "' + name + '"',
        request: reqInfo,
        data: { deleted: id, name: name }
    }
}

// --- State Invariants ---

function getStateInvariants(interactionId, reqInfo) {
    const interaction = findById(interactionId)
    if (!interaction || !(interaction instanceof type.UMLInteraction)) {
        return { success: false, error: 'Interaction not found: ' + interactionId, request: reqInfo }
    }
    const stateInvariants = (interaction.fragments || []).filter(function (f) {
        return f instanceof type.UMLStateInvariant
    })
    return {
        success: true,
        message: 'Retrieved ' + stateInvariants.length + ' state invariant(s) from interaction "' + interaction.name + '"',
        request: reqInfo,
        data: stateInvariants.map(function (si) { return serializeStateInvariant(si) })
    }
}

function createStateInvariant(interactionId, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, STATE_INVARIANT_ALLOWED_FIELDS),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'covered', 'string'),
        checkFieldType(body, 'invariant', 'string'),
        checkFieldType(body, 'diagramId', 'string'),
        checkFieldType(body, 'x', 'number'),
        checkFieldType(body, 'y', 'number'),
        checkFieldType(body, 'documentation', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    const interaction = findById(interactionId)
    if (!interaction || !(interaction instanceof type.UMLInteraction)) {
        return { success: false, error: 'Interaction not found: ' + interactionId, request: Object.assign({}, reqInfo, { body: body }) }
    }

    if (body.diagramId) {
        const diagram = findById(body.diagramId)
        if (!diagram || !(diagram instanceof type.UMLSequenceDiagram)) {
            return validationError('diagramId must refer to a UMLSequenceDiagram. Not found or wrong type: ' + body.diagramId, reqInfo, body)
        }
        if (!body.covered) {
            return validationError('Field "covered" (lifeline ID) is required when creating a state invariant with a diagram view', reqInfo, body)
        }
        const coveredLifeline = findById(body.covered)
        if (!coveredLifeline || !(coveredLifeline instanceof type.UMLLifeline)) {
            return validationError('covered must refer to a UMLLifeline. Not found or wrong type: ' + body.covered, reqInfo, body)
        }
        const lifelineView = findViewOnDiagram(diagram, coveredLifeline._id)
        if (!lifelineView) {
            return validationError('Covered lifeline "' + coveredLifeline.name + '" does not have a view on diagram "' + diagram.name + '".', reqInfo, body)
        }
        const siX = body.x !== undefined ? body.x : lifelineView.left
        const siY = body.y !== undefined ? body.y : 200
        const options = {
            id: 'UMLStateInvariant',
            parent: interaction,
            diagram: diagram,
            field: 'fragments',
            headModel: coveredLifeline,
            headView: lifelineView,
            x1: siX,
            y1: siY,
            x2: siX + 100,
            y2: siY + 50,
            modelInitializer: function (m) {
                m.name = body.name || ''
                m.covered = coveredLifeline
                if (body.invariant !== undefined) {
                    m.invariant = body.invariant
                }
                if (body.documentation !== undefined) {
                    m.documentation = body.documentation
                }
            }
        }
        let view
        try {
            view = app.factory.createModelAndView(options)
        } catch (e) {
            return { success: false, error: 'Failed to create state invariant: ' + (e.message || String(e)), request: Object.assign({}, reqInfo, { body: body }) }
        }
        if (!view || !view.model) {
            return { success: false, error: 'Failed to create state invariant view on diagram. StarUML factory returned null.', request: Object.assign({}, reqInfo, { body: body }) }
        }
        autoExpandFrame(diagram)
        return {
            success: true,
            message: 'Created state invariant "' + (view.model.name || view.model._id) + '" with view on diagram',
            request: Object.assign({}, reqInfo, { body: body }),
            data: serializeStateInvariant(view.model)
        }
    }

    const si = app.factory.createModel({
        id: 'UMLStateInvariant',
        parent: interaction,
        field: 'fragments',
        modelInitializer: function (m) {
            m.name = body.name || ''
            if (body.covered) {
                m.covered = findById(body.covered)
            }
            if (body.invariant !== undefined) {
                m.invariant = body.invariant
            }
            if (body.documentation !== undefined) {
                m.documentation = body.documentation
            }
        }
    })

    if (!si) {
        return { success: false, error: 'Failed to create state invariant. Try providing diagramId to create with a diagram context.', request: Object.assign({}, reqInfo, { body: body }) }
    }

    return {
        success: true,
        message: 'Created state invariant "' + (si.name || si._id) + '"',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeStateInvariant(si)
    }
}

function getStateInvariant(id, reqInfo) {
    const si = findById(id)
    if (!si || !(si instanceof type.UMLStateInvariant)) {
        return { success: false, error: 'State invariant not found: ' + id, request: reqInfo }
    }
    return {
        success: true,
        message: 'Retrieved state invariant "' + (si.name || si._id) + '"',
        request: reqInfo,
        data: serializeStateInvariant(si)
    }
}

function updateStateInvariant(id, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, STATE_INVARIANT_UPDATE_FIELDS),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'covered', 'string'),
        checkFieldType(body, 'invariant', 'string'),
        checkFieldType(body, 'documentation', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (Object.keys(body).length === 0) {
        return validationError('At least one field must be provided. Allowed fields: ' + STATE_INVARIANT_UPDATE_FIELDS.join(', '), reqInfo, body)
    }

    const si = findById(id)
    if (!si || !(si instanceof type.UMLStateInvariant)) {
        return { success: false, error: 'State invariant not found: ' + id, request: Object.assign({}, reqInfo, { body: body }) }
    }

    if (body.covered !== undefined) {
        const coveredLifeline = findById(body.covered)
        if (!coveredLifeline || !(coveredLifeline instanceof type.UMLLifeline)) {
            return validationError('covered must refer to a UMLLifeline. Not found or wrong type: ' + body.covered, reqInfo, body)
        }
    }

    const updated = []
    if (body.name !== undefined) {
        app.engine.setProperty(si, 'name', body.name)
        updated.push('name')
    }
    if (body.covered !== undefined) {
        const coveredRef = findById(body.covered)
        app.engine.setProperty(si, 'covered', coveredRef)
        updated.push('covered')
    }
    if (body.invariant !== undefined) {
        app.engine.setProperty(si, 'invariant', body.invariant)
        updated.push('invariant')
    }
    if (body.documentation !== undefined) {
        app.engine.setProperty(si, 'documentation', body.documentation)
        updated.push('documentation')
    }

    return {
        success: true,
        message: 'Updated state invariant "' + (si.name || si._id) + '" (fields: ' + updated.join(', ') + ')',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeStateInvariant(si)
    }
}

function deleteStateInvariant(id, reqInfo) {
    const si = findById(id)
    if (!si || !(si instanceof type.UMLStateInvariant)) {
        return { success: false, error: 'State invariant not found: ' + id, request: reqInfo }
    }
    const name = si.name || si._id
    app.engine.deleteElements([si], [])
    return {
        success: true,
        message: 'Deleted state invariant "' + name + '"',
        request: reqInfo,
        data: { deleted: id, name: name }
    }
}

// --- Interaction Uses ---

function getInteractionUses(interactionId, reqInfo) {
    const interaction = findById(interactionId)
    if (!interaction || !(interaction instanceof type.UMLInteraction)) {
        return { success: false, error: 'Interaction not found: ' + interactionId, request: reqInfo }
    }
    const interactionUses = (interaction.fragments || []).filter(function (f) {
        return f instanceof type.UMLInteractionUse
    })
    return {
        success: true,
        message: 'Retrieved ' + interactionUses.length + ' interaction use(s) from interaction "' + interaction.name + '"',
        request: reqInfo,
        data: interactionUses.map(function (iu) { return serializeInteractionUse(iu) })
    }
}

function createInteractionUse(interactionId, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, INTERACTION_USE_ALLOWED_FIELDS),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'refersTo', 'string'),
        checkFieldType(body, 'arguments', 'string'),
        checkFieldType(body, 'returnValue', 'string'),
        checkFieldType(body, 'diagramId', 'string'),
        checkFieldType(body, 'x', 'number'),
        checkFieldType(body, 'y', 'number'),
        checkFieldType(body, 'width', 'number'),
        checkFieldType(body, 'height', 'number'),
        checkFieldType(body, 'documentation', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    const interaction = findById(interactionId)
    if (!interaction || !(interaction instanceof type.UMLInteraction)) {
        return { success: false, error: 'Interaction not found: ' + interactionId, request: Object.assign({}, reqInfo, { body: body }) }
    }

    if (body.refersTo) {
        const refInteraction = findById(body.refersTo)
        if (!refInteraction || !(refInteraction instanceof type.UMLInteraction)) {
            return validationError('refersTo must refer to a UMLInteraction. Not found or wrong type: ' + body.refersTo, reqInfo, body)
        }
    }

    if (body.diagramId) {
        const diagram = findById(body.diagramId)
        if (!diagram || !(diagram instanceof type.UMLSequenceDiagram)) {
            return validationError('diagramId must refer to a UMLSequenceDiagram. Not found or wrong type: ' + body.diagramId, reqInfo, body)
        }
        const iuX = body.x !== undefined ? body.x : 50
        const iuY = body.y !== undefined ? body.y : 100
        const iuW = body.width !== undefined ? body.width : 350
        const iuH = body.height !== undefined ? body.height : 100
        const options = {
            id: 'UMLInteractionUse',
            parent: interaction,
            diagram: diagram,
            x1: iuX,
            y1: iuY,
            x2: iuX + iuW,
            y2: iuY + iuH,
            modelInitializer: function (m) {
                m.name = body.name || ''
                if (body.refersTo) {
                    m.refersTo = findById(body.refersTo)
                }
                if (body.arguments !== undefined) {
                    m.arguments = body.arguments
                }
                if (body.returnValue !== undefined) {
                    m.returnValue = body.returnValue
                }
                if (body.documentation !== undefined) {
                    m.documentation = body.documentation
                }
            }
        }
        let view
        try {
            view = app.factory.createModelAndView(options)
        } catch (e) {
            return { success: false, error: 'Failed to create interaction use: ' + (e.message || String(e)), request: Object.assign({}, reqInfo, { body: body }) }
        }
        if (!view || !view.model) {
            return { success: false, error: 'Failed to create interaction use view on diagram. StarUML factory returned null.', request: Object.assign({}, reqInfo, { body: body }) }
        }
        autoExpandFrame(diagram)
        return {
            success: true,
            message: 'Created interaction use "' + (view.model.name || view.model._id) + '" with view on diagram',
            request: Object.assign({}, reqInfo, { body: body }),
            data: serializeInteractionUse(view.model)
        }
    }

    const iu = app.factory.createModel({
        id: 'UMLInteractionUse',
        parent: interaction,
        field: 'fragments',
        modelInitializer: function (m) {
            m.name = body.name || ''
            if (body.refersTo) {
                m.refersTo = findById(body.refersTo)
            }
            if (body.arguments !== undefined) {
                m.arguments = body.arguments
            }
            if (body.returnValue !== undefined) {
                m.returnValue = body.returnValue
            }
            if (body.documentation !== undefined) {
                m.documentation = body.documentation
            }
        }
    })

    if (!iu) {
        return { success: false, error: 'Failed to create interaction use. StarUML factory returned null.', request: Object.assign({}, reqInfo, { body: body }) }
    }

    return {
        success: true,
        message: 'Created interaction use "' + (iu.name || iu._id) + '"',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeInteractionUse(iu)
    }
}

function getInteractionUse(id, reqInfo) {
    const iu = findById(id)
    if (!iu || !(iu instanceof type.UMLInteractionUse)) {
        return { success: false, error: 'Interaction use not found: ' + id, request: reqInfo }
    }
    return {
        success: true,
        message: 'Retrieved interaction use "' + (iu.name || iu._id) + '"',
        request: reqInfo,
        data: serializeInteractionUse(iu)
    }
}

function updateInteractionUse(id, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, INTERACTION_USE_UPDATE_FIELDS),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'refersTo', 'string'),
        checkFieldType(body, 'arguments', 'string'),
        checkFieldType(body, 'returnValue', 'string'),
        checkFieldType(body, 'documentation', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (Object.keys(body).length === 0) {
        return validationError('At least one field must be provided. Allowed fields: ' + INTERACTION_USE_UPDATE_FIELDS.join(', '), reqInfo, body)
    }

    const iu = findById(id)
    if (!iu || !(iu instanceof type.UMLInteractionUse)) {
        return { success: false, error: 'Interaction use not found: ' + id, request: Object.assign({}, reqInfo, { body: body }) }
    }

    if (body.refersTo !== undefined) {
        const refInteraction = findById(body.refersTo)
        if (!refInteraction || !(refInteraction instanceof type.UMLInteraction)) {
            return validationError('refersTo must refer to a UMLInteraction. Not found or wrong type: ' + body.refersTo, reqInfo, body)
        }
    }

    const updated = []
    if (body.name !== undefined) {
        app.engine.setProperty(iu, 'name', body.name)
        updated.push('name')
    }
    if (body.refersTo !== undefined) {
        const refTarget = findById(body.refersTo)
        app.engine.setProperty(iu, 'refersTo', refTarget)
        updated.push('refersTo')
    }
    if (body.arguments !== undefined) {
        app.engine.setProperty(iu, 'arguments', body.arguments)
        updated.push('arguments')
    }
    if (body.returnValue !== undefined) {
        app.engine.setProperty(iu, 'returnValue', body.returnValue)
        updated.push('returnValue')
    }
    if (body.documentation !== undefined) {
        app.engine.setProperty(iu, 'documentation', body.documentation)
        updated.push('documentation')
    }

    return {
        success: true,
        message: 'Updated interaction use "' + (iu.name || iu._id) + '" (fields: ' + updated.join(', ') + ')',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeInteractionUse(iu)
    }
}

function deleteInteractionUse(id, reqInfo) {
    const iu = findById(id)
    if (!iu || !(iu instanceof type.UMLInteractionUse)) {
        return { success: false, error: 'Interaction use not found: ' + id, request: reqInfo }
    }
    const name = iu.name || iu._id
    app.engine.deleteElements([iu], [])
    return {
        success: true,
        message: 'Deleted interaction use "' + name + '"',
        request: reqInfo,
        data: { deleted: id, name: name }
    }
}

// --- Generic Element ---

// ============================================================
// Generic / Cross-diagram Handlers
// ============================================================

// --- All Diagrams ---

function getAllDiagrams(query, reqInfo) {
    const allowedParams = ['type']
    const unknownParams = Object.keys(query).filter(function (k) {
        return allowedParams.indexOf(k) === -1
    })
    if (unknownParams.length > 0) {
        return validationError('Unknown query parameter(s): ' + unknownParams.join(', ') + '. Allowed: ' + allowedParams.join(', '), reqInfo)
    }

    let diagrams = app.repository.select('@Diagram')

    if (query.type) {
        diagrams = diagrams.filter(function (d) {
            return d.constructor.name === query.type
        })
    }

    return {
        success: true,
        message: 'Retrieved ' + diagrams.length + ' diagram(s)',
        request: reqInfo,
        data: diagrams.map(function (d) { return serializeGenericDiagram(d) })
    }
}

// --- Diagram Image Export ---

function exportDiagramImage(id, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, EXPORT_ALLOWED_FIELDS),
        checkFieldType(body, 'path', 'string'),
        checkFieldType(body, 'format', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (!body.path) {
        return validationError('Field "path" is required', reqInfo, body)
    }

    const pathErr = checkNonEmptyString(body, 'path')
    if (pathErr) {
        return validationError(pathErr, reqInfo, body)
    }

    if (body.path.charAt(0) !== '/' && !/^[a-zA-Z]:[/\\]/.test(body.path)) {
        return validationError('Field "path" must be an absolute path', reqInfo, body)
    }

    const format = (body.format || 'png').toLowerCase()
    if (VALID_EXPORT_FORMATS.indexOf(format) === -1) {
        return validationError('Invalid format "' + body.format + '". Allowed: ' + VALID_EXPORT_FORMATS.join(', '), reqInfo, body)
    }

    const diagram = findById(id)
    if (!diagram || !diagram.ownedViews) {
        return { success: false, error: 'Diagram not found: ' + id, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const reqInfoWithBody = Object.assign({}, reqInfo, { body: body })

    try {
        const nodePath = require('path')
        const appPath = app.getAppPath()
        const diagramExport = require(nodePath.join(appPath, 'src', 'engine', 'diagram-export'))

        if (format === 'pdf') {
            diagramExport.exportToPDF([diagram], body.path, { showName: true })
        } else if (format === 'svg') {
            diagramExport.exportToSVG(diagram, body.path)
        } else if (format === 'jpeg') {
            diagramExport.exportToJPEG(diagram, body.path)
        } else {
            diagramExport.exportToPNG(diagram, body.path)
        }

        return {
            success: true,
            message: 'Exported diagram "' + (diagram.name || id) + '" as ' + format + ' to "' + body.path + '"',
            request: reqInfoWithBody,
            data: { path: body.path, format: format }
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to export diagram: ' + (e.message || String(e)),
            request: reqInfoWithBody
        }
    }
}

// --- Notes ---

function getDiagramNotes(diagramId, reqInfo) {
    const diagram = findById(diagramId)
    if (!diagram || !diagram.ownedViews) {
        return { success: false, error: 'Diagram not found: ' + diagramId, request: reqInfo }
    }
    const notes = diagram.ownedViews.filter(function (v) {
        return v.constructor.name === 'UMLNoteView'
    })
    return {
        success: true,
        message: 'Retrieved ' + notes.length + ' note(s) from diagram "' + (diagram.name || diagramId) + '"',
        request: reqInfo,
        data: notes.map(function (v) { return serializeNoteView(v) })
    }
}

function createNote(diagramId, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, NOTE_ALLOWED_FIELDS),
        checkFieldType(body, 'text', 'string'),
        checkFieldType(body, 'x1', 'number'),
        checkFieldType(body, 'y1', 'number'),
        checkFieldType(body, 'x2', 'number'),
        checkFieldType(body, 'y2', 'number')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    const diagram = findById(diagramId)
    if (!diagram || !diagram.ownedViews) {
        return { success: false, error: 'Diagram not found: ' + diagramId, request: Object.assign({}, reqInfo, { body: body }) }
    }

    try {
        const view = app.factory.createModelAndView({
            id: 'Note',
            diagram: diagram,
            x1: body.x1 !== undefined ? body.x1 : 100,
            y1: body.y1 !== undefined ? body.y1 : 100,
            x2: body.x2 !== undefined ? body.x2 : 250,
            y2: body.y2 !== undefined ? body.y2 : 180
        })

        if (!view) {
            return { success: false, error: 'Failed to create note. StarUML factory returned null.', request: Object.assign({}, reqInfo, { body: body }) }
        }

        if (body.text !== undefined) {
            app.engine.setProperty(view, 'text', body.text)
        }

        // Auto-expand frame to contain newly created note
        autoExpandFrame(diagram)

        return {
            success: true,
            message: 'Created note on diagram "' + (diagram.name || diagramId) + '"',
            request: Object.assign({}, reqInfo, { body: body }),
            data: serializeNoteView(view)
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to create note: ' + (e.message || String(e)),
            request: Object.assign({}, reqInfo, { body: body })
        }
    }
}

function getNote(id, reqInfo) {
    const view = findById(id)
    if (!view || view.constructor.name !== 'UMLNoteView') {
        return { success: false, error: 'Note not found: ' + id, request: reqInfo }
    }
    return {
        success: true,
        message: 'Retrieved note',
        request: reqInfo,
        data: serializeNoteView(view)
    }
}

function updateNote(id, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, NOTE_UPDATE_FIELDS),
        checkFieldType(body, 'text', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (Object.keys(body).length === 0) {
        return validationError('At least one field must be provided. Allowed fields: ' + NOTE_UPDATE_FIELDS.join(', '), reqInfo, body)
    }

    const view = findById(id)
    if (!view || view.constructor.name !== 'UMLNoteView') {
        return { success: false, error: 'Note not found: ' + id, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const updated = []
    if (body.text !== undefined) {
        app.engine.setProperty(view, 'text', body.text)
        updated.push('text')
    }

    return {
        success: true,
        message: 'Updated note (fields: ' + updated.join(', ') + ')',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeNoteView(view)
    }
}

function deleteNote(id, reqInfo) {
    const view = findById(id)
    if (!view || view.constructor.name !== 'UMLNoteView') {
        return { success: false, error: 'Note not found: ' + id, request: reqInfo }
    }
    app.engine.deleteElements([], [view])
    return {
        success: true,
        message: 'Deleted note',
        request: reqInfo,
        data: { deleted: id }
    }
}

// --- Note Links ---

function getDiagramNoteLinks(diagramId, reqInfo) {
    const diagram = findById(diagramId)
    if (!diagram || !diagram.ownedViews) {
        return { success: false, error: 'Diagram not found: ' + diagramId, request: reqInfo }
    }
    const links = diagram.ownedViews.filter(function (v) {
        return v.constructor.name === 'UMLNoteLinkView'
    })
    return {
        success: true,
        message: 'Retrieved ' + links.length + ' note link(s) from diagram "' + (diagram.name || diagramId) + '"',
        request: reqInfo,
        data: links.map(function (v) { return serializeNoteLinkView(v) })
    }
}

function createNoteLink(diagramId, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, NOTE_LINK_ALLOWED_FIELDS),
        checkFieldType(body, 'noteId', 'string'),
        checkFieldType(body, 'targetId', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (!body.noteId) {
        return validationError('Field "noteId" is required', reqInfo, body)
    }
    if (!body.targetId) {
        return validationError('Field "targetId" is required', reqInfo, body)
    }

    const diagram = findById(diagramId)
    if (!diagram || !diagram.ownedViews) {
        return { success: false, error: 'Diagram not found: ' + diagramId, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const noteView = findViewOnDiagramByAnyId(diagram, body.noteId)
    if (!noteView || noteView.constructor.name !== 'UMLNoteView') {
        return validationError('noteId must refer to a UMLNoteView on this diagram. Not found: ' + body.noteId, reqInfo, body)
    }

    const targetView = findViewOnDiagramByAnyId(diagram, body.targetId)
    if (!targetView) {
        return validationError('targetId must refer to a view on this diagram. Not found: ' + body.targetId, reqInfo, body)
    }

    let view
    try {
        view = app.factory.createModelAndView({
            id: 'NoteLink',
            diagram: diagram,
            tailView: noteView,
            headView: targetView
        })
    } catch (e) {
        return { success: false, error: 'Failed to create note link: ' + (e.message || String(e)), request: Object.assign({}, reqInfo, { body: body }) }
    }
    if (!view) {
        return { success: false, error: 'Failed to create note link. StarUML factory returned null.', request: Object.assign({}, reqInfo, { body: body }) }
    }

    return {
        success: true,
        message: 'Created note link on diagram "' + (diagram.name || diagramId) + '"',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeNoteLinkView(view)
    }
}

function deleteNoteLink(id, reqInfo) {
    const view = findById(id)
    if (!view || view.constructor.name !== 'UMLNoteLinkView') {
        return { success: false, error: 'Note link not found: ' + id, request: reqInfo }
    }
    app.engine.deleteElements([], [view])
    return {
        success: true,
        message: 'Deleted note link',
        request: reqInfo,
        data: { deleted: id }
    }
}

// --- Free Lines ---

function getDiagramFreeLines(diagramId, reqInfo) {
    const diagram = findById(diagramId)
    if (!diagram || !diagram.ownedViews) {
        return { success: false, error: 'Diagram not found: ' + diagramId, request: reqInfo }
    }
    const lines = diagram.ownedViews.filter(function (v) {
        return v.constructor.name === 'FreelineEdgeView'
    })
    return {
        success: true,
        message: 'Retrieved ' + lines.length + ' free line(s) from diagram "' + (diagram.name || diagramId) + '"',
        request: reqInfo,
        data: lines.map(function (v) { return serializeFreeLineView(v) })
    }
}

function createFreeLine(diagramId, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, FREE_LINE_ALLOWED_FIELDS),
        checkFieldType(body, 'x1', 'number'),
        checkFieldType(body, 'y1', 'number'),
        checkFieldType(body, 'x2', 'number'),
        checkFieldType(body, 'y2', 'number')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    const diagram = findById(diagramId)
    if (!diagram || !diagram.ownedViews) {
        return { success: false, error: 'Diagram not found: ' + diagramId, request: Object.assign({}, reqInfo, { body: body }) }
    }

    try {
        const view = app.factory.createModelAndView({
            id: 'FreeLine',
            diagram: diagram,
            x1: body.x1 !== undefined ? body.x1 : 100,
            y1: body.y1 !== undefined ? body.y1 : 100,
            x2: body.x2 !== undefined ? body.x2 : 300,
            y2: body.y2 !== undefined ? body.y2 : 200
        })

        if (!view) {
            return { success: false, error: 'Failed to create free line. StarUML factory returned null.', request: Object.assign({}, reqInfo, { body: body }) }
        }

        // Auto-expand frame to contain newly created free line
        autoExpandFrame(diagram)

        return {
            success: true,
            message: 'Created free line on diagram "' + (diagram.name || diagramId) + '"',
            request: Object.assign({}, reqInfo, { body: body }),
            data: serializeFreeLineView(view)
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to create free line: ' + (e.message || String(e)),
            request: Object.assign({}, reqInfo, { body: body })
        }
    }
}

function deleteFreeLine(id, reqInfo) {
    const view = findById(id)
    if (!view || view.constructor.name !== 'FreelineEdgeView') {
        return { success: false, error: 'Free line not found: ' + id, request: reqInfo }
    }
    app.engine.deleteElements([], [view])
    return {
        success: true,
        message: 'Deleted free line',
        request: reqInfo,
        data: { deleted: id }
    }
}

// --- Shapes (view-only elements) ---

function serializeShapeView(view) {
    if (!view) {
        return null
    }
    const result = {
        _id: view._id,
        _type: view.constructor.name,
        shapeType: SHAPE_VIEW_TYPE_MAP[view.constructor.name] || view.constructor.name,
        left: view.left !== undefined ? view.left : 0,
        top: view.top !== undefined ? view.top : 0,
        width: view.width !== undefined ? view.width : 0,
        height: view.height !== undefined ? view.height : 0
    }
    if (view.text !== undefined) {
        result.text = view.text
    }
    if (view.model && view.model.url !== undefined) {
        result.url = view.model.url
    }
    if (view.model && view.model.imageFile !== undefined) {
        result.imageFile = view.model.imageFile
    }
    return result
}

function getDiagramShapes(diagramId, reqInfo) {
    const diagram = findById(diagramId)
    if (!diagram || !diagram.ownedViews) {
        return { success: false, error: 'Diagram not found: ' + diagramId, request: reqInfo }
    }
    const shapes = diagram.ownedViews.filter(function (v) {
        return SHAPE_VIEW_TYPES.indexOf(v.constructor.name) !== -1
    })
    return {
        success: true,
        message: 'Retrieved ' + shapes.length + ' shape(s) from diagram "' + (diagram.name || diagramId) + '"',
        request: reqInfo,
        data: shapes.map(function (v) { return serializeShapeView(v) })
    }
}

function createShape(diagramId, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, SHAPE_CREATE_FIELDS),
        checkFieldType(body, 'type', 'string'),
        checkFieldType(body, 'text', 'string'),
        checkFieldType(body, 'url', 'string'),
        checkFieldType(body, 'imageFile', 'string'),
        checkFieldType(body, 'x1', 'number'),
        checkFieldType(body, 'y1', 'number'),
        checkFieldType(body, 'x2', 'number'),
        checkFieldType(body, 'y2', 'number')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (!body.type) {
        return validationError('Field "type" is required', reqInfo, body)
    }

    if (ALLOWED_SHAPE_TYPES.indexOf(body.type) === -1) {
        return validationError('Invalid shape type "' + body.type + '". Allowed: ' + ALLOWED_SHAPE_TYPES.join(', '), reqInfo, body)
    }

    const diagram = findById(diagramId)
    if (!diagram || !diagram.ownedViews) {
        return { success: false, error: 'Diagram not found: ' + diagramId, request: Object.assign({}, reqInfo, { body: body }) }
    }

    try {
        const view = app.factory.createModelAndView({
            id: body.type,
            diagram: diagram,
            x1: body.x1 !== undefined ? body.x1 : 100,
            y1: body.y1 !== undefined ? body.y1 : 100,
            x2: body.x2 !== undefined ? body.x2 : 200,
            y2: body.y2 !== undefined ? body.y2 : 150
        })

        if (body.text !== undefined) {
            app.engine.setProperty(view, 'text', body.text)
        }
        if (body.url !== undefined && view.model) {
            app.engine.setProperty(view.model, 'url', body.url)
        }
        if (body.imageFile !== undefined && view.model) {
            app.engine.setProperty(view.model, 'imageFile', body.imageFile)
        }

        // Auto-expand frame to contain newly created shape
        autoExpandFrame(diagram)

        return {
            success: true,
            message: 'Created shape "' + body.type + '" on diagram "' + (diagram.name || diagramId) + '"',
            request: Object.assign({}, reqInfo, { body: body }),
            data: serializeShapeView(view)
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to create shape: ' + (e.message || String(e)),
            request: Object.assign({}, reqInfo, { body: body })
        }
    }
}

function getShape(id, reqInfo) {
    const view = findById(id)
    if (!view || SHAPE_VIEW_TYPES.indexOf(view.constructor.name) === -1) {
        return { success: false, error: 'Shape not found: ' + id, request: reqInfo }
    }
    return {
        success: true,
        message: 'Retrieved shape',
        request: reqInfo,
        data: serializeShapeView(view)
    }
}

function updateShape(id, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, SHAPE_UPDATE_FIELDS),
        checkFieldType(body, 'text', 'string'),
        checkFieldType(body, 'url', 'string'),
        checkFieldType(body, 'imageFile', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (Object.keys(body).length === 0) {
        return validationError('At least one field must be provided. Allowed fields: ' + SHAPE_UPDATE_FIELDS.join(', '), reqInfo, body)
    }

    const view = findById(id)
    if (!view || SHAPE_VIEW_TYPES.indexOf(view.constructor.name) === -1) {
        return { success: false, error: 'Shape not found: ' + id, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const updated = []
    if (body.text !== undefined) {
        app.engine.setProperty(view, 'text', body.text)
        updated.push('text')
    }
    if (body.url !== undefined && view.model) {
        app.engine.setProperty(view.model, 'url', body.url)
        updated.push('url')
    }
    if (body.imageFile !== undefined && view.model) {
        app.engine.setProperty(view.model, 'imageFile', body.imageFile)
        updated.push('imageFile')
    }

    return {
        success: true,
        message: 'Updated shape (fields: ' + updated.join(', ') + ')',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeShapeView(view)
    }
}

function deleteShape(id, reqInfo) {
    const view = findById(id)
    if (!view || SHAPE_VIEW_TYPES.indexOf(view.constructor.name) === -1) {
        return { success: false, error: 'Shape not found: ' + id, request: reqInfo }
    }
    app.engine.deleteElements([], [view])
    return {
        success: true,
        message: 'Deleted shape',
        request: reqInfo,
        data: { deleted: id }
    }
}

// --- Views (Move/Resize) ---

function getDiagramViews(diagramId, reqInfo) {
    const diagram = findById(diagramId)
    if (!diagram || !diagram.ownedViews) {
        return { success: false, error: 'Diagram not found: ' + diagramId, request: reqInfo }
    }
    const views = diagram.ownedViews
    return {
        success: true,
        message: 'Retrieved ' + views.length + ' view(s) from diagram "' + (diagram.name || diagramId) + '"',
        request: reqInfo,
        data: views.map(function (v) { return serializeViewInfo(v) })
    }
}

function updateView(id, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, VIEW_UPDATE_FIELDS),
        checkFieldType(body, 'left', 'number'),
        checkFieldType(body, 'top', 'number'),
        checkFieldType(body, 'width', 'number'),
        checkFieldType(body, 'height', 'number')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (Object.keys(body).length === 0) {
        return validationError('At least one field must be provided. Allowed fields: ' + VIEW_UPDATE_FIELDS.join(', '), reqInfo, body)
    }

    const view = findById(id)
    if (!view) {
        return { success: false, error: 'View not found: ' + id, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const updated = []
    if (body.left !== undefined) {
        app.engine.setProperty(view, 'left', body.left)
        updated.push('left')
    }
    if (body.top !== undefined) {
        app.engine.setProperty(view, 'top', body.top)
        updated.push('top')
    }
    if (body.width !== undefined) {
        app.engine.setProperty(view, 'width', body.width)
        updated.push('width')
    }
    if (body.height !== undefined) {
        app.engine.setProperty(view, 'height', body.height)
        updated.push('height')
    }

    // Re-route connected edges when node position or size changes
    if (body.left !== undefined || body.top !== undefined || body.width !== undefined || body.height !== undefined) {
        try {
            const connectedEdges = app.repository.getEdgeViewsOf(view)
            if (connectedEdges && connectedEdges.length > 0) {
                for (let i = 0; i < connectedEdges.length; i++) {
                    clearEdgeWaypoints(connectedEdges[i])
                }
            }
        } catch (e) {
            // Edge re-routing is best-effort; don't fail the view update
        }
    }

    return {
        success: true,
        message: 'Updated view (fields: ' + updated.join(', ') + ')',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeViewInfo(view)
    }
}

// --- Generic Element Update/Delete ---

function updateGenericElement(id, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, GENERIC_ELEMENT_UPDATE_FIELDS),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'documentation', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (Object.keys(body).length === 0) {
        return validationError('At least one field must be provided. Allowed fields: ' + GENERIC_ELEMENT_UPDATE_FIELDS.join(', '), reqInfo, body)
    }

    if (body.name !== undefined) {
        const nameErr = checkNonEmptyString(body, 'name')
        if (nameErr) {
            return validationError(nameErr, reqInfo, body)
        }
    }

    const elem = findById(id)
    if (!elem) {
        return { success: false, error: 'Element not found: ' + id, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const updated = []
    if (body.name !== undefined) {
        app.engine.setProperty(elem, 'name', body.name)
        updated.push('name')
    }
    if (body.documentation !== undefined) {
        app.engine.setProperty(elem, 'documentation', body.documentation)
        updated.push('documentation')
    }

    return {
        success: true,
        message: 'Updated element "' + (elem.name || id) + '" (fields: ' + updated.join(', ') + ')',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeElement(elem)
    }
}

function deleteGenericElement(id, reqInfo) {
    const elem = findById(id)
    if (!elem) {
        return { success: false, error: 'Element not found: ' + id, request: reqInfo }
    }

    // Delegate to type-specific delete functions that have referential integrity checks
    if (elem instanceof type.ERDEntity) {
        return deleteEntity(id, reqInfo)
    }
    if (elem instanceof type.ERDColumn) {
        return deleteColumn(id, reqInfo)
    }
    if (elem instanceof type.ERDDataModel) {
        return deleteDataModel(id, reqInfo)
    }
    if (elem instanceof type.ERDRelationship) {
        return deleteRelationship(id, reqInfo)
    }
    if (elem instanceof type.UMLInteraction) {
        return deleteInteraction(id, reqInfo)
    }
    if (elem instanceof type.UMLLifeline) {
        return deleteLifeline(id, reqInfo)
    }
    if (elem instanceof type.UMLMessage) {
        return deleteMessage(id, reqInfo)
    }
    if (elem instanceof type.UMLCombinedFragment) {
        return deleteCombinedFragment(id, reqInfo)
    }
    if (elem instanceof type.UMLInteractionOperand) {
        return deleteOperand(id, reqInfo)
    }
    if (elem instanceof type.UMLStateInvariant) {
        return deleteStateInvariant(id, reqInfo)
    }
    if (elem instanceof type.UMLInteractionUse) {
        return deleteInteractionUse(id, reqInfo)
    }
    if (elem instanceof type.Tag) {
        return deleteTag(id, reqInfo)
    }

    const name = elem.name || id

    // Collect associated views for deletion
    const views = []
    if (elem.ownedViews) {
        // Element is a diagram; include its owned views for deletion
        elem.ownedViews.forEach(function (v) {
            views.push(v)
        })
    } else {
        // Find views that reference this element across all diagrams
        const allDiagrams = app.repository.select('@Diagram')
        allDiagrams.forEach(function (d) {
            if (d.ownedViews) {
                d.ownedViews.forEach(function (v) {
                    if (v.model && v.model._id === id) {
                        views.push(v)
                    }
                })
            }
        })
    }

    app.engine.deleteElements([elem], views)
    return {
        success: true,
        message: 'Deleted element "' + name + '"',
        request: reqInfo,
        data: { deleted: id, name: name }
    }
}

// ============================================================
// Element Lookup (generic)
// ============================================================

function getElement(id, reqInfo) {
    const elem = findById(id)
    if (!elem) {
        return { success: false, error: 'Element not found: ' + id, request: reqInfo }
    }
    let data
    if (elem instanceof type.ERDEntity) {
        data = serializeEntity(elem)
    } else if (elem instanceof type.ERDColumn) {
        data = serializeColumn(elem)
    } else if (elem instanceof type.ERDDiagram) {
        data = serializeDiagram(elem)
    } else if (elem instanceof type.ERDRelationship) {
        data = serializeRelationship(elem)
    } else if (elem instanceof type.Tag) {
        data = serializeTag(elem)
    } else if (elem instanceof type.UMLInteraction) {
        data = serializeInteraction(elem)
    } else if (elem instanceof type.UMLSequenceDiagram) {
        data = serializeSeqDiagram(elem)
    } else if (elem instanceof type.UMLLifeline) {
        data = serializeLifeline(elem)
    } else if (elem instanceof type.UMLMessage) {
        data = serializeMessage(elem)
    } else if (elem instanceof type.UMLCombinedFragment) {
        data = serializeCombinedFragment(elem)
    } else if (elem instanceof type.UMLInteractionOperand) {
        data = serializeInteractionOperand(elem)
    } else if (elem instanceof type.UMLStateInvariant) {
        data = serializeStateInvariant(elem)
    } else if (elem instanceof type.UMLInteractionUse) {
        data = serializeInteractionUse(elem)
    } else {
        data = serializeElement(elem)
    }

    return {
        success: true,
        message: 'Retrieved element "' + (elem.name || id) + '" (type: ' + elem.constructor.name + ')',
        request: reqInfo,
        data: data
    }
}

// --- DDL Generation ---

const DDL_GENERATE_ALLOWED_FIELDS = ['path', 'dataModelId']

function generatePostgresqlDDL(body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, DDL_GENERATE_ALLOWED_FIELDS),
        checkFieldType(body, 'path', 'string'),
        checkFieldType(body, 'dataModelId', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (!body.path) {
        return validationError('Field "path" is required', reqInfo, body)
    }

    const nameErr = checkNonEmptyString(body, 'path')
    if (nameErr) {
        return validationError(nameErr, reqInfo, body)
    }

    // Validate absolute path
    if (body.path.charAt(0) !== '/' && !/^[a-zA-Z]:[/\\]/.test(body.path)) {
        return validationError('Field "path" must be an absolute path (e.g. "/Users/.../output.sql")', reqInfo, body)
    }

    // Validate dataModelId if provided
    if (body.dataModelId) {
        const dm = findById(body.dataModelId)
        if (!dm || !(dm instanceof type.ERDDataModel)) {
            return validationError('dataModelId must refer to an ERDDataModel. Not found or wrong type: ' + body.dataModelId, reqInfo, body)
        }
    }

    const reqInfoWithBody = Object.assign({}, reqInfo, { body: body })

    try {
        ddlGenerator.generate(body.path, body.dataModelId || null)

        return {
            success: true,
            message: 'DDL generated to "' + body.path + '"',
            request: reqInfoWithBody,
            data: {
                path: body.path
            }
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to generate DDL: ' + (e.message || String(e)),
            request: reqInfoWithBody
        }
    }
}

// ============================================================
// Generic Diagram API
// ============================================================

function createGenericDiagram(body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, GENERIC_DIAGRAM_CREATE_FIELDS),
        checkFieldType(body, 'type', 'string'),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'parentId', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (!body.type) {
        return validationError('Field "type" is required', reqInfo, body)
    }

    if (ALLOWED_DIAGRAM_TYPES.indexOf(body.type) === -1) {
        return validationError('Invalid diagram type "' + body.type + '". Allowed: ' + ALLOWED_DIAGRAM_TYPES.join(', '), reqInfo, body)
    }

    if (body.name !== undefined) {
        const nameErr = checkNonEmptyString(body, 'name')
        if (nameErr) {
            return validationError(nameErr, reqInfo, body)
        }
    }

    let parent
    if (body.parentId) {
        parent = findById(body.parentId)
        if (!parent) {
            return validationError('Parent not found: ' + body.parentId, reqInfo, body)
        }
    } else {
        parent = app.project.getProject()
        if (!parent) {
            return validationError('No project found. Open a project first.', reqInfo, body)
        }
    }

    try {
        const diagram = app.factory.createDiagram({
            id: body.type,
            parent: parent,
            diagramInitializer: function (d) {
                if (body.name) {
                    d.name = body.name
                }
            }
        })

        if (!diagram) {
            return { success: false, error: 'Failed to create diagram. StarUML factory returned null.', request: Object.assign({}, reqInfo, { body: body }) }
        }

        return {
            success: true,
            message: 'Created diagram "' + diagram.name + '" (' + body.type + ')',
            request: Object.assign({}, reqInfo, { body: body }),
            data: serializeGenericDiagramDetail(diagram)
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to create diagram: ' + (e.message || String(e)),
            request: Object.assign({}, reqInfo, { body: body })
        }
    }
}

function getGenericDiagram(id, reqInfo) {
    const diagram = findById(id)
    if (!diagram || !diagram.ownedViews) {
        return { success: false, error: 'Diagram not found: ' + id, request: reqInfo }
    }
    return {
        success: true,
        message: 'Retrieved diagram "' + (diagram.name || id) + '"',
        request: reqInfo,
        data: serializeGenericDiagramDetail(diagram)
    }
}

function updateGenericDiagram(id, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, ['name']),
        checkFieldType(body, 'name', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (Object.keys(body).length === 0) {
        return validationError('At least one field must be provided. Allowed fields: name', reqInfo, body)
    }

    if (body.name !== undefined) {
        const nameErr = checkNonEmptyString(body, 'name')
        if (nameErr) {
            return validationError(nameErr, reqInfo, body)
        }
    }

    const diagram = findById(id)
    if (!diagram || !diagram.ownedViews) {
        return { success: false, error: 'Diagram not found: ' + id, request: Object.assign({}, reqInfo, { body: body }) }
    }

    if (body.name !== undefined) {
        app.engine.setProperty(diagram, 'name', body.name)
    }

    return {
        success: true,
        message: 'Updated diagram "' + diagram.name + '"',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeGenericDiagramDetail(diagram)
    }
}

// Auto-created container types that should be cleaned up when empty
const AUTO_CONTAINER_TYPES = [
    'UMLModel', 'UMLStateMachine', 'UMLActivity',
    'UMLInteraction', 'UMLCollaboration',
    'FCFlowchart', 'DFDDataFlowModel',
    'BPMNProcess', 'BPMNCollaboration',
    'C4Model',
    'SysMLRequirement', 'SysMLBlock',
    'WFWireframe',
    'MMMindmap',
    'AWSModel',
    'AzureModel',
    'GCPModel'
]

function isAutoContainer(elem) {
    return elem && AUTO_CONTAINER_TYPES.indexOf(elem.constructor.name) !== -1
}

function deleteGenericDiagram(id, reqInfo) {
    const diagram = findById(id)
    if (!diagram || !diagram.ownedViews) {
        return { success: false, error: 'Diagram not found: ' + id, request: reqInfo }
    }
    const name = diagram.name
    const parent = diagram._parent
    const viewsToDelete = diagram.ownedViews.slice()
    const modelsToDelete = [diagram]
    const modelIdSet = {}
    modelIdSet[diagram._id] = true

    // Collect model objects referenced by views on this diagram
    // Only delete if the model has no views on other diagrams
    viewsToDelete.forEach(function (view) {
        if (view.model && view.model._id && !modelIdSet[view.model._id]) {
            const viewsOfModel = app.repository.getViewsOf(view.model) || []
            const viewsOnOtherDiagrams = viewsOfModel.filter(function (v) {
                return v._parent && v._parent._id !== diagram._id
            })
            if (viewsOnOtherDiagrams.length === 0) {
                modelIdSet[view.model._id] = true
                modelsToDelete.push(view.model)
            }
        }
    })

    // If parent is an auto-created container, collect the container chain for deletion
    // Only delete containers that have no other children besides what we're already deleting
    if (parent && parent._parent && isAutoContainer(parent)) {
        let container = parent
        while (container && container._parent && isAutoContainer(container)) {
            if (!modelIdSet[container._id]) {
                const otherChildren = (container.ownedElements || []).filter(function (child) {
                    return !modelIdSet[child._id]
                })
                if (otherChildren.length === 0) {
                    modelIdSet[container._id] = true
                    modelsToDelete.push(container)
                } else {
                    break
                }
            }
            container = container._parent
        }
    }

    app.engine.deleteElements(modelsToDelete, viewsToDelete)

    return {
        success: true,
        message: 'Deleted diagram "' + name + '"',
        request: reqInfo,
        data: { deleted: id, name: name }
    }
}

function serializeGenericDiagramDetail(diagram) {
    if (!diagram) {
        return null
    }
    return {
        _id: diagram._id,
        _type: diagram.constructor.name,
        name: diagram.name || '',
        _parentId: diagram._parent ? diagram._parent._id : null,
        ownedViewsCount: diagram.ownedViews ? diagram.ownedViews.length : 0
    }
}

function getDiagramElements(diagramId, reqInfo) {
    const diagram = findById(diagramId)
    if (!diagram || !diagram.ownedViews) {
        return { success: false, error: 'Diagram not found: ' + diagramId, request: reqInfo }
    }
    const elements = diagram.ownedViews.map(function (view) {
        const result = {
            _id: view._id,
            _type: view.constructor.name
        }
        if (view.model) {
            result.modelId = view.model._id
            result.modelType = view.model.constructor.name
            result.name = view.model.name || ''
        }
        if (view.left !== undefined) {
            result.left = view.left
        }
        if (view.top !== undefined) {
            result.top = view.top
        }
        if (view.width !== undefined) {
            result.width = view.width
        }
        if (view.height !== undefined) {
            result.height = view.height
        }
        return result
    })
    return {
        success: true,
        message: 'Retrieved ' + elements.length + ' element(s) from diagram "' + (diagram.name || diagramId) + '"',
        request: reqInfo,
        data: elements
    }
}

function createDiagramElement(diagramId, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, GENERIC_ELEMENT_CREATE_FIELDS),
        checkFieldType(body, 'type', 'string'),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'x1', 'number'),
        checkFieldType(body, 'y1', 'number'),
        checkFieldType(body, 'x2', 'number'),
        checkFieldType(body, 'y2', 'number'),
        checkFieldType(body, 'pseudostateKind', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (!body.type) {
        return validationError('Field "type" is required', reqInfo, body)
    }

    if (ALLOWED_NODE_TYPES.indexOf(body.type) === -1) {
        return validationError('Invalid element type "' + body.type + '". Allowed: ' + ALLOWED_NODE_TYPES.join(', '), reqInfo, body)
    }

    if (body.pseudostateKind !== undefined && VALID_PSEUDOSTATE_KINDS.indexOf(body.pseudostateKind) === -1) {
        return validationError('Invalid pseudostateKind "' + body.pseudostateKind + '". Allowed: ' + VALID_PSEUDOSTATE_KINDS.join(', '), reqInfo, body)
    }

    const diagram = findById(diagramId)
    if (!diagram || !diagram.ownedViews) {
        return { success: false, error: 'Diagram not found: ' + diagramId, request: Object.assign({}, reqInfo, { body: body }) }
    }

    // Determine parent model based on diagram type
    let parent = diagram._parent
    if (!parent) {
        return validationError('Diagram has no parent model', Object.assign({}, reqInfo, { body: body }))
    }

    // Some factory functions (e.g. SysMLConstraintParameter's parameterFn) expect
    // the diagram itself as parent, not diagram._parent.
    if (DIAGRAM_AS_PARENT_TYPES.indexOf(body.type) !== -1) {
        parent = diagram
    }

    const x1 = body.x1 !== undefined ? body.x1 : 100
    const y1 = body.y1 !== undefined ? body.y1 : 100
    const x2 = body.x2 !== undefined ? body.x2 : 200
    const y2 = body.y2 !== undefined ? body.y2 : 180

    // Build factory options
    const factoryOpts = {
        id: body.type,
        parent: parent,
        diagram: diagram,
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2
    }

    // attachToViewId: used for elements that require a tailView (e.g., UMLTimeTick, UMLTimeConstraint)
    if (body.attachToViewId) {
        const attachView = app.repository.get(body.attachToViewId)
        if (!attachView) {
            return validationError('attachToViewId not found: ' + body.attachToViewId, reqInfo, body)
        }
        factoryOpts.tailView = attachView
        if (attachView.model) {
            factoryOpts.tailModel = attachView.model
            // Frame views (UMLFrameView, UMLTimingFrameView, etc.) have model pointing
            // to the diagram itself. The parent should be diagram._parent (the owning
            // Interaction/Block/etc.), not the diagram.
            if (attachView.model === diagram && diagram._parent) {
                factoryOpts.parent = diagram._parent
            } else {
                factoryOpts.parent = attachView.model
            }
        }
    }

    // Auto-attach to timing frame when creating elements on a UMLTimingDiagram
    // without an explicit attachToViewId.
    if (!body.attachToViewId && diagram.constructor.name === 'UMLTimingDiagram') {
        const frameView = diagram.ownedViews.filter(function (v) {
            return v.constructor.name === 'UMLTimingFrameView'
        })[0]
        if (frameView) {
            factoryOpts.tailView = frameView
            factoryOpts.tailModel = frameView.model
            factoryOpts.parent = diagram._parent
        }
    }

    // Some factory functions (e.g. UMLTimeSegment) access options.editor.canvas.
    // Provide the current diagram editor if available.
    const editor = app.diagrams ? app.diagrams.getEditor() : null
    if (editor) {
        factoryOpts.editor = editor
    }

    try {
        const view = app.factory.createModelAndView(factoryOpts)

        const model = view.model || view

        if (body.name && model && typeof model._id === 'string') {
            app.engine.setProperty(model, 'name', body.name)
        }

        if (body.pseudostateKind && model && model.constructor.name === 'UMLPseudostate') {
            app.engine.setProperty(model, 'kind', body.pseudostateKind)
        }

        const data = {
            _id: view._id,
            _type: view.constructor.name
        }
        if (model && model._id) {
            data.modelId = model._id
            data.modelType = model.constructor.name
            data.name = model.name || ''
        }
        if (view.left !== undefined) {
            data.left = view.left
        }
        if (view.top !== undefined) {
            data.top = view.top
        }
        if (view.width !== undefined) {
            data.width = view.width
        }
        if (view.height !== undefined) {
            data.height = view.height
        }

        // Auto-expand frame to contain newly created element
        autoExpandFrame(diagram)

        return {
            success: true,
            message: 'Created element "' + (model ? model.name || body.type : body.type) + '" on diagram "' + (diagram.name || diagramId) + '"',
            request: Object.assign({}, reqInfo, { body: body }),
            data: data
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to create element: ' + (e.message || String(e)),
            request: Object.assign({}, reqInfo, { body: body })
        }
    }
}

function createDiagramRelation(diagramId, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, GENERIC_RELATION_CREATE_FIELDS),
        checkFieldType(body, 'type', 'string'),
        checkFieldType(body, 'sourceId', 'string'),
        checkFieldType(body, 'targetId', 'string'),
        checkFieldType(body, 'name', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (!body.type) {
        return validationError('Field "type" is required', reqInfo, body)
    }
    if (!body.sourceId) {
        return validationError('Field "sourceId" is required', reqInfo, body)
    }
    if (!body.targetId) {
        return validationError('Field "targetId" is required', reqInfo, body)
    }

    if (ALLOWED_RELATION_TYPES.indexOf(body.type) === -1) {
        return validationError('Invalid relation type "' + body.type + '". Allowed: ' + ALLOWED_RELATION_TYPES.join(', '), reqInfo, body)
    }

    const diagram = findById(diagramId)
    if (!diagram || !diagram.ownedViews) {
        return { success: false, error: 'Diagram not found: ' + diagramId, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const tailView = findViewOnDiagramByAnyId(diagram, body.sourceId)
    if (!tailView) {
        return validationError('Source element not found on diagram: ' + body.sourceId, reqInfo, body)
    }

    const headView = findViewOnDiagramByAnyId(diagram, body.targetId)
    if (!headView) {
        return validationError('Target element not found on diagram: ' + body.targetId, reqInfo, body)
    }

    let parent = diagram._parent
    if (!parent) {
        return validationError('Diagram has no parent model', Object.assign({}, reqInfo, { body: body }))
    }

    try {
        const options = {
            id: body.type,
            parent: parent,
            diagram: diagram,
            tailView: tailView,
            headView: headView
        }
        // Some relations need tailModel/headModel explicitly
        if (tailView.model) {
            options.tailModel = tailView.model
        }
        if (headView.model) {
            options.headModel = headView.model
        }
        const view = app.factory.createModelAndView(options)

        const model = view.model || view

        if (body.name && model && typeof model._id === 'string') {
            app.engine.setProperty(model, 'name', body.name)
        }

        const data = {
            _id: view._id,
            _type: view.constructor.name
        }
        if (model && model._id) {
            data.modelId = model._id
            data.modelType = model.constructor.name
            data.name = model.name || ''
        }

        // Auto-expand frame to contain newly created relation
        autoExpandFrame(diagram)

        return {
            success: true,
            message: 'Created relation "' + (model ? model.name || body.type : body.type) + '" on diagram "' + (diagram.name || diagramId) + '"',
            request: Object.assign({}, reqInfo, { body: body }),
            data: data
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to create relation: ' + (e.message || String(e)),
            request: Object.assign({}, reqInfo, { body: body })
        }
    }
}

function createChildElement(parentId, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, GENERIC_CHILD_CREATE_FIELDS),
        checkFieldType(body, 'type', 'string'),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'field', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (!body.type) {
        return validationError('Field "type" is required', reqInfo, body)
    }

    if (ALLOWED_CHILD_TYPES.indexOf(body.type) === -1) {
        return validationError('Invalid child type "' + body.type + '". Allowed: ' + ALLOWED_CHILD_TYPES.join(', '), reqInfo, body)
    }

    const parent = findById(parentId)
    if (!parent) {
        return { success: false, error: 'Parent element not found: ' + parentId, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const field = body.field || CHILD_TYPE_DEFAULT_FIELDS[body.type] || null

    const options = {
        id: body.type,
        parent: parent
    }
    if (field) {
        options.field = field
    }

    try {
        const model = app.factory.createModel(options)

        if (body.name && model) {
            app.engine.setProperty(model, 'name', body.name)
        }

        return {
            success: true,
            message: 'Created child "' + (model ? model.name || body.type : body.type) + '" under "' + (parent.name || parentId) + '"',
            request: Object.assign({}, reqInfo, { body: body }),
            data: serializeElement(model)
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to create child: ' + (e.message || String(e)),
            request: Object.assign({}, reqInfo, { body: body })
        }
    }
}

function updateViewStyle(id, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, STYLE_ALLOWED_FIELDS),
        checkFieldType(body, 'fillColor', 'string'),
        checkFieldType(body, 'lineColor', 'string'),
        checkFieldType(body, 'fontColor', 'string'),
        checkFieldType(body, 'fontFace', 'string'),
        checkFieldType(body, 'fontSize', 'number'),
        checkFieldType(body, 'fontStyle', 'number'),
        checkFieldType(body, 'lineStyle', 'number'),
        checkFieldType(body, 'showShadow', 'boolean'),
        checkFieldType(body, 'autoResize', 'boolean'),
        checkFieldType(body, 'stereotypeDisplay', 'string'),
        checkFieldType(body, 'suppressAttributes', 'boolean'),
        checkFieldType(body, 'suppressOperations', 'boolean'),
        checkFieldType(body, 'suppressReceptions', 'boolean'),
        checkFieldType(body, 'suppressProperties', 'boolean')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (Object.keys(body).length === 0) {
        return validationError('At least one field must be provided. Allowed fields: ' + STYLE_ALLOWED_FIELDS.join(', '), reqInfo, body)
    }

    const view = findById(id)
    if (!view) {
        return { success: false, error: 'View not found: ' + id, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const updated = []

    if (body.fillColor !== undefined) {
        app.engine.setProperty(view, 'fillColor', body.fillColor)
        updated.push('fillColor')
    }
    if (body.lineColor !== undefined) {
        app.engine.setProperty(view, 'lineColor', body.lineColor)
        updated.push('lineColor')
    }
    if (body.fontColor !== undefined) {
        app.engine.setProperty(view, 'fontColor', body.fontColor)
        updated.push('fontColor')
    }
    if (body.showShadow !== undefined) {
        app.engine.setProperty(view, 'showShadow', body.showShadow)
        updated.push('showShadow')
    }
    if (body.lineStyle !== undefined) {
        app.engine.setProperty(view, 'lineStyle', body.lineStyle)
        updated.push('lineStyle')
    }

    // Font properties: set together via Font object if any font field is provided
    if (body.fontFace !== undefined || body.fontSize !== undefined || body.fontStyle !== undefined) {
        const currentFont = view.font || {}
        const face = body.fontFace !== undefined ? body.fontFace : (currentFont.face || 'Arial')
        const size = body.fontSize !== undefined ? body.fontSize : (currentFont.size || 13)
        const style = body.fontStyle !== undefined ? body.fontStyle : (currentFont.style || 0)
        app.engine.setProperty(view, 'font', face + ';' + size + ';' + style)
        if (body.fontFace !== undefined) updated.push('fontFace')
        if (body.fontSize !== undefined) updated.push('fontSize')
        if (body.fontStyle !== undefined) updated.push('fontStyle')
    }

    // Display control properties
    if (body.autoResize !== undefined) {
        app.engine.setProperty(view, 'autoResize', body.autoResize)
        updated.push('autoResize')
    }
    if (body.stereotypeDisplay !== undefined) {
        app.engine.setProperty(view, 'stereotypeDisplay', body.stereotypeDisplay)
        updated.push('stereotypeDisplay')
    }
    if (body.suppressAttributes !== undefined) {
        app.engine.setProperty(view, 'suppressAttributes', body.suppressAttributes)
        updated.push('suppressAttributes')
    }
    if (body.suppressOperations !== undefined) {
        app.engine.setProperty(view, 'suppressOperations', body.suppressOperations)
        updated.push('suppressOperations')
    }
    if (body.suppressReceptions !== undefined) {
        app.engine.setProperty(view, 'suppressReceptions', body.suppressReceptions)
        updated.push('suppressReceptions')
    }
    if (body.suppressProperties !== undefined) {
        app.engine.setProperty(view, 'suppressProperties', body.suppressProperties)
        updated.push('suppressProperties')
    }

    return {
        success: true,
        message: 'Updated style (fields: ' + updated.join(', ') + ')',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeViewInfo(view)
    }
}

function undoAction(reqInfo) {
    try {
        app.repository.undo()
        return {
            success: true,
            message: 'Undo executed',
            request: reqInfo
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to undo: ' + (e.message || String(e)),
            request: reqInfo
        }
    }
}

function redoAction(reqInfo) {
    try {
        app.repository.redo()
        return {
            success: true,
            message: 'Redo executed',
            request: reqInfo
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to redo: ' + (e.message || String(e)),
            request: reqInfo
        }
    }
}

function searchElements(query, reqInfo) {
    const allowedParams = ['keyword', 'type']
    const unknownParams = Object.keys(query).filter(function (k) {
        return allowedParams.indexOf(k) === -1
    })
    if (unknownParams.length > 0) {
        return validationError('Unknown query parameter(s): ' + unknownParams.join(', ') + '. Allowed: ' + allowedParams.join(', '), reqInfo)
    }

    if (!query.keyword) {
        return validationError('Query parameter "keyword" is required', reqInfo)
    }

    let results = app.repository.search(query.keyword)

    if (query.type) {
        results = results.filter(function (elem) {
            return elem.constructor.name === query.type
        })
    }

    const data = results.map(function (elem) {
        return {
            _id: elem._id,
            _type: elem.constructor.name,
            name: elem.name || '',
            _parentId: elem._parent ? elem._parent._id : null
        }
    })

    return {
        success: true,
        message: 'Found ' + data.length + ' element(s)',
        request: reqInfo,
        data: data
    }
}

function layoutDiagram(diagramId, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, LAYOUT_ALLOWED_FIELDS),
        checkFieldType(body, 'direction', 'string'),
        checkFieldType(body, 'separations', 'object'),
        checkFieldType(body, 'edgeLineStyle', 'number')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    const direction = body.direction || 'TB'
    if (VALID_LAYOUT_DIRECTIONS.indexOf(direction) === -1) {
        return validationError('Invalid direction "' + direction + '". Allowed: ' + VALID_LAYOUT_DIRECTIONS.join(', '), reqInfo, body)
    }

    const diagram = findById(diagramId)
    if (!diagram || !diagram.ownedViews) {
        return { success: false, error: 'Diagram not found: ' + diagramId, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const separations = body.separations || { node: 20, edge: 10, rank: 50 }
    const edgeLineStyle = body.edgeLineStyle !== undefined ? body.edgeLineStyle : 1

    try {
        // Certain diagram types have spatial containment semantics (groups
        // containing services, lifelines containing waveforms) that the generic
        // dagre hierarchical layout cannot handle — it treats all nodes as
        // independent and destroys the containment. Skip dagre for these types.
        const skipDagreTypes = ['UMLTimingDiagram', 'UMLUseCaseDiagram', 'AWSDiagram', 'AzureDiagram', 'GCPDiagram']
        const skipDagre = skipDagreTypes.indexOf(diagram.constructor.name) !== -1

        if (!skipDagre) {
            const editor = app.diagrams.getEditor()
            app.engine.layoutDiagram(editor, diagram, direction, separations, edgeLineStyle)
        }

        // Auto-resize frame to contain all views after layout
        fitFrameToViews(diagram)

        return {
            success: true,
            message: 'Layout applied to diagram "' + (diagram.name || diagramId) + '" (direction: ' + direction + ')',
            request: Object.assign({}, reqInfo, { body: body }),
            data: serializeGenericDiagramDetail(diagram)
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to layout diagram: ' + (e.message || String(e)),
            request: Object.assign({}, reqInfo, { body: body })
        }
    }
}

function importProject(body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, IMPORT_ALLOWED_FIELDS),
        checkFieldType(body, 'path', 'string'),
        checkFieldType(body, 'parentId', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (!body.path) {
        return validationError('Field "path" is required', reqInfo, body)
    }

    const pathErr = checkNonEmptyString(body, 'path')
    if (pathErr) {
        return validationError(pathErr, reqInfo, body)
    }

    if (body.path.charAt(0) !== '/' && !/^[a-zA-Z]:[/\\]/.test(body.path)) {
        return validationError('Field "path" must be an absolute path', reqInfo, body)
    }

    let parent
    if (body.parentId) {
        parent = findById(body.parentId)
        if (!parent) {
            return validationError('Parent not found: ' + body.parentId, reqInfo, body)
        }
    } else {
        parent = app.project.getProject()
        if (!parent) {
            return validationError('No project found. Open a project first.', reqInfo, body)
        }
    }

    try {
        app.project.importFromFile(parent, body.path)
        return {
            success: true,
            message: 'Imported from "' + body.path + '"',
            request: Object.assign({}, reqInfo, { body: body }),
            data: { path: body.path }
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to import: ' + (e.message || String(e)),
            request: Object.assign({}, reqInfo, { body: body })
        }
    }
}

// ============================================================
// Phase 3: New API Endpoints
// ============================================================

// --- 3B. Export All Diagrams ---

const EXPORT_ALL_ALLOWED_FIELDS = ['path', 'format']

function exportAllDiagrams(body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, EXPORT_ALL_ALLOWED_FIELDS),
        checkFieldType(body, 'path', 'string'),
        checkFieldType(body, 'format', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (!body.path) {
        return validationError('Field "path" is required', reqInfo, body)
    }

    const pathErr = checkNonEmptyString(body, 'path')
    if (pathErr) {
        return validationError(pathErr, reqInfo, body)
    }

    if (body.path.charAt(0) !== '/' && !/^[a-zA-Z]:[/\\]/.test(body.path)) {
        return validationError('Field "path" must be an absolute path', reqInfo, body)
    }

    const format = (body.format || 'png').toLowerCase()
    if (VALID_EXPORT_FORMATS.indexOf(format) === -1) {
        return validationError('Invalid format "' + body.format + '". Allowed: ' + VALID_EXPORT_FORMATS.join(', '), reqInfo, body)
    }

    const diagrams = app.repository.select('@Diagram')
    if (diagrams.length === 0) {
        return validationError('No diagrams found in project', reqInfo, body)
    }

    try {
        const nodePath = require('path')
        const appPath = app.getAppPath()
        const diagramExport = require(nodePath.join(appPath, 'src', 'engine', 'diagram-export'))

        const exported = []
        diagrams.forEach(function (diagram) {
            const fileName = (diagram.name || diagram._id).replace(/[/\\:*?"<>|]/g, '_')
            const filePath = nodePath.join(body.path, fileName + '.' + format)
            if (format === 'pdf') {
                diagramExport.exportToPDF([diagram], filePath, { showName: true })
            } else if (format === 'svg') {
                diagramExport.exportToSVG(diagram, filePath)
            } else if (format === 'jpeg') {
                diagramExport.exportToJPEG(diagram, filePath)
            } else {
                diagramExport.exportToPNG(diagram, filePath)
            }
            exported.push({ name: diagram.name, path: filePath })
        })

        return {
            success: true,
            message: 'Exported ' + exported.length + ' diagram(s) to "' + body.path + '"',
            request: Object.assign({}, reqInfo, { body: body }),
            data: { count: exported.length, format: format, files: exported }
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to export diagrams: ' + (e.message || String(e)),
            request: Object.assign({}, reqInfo, { body: body })
        }
    }
}

// --- 3C. Project Operations ---

function newProject(reqInfo) {
    try {
        app.commands.execute('project:new')
        return {
            success: true,
            message: 'Created new project',
            request: reqInfo
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to create new project: ' + (e.message || String(e)),
            request: reqInfo
        }
    }
}

function closeProject(reqInfo) {
    try {
        app.commands.execute('project:close')
        return {
            success: true,
            message: 'Closed project',
            request: reqInfo
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to close project: ' + (e.message || String(e)),
            request: reqInfo
        }
    }
}

const FRAGMENT_EXPORT_ALLOWED_FIELDS = ['elementId', 'path']

function exportFragment(body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, FRAGMENT_EXPORT_ALLOWED_FIELDS),
        checkFieldType(body, 'elementId', 'string'),
        checkFieldType(body, 'path', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (!body.elementId) {
        return validationError('Field "elementId" is required', reqInfo, body)
    }
    if (!body.path) {
        return validationError('Field "path" is required', reqInfo, body)
    }

    if (body.path.charAt(0) !== '/' && !/^[a-zA-Z]:[/\\]/.test(body.path)) {
        return validationError('Field "path" must be an absolute path', reqInfo, body)
    }

    const element = findById(body.elementId)
    if (!element) {
        return validationError('Element not found: ' + body.elementId, reqInfo, body)
    }

    try {
        app.project.exportToFile(element, body.path)
        return {
            success: true,
            message: 'Exported element "' + (element.name || body.elementId) + '" to "' + body.path + '"',
            request: Object.assign({}, reqInfo, { body: body }),
            data: { elementId: body.elementId, path: body.path }
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to export fragment: ' + (e.message || String(e)),
            request: Object.assign({}, reqInfo, { body: body })
        }
    }
}

// --- 3D. Create View Of Existing Model ---

const CREATE_VIEW_OF_ALLOWED_FIELDS = ['modelId', 'x', 'y']

function createViewOf(diagramId, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, CREATE_VIEW_OF_ALLOWED_FIELDS),
        checkFieldType(body, 'modelId', 'string'),
        checkFieldType(body, 'x', 'number'),
        checkFieldType(body, 'y', 'number')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (!body.modelId) {
        return validationError('Field "modelId" is required', reqInfo, body)
    }

    const diagram = findById(diagramId)
    if (!diagram || !diagram.ownedViews) {
        return { success: false, error: 'Diagram not found: ' + diagramId, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const model = findById(body.modelId)
    if (!model) {
        return validationError('Model not found: ' + body.modelId, reqInfo, body)
    }

    try {
        // Ensure the target diagram is the active diagram.
        // StarUML's createViewOf internally uses app.diagrams.getEditor()
        // which returns the editor for the currently active diagram.
        // Without this, views get placed on whichever diagram is currently open.
        app.diagrams.setCurrentDiagram(diagram)

        const view = app.factory.createViewOf({
            model: model,
            diagram: diagram,
            x: body.x !== undefined ? body.x : 100,
            y: body.y !== undefined ? body.y : 100
        })

        return {
            success: true,
            message: 'Created view of "' + (model.name || body.modelId) + '" on diagram "' + (diagram.name || diagramId) + '"',
            request: Object.assign({}, reqInfo, { body: body }),
            data: serializeViewInfo(view)
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to create view: ' + (e.message || String(e)),
            request: Object.assign({}, reqInfo, { body: body })
        }
    }
}

// --- 3E. Element Relationships ---

function getElementRelationships(id, reqInfo) {
    const element = findById(id)
    if (!element) {
        return { success: false, error: 'Element not found: ' + id, request: reqInfo }
    }

    try {
        const rels = app.repository.getRelationshipsOf(element)
        const data = rels.map(function (rel) {
            const result = {
                _id: rel._id,
                _type: rel.constructor.name,
                name: rel.name || ''
            }
            if (rel.source) {
                result.sourceId = rel.source._id
            } else if (rel.end1 && rel.end1.reference) {
                result.sourceId = rel.end1.reference._id
            }
            if (rel.target) {
                result.targetId = rel.target._id
            } else if (rel.end2 && rel.end2.reference) {
                result.targetId = rel.end2.reference._id
            }
            return result
        })

        return {
            success: true,
            message: 'Retrieved ' + data.length + ' relationship(s) for "' + (element.name || id) + '"',
            request: reqInfo,
            data: data
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to get relationships: ' + (e.message || String(e)),
            request: reqInfo
        }
    }
}

// --- 3F. Model Views ---

function getElementViews(id, reqInfo) {
    const element = findById(id)
    if (!element) {
        return { success: false, error: 'Element not found: ' + id, request: reqInfo }
    }

    try {
        const views = app.repository.getViewsOf(element)
        const data = views.map(function (view) {
            const result = {
                viewId: view._id,
                viewType: view.constructor.name
            }
            if (view._parent) {
                result.diagramId = view._parent._id
                result.diagramName = view._parent.name || ''
            }
            return result
        })

        return {
            success: true,
            message: 'Retrieved ' + data.length + ' view(s) for "' + (element.name || id) + '"',
            request: reqInfo,
            data: data
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to get views: ' + (e.message || String(e)),
            request: reqInfo
        }
    }
}

// --- 3G. Edge Reconnect ---

const RECONNECT_ALLOWED_FIELDS = ['newSourceId', 'newTargetId']

function reconnectEdge(id, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, RECONNECT_ALLOWED_FIELDS),
        checkFieldType(body, 'newSourceId', 'string'),
        checkFieldType(body, 'newTargetId', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (!body.newSourceId && !body.newTargetId) {
        return validationError('At least one of "newSourceId" or "newTargetId" is required', reqInfo, body)
    }

    const view = findById(id)
    if (!view) {
        return { success: false, error: 'View not found: ' + id, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const diagram = view._parent
    if (!diagram || !diagram.ownedViews) {
        return validationError('View is not on a diagram', reqInfo, body)
    }

    try {
        const currentTailView = view.tail
        const currentHeadView = view.head
        const newTailView = body.newSourceId ? findViewOnDiagramByAnyId(diagram, body.newSourceId) : currentTailView
        const newHeadView = body.newTargetId ? findViewOnDiagramByAnyId(diagram, body.newTargetId) : currentHeadView

        if (body.newSourceId && !newTailView) {
            return validationError('New source not found on diagram: ' + body.newSourceId, reqInfo, body)
        }
        if (body.newTargetId && !newHeadView) {
            return validationError('New target not found on diagram: ' + body.newTargetId, reqInfo, body)
        }

        const newTailModel = newTailView.model || null
        const newHeadModel = newHeadView.model || null

        // Update model references (different relationship types use different properties)
        if (view.model) {
            if (body.newSourceId && newTailModel) {
                if (view.model.end1 && typeof view.model.end1.reference !== 'undefined') {
                    app.engine.setProperty(view.model.end1, 'reference', newTailModel)
                } else if (typeof view.model.source !== 'undefined') {
                    app.engine.setProperty(view.model, 'source', newTailModel)
                }
            }
            if (body.newTargetId && newHeadModel) {
                if (view.model.end2 && typeof view.model.end2.reference !== 'undefined') {
                    app.engine.setProperty(view.model.end2, 'reference', newHeadModel)
                } else if (typeof view.model.target !== 'undefined') {
                    app.engine.setProperty(view.model, 'target', newHeadModel)
                }
            }
        }

        // Update view connections
        if (body.newSourceId) {
            app.engine.setProperty(view, 'tail', newTailView)
        }
        if (body.newTargetId) {
            app.engine.setProperty(view, 'head', newHeadView)
        }

        // Clear stale waypoints and re-route edge between new endpoints
        clearEdgeWaypoints(view)

        return {
            success: true,
            message: 'Reconnected edge',
            request: Object.assign({}, reqInfo, { body: body }),
            data: serializeViewInfo(view)
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to reconnect edge: ' + (e.message || String(e)),
            request: Object.assign({}, reqInfo, { body: body })
        }
    }
}

// --- 3H. Element Relocate ---

const RELOCATE_ALLOWED_FIELDS = ['newParentId', 'field']

function relocateElement(id, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, RELOCATE_ALLOWED_FIELDS),
        checkFieldType(body, 'newParentId', 'string'),
        checkFieldType(body, 'field', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (!body.newParentId) {
        return validationError('Field "newParentId" is required', reqInfo, body)
    }

    const element = findById(id)
    if (!element) {
        return { success: false, error: 'Element not found: ' + id, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const newParent = findById(body.newParentId)
    if (!newParent) {
        return validationError('New parent not found: ' + body.newParentId, reqInfo, body)
    }

    try {
        const field = body.field || 'ownedElements'
        app.engine.relocate(element, newParent, field)

        return {
            success: true,
            message: 'Relocated "' + (element.name || id) + '" to "' + (newParent.name || body.newParentId) + '"',
            request: Object.assign({}, reqInfo, { body: body }),
            data: serializeElement(element)
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to relocate element: ' + (e.message || String(e)),
            request: Object.assign({}, reqInfo, { body: body })
        }
    }
}

// --- 3I. Open Diagram ---

function openDiagram(id, reqInfo) {
    const diagram = findById(id)
    if (!diagram || !diagram.ownedViews) {
        return { success: false, error: 'Diagram not found: ' + id, request: reqInfo }
    }

    try {
        app.modelExplorer.select(diagram)
        app.diagrams.setCurrentDiagram(diagram)
        return {
            success: true,
            message: 'Opened diagram "' + (diagram.name || id) + '"',
            request: reqInfo,
            data: serializeGenericDiagramDetail(diagram)
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to open diagram: ' + (e.message || String(e)),
            request: reqInfo
        }
    }
}

// --- 3J. Model Validation ---

function validateModel(reqInfo) {
    try {
        const results = app.commands.execute('model:validate')
        const data = []
        if (Array.isArray(results)) {
            results.forEach(function (r) {
                data.push({
                    elementId: r.element ? r.element._id : null,
                    elementName: r.element ? r.element.name || '' : '',
                    message: r.message || '',
                    severity: r.severity || 'error'
                })
            })
        }

        return {
            success: true,
            message: 'Validation completed with ' + data.length + ' result(s)',
            request: reqInfo,
            data: data
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to validate: ' + (e.message || String(e)),
            request: reqInfo
        }
    }
}

// --- 3K. Diagram Zoom ---

const ZOOM_ALLOWED_FIELDS = ['level']

function setDiagramZoom(id, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, ZOOM_ALLOWED_FIELDS),
        checkFieldType(body, 'level', 'number')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (body.level === undefined) {
        return validationError('Field "level" is required', reqInfo, body)
    }

    if (body.level < 0.1 || body.level > 10) {
        return validationError('Field "level" must be between 0.1 and 10', reqInfo, body)
    }

    const diagram = findById(id)
    if (!diagram || !diagram.ownedViews) {
        return { success: false, error: 'Diagram not found: ' + id, request: Object.assign({}, reqInfo, { body: body }) }
    }

    try {
        // Ensure the target diagram is active before setting zoom
        app.diagrams.setCurrentDiagram(diagram)
        app.diagrams.setZoomLevel(body.level)
        return {
            success: true,
            message: 'Set zoom level to ' + body.level + ' on diagram "' + (diagram.name || id) + '"',
            request: Object.assign({}, reqInfo, { body: body }),
            data: { level: body.level }
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to set zoom level: ' + (e.message || String(e)),
            request: Object.assign({}, reqInfo, { body: body })
        }
    }
}

// --- #6. Alignment / Distribution ---

const VALID_ALIGNMENT_ACTIONS = [
    'align-left', 'align-right', 'align-center',
    'align-top', 'align-bottom', 'align-middle',
    'space-equally-horizontally', 'space-equally-vertically',
    'set-width-equally', 'set-height-equally', 'set-size-equally',
    'send-to-back', 'bring-to-front'
]
const ALIGN_ALLOWED_FIELDS = ['viewIds', 'action']

function alignViews(body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, ALIGN_ALLOWED_FIELDS),
        checkFieldType(body, 'action', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (!body.action) {
        return validationError('Field "action" is required. Allowed: ' + VALID_ALIGNMENT_ACTIONS.join(', '), reqInfo, body)
    }
    if (VALID_ALIGNMENT_ACTIONS.indexOf(body.action) === -1) {
        return validationError('Invalid action "' + body.action + '". Allowed: ' + VALID_ALIGNMENT_ACTIONS.join(', '), reqInfo, body)
    }
    if (!body.viewIds || !Array.isArray(body.viewIds) || body.viewIds.length < 2) {
        return validationError('Field "viewIds" is required and must be an array of at least 2 view IDs', reqInfo, body)
    }

    // Resolve views
    const views = []
    for (let i = 0; i < body.viewIds.length; i++) {
        const v = app.repository.get(body.viewIds[i])
        if (!v) {
            return validationError('View not found: ' + body.viewIds[i], reqInfo, body)
        }
        views.push(v)
    }

    try {
        // Set selection to the specified views, execute alignment command, then clear
        app.selections.deselectAll()
        app.selections.selectViews(views)
        app.commands.execute('alignment:' + body.action)
        app.selections.deselectAll()

        return {
            success: true,
            message: 'Executed alignment action "' + body.action + '" on ' + views.length + ' views',
            request: Object.assign({}, reqInfo, { body: body }),
            data: { action: body.action, viewCount: views.length }
        }
    } catch (e) {
        app.selections.deselectAll()
        return {
            success: false,
            error: 'Failed to execute alignment: ' + (e.message || String(e)),
            request: Object.assign({}, reqInfo, { body: body })
        }
    }
}

// --- #7. Mermaid Import ---

const MERMAID_ALLOWED_FIELDS = ['code', 'parentId']
const VALID_MERMAID_TYPES = ['classDiagram', 'sequenceDiagram', 'flowchart', 'erDiagram', 'mindmap', 'requirementDiagram', 'stateDiagram']

function importMermaid(body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, MERMAID_ALLOWED_FIELDS),
        checkFieldType(body, 'code', 'string'),
        checkFieldType(body, 'parentId', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (!body.code || body.code.trim() === '') {
        return validationError('Field "code" is required (Mermaid syntax text)', reqInfo, body)
    }

    let base = null
    if (body.parentId) {
        base = app.repository.get(body.parentId)
        if (!base) {
            return validationError('Parent element not found: ' + body.parentId, reqInfo, body)
        }
    } else {
        base = app.project.getProject()
    }

    try {
        app.commands.execute('mermaid:generate-diagram', body.code, base)
        return {
            success: true,
            message: 'Mermaid diagram generated successfully',
            request: Object.assign({}, reqInfo, { body: { code: body.code.substring(0, 100) + '...' } }),
            data: { supportedTypes: VALID_MERMAID_TYPES }
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to generate Mermaid diagram: ' + (e.message || String(e)),
            request: Object.assign({}, reqInfo, { body: { code: body.code.substring(0, 100) + '...' } })
        }
    }
}

// --- #8. Diagram Generator ---

const VALID_GENERATOR_TYPES = ['overview', 'overview-expanded', 'type-hierarchy', 'package-structure']
const GENERATOR_ALLOWED_FIELDS = ['type', 'parentId']

function generateDiagram(body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, GENERATOR_ALLOWED_FIELDS),
        checkFieldType(body, 'type', 'string'),
        checkFieldType(body, 'parentId', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (!body.type) {
        return validationError('Field "type" is required. Allowed: ' + VALID_GENERATOR_TYPES.join(', '), reqInfo, body)
    }
    if (VALID_GENERATOR_TYPES.indexOf(body.type) === -1) {
        return validationError('Invalid generator type "' + body.type + '". Allowed: ' + VALID_GENERATOR_TYPES.join(', '), reqInfo, body)
    }

    let base = null
    if (body.parentId) {
        base = app.repository.get(body.parentId)
        if (!base) {
            return validationError('Parent element not found: ' + body.parentId, reqInfo, body)
        }
    } else {
        base = app.project.getProject()
    }

    try {
        app.commands.execute('diagram-generator:' + body.type, base, true)
        return {
            success: true,
            message: 'Generated "' + body.type + '" diagram',
            request: Object.assign({}, reqInfo, { body: body }),
            data: { type: body.type }
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to generate diagram: ' + (e.message || String(e)),
            request: Object.assign({}, reqInfo, { body: body })
        }
    }
}

// --- #9. Move Up / Move Down (Reorder) ---

const REORDER_ALLOWED_FIELDS = ['direction']
const VALID_REORDER_DIRECTIONS = ['up', 'down']

function reorderElement(id, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, REORDER_ALLOWED_FIELDS),
        checkFieldType(body, 'direction', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (!body.direction) {
        return validationError('Field "direction" is required. Allowed: ' + VALID_REORDER_DIRECTIONS.join(', '), reqInfo, body)
    }
    if (VALID_REORDER_DIRECTIONS.indexOf(body.direction) === -1) {
        return validationError('Invalid direction "' + body.direction + '". Allowed: ' + VALID_REORDER_DIRECTIONS.join(', '), reqInfo, body)
    }

    const elem = app.repository.get(id)
    if (!elem) {
        return { success: false, error: 'Element not found: ' + id, request: Object.assign({}, reqInfo, { body: body }) }
    }

    if (!elem._parent) {
        return validationError('Element has no parent and cannot be reordered', reqInfo, body)
    }

    // Find the parent field containing this element
    let parentField = null
    const parent = elem._parent
    const keys = Object.keys(parent)
    for (let i = 0; i < keys.length; i++) {
        const val = parent[keys[i]]
        if (Array.isArray(val) && val.indexOf(elem) !== -1) {
            parentField = keys[i]
            break
        }
    }

    if (!parentField) {
        return validationError('Could not determine parent field for element', reqInfo, body)
    }

    try {
        if (body.direction === 'up') {
            app.engine.moveUp(parent, parentField, elem)
        } else {
            app.engine.moveDown(parent, parentField, elem)
        }

        return {
            success: true,
            message: 'Moved element "' + (elem.name || id) + '" ' + body.direction + ' in ' + parentField,
            request: Object.assign({}, reqInfo, { body: body }),
            data: { _id: elem._id, _type: elem.constructor.name, field: parentField }
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to reorder: ' + (e.message || String(e)),
            request: Object.assign({}, reqInfo, { body: body })
        }
    }
}

// --- #3. UMLLinkObject ---

const LINK_OBJECT_ALLOWED_FIELDS = ['name', 'sourceId', 'targetId', 'x1', 'y1', 'x2', 'y2']

function createLinkObject(diagramId, body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, LINK_OBJECT_ALLOWED_FIELDS),
        checkFieldType(body, 'name', 'string'),
        checkFieldType(body, 'sourceId', 'string'),
        checkFieldType(body, 'targetId', 'string'),
        checkFieldType(body, 'x1', 'number'),
        checkFieldType(body, 'y1', 'number'),
        checkFieldType(body, 'x2', 'number'),
        checkFieldType(body, 'y2', 'number')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (!body.sourceId || !body.targetId) {
        return validationError('Fields "sourceId" and "targetId" are required (object model IDs)', reqInfo, body)
    }

    const diagram = findById(diagramId)
    if (!diagram || !diagram.ownedViews) {
        return { success: false, error: 'Diagram not found: ' + diagramId, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const sourceModel = app.repository.get(body.sourceId)
    if (!sourceModel) {
        return validationError('sourceId not found: ' + body.sourceId, reqInfo, body)
    }
    const targetModel = app.repository.get(body.targetId)
    if (!targetModel) {
        return validationError('targetId not found: ' + body.targetId, reqInfo, body)
    }

    const tailView = findViewOnDiagram(diagram, body.sourceId)
    const headView = findViewOnDiagram(diagram, body.targetId)
    if (!tailView) {
        return validationError('sourceId does not have a view on this diagram', reqInfo, body)
    }
    if (!headView) {
        return validationError('targetId does not have a view on this diagram', reqInfo, body)
    }

    const x1 = body.x1 !== undefined ? body.x1 : 200
    const y1 = body.y1 !== undefined ? body.y1 : 200
    const x2 = body.x2 !== undefined ? body.x2 : 300
    const y2 = body.y2 !== undefined ? body.y2 : 250

    try {
        const view = app.factory.createModelAndView({
            id: 'UMLLinkObject',
            parent: diagram._parent,
            diagram: diagram,
            tailView: tailView,
            headView: headView,
            tailModel: sourceModel,
            headModel: targetModel,
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2
        })

        if (!view) {
            return { success: false, error: 'Failed to create UMLLinkObject. Factory returned null.', request: Object.assign({}, reqInfo, { body: body }) }
        }

        const model = view.model || view
        if (body.name && model && typeof model._id === 'string') {
            app.engine.setProperty(model, 'name', body.name)
        }

        autoExpandFrame(diagram)
        return {
            success: true,
            message: 'Created UMLLinkObject on diagram "' + (diagram.name || diagramId) + '"',
            request: Object.assign({}, reqInfo, { body: body }),
            data: {
                _id: view._id,
                _type: view.constructor.name,
                modelId: model ? model._id : undefined,
                modelType: model ? model.constructor.name : undefined,
                name: model ? model.name || '' : ''
            }
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to create UMLLinkObject: ' + (e.message || String(e)),
            request: Object.assign({}, reqInfo, { body: body })
        }
    }
}

// --- #10. HTML / Markdown Export ---

const DOC_EXPORT_ALLOWED_FIELDS = ['path', 'format']
const VALID_DOC_EXPORT_FORMATS = ['html', 'markdown']

function exportDocument(body, reqInfo) {
    const err = validate([
        checkUnknownFields(body, DOC_EXPORT_ALLOWED_FIELDS),
        checkFieldType(body, 'path', 'string'),
        checkFieldType(body, 'format', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (!body.path) {
        return validationError('Field "path" is required', reqInfo, body)
    }
    if (!body.format) {
        return validationError('Field "format" is required. Allowed: ' + VALID_DOC_EXPORT_FORMATS.join(', '), reqInfo, body)
    }
    if (VALID_DOC_EXPORT_FORMATS.indexOf(body.format) === -1) {
        return validationError('Invalid format "' + body.format + '". Allowed: ' + VALID_DOC_EXPORT_FORMATS.join(', '), reqInfo, body)
    }

    const path = require('path')
    if (!path.isAbsolute(body.path)) {
        return validationError('path must be absolute', reqInfo, body)
    }

    try {
        if (body.format === 'html') {
            app.commands.execute('html-export:export', body.path)
        } else {
            app.commands.execute('markdown:export', body.path)
        }

        return {
            success: true,
            message: 'Exported project as ' + body.format + ' to ' + body.path,
            request: Object.assign({}, reqInfo, { body: body }),
            data: { format: body.format, path: body.path }
        }
    } catch (e) {
        return {
            success: false,
            error: 'Failed to export: ' + (e.message || String(e)),
            request: Object.assign({}, reqInfo, { body: body })
        }
    }
}

// ============================================================
// Router
// ============================================================

function parseUrl(url) {
    const parts = url.split('?')
    const path = parts[0]
    const query = {}
    if (parts[1]) {
        try {
            parts[1].split('&').forEach(function (param) {
                const idx = param.indexOf('=')
                const key = idx === -1 ? param : param.substring(0, idx)
                const val = idx === -1 ? '' : param.substring(idx + 1)
                query[decodeURIComponent(key)] = decodeURIComponent(val)
            })
        } catch (e) {
            return { path: path, query: query, error: 'Invalid URL encoding' }
        }
    }
    return { path: path, query: query }
}

function decodePathParam(value) {
    try {
        return decodeURIComponent(value)
    } catch (e) {
        return value
    }
}

function route(method, url, body) {
    // Ensure body is a valid object for mutation requests
    if (body !== null && body !== undefined && typeof body !== 'object') {
        return { success: false, error: 'Request body must be a JSON object', request: { method: method, path: url } }
    }
    if (!body) {
        body = {}
    }

    const parsed = parseUrl(url)
    if (parsed.error) {
        return { success: false, error: parsed.error, request: { method: method, path: url } }
    }
    let path = parsed.path
    const query = parsed.query

    if (path.length > 1 && path[path.length - 1] === '/') {
        path = path.substring(0, path.length - 1)
    }

    const reqInfo = { method: method, path: path }
    if (Object.keys(query).length > 0) {
        reqInfo.query = query
    }

    let match

    // GET /api/erd/diagrams
    if (method === 'GET' && path === '/api/erd/diagrams') {
        return getDiagrams(reqInfo)
    }

    // POST /api/erd/diagrams
    if (method === 'POST' && path === '/api/erd/diagrams') {
        return createDiagram(body, reqInfo)
    }

    // /api/erd/diagrams/:id
    match = path.match(/^\/api\/erd\/diagrams\/([^/]+)$/)
    if (match) {
        if (method === 'GET') {
            return getDiagram(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'PUT') {
            return updateDiagram(decodePathParam(match[1]), body, reqInfo)
        }
        if (method === 'DELETE') {
            return deleteDiagram(decodePathParam(match[1]), reqInfo)
        }
    }

    // GET /api/erd/data-models
    if (method === 'GET' && path === '/api/erd/data-models') {
        return getDataModels(reqInfo)
    }

    // POST /api/erd/data-models
    if (method === 'POST' && path === '/api/erd/data-models') {
        return createDataModel(body, reqInfo)
    }

    // /api/erd/data-models/:id
    match = path.match(/^\/api\/erd\/data-models\/([^/]+)$/)
    if (match) {
        if (method === 'GET') {
            return getDataModel(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'PUT') {
            return updateDataModel(decodePathParam(match[1]), body, reqInfo)
        }
        if (method === 'DELETE') {
            return deleteDataModel(decodePathParam(match[1]), reqInfo)
        }
    }

    // GET /api/erd/entities
    if (method === 'GET' && path === '/api/erd/entities') {
        return getEntities(query, reqInfo)
    }

    // POST /api/erd/entities
    if (method === 'POST' && path === '/api/erd/entities') {
        return createEntity(body, reqInfo)
    }

    // /api/erd/entities/:id
    match = path.match(/^\/api\/erd\/entities\/([^/]+)$/)
    if (match) {
        if (method === 'GET') {
            return getEntity(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'PUT') {
            return updateEntity(decodePathParam(match[1]), body, reqInfo)
        }
        if (method === 'DELETE') {
            return deleteEntity(decodePathParam(match[1]), reqInfo)
        }
    }

    // /api/erd/entities/:id/columns
    match = path.match(/^\/api\/erd\/entities\/([^/]+)\/columns$/)
    if (match) {
        if (method === 'GET') {
            return getColumns(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'POST') {
            return createColumn(decodePathParam(match[1]), body, reqInfo)
        }
    }

    // /api/erd/columns/:id
    match = path.match(/^\/api\/erd\/columns\/([^/]+)$/)
    if (match) {
        if (method === 'GET') {
            return getColumn(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'PUT') {
            return updateColumn(decodePathParam(match[1]), body, reqInfo)
        }
        if (method === 'DELETE') {
            return deleteColumn(decodePathParam(match[1]), reqInfo)
        }
    }

    // /api/elements/:id/tags
    match = path.match(/^\/api\/elements\/([^/]+)\/tags$/)
    if (match) {
        if (method === 'GET') {
            return getTags(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'POST') {
            return createTag(decodePathParam(match[1]), body, reqInfo)
        }
    }

    // /api/tags/:id
    match = path.match(/^\/api\/tags\/([^/]+)$/)
    if (match) {
        if (method === 'GET') {
            return getTag(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'PUT') {
            return updateTag(decodePathParam(match[1]), body, reqInfo)
        }
        if (method === 'DELETE') {
            return deleteTag(decodePathParam(match[1]), reqInfo)
        }
    }

    // GET /api/erd/relationships
    if (method === 'GET' && path === '/api/erd/relationships') {
        return getRelationships(query, reqInfo)
    }

    // POST /api/erd/relationships
    if (method === 'POST' && path === '/api/erd/relationships') {
        return createRelationship(body, reqInfo)
    }

    // /api/erd/relationships/:id
    match = path.match(/^\/api\/erd\/relationships\/([^/]+)$/)
    if (match) {
        if (method === 'GET') {
            return getRelationship(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'PUT') {
            return updateRelationship(decodePathParam(match[1]), body, reqInfo)
        }
        if (method === 'DELETE') {
            return deleteRelationship(decodePathParam(match[1]), reqInfo)
        }
    }

    // /api/erd/entities/:id/sequences
    match = path.match(/^\/api\/erd\/entities\/([^/]+)\/sequences$/)
    if (match) {
        if (method === 'GET') {
            return getSequences(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'POST') {
            return createSequence(decodePathParam(match[1]), body, reqInfo)
        }
    }

    // /api/erd/sequences/:id
    match = path.match(/^\/api\/erd\/sequences\/([^/]+)$/)
    if (match) {
        if (method === 'GET') {
            return getSequence(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'PUT') {
            return updateSequence(decodePathParam(match[1]), body, reqInfo)
        }
        if (method === 'DELETE') {
            return deleteSequence(decodePathParam(match[1]), reqInfo)
        }
    }

    // /api/erd/entities/:id/indexes
    match = path.match(/^\/api\/erd\/entities\/([^/]+)\/indexes$/)
    if (match) {
        if (method === 'GET') {
            return getIndexes(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'POST') {
            return createIndex(decodePathParam(match[1]), body, reqInfo)
        }
    }

    // /api/erd/indexes/:id
    match = path.match(/^\/api\/erd\/indexes\/([^/]+)$/)
    if (match) {
        if (method === 'GET') {
            return getIndex(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'PUT') {
            return updateIndex(decodePathParam(match[1]), body, reqInfo)
        }
        if (method === 'DELETE') {
            return deleteIndex(decodePathParam(match[1]), reqInfo)
        }
    }

    // POST /api/erd/postgresql/ddl
    if (method === 'POST' && path === '/api/erd/postgresql/ddl') {
        return generatePostgresqlDDL(body, reqInfo)
    }

    // ============ Sequence Diagram Routes ============

    // GET /api/seq/interactions
    if (method === 'GET' && path === '/api/seq/interactions') {
        return getInteractions(reqInfo)
    }

    // POST /api/seq/interactions
    if (method === 'POST' && path === '/api/seq/interactions') {
        return createInteraction(body, reqInfo)
    }

    // /api/seq/interactions/:id
    match = path.match(/^\/api\/seq\/interactions\/([^/]+)$/)
    if (match) {
        if (method === 'GET') {
            return getInteraction(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'PUT') {
            return updateInteraction(decodePathParam(match[1]), body, reqInfo)
        }
        if (method === 'DELETE') {
            return deleteInteraction(decodePathParam(match[1]), reqInfo)
        }
    }

    // GET /api/seq/diagrams
    if (method === 'GET' && path === '/api/seq/diagrams') {
        return getSeqDiagrams(reqInfo)
    }

    // POST /api/seq/diagrams
    if (method === 'POST' && path === '/api/seq/diagrams') {
        return createSeqDiagram(body, reqInfo)
    }

    // /api/seq/diagrams/:id
    match = path.match(/^\/api\/seq\/diagrams\/([^/]+)$/)
    if (match) {
        if (method === 'GET') {
            return getSeqDiagram(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'PUT') {
            return updateSeqDiagram(decodePathParam(match[1]), body, reqInfo)
        }
        if (method === 'DELETE') {
            return deleteSeqDiagram(decodePathParam(match[1]), reqInfo)
        }
    }

    // /api/seq/interactions/:id/lifelines
    match = path.match(/^\/api\/seq\/interactions\/([^/]+)\/lifelines$/)
    if (match) {
        if (method === 'GET') {
            return getLifelines(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'POST') {
            return createLifeline(decodePathParam(match[1]), body, reqInfo)
        }
    }

    // /api/seq/lifelines/:id
    match = path.match(/^\/api\/seq\/lifelines\/([^/]+)$/)
    if (match) {
        if (method === 'GET') {
            return getLifeline(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'PUT') {
            return updateLifeline(decodePathParam(match[1]), body, reqInfo)
        }
        if (method === 'DELETE') {
            return deleteLifeline(decodePathParam(match[1]), reqInfo)
        }
    }

    // /api/seq/interactions/:id/messages
    match = path.match(/^\/api\/seq\/interactions\/([^/]+)\/messages$/)
    if (match) {
        if (method === 'GET') {
            return getMessages(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'POST') {
            return createMessage(decodePathParam(match[1]), body, reqInfo)
        }
    }

    // /api/seq/messages/:id
    match = path.match(/^\/api\/seq\/messages\/([^/]+)$/)
    if (match) {
        if (method === 'GET') {
            return getMessage(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'PUT') {
            return updateMessage(decodePathParam(match[1]), body, reqInfo)
        }
        if (method === 'DELETE') {
            return deleteMessage(decodePathParam(match[1]), reqInfo)
        }
    }

    // /api/seq/interactions/:id/combined-fragments
    match = path.match(/^\/api\/seq\/interactions\/([^/]+)\/combined-fragments$/)
    if (match) {
        if (method === 'GET') {
            return getCombinedFragments(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'POST') {
            return createCombinedFragment(decodePathParam(match[1]), body, reqInfo)
        }
    }

    // /api/seq/combined-fragments/:id
    match = path.match(/^\/api\/seq\/combined-fragments\/([^/]+)$/)
    if (match) {
        if (method === 'GET') {
            return getCombinedFragment(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'PUT') {
            return updateCombinedFragment(decodePathParam(match[1]), body, reqInfo)
        }
        if (method === 'DELETE') {
            return deleteCombinedFragment(decodePathParam(match[1]), reqInfo)
        }
    }

    // /api/seq/combined-fragments/:id/operands
    match = path.match(/^\/api\/seq\/combined-fragments\/([^/]+)\/operands$/)
    if (match) {
        if (method === 'GET') {
            return getOperands(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'POST') {
            return createOperand(decodePathParam(match[1]), body, reqInfo)
        }
    }

    // /api/seq/operands/:id
    match = path.match(/^\/api\/seq\/operands\/([^/]+)$/)
    if (match) {
        if (method === 'GET') {
            return getOperand(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'PUT') {
            return updateOperand(decodePathParam(match[1]), body, reqInfo)
        }
        if (method === 'DELETE') {
            return deleteOperand(decodePathParam(match[1]), reqInfo)
        }
    }

    // /api/seq/interactions/:id/state-invariants
    match = path.match(/^\/api\/seq\/interactions\/([^/]+)\/state-invariants$/)
    if (match) {
        if (method === 'GET') {
            return getStateInvariants(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'POST') {
            return createStateInvariant(decodePathParam(match[1]), body, reqInfo)
        }
    }

    // /api/seq/state-invariants/:id
    match = path.match(/^\/api\/seq\/state-invariants\/([^/]+)$/)
    if (match) {
        if (method === 'GET') {
            return getStateInvariant(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'PUT') {
            return updateStateInvariant(decodePathParam(match[1]), body, reqInfo)
        }
        if (method === 'DELETE') {
            return deleteStateInvariant(decodePathParam(match[1]), reqInfo)
        }
    }

    // /api/seq/interactions/:id/interaction-uses
    match = path.match(/^\/api\/seq\/interactions\/([^/]+)\/interaction-uses$/)
    if (match) {
        if (method === 'GET') {
            return getInteractionUses(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'POST') {
            return createInteractionUse(decodePathParam(match[1]), body, reqInfo)
        }
    }

    // /api/seq/interaction-uses/:id
    match = path.match(/^\/api\/seq\/interaction-uses\/([^/]+)$/)
    if (match) {
        if (method === 'GET') {
            return getInteractionUse(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'PUT') {
            return updateInteractionUse(decodePathParam(match[1]), body, reqInfo)
        }
        if (method === 'DELETE') {
            return deleteInteractionUse(decodePathParam(match[1]), reqInfo)
        }
    }

    // POST /api/project/save
    if (method === 'POST' && path === '/api/project/save') {
        return saveProject(body, reqInfo)
    }

    // POST /api/project/open
    if (method === 'POST' && path === '/api/project/open') {
        return openProject(body, reqInfo)
    }

    // POST /api/project/import
    if (method === 'POST' && path === '/api/project/import') {
        return importProject(body, reqInfo)
    }

    // POST /api/project/new
    if (method === 'POST' && path === '/api/project/new') {
        return newProject(reqInfo)
    }

    // POST /api/project/close
    if (method === 'POST' && path === '/api/project/close') {
        return closeProject(reqInfo)
    }

    // POST /api/project/export
    if (method === 'POST' && path === '/api/project/export') {
        return exportFragment(body, reqInfo)
    }

    // POST /api/project/export-all
    if (method === 'POST' && path === '/api/project/export-all') {
        return exportAllDiagrams(body, reqInfo)
    }

    // POST /api/validate
    if (method === 'POST' && path === '/api/validate') {
        return validateModel(reqInfo)
    }

    // POST /api/undo
    if (method === 'POST' && path === '/api/undo') {
        return undoAction(reqInfo)
    }

    // POST /api/redo
    if (method === 'POST' && path === '/api/redo') {
        return redoAction(reqInfo)
    }

    // GET /api/search
    if (method === 'GET' && path === '/api/search') {
        return searchElements(query, reqInfo)
    }

    // POST /api/views/align
    if (method === 'POST' && path === '/api/views/align') {
        return alignViews(body, reqInfo)
    }

    // POST /api/mermaid/import
    if (method === 'POST' && path === '/api/mermaid/import') {
        return importMermaid(body, reqInfo)
    }

    // POST /api/diagrams/generate
    if (method === 'POST' && path === '/api/diagrams/generate') {
        return generateDiagram(body, reqInfo)
    }

    // PUT /api/elements/:id/reorder
    match = path.match(/^\/api\/elements\/([^/]+)\/reorder$/)
    if (match && method === 'PUT') {
        return reorderElement(decodePathParam(match[1]), body, reqInfo)
    }

    // POST /api/project/export-doc
    if (method === 'POST' && path === '/api/project/export-doc') {
        return exportDocument(body, reqInfo)
    }

    // ============ Generic / Cross-diagram Routes ============

    // GET /api/diagrams
    if (method === 'GET' && path === '/api/diagrams') {
        return getAllDiagrams(query, reqInfo)
    }

    // POST /api/diagrams (create any diagram type)
    if (method === 'POST' && path === '/api/diagrams') {
        return createGenericDiagram(body, reqInfo)
    }

    // POST /api/diagrams/:id/export
    match = path.match(/^\/api\/diagrams\/([^/]+)\/export$/)
    if (match && method === 'POST') {
        return exportDiagramImage(decodePathParam(match[1]), body, reqInfo)
    }

    // POST /api/diagrams/:id/layout
    match = path.match(/^\/api\/diagrams\/([^/]+)\/layout$/)
    if (match && method === 'POST') {
        return layoutDiagram(decodePathParam(match[1]), body, reqInfo)
    }

    // /api/diagrams/:id/elements
    match = path.match(/^\/api\/diagrams\/([^/]+)\/elements$/)
    if (match) {
        if (method === 'GET') {
            return getDiagramElements(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'POST') {
            return createDiagramElement(decodePathParam(match[1]), body, reqInfo)
        }
    }

    // /api/diagrams/:id/relations
    match = path.match(/^\/api\/diagrams\/([^/]+)\/relations$/)
    if (match && method === 'POST') {
        return createDiagramRelation(decodePathParam(match[1]), body, reqInfo)
    }

    // /api/diagrams/:id/notes
    match = path.match(/^\/api\/diagrams\/([^/]+)\/notes$/)
    if (match) {
        if (method === 'GET') {
            return getDiagramNotes(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'POST') {
            return createNote(decodePathParam(match[1]), body, reqInfo)
        }
    }

    // /api/notes/:id
    match = path.match(/^\/api\/notes\/([^/]+)$/)
    if (match) {
        if (method === 'GET') {
            return getNote(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'PUT') {
            return updateNote(decodePathParam(match[1]), body, reqInfo)
        }
        if (method === 'DELETE') {
            return deleteNote(decodePathParam(match[1]), reqInfo)
        }
    }

    // /api/diagrams/:id/note-links
    match = path.match(/^\/api\/diagrams\/([^/]+)\/note-links$/)
    if (match) {
        if (method === 'GET') {
            return getDiagramNoteLinks(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'POST') {
            return createNoteLink(decodePathParam(match[1]), body, reqInfo)
        }
    }

    // /api/note-links/:id
    match = path.match(/^\/api\/note-links\/([^/]+)$/)
    if (match && method === 'DELETE') {
        return deleteNoteLink(decodePathParam(match[1]), reqInfo)
    }

    // /api/diagrams/:id/free-lines
    match = path.match(/^\/api\/diagrams\/([^/]+)\/free-lines$/)
    if (match) {
        if (method === 'GET') {
            return getDiagramFreeLines(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'POST') {
            return createFreeLine(decodePathParam(match[1]), body, reqInfo)
        }
    }

    // /api/free-lines/:id
    match = path.match(/^\/api\/free-lines\/([^/]+)$/)
    if (match && method === 'DELETE') {
        return deleteFreeLine(decodePathParam(match[1]), reqInfo)
    }

    // /api/diagrams/:id/shapes
    match = path.match(/^\/api\/diagrams\/([^/]+)\/shapes$/)
    if (match) {
        if (method === 'GET') {
            return getDiagramShapes(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'POST') {
            return createShape(decodePathParam(match[1]), body, reqInfo)
        }
    }

    // /api/diagrams/:id/create-view-of
    match = path.match(/^\/api\/diagrams\/([^/]+)\/create-view-of$/)
    if (match && method === 'POST') {
        return createViewOf(decodePathParam(match[1]), body, reqInfo)
    }

    // /api/diagrams/:id/link-object
    match = path.match(/^\/api\/diagrams\/([^/]+)\/link-object$/)
    if (match && method === 'POST') {
        return createLinkObject(decodePathParam(match[1]), body, reqInfo)
    }

    // /api/diagrams/:id/open
    match = path.match(/^\/api\/diagrams\/([^/]+)\/open$/)
    if (match && method === 'POST') {
        return openDiagram(decodePathParam(match[1]), reqInfo)
    }

    // /api/diagrams/:id/zoom
    match = path.match(/^\/api\/diagrams\/([^/]+)\/zoom$/)
    if (match && method === 'PUT') {
        return setDiagramZoom(decodePathParam(match[1]), body, reqInfo)
    }

    // /api/diagrams/:id/views
    match = path.match(/^\/api\/diagrams\/([^/]+)\/views$/)
    if (match && method === 'GET') {
        return getDiagramViews(decodePathParam(match[1]), reqInfo)
    }

    // /api/diagrams/:id (generic GET/PUT/DELETE)
    match = path.match(/^\/api\/diagrams\/([^/]+)$/)
    if (match) {
        if (method === 'GET') {
            return getGenericDiagram(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'PUT') {
            return updateGenericDiagram(decodePathParam(match[1]), body, reqInfo)
        }
        if (method === 'DELETE') {
            return deleteGenericDiagram(decodePathParam(match[1]), reqInfo)
        }
    }

    // /api/shapes/:id
    match = path.match(/^\/api\/shapes\/([^/]+)$/)
    if (match) {
        if (method === 'GET') {
            return getShape(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'PUT') {
            return updateShape(decodePathParam(match[1]), body, reqInfo)
        }
        if (method === 'DELETE') {
            return deleteShape(decodePathParam(match[1]), reqInfo)
        }
    }

    // /api/views/:id/reconnect
    match = path.match(/^\/api\/views\/([^/]+)\/reconnect$/)
    if (match && method === 'PUT') {
        return reconnectEdge(decodePathParam(match[1]), body, reqInfo)
    }

    // /api/views/:id/style
    match = path.match(/^\/api\/views\/([^/]+)\/style$/)
    if (match && method === 'PUT') {
        return updateViewStyle(decodePathParam(match[1]), body, reqInfo)
    }

    // /api/views/:id
    match = path.match(/^\/api\/views\/([^/]+)$/)
    if (match && method === 'PUT') {
        return updateView(decodePathParam(match[1]), body, reqInfo)
    }

    // /api/elements/:id/relationships
    match = path.match(/^\/api\/elements\/([^/]+)\/relationships$/)
    if (match && method === 'GET') {
        return getElementRelationships(decodePathParam(match[1]), reqInfo)
    }

    // /api/elements/:id/views
    match = path.match(/^\/api\/elements\/([^/]+)\/views$/)
    if (match && method === 'GET') {
        return getElementViews(decodePathParam(match[1]), reqInfo)
    }

    // /api/elements/:id/relocate
    match = path.match(/^\/api\/elements\/([^/]+)\/relocate$/)
    if (match && method === 'PUT') {
        return relocateElement(decodePathParam(match[1]), body, reqInfo)
    }

    // /api/elements/:id/children
    match = path.match(/^\/api\/elements\/([^/]+)\/children$/)
    if (match && method === 'POST') {
        return createChildElement(decodePathParam(match[1]), body, reqInfo)
    }

    // /api/elements/:id
    match = path.match(/^\/api\/elements\/([^/]+)$/)
    if (match) {
        if (method === 'GET') {
            return getElement(decodePathParam(match[1]), reqInfo)
        }
        if (method === 'PUT') {
            return updateGenericElement(decodePathParam(match[1]), body, reqInfo)
        }
        if (method === 'DELETE') {
            return deleteGenericElement(decodePathParam(match[1]), reqInfo)
        }
    }

    // ============ Family API Routes (factory-generated) ============
    for (let fi = 0; fi < familyRouters.length; fi++) {
        const familyResult = familyRouters[fi](method, path, query, body, reqInfo)
        if (familyResult !== null) {
            return familyResult
        }
    }

    // GET /api/status
    if (method === 'GET' && (path === '/api/status' || path === '/')) {
        return {
            success: true,
            message: 'Server is running',
            request: reqInfo,
            data: {
                status: 'running',
                version: '1.0.0',
                allowedColumnTypes: ALLOWED_COLUMN_TYPES,
                allowedTagKinds: TAG_KIND_LABELS,
                allowedMessageSorts: VALID_MESSAGE_SORTS,
                allowedInteractionOperators: VALID_INTERACTION_OPERATORS,
                allowedDiagramTypes: ALLOWED_DIAGRAM_TYPES,
                allowedNodeTypes: ALLOWED_NODE_TYPES,
                allowedRelationTypes: ALLOWED_RELATION_TYPES,
                allowedChildTypes: ALLOWED_CHILD_TYPES,
                allowedShapeTypes: ALLOWED_SHAPE_TYPES,
                allowedAlignmentActions: VALID_ALIGNMENT_ACTIONS,
                allowedMermaidTypes: VALID_MERMAID_TYPES,
                allowedGeneratorTypes: VALID_GENERATOR_TYPES,
                allowedMessageTypes: VALID_MESSAGE_TYPES,
                endpoints: [
                    'GET  /api/status',
                    'GET  /api/erd/diagrams',
                    'POST /api/erd/diagrams',
                    'GET  /api/erd/diagrams/:id',
                    'PUT  /api/erd/diagrams/:id',
                    'DELETE /api/erd/diagrams/:id',
                    'GET  /api/erd/data-models',
                    'POST /api/erd/data-models',
                    'GET  /api/erd/data-models/:id',
                    'PUT  /api/erd/data-models/:id',
                    'DELETE /api/erd/data-models/:id',
                    'GET  /api/erd/entities',
                    'POST /api/erd/entities',
                    'GET  /api/erd/entities/:id',
                    'PUT  /api/erd/entities/:id',
                    'DELETE /api/erd/entities/:id',
                    'GET  /api/erd/entities/:id/columns',
                    'POST /api/erd/entities/:id/columns',
                    'GET  /api/erd/columns/:id',
                    'PUT  /api/erd/columns/:id',
                    'DELETE /api/erd/columns/:id',
                    'GET  /api/elements/:id/tags',
                    'POST /api/elements/:id/tags',
                    'GET  /api/tags/:id',
                    'PUT  /api/tags/:id',
                    'DELETE /api/tags/:id',
                    'GET  /api/erd/entities/:id/sequences',
                    'POST /api/erd/entities/:id/sequences',
                    'GET  /api/erd/sequences/:id',
                    'PUT  /api/erd/sequences/:id',
                    'DELETE /api/erd/sequences/:id',
                    'GET  /api/erd/entities/:id/indexes',
                    'POST /api/erd/entities/:id/indexes',
                    'GET  /api/erd/indexes/:id',
                    'PUT  /api/erd/indexes/:id',
                    'DELETE /api/erd/indexes/:id',
                    'GET  /api/erd/relationships',
                    'POST /api/erd/relationships',
                    'GET  /api/erd/relationships/:id',
                    'PUT  /api/erd/relationships/:id',
                    'DELETE /api/erd/relationships/:id',
                    'GET  /api/elements/:id',
                    'PUT  /api/elements/:id',
                    'DELETE /api/elements/:id',
                    'GET  /api/elements/:id/relationships',
                    'GET  /api/elements/:id/views',
                    'PUT  /api/elements/:id/relocate',
                    'GET  /api/diagrams',
                    'POST /api/diagrams',
                    'GET  /api/diagrams/:id',
                    'PUT  /api/diagrams/:id',
                    'DELETE /api/diagrams/:id',
                    'GET  /api/diagrams/:id/elements',
                    'POST /api/diagrams/:id/elements',
                    'POST /api/diagrams/:id/relations',
                    'POST /api/diagrams/:id/export',
                    'POST /api/diagrams/:id/layout',
                    'POST /api/diagrams/:id/create-view-of',
                    'POST /api/diagrams/:id/link-object',
                    'POST /api/diagrams/:id/open',
                    'PUT  /api/diagrams/:id/zoom',
                    'GET  /api/diagrams/:id/notes',
                    'POST /api/diagrams/:id/notes',
                    'GET  /api/notes/:id',
                    'PUT  /api/notes/:id',
                    'DELETE /api/notes/:id',
                    'GET  /api/diagrams/:id/note-links',
                    'POST /api/diagrams/:id/note-links',
                    'DELETE /api/note-links/:id',
                    'GET  /api/diagrams/:id/free-lines',
                    'POST /api/diagrams/:id/free-lines',
                    'DELETE /api/free-lines/:id',
                    'GET  /api/diagrams/:id/shapes',
                    'POST /api/diagrams/:id/shapes',
                    'GET  /api/shapes/:id',
                    'PUT  /api/shapes/:id',
                    'DELETE /api/shapes/:id',
                    'GET  /api/diagrams/:id/views',
                    'PUT  /api/views/:id',
                    'PUT  /api/views/:id/style',
                    'PUT  /api/views/:id/reconnect',
                    'POST /api/elements/:id/children',
                    'POST /api/erd/postgresql/ddl',
                    'POST /api/project/save',
                    'POST /api/project/open',
                    'POST /api/project/import',
                    'POST /api/project/new',
                    'POST /api/project/close',
                    'POST /api/project/export',
                    'POST /api/project/export-all',
                    'POST /api/validate',
                    'POST /api/undo',
                    'POST /api/redo',
                    'GET  /api/search',
                    'POST /api/views/align',
                    'POST /api/mermaid/import',
                    'POST /api/diagrams/generate',
                    'PUT  /api/elements/:id/reorder',
                    'POST /api/project/export-doc',
                    'GET  /api/seq/interactions',
                    'POST /api/seq/interactions',
                    'GET  /api/seq/interactions/:id',
                    'PUT  /api/seq/interactions/:id',
                    'DELETE /api/seq/interactions/:id',
                    'GET  /api/seq/diagrams',
                    'POST /api/seq/diagrams',
                    'GET  /api/seq/diagrams/:id',
                    'PUT  /api/seq/diagrams/:id',
                    'DELETE /api/seq/diagrams/:id',
                    'GET  /api/seq/interactions/:id/lifelines',
                    'POST /api/seq/interactions/:id/lifelines',
                    'GET  /api/seq/lifelines/:id',
                    'PUT  /api/seq/lifelines/:id',
                    'DELETE /api/seq/lifelines/:id',
                    'GET  /api/seq/interactions/:id/messages',
                    'POST /api/seq/interactions/:id/messages',
                    'GET  /api/seq/messages/:id',
                    'PUT  /api/seq/messages/:id',
                    'DELETE /api/seq/messages/:id',
                    'GET  /api/seq/interactions/:id/combined-fragments',
                    'POST /api/seq/interactions/:id/combined-fragments',
                    'GET  /api/seq/combined-fragments/:id',
                    'PUT  /api/seq/combined-fragments/:id',
                    'DELETE /api/seq/combined-fragments/:id',
                    'GET  /api/seq/combined-fragments/:id/operands',
                    'POST /api/seq/combined-fragments/:id/operands',
                    'GET  /api/seq/operands/:id',
                    'PUT  /api/seq/operands/:id',
                    'DELETE /api/seq/operands/:id',
                    'GET  /api/seq/interactions/:id/state-invariants',
                    'POST /api/seq/interactions/:id/state-invariants',
                    'GET  /api/seq/state-invariants/:id',
                    'PUT  /api/seq/state-invariants/:id',
                    'DELETE /api/seq/state-invariants/:id',
                    'GET  /api/seq/interactions/:id/interaction-uses',
                    'POST /api/seq/interactions/:id/interaction-uses',
                    'GET  /api/seq/interaction-uses/:id',
                    'PUT  /api/seq/interaction-uses/:id',
                    'DELETE /api/seq/interaction-uses/:id'
                ].concat(familyEndpoints)
            }
        }
    }

    return { success: false, error: 'Not found: ' + method + ' ' + path, request: reqInfo }
}

exports.route = route
