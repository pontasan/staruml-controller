/**
 * Shared helper functions extracted from api-handler.js
 * Used by both the main api-handler and the CRUD factory.
 */

// ============================================================
// Validation Helpers
// ============================================================

function checkUnknownFields(body, allowedFields) {
    const unknown = Object.keys(body).filter(function (k) {
        return allowedFields.indexOf(k) === -1
    })
    if (unknown.length > 0) {
        return 'Unknown field(s): ' + unknown.join(', ') + '. Allowed fields: ' + allowedFields.join(', ')
    }
    return null
}

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

function checkNonEmptyString(body, field) {
    if (body[field] === undefined) {
        return null
    }
    if (typeof body[field] !== 'string' || body[field].trim() === '') {
        return 'Field "' + field + '" must be a non-empty string'
    }
    return null
}

function validate(checks) {
    for (let i = 0; i < checks.length; i++) {
        if (checks[i]) {
            return checks[i]
        }
    }
    return null
}

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
// Lookup Helpers
// ============================================================

function findById(id) {
    return app.repository.get(id) || null
}

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

// ============================================================
// Exports
// ============================================================

module.exports = {
    // Validation
    checkUnknownFields: checkUnknownFields,
    checkFieldType: checkFieldType,
    checkNonEmptyString: checkNonEmptyString,
    validate: validate,
    validationError: validationError,
    // Serialization
    serializeElement: serializeElement,
    serializeGenericDiagram: serializeGenericDiagram,
    serializeGenericDiagramDetail: serializeGenericDiagramDetail,
    serializeViewInfo: serializeViewInfo,
    // Lookup
    findById: findById,
    findViewOnDiagram: findViewOnDiagram,
    findViewOnDiagramByAnyId: findViewOnDiagramByAnyId
}
