/**
 * PostgreSQL DDL Generator for StarUML Controller
 *
 * Generates PostgreSQL-compatible DDL from ERD models.
 * Based on the staruml-postgresql extension's DDL generation logic.
 */

const fs = require('fs')

const SEQUENCE_PREFIX = 'sequence#'
const INDEX_PREFIX = 'index#'

// PostgreSQL type mapping based on staruml-postgresql extension
const PG_TYPE_MAP = {
    'CHAR': { pgType: 'char', hasLength: true },
    'VARCHAR': { pgType: 'varchar', hasLength: true },
    'TEXT': { pgType: 'text', hasLength: false },
    'CLOB': { pgType: 'text', hasLength: false },
    'BOOLEAN': { pgType: 'boolean', hasLength: false },
    'SMALLINT': { pgType: 'smallint', hasLength: false, serial: 'smallserial' },
    'INTEGER': { pgType: 'integer', hasLength: false, serial: 'serial' },
    'INT': { pgType: 'integer', hasLength: false, serial: 'serial' },
    'BIGINT': { pgType: 'bigint', hasLength: false, serial: 'bigserial' },
    'TINYINT': { pgType: 'smallint', hasLength: false },
    'FLOAT': { pgType: 'real', hasLength: false },
    'DOUBLE': { pgType: 'double precision', hasLength: false },
    'REAL': { pgType: 'real', hasLength: false },
    'DECIMAL': { pgType: 'numeric', hasLength: true },
    'NUMERIC': { pgType: 'numeric', hasLength: true },
    'DATE': { pgType: 'date', hasLength: false },
    'TIME': { pgType: 'time without time zone', hasLength: false },
    'DATETIME': { pgType: 'timestamp with time zone', hasLength: false },
    'TIMESTAMP': { pgType: 'timestamp without time zone', hasLength: false },
    'BLOB': { pgType: 'bytea', hasLength: false },
    'BINARY': { pgType: 'bytea', hasLength: false },
    'VARBINARY': { pgType: 'bytea', hasLength: false },
    'UUID': { pgType: 'uuid', hasLength: false },
    'JSON': { pgType: 'json', hasLength: false },
    'JSONB': { pgType: 'jsonb', hasLength: false },
    'XML': { pgType: 'xml', hasLength: false },
    'SERIAL': { pgType: 'serial', hasLength: false },
    'BIGSERIAL': { pgType: 'bigserial', hasLength: false }
}

// ============================================================
// Helpers
// ============================================================

/**
 * Get tag value by name from an element (case-insensitive).
 */
function getTagValue(elem, tagName) {
    const tags = elem.tags || []
    const lower = tagName.toLowerCase()
    for (let i = 0; i < tags.length; i++) {
        if (tags[i].name && tags[i].name.toLowerCase() === lower) {
            return tags[i].value
        }
    }
    return null
}

/**
 * Get the table name for an entity.
 * Uses 'table' tag if present, otherwise the entity name (spaces replaced with underscores).
 */
function getTableName(entity) {
    const tagValue = getTagValue(entity, 'table')
    if (tagValue) {
        return tagValue
    }
    return entity.name.replace(/ /g, '_')
}

/**
 * Get the column name.
 * Uses 'column' tag if present, otherwise the column name (spaces replaced with underscores).
 */
function getColumnName(col) {
    const tagValue = getTagValue(col, 'column')
    if (tagValue) {
        return tagValue
    }
    return col.name.replace(/ /g, '_')
}

/**
 * Get the schema name for a data model.
 * Uses 'schema' tag if present, defaults to 'public'.
 */
function getSchemaName(dataModel) {
    const tagValue = getTagValue(dataModel, 'schema')
    if (tagValue) {
        return tagValue
    }
    return 'public'
}

/**
 * Get the default value for a column from 'default' tag.
 */
function getDefaultValue(col) {
    return getTagValue(col, 'default')
}

/**
 * Map a StarUML column type to PostgreSQL type.
 * Supports auto-increment via length === '-1' (serial override).
 */
function mapColumnType(col) {
    const upperType = (col.type || 'VARCHAR').toUpperCase()
    const mapping = PG_TYPE_MAP[upperType]
    if (!mapping) {
        return col.type || 'varchar'
    }

    // Auto-increment: length == -1 triggers serial override
    if (mapping.serial && (col.length === '-1' || col.length === -1)) {
        return mapping.serial
    }

    let pgType = mapping.pgType
    if (mapping.hasLength && col.length && col.length !== '' && col.length !== '-1') {
        pgType += '(' + col.length + ')'
    }
    return pgType
}

/**
 * Escape a string for use in SQL single-quoted literals.
 */
function escapeComment(str) {
    if (!str) {
        return ''
    }
    return str.replace(/\\/g, '\\\\').replace(/'/g, "''")
}

/**
 * Ensure a SQL statement ends with a semicolon.
 */
function ensureSemicolon(stmt) {
    const trimmed = stmt.trim()
    if (trimmed.charAt(trimmed.length - 1) === ';') {
        return trimmed
    }
    return trimmed + ';'
}

function isSequenceTag(tag) {
    return tag && tag.name && tag.name.indexOf(SEQUENCE_PREFIX) === 0
}

function isIndexTag(tag) {
    return tag && tag.name && tag.name.indexOf(INDEX_PREFIX) === 0
}

/**
 * Build a schema-qualified name (always includes schema prefix).
 */
function qualifiedName(schema, name) {
    return schema + '.' + name
}

// ============================================================
// DDL Generation
// ============================================================

/**
 * Generate PostgreSQL DDL and write to the specified file path.
 *
 * @param {string} outputPath - Absolute file path for the DDL output
 * @param {string|null} dataModelId - Optional: generate only for this data model
 * @returns {void}
 */
function generate(outputPath, dataModelId) {
    const lines = []
    lines.push('-- PostgreSQL DDL')
    lines.push('-- Generated by StarUML Controller')
    lines.push('-- Date: ' + new Date().toLocaleString())
    lines.push('')

    let dataModels = app.repository.select('@ERDDataModel')
    if (dataModelId) {
        dataModels = dataModels.filter(function (dm) {
            return dm._id === dataModelId
        })
    }

    if (dataModels.length === 0) {
        lines.push('-- No data models found')
        fs.writeFileSync(outputPath, lines.join('\n'), 'utf8')
        return
    }

    const allSchemas = []
    const allDropSequences = []
    const allSequences = []
    const allDrops = []
    const allCreates = []
    const allUniques = []
    const allForeignKeys = []
    const allFkIndexes = []
    const allIndexes = []
    const allComments = []

    for (let dm = 0; dm < dataModels.length; dm++) {
        const dataModel = dataModels[dm]
        const schema = getSchemaName(dataModel)

        const entities = app.repository.select('@ERDEntity').filter(function (e) {
            return e._parent && e._parent._id === dataModel._id
        })

        if (entities.length === 0) {
            continue
        }

        // Schema creation
        if (schema !== 'public') {
            allSchemas.push('CREATE SCHEMA IF NOT EXISTS ' + schema + ';')
        }

        // Collect sequences from entity tags
        for (let e = 0; e < entities.length; e++) {
            const tags = entities[e].tags || []
            for (let t = 0; t < tags.length; t++) {
                if (isSequenceTag(tags[t]) && tags[t].value) {
                    let seqStmt = tags[t].value
                    // Extract sequence name for DROP SEQUENCE
                    const seqMatch = seqStmt.match(/CREATE SEQUENCE\s+(?:IF NOT EXISTS\s+)?(\S+)/i)
                    if (seqMatch) {
                        let seqName = seqMatch[1]
                        if (schema !== 'public' && seqName.indexOf('.') === -1) {
                            seqName = schema + '.' + seqName
                        } else if (schema === 'public' && seqName.indexOf('.') === -1) {
                            seqName = 'public.' + seqName
                        }
                        allDropSequences.push('DROP SEQUENCE IF EXISTS ' + seqName + ' CASCADE;')
                    }
                    // Always add schema prefix to CREATE SEQUENCE (consistent with CREATE TABLE etc.)
                    if (seqMatch && seqMatch[1].indexOf('.') === -1) {
                        seqStmt = seqStmt.replace(/CREATE SEQUENCE(\s+(?:IF NOT EXISTS\s+)?)/i, 'CREATE SEQUENCE$1' + schema + '.')
                    }
                    allSequences.push(ensureSemicolon(seqStmt))
                }
            }
        }

        // DROP TABLE statements (reverse order for dependency)
        for (let e = entities.length - 1; e >= 0; e--) {
            const fullName = qualifiedName(schema, getTableName(entities[e]))
            allDrops.push('DROP TABLE IF EXISTS ' + fullName + ' CASCADE;')
        }

        // CREATE TABLE statements
        for (let e = 0; e < entities.length; e++) {
            const entity = entities[e]
            const tableName = getTableName(entity)
            const fullTableName = qualifiedName(schema, tableName)
            const columns = entity.columns || []
            const pkColumns = []

            const tableLines = []
            tableLines.push('CREATE TABLE ' + fullTableName + ' (')

            const colDefs = []
            for (let c = 0; c < columns.length; c++) {
                const col = columns[c]
                const colName = getColumnName(col)
                const pgType = mapColumnType(col)
                let colDef = '    ' + colName + ' ' + pgType

                // NOT NULL for primary keys or non-nullable columns
                if (col.primaryKey || !col.nullable) {
                    colDef += ' NOT NULL'
                }

                // DEFAULT value (skip for serial types which have their own default)
                if (pgType.indexOf('serial') === -1) {
                    const defaultVal = getDefaultValue(col)
                    if (defaultVal !== null) {
                        colDef += ' DEFAULT ' + defaultVal
                    }
                }

                if (col.primaryKey) {
                    pkColumns.push(colName)
                }

                // Collect UNIQUE constraints
                if (col.unique) {
                    allUniques.push({
                        table: fullTableName,
                        column: colName
                    })
                }

                // Collect FOREIGN KEY constraints and auto-indexes from referenceTo
                if (col.referenceTo && col.referenceTo._parent) {
                    const refEntity = col.referenceTo._parent
                    const refTableName = getTableName(refEntity)
                    const refColName = getColumnName(col.referenceTo)
                    // Determine schema of the referenced entity's data model
                    let refSchema = schema
                    if (refEntity._parent && refEntity._parent instanceof type.ERDDataModel) {
                        refSchema = getSchemaName(refEntity._parent)
                    }
                    const refFullTableName = qualifiedName(refSchema, refTableName)
                    allForeignKeys.push({
                        table: fullTableName,
                        column: colName,
                        refTable: refFullTableName,
                        refColumn: refColName,
                        constraintName: 'FK_' + tableName + '_' + colName
                    })

                    // Auto-index on FK column (anonymous, like staruml-postgresql)
                    allFkIndexes.push('CREATE INDEX ON ' + fullTableName + '\n    (' + colName + ');')
                }

                colDefs.push(colDef)
            }

            // PRIMARY KEY constraint
            if (pkColumns.length > 0) {
                colDefs.push('    PRIMARY KEY (' + pkColumns.join(', ') + ')')
            }

            tableLines.push(colDefs.join(',\n'))
            tableLines.push(') WITHOUT OIDS;')
            allCreates.push(tableLines.join('\n'))
            allCreates.push('')

            // Collect COMMENT ON TABLE
            if (entity.documentation) {
                allComments.push('COMMENT ON TABLE ' + fullTableName + " IS '" + escapeComment(entity.documentation) + "';")
            }

            // Collect COMMENT ON COLUMN
            for (let c = 0; c < columns.length; c++) {
                if (columns[c].documentation) {
                    allComments.push('COMMENT ON COLUMN ' + fullTableName + '.' + getColumnName(columns[c]) + " IS '" + escapeComment(columns[c].documentation) + "';")
                }
            }

            // Collect user-defined indexes from index# tags
            const entityTags = entity.tags || []
            for (let t = 0; t < entityTags.length; t++) {
                if (isIndexTag(entityTags[t]) && entityTags[t].value) {
                    let idxStmt = entityTags[t].value
                    // Add schema prefix to table name in CREATE INDEX if not already qualified
                    idxStmt = idxStmt.replace(/\bON\s+(?!public\.|[\w]+\.)(\w+)/i, 'ON ' + schema + '.$1')
                    allIndexes.push(ensureSemicolon(idxStmt))
                }
            }
        }
    }

    // ---- Assemble DDL ----

    // Schema creation
    if (allSchemas.length > 0) {
        lines.push('-- Schema')
        for (let i = 0; i < allSchemas.length; i++) {
            lines.push(allSchemas[i])
        }
        lines.push('')
    }

    // Drop sequences (manually created ones are not auto-dropped with tables)
    if (allDropSequences.length > 0) {
        lines.push('-- Drop sequences')
        for (let i = 0; i < allDropSequences.length; i++) {
            lines.push(allDropSequences[i])
        }
        lines.push('')
    }

    // Drop tables
    if (allDrops.length > 0) {
        lines.push('-- Drop tables')
        for (let i = 0; i < allDrops.length; i++) {
            lines.push(allDrops[i])
        }
        lines.push('')
    }

    // Sequences
    if (allSequences.length > 0) {
        lines.push('-- Sequences')
        for (let i = 0; i < allSequences.length; i++) {
            lines.push(allSequences[i])
        }
        lines.push('')
    }

    // Create tables
    if (allCreates.length > 0) {
        lines.push('-- Create tables')
        for (let i = 0; i < allCreates.length; i++) {
            lines.push(allCreates[i])
        }
    }

    // Unique constraints
    if (allUniques.length > 0) {
        lines.push('-- Unique constraints')
        for (let i = 0; i < allUniques.length; i++) {
            lines.push('ALTER TABLE ' + allUniques[i].table + ' ADD UNIQUE (' + allUniques[i].column + ');')
        }
        lines.push('')
    }

    // FK column indexes (anonymous)
    if (allFkIndexes.length > 0) {
        lines.push('-- FK indexes')
        for (let i = 0; i < allFkIndexes.length; i++) {
            lines.push(allFkIndexes[i])
        }
        lines.push('')
    }

    // Foreign key constraints
    if (allForeignKeys.length > 0) {
        lines.push('-- Foreign key constraints')
        for (let i = 0; i < allForeignKeys.length; i++) {
            const fk = allForeignKeys[i]
            lines.push('ALTER TABLE ' + fk.table + ' ADD CONSTRAINT ' + fk.constraintName + ' FOREIGN KEY (' + fk.column + ') REFERENCES ' + fk.refTable + ' (' + fk.refColumn + ');')
        }
        lines.push('')
    }

    // Indexes
    if (allIndexes.length > 0) {
        lines.push('-- Indexes')
        for (let i = 0; i < allIndexes.length; i++) {
            lines.push(allIndexes[i])
        }
        lines.push('')
    }

    // Comments
    if (allComments.length > 0) {
        lines.push('-- Comments')
        for (let i = 0; i < allComments.length; i++) {
            lines.push(allComments[i])
        }
        lines.push('')
    }

    fs.writeFileSync(outputPath, lines.join('\n'), 'utf8')
}

exports.generate = generate
exports.PG_TYPE_MAP = PG_TYPE_MAP
