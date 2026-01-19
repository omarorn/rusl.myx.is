#!/bin/bash
# Sync quiz images between local sandbox and R2 bucket
# Usage: ./sync-images.sh [pull|push|sync|all|status]

set -e

# Configuration
R2_REMOTE="r2"
BUCKET="trash-myx-images"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOCAL_PATH="$SCRIPT_DIR/../images-sandbox/quiz"
API_URL="https://trash.myx.is/api/admin"
PASSWORD="bobba"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Ensure local folder exists
mkdir -p "$LOCAL_PATH"

check_rclone() {
    if ! command -v rclone &> /dev/null; then
        echo -e "${RED}ERROR: rclone not installed!${NC}"
        echo ""
        echo -e "${YELLOW}Install rclone:${NC}"
        echo "  Windows: winget install Rclone.Rclone"
        echo "  Mac:     brew install rclone"
        echo "  Linux:   curl https://rclone.org/install.sh | sudo bash"
        echo ""
        echo -e "${YELLOW}Then configure R2:${NC}"
        echo "  rclone config"
        echo "  - Name: r2"
        echo "  - Type: s3"
        echo "  - Provider: Cloudflare"
        echo "  - Access Key: (from Cloudflare R2 API tokens)"
        echo "  - Secret Key: (from Cloudflare R2 API tokens)"
        echo "  - Endpoint: https://<account_id>.r2.cloudflarestorage.com"
        return 1
    fi
    return 0
}

do_pull() {
    echo -e "${CYAN}Pulling images from R2...${NC}"
    rclone sync "${R2_REMOTE}:${BUCKET}/quiz" "$LOCAL_PATH" --progress
    count=$(ls -1 "$LOCAL_PATH" 2>/dev/null | wc -l)
    echo -e "${GREEN}Downloaded $count images to $LOCAL_PATH${NC}"
}

do_push() {
    echo -e "${CYAN}Pushing images to R2...${NC}"
    echo -e "${YELLOW}WARNING: This will delete files from R2 that don't exist locally!${NC}"
    read -p "Continue? (y/N) " confirm
    if [[ "$confirm" != "y" ]]; then
        echo "Cancelled."
        return
    fi
    rclone sync "$LOCAL_PATH" "${R2_REMOTE}:${BUCKET}/quiz" --progress
    echo -e "${GREEN}Push complete.${NC}"
}

do_sync_db() {
    echo -e "${CYAN}Checking for orphaned DB records...${NC}"

    # Get sync status
    status=$(curl -s -H "Authorization: Bearer $PASSWORD" "$API_URL/sync")

    r2_total=$(echo "$status" | grep -o '"r2_total":[0-9]*' | cut -d: -f2)
    db_total=$(echo "$status" | grep -o '"db_total":[0-9]*' | cut -d: -f2)
    orphaned_db=$(echo "$status" | grep -o '"orphaned_in_db":[0-9]*' | cut -d: -f2)
    orphaned_r2=$(echo "$status" | grep -o '"orphaned_in_r2":[0-9]*' | cut -d: -f2)

    echo ""
    echo "Sync Status:"
    echo "  R2 files:        $r2_total"
    echo "  DB records:      $db_total"
    echo "  Orphaned in DB:  $orphaned_db"
    echo "  Orphaned in R2:  $orphaned_r2"

    if [[ "$orphaned_db" -gt 0 ]]; then
        echo ""
        echo -e "${YELLOW}Found $orphaned_db orphaned DB records${NC}"
        read -p "Clean up orphaned DB records? (y/N) " confirm
        if [[ "$confirm" == "y" ]]; then
            result=$(curl -s -X POST -H "Authorization: Bearer $PASSWORD" \
                -H "Content-Type: application/json" \
                -d '{"cleanDb": true}' "$API_URL/sync/cleanup")
            echo -e "${GREEN}$(echo "$result" | grep -o '"message":"[^"]*"' | cut -d: -f2 | tr -d '"')${NC}"
        fi
    fi

    if [[ "$orphaned_r2" -gt 0 ]]; then
        echo ""
        echo -e "${YELLOW}Found $orphaned_r2 orphaned R2 files${NC}"
        read -p "Delete orphaned R2 files? (y/N) " confirm
        if [[ "$confirm" == "y" ]]; then
            result=$(curl -s -X POST -H "Authorization: Bearer $PASSWORD" \
                -H "Content-Type: application/json" \
                -d '{"cleanR2": true}' "$API_URL/sync/cleanup")
            echo -e "${GREEN}$(echo "$result" | grep -o '"message":"[^"]*"' | cut -d: -f2 | tr -d '"')${NC}"
        fi
    fi

    if [[ "$orphaned_db" -eq 0 && "$orphaned_r2" -eq 0 ]]; then
        echo ""
        echo -e "${GREEN}Everything is in sync!${NC}"
    fi
}

do_status() {
    echo -e "${CYAN}Checking status...${NC}"

    # Local count
    local_count=$(ls -1 "$LOCAL_PATH" 2>/dev/null | wc -l)
    echo "Local images: $local_count"

    # API sync status
    status=$(curl -s -H "Authorization: Bearer $PASSWORD" "$API_URL/sync" 2>/dev/null)
    if [[ $? -eq 0 && -n "$status" ]]; then
        r2_total=$(echo "$status" | grep -o '"r2_total":[0-9]*' | cut -d: -f2)
        db_total=$(echo "$status" | grep -o '"db_total":[0-9]*' | cut -d: -f2)
        orphaned_db=$(echo "$status" | grep -o '"orphaned_in_db":[0-9]*' | cut -d: -f2)
        echo "R2 images:    $r2_total"
        echo "DB records:   $db_total"

        if [[ "$orphaned_db" -gt 0 ]]; then
            echo ""
            echo -e "${YELLOW}Out of sync! Run: ./sync-images.sh sync${NC}"
        fi
    else
        echo -e "${RED}Could not reach API${NC}"
    fi
}

# Main
case "${1:-status}" in
    pull)
        check_rclone && do_pull
        ;;
    push)
        check_rclone && do_push
        ;;
    sync)
        do_sync_db
        ;;
    all)
        check_rclone && do_pull
        do_sync_db
        ;;
    status)
        do_status
        ;;
    *)
        echo "Usage: $0 [pull|push|sync|all|status]"
        echo ""
        echo "Commands:"
        echo "  pull    - Download images from R2 to local folder"
        echo "  push    - Upload local images to R2 (deletes removed files)"
        echo "  sync    - Clean up orphaned DB records"
        echo "  all     - Pull from R2, then sync DB"
        echo "  status  - Show current sync status"
        exit 1
        ;;
esac
