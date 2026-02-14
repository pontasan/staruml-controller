# StarUML Controller

A [StarUML](https://staruml.io/) extension that exposes full diagram CRUD operations for all StarUML diagram types via an HTTP REST API.

Supports UML (class, sequence, use case, activity, state machine, component, deployment, object, communication, composite structure, timing, interaction overview, information flow, profile), BPMN, C4, SysML, Wireframe, MindMap, AWS, Azure, GCP, Flowchart, DFD, and ERD.

Designed for integration with AI tools such as Claude Code (via MCP) to programmatically create and edit any StarUML diagram.

<p align="center">
  <img src="images/image1.gif" alt="AI generating a Web Shopping ER diagram in StarUML via REST API" width="800">
  <br>
  <em>An AI tool creating a complete Web Shopping ER diagram through the StarUML Controller API</em>
</p>

<p align="center">
  <img src="images/image2.jpg" alt="PostgreSQL DDL generated from an ER diagram by StarUML Controller" width="800">
  <br>
  <em>PostgreSQL DDL exported from the ER diagram via the API</em>
</p>

<p align="center">
  <img src="images/image3.gif" alt="AI generating a Login Check sequence diagram from source code in StarUML via REST API" width="800">
  <br>
  <em>An AI tool analyzing source code and generating a Login Check sequence diagram through the API</em>
</p>

## Architecture Overview

<p align="center">
  <img src="images/architecture.svg" alt="Architecture overview: Claude Code communicates with staruml-controller-mcp via MCP protocol, which connects to StarUML's staruml-controller extension via HTTP REST API" width="800">
</p>

## Supported Versions

- StarUML v6 and later (`engines.staruml: ">=6.0.0"`)

## Features

- **All diagram types** - UML, BPMN, C4, SysML, Wireframe, MindMap, AWS, Azure, GCP, Flowchart, DFD via generic endpoints
- **All element types** - create any node element on any diagram (UMLClass, BPMNTask, C4Person, SysMLRequirement, WFButton, MMNode, AWSService, etc.)
- **All relation types** - UMLAssociation, BPMNSequenceFlow, C4Relationship, SysMLDeriveReqt, MMEdge, AWSArrow, etc.
- **Full CRUD for ERD elements** - data models, diagrams, entities, columns, tags, relationships, sequences, and indexes
- **Full CRUD for sequence diagram elements** - interactions, sequence diagrams, lifelines, messages, combined fragments, operands, state invariants, and interaction uses
- **Shapes** - create and manage view-only elements (Text, TextBox, Rect, RoundRect, Ellipse, Hyperlink, Image, etc.)
- **Notes, note links, and free lines** - annotate any diagram
- **View manipulation** - move/resize views, update styles (fillColor, lineColor, fontColor, fontSize, autoResize, stereotypeDisplay, etc.), reconnect edges, align/distribute views
- **Child elements** - create attributes, operations, enumeration literals, pins, etc. under parent elements
- **Diagram export** - export diagrams to PNG, JPEG, SVG, or PDF; bulk export all diagrams; export project as HTML/Markdown
- **Auto layout** - automatic diagram layout with configurable direction and spacing
- **Undo / Redo** - undo and redo operations programmatically
- **Search** - search elements by keyword with optional type filter
- **Model validation** - validate model integrity
- **Input validation** - unknown fields rejected, type checking, required field enforcement, column type whitelist
- **Referential integrity** - DELETE blocked when other elements reference the target; self-reference prevention
- **Structured responses** - every response includes `success`, `message`/`error`, `request` context, and `data`
- **PostgreSQL DDL generation** - generate DDL from ER diagrams with schema prefix, FK auto-indexes, DEFAULT values (based on [staruml-postgresql](https://github.com/adrianandrei-ca/staruml-postgresql))
- **Mermaid import** - generate StarUML diagrams from Mermaid syntax (class, sequence, flowchart, ER, mindmap, requirement, state)
- **Diagram generation** - auto-generate overview, type hierarchy, or package structure diagrams from model
- **Project management** - save, open, new, close, import/export model fragments
- **CORS enabled** - accessible from any origin

## Installation

Clone or copy this repository into the StarUML extensions folder:

```
# macOS
~/Library/Application Support/StarUML/extensions/user/staruml-controller

# Windows
%APPDATA%\StarUML\extensions\user\staruml-controller

# Linux
~/.config/StarUML/extensions/user/staruml-controller
```

Restart StarUML to load the extension.

## Usage

### Starting the Server

1. **Launch StarUML** and open a project (or create a new one)

2. From the menu bar, select **Tools > StarUML Controller > Start Server...**

<p align="center">
  <img src="images/image4.jpg" alt="Tools menu showing StarUML Controller submenu with Start Server and Stop Server options" width="700">
</p>

3. A dialog appears asking for the port number. Enter a port (default: `12345`) and click **OK**

<p align="center">
  <img src="images/image5.jpg" alt="Port number input dialog with default value 12345" width="400">
</p>

4. The HTTP server starts and all diagrams become accessible via REST API

### Stopping the Server

Select **Tools > StarUML Controller > Stop Server** from the menu bar.

## API Endpoints

### General

| Endpoint | Method | Description |
|---|---|---|
| `/api/status` | GET | Health check and endpoint list |
| `/api/elements/:id` | GET / PUT / DELETE | Get, update, or delete any element |
| `/api/elements/:id/tags` | GET / POST | List or create tags |
| `/api/tags/:id` | GET / PUT / DELETE | Get, update, or delete tag |
| `/api/elements/:id/children` | POST | Create child element (attribute, operation, etc.) |
| `/api/elements/:id/relationships` | GET | Get all relationships of an element |
| `/api/elements/:id/views` | GET | Get all views of an element |
| `/api/elements/:id/relocate` | PUT | Move element to a different parent |
| `/api/elements/:id/reorder` | PUT | Reorder element within parent (up/down) |
| `/api/diagrams` | GET / POST | List or create diagrams |
| `/api/diagrams/:id` | GET / PUT / DELETE | Get, update, or delete diagram |
| `/api/diagrams/:id/elements` | GET / POST | List or create node elements |
| `/api/diagrams/:id/relations` | POST | Create relations |
| `/api/diagrams/:id/export` | POST | Export diagram (PNG/JPEG/SVG/PDF) |
| `/api/diagrams/:id/layout` | POST | Auto-layout diagram |
| `/api/diagrams/:id/open` | POST | Open diagram in editor |
| `/api/diagrams/:id/zoom` | PUT | Set zoom level |
| `/api/diagrams/:id/create-view-of` | POST | Create view of existing model on diagram |
| `/api/diagrams/:id/link-object` | POST | Create UMLLinkObject on object diagram |
| `/api/diagrams/:id/notes` | GET / POST | List or create notes |
| `/api/notes/:id` | GET / PUT / DELETE | Get, update, or delete note |
| `/api/diagrams/:id/note-links` | GET / POST | List or create note links |
| `/api/note-links/:id` | DELETE | Delete note link |
| `/api/diagrams/:id/free-lines` | GET / POST | List or create free lines |
| `/api/free-lines/:id` | DELETE | Delete free line |
| `/api/diagrams/:id/shapes` | GET / POST | List or create shapes |
| `/api/shapes/:id` | GET / PUT / DELETE | Get, update, or delete shape |
| `/api/diagrams/:id/views` | GET | List all views on diagram |
| `/api/views/:id` | PUT | Move/resize view |
| `/api/views/:id/style` | PUT | Update view style (fillColor, lineColor, autoResize, etc.) |
| `/api/views/:id/reconnect` | PUT | Reconnect edge to different source/target |
| `/api/views/align` | POST | Align/distribute views |
| `/api/project/save` | POST | Save project |
| `/api/project/open` | POST | Open project |
| `/api/project/new` | POST | Create new project |
| `/api/project/close` | POST | Close project |
| `/api/project/import` | POST | Import model fragment |
| `/api/project/export` | POST | Export model fragment |
| `/api/project/export-all` | POST | Export all diagrams as images |
| `/api/project/export-doc` | POST | Export project as HTML/Markdown |
| `/api/undo` | POST | Undo last operation |
| `/api/redo` | POST | Redo last undone operation |
| `/api/search` | GET | Search elements by keyword |
| `/api/validate` | POST | Validate model integrity |
| `/api/mermaid/import` | POST | Generate diagram from Mermaid syntax |
| `/api/diagrams/generate` | POST | Auto-generate diagram from model |

### ERD

| Endpoint | Method | Description |
|---|---|---|
| `/api/erd/data-models` | GET / POST | List or create data models |
| `/api/erd/data-models/:id` | GET / PUT / DELETE | Get, update, or delete data model |
| `/api/erd/diagrams` | GET / POST | List or create ER diagrams |
| `/api/erd/diagrams/:id` | GET / PUT / DELETE | Get, update, or delete diagram |
| `/api/erd/entities` | GET / POST | List (filterable) or create entities |
| `/api/erd/entities/:id` | GET / PUT / DELETE | Get, update, or delete entity |
| `/api/erd/entities/:id/columns` | GET / POST | List or create columns |
| `/api/erd/columns/:id` | GET / PUT / DELETE | Get, update, or delete column |
| `/api/erd/entities/:id/sequences` | GET / POST | List or create sequences |
| `/api/erd/sequences/:id` | GET / PUT / DELETE | Get, update, or delete sequence |
| `/api/erd/entities/:id/indexes` | GET / POST | List or create indexes |
| `/api/erd/indexes/:id` | GET / PUT / DELETE | Get, update, or delete index |
| `/api/erd/relationships` | GET / POST | List (filterable) or create relationships |
| `/api/erd/relationships/:id` | GET / PUT / DELETE | Get, update, or delete relationship |
| `/api/erd/postgresql/ddl` | POST | Generate PostgreSQL DDL to a file |

### Sequence Diagram

| Endpoint | Method | Description |
|---|---|---|
| `/api/seq/interactions` | GET / POST | List or create interactions |
| `/api/seq/interactions/:id` | GET / PUT / DELETE | Get, update, or delete interaction |
| `/api/seq/diagrams` | GET / POST | List or create sequence diagrams |
| `/api/seq/diagrams/:id` | GET / PUT / DELETE | Get, update, or delete sequence diagram |
| `/api/seq/interactions/:id/lifelines` | GET / POST | List or create lifelines |
| `/api/seq/lifelines/:id` | GET / PUT / DELETE | Get, update, or delete lifeline |
| `/api/seq/interactions/:id/messages` | GET / POST | List or create messages |
| `/api/seq/messages/:id` | GET / PUT / DELETE | Get, update, or delete message |
| `/api/seq/interactions/:id/combined-fragments` | GET / POST | List or create combined fragments |
| `/api/seq/combined-fragments/:id` | GET / PUT / DELETE | Get, update, or delete combined fragment |
| `/api/seq/combined-fragments/:id/operands` | GET / POST | List or add operands |
| `/api/seq/operands/:id` | GET / PUT / DELETE | Get, update, or delete operand |
| `/api/seq/interactions/:id/state-invariants` | GET / POST | List or create state invariants |
| `/api/seq/state-invariants/:id` | GET / PUT / DELETE | Get, update, or delete state invariant |
| `/api/seq/interactions/:id/interaction-uses` | GET / POST | List or create interaction uses |
| `/api/seq/interaction-uses/:id` | GET / PUT / DELETE | Get, update, or delete interaction use |

For full API specifications including request/response formats, validation rules, and error codes, see the [API Documentation](https://pontasan.github.io/staruml-controller/api.html).

## Examples

```bash
# Health check
curl http://localhost:12345/api/status

# Create a data model
curl -X POST http://localhost:12345/api/erd/data-models \
  -H "Content-Type: application/json" \
  -d '{"name": "MyDB"}'

# Create a diagram
curl -X POST http://localhost:12345/api/erd/diagrams \
  -H "Content-Type: application/json" \
  -d '{"parentId": "DATA_MODEL_ID", "name": "Main ER Diagram"}'

# Create entity with diagram placement
curl -X POST http://localhost:12345/api/erd/entities \
  -H "Content-Type: application/json" \
  -d '{"parentId": "DATA_MODEL_ID", "name": "users", "diagramId": "DIAGRAM_ID"}'

# Add column
curl -X POST http://localhost:12345/api/erd/entities/ENTITY_ID/columns \
  -H "Content-Type: application/json" \
  -d '{"name": "email", "type": "VARCHAR", "length": "255", "unique": true}'

# Set foreign key reference
curl -X PUT http://localhost:12345/api/erd/columns/COLUMN_ID \
  -H "Content-Type: application/json" \
  -d '{"foreignKey": true, "referenceToId": "TARGET_COLUMN_ID"}'

# Create relationship
curl -X POST http://localhost:12345/api/erd/relationships \
  -H "Content-Type: application/json" \
  -d '{"parentId": "DATA_MODEL_ID", "diagramId": "DIAGRAM_ID", "end1": {"reference": "ENTITY1_ID", "cardinality": "1"}, "end2": {"reference": "ENTITY2_ID", "cardinality": "0..*"}}'

# Create sequence
curl -X POST http://localhost:12345/api/erd/entities/ENTITY_ID/sequences \
  -H "Content-Type: application/json" \
  -d '{"name": "users_id_seq"}'

# Create index
curl -X POST http://localhost:12345/api/erd/entities/ENTITY_ID/indexes \
  -H "Content-Type: application/json" \
  -d '{"name": "idx_email", "definition": "CREATE INDEX idx_email ON users (email)"}'

# Set default value on a column (via tag)
curl -X POST http://localhost:12345/api/elements/COLUMN_ID/tags \
  -H "Content-Type: application/json" \
  -d '{"name": "default", "kind": 0, "value": "now()"}'

# Generate PostgreSQL DDL
curl -X POST http://localhost:12345/api/erd/postgresql/ddl \
  -H "Content-Type: application/json" \
  -d '{"path": "/Users/xxx/output.sql"}'

# Save project
curl -X POST http://localhost:12345/api/project/save \
  -H "Content-Type: application/json" \
  -d '{"path": "/Users/xxx/my-project.mdj"}'

# Delete entity (blocked if referenced by other elements)
curl -X DELETE http://localhost:12345/api/erd/entities/ENTITY_ID

# --- Generic Diagrams ---

# Create a BPMN diagram
curl -X POST http://localhost:12345/api/diagrams \
  -H "Content-Type: application/json" \
  -d '{"type": "BPMNDiagram", "name": "My Process"}'

# Create a node element on a diagram
curl -X POST http://localhost:12345/api/diagrams/DIAGRAM_ID/elements \
  -H "Content-Type: application/json" \
  -d '{"type": "BPMNTask", "name": "Review Order"}'

# Create a relation between elements
curl -X POST http://localhost:12345/api/diagrams/DIAGRAM_ID/relations \
  -H "Content-Type: application/json" \
  -d '{"type": "BPMNSequenceFlow", "sourceId": "ELEMENT1_ID", "targetId": "ELEMENT2_ID"}'

# Export diagram as PNG
curl -X POST http://localhost:12345/api/diagrams/DIAGRAM_ID/export \
  -H "Content-Type: application/json" \
  -d '{"format": "png", "path": "/tmp/diagram.png"}'

# Search elements
curl "http://localhost:12345/api/search?keyword=User&type=UMLClass"

# --- Sequence Diagram ---

# Create an interaction
curl -X POST http://localhost:12345/api/seq/interactions \
  -H "Content-Type: application/json" \
  -d '{"name": "Login Flow"}'

# Create a sequence diagram
curl -X POST http://localhost:12345/api/seq/diagrams \
  -H "Content-Type: application/json" \
  -d '{"parentId": "INTERACTION_ID", "name": "Login Sequence"}'

# Create lifelines with diagram placement
curl -X POST http://localhost:12345/api/seq/interactions/INTERACTION_ID/lifelines \
  -H "Content-Type: application/json" \
  -d '{"name": "Client", "diagramId": "DIAGRAM_ID"}'

# Create a message between lifelines
curl -X POST http://localhost:12345/api/seq/interactions/INTERACTION_ID/messages \
  -H "Content-Type: application/json" \
  -d '{"name": "login()", "messageSort": "synchCall", "source": "LIFELINE1_ID", "target": "LIFELINE2_ID", "diagramId": "DIAGRAM_ID"}'

# Create a combined fragment (alt/opt/loop)
curl -X POST http://localhost:12345/api/seq/interactions/INTERACTION_ID/combined-fragments \
  -H "Content-Type: application/json" \
  -d '{"interactionOperator": "alt", "diagramId": "DIAGRAM_ID"}'

# Add operand to a combined fragment
curl -X POST http://localhost:12345/api/seq/combined-fragments/FRAGMENT_ID/operands \
  -H "Content-Type: application/json" \
  -d '{"guard": "[success]"}'
```

## File Structure

```
staruml-controller/
├── main.js            # Extension entry point (HTTP server management)
├── api-handler.js     # REST API routing and handlers
├── ddl-generator.js   # PostgreSQL DDL generation
├── menus/
│   └── menu.json      # StarUML menu definition
├── docs/
│   └── api.html       # API documentation (HTML)
├── images/
│   ├── architecture.svg  # Architecture overview diagram
│   ├── image1.gif     # ER diagram demo animation
│   ├── image2.jpg     # PostgreSQL DDL export screenshot
│   ├── image3.gif     # Sequence diagram demo animation
│   ├── image4.jpg     # Tools menu screenshot
│   └── image5.jpg     # Port number dialog screenshot
├── test/
│   └── test_all_endpoints.sh  # Integration test script
├── package.json       # Extension metadata
└── README.md
```

## Acknowledgments

The PostgreSQL DDL generation feature is based on [staruml-postgresql](https://github.com/adrianandrei-ca/staruml-postgresql) by Adrian Andrei. The type mapping and DDL output logic were ported from that extension.

## License

MIT
