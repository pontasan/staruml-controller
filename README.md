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

- Tested on StarUML v7 (should also work on v6)

## Features

- **All diagram types** - UML, BPMN, C4, SysML, Wireframe, MindMap, AWS, Azure, GCP, Flowchart, DFD via generic and dedicated family APIs
- **Dedicated family APIs** - 23 diagram families with type-specific CRUD endpoints (Class, Use Case, Activity, State Machine, Component, Deployment, Object, Communication, Composite Structure, Information Flow, Profile, Timing, Interaction Overview, Flowchart, DFD, BPMN, C4, SysML, Wireframe, MindMap, AWS, Azure, GCP)
- **All element types** - create any node element on any diagram (UMLClass, BPMNTask, C4Person, SysMLRequirement, WFButton, MMNode, AWSService, etc.)
- **All relation types** - UMLAssociation, BPMNSequenceFlow, C4Relationship, SysMLDeriveReqt, MMEdge, AWSArrow, etc.
- **Full CRUD for ERD elements** - data models, diagrams, entities, columns, tags, relationships, sequences, and indexes
- **Full CRUD for sequence diagram elements** - interactions, sequence diagrams, lifelines, messages, combined fragments, operands, state invariants, and interaction uses
- **Shapes** - create and manage view-only elements (Text, TextBox, Rect, RoundRect, Ellipse, Hyperlink, Image, UMLFrame)
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
| `/api/views/:id/style` | PUT | Update view style (fillColor, lineColor, autoResize, suppressAttributes, suppressOperations, etc.) |
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

### Diagram Family APIs

Each diagram family below provides dedicated CRUD endpoints with type-specific validation. All families share a common pattern: 5 endpoints for diagrams, 5 per resource, 2 per child, and 5 per relation. See the [API Documentation](https://pontasan.github.io/staruml-controller/api.html) for full details including the common CRUD pattern.

#### Class/Package Diagram (`/api/class/`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/class/diagrams` | GET / POST | List or create class/package diagrams |
| `/api/class/diagrams/:id` | GET / PUT / DELETE | Get, update, or delete diagram |
| `/api/class/classes` | GET / POST | List or create classes |
| `/api/class/classes/:id` | GET / PUT / DELETE | Get, update, or delete class |
| `/api/class/classes/:id/attributes` | GET / POST | List or create attributes |
| `/api/class/classes/:id/operations` | GET / POST | List or create operations |
| `/api/class/classes/:id/receptions` | GET / POST | List or create receptions |
| `/api/class/classes/:id/template-parameters` | GET / POST | List or create template parameters |
| `/api/class/interfaces` | GET / POST | List or create interfaces |
| `/api/class/interfaces/:id` | GET / PUT / DELETE | Get, update, or delete interface |
| `/api/class/interfaces/:id/attributes` | GET / POST | List or create attributes |
| `/api/class/interfaces/:id/operations` | GET / POST | List or create operations |
| `/api/class/enumerations` | GET / POST | List or create enumerations |
| `/api/class/enumerations/:id` | GET / PUT / DELETE | Get, update, or delete enumeration |
| `/api/class/enumerations/:id/literals` | GET / POST | List or create enumeration literals |
| `/api/class/data-types` | GET / POST | List or create data types |
| `/api/class/data-types/:id` | GET / PUT / DELETE | Get, update, or delete data type |
| `/api/class/packages` | GET / POST | List or create packages |
| `/api/class/packages/:id` | GET / PUT / DELETE | Get, update, or delete package |
| `/api/class/associations` | GET / POST | List or create associations |
| `/api/class/associations/:id` | GET / PUT / DELETE | Get, update, or delete association |
| `/api/class/generalizations` | GET / POST | List or create generalizations |
| `/api/class/generalizations/:id` | GET / PUT / DELETE | Get, update, or delete generalization |
| `/api/class/dependencies` | GET / POST | List or create dependencies |
| `/api/class/dependencies/:id` | GET / PUT / DELETE | Get, update, or delete dependency |
| `/api/class/interface-realizations` | GET / POST | List or create interface realizations |
| `/api/class/interface-realizations/:id` | GET / PUT / DELETE | Get, update, or delete interface realization |
| `/api/class/realizations` | GET / POST | List or create realizations |
| `/api/class/realizations/:id` | GET / PUT / DELETE | Get, update, or delete realization |
| `/api/class/template-bindings` | GET / POST | List or create template bindings |
| `/api/class/template-bindings/:id` | GET / PUT / DELETE | Get, update, or delete template binding |

#### Use Case Diagram (`/api/usecase/`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/usecase/diagrams` | GET / POST | List or create use case diagrams |
| `/api/usecase/diagrams/:id` | GET / PUT / DELETE | Get, update, or delete diagram |
| `/api/usecase/actors` | GET / POST | List or create actors |
| `/api/usecase/actors/:id` | GET / PUT / DELETE | Get, update, or delete actor |
| `/api/usecase/use-cases` | GET / POST | List or create use cases |
| `/api/usecase/use-cases/:id` | GET / PUT / DELETE | Get, update, or delete use case |
| `/api/usecase/use-cases/:id/extension-points` | GET / POST | List or create extension points |
| `/api/usecase/subjects` | GET / POST | List or create subjects |
| `/api/usecase/subjects/:id` | GET / PUT / DELETE | Get, update, or delete subject |
| `/api/usecase/associations` | GET / POST | List or create associations |
| `/api/usecase/associations/:id` | GET / PUT / DELETE | Get, update, or delete association |
| `/api/usecase/includes` | GET / POST | List or create includes |
| `/api/usecase/includes/:id` | GET / PUT / DELETE | Get, update, or delete include |
| `/api/usecase/extends` | GET / POST | List or create extends |
| `/api/usecase/extends/:id` | GET / PUT / DELETE | Get, update, or delete extend |
| `/api/usecase/generalizations` | GET / POST | List or create generalizations |
| `/api/usecase/generalizations/:id` | GET / PUT / DELETE | Get, update, or delete generalization |
| `/api/usecase/dependencies` | GET / POST | List or create dependencies |
| `/api/usecase/dependencies/:id` | GET / PUT / DELETE | Get, update, or delete dependency |

#### Activity Diagram (`/api/activity/`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/activity/diagrams` | GET / POST | List or create activity diagrams |
| `/api/activity/diagrams/:id` | GET / PUT / DELETE | Get, update, or delete diagram |
| `/api/activity/actions` | GET / POST | List or create actions |
| `/api/activity/actions/:id` | GET / PUT / DELETE | Get, update, or delete action |
| `/api/activity/actions/:id/pins` | GET / POST | List or create input pins |
| `/api/activity/actions/:id/output-pins` | GET / POST | List or create output pins |
| `/api/activity/control-nodes` | GET / POST | List or create control nodes |
| `/api/activity/control-nodes/:id` | GET / PUT / DELETE | Get, update, or delete control node |
| `/api/activity/object-nodes` | GET / POST | List or create object nodes |
| `/api/activity/object-nodes/:id` | GET / PUT / DELETE | Get, update, or delete object node |
| `/api/activity/partitions` | GET / POST | List or create partitions |
| `/api/activity/partitions/:id` | GET / PUT / DELETE | Get, update, or delete partition |
| `/api/activity/regions` | GET / POST | List or create regions |
| `/api/activity/regions/:id` | GET / PUT / DELETE | Get, update, or delete region |
| `/api/activity/control-flows` | GET / POST | List or create control flows |
| `/api/activity/control-flows/:id` | GET / PUT / DELETE | Get, update, or delete control flow |
| `/api/activity/object-flows` | GET / POST | List or create object flows |
| `/api/activity/object-flows/:id` | GET / PUT / DELETE | Get, update, or delete object flow |
| `/api/activity/exception-handlers` | GET / POST | List or create exception handlers |
| `/api/activity/exception-handlers/:id` | GET / PUT / DELETE | Get, update, or delete exception handler |
| `/api/activity/activity-interrupts` | GET / POST | List or create activity interrupts |
| `/api/activity/activity-interrupts/:id` | GET / PUT / DELETE | Get, update, or delete activity interrupt |

#### State Machine Diagram (`/api/statemachine/`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/statemachine/diagrams` | GET / POST | List or create state machine diagrams |
| `/api/statemachine/diagrams/:id` | GET / PUT / DELETE | Get, update, or delete diagram |
| `/api/statemachine/states` | GET / POST | List or create states |
| `/api/statemachine/states/:id` | GET / PUT / DELETE | Get, update, or delete state |
| `/api/statemachine/states/:id/regions` | GET / POST | List or create regions |
| `/api/statemachine/pseudostates` | GET / POST | List or create pseudostates |
| `/api/statemachine/pseudostates/:id` | GET / PUT / DELETE | Get, update, or delete pseudostate |
| `/api/statemachine/final-states` | GET / POST | List or create final states |
| `/api/statemachine/final-states/:id` | GET / PUT / DELETE | Get, update, or delete final state |
| `/api/statemachine/transitions` | GET / POST | List or create transitions |
| `/api/statemachine/transitions/:id` | GET / PUT / DELETE | Get, update, or delete transition |

#### Component Diagram (`/api/component/`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/component/diagrams` | GET / POST | List or create component diagrams |
| `/api/component/diagrams/:id` | GET / PUT / DELETE | Get, update, or delete diagram |
| `/api/component/components` | GET / POST | List or create components |
| `/api/component/components/:id` | GET / PUT / DELETE | Get, update, or delete component |
| `/api/component/artifacts` | GET / POST | List or create artifacts |
| `/api/component/artifacts/:id` | GET / PUT / DELETE | Get, update, or delete artifact |
| `/api/component/component-realizations` | GET / POST | List or create component realizations |
| `/api/component/component-realizations/:id` | GET / PUT / DELETE | Get, update, or delete component realization |
| `/api/component/dependencies` | GET / POST | List or create dependencies |
| `/api/component/dependencies/:id` | GET / PUT / DELETE | Get, update, or delete dependency |
| `/api/component/generalizations` | GET / POST | List or create generalizations |
| `/api/component/generalizations/:id` | GET / PUT / DELETE | Get, update, or delete generalization |
| `/api/component/interface-realizations` | GET / POST | List or create interface realizations |
| `/api/component/interface-realizations/:id` | GET / PUT / DELETE | Get, update, or delete interface realization |

#### Deployment Diagram (`/api/deployment/`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/deployment/diagrams` | GET / POST | List or create deployment diagrams |
| `/api/deployment/diagrams/:id` | GET / PUT / DELETE | Get, update, or delete diagram |
| `/api/deployment/nodes` | GET / POST | List or create nodes |
| `/api/deployment/nodes/:id` | GET / PUT / DELETE | Get, update, or delete node |
| `/api/deployment/node-instances` | GET / POST | List or create node instances |
| `/api/deployment/node-instances/:id` | GET / PUT / DELETE | Get, update, or delete node instance |
| `/api/deployment/artifact-instances` | GET / POST | List or create artifact instances |
| `/api/deployment/artifact-instances/:id` | GET / PUT / DELETE | Get, update, or delete artifact instance |
| `/api/deployment/component-instances` | GET / POST | List or create component instances |
| `/api/deployment/component-instances/:id` | GET / PUT / DELETE | Get, update, or delete component instance |
| `/api/deployment/artifacts` | GET / POST | List or create artifacts |
| `/api/deployment/artifacts/:id` | GET / PUT / DELETE | Get, update, or delete artifact |
| `/api/deployment/deployments` | GET / POST | List or create deployments |
| `/api/deployment/deployments/:id` | GET / PUT / DELETE | Get, update, or delete deployment |
| `/api/deployment/communication-paths` | GET / POST | List or create communication paths |
| `/api/deployment/communication-paths/:id` | GET / PUT / DELETE | Get, update, or delete communication path |
| `/api/deployment/dependencies` | GET / POST | List or create dependencies |
| `/api/deployment/dependencies/:id` | GET / PUT / DELETE | Get, update, or delete dependency |

#### Object Diagram (`/api/object/`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/object/diagrams` | GET / POST | List or create object diagrams |
| `/api/object/diagrams/:id` | GET / PUT / DELETE | Get, update, or delete diagram |
| `/api/object/objects` | GET / POST | List or create objects |
| `/api/object/objects/:id` | GET / PUT / DELETE | Get, update, or delete object |
| `/api/object/objects/:id/slots` | GET / POST | List or create slots |
| `/api/object/links` | GET / POST | List or create links |
| `/api/object/links/:id` | GET / PUT / DELETE | Get, update, or delete link |

#### Communication Diagram (`/api/communication/`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/communication/diagrams` | GET / POST | List or create communication diagrams |
| `/api/communication/diagrams/:id` | GET / PUT / DELETE | Get, update, or delete diagram |
| `/api/communication/lifelines` | GET / POST | List or create lifelines |
| `/api/communication/lifelines/:id` | GET / PUT / DELETE | Get, update, or delete lifeline |
| `/api/communication/connectors` | GET / POST | List or create connectors |
| `/api/communication/connectors/:id` | GET / PUT / DELETE | Get, update, or delete connector |

#### Composite Structure Diagram (`/api/composite/`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/composite/diagrams` | GET / POST | List or create composite structure diagrams |
| `/api/composite/diagrams/:id` | GET / PUT / DELETE | Get, update, or delete diagram |
| `/api/composite/ports` | GET / POST | List or create ports |
| `/api/composite/ports/:id` | GET / PUT / DELETE | Get, update, or delete port |
| `/api/composite/parts` | GET / POST | List or create parts |
| `/api/composite/parts/:id` | GET / PUT / DELETE | Get, update, or delete part |
| `/api/composite/collaborations` | GET / POST | List or create collaborations |
| `/api/composite/collaborations/:id` | GET / PUT / DELETE | Get, update, or delete collaboration |
| `/api/composite/collaboration-uses` | GET / POST | List or create collaboration uses |
| `/api/composite/collaboration-uses/:id` | GET / PUT / DELETE | Get, update, or delete collaboration use |
| `/api/composite/role-bindings` | GET / POST | List or create role bindings |
| `/api/composite/role-bindings/:id` | GET / PUT / DELETE | Get, update, or delete role binding |
| `/api/composite/dependencies` | GET / POST | List or create dependencies |
| `/api/composite/dependencies/:id` | GET / PUT / DELETE | Get, update, or delete dependency |
| `/api/composite/realizations` | GET / POST | List or create realizations |
| `/api/composite/realizations/:id` | GET / PUT / DELETE | Get, update, or delete realization |

#### Information Flow Diagram (`/api/infoflow/`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/infoflow/diagrams` | GET / POST | List or create information flow diagrams |
| `/api/infoflow/diagrams/:id` | GET / PUT / DELETE | Get, update, or delete diagram |
| `/api/infoflow/info-items` | GET / POST | List or create information items |
| `/api/infoflow/info-items/:id` | GET / PUT / DELETE | Get, update, or delete information item |
| `/api/infoflow/information-flows` | GET / POST | List or create information flows |
| `/api/infoflow/information-flows/:id` | GET / PUT / DELETE | Get, update, or delete information flow |

#### Profile Diagram (`/api/profile/`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/profile/diagrams` | GET / POST | List or create profile diagrams |
| `/api/profile/diagrams/:id` | GET / PUT / DELETE | Get, update, or delete diagram |
| `/api/profile/profiles` | GET / POST | List or create profiles |
| `/api/profile/profiles/:id` | GET / PUT / DELETE | Get, update, or delete profile |
| `/api/profile/stereotypes` | GET / POST | List or create stereotypes |
| `/api/profile/stereotypes/:id` | GET / PUT / DELETE | Get, update, or delete stereotype |
| `/api/profile/stereotypes/:id/attributes` | GET / POST | List or create stereotype attributes |
| `/api/profile/stereotypes/:id/operations` | GET / POST | List or create stereotype operations |
| `/api/profile/metaclasses` | GET / POST | List or create metaclasses |
| `/api/profile/metaclasses/:id` | GET / PUT / DELETE | Get, update, or delete metaclass |
| `/api/profile/extensions` | GET / POST | List or create extensions |
| `/api/profile/extensions/:id` | GET / PUT / DELETE | Get, update, or delete extension |

#### Timing Diagram (`/api/timing/`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/timing/diagrams` | GET / POST | List or create timing diagrams |
| `/api/timing/diagrams/:id` | GET / PUT / DELETE | Get, update, or delete diagram |
| `/api/timing/lifelines` | GET / POST | List or create lifelines |
| `/api/timing/lifelines/:id` | GET / PUT / DELETE | Get, update, or delete lifeline |
| `/api/timing/timing-states` | GET / POST | List or create timing states |
| `/api/timing/timing-states/:id` | GET / PUT / DELETE | Get, update, or delete timing state |
| `/api/timing/time-segments` | GET / POST | List or create time segments |
| `/api/timing/time-segments/:id` | GET / PUT / DELETE | Get, update, or delete time segment |

#### Interaction Overview Diagram (`/api/overview/`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/overview/diagrams` | GET / POST | List or create interaction overview diagrams |
| `/api/overview/diagrams/:id` | GET / PUT / DELETE | Get, update, or delete diagram |
| `/api/overview/interaction-uses` | GET / POST | List or create interaction uses |
| `/api/overview/interaction-uses/:id` | GET / PUT / DELETE | Get, update, or delete interaction use |
| `/api/overview/interactions` | GET / POST | List or create interactions |
| `/api/overview/interactions/:id` | GET / PUT / DELETE | Get, update, or delete interaction |
| `/api/overview/control-nodes` | GET / POST | List or create control nodes |
| `/api/overview/control-nodes/:id` | GET / PUT / DELETE | Get, update, or delete control node |
| `/api/overview/control-flows` | GET / POST | List or create control flows |
| `/api/overview/control-flows/:id` | GET / PUT / DELETE | Get, update, or delete control flow |

#### Flowchart Diagram (`/api/flowchart/`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/flowchart/diagrams` | GET / POST | List or create flowchart diagrams |
| `/api/flowchart/diagrams/:id` | GET / PUT / DELETE | Get, update, or delete diagram |
| `/api/flowchart/nodes` | GET / POST | List or create nodes |
| `/api/flowchart/nodes/:id` | GET / PUT / DELETE | Get, update, or delete node |
| `/api/flowchart/flows` | GET / POST | List or create flows |
| `/api/flowchart/flows/:id` | GET / PUT / DELETE | Get, update, or delete flow |

#### DFD Diagram (`/api/dfd/`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/dfd/diagrams` | GET / POST | List or create DFD diagrams |
| `/api/dfd/diagrams/:id` | GET / PUT / DELETE | Get, update, or delete diagram |
| `/api/dfd/external-entities` | GET / POST | List or create external entities |
| `/api/dfd/external-entities/:id` | GET / PUT / DELETE | Get, update, or delete external entity |
| `/api/dfd/processes` | GET / POST | List or create processes |
| `/api/dfd/processes/:id` | GET / PUT / DELETE | Get, update, or delete process |
| `/api/dfd/data-stores` | GET / POST | List or create data stores |
| `/api/dfd/data-stores/:id` | GET / PUT / DELETE | Get, update, or delete data store |
| `/api/dfd/data-flows` | GET / POST | List or create data flows |
| `/api/dfd/data-flows/:id` | GET / PUT / DELETE | Get, update, or delete data flow |

#### BPMN Diagram (`/api/bpmn/`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/bpmn/diagrams` | GET / POST | List or create BPMN diagrams |
| `/api/bpmn/diagrams/:id` | GET / PUT / DELETE | Get, update, or delete diagram |
| `/api/bpmn/participants` | GET / POST | List or create participants |
| `/api/bpmn/participants/:id` | GET / PUT / DELETE | Get, update, or delete participant |
| `/api/bpmn/participants/:id/lanes` | GET / POST | List or create lanes |
| `/api/bpmn/tasks` | GET / POST | List or create tasks |
| `/api/bpmn/tasks/:id` | GET / PUT / DELETE | Get, update, or delete task |
| `/api/bpmn/sub-processes` | GET / POST | List or create sub-processes |
| `/api/bpmn/sub-processes/:id` | GET / PUT / DELETE | Get, update, or delete sub-process |
| `/api/bpmn/events` | GET / POST | List or create events |
| `/api/bpmn/events/:id` | GET / PUT / DELETE | Get, update, or delete event |
| `/api/bpmn/events/:id/event-definitions` | GET / POST | List or create event definitions |
| `/api/bpmn/gateways` | GET / POST | List or create gateways |
| `/api/bpmn/gateways/:id` | GET / PUT / DELETE | Get, update, or delete gateway |
| `/api/bpmn/data-objects` | GET / POST | List or create data objects |
| `/api/bpmn/data-objects/:id` | GET / PUT / DELETE | Get, update, or delete data object |
| `/api/bpmn/conversations` | GET / POST | List or create conversations |
| `/api/bpmn/conversations/:id` | GET / PUT / DELETE | Get, update, or delete conversation |
| `/api/bpmn/choreographies` | GET / POST | List or create choreographies |
| `/api/bpmn/choreographies/:id` | GET / PUT / DELETE | Get, update, or delete choreography |
| `/api/bpmn/annotations` | GET / POST | List or create annotations |
| `/api/bpmn/annotations/:id` | GET / PUT / DELETE | Get, update, or delete annotation |
| `/api/bpmn/sequence-flows` | GET / POST | List or create sequence flows |
| `/api/bpmn/sequence-flows/:id` | GET / PUT / DELETE | Get, update, or delete sequence flow |
| `/api/bpmn/message-flows` | GET / POST | List or create message flows |
| `/api/bpmn/message-flows/:id` | GET / PUT / DELETE | Get, update, or delete message flow |
| `/api/bpmn/associations` | GET / POST | List or create associations |
| `/api/bpmn/associations/:id` | GET / PUT / DELETE | Get, update, or delete association |
| `/api/bpmn/data-associations` | GET / POST | List or create data associations |
| `/api/bpmn/data-associations/:id` | GET / PUT / DELETE | Get, update, or delete data association |
| `/api/bpmn/message-links` | GET / POST | List or create message links |
| `/api/bpmn/message-links/:id` | GET / PUT / DELETE | Get, update, or delete message link |
| `/api/bpmn/conversation-links` | GET / POST | List or create conversation links |
| `/api/bpmn/conversation-links/:id` | GET / PUT / DELETE | Get, update, or delete conversation link |

#### C4 Diagram (`/api/c4/`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/c4/diagrams` | GET / POST | List or create C4 diagrams |
| `/api/c4/diagrams/:id` | GET / PUT / DELETE | Get, update, or delete diagram |
| `/api/c4/elements` | GET / POST | List or create elements |
| `/api/c4/elements/:id` | GET / PUT / DELETE | Get, update, or delete element |
| `/api/c4/relationships` | GET / POST | List or create relationships |
| `/api/c4/relationships/:id` | GET / PUT / DELETE | Get, update, or delete relationship |

#### SysML Diagram (`/api/sysml/`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/sysml/diagrams` | GET / POST | List or create SysML diagrams |
| `/api/sysml/diagrams/:id` | GET / PUT / DELETE | Get, update, or delete diagram |
| `/api/sysml/requirements` | GET / POST | List or create requirements |
| `/api/sysml/requirements/:id` | GET / PUT / DELETE | Get, update, or delete requirement |
| `/api/sysml/blocks` | GET / POST | List or create blocks |
| `/api/sysml/blocks/:id` | GET / PUT / DELETE | Get, update, or delete block |
| `/api/sysml/blocks/:id/properties` | GET / POST | List or create properties |
| `/api/sysml/blocks/:id/operations` | GET / POST | List or create operations |
| `/api/sysml/blocks/:id/flow-properties` | GET / POST | List or create flow properties |
| `/api/sysml/stakeholders` | GET / POST | List or create stakeholders |
| `/api/sysml/stakeholders/:id` | GET / PUT / DELETE | Get, update, or delete stakeholder |
| `/api/sysml/viewpoints` | GET / POST | List or create viewpoints |
| `/api/sysml/viewpoints/:id` | GET / PUT / DELETE | Get, update, or delete viewpoint |
| `/api/sysml/views` | GET / POST | List or create views |
| `/api/sysml/views/:id` | GET / PUT / DELETE | Get, update, or delete view |
| `/api/sysml/parts` | GET / POST | List or create parts |
| `/api/sysml/parts/:id` | GET / PUT / DELETE | Get, update, or delete part |
| `/api/sysml/conforms` | GET / POST | List or create conforms |
| `/api/sysml/conforms/:id` | GET / PUT / DELETE | Get, update, or delete conform |
| `/api/sysml/exposes` | GET / POST | List or create exposes |
| `/api/sysml/exposes/:id` | GET / PUT / DELETE | Get, update, or delete expose |
| `/api/sysml/copies` | GET / POST | List or create copies |
| `/api/sysml/copies/:id` | GET / PUT / DELETE | Get, update, or delete copy |
| `/api/sysml/derive-reqts` | GET / POST | List or create derive requirements |
| `/api/sysml/derive-reqts/:id` | GET / PUT / DELETE | Get, update, or delete derive requirement |
| `/api/sysml/verifies` | GET / POST | List or create verifies |
| `/api/sysml/verifies/:id` | GET / PUT / DELETE | Get, update, or delete verify |
| `/api/sysml/satisfies` | GET / POST | List or create satisfies |
| `/api/sysml/satisfies/:id` | GET / PUT / DELETE | Get, update, or delete satisfy |
| `/api/sysml/refines` | GET / POST | List or create refines |
| `/api/sysml/refines/:id` | GET / PUT / DELETE | Get, update, or delete refine |
| `/api/sysml/connectors` | GET / POST | List or create connectors |
| `/api/sysml/connectors/:id` | GET / PUT / DELETE | Get, update, or delete connector |

#### Wireframe Diagram (`/api/wireframe/`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/wireframe/diagrams` | GET / POST | List or create wireframe diagrams |
| `/api/wireframe/diagrams/:id` | GET / PUT / DELETE | Get, update, or delete diagram |
| `/api/wireframe/frames` | GET / POST | List or create frames |
| `/api/wireframe/frames/:id` | GET / PUT / DELETE | Get, update, or delete frame |
| `/api/wireframe/widgets` | GET / POST | List or create widgets |
| `/api/wireframe/widgets/:id` | GET / PUT / DELETE | Get, update, or delete widget |

#### MindMap Diagram (`/api/mindmap/`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/mindmap/diagrams` | GET / POST | List or create mindmap diagrams |
| `/api/mindmap/diagrams/:id` | GET / PUT / DELETE | Get, update, or delete diagram |
| `/api/mindmap/nodes` | GET / POST | List or create nodes |
| `/api/mindmap/nodes/:id` | GET / PUT / DELETE | Get, update, or delete node |
| `/api/mindmap/edges` | GET / POST | List or create edges |
| `/api/mindmap/edges/:id` | GET / PUT / DELETE | Get, update, or delete edge |

#### AWS Diagram (`/api/aws/`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/aws/diagrams` | GET / POST | List or create AWS diagrams |
| `/api/aws/diagrams/:id` | GET / PUT / DELETE | Get, update, or delete diagram |
| `/api/aws/elements` | GET / POST | List or create elements |
| `/api/aws/elements/:id` | GET / PUT / DELETE | Get, update, or delete element |
| `/api/aws/arrows` | GET / POST | List or create arrows |
| `/api/aws/arrows/:id` | GET / PUT / DELETE | Get, update, or delete arrow |

#### Azure Diagram (`/api/azure/`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/azure/diagrams` | GET / POST | List or create Azure diagrams |
| `/api/azure/diagrams/:id` | GET / PUT / DELETE | Get, update, or delete diagram |
| `/api/azure/elements` | GET / POST | List or create elements |
| `/api/azure/elements/:id` | GET / PUT / DELETE | Get, update, or delete element |
| `/api/azure/connectors` | GET / POST | List or create connectors |
| `/api/azure/connectors/:id` | GET / PUT / DELETE | Get, update, or delete connector |

#### GCP Diagram (`/api/gcp/`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/gcp/diagrams` | GET / POST | List or create GCP diagrams |
| `/api/gcp/diagrams/:id` | GET / PUT / DELETE | Get, update, or delete diagram |
| `/api/gcp/elements` | GET / POST | List or create elements |
| `/api/gcp/elements/:id` | GET / PUT / DELETE | Get, update, or delete element |
| `/api/gcp/paths` | GET / POST | List or create paths |
| `/api/gcp/paths/:id` | GET / PUT / DELETE | Get, update, or delete path |

For full API specifications including request/response formats, validation rules, error codes, and the 23 diagram family APIs, see the [API Documentation](https://pontasan.github.io/staruml-controller/api.html).

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
├── handlers/
│   ├── shared-helpers.js   # Shared validation/serialization utilities
│   ├── crud-factory.js     # CRUD handler factory engine
│   ├── family-class.js     # Class/Package diagram config
│   ├── family-usecase.js   # Use Case diagram config
│   ├── family-activity.js  # Activity diagram config
│   └── ... (21 more family configs)
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
