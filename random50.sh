#!/bin/bash
set -e

NEW_UUID=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w "$2" | head -n 1)
RES=$(curl -d '{"type":"'"$1"'", "msg":"'"$NEW_UUID"'"}' -H "Content-Type: application/json" -X POST http://localhost:8080/50)

echo $RES
