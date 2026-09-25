#!/bin/bash
#
# Background fetcher for the Azure DevOps statusline counts.
#
# Writes a small JSON cache with the two counts the statusline shows:
#   pr_review   pull requests that wait for MY review
#   wi_assigned open work items assigned to me in the current iteration
#
# It is launched DETACHED by the statusline whenever that cache goes stale — it
# must NEVER run on the statusline's hot path, because it does network I/O.
#
# Configuration (all from the environment, nothing is stored in this repo):
#   CLAUDE_STATUSLINE_ADO_ORG       required — Azure DevOps organization
#   CLAUDE_STATUSLINE_ADO_PROJECT   required — project inside that organization
#   CLAUDE_STATUSLINE_ADO_REPO      optional — repository for the PR count;
#                                   unset means: all repositories of the project
#   CLAUDE_STATUSLINE_ADO_USER_ID   optional — your identity GUID; resolved
#                                   automatically when it is not set
#   CLAUDE_STATUSLINE_ADO_PAT       optional — personal access token
#                                   (AZURE_DEVOPS_EXT_PAT also works)
#   CLAUDE_STATUSLINE_CACHE_DIR     optional — cache location
#
# Authentication: a PAT from the environment, or the Azure CLI (`az login`).
# No token is ever read from a file in this repository.
#
set -u

ORG="${CLAUDE_STATUSLINE_ADO_ORG:-}"
PROJ="${CLAUDE_STATUSLINE_ADO_PROJECT:-}"
REPO="${CLAUDE_STATUSLINE_ADO_REPO:-}"
[ -z "$ORG" ] && exit 0
[ -z "$PROJ" ] && exit 0

CACHE_DIR="${CLAUDE_STATUSLINE_CACHE_DIR:-$HOME/.cache/claude-statusline}"
mkdir -p "$CACHE_DIR" 2>/dev/null
CACHE="$CACHE_DIR/azure-devops-cache.json"
LOCK="$CACHE_DIR/azure-devops-fetch.lock"

command -v curl >/dev/null 2>&1 || exit 0
command -v jq >/dev/null 2>&1 || exit 0

# --- single-flight guard: bail if another fetch is already running (<120s old) ---
if [ -f "$LOCK" ]; then
    lock_age=$(( $(date +%s) - $(stat -c %Y "$LOCK" 2>/dev/null || echo 0) ))
    [ "$lock_age" -lt 120 ] && exit 0
fi
touch "$LOCK"
trap 'rm -f "$LOCK"' EXIT

# --- authentication -----------------------------------------------------------
# 1. a personal access token from the environment -> HTTP Basic
# 2. otherwise the Azure CLI -> Bearer token for the Azure DevOps resource
AUTH_HEADER=""
PAT="${CLAUDE_STATUSLINE_ADO_PAT:-${AZURE_DEVOPS_EXT_PAT:-}}"
if [ -n "$PAT" ]; then
    AUTH_HEADER="Authorization: Basic $(printf ':%s' "$PAT" | base64 | tr -d '\n')"
elif command -v az >/dev/null 2>&1; then
    # 499b84ac-1321-427f-aa17-267ca6975798 is the public resource id of Azure DevOps
    TOKEN=$(az account get-access-token \
        --resource 499b84ac-1321-427f-aa17-267ca6975798 \
        --query accessToken -o tsv 2>/dev/null)
    [ -n "$TOKEN" ] && AUTH_HEADER="Authorization: Bearer $TOKEN"
fi
[ -z "$AUTH_HEADER" ] && exit 0

api() { curl -s --max-time 10 -H "$AUTH_HEADER" "$@"; }

# --- identity: needed to ask "which PRs wait for MY review" -------------------
MYID="${CLAUDE_STATUSLINE_ADO_USER_ID:-}"
ID_CACHE="$CACHE_DIR/azure-devops-identity"
if [ -z "$MYID" ] && [ -f "$ID_CACHE" ]; then
    MYID=$(cat "$ID_CACHE" 2>/dev/null)
fi
if [ -z "$MYID" ]; then
    MYID=$(api "https://dev.azure.com/$ORG/_apis/connectionData?api-version=7.1-preview" \
        | jq -r '.authenticatedUser.id // empty' 2>/dev/null)
    [ -n "$MYID" ] && printf '%s\n' "$MYID" > "$ID_CACHE"
fi

# --- PRs awaiting MY review: active, not draft, my vote still 0 ---------------
pr_review=0
if [ -n "$MYID" ]; then
    if [ -n "$REPO" ]; then
        PR_URL="https://dev.azure.com/$ORG/$PROJ/_apis/git/repositories/$REPO/pullrequests"
    else
        PR_URL="https://dev.azure.com/$ORG/$PROJ/_apis/git/pullrequests"
    fi
    PR_JSON=$(api "$PR_URL?searchCriteria.reviewerId=$MYID&searchCriteria.status=active&api-version=7.1")
    pr_review=$(echo "$PR_JSON" | jq --arg me "$MYID" \
      '[.value[]? | select(.isDraft != true) | select((.reviewers[]? | select(.id==$me) | .vote) == 0)] | length' 2>/dev/null)
fi
[ -z "$pr_review" ] && pr_review=0

# --- open work items assigned to me IN THE CURRENT ITERATION ------------------
WI_JSON=$(curl -s --max-time 10 -X POST -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  "https://dev.azure.com/$ORG/$PROJ/_apis/wit/wiql?api-version=7.1" \
  -d '{"query":"SELECT [System.Id] FROM WorkItems WHERE [System.AssignedTo] = @Me AND [System.IterationPath] = @CurrentIteration AND [System.State] <> '\''Closed'\'' AND [System.State] <> '\''Removed'\'' AND [System.State] <> '\''Done'\''"}')
wi_assigned=$(echo "$WI_JSON" | jq '.workItems | length' 2>/dev/null)
[ -z "$wi_assigned" ] && wi_assigned=0

# --- write cache atomically (counts are integers; guard against junk) ---------
case "$pr_review" in (*[!0-9]*|'') pr_review=0;; esac
case "$wi_assigned" in (*[!0-9]*|'') wi_assigned=0;; esac
printf '{"pr_review":%s,"wi_assigned":%s,"ts":%s}\n' "$pr_review" "$wi_assigned" "$(date +%s)" \
  > "$CACHE.tmp" && mv "$CACHE.tmp" "$CACHE"
