#!/bin/bash
# calls the test endpoint, takes 1 param that defines which worker is tested. 1 is reverse the msg and 2 is uppercase the msg
#msg is produced in the test endpoint

# example usage ./random50.sh 1

set -e

NEW_UUID=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w "$2" | head -n 1)
RES=$(curl -d '{"type":"'"$1"'"}' -H "Content-Type: application/json" -X POST http://localhost:8080/50)

echo $RES
