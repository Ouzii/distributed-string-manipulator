#!/bin/bash

echo "5 i)  What is the average time for sending 50 messages between two nodes (random payload)?"
RANDOM_LENGTH=$(shuf -i 1-100000 -n 1)
echo $RANDOM_LENGTH
RANDOM_TYPE=$(shuf -i 1-2 -n 1)
echo $RANDOM_TYPE
./random50.sh "$RANDOM_TYPE" "$RANDOM_LENGTH"
echo ""

echo "Choose 3 different fixed message sizes (payloads for min, average, max), what is the average time when sending 25 in each case?"
echo "Message payload sizes 1, 100, 100 000"
echo "min payload time with reverse:"
curl -d '{"type":1}' -H "Content-Type: application/json" -X POST http://localhost:8080/min
echo "min payload time with uppercase:"
curl -d '{"type":2}' -H "Content-Type: application/json" -X POST http://localhost:8080/min
echo ""
echo "avg payload time with reverse:"
curl -d '{"type":1}' -H "Content-Type: application/json" -X POST http://localhost:8080/avg
echo "avg payload time with uppercase:"
curl -d '{"type":2}' -H "Content-Type: application/json" -X POST http://localhost:8080/avg
echo ""
echo "max payload time with reverse:"
curl -d '{"type":1}' -H "Content-Type: application/json" -X POST http://localhost:8080/max
echo "max payload time with uppercase:"
curl -d '{"type":2}' -H "Content-Type: application/json" -X POST http://localhost:8080/max
echo ""

echo "iii). Choose a unique payload, e.g., average size, and then measure the inter arrival rate between messages?"
echo "average expected size is 100"
curl -H "Content-Type: application/json" -X POST http://localhost:8080/time