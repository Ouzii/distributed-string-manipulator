#!/bin/bash
#send request to server
# takes 2 params 1st is the type (1 is reverse or 2 is to uppercase), 2nd param is your string

# example usage ./sendMessage.sh 1 kotimato


set -e

RES=$(curl -d '{"type":"'"$1"'", "msg":"'$2'"}' -H "Content-Type: application/json" -X POST http://localhost:8080)

echo $RES
