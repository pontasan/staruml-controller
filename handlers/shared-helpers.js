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
// Frame Auto-Expansion
// ============================================================

// View types whose width tracks the frame rather than representing intrinsic
// content width. In timing diagrams, lifelines and states always span the
// full frame width. Including them in horizontal bounds calculations would
// prevent the frame from shrinking and cause it to grow on every element creation.
const FRAME_TRACKING_TYPES = [
    'UMLTimingLifelineView',
    'UMLTimingStateView'
]

/**
 * Get the bounding box of a view, handling both NodeViews and EdgeViews.
 *
 * Priority: left/top/width/height (if non-degenerate) → points collection.
 *
 * After diagram_layout, even EdgeViews get valid left/top/width/height,
 * while their points collection may retain pre-layout coordinates. Before
 * layout, EdgeViews have left/top/width/height all 0 — in that case, the
 * points collection provides the actual visual extent.
 *
 * @param {Object} v - The view to get bounds for
 * @returns {Object|null} { left, top, right, bottom } or null
 */
function getViewBounds(v) {
    // Prefer left/top/width/height when they represent a non-degenerate box.
    // After diagram_layout, even EdgeViews get valid left/top/width/height,
    // while their points collection may still hold pre-layout coordinates.
    if (v.left !== undefined && v.top !== undefined &&
        ((v.width || 0) > 0 || (v.height || 0) > 0)) {
        return {
            left: v.left,
            top: v.top,
            right: v.left + (v.width || 0),
            bottom: v.top + (v.height || 0)
        }
    }
    // Fallback for EdgeViews whose left/top/width/height are all 0:
    // compute bounds from the points collection
    if (v.points && typeof v.points.count === 'function' && v.points.count() > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        for (let i = 0; i < v.points.count(); i++) {
            const pt = v.points.getPoint(i)
            if (pt.x < minX) minX = pt.x
            if (pt.y < minY) minY = pt.y
            if (pt.x > maxX) maxX = pt.x
            if (pt.y > maxY) maxY = pt.y
        }
        if (minX !== Infinity) {
            return { left: minX, top: minY, right: maxX, bottom: maxY }
        }
    }
    // Last resort: use left/top even if width/height are 0
    if (v.left !== undefined && v.top !== undefined) {
        return {
            left: v.left,
            top: v.top,
            right: v.left + (v.width || 0),
            bottom: v.top + (v.height || 0)
        }
    }
    return null
}

/**
 * Auto-expand the UMLFrameView on a diagram to contain all views.
 * Call this after creating elements/relations to prevent views from
 * falling outside the diagram frame.
 *
 * Logic: content bounds + margin → frame size (expand only, never shrink).
 * Frame-tracking views are then resized to match the new frame width.
 *
 * @param {Object} diagram - The diagram whose frame should be expanded
 * @param {number} [margin=30] - Padding in pixels beyond the outermost views
 */
function autoExpandFrame(diagram, margin) {
    if (!diagram || !diagram.ownedViews) return
    if (margin === undefined) margin = 30

    // Find the frame view
    let frame = null
    for (let i = 0; i < diagram.ownedViews.length; i++) {
        if (diagram.ownedViews[i].constructor.name.endsWith('FrameView')) {
            frame = diagram.ownedViews[i]
            break
        }
    }
    if (!frame) return

    // Calculate content bounds (frame-tracking views → vertical only)
    let maxX = -Infinity
    let maxY = -Infinity
    const trackingViews = []
    for (let i = 0; i < diagram.ownedViews.length; i++) {
        const v = diagram.ownedViews[i]
        if (v === frame) continue
        const bounds = getViewBounds(v)
        if (!bounds) continue

        if (FRAME_TRACKING_TYPES.indexOf(v.constructor.name) !== -1) {
            trackingViews.push(v)
        } else {
            if (bounds.right > maxX) maxX = bounds.right
        }
        if (bounds.bottom > maxY) maxY = bounds.bottom
    }

    if (maxX === -Infinity && maxY === -Infinity) return

    // Expand frame if content extends beyond it (never shrink)
    const frameRight = frame.left + frame.width
    const frameBottom = frame.top + frame.height

    let newWidth = frame.width
    let newHeight = frame.height
    let needsUpdate = false

    if (maxX !== -Infinity && maxX + margin > frameRight) {
        newWidth = maxX - frame.left + margin
        needsUpdate = true
    }
    if (maxY !== -Infinity && maxY + margin > frameBottom) {
        newHeight = maxY - frame.top + margin
        needsUpdate = true
    }

    if (needsUpdate) {
        app.engine.setProperty(frame, 'width', newWidth)
        app.engine.setProperty(frame, 'height', newHeight)

        // Resize tracking views to match the new frame
        for (let i = 0; i < trackingViews.length; i++) {
            const sv = trackingViews[i]
            if (sv.width !== newWidth) app.engine.setProperty(sv, 'width', newWidth)
        }
    }
}

/**
 * Reposition and resize the UMLFrameView to tightly contain all views.
 * Unlike autoExpandFrame (which only expands right/bottom), this also
 * adjusts the frame's left/top position. Intended for use after diagram layout.
 *
 * In timing diagrams, certain view types (lifelines, timing states) span the
 * full frame width by design — they track the frame rather than having intrinsic
 * widths. These are identified by type name and excluded from horizontal bounds
 * calculation. After the frame is resized, they are adjusted to match.
 *
 * @param {Object} diagram - The diagram whose frame should be adjusted
 * @param {number} [margin=30] - Padding in pixels around the views
 */
function fitFrameToViews(diagram, margin) {
    if (!diagram || !diagram.ownedViews) return
    if (margin === undefined) margin = 30

    // Find the frame view
    let frame = null
    for (let i = 0; i < diagram.ownedViews.length; i++) {
        if (diagram.ownedViews[i].constructor.name.endsWith('FrameView')) {
            frame = diagram.ownedViews[i]
            break
        }
    }
    if (!frame) return

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    const trackingViews = []

    for (let i = 0; i < diagram.ownedViews.length; i++) {
        const v = diagram.ownedViews[i]
        if (v === frame) continue
        const bounds = getViewBounds(v)
        if (!bounds) continue

        const isTracking = FRAME_TRACKING_TYPES.indexOf(v.constructor.name) !== -1

        if (isTracking) {
            // Frame-tracking view: only consider vertical extent
            trackingViews.push(v)
            if (bounds.top < minY) minY = bounds.top
            if (bounds.bottom > maxY) maxY = bounds.bottom
        } else {
            // Content view: consider full extent
            if (bounds.left < minX) minX = bounds.left
            if (bounds.top < minY) minY = bounds.top
            if (bounds.right > maxX) maxX = bounds.right
            if (bounds.bottom > maxY) maxY = bounds.bottom
        }
    }

    if (minY === Infinity) return // No views found

    // If no content views provided horizontal bounds (e.g. diagram has only
    // tracking views), fall back to using them for horizontal bounds too.
    if (minX === Infinity) {
        for (let i = 0; i < trackingViews.length; i++) {
            const bounds = getViewBounds(trackingViews[i])
            if (bounds) {
                if (bounds.left < minX) minX = bounds.left
                if (bounds.right > maxX) maxX = bounds.right
            }
        }
    }

    if (minX === Infinity) return

    // When tracking views exist (e.g. timing diagrams), content views are
    // positioned relative to the tracking views. Moving the frame's left
    // position causes tracking views to shift, which in turn shifts the
    // content — creating a feedback loop that never converges.
    // Fix: only move left LEFTWARD (expand), never rightward (compact).
    const hasTrackingViews = trackingViews.length > 0

    let newLeft, newTop, newWidth, newHeight

    if (hasTrackingViews) {
        // Keep frame left (or expand leftward if content extends beyond it)
        newLeft = Math.min(frame.left, Math.max(0, minX - margin))
        newTop = Math.min(frame.top, Math.max(0, minY - margin))
        // Width must accommodate rightmost content from current left
        newWidth = Math.max(frame.width, maxX + margin - newLeft)
        newHeight = Math.max(frame.height, maxY + margin - newTop)
    } else {
        // No tracking views: compact frame to tightly fit content
        newLeft = Math.max(0, minX - margin)
        newTop = Math.max(0, minY - margin)
        newWidth = maxX - newLeft + margin
        newHeight = maxY - newTop + margin
    }

    // Apply frame changes
    if (newLeft !== frame.left) app.engine.setProperty(frame, 'left', newLeft)
    if (newTop !== frame.top) app.engine.setProperty(frame, 'top', newTop)
    if (newWidth !== frame.width) app.engine.setProperty(frame, 'width', newWidth)
    if (newHeight !== frame.height) app.engine.setProperty(frame, 'height', newHeight)

    // Resize frame-tracking views to match the new frame dimensions
    for (let i = 0; i < trackingViews.length; i++) {
        const sv = trackingViews[i]
        if (sv.left !== newLeft) app.engine.setProperty(sv, 'left', newLeft)
        if (sv.width !== newWidth) app.engine.setProperty(sv, 'width', newWidth)
    }
}

/**
 * Clear stale waypoints on an edge view and set a minimal 2-point path
 * between tail and head centers. Uses the memento/diff/operationBuilder
 * pattern for undo support.
 *
 * @param {Object} edgeView - The edge view whose waypoints should be cleared
 */
function clearEdgeWaypoints(edgeView) {
    if (!edgeView || !edgeView.tail || !edgeView.head) return
    if (!edgeView.points || typeof edgeView.points.clear !== 'function') return

    const tailView = edgeView.tail
    const headView = edgeView.head

    // Get center points of endpoints
    const tailCenter = tailView.getCenter ? tailView.getCenter() : null
    const headCenter = headView.getCenter ? headView.getCenter() : null
    if (!tailCenter || !headCenter) return

    // Store memento for undo support
    const memento = {}
    edgeView.assignTo(memento)

    // Clear and set minimal 2-point path
    edgeView.points.clear()
    edgeView.points.add(tailCenter)
    edgeView.points.add(headCenter)

    // Compute diffs between modified and original state
    const diffs = edgeView.diff(memento)

    // Restore original state
    edgeView.assignFrom(memento)

    // Apply diffs via operation builder (undoable)
    if (diffs && diffs.length > 0) {
        const operationBuilder = app.repository.getOperationBuilder()
        operationBuilder.begin('clear edge waypoints')
        for (let i = 0; i < diffs.length; i++) {
            const d = diffs[i]
            operationBuilder.fieldAssign(d.elem, d.f, d.n)
        }
        operationBuilder.end()
        app.repository.doOperation(operationBuilder.getOperation())
    }
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
    findViewOnDiagramByAnyId: findViewOnDiagramByAnyId,
    // Frame
    getViewBounds: getViewBounds,
    autoExpandFrame: autoExpandFrame,
    fitFrameToViews: fitFrameToViews,
    // Edge routing
    clearEdgeWaypoints: clearEdgeWaypoints
}
