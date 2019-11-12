#!/bin/bash
set -e

LENGTH=$(shuf -i 1-100000 -n 1)
NEW_UUID=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w "$LENGTH" | head -n 1)
RES=$(curl -d '{"type":"'"$1"'", "msg":"'"$NEW_UUID"'"}' -H "Content-Type: application/json" -X POST http://localhost:8080/50)

echo $RES
