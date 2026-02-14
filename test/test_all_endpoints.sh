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
echo "Connected. Starting tests..."
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

check "67.seq_delete_operand" "$(curl -s -X DELETE $BASE/api/seq/operands/$(enc $OP2_ID))"

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
# Cleanup: Delete all test data (reverse dependency order)
# =============================
check "78.seq_delete_message" "$(curl -s -X DELETE $BASE/api/seq/messages/$(enc $MSG_ID))"
check "79.seq_delete_combined_fragment" "$(curl -s -X DELETE $BASE/api/seq/combined-fragments/$(enc $CF_ID))"
check "80.seq_delete_lifeline(Client)" "$(curl -s -X DELETE $BASE/api/seq/lifelines/$(enc $LL1_ID))"
check "81.seq_delete_lifeline(Server)" "$(curl -s -X DELETE $BASE/api/seq/lifelines/$(enc $LL2_ID))"
check "82.seq_delete_diagram" "$(curl -s -X DELETE $BASE/api/seq/diagrams/$(enc $SD_ID))"
check "83.seq_delete_interaction" "$(curl -s -X DELETE $BASE/api/seq/interactions/$(enc $INT_ID))"

check "84.erd_delete_relationship" "$(curl -s -X DELETE $BASE/api/erd/relationships/$(enc $REL_ID))"
check "85.erd_delete_column(id)" "$(curl -s -X DELETE $BASE/api/erd/columns/$(enc $C1_ID))"
check "86.erd_delete_column(email)" "$(curl -s -X DELETE $BASE/api/erd/columns/$(enc $C2_ID))"
check "87.erd_delete_entity(users)" "$(curl -s -X DELETE $BASE/api/erd/entities/$(enc $E1_ID))"
check "88.erd_delete_entity(orders)" "$(curl -s -X DELETE $BASE/api/erd/entities/$(enc $E2_ID))"
check "89.erd_delete_diagram" "$(curl -s -X DELETE $BASE/api/erd/diagrams/$(enc $DG_ID))"
check "90.erd_delete_data_model" "$(curl -s -X DELETE $BASE/api/erd/data-models/$(enc $DM_ID))"

# =============================
# Project: save, open (2)
# =============================
check "91.save_project" "$(curl -s -X POST $BASE/api/project/save -H "Content-Type: application/json" -d '{"path":"/tmp/test_staruml.mdj"}')"
check "92.open_project" "$(curl -s -X POST $BASE/api/project/open -H "Content-Type: application/json" -d '{"path":"/tmp/test_staruml.mdj"}')"

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
