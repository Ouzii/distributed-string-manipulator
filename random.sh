#!/bin/bash
#send request to server with randomized string
# takes 2 params 1st is the type (1 is reverse or 2 is to uppercase), 2nd param is length of the message

# example usage ./random50.sh 1 100


set -e

NEW_UUID=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w "$2" | head -n 1)
RES=$(curl -d '{"type":"'"$1"'", "msg":"'"$NEW_UUID"'"}' -H "Content-Type: application/json" -X POST http://localhost:8080)

echo $RES
