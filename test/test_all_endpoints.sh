#!/bin/bash
#
# StarUML Controller - Full Endpoint Integration Test
#
# Prerequisites:
#   - StarUML running with StarUML Controller extension
#   - Server started (Tools > StarUML Controller > Start Server)
#   - Default port 12345 (or set PORT env var)
#
# Usage:
#   bash test/test_all_endpoints.sh
#   PORT=3000 bash test/test_all_endpoints.sh
#

BASE="http://localhost:${PORT:-12345}"
PASS=0
FAIL=0
TOTAL_RESULTS=""

# URL-encode a StarUML element ID (Base64 with / + =)
enc() { python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1],''))" "$1"; }

# Check API response and record result
check() {
    local label="$1"
    local response="$2"
    local success=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
    if [ "$success" = "True" ]; then
        PASS=$((PASS+1))
        TOTAL_RESULTS="${TOTAL_RESULTS}OK   ${label}\n"
    else
        FAIL=$((FAIL+1))
        local err=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error','unknown')[:80])" 2>/dev/null || echo "parse error")
        TOTAL_RESULTS="${TOTAL_RESULTS}FAIL ${label} : ${err}\n"
    fi
}

# Extract _id from API response
getid() { echo "$1" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null; }

# Verify server is reachable
echo "Connecting to $BASE ..."
STATUS=$(curl -s --connect-timeout 3 $BASE/api/status)
if [ -z "$STATUS" ]; then
    echo "ERROR: Cannot connect to StarUML Controller at $BASE"
    echo "Make sure StarUML is running and the server is started."
    exit 1
fi
echo "Connected. Saving project snapshot for restore..."
SNAPSHOT="/tmp/test_staruml_snapshot_$$.mdj"
curl -s -X POST $BASE/api/project/save -H "Content-Type: application/json" -d "{\"path\":\"$SNAPSHOT\"}" > /dev/null
echo "Starting tests..."
echo ""

# =============================
# General: get_status (1)
# =============================
check "1.get_status" "$STATUS"

# =============================
# ERD Data Models: create, list, get, update (4) + delete later
# =============================
R=$(curl -s -X POST $BASE/api/erd/data-models -H "Content-Type: application/json" -d '{"name":"TestDM"}')
check "2.erd_create_data_model" "$R"
DM_ID=$(getid "$R")

check "3.erd_list_data_models" "$(curl -s $BASE/api/erd/data-models)"
check "4.erd_get_data_model" "$(curl -s $BASE/api/erd/data-models/$(enc $DM_ID))"
check "5.erd_update_data_model" "$(curl -s -X PUT $BASE/api/erd/data-models/$(enc $DM_ID) -H "Content-Type: application/json" -d '{"name":"TestDM_Up"}')"

# =============================
# ERD Diagrams: create, list, get, update (4) + delete later
# =============================
R=$(curl -s -X POST $BASE/api/erd/diagrams -H "Content-Type: application/json" -d "{\"name\":\"TestDiag\",\"parentId\":\"$DM_ID\"}")
check "6.erd_create_diagram" "$R"
DG_ID=$(getid "$R")

check "7.erd_list_diagrams" "$(curl -s $BASE/api/erd/diagrams)"
check "8.erd_get_diagram" "$(curl -s $BASE/api/erd/diagrams/$(enc $DG_ID))"
check "9.erd_update_diagram" "$(curl -s -X PUT $BASE/api/erd/diagrams/$(enc $DG_ID) -H "Content-Type: application/json" -d '{"name":"TestDiag_Up"}')"

# =============================
# ERD Entities: create x2, list, get, update (5)
# =============================
R=$(curl -s -X POST $BASE/api/erd/entities -H "Content-Type: application/json" -d "{\"name\":\"users\",\"parentId\":\"$DM_ID\",\"diagramId\":\"$DG_ID\"}")
check "10.erd_create_entity(users)" "$R"
E1_ID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/erd/entities -H "Content-Type: application/json" -d "{\"name\":\"orders\",\"parentId\":\"$DM_ID\",\"diagramId\":\"$DG_ID\",\"x1\":350,\"y1\":50}")
check "11.erd_create_entity(orders)" "$R"
E2_ID=$(getid "$R")

check "12.erd_list_entities" "$(curl -s $BASE/api/erd/entities)"
check "13.erd_get_entity" "$(curl -s $BASE/api/erd/entities/$(enc $E1_ID))"
check "14.erd_update_entity" "$(curl -s -X PUT $BASE/api/erd/entities/$(enc $E1_ID) -H "Content-Type: application/json" -d '{"name":"app_users"}')"

# =============================
# General: get_element, Tags CRUD (6)
# =============================
check "15.get_element" "$(curl -s $BASE/api/elements/$(enc $E1_ID))"

R=$(curl -s -X POST $BASE/api/elements/$(enc $E1_ID)/tags -H "Content-Type: application/json" -d '{"name":"note","kind":0,"value":"test"}')
check "16.create_element_tag" "$R"
TAG_ID=$(getid "$R")

check "17.list_element_tags" "$(curl -s $BASE/api/elements/$(enc $E1_ID)/tags)"
check "18.get_tag" "$(curl -s $BASE/api/tags/$(enc $TAG_ID))"
check "19.update_tag" "$(curl -s -X PUT $BASE/api/tags/$(enc $TAG_ID) -H "Content-Type: application/json" -d '{"value":"updated"}')"
check "20.delete_tag" "$(curl -s -X DELETE $BASE/api/tags/$(enc $TAG_ID))"

# =============================
# ERD Columns: create x2, list, get, update (5)
# =============================
R=$(curl -s -X POST $BASE/api/erd/entities/$(enc $E1_ID)/columns -H "Content-Type: application/json" -d '{"name":"id","type":"INT","primaryKey":true}')
check "21.erd_create_column(id)" "$R"
C1_ID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/erd/entities/$(enc $E1_ID)/columns -H "Content-Type: application/json" -d '{"name":"email","type":"VARCHAR","length":"255"}')
check "22.erd_create_column(email)" "$R"
C2_ID=$(getid "$R")

check "23.erd_list_columns" "$(curl -s $BASE/api/erd/entities/$(enc $E1_ID)/columns)"
check "24.erd_get_column" "$(curl -s $BASE/api/erd/columns/$(enc $C1_ID))"
check "25.erd_update_column" "$(curl -s -X PUT $BASE/api/erd/columns/$(enc $C1_ID) -H "Content-Type: application/json" -d '{"name":"user_id"}')"

# =============================
# ERD Sequences: CRUD + delete (5)
# =============================
R=$(curl -s -X POST $BASE/api/erd/entities/$(enc $E1_ID)/sequences -H "Content-Type: application/json" -d '{"name":"seq1"}')
check "26.erd_create_sequence" "$R"
SEQ_ID=$(getid "$R")

check "27.erd_list_sequences" "$(curl -s $BASE/api/erd/entities/$(enc $E1_ID)/sequences)"
check "28.erd_get_sequence" "$(curl -s $BASE/api/erd/sequences/$(enc $SEQ_ID))"
check "29.erd_update_sequence" "$(curl -s -X PUT $BASE/api/erd/sequences/$(enc $SEQ_ID) -H "Content-Type: application/json" -d '{"name":"seq1_up"}')"
check "30.erd_delete_sequence" "$(curl -s -X DELETE $BASE/api/erd/sequences/$(enc $SEQ_ID))"

# =============================
# ERD Indexes: CRUD + delete (5)
# =============================
R=$(curl -s -X POST $BASE/api/erd/entities/$(enc $E1_ID)/indexes -H "Content-Type: application/json" -d '{"name":"idx_email","definition":"email ASC"}')
check "31.erd_create_index" "$R"
IDX_ID=$(getid "$R")

check "32.erd_list_indexes" "$(curl -s $BASE/api/erd/entities/$(enc $E1_ID)/indexes)"
check "33.erd_get_index" "$(curl -s $BASE/api/erd/indexes/$(enc $IDX_ID))"
check "34.erd_update_index" "$(curl -s -X PUT $BASE/api/erd/indexes/$(enc $IDX_ID) -H "Content-Type: application/json" -d '{"name":"idx_email_up"}')"
check "35.erd_delete_index" "$(curl -s -X DELETE $BASE/api/erd/indexes/$(enc $IDX_ID))"

# =============================
# ERD Relationships: create, list, list(filter), get, update (5)
# =============================
R=$(curl -s -X POST $BASE/api/erd/relationships -H "Content-Type: application/json" \
  -d "{\"parentId\":\"$DM_ID\",\"name\":\"user_orders\",\"diagramId\":\"$DG_ID\",\"end1\":{\"reference\":\"$E1_ID\",\"cardinality\":\"1\"},\"end2\":{\"reference\":\"$E2_ID\",\"cardinality\":\"0..*\"}}")
check "36.erd_create_relationship" "$R"
REL_ID=$(getid "$R")

check "37.erd_list_relationships" "$(curl -s $BASE/api/erd/relationships)"
check "38.erd_list_relationships(filter)" "$(curl -s "$BASE/api/erd/relationships?dataModelId=$(enc $DM_ID)")"
check "39.erd_get_relationship" "$(curl -s $BASE/api/erd/relationships/$(enc $REL_ID))"
check "40.erd_update_relationship" "$(curl -s -X PUT $BASE/api/erd/relationships/$(enc $REL_ID) -H "Content-Type: application/json" -d '{"name":"user_orders_up"}')"

# =============================
# ERD DDL: generate (1)
# =============================
DDL_BODY=$(printf '{"dataModelId":"%s","path":"/tmp/test_ddl.sql"}' "$DM_ID")
check "41.erd_generate_ddl" "$(curl -s -X POST $BASE/api/erd/postgresql/ddl -H "Content-Type: application/json" -d "$DDL_BODY")"

# =============================
# Seq Interactions: create, list, get, update (4) + delete later
# =============================
R=$(curl -s -X POST $BASE/api/seq/interactions -H "Content-Type: application/json" -d '{"name":"TestInt"}')
check "42.seq_create_interaction" "$R"
INT_ID=$(getid "$R")

check "43.seq_list_interactions" "$(curl -s $BASE/api/seq/interactions)"
check "44.seq_get_interaction" "$(curl -s $BASE/api/seq/interactions/$(enc $INT_ID))"
check "45.seq_update_interaction" "$(curl -s -X PUT $BASE/api/seq/interactions/$(enc $INT_ID) -H "Content-Type: application/json" -d '{"name":"TestInt_Up"}')"

# =============================
# Seq Diagrams: create, list, get, update (4) + delete later
# POST /api/seq/diagrams (parentId = interaction ID in body)
# =============================
R=$(curl -s -X POST $BASE/api/seq/diagrams -H "Content-Type: application/json" -d "{\"name\":\"TestSeqDiag\",\"parentId\":\"$INT_ID\"}")
check "46.seq_create_diagram" "$R"
SD_ID=$(getid "$R")

check "47.seq_list_diagrams" "$(curl -s $BASE/api/seq/diagrams)"
check "48.seq_get_diagram" "$(curl -s $BASE/api/seq/diagrams/$(enc $SD_ID))"
check "49.seq_update_diagram" "$(curl -s -X PUT $BASE/api/seq/diagrams/$(enc $SD_ID) -H "Content-Type: application/json" -d '{"name":"TestSeqDiag_Up"}')"

# =============================
# Seq Lifelines: create x2, list, get, update (5)
# =============================
R=$(curl -s -X POST $BASE/api/seq/interactions/$(enc $INT_ID)/lifelines -H "Content-Type: application/json" -d "{\"name\":\"Client\",\"diagramId\":\"$SD_ID\",\"x\":150}")
check "50.seq_create_lifeline(Client)" "$R"
LL1_ID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/seq/interactions/$(enc $INT_ID)/lifelines -H "Content-Type: application/json" -d "{\"name\":\"Server\",\"diagramId\":\"$SD_ID\",\"x\":400}")
check "51.seq_create_lifeline(Server)" "$R"
LL2_ID=$(getid "$R")

check "52.seq_list_lifelines" "$(curl -s $BASE/api/seq/interactions/$(enc $INT_ID)/lifelines)"
check "53.seq_get_lifeline" "$(curl -s $BASE/api/seq/lifelines/$(enc $LL1_ID))"
check "54.seq_update_lifeline" "$(curl -s -X PUT $BASE/api/seq/lifelines/$(enc $LL1_ID) -H "Content-Type: application/json" -d '{"name":"WebClient"}')"

# =============================
# Seq Messages: create, list, get, update (4) + delete later
# =============================
R=$(curl -s -X POST $BASE/api/seq/interactions/$(enc $INT_ID)/messages -H "Content-Type: application/json" \
  -d "{\"name\":\"login\",\"messageSort\":\"synchCall\",\"source\":\"$LL1_ID\",\"target\":\"$LL2_ID\",\"diagramId\":\"$SD_ID\",\"y\":150}")
check "55.seq_create_message" "$R"
MSG_ID=$(getid "$R")

check "56.seq_list_messages" "$(curl -s $BASE/api/seq/interactions/$(enc $INT_ID)/messages)"
check "57.seq_get_message" "$(curl -s $BASE/api/seq/messages/$(enc $MSG_ID))"
check "58.seq_update_message" "$(curl -s -X PUT $BASE/api/seq/messages/$(enc $MSG_ID) -H "Content-Type: application/json" -d '{"name":"login_up"}')"

# =============================
# Seq Combined Fragments: create, list, get, update (4) + delete later
# =============================
R=$(curl -s -X POST $BASE/api/seq/interactions/$(enc $INT_ID)/combined-fragments -H "Content-Type: application/json" \
  -d "{\"name\":\"AuthCheck\",\"interactionOperator\":\"alt\",\"diagramId\":\"$SD_ID\",\"x\":100,\"y\":200,\"width\":400,\"height\":200}")
check "59.seq_create_combined_fragment" "$R"
CF_ID=$(getid "$R")

check "60.seq_list_combined_fragments" "$(curl -s $BASE/api/seq/interactions/$(enc $INT_ID)/combined-fragments)"
check "61.seq_get_combined_fragment" "$(curl -s $BASE/api/seq/combined-fragments/$(enc $CF_ID))"
check "62.seq_update_combined_fragment" "$(curl -s -X PUT $BASE/api/seq/combined-fragments/$(enc $CF_ID) -H "Content-Type: application/json" -d '{"name":"AuthCheck_Up"}')"

# =============================
# Seq Operands: list, get, update, create, delete (5)
# =============================
OP1_ID=$(curl -s $BASE/api/seq/combined-fragments/$(enc $CF_ID) | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['operands'][0]['_id'])" 2>/dev/null)

check "63.seq_list_operands" "$(curl -s $BASE/api/seq/combined-fragments/$(enc $CF_ID)/operands)"
check "64.seq_get_operand" "$(curl -s $BASE/api/seq/operands/$(enc $OP1_ID))"
check "65.seq_update_operand" "$(curl -s -X PUT $BASE/api/seq/operands/$(enc $OP1_ID) -H "Content-Type: application/json" -d '{"guard":"success"}')"

R=$(curl -s -X POST $BASE/api/seq/combined-fragments/$(enc $CF_ID)/operands -H "Content-Type: application/json" -d '{"name":"Else","guard":"failure"}')
check "66.seq_create_operand" "$R"
OP2_ID=$(getid "$R")

if [ -n "$OP2_ID" ]; then
    check "67.seq_delete_operand" "$(curl -s -X DELETE $BASE/api/seq/operands/$(enc $OP2_ID))"
else
    FAIL=$((FAIL+1))
    TOTAL_RESULTS="${TOTAL_RESULTS}SKIP 67.seq_delete_operand (create failed)\n"
fi

# =============================
# Seq State Invariants: list, create, get, update, delete (5)
# =============================
check "68.seq_list_state_invariants" "$(curl -s $BASE/api/seq/interactions/$(enc $INT_ID)/state-invariants)"

R=$(curl -s -X POST $BASE/api/seq/interactions/$(enc $INT_ID)/state-invariants -H "Content-Type: application/json" \
  -d "{\"name\":\"LoggedIn\",\"covered\":\"$LL1_ID\",\"invariant\":\"isLoggedIn==true\",\"diagramId\":\"$SD_ID\",\"x\":150,\"y\":350}")
check "69.seq_create_state_invariant" "$R"
SI_ID=$(getid "$R")

if [ -n "$SI_ID" ]; then
    check "70.seq_get_state_invariant" "$(curl -s $BASE/api/seq/state-invariants/$(enc $SI_ID))"
    check "71.seq_update_state_invariant" "$(curl -s -X PUT $BASE/api/seq/state-invariants/$(enc $SI_ID) -H "Content-Type: application/json" -d '{"name":"LoggedIn_Up"}')"
    check "72.seq_delete_state_invariant" "$(curl -s -X DELETE $BASE/api/seq/state-invariants/$(enc $SI_ID))"
else
    FAIL=$((FAIL+3))
    TOTAL_RESULTS="${TOTAL_RESULTS}SKIP 70.seq_get_state_invariant (create failed)\n"
    TOTAL_RESULTS="${TOTAL_RESULTS}SKIP 71.seq_update_state_invariant (create failed)\n"
    TOTAL_RESULTS="${TOTAL_RESULTS}SKIP 72.seq_delete_state_invariant (create failed)\n"
fi

# =============================
# Seq Interaction Uses: CRUD + delete (5)
# =============================
R=$(curl -s -X POST $BASE/api/seq/interactions/$(enc $INT_ID)/interaction-uses -H "Content-Type: application/json" \
  -d "{\"name\":\"LoginSub\",\"arguments\":\"user,pass\",\"diagramId\":\"$SD_ID\",\"x\":100,\"y\":400,\"width\":400,\"height\":100}")
check "73.seq_create_interaction_use" "$R"
IU_ID=$(getid "$R")

check "74.seq_list_interaction_uses" "$(curl -s $BASE/api/seq/interactions/$(enc $INT_ID)/interaction-uses)"
check "75.seq_get_interaction_use" "$(curl -s $BASE/api/seq/interaction-uses/$(enc $IU_ID))"
check "76.seq_update_interaction_use" "$(curl -s -X PUT $BASE/api/seq/interaction-uses/$(enc $IU_ID) -H "Content-Type: application/json" -d '{"name":"LoginSub_Up"}')"
check "77.seq_delete_interaction_use" "$(curl -s -X DELETE $BASE/api/seq/interaction-uses/$(enc $IU_ID))"

# =============================
# Generic: All Diagrams (2)
# =============================
check "78.gen_list_all_diagrams" "$(curl -s $BASE/api/diagrams)"
check "79.gen_list_diagrams_filtered" "$(curl -s "$BASE/api/diagrams?type=ERDDiagram")"

# =============================
# Generic: Notes CRUD (5)
# =============================
R=$(curl -s -X POST $BASE/api/diagrams/$(enc $DG_ID)/notes -H "Content-Type: application/json" -d '{"text":"Test note","x1":50,"y1":50,"x2":200,"y2":120}')
check "80.gen_create_note" "$R"
NOTE_ID=$(getid "$R")

check "81.gen_list_notes" "$(curl -s $BASE/api/diagrams/$(enc $DG_ID)/notes)"
check "82.gen_get_note" "$(curl -s $BASE/api/notes/$(enc $NOTE_ID))"
check "83.gen_update_note" "$(curl -s -X PUT $BASE/api/notes/$(enc $NOTE_ID) -H "Content-Type: application/json" -d '{"text":"Updated note"}')"

# =============================
# Generic: Views - list + move/resize (2)
# =============================
R=$(curl -s $BASE/api/diagrams/$(enc $DG_ID)/views)
check "84.gen_list_views" "$R"
# Get first entity view ID for note-link target and view-update tests
ENTITY_VIEW_ID=$(echo "$R" | python3 -c "import sys,json; views=json.load(sys.stdin)['data']; print(next(v['_id'] for v in views if v['_type']=='ERDEntityView'))" 2>/dev/null)

check "85.gen_update_view" "$(curl -s -X PUT $BASE/api/views/$(enc $ENTITY_VIEW_ID) -H "Content-Type: application/json" -d '{"left":60,"top":60}')"

# =============================
# Generic: Note Links (3)
# =============================
R=$(curl -s -X POST $BASE/api/diagrams/$(enc $DG_ID)/note-links -H "Content-Type: application/json" \
  -d "{\"noteId\":\"$NOTE_ID\",\"targetId\":\"$ENTITY_VIEW_ID\"}")
check "86.gen_create_note_link" "$R"
NL_ID=$(getid "$R")

check "87.gen_list_note_links" "$(curl -s $BASE/api/diagrams/$(enc $DG_ID)/note-links)"
check "88.gen_delete_note_link" "$(curl -s -X DELETE $BASE/api/note-links/$(enc $NL_ID))"

# =============================
# Generic: Free Lines (3)
# =============================
R=$(curl -s -X POST $BASE/api/diagrams/$(enc $DG_ID)/free-lines -H "Content-Type: application/json" -d '{"x1":10,"y1":10,"x2":200,"y2":100}')
check "89.gen_create_free_line" "$R"
FL_ID=$(getid "$R")

check "90.gen_list_free_lines" "$(curl -s $BASE/api/diagrams/$(enc $DG_ID)/free-lines)"
check "91.gen_delete_free_line" "$(curl -s -X DELETE $BASE/api/free-lines/$(enc $FL_ID))"

# =============================
# Generic: Shapes CRUD (5)
# =============================
R=$(curl -s -X POST $BASE/api/diagrams/$(enc $DG_ID)/shapes -H "Content-Type: application/json" -d '{"type":"Rect","text":"TestRect","x1":400,"y1":300,"x2":550,"y2":380}')
check "200.gen_create_shape(Rect)" "$R"
SHAPE_ID=$(getid "$R")

check "201.gen_list_shapes" "$(curl -s $BASE/api/diagrams/$(enc $DG_ID)/shapes)"
check "202.gen_get_shape" "$(curl -s $BASE/api/shapes/$(enc $SHAPE_ID))"
check "203.gen_update_shape" "$(curl -s -X PUT $BASE/api/shapes/$(enc $SHAPE_ID) -H "Content-Type: application/json" -d '{"text":"UpdatedRect"}')"
check "204.gen_delete_shape" "$(curl -s -X DELETE $BASE/api/shapes/$(enc $SHAPE_ID))"

# =============================
# Generic: Diagram Export (3)
# =============================
check "92.gen_export_png" "$(curl -s -X POST $BASE/api/diagrams/$(enc $DG_ID)/export -H "Content-Type: application/json" -d '{"path":"/tmp/test_export.png","format":"png"}')"
check "93.gen_export_svg" "$(curl -s -X POST $BASE/api/diagrams/$(enc $DG_ID)/export -H "Content-Type: application/json" -d '{"path":"/tmp/test_export.svg","format":"svg"}')"
R=$(curl -s -X POST $BASE/api/diagrams/$(enc $DG_ID)/export -H 'Content-Type: application/json' \
  -d "{\"format\":\"jpeg\",\"path\":\"/tmp/test_export.jpeg\"}")
check "94.erd_export_jpeg" "$R"
check "205.gen_export_pdf" "$(curl -s -X POST $BASE/api/diagrams/$(enc $DG_ID)/export -H "Content-Type: application/json" -d '{"path":"/tmp/test_export.pdf","format":"pdf"}')"

# =============================
# Generic: Element Update + Delete (3)
# =============================
check "95.gen_update_element" "$(curl -s -X PUT $BASE/api/elements/$(enc $E1_ID) -H "Content-Type: application/json" -d '{"documentation":"Updated via generic"}')"

# Create a tag then delete it via generic endpoint to verify delegation
R=$(curl -s -X POST $BASE/api/elements/$(enc $E1_ID)/tags -H "Content-Type: application/json" -d '{"name":"tmp_tag","kind":0,"value":"tmp"}')
TMP_TAG_ID=$(getid "$R")
check "96.gen_delete_element(tag)" "$(curl -s -X DELETE $BASE/api/elements/$(enc $TMP_TAG_ID))"

# =============================
# Generic: Delete Note (cleanup) (1)
# =============================
check "97.gen_delete_note" "$(curl -s -X DELETE $BASE/api/notes/$(enc $NOTE_ID))"

# =============================
# Generic Diagram: POST /api/diagrams (UMLClassDiagram) (1)
# =============================
R=$(curl -s -X POST $BASE/api/diagrams -H "Content-Type: application/json" -d '{"type":"UMLClassDiagram","name":"TestClassDiag"}')
check "112.gen_create_class_diagram" "$R"
GD_CD_ID=$(getid "$R")

# =============================
# Generic Diagram: GET /api/diagrams/:id (1)
# =============================
check "113.gen_get_diagram" "$(curl -s $BASE/api/diagrams/$(enc $GD_CD_ID))"

# =============================
# Generic Diagram: PUT /api/diagrams/:id (1)
# =============================
check "114.gen_update_diagram" "$(curl -s -X PUT $BASE/api/diagrams/$(enc $GD_CD_ID) -H "Content-Type: application/json" -d '{"name":"TestClassDiag_Up"}')"

# =============================
# Generic Diagram Elements: POST /api/diagrams/:id/elements (UMLClass x2, UMLInterface, UMLEnumeration) (4)
# =============================
R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_CD_ID)/elements -H "Content-Type: application/json" \
  -d '{"type":"UMLClass","name":"User","x1":100,"y1":100,"x2":250,"y2":200}')
check "115.gen_create_element(UMLClass_User)" "$R"
GD_C1_VID=$(getid "$R")
GD_C1_MID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_CD_ID)/elements -H "Content-Type: application/json" \
  -d '{"type":"UMLClass","name":"Order","x1":350,"y1":100,"x2":500,"y2":200}')
check "116.gen_create_element(UMLClass_Order)" "$R"
GD_C2_VID=$(getid "$R")
GD_C2_MID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_CD_ID)/elements -H "Content-Type: application/json" \
  -d '{"type":"UMLInterface","name":"IRepository","x1":100,"y1":300,"x2":250,"y2":400}')
check "117.gen_create_element(UMLInterface)" "$R"
GD_IF_MID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_CD_ID)/elements -H "Content-Type: application/json" \
  -d '{"type":"UMLEnumeration","name":"Status","x1":500,"y1":300,"x2":650,"y2":400}')
check "118.gen_create_element(UMLEnumeration)" "$R"
GD_ENUM_MID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_CD_ID)/elements -H "Content-Type: application/json" \
  -d '{"type":"UMLPackage","name":"core","x1":50,"y1":450,"x2":300,"y2":550}')
check "206.gen_create_element(UMLPackage)" "$R"
GD_PKG_MID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

# =============================
# Generic Diagram Elements: GET /api/diagrams/:id/elements (1)
# =============================
check "119.gen_get_diagram_elements" "$(curl -s $BASE/api/diagrams/$(enc $GD_CD_ID)/elements)"

# =============================
# Generic Relations: POST /api/diagrams/:id/relations (UMLAssociation, UMLInterfaceRealization) (2)
# =============================
R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_CD_ID)/relations -H "Content-Type: application/json" \
  -d "{\"type\":\"UMLAssociation\",\"sourceId\":\"$GD_C1_MID\",\"targetId\":\"$GD_C2_MID\",\"name\":\"places\"}")
check "120.gen_create_relation(UMLAssociation)" "$R"
GD_ASSOC_VID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_CD_ID)/relations -H "Content-Type: application/json" \
  -d "{\"type\":\"UMLInterfaceRealization\",\"sourceId\":\"$GD_C1_MID\",\"targetId\":\"$GD_IF_MID\"}")
check "121.gen_create_relation(UMLInterfaceRealization)" "$R"

# =============================
# Child Elements: POST /api/elements/:id/children (UMLAttribute, UMLOperation, UMLEnumerationLiteral) (3)
# =============================
R=$(curl -s -X POST $BASE/api/elements/$(enc $GD_C1_MID)/children -H "Content-Type: application/json" \
  -d '{"type":"UMLAttribute","name":"email"}')
check "122.gen_create_child(UMLAttribute)" "$R"

R=$(curl -s -X POST $BASE/api/elements/$(enc $GD_C1_MID)/children -H "Content-Type: application/json" \
  -d '{"type":"UMLOperation","name":"getEmail"}')
check "123.gen_create_child(UMLOperation)" "$R"

R=$(curl -s -X POST $BASE/api/elements/$(enc $GD_ENUM_MID)/children -H "Content-Type: application/json" \
  -d '{"type":"UMLEnumerationLiteral","name":"ACTIVE"}')
check "124.gen_create_child(UMLEnumerationLiteral)" "$R"

# =============================
# View Styling: PUT /api/views/:id/style (1)
# =============================
check "125.gen_update_view_style" "$(curl -s -X PUT $BASE/api/views/$(enc $GD_C1_VID)/style -H "Content-Type: application/json" \
  -d '{"fillColor":"#CCE5FF","lineColor":"#0066CC","fontSize":14,"fontStyle":1,"showShadow":true}')"

# =============================
# Auto Layout: POST /api/diagrams/:id/layout (1)
# =============================
check "126.gen_layout_diagram" "$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_CD_ID)/layout -H "Content-Type: application/json" \
  -d '{"direction":"LR"}')"

# =============================
# Undo / Redo: POST /api/undo, POST /api/redo (2)
# =============================
check "127.gen_undo" "$(curl -s -X POST $BASE/api/undo)"
check "128.gen_redo" "$(curl -s -X POST $BASE/api/redo)"

# =============================
# Search: GET /api/search (2)
# =============================
check "129.gen_search" "$(curl -s "$BASE/api/search?keyword=User")"
check "130.gen_search_with_type" "$(curl -s "$BASE/api/search?keyword=User&type=UMLClass")"

# =============================
# Use Case Diagram: create + actor + usecase + assoc (4)
# =============================
R=$(curl -s -X POST $BASE/api/diagrams -H "Content-Type: application/json" -d '{"type":"UMLUseCaseDiagram","name":"TestUC"}')
check "131.gen_create_usecase_diagram" "$R"
GD_UC_ID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_UC_ID)/elements -H "Content-Type: application/json" \
  -d '{"type":"UMLActor","name":"Admin"}')
check "132.gen_create_element(UMLActor)" "$R"
GD_ACT_MID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_UC_ID)/elements -H "Content-Type: application/json" \
  -d '{"type":"UMLUseCase","name":"Login","x1":300,"y1":100,"x2":450,"y2":160}')
check "133.gen_create_element(UMLUseCase)" "$R"
GD_UC_MID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_UC_ID)/relations -H "Content-Type: application/json" \
  -d "{\"type\":\"UMLAssociation\",\"sourceId\":\"$GD_ACT_MID\",\"targetId\":\"$GD_UC_MID\"}")
check "134.gen_create_relation_uc(UMLAssociation)" "$R"

# =============================
# Activity Diagram: create + initial + action + flow (4)
# =============================
R=$(curl -s -X POST $BASE/api/diagrams -H "Content-Type: application/json" -d '{"type":"UMLActivityDiagram","name":"TestActivity"}')
check "135.gen_create_activity_diagram" "$R"
GD_ACT_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_ACT_DID)/elements -H "Content-Type: application/json" \
  -d '{"type":"UMLInitialNode","x1":200,"y1":50,"x2":230,"y2":80}')
check "136.gen_create_element(UMLInitialNode)" "$R"
GD_INIT_MID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_ACT_DID)/elements -H "Content-Type: application/json" \
  -d '{"type":"UMLAction","name":"ProcessData","x1":150,"y1":150,"x2":300,"y2":200}')
check "137.gen_create_element(UMLAction)" "$R"
GD_ACTION_MID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_ACT_DID)/relations -H "Content-Type: application/json" \
  -d "{\"type\":\"UMLControlFlow\",\"sourceId\":\"$GD_INIT_MID\",\"targetId\":\"$GD_ACTION_MID\"}")
check "138.gen_create_relation(UMLControlFlow)" "$R"

# Child elements: UMLInputPin / UMLOutputPin on UMLAction (2)
R=$(curl -s -X POST $BASE/api/elements/$(enc $GD_ACTION_MID)/children -H "Content-Type: application/json" \
  -d '{"type":"UMLInputPin","name":"dataIn"}')
check "138a.gen_create_child(UMLInputPin)" "$R"

R=$(curl -s -X POST $BASE/api/elements/$(enc $GD_ACTION_MID)/children -H "Content-Type: application/json" \
  -d '{"type":"UMLOutputPin","name":"dataOut"}')
check "138b.gen_create_child(UMLOutputPin)" "$R"

# =============================
# State Machine Diagram: create + pseudostate + state + transition (4)
# =============================
R=$(curl -s -X POST $BASE/api/diagrams -H "Content-Type: application/json" -d '{"type":"UMLStatechartDiagram","name":"TestState"}')
check "139.gen_create_statechart_diagram" "$R"
GD_ST_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_ST_DID)/elements -H "Content-Type: application/json" \
  -d '{"type":"UMLPseudostate","pseudostateKind":"initial","x1":200,"y1":50,"x2":230,"y2":80}')
check "140.gen_create_element(UMLPseudostate)" "$R"
GD_PS_MID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_ST_DID)/elements -H "Content-Type: application/json" \
  -d '{"type":"UMLState","name":"Active","x1":150,"y1":150,"x2":300,"y2":220}')
check "141.gen_create_element(UMLState)" "$R"
GD_STATE_MID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_ST_DID)/relations -H "Content-Type: application/json" \
  -d "{\"type\":\"UMLTransition\",\"sourceId\":\"$GD_PS_MID\",\"targetId\":\"$GD_STATE_MID\"}")
check "142.gen_create_relation(UMLTransition)" "$R"

# =============================
# Component Diagram: create + component (2)
# =============================
R=$(curl -s -X POST $BASE/api/diagrams -H "Content-Type: application/json" -d '{"type":"UMLComponentDiagram","name":"TestComp"}')
check "143.gen_create_component_diagram" "$R"
GD_COMP_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_COMP_DID)/elements -H "Content-Type: application/json" \
  -d '{"type":"UMLComponent","name":"AuthService"}')
check "144.gen_create_element(UMLComponent)" "$R"

# =============================
# Deployment Diagram: create + node (2)
# =============================
R=$(curl -s -X POST $BASE/api/diagrams -H "Content-Type: application/json" -d '{"type":"UMLDeploymentDiagram","name":"TestDeploy"}')
check "145.gen_create_deployment_diagram" "$R"
GD_DEP_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_DEP_DID)/elements -H "Content-Type: application/json" \
  -d '{"type":"UMLNode","name":"WebServer"}')
check "146.gen_create_element(UMLNode)" "$R"

# =============================
# Object Diagram: create + object (2)
# =============================
R=$(curl -s -X POST $BASE/api/diagrams -H "Content-Type: application/json" -d '{"type":"UMLObjectDiagram","name":"TestObj"}')
check "147.gen_create_object_diagram" "$R"
GD_OBJ_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_OBJ_DID)/elements -H "Content-Type: application/json" \
  -d '{"type":"UMLObject","name":"user1"}')
check "148.gen_create_element(UMLObject)" "$R"

# =============================
# Communication Diagram: create + lifeline (2)
# =============================
R=$(curl -s -X POST $BASE/api/diagrams -H "Content-Type: application/json" -d '{"type":"UMLCommunicationDiagram","name":"TestComm"}')
check "149.gen_create_communication_diagram" "$R"
GD_COMM_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_COMM_DID)/elements -H "Content-Type: application/json" \
  -d '{"type":"UMLLifeline","name":"Client"}')
check "150.gen_create_element(UMLLifeline_comm)" "$R"

# =============================
# Flowchart Diagram: create + terminator + process + flow (4)
# =============================
R=$(curl -s -X POST $BASE/api/diagrams -H "Content-Type: application/json" -d '{"type":"FCFlowchartDiagram","name":"TestFlow"}')
check "151.gen_create_flowchart_diagram" "$R"
GD_FC_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_FC_DID)/elements -H "Content-Type: application/json" \
  -d '{"type":"FCTerminator","name":"Start"}')
check "152.gen_create_element(FCTerminator)" "$R"
GD_FC_T1=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_FC_DID)/elements -H "Content-Type: application/json" \
  -d '{"type":"FCProcess","name":"DoWork","x1":100,"y1":200,"x2":250,"y2":270}')
check "153.gen_create_element(FCProcess)" "$R"
GD_FC_P1=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_FC_DID)/relations -H "Content-Type: application/json" \
  -d "{\"type\":\"FCFlow\",\"sourceId\":\"$GD_FC_T1\",\"targetId\":\"$GD_FC_P1\"}")
check "154.gen_create_relation(FCFlow)" "$R"

# =============================
# DFD Diagram: create + process + datastore + dataflow (4)
# =============================
R=$(curl -s -X POST $BASE/api/diagrams -H "Content-Type: application/json" -d '{"type":"DFDDiagram","name":"TestDFD"}')
check "155.gen_create_dfd_diagram" "$R"
GD_DFD_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_DFD_DID)/elements -H "Content-Type: application/json" \
  -d '{"type":"DFDProcess","name":"Validate"}')
check "156.gen_create_element(DFDProcess)" "$R"
GD_DFD_P1=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_DFD_DID)/elements -H "Content-Type: application/json" \
  -d '{"type":"DFDDataStore","name":"DB","x1":300,"y1":100,"x2":450,"y2":160}')
check "157.gen_create_element(DFDDataStore)" "$R"
GD_DFD_DS1=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_DFD_DID)/relations -H "Content-Type: application/json" \
  -d "{\"type\":\"DFDDataFlow\",\"sourceId\":\"$GD_DFD_P1\",\"targetId\":\"$GD_DFD_DS1\",\"name\":\"write\"}")
check "158.gen_create_relation(DFDDataFlow)" "$R"

# =============================
# BPMN Diagram: create + task + gateway + sequence flow (4)
# =============================
R=$(curl -s -X POST $BASE/api/diagrams -H "Content-Type: application/json" -d '{"type":"BPMNDiagram","name":"TestBPMN"}')
check "210.gen_create_bpmn_diagram" "$R"
GD_BPMN_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_BPMN_DID)/elements -H "Content-Type: application/json" \
  -d '{"type":"BPMNTask","name":"Review"}')
check "211.gen_create_element(BPMNTask)" "$R"
GD_BPMN_T1=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_BPMN_DID)/elements -H "Content-Type: application/json" \
  -d '{"type":"BPMNExclusiveGateway","name":"Decision","x1":300,"y1":100,"x2":350,"y2":150}')
check "212.gen_create_element(BPMNExclusiveGateway)" "$R"
GD_BPMN_GW=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_BPMN_DID)/relations -H "Content-Type: application/json" \
  -d "{\"type\":\"BPMNSequenceFlow\",\"sourceId\":\"$GD_BPMN_T1\",\"targetId\":\"$GD_BPMN_GW\"}")
check "213.gen_create_relation(BPMNSequenceFlow)" "$R"

# =============================
# C4 Diagram: create + person + system + relationship (4)
# =============================
R=$(curl -s -X POST $BASE/api/diagrams -H "Content-Type: application/json" -d '{"type":"C4Diagram","name":"TestC4"}')
check "214.gen_create_c4_diagram" "$R"
GD_C4_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_C4_DID)/elements -H "Content-Type: application/json" \
  -d '{"type":"C4Person","name":"EndUser"}')
check "215.gen_create_element(C4Person)" "$R"
GD_C4_P=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_C4_DID)/elements -H "Content-Type: application/json" \
  -d '{"type":"C4SoftwareSystem","name":"WebApp","x1":300,"y1":100,"x2":500,"y2":200}')
check "216.gen_create_element(C4SoftwareSystem)" "$R"
GD_C4_S=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_C4_DID)/relations -H "Content-Type: application/json" \
  -d "{\"type\":\"C4Relationship\",\"sourceId\":\"$GD_C4_P\",\"targetId\":\"$GD_C4_S\",\"name\":\"uses\"}")
check "217.gen_create_relation(C4Relationship)" "$R"

# =============================
# SysML Requirement Diagram: create + req x2 + derive (4)
# =============================
R=$(curl -s -X POST $BASE/api/diagrams -H "Content-Type: application/json" -d '{"type":"SysMLRequirementDiagram","name":"TestSysML"}')
check "218.gen_create_sysml_req_diagram" "$R"
GD_SYSML_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_SYSML_DID)/elements -H "Content-Type: application/json" \
  -d '{"type":"SysMLRequirement","name":"REQ001"}')
check "219.gen_create_element(SysMLRequirement)" "$R"
GD_SYSML_R1=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_SYSML_DID)/elements -H "Content-Type: application/json" \
  -d '{"type":"SysMLRequirement","name":"REQ002","x1":300,"y1":100,"x2":500,"y2":200}')
check "220.gen_create_element(SysMLRequirement2)" "$R"
GD_SYSML_R2=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_SYSML_DID)/relations -H "Content-Type: application/json" \
  -d "{\"type\":\"SysMLDeriveReqt\",\"sourceId\":\"$GD_SYSML_R1\",\"targetId\":\"$GD_SYSML_R2\"}")
check "221.gen_create_relation(SysMLDeriveReqt)" "$R"

# =============================
# Wireframe Diagram: create + frame + button (3)
# =============================
R=$(curl -s -X POST $BASE/api/diagrams -H "Content-Type: application/json" -d '{"type":"WFWireframeDiagram","name":"TestWF"}')
check "222.gen_create_wireframe_diagram" "$R"
GD_WF_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_WF_DID)/elements -H "Content-Type: application/json" \
  -d '{"type":"WFFrame","name":"LoginPage"}')
check "223.gen_create_element(WFFrame)" "$R"

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_WF_DID)/elements -H "Content-Type: application/json" \
  -d '{"type":"WFButton","name":"Submit","x1":100,"y1":200,"x2":200,"y2":240}')
check "224.gen_create_element(WFButton)" "$R"

# =============================
# MindMap Diagram: create + node x2 + edge (4)
# =============================
R=$(curl -s -X POST $BASE/api/diagrams -H "Content-Type: application/json" -d '{"type":"MMMindmapDiagram","name":"TestMM"}')
check "225.gen_create_mindmap_diagram" "$R"
GD_MM_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_MM_DID)/elements -H "Content-Type: application/json" \
  -d '{"type":"MMNode","name":"Central"}')
check "226.gen_create_element(MMNode_Central)" "$R"
GD_MM_N1=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_MM_DID)/elements -H "Content-Type: application/json" \
  -d '{"type":"MMNode","name":"Branch1","x1":300,"y1":100,"x2":400,"y2":140}')
check "227.gen_create_element(MMNode_Branch1)" "$R"
GD_MM_N2=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_MM_DID)/relations -H "Content-Type: application/json" \
  -d "{\"type\":\"MMEdge\",\"sourceId\":\"$GD_MM_N1\",\"targetId\":\"$GD_MM_N2\"}")
check "228.gen_create_relation(MMEdge)" "$R"

# =============================
# AWS Diagram: create + service x2 + arrow (4)
# =============================
R=$(curl -s -X POST $BASE/api/diagrams -H "Content-Type: application/json" -d '{"type":"AWSDiagram","name":"TestAWS"}')
check "229.gen_create_aws_diagram" "$R"
GD_AWS_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_AWS_DID)/elements -H "Content-Type: application/json" \
  -d '{"type":"AWSService","name":"EC2"}')
check "230.gen_create_element(AWSService_EC2)" "$R"
GD_AWS_S1=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_AWS_DID)/elements -H "Content-Type: application/json" \
  -d '{"type":"AWSService","name":"RDS","x1":300,"y1":100,"x2":400,"y2":150}')
check "231.gen_create_element(AWSService_RDS)" "$R"
GD_AWS_S2=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_AWS_DID)/relations -H "Content-Type: application/json" \
  -d "{\"type\":\"AWSArrow\",\"sourceId\":\"$GD_AWS_S1\",\"targetId\":\"$GD_AWS_S2\"}")
check "232.gen_create_relation(AWSArrow)" "$R"

# =============================
# Azure Diagram: create + service x2 + connector (4)
# =============================
R=$(curl -s -X POST $BASE/api/diagrams -H "Content-Type: application/json" -d '{"type":"AzureDiagram","name":"TestAzure"}')
check "233.gen_create_azure_diagram" "$R"
GD_AZ_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_AZ_DID)/elements -H "Content-Type: application/json" \
  -d '{"type":"AzureService","name":"AppService"}')
check "234.gen_create_element(AzureService_AppSvc)" "$R"
GD_AZ_S1=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_AZ_DID)/elements -H "Content-Type: application/json" \
  -d '{"type":"AzureService","name":"CosmosDB","x1":300,"y1":100,"x2":400,"y2":150}')
check "235.gen_create_element(AzureService_CosmosDB)" "$R"
GD_AZ_S2=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_AZ_DID)/relations -H "Content-Type: application/json" \
  -d "{\"type\":\"AzureConnector\",\"sourceId\":\"$GD_AZ_S1\",\"targetId\":\"$GD_AZ_S2\"}")
check "236.gen_create_relation(AzureConnector)" "$R"

# =============================
# GCP Diagram: create + product x2 + path (4)
# =============================
R=$(curl -s -X POST $BASE/api/diagrams -H "Content-Type: application/json" -d '{"type":"GCPDiagram","name":"TestGCP"}')
check "237.gen_create_gcp_diagram" "$R"
GD_GCP_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_GCP_DID)/elements -H "Content-Type: application/json" \
  -d '{"type":"GCPProduct","name":"ComputeEngine"}')
check "238.gen_create_element(GCPProduct_CE)" "$R"
GD_GCP_P1=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_GCP_DID)/elements -H "Content-Type: application/json" \
  -d '{"type":"GCPProduct","name":"CloudSQL","x1":300,"y1":100,"x2":400,"y2":150}')
check "239.gen_create_element(GCPProduct_SQL)" "$R"
GD_GCP_P2=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['modelId'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_GCP_DID)/relations -H "Content-Type: application/json" \
  -d "{\"type\":\"GCPPath\",\"sourceId\":\"$GD_GCP_P1\",\"targetId\":\"$GD_GCP_P2\"}")
check "240.gen_create_relation(GCPPath)" "$R"

# =============================
# New API: Element Relationships + Views (2)
# =============================
check "250.gen_element_relationships" "$(curl -s $BASE/api/elements/$(enc $GD_C1_MID)/relationships)"
check "251.gen_element_views" "$(curl -s $BASE/api/elements/$(enc $GD_C1_MID)/views)"

# =============================
# New API: Create View Of (2)
# =============================
R=$(curl -s -X POST $BASE/api/diagrams -H "Content-Type: application/json" -d '{"type":"UMLClassDiagram","name":"TestClassDiag2"}')
check "252.gen_create_class_diagram2" "$R"
GD_CD2_ID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_CD2_ID)/create-view-of -H "Content-Type: application/json" \
  -d "{\"modelId\":\"$GD_C1_MID\",\"x\":100,\"y\":100}")
check "253.gen_create_view_of" "$R"

# =============================
# New API: Reconnect Edge (1)
# =============================
check "254.gen_reconnect_edge" "$(curl -s -X PUT $BASE/api/views/$(enc $GD_ASSOC_VID)/reconnect -H 'Content-Type: application/json' \
  -d "{\"newTargetId\":\"$GD_IF_MID\"}")"

# =============================
# New API: Relocate Element (1)
# =============================
check "255.gen_relocate_element" "$(curl -s -X PUT $BASE/api/elements/$(enc $GD_ENUM_MID)/relocate -H 'Content-Type: application/json' \
  -d "{\"newParentId\":\"$GD_PKG_MID\"}")"

# =============================
# New API: Open Diagram + Zoom (2)
# =============================
check "256.gen_open_diagram" "$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_CD_ID)/open)"
check "257.gen_set_zoom" "$(curl -s -X PUT $BASE/api/diagrams/$(enc $GD_CD_ID)/zoom -H 'Content-Type: application/json' -d '{"level":1.5}')"

# =============================
# New API: Validate Model (1)
# =============================
check "258.gen_validate_model" "$(curl -s -X POST $BASE/api/validate)"

# =============================
# New API: Export All Diagrams (1)
# =============================
mkdir -p /tmp/staruml_export_test
check "259.gen_export_all" "$(curl -s -X POST $BASE/api/project/export-all -H 'Content-Type: application/json' -d '{"path":"/tmp/staruml_export_test","format":"png"}')"

# =============================
# New API: Export Fragment (1)
# =============================
R=$(curl -s -X POST $BASE/api/project/export -H 'Content-Type: application/json' \
  -d "{\"elementId\":\"$GD_C1_MID\",\"path\":\"/tmp/test_fragment.mfj\"}")
check "260.gen_export_fragment" "$R"

# =============================
# New API: Import Fragment (1)
# =============================
R=$(curl -s -X POST $BASE/api/project/import -H 'Content-Type: application/json' \
  -d "{\"path\":\"/tmp/test_fragment.mfj\"}")
check "261.gen_import_fragment" "$R"

# =============================
# Alignment: POST /api/views/align (1)
# =============================
R=$(curl -s -X POST $BASE/api/views/align -H "Content-Type: application/json" \
  -d "{\"viewIds\":[\"$GD_C1_VID\",\"$GD_C2_VID\"],\"action\":\"align-top\"}")
check "262.gen_align_views" "$R"

# =============================
# Mermaid Import: POST /api/mermaid/import (1)
# =============================
R=$(curl -s -X POST $BASE/api/mermaid/import -H "Content-Type: application/json" \
  -d '{"code":"classDiagram\n  class Animal {\n    +String name\n  }\n  class Dog\n  Animal <|-- Dog"}')
check "263.gen_mermaid_import" "$R"

# =============================
# Diagram Generator: POST /api/diagrams/generate (1)
# =============================
R=$(curl -s -X POST $BASE/api/diagrams/generate -H "Content-Type: application/json" \
  -d '{"type":"overview"}')
check "264.gen_diagram_generator" "$R"

# =============================
# Reorder Element: PUT /api/elements/:id/reorder (1)
# =============================
R=$(curl -s -X PUT $BASE/api/elements/$(enc $GD_C1_MID)/reorder -H "Content-Type: application/json" \
  -d '{"direction":"down"}')
check "265.gen_reorder_element" "$R"

# =============================
# FoundMessage / LostMessage (2)
# =============================
R=$(curl -s -X POST $BASE/api/seq/interactions/$(enc $INT_ID)/messages -H "Content-Type: application/json" \
  -d "{\"messageType\":\"UMLFoundMessage\",\"target\":\"$LL2_ID\",\"diagramId\":\"$SD_ID\",\"name\":\"foundMsg\",\"y\":250}")
check "266.seq_create_found_message" "$R"
FOUND_MSG_ID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/seq/interactions/$(enc $INT_ID)/messages -H "Content-Type: application/json" \
  -d "{\"messageType\":\"UMLLostMessage\",\"source\":\"$LL1_ID\",\"diagramId\":\"$SD_ID\",\"name\":\"lostMsg\",\"y\":300}")
check "267.seq_create_lost_message" "$R"
LOST_MSG_ID=$(getid "$R")

# =============================
# BPMN Event Definition child: POST /api/elements/:id/children (1)
# =============================
# Get the BPMN start event ID from the BPMN diagram
GD_BPMN_SE_MID=""
if [ -n "$GD_BPMN_DID" ]; then
  R=$(curl -s "$BASE/api/diagrams/$(enc $GD_BPMN_DID)/elements")
  GD_BPMN_SE_MID=$(echo "$R" | python3 -c "
import sys,json
d=json.load(sys.stdin).get('data',[])
for e in d:
  if e.get('_type','')=='BPMNStartEvent':
    print(e['_id'])
    break
" 2>/dev/null)
fi
if [ -n "$GD_BPMN_SE_MID" ]; then
  R=$(curl -s -X POST $BASE/api/elements/$(enc $GD_BPMN_SE_MID)/children -H "Content-Type: application/json" \
    -d '{"type":"BPMNTimerEventDefinition"}')
  check "268.gen_create_child(BPMNTimerEventDefinition)" "$R"
else
  echo "SKIP 268.gen_create_child(BPMNTimerEventDefinition) - no BPMNStartEvent found"
  TOTAL_RESULTS="${TOTAL_RESULTS}SKIP 268.gen_create_child(BPMNTimerEventDefinition)\n"
fi

# =============================
# UMLFrame shape: POST /api/diagrams/:id/shapes (1)
# =============================
R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_CD_ID)/shapes -H "Content-Type: application/json" \
  -d '{"type":"UMLFrame","x1":10,"y1":10,"x2":500,"y2":400}')
check "269.gen_create_shape(UMLFrame)" "$R"

# =============================
# Style: autoResize, stereotypeDisplay (1)
# =============================
R=$(curl -s -X PUT $BASE/api/views/$(enc $GD_C1_VID)/style -H "Content-Type: application/json" \
  -d '{"autoResize":false,"stereotypeDisplay":"label"}')
check "269a.gen_style_autoResize_stereotypeDisplay" "$R"

# =============================
# UMLLinkObject: POST /api/diagrams/:id/link-object (1)
# =============================
# Create on object diagram using two existing objects
GD_OBJ2_MID=""
GD_OBJ_DID_VAR=""
# Look for the object diagram created earlier
if [ -n "$GD_OBJ_DID" ]; then
  # Create a second object for the link
  R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_OBJ_DID)/elements -H "Content-Type: application/json" \
    -d '{"type":"UMLObject","name":"obj2","x1":300,"y1":100,"x2":400,"y2":150}')
  GD_OBJ2_MID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('modelId',''))" 2>/dev/null)
  # Get first object on the diagram
  R=$(curl -s "$BASE/api/diagrams/$(enc $GD_OBJ_DID)/elements")
  GD_OBJ1_MID=$(echo "$R" | python3 -c "
import sys,json
d=json.load(sys.stdin).get('data',[])
for e in d:
  if e.get('_type','')=='UMLObject':
    print(e['_id'])
    break
" 2>/dev/null)
  if [ -n "$GD_OBJ1_MID" ] && [ -n "$GD_OBJ2_MID" ]; then
    R=$(curl -s -X POST $BASE/api/diagrams/$(enc $GD_OBJ_DID)/link-object -H "Content-Type: application/json" \
      -d "{\"name\":\"TestLinkObj\",\"sourceId\":\"$GD_OBJ1_MID\",\"targetId\":\"$GD_OBJ2_MID\"}")
    check "269b.gen_create_link_object" "$R"
  else
    echo "SKIP 269b.gen_create_link_object - objects not found"
    TOTAL_RESULTS="${TOTAL_RESULTS}SKIP 269b.gen_create_link_object\n"
  fi
else
  echo "SKIP 269b.gen_create_link_object - no object diagram"
  TOTAL_RESULTS="${TOTAL_RESULTS}SKIP 269b.gen_create_link_object\n"
fi

# =============================
# Export Doc: POST /api/project/export-doc (1)
# =============================
R=$(curl -s -X POST $BASE/api/project/export-doc -H "Content-Type: application/json" \
  -d '{"path":"/tmp/staruml_test_doc","format":"html"}')
check "269c.gen_export_doc_html" "$R"

# =============================
# Cleanup new diagrams: DELETE (9)
# =============================
check "270.gen_delete_bpmn_diagram" "$(curl -s -X DELETE $BASE/api/diagrams/$(enc $GD_BPMN_DID))"
check "271.gen_delete_c4_diagram" "$(curl -s -X DELETE $BASE/api/diagrams/$(enc $GD_C4_DID))"
check "272.gen_delete_sysml_diagram" "$(curl -s -X DELETE $BASE/api/diagrams/$(enc $GD_SYSML_DID))"
check "273.gen_delete_wireframe_diagram" "$(curl -s -X DELETE $BASE/api/diagrams/$(enc $GD_WF_DID))"
check "274.gen_delete_mindmap_diagram" "$(curl -s -X DELETE $BASE/api/diagrams/$(enc $GD_MM_DID))"
check "275.gen_delete_aws_diagram" "$(curl -s -X DELETE $BASE/api/diagrams/$(enc $GD_AWS_DID))"
check "276.gen_delete_azure_diagram" "$(curl -s -X DELETE $BASE/api/diagrams/$(enc $GD_AZ_DID))"
check "277.gen_delete_gcp_diagram" "$(curl -s -X DELETE $BASE/api/diagrams/$(enc $GD_GCP_DID))"
check "278.gen_delete_class_diagram2" "$(curl -s -X DELETE $BASE/api/diagrams/$(enc $GD_CD2_ID))"

# =============================
# Cleanup generic diagrams: DELETE /api/diagrams/:id (10)
# =============================
check "159.gen_delete_class_diagram" "$(curl -s -X DELETE $BASE/api/diagrams/$(enc $GD_CD_ID))"
check "160.gen_delete_usecase_diagram" "$(curl -s -X DELETE $BASE/api/diagrams/$(enc $GD_UC_ID))"
check "161.gen_delete_activity_diagram" "$(curl -s -X DELETE $BASE/api/diagrams/$(enc $GD_ACT_DID))"
check "162.gen_delete_statechart_diagram" "$(curl -s -X DELETE $BASE/api/diagrams/$(enc $GD_ST_DID))"
check "163.gen_delete_component_diagram" "$(curl -s -X DELETE $BASE/api/diagrams/$(enc $GD_COMP_DID))"
check "164.gen_delete_deployment_diagram" "$(curl -s -X DELETE $BASE/api/diagrams/$(enc $GD_DEP_DID))"
check "165.gen_delete_object_diagram" "$(curl -s -X DELETE $BASE/api/diagrams/$(enc $GD_OBJ_DID))"
check "166.gen_delete_communication_diagram" "$(curl -s -X DELETE $BASE/api/diagrams/$(enc $GD_COMM_DID))"
check "167.gen_delete_flowchart_diagram" "$(curl -s -X DELETE $BASE/api/diagrams/$(enc $GD_FC_DID))"
check "168.gen_delete_dfd_diagram" "$(curl -s -X DELETE $BASE/api/diagrams/$(enc $GD_DFD_DID))"

# =============================
# Cleanup: Delete all test data (reverse dependency order)
# =============================
check "169.seq_delete_message" "$(curl -s -X DELETE $BASE/api/seq/messages/$(enc $MSG_ID))"
check "169a.seq_delete_found_message" "$(curl -s -X DELETE $BASE/api/seq/messages/$(enc $FOUND_MSG_ID))"
check "169b.seq_delete_lost_message" "$(curl -s -X DELETE $BASE/api/seq/messages/$(enc $LOST_MSG_ID))"
check "170.seq_delete_combined_fragment" "$(curl -s -X DELETE $BASE/api/seq/combined-fragments/$(enc $CF_ID))"
check "171.seq_delete_lifeline(Client)" "$(curl -s -X DELETE $BASE/api/seq/lifelines/$(enc $LL1_ID))"
check "172.seq_delete_lifeline(Server)" "$(curl -s -X DELETE $BASE/api/seq/lifelines/$(enc $LL2_ID))"
# Delete auto-created UMLEndpoints from FoundMessage/LostMessage
R=$(curl -s "$BASE/api/seq/interactions/$(enc $INT_ID)")
for EP_ID in $(echo "$R" | python3 -c "
import sys,json
d=json.load(sys.stdin).get('data',{})
for p in d.get('participants',[]):
    if p.get('_type','')=='UMLEndpoint':
        print(p['_id'])
" 2>/dev/null); do
  curl -s -X DELETE "$BASE/api/elements/$(enc $EP_ID)" > /dev/null
done
check "173.seq_delete_diagram" "$(curl -s -X DELETE $BASE/api/seq/diagrams/$(enc $SD_ID))"
check "174.seq_delete_interaction" "$(curl -s -X DELETE $BASE/api/seq/interactions/$(enc $INT_ID))"

check "175.erd_delete_relationship" "$(curl -s -X DELETE $BASE/api/erd/relationships/$(enc $REL_ID))"
check "176.erd_delete_column(id)" "$(curl -s -X DELETE $BASE/api/erd/columns/$(enc $C1_ID))"
check "177.erd_delete_column(email)" "$(curl -s -X DELETE $BASE/api/erd/columns/$(enc $C2_ID))"
check "178.erd_delete_entity(users)" "$(curl -s -X DELETE $BASE/api/erd/entities/$(enc $E1_ID))"
check "179.erd_delete_entity(orders)" "$(curl -s -X DELETE $BASE/api/erd/entities/$(enc $E2_ID))"
check "180.erd_delete_diagram" "$(curl -s -X DELETE $BASE/api/erd/diagrams/$(enc $DG_ID))"
check "181.erd_delete_data_model" "$(curl -s -X DELETE $BASE/api/erd/data-models/$(enc $DM_ID))"

# =============================
# Project: save, open (2)
# =============================
check "182.save_project" "$(curl -s -X POST $BASE/api/project/save -H "Content-Type: application/json" -d '{"path":"/tmp/test_staruml.mdj"}')"
check "183.open_project" "$(curl -s -X POST $BASE/api/project/open -H "Content-Type: application/json" -d '{"path":"/tmp/test_staruml.mdj"}')"

# ============================================================
# Family API Tests (factory-generated CRUD endpoints)
# ============================================================

# --- Class/Package Diagram Family ---
R=$(curl -s -X POST $BASE/api/class/diagrams -H "Content-Type: application/json" -d '{"name":"TestClassDiag"}')
check "300.class_create_diagram" "$R"
FC_CLASS_DID=$(getid "$R")
check "301.class_list_diagrams" "$(curl -s $BASE/api/class/diagrams)"
check "302.class_get_diagram" "$(curl -s $BASE/api/class/diagrams/$(enc $FC_CLASS_DID))"
check "303.class_update_diagram" "$(curl -s -X PUT $BASE/api/class/diagrams/$(enc $FC_CLASS_DID) -H "Content-Type: application/json" -d '{"name":"TestClassDiag_Up"}')"

R=$(curl -s -X POST $BASE/api/class/classes -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_CLASS_DID\",\"name\":\"TestClass1\"}")
check "304.class_create_class" "$R"
FC_CLS_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)
check "305.class_list_classes" "$(curl -s $BASE/api/class/classes)"
check "306.class_get_class" "$(curl -s $BASE/api/class/classes/$(enc $FC_CLS_ID))"
check "307.class_update_class" "$(curl -s -X PUT $BASE/api/class/classes/$(enc $FC_CLS_ID) -H "Content-Type: application/json" -d '{"name":"TestClass1_Up"}')"

R=$(curl -s -X POST $BASE/api/class/classes/$(enc $FC_CLS_ID)/attributes -H "Content-Type: application/json" -d '{"name":"attr1","type":"string"}')
check "308.class_create_attribute" "$R"
FC_ATTR_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)
check "309.class_list_attributes" "$(curl -s $BASE/api/class/classes/$(enc $FC_CLS_ID)/attributes)"

R=$(curl -s -X POST $BASE/api/class/classes/$(enc $FC_CLS_ID)/operations -H "Content-Type: application/json" -d '{"name":"op1"}')
check "310.class_create_operation" "$R"
FC_OP_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)
check "311.class_list_operations" "$(curl -s $BASE/api/class/classes/$(enc $FC_CLS_ID)/operations)"

R=$(curl -s -X POST $BASE/api/class/interfaces -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_CLASS_DID\",\"name\":\"TestInterface1\"}")
check "312.class_create_interface" "$R"
FC_IF_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/class/generalizations -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_CLASS_DID\",\"sourceId\":\"$FC_CLS_ID\",\"targetId\":\"$FC_IF_ID\"}")
check "313.class_create_generalization" "$R"
FC_GEN_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)
check "314.class_list_generalizations" "$(curl -s $BASE/api/class/generalizations)"
check "315.class_get_generalization" "$(curl -s $BASE/api/class/generalizations/$(enc $FC_GEN_ID))"

# Cleanup class diagram
check "316.class_delete_generalization" "$(curl -s -X DELETE $BASE/api/class/generalizations/$(enc $FC_GEN_ID))"
check "317.class_delete_interface" "$(curl -s -X DELETE $BASE/api/class/interfaces/$(enc $FC_IF_ID))"
check "318.class_delete_class" "$(curl -s -X DELETE $BASE/api/class/classes/$(enc $FC_CLS_ID))"
check "319.class_delete_diagram" "$(curl -s -X DELETE $BASE/api/class/diagrams/$(enc $FC_CLASS_DID))"

# --- Use Case Diagram Family ---
R=$(curl -s -X POST $BASE/api/usecase/diagrams -H "Content-Type: application/json" -d '{"name":"TestUCDiag"}')
check "320.uc_create_diagram" "$R"
FC_UC_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/usecase/actors -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_UC_DID\",\"name\":\"Actor1\"}")
check "321.uc_create_actor" "$R"
FC_ACTOR_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/usecase/use-cases -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_UC_DID\",\"name\":\"UseCase1\"}")
check "322.uc_create_usecase" "$R"
FC_UC_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/usecase/associations -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_UC_DID\",\"sourceId\":\"$FC_ACTOR_ID\",\"targetId\":\"$FC_UC_ID\"}")
check "323.uc_create_association" "$R"
FC_UC_ASSOC_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

check "324.uc_list_actors" "$(curl -s $BASE/api/usecase/actors)"
check "325.uc_list_usecases" "$(curl -s $BASE/api/usecase/use-cases)"
check "326.uc_delete_association" "$(curl -s -X DELETE $BASE/api/usecase/associations/$(enc $FC_UC_ASSOC_ID))"
check "327.uc_delete_usecase" "$(curl -s -X DELETE $BASE/api/usecase/use-cases/$(enc $FC_UC_ID))"
check "328.uc_delete_actor" "$(curl -s -X DELETE $BASE/api/usecase/actors/$(enc $FC_ACTOR_ID))"
check "329.uc_delete_diagram" "$(curl -s -X DELETE $BASE/api/usecase/diagrams/$(enc $FC_UC_DID))"

# --- Activity Diagram Family ---
R=$(curl -s -X POST $BASE/api/activity/diagrams -H "Content-Type: application/json" -d '{"name":"TestActDiag"}')
check "330.act_create_diagram" "$R"
FC_ACT_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/activity/actions -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_ACT_DID\",\"name\":\"Action1\"}")
check "331.act_create_action" "$R"
FC_ACTION_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/activity/control-nodes -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_ACT_DID\",\"type\":\"UMLInitialNode\"}")
check "332.act_create_initial_node" "$R"
FC_INIT_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/activity/control-flows -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_ACT_DID\",\"sourceId\":\"$FC_INIT_ID\",\"targetId\":\"$FC_ACTION_ID\"}")
check "333.act_create_control_flow" "$R"
FC_CF_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

check "334.act_list_actions" "$(curl -s $BASE/api/activity/actions)"
check "335.act_delete_control_flow" "$(curl -s -X DELETE $BASE/api/activity/control-flows/$(enc $FC_CF_ID))"
check "336.act_delete_action" "$(curl -s -X DELETE $BASE/api/activity/actions/$(enc $FC_ACTION_ID))"
check "337.act_delete_initial_node" "$(curl -s -X DELETE $BASE/api/activity/control-nodes/$(enc $FC_INIT_ID))"
check "338.act_delete_diagram" "$(curl -s -X DELETE $BASE/api/activity/diagrams/$(enc $FC_ACT_DID))"

# --- State Machine Diagram Family ---
R=$(curl -s -X POST $BASE/api/statemachine/diagrams -H "Content-Type: application/json" -d '{"name":"TestSMDiag"}')
check "339.sm_create_diagram" "$R"
FC_SM_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/statemachine/states -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_SM_DID\",\"name\":\"State1\"}")
check "340.sm_create_state" "$R"
FC_STATE_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/statemachine/pseudostates -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_SM_DID\",\"pseudostateKind\":\"initial\"}")
check "341.sm_create_pseudostate" "$R"
FC_PS_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/statemachine/transitions -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_SM_DID\",\"sourceId\":\"$FC_PS_ID\",\"targetId\":\"$FC_STATE_ID\"}")
check "342.sm_create_transition" "$R"
FC_TRANS_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

check "343.sm_list_states" "$(curl -s $BASE/api/statemachine/states)"
check "344.sm_delete_transition" "$(curl -s -X DELETE $BASE/api/statemachine/transitions/$(enc $FC_TRANS_ID))"
check "345.sm_delete_state" "$(curl -s -X DELETE $BASE/api/statemachine/states/$(enc $FC_STATE_ID))"
check "346.sm_delete_pseudostate" "$(curl -s -X DELETE $BASE/api/statemachine/pseudostates/$(enc $FC_PS_ID))"
check "347.sm_delete_diagram" "$(curl -s -X DELETE $BASE/api/statemachine/diagrams/$(enc $FC_SM_DID))"

# --- Component Diagram Family ---
R=$(curl -s -X POST $BASE/api/component/diagrams -H "Content-Type: application/json" -d '{"name":"TestCompDiag"}')
check "348.comp_create_diagram" "$R"
FC_COMP_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/component/components -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_COMP_DID\",\"name\":\"Comp1\"}")
check "349.comp_create_component" "$R"
FC_COMP_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)
check "350.comp_list_components" "$(curl -s $BASE/api/component/components)"
check "351.comp_delete_component" "$(curl -s -X DELETE $BASE/api/component/components/$(enc $FC_COMP_ID))"
check "352.comp_delete_diagram" "$(curl -s -X DELETE $BASE/api/component/diagrams/$(enc $FC_COMP_DID))"

# --- Deployment Diagram Family ---
R=$(curl -s -X POST $BASE/api/deployment/diagrams -H "Content-Type: application/json" -d '{"name":"TestDeployDiag"}')
check "353.deploy_create_diagram" "$R"
FC_DEP_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/deployment/nodes -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_DEP_DID\",\"name\":\"Node1\"}")
check "354.deploy_create_node" "$R"
FC_NODE_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)
check "355.deploy_list_nodes" "$(curl -s $BASE/api/deployment/nodes)"
check "356.deploy_delete_node" "$(curl -s -X DELETE $BASE/api/deployment/nodes/$(enc $FC_NODE_ID))"
check "357.deploy_delete_diagram" "$(curl -s -X DELETE $BASE/api/deployment/diagrams/$(enc $FC_DEP_DID))"

# --- Object Diagram Family ---
R=$(curl -s -X POST $BASE/api/object/diagrams -H "Content-Type: application/json" -d '{"name":"TestObjDiag"}')
check "358.obj_create_diagram" "$R"
FC_OBJ_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/object/objects -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_OBJ_DID\",\"name\":\"Obj1\"}")
check "359.obj_create_object" "$R"
FC_OBJ_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)
check "360.obj_list_objects" "$(curl -s $BASE/api/object/objects)"
check "361.obj_delete_object" "$(curl -s -X DELETE $BASE/api/object/objects/$(enc $FC_OBJ_ID))"
check "362.obj_delete_diagram" "$(curl -s -X DELETE $BASE/api/object/diagrams/$(enc $FC_OBJ_DID))"

# --- Flowchart Family ---
R=$(curl -s -X POST $BASE/api/flowchart/diagrams -H "Content-Type: application/json" -d '{"name":"TestFCDiag"}')
check "363.fc_create_diagram" "$R"
FC_FC_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/flowchart/nodes -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_FC_DID\",\"name\":\"Process1\",\"type\":\"FCProcess\"}")
check "364.fc_create_process" "$R"
FC_PROC_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/flowchart/nodes -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_FC_DID\",\"name\":\"End\",\"type\":\"FCTerminator\"}")
check "365.fc_create_terminator" "$R"
FC_TERM_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/flowchart/flows -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_FC_DID\",\"sourceId\":\"$FC_PROC_ID\",\"targetId\":\"$FC_TERM_ID\"}")
check "366.fc_create_flow" "$R"
FC_FLOW_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

check "367.fc_list_nodes" "$(curl -s $BASE/api/flowchart/nodes)"
check "368.fc_list_flows" "$(curl -s $BASE/api/flowchart/flows)"
check "369.fc_delete_flow" "$(curl -s -X DELETE $BASE/api/flowchart/flows/$(enc $FC_FLOW_ID))"
check "370.fc_delete_process" "$(curl -s -X DELETE $BASE/api/flowchart/nodes/$(enc $FC_PROC_ID))"
check "371.fc_delete_terminator" "$(curl -s -X DELETE $BASE/api/flowchart/nodes/$(enc $FC_TERM_ID))"
check "372.fc_delete_diagram" "$(curl -s -X DELETE $BASE/api/flowchart/diagrams/$(enc $FC_FC_DID))"

# --- DFD Family ---
R=$(curl -s -X POST $BASE/api/dfd/diagrams -H "Content-Type: application/json" -d '{"name":"TestDFDDiag"}')
check "373.dfd_create_diagram" "$R"
FC_DFD_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/dfd/processes -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_DFD_DID\",\"name\":\"DFDProc1\"}")
check "374.dfd_create_process" "$R"
FC_DFD_P_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/dfd/data-stores -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_DFD_DID\",\"name\":\"Store1\"}")
check "375.dfd_create_datastore" "$R"
FC_DFD_DS_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/dfd/data-flows -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_DFD_DID\",\"sourceId\":\"$FC_DFD_P_ID\",\"targetId\":\"$FC_DFD_DS_ID\"}")
check "376.dfd_create_dataflow" "$R"
FC_DFD_DF_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

check "377.dfd_delete_dataflow" "$(curl -s -X DELETE $BASE/api/dfd/data-flows/$(enc $FC_DFD_DF_ID))"
check "378.dfd_delete_process" "$(curl -s -X DELETE $BASE/api/dfd/processes/$(enc $FC_DFD_P_ID))"
check "379.dfd_delete_datastore" "$(curl -s -X DELETE $BASE/api/dfd/data-stores/$(enc $FC_DFD_DS_ID))"
check "380.dfd_delete_diagram" "$(curl -s -X DELETE $BASE/api/dfd/diagrams/$(enc $FC_DFD_DID))"

# --- MindMap Family ---
R=$(curl -s -X POST $BASE/api/mindmap/diagrams -H "Content-Type: application/json" -d '{"name":"TestMMDiag"}')
check "381.mm_create_diagram" "$R"
FC_MM_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/mindmap/nodes -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_MM_DID\",\"name\":\"Node1\"}")
check "382.mm_create_node1" "$R"
FC_MM_N1_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/mindmap/nodes -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_MM_DID\",\"name\":\"Node2\"}")
check "383.mm_create_node2" "$R"
FC_MM_N2_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/mindmap/edges -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_MM_DID\",\"sourceId\":\"$FC_MM_N1_ID\",\"targetId\":\"$FC_MM_N2_ID\"}")
check "384.mm_create_edge" "$R"
FC_MM_EDGE_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

check "385.mm_delete_edge" "$(curl -s -X DELETE $BASE/api/mindmap/edges/$(enc $FC_MM_EDGE_ID))"
check "386.mm_delete_node1" "$(curl -s -X DELETE $BASE/api/mindmap/nodes/$(enc $FC_MM_N1_ID))"
check "387.mm_delete_node2" "$(curl -s -X DELETE $BASE/api/mindmap/nodes/$(enc $FC_MM_N2_ID))"
check "388.mm_delete_diagram" "$(curl -s -X DELETE $BASE/api/mindmap/diagrams/$(enc $FC_MM_DID))"

# --- C4 Family ---
R=$(curl -s -X POST $BASE/api/c4/diagrams -H "Content-Type: application/json" -d '{"name":"TestC4Diag"}')
check "389.c4_create_diagram" "$R"
FC_C4_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/c4/elements -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_C4_DID\",\"name\":\"Person1\",\"type\":\"C4Person\"}")
check "390.c4_create_person" "$R"
FC_C4_P_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/c4/elements -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_C4_DID\",\"name\":\"System1\",\"type\":\"C4SoftwareSystem\"}")
check "391.c4_create_system" "$R"
FC_C4_S_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/c4/relationships -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_C4_DID\",\"sourceId\":\"$FC_C4_P_ID\",\"targetId\":\"$FC_C4_S_ID\",\"name\":\"Uses\"}")
check "392.c4_create_relationship" "$R"
FC_C4_REL_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

check "393.c4_list_elements" "$(curl -s $BASE/api/c4/elements)"
check "394.c4_list_relationships" "$(curl -s $BASE/api/c4/relationships)"
check "395.c4_delete_relationship" "$(curl -s -X DELETE $BASE/api/c4/relationships/$(enc $FC_C4_REL_ID))"
check "396.c4_delete_person" "$(curl -s -X DELETE $BASE/api/c4/elements/$(enc $FC_C4_P_ID))"
check "397.c4_delete_system" "$(curl -s -X DELETE $BASE/api/c4/elements/$(enc $FC_C4_S_ID))"
check "398.c4_delete_diagram" "$(curl -s -X DELETE $BASE/api/c4/diagrams/$(enc $FC_C4_DID))"

# --- AWS Family ---
R=$(curl -s -X POST $BASE/api/aws/diagrams -H "Content-Type: application/json" -d '{"name":"TestAWSDiag"}')
check "399.aws_create_diagram" "$R"
FC_AWS_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/aws/elements -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_AWS_DID\",\"name\":\"Svc1\",\"type\":\"AWSService\"}")
check "400.aws_create_service" "$R"
FC_AWS_S1_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/aws/elements -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_AWS_DID\",\"name\":\"Svc2\",\"type\":\"AWSService\",\"x1\":300}")
check "401.aws_create_service2" "$R"
FC_AWS_S2_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/aws/arrows -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_AWS_DID\",\"sourceId\":\"$FC_AWS_S1_ID\",\"targetId\":\"$FC_AWS_S2_ID\"}")
check "402.aws_create_arrow" "$R"
FC_AWS_ARR_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

check "403.aws_delete_arrow" "$(curl -s -X DELETE $BASE/api/aws/arrows/$(enc $FC_AWS_ARR_ID))"
check "404.aws_delete_service1" "$(curl -s -X DELETE $BASE/api/aws/elements/$(enc $FC_AWS_S1_ID))"
check "405.aws_delete_service2" "$(curl -s -X DELETE $BASE/api/aws/elements/$(enc $FC_AWS_S2_ID))"
check "406.aws_delete_diagram" "$(curl -s -X DELETE $BASE/api/aws/diagrams/$(enc $FC_AWS_DID))"

# --- Azure Family ---
R=$(curl -s -X POST $BASE/api/azure/diagrams -H "Content-Type: application/json" -d '{"name":"TestAzureDiag"}')
check "407.azure_create_diagram" "$R"
FC_AZ_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/azure/elements -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_AZ_DID\",\"name\":\"AzSvc1\",\"type\":\"AzureService\"}")
check "408.azure_create_service" "$R"
FC_AZ_S_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

check "409.azure_list_elements" "$(curl -s $BASE/api/azure/elements)"
check "410.azure_delete_service" "$(curl -s -X DELETE $BASE/api/azure/elements/$(enc $FC_AZ_S_ID))"
check "411.azure_delete_diagram" "$(curl -s -X DELETE $BASE/api/azure/diagrams/$(enc $FC_AZ_DID))"

# --- GCP Family ---
R=$(curl -s -X POST $BASE/api/gcp/diagrams -H "Content-Type: application/json" -d '{"name":"TestGCPDiag"}')
check "412.gcp_create_diagram" "$R"
FC_GCP_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/gcp/elements -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_GCP_DID\",\"name\":\"GCPProd1\",\"type\":\"GCPProduct\"}")
check "413.gcp_create_product" "$R"
FC_GCP_P_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

check "414.gcp_list_elements" "$(curl -s $BASE/api/gcp/elements)"
check "415.gcp_delete_product" "$(curl -s -X DELETE $BASE/api/gcp/elements/$(enc $FC_GCP_P_ID))"
check "416.gcp_delete_diagram" "$(curl -s -X DELETE $BASE/api/gcp/diagrams/$(enc $FC_GCP_DID))"

# --- BPMN Family ---
R=$(curl -s -X POST $BASE/api/bpmn/diagrams -H "Content-Type: application/json" -d '{"name":"TestBPMNDiag"}')
check "417.bpmn_create_diagram" "$R"
FC_BPMN_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/bpmn/tasks -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_BPMN_DID\",\"name\":\"Task1\",\"type\":\"BPMNTask\"}")
check "418.bpmn_create_task" "$R"
FC_BPMN_T_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/bpmn/gateways -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_BPMN_DID\",\"type\":\"BPMNExclusiveGateway\"}")
check "419.bpmn_create_gateway" "$R"
FC_BPMN_G_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/bpmn/sequence-flows -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_BPMN_DID\",\"sourceId\":\"$FC_BPMN_T_ID\",\"targetId\":\"$FC_BPMN_G_ID\"}")
check "420.bpmn_create_seqflow" "$R"
FC_BPMN_SF_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

check "421.bpmn_list_tasks" "$(curl -s $BASE/api/bpmn/tasks)"
check "422.bpmn_list_gateways" "$(curl -s $BASE/api/bpmn/gateways)"
check "423.bpmn_delete_seqflow" "$(curl -s -X DELETE $BASE/api/bpmn/sequence-flows/$(enc $FC_BPMN_SF_ID))"
check "424.bpmn_delete_task" "$(curl -s -X DELETE $BASE/api/bpmn/tasks/$(enc $FC_BPMN_T_ID))"
check "425.bpmn_delete_gateway" "$(curl -s -X DELETE $BASE/api/bpmn/gateways/$(enc $FC_BPMN_G_ID))"
check "426.bpmn_delete_diagram" "$(curl -s -X DELETE $BASE/api/bpmn/diagrams/$(enc $FC_BPMN_DID))"

# --- SysML Family ---
R=$(curl -s -X POST $BASE/api/sysml/diagrams -H "Content-Type: application/json" -d '{"name":"TestSysMLDiag","type":"SysMLRequirementDiagram"}')
check "427.sysml_create_diagram" "$R"
FC_SYSML_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/sysml/requirements -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_SYSML_DID\",\"name\":\"Req1\"}")
check "428.sysml_create_req1" "$R"
FC_SYSML_R1_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/sysml/requirements -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_SYSML_DID\",\"name\":\"Req2\",\"x1\":300}")
check "429.sysml_create_req2" "$R"
FC_SYSML_R2_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/sysml/derive-reqts -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_SYSML_DID\",\"sourceId\":\"$FC_SYSML_R1_ID\",\"targetId\":\"$FC_SYSML_R2_ID\"}")
check "430.sysml_create_derive" "$R"
FC_SYSML_D_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

check "431.sysml_list_requirements" "$(curl -s $BASE/api/sysml/requirements)"
check "432.sysml_delete_derive" "$(curl -s -X DELETE $BASE/api/sysml/derive-reqts/$(enc $FC_SYSML_D_ID))"
check "433.sysml_delete_req1" "$(curl -s -X DELETE $BASE/api/sysml/requirements/$(enc $FC_SYSML_R1_ID))"
check "434.sysml_delete_req2" "$(curl -s -X DELETE $BASE/api/sysml/requirements/$(enc $FC_SYSML_R2_ID))"
check "435.sysml_delete_diagram" "$(curl -s -X DELETE $BASE/api/sysml/diagrams/$(enc $FC_SYSML_DID))"

# --- Wireframe Family ---
R=$(curl -s -X POST $BASE/api/wireframe/diagrams -H "Content-Type: application/json" -d '{"name":"TestWFDiag"}')
check "436.wf_create_diagram" "$R"
FC_WF_DID=$(getid "$R")

R=$(curl -s -X POST $BASE/api/wireframe/frames -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_WF_DID\",\"name\":\"Frame1\",\"type\":\"WFFrame\"}")
check "437.wf_create_frame" "$R"
FC_WF_F_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

R=$(curl -s -X POST $BASE/api/wireframe/widgets -H "Content-Type: application/json" -d "{\"diagramId\":\"$FC_WF_DID\",\"name\":\"Button1\",\"type\":\"WFButton\"}")
check "438.wf_create_widget" "$R"
FC_WF_W_ID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['_id'])" 2>/dev/null)

check "439.wf_list_frames" "$(curl -s $BASE/api/wireframe/frames)"
check "440.wf_list_widgets" "$(curl -s $BASE/api/wireframe/widgets)"
check "441.wf_delete_widget" "$(curl -s -X DELETE $BASE/api/wireframe/widgets/$(enc $FC_WF_W_ID))"
check "442.wf_delete_frame" "$(curl -s -X DELETE $BASE/api/wireframe/frames/$(enc $FC_WF_F_ID))"
check "443.wf_delete_diagram" "$(curl -s -X DELETE $BASE/api/wireframe/diagrams/$(enc $FC_WF_DID))"

# --- Communication Diagram Family ---
R=$(curl -s -X POST $BASE/api/communication/diagrams -H "Content-Type: application/json" -d '{"name":"TestCommDiag"}')
check "444.comm_create_diagram" "$R"
FC_COMM_DID=$(getid "$R")
check "445.comm_list_diagrams" "$(curl -s $BASE/api/communication/diagrams)"
check "446.comm_delete_diagram" "$(curl -s -X DELETE $BASE/api/communication/diagrams/$(enc $FC_COMM_DID))"

# --- Information Flow Family ---
R=$(curl -s -X POST $BASE/api/infoflow/diagrams -H "Content-Type: application/json" -d '{"name":"TestInfoFlowDiag"}')
check "447.if_create_diagram" "$R"
FC_IF_DID=$(getid "$R")
check "448.if_list_diagrams" "$(curl -s $BASE/api/infoflow/diagrams)"
check "449.if_delete_diagram" "$(curl -s -X DELETE $BASE/api/infoflow/diagrams/$(enc $FC_IF_DID))"

# --- Profile Diagram Family ---
R=$(curl -s -X POST $BASE/api/profile/diagrams -H "Content-Type: application/json" -d '{"name":"TestProfDiag"}')
check "450.prof_create_diagram" "$R"
FC_PROF_DID=$(getid "$R")
check "451.prof_list_diagrams" "$(curl -s $BASE/api/profile/diagrams)"
check "452.prof_delete_diagram" "$(curl -s -X DELETE $BASE/api/profile/diagrams/$(enc $FC_PROF_DID))"

# --- Composite Structure Family ---
R=$(curl -s -X POST $BASE/api/composite/diagrams -H "Content-Type: application/json" -d '{"name":"TestCompositeDiag"}')
check "453.cs_create_diagram" "$R"
FC_CS_DID=$(getid "$R")
check "454.cs_list_diagrams" "$(curl -s $BASE/api/composite/diagrams)"

# Create part (model type is UMLAttribute)
R=$(curl -s -X POST $BASE/api/composite/parts -H "Content-Type: application/json" \
  -d "{\"diagramId\":\"$FC_CS_DID\",\"name\":\"Part1\"}")
check "454a.cs_create_part" "$R"
CS_PART_ID=$(getid "$R")
check "454b.cs_list_parts" "$(curl -s $BASE/api/composite/parts)"

# Get/Update/Delete part (modelTypes: UMLAttribute)
check "454c.cs_get_part" "$(curl -s $BASE/api/composite/parts/$(enc $CS_PART_ID))"
check "454d.cs_update_part" "$(curl -s -X PUT $BASE/api/composite/parts/$(enc $CS_PART_ID) -H "Content-Type: application/json" -d '{"name":"UpdatedPart"}')"
check "454e.cs_delete_part" "$(curl -s -X DELETE $BASE/api/composite/parts/$(enc $CS_PART_ID))"

check "455.cs_delete_diagram" "$(curl -s -X DELETE $BASE/api/composite/diagrams/$(enc $FC_CS_DID))"

# --- Timing Diagram Family ---
R=$(curl -s -X POST $BASE/api/timing/diagrams -H "Content-Type: application/json" -d '{"name":"TestTimingDiag"}')
check "456.timing_create_diagram" "$R"
FC_TIM_DID=$(getid "$R")
check "457.timing_list_diagrams" "$(curl -s $BASE/api/timing/diagrams)"

# Find UMLTimingFrameView on the diagram
R=$(curl -s $BASE/api/diagrams/$(enc $FC_TIM_DID)/views)
TIM_FRAME_VID=$(echo "$R" | python3 -c "import sys,json; views=json.load(sys.stdin)['data']; print(next(v['_id'] for v in views if v['_type']=='UMLTimingFrameView'))" 2>/dev/null)

# Create lifeline inside the frame (requires tailViewId)
R=$(curl -s -X POST $BASE/api/timing/lifelines -H "Content-Type: application/json" \
  -d "{\"diagramId\":\"$FC_TIM_DID\",\"name\":\"LL1\",\"tailViewId\":\"$TIM_FRAME_VID\"}")
check "458.timing_create_lifeline" "$R"
TIM_LL_ID=$(getid "$R")
check "459.timing_list_lifelines" "$(curl -s $BASE/api/timing/lifelines)"

# Find UMLTimingLifelineView on the diagram
R=$(curl -s $BASE/api/diagrams/$(enc $FC_TIM_DID)/views)
TIM_LL_VID=$(echo "$R" | python3 -c "import sys,json; views=json.load(sys.stdin)['data']; print(next(v['_id'] for v in views if v['_type']=='UMLTimingLifelineView'))" 2>/dev/null)

# Create timing state inside the lifeline (requires tailViewId)
R=$(curl -s -X POST $BASE/api/timing/timing-states -H "Content-Type: application/json" \
  -d "{\"diagramId\":\"$FC_TIM_DID\",\"name\":\"State1\",\"tailViewId\":\"$TIM_LL_VID\"}")
check "460.timing_create_timing_state" "$R"
TIM_TS_ID=$(getid "$R")
check "461.timing_list_timing_states" "$(curl -s $BASE/api/timing/timing-states)"

# Get/Update/Delete timing state (modelTypes: UMLConstraint)
check "461a.timing_get_timing_state" "$(curl -s $BASE/api/timing/timing-states/$(enc $TIM_TS_ID))"
check "461b.timing_update_timing_state" "$(curl -s -X PUT $BASE/api/timing/timing-states/$(enc $TIM_TS_ID) -H "Content-Type: application/json" -d '{"name":"UpdatedState"}')"
check "461c.timing_delete_timing_state" "$(curl -s -X DELETE $BASE/api/timing/timing-states/$(enc $TIM_TS_ID))"

# Get/Update/Delete lifeline
check "462.timing_get_lifeline" "$(curl -s $BASE/api/timing/lifelines/$(enc $TIM_LL_ID))"
check "463.timing_update_lifeline" "$(curl -s -X PUT $BASE/api/timing/lifelines/$(enc $TIM_LL_ID) -H "Content-Type: application/json" -d '{"name":"UpdatedLL"}')"
check "464.timing_delete_lifeline" "$(curl -s -X DELETE $BASE/api/timing/lifelines/$(enc $TIM_LL_ID))"

check "465.timing_delete_diagram" "$(curl -s -X DELETE $BASE/api/timing/diagrams/$(enc $FC_TIM_DID))"

# --- Interaction Overview Family ---
R=$(curl -s -X POST $BASE/api/overview/diagrams -H "Content-Type: application/json" -d '{"name":"TestOverviewDiag"}')
check "466.ov_create_diagram" "$R"
FC_OV_DID=$(getid "$R")
check "467.ov_list_diagrams" "$(curl -s $BASE/api/overview/diagrams)"

# Create interaction-use (model type is UMLAction)
R=$(curl -s -X POST $BASE/api/overview/interaction-uses -H "Content-Type: application/json" \
  -d "{\"diagramId\":\"$FC_OV_DID\",\"name\":\"IU1\"}")
check "467a.ov_create_interaction_use" "$R"
OV_IU_ID=$(getid "$R")
check "467b.ov_list_interaction_uses" "$(curl -s $BASE/api/overview/interaction-uses)"

# Get/Update/Delete interaction-use (modelTypes: UMLAction)
check "467c.ov_get_interaction_use" "$(curl -s $BASE/api/overview/interaction-uses/$(enc $OV_IU_ID))"
check "467d.ov_update_interaction_use" "$(curl -s -X PUT $BASE/api/overview/interaction-uses/$(enc $OV_IU_ID) -H "Content-Type: application/json" -d '{"name":"UpdatedIU"}')"
check "467e.ov_delete_interaction_use" "$(curl -s -X DELETE $BASE/api/overview/interaction-uses/$(enc $OV_IU_ID))"

# Create interaction (model type is UMLAction)
R=$(curl -s -X POST $BASE/api/overview/interactions -H "Content-Type: application/json" \
  -d "{\"diagramId\":\"$FC_OV_DID\",\"name\":\"Int1\"}")
check "467f.ov_create_interaction" "$R"
OV_INT_ID=$(getid "$R")
check "467g.ov_list_interactions" "$(curl -s $BASE/api/overview/interactions)"

# Get/Update/Delete interaction (modelTypes: UMLAction)
check "467h.ov_get_interaction" "$(curl -s $BASE/api/overview/interactions/$(enc $OV_INT_ID))"
check "467i.ov_update_interaction" "$(curl -s -X PUT $BASE/api/overview/interactions/$(enc $OV_INT_ID) -H "Content-Type: application/json" -d '{"name":"UpdatedInt"}')"
check "467j.ov_delete_interaction" "$(curl -s -X DELETE $BASE/api/overview/interactions/$(enc $OV_INT_ID))"

check "468.ov_delete_diagram" "$(curl -s -X DELETE $BASE/api/overview/diagrams/$(enc $FC_OV_DID))"

# =============================
# Restore project to pre-test state
# =============================
echo ""
echo "Restoring project from snapshot..."
curl -s -X POST $BASE/api/project/open -H "Content-Type: application/json" -d "{\"path\":\"$SNAPSHOT\"}" > /dev/null

# Cleanup temp files
rm -f /tmp/test_export.png /tmp/test_export.svg /tmp/test_export.jpeg /tmp/test_export.pdf /tmp/test_ddl.sql /tmp/test_fragment.mfj /tmp/test_staruml.mdj "$SNAPSHOT"
rm -rf /tmp/staruml_export_test /tmp/staruml_test_doc

# =============================
# Results
# =============================
echo ""
echo "========================================"
echo " StarUML Controller - Test Results"
echo "========================================"
printf "%b" "$TOTAL_RESULTS"
echo "========================================"
echo " PASS: $PASS  FAIL: $FAIL  TOTAL: $((PASS+FAIL))"
echo "========================================"

if [ $FAIL -eq 0 ]; then
    exit 0
else
    exit 1
fi
