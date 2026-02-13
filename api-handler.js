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
            return r._parent && r._parent._id === query.dataModelId
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
    let tailView = null
    let headView = null
    if (diagram.ownedViews) {
        diagram.ownedViews.forEach(function (view) {
            if (view.model && view.model._id === entity1._id) {
                tailView = view
            }
            if (view.model && view.model._id === entity2._id) {
                headView = view
            }
        })
    }

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

// --- Generic Element ---

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

    // POST /api/project/save
    if (method === 'POST' && path === '/api/project/save') {
        return saveProject(body, reqInfo)
    }

    // POST /api/project/open
    if (method === 'POST' && path === '/api/project/open') {
        return openProject(body, reqInfo)
    }

    // /api/elements/:id
    match = path.match(/^\/api\/elements\/([^/]+)$/)
    if (match && method === 'GET') {
        return getElement(decodePathParam(match[1]), reqInfo)
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
                    'POST /api/erd/postgresql/ddl',
                    'POST /api/project/save',
                    'POST /api/project/open'
                ]
            }
        }
    }

    return { success: false, error: 'Not found: ' + method + ' ' + path, request: reqInfo }
}

exports.route = route
