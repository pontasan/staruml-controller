/**
 * REST API Handler for StarUML Controller
 *
 * Provides CRUD operations for ERD elements with input validation
 * and detailed request/response logging.
 */

const ddlGenerator = require('./ddl-generator')

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
const VALID_EXPORT_FORMATS = ['png', 'jpeg', 'svg']

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
        return r._parent && r._parent._id === id
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
const MESSAGE_ALLOWED_FIELDS = ['name', 'messageSort', 'source', 'target', 'diagramId', 'y', 'activationHeight', 'documentation']
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
    let collaboration = app.repository.select('@UMLCollaboration')[0]
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

    app.engine.deleteElements([interaction], [])
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
        checkFieldType(body, 'source', 'string'),
        checkFieldType(body, 'target', 'string'),
        checkFieldType(body, 'diagramId', 'string'),
        checkFieldType(body, 'y', 'number'),
        checkFieldType(body, 'activationHeight', 'number'),
        checkFieldType(body, 'documentation', 'string')
    ])
    if (err) {
        return validationError(err, reqInfo, body)
    }

    if (body.messageSort !== undefined && VALID_MESSAGE_SORTS.indexOf(body.messageSort) === -1) {
        return validationError('Invalid messageSort "' + body.messageSort + '". Allowed values: ' + VALID_MESSAGE_SORTS.join(', '), reqInfo, body)
    }

    if (!body.source) {
        return validationError('Field "source" is required (lifeline ID)', reqInfo, body)
    }
    if (!body.target) {
        return validationError('Field "target" is required (lifeline ID)', reqInfo, body)
    }
    if (!body.diagramId) {
        return validationError('Field "diagramId" is required for message creation', reqInfo, body)
    }

    const interaction = findById(interactionId)
    if (!interaction || !(interaction instanceof type.UMLInteraction)) {
        return { success: false, error: 'Interaction not found: ' + interactionId, request: Object.assign({}, reqInfo, { body: body }) }
    }

    const sourceLifeline = findById(body.source)
    if (!sourceLifeline || !(sourceLifeline instanceof type.UMLLifeline)) {
        return validationError('source must refer to a UMLLifeline. Not found or wrong type: ' + body.source, reqInfo, body)
    }

    const targetLifeline = findById(body.target)
    if (!targetLifeline || !(targetLifeline instanceof type.UMLLifeline)) {
        return validationError('target must refer to a UMLLifeline. Not found or wrong type: ' + body.target, reqInfo, body)
    }

    const diagram = findById(body.diagramId)
    if (!diagram || !(diagram instanceof type.UMLSequenceDiagram)) {
        return validationError('diagramId must refer to a UMLSequenceDiagram. Not found or wrong type: ' + body.diagramId, reqInfo, body)
    }

    // Find lifeline views on the diagram
    const tailView = findViewOnDiagram(diagram, sourceLifeline._id)
    const headView = findViewOnDiagram(diagram, targetLifeline._id)

    if (!tailView) {
        return validationError('source lifeline "' + sourceLifeline.name + '" does not have a view on diagram "' + diagram.name + '". Add the lifeline to the diagram first.', reqInfo, body)
    }
    if (!headView) {
        return validationError('target lifeline "' + targetLifeline.name + '" does not have a view on diagram "' + diagram.name + '". Add the lifeline to the diagram first.', reqInfo, body)
    }

    const options = {
        id: 'UMLMessage',
        parent: interaction,
        diagram: diagram,
        tailModel: sourceLifeline,
        headModel: targetLifeline,
        tailView: tailView,
        headView: headView,
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

    if (body.y !== undefined) {
        options.y1 = body.y
        options.y2 = body.y
    }

    const view = app.factory.createModelAndView(options)
    const msg = view.model

    // Resize activation bar if activationHeight is specified
    if (body.activationHeight !== undefined && view.activation) {
        app.engine.setProperty(view.activation, 'height', body.activationHeight)
    }

    return {
        success: true,
        message: 'Created message "' + (msg.name || msg._id) + '" with view on diagram "' + diagram.name + '"',
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
        const view = app.factory.createModelAndView(options)
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

    if (body.covered) {
        const coveredLifeline = findById(body.covered)
        if (!coveredLifeline || !(coveredLifeline instanceof type.UMLLifeline)) {
            return validationError('covered must refer to a UMLLifeline. Not found or wrong type: ' + body.covered, reqInfo, body)
        }
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
        const view = app.factory.createModelAndView(options)
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

        if (format === 'svg') {
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

    const view = app.factory.createModelAndView({
        id: 'Note',
        diagram: diagram,
        x1: body.x1 !== undefined ? body.x1 : 100,
        y1: body.y1 !== undefined ? body.y1 : 100,
        x2: body.x2 !== undefined ? body.x2 : 250,
        y2: body.y2 !== undefined ? body.y2 : 180
    })

    if (body.text !== undefined) {
        app.engine.setProperty(view, 'text', body.text)
    }

    return {
        success: true,
        message: 'Created note on diagram "' + (diagram.name || diagramId) + '"',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeNoteView(view)
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

    const view = app.factory.createModelAndView({
        id: 'NoteLink',
        diagram: diagram,
        tailView: noteView,
        headView: targetView
    })

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

    const view = app.factory.createModelAndView({
        id: 'FreeLine',
        diagram: diagram,
        x1: body.x1 !== undefined ? body.x1 : 100,
        y1: body.y1 !== undefined ? body.y1 : 100,
        x2: body.x2 !== undefined ? body.x2 : 300,
        y2: body.y2 !== undefined ? body.y2 : 200
    })

    return {
        success: true,
        message: 'Created free line on diagram "' + (diagram.name || diagramId) + '"',
        request: Object.assign({}, reqInfo, { body: body }),
        data: serializeFreeLineView(view)
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
// Router
// ============================================================

function parseUrl(url) {
    const parts = url.split('?')
    const path = parts[0]
    const query = {}
    if (parts[1]) {
        try {
            parts[1].split('&').forEach(function (param) {
                const kv = param.split('=')
                query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '')
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

    // ============ Generic / Cross-diagram Routes ============

    // GET /api/diagrams
    if (method === 'GET' && path === '/api/diagrams') {
        return getAllDiagrams(query, reqInfo)
    }

    // POST /api/diagrams/:id/export
    match = path.match(/^\/api\/diagrams\/([^/]+)\/export$/)
    if (match && method === 'POST') {
        return exportDiagramImage(decodePathParam(match[1]), body, reqInfo)
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

    // /api/diagrams/:id/views
    match = path.match(/^\/api\/diagrams\/([^/]+)\/views$/)
    if (match && method === 'GET') {
        return getDiagramViews(decodePathParam(match[1]), reqInfo)
    }

    // /api/views/:id
    match = path.match(/^\/api\/views\/([^/]+)$/)
    if (match && method === 'PUT') {
        return updateView(decodePathParam(match[1]), body, reqInfo)
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
                    'GET  /api/diagrams',
                    'POST /api/diagrams/:id/export',
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
                    'GET  /api/diagrams/:id/views',
                    'PUT  /api/views/:id',
                    'POST /api/erd/postgresql/ddl',
                    'POST /api/project/save',
                    'POST /api/project/open',
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
                ]
            }
        }
    }

    return { success: false, error: 'Not found: ' + method + ' ' + path, request: reqInfo }
}

exports.route = route
