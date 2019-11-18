const express = require('express')
const app = express()
app.use(express.json());

const cluster = require('cluster')
let REVERSE_ID = 1
let UPPERCASE_ID = 2

// Request type is 1 or 2
const isValid = typeNumber => {
    try {
    typeNumber = Number.parseInt(typeNumber)
    if (!Number.isInteger(typeNumber)) {
        return false
    }
    if (typeNumber >= 1 && typeNumber <= 2) {
        return true
    } else {
        return false
    }
    } catch (error) {
        return false
    }
}


const formRandomStrings = (maxLength = 100000, amount) => {
    const result = []
    for (let i = 0; i < amount; i++) {
        let string = ""
        for (let i = 0; i < Math.floor(Math.random() * 99) + 1; i++) {
            string += Math.random().toString(36).replace(/[^a-z]+/g, '')
        }
        for (let index = 0; index < 15; index++) {
            string += string
        }
        result.push(string.substr(0, maxLength))   
    }
    return result
}

const sendMessages = (id, messages) => {
    return new Promise((resolve, reject) => {
        const startTime = process.hrtime.bigint()
        console.log(startTime)
        messages.forEach((message, i) => {
            cluster.workers[id].send({msg: message, count: i})
        });

        cluster.workers[id].on('message', msg => {
            if (msg.count >= messages.length-1) {
                const endTime = process.hrtime.bigint()
                cluster.workers[id].removeAllListeners()
                resolve(Number.parseFloat((endTime-startTime).toString()))
            }
        })
    })
}

// Takes request and delegates it
// to the node that is responsible for the type of the request
// type 1 requests are delegated to reversing node
// type 2 requests are delegated to uppercasing node
if (cluster.isMaster) {
    // Keeps memory of worker ids
    const workerIds = {1: 1, 2: 2}

    app.post('/', (req, res) => {
        if (req.body && req.body.type) {
            if (isValid(req.body.type) && (typeof(req.body.msg) === 'string' || req.body.msg instanceof String)) {
                cluster.workers[workerIds[req.body.type]].send({msg: req.body.msg});
                const msgHandler = (msg) => {
                    res.status(200).send(msg.msg + '\n')
                    cluster.workers[workerIds[req.body.type]].removeListener('message', msgHandler)
                }
                cluster.workers[workerIds[req.body.type]].on('message', msgHandler)
            } else {
                res.status(400).send('Invalid request body\n');
            }
        } else {
            res.status(400).send('Invalid request body\n')
        }
    })


    // What is the average time for sending 50 messages between two nodes (random payload)?
    app.post("/50", async (req, res) => {
        if (isValid(req.body.type)) {
            const maxLength = (typeof(req.body.msg) === 'string' || req.body.msg instanceof String) ? req.body.msg.length : Number.isInteger(req.body.msg) ? req.body.msg : 20
            const returned = await sendMessages(workerIds[req.body.type], formRandomStrings(maxLength, 50))
            res.status(200).send('Time spent: '+returned + 'ns ('+returned/1000000+'ms), avg time of one operation: '+(returned/50)+'ns ('+(returned/50000000)+'ms)\n')
        } else {
            res.status(400).send('Invalid request body\n');
        }
    })

    // Counts execution time for 25 empty messages.
    app.post("/min", async (req, res) => {
        if (isValid(req.body.type)) {
            const returned = await sendMessages(workerIds[req.body.type], formRandomStrings(1, 25))
            res.status(200).send('Time spent: '+returned + 'ns ('+returned/1000000+'ms), avg time of one operation: '+(returned/25)+'ns ('+(returned/25000000)+'ms)\n')
        } else {
            res.status(400).send('Invalid request body\n');
        }
    })

    // Counts execution time for 25 messages of max length (100000).
    app.post("/max", async (req, res) => {
        if (isValid(req.body.type)) {
            const returned = await sendMessages(workerIds[req.body.type], formRandomStrings(100000, 25))
            res.status(200).send('Time spent: '+returned + 'ns ('+returned/1000000+'ms), avg time of one operation: '+(returned/25)+'ns ('+(returned/25000000)+'ms)\n')
        } else {
            res.status(400).send('Invalid request body\n');
        }
    })

    // Counts execution time for 25 messages of avg length (100).
    app.post("/avg", async (req, res) => {
        if (isValid(req.body.type)) {
            const returned = await sendMessages(workerIds[req.body.type], formRandomStrings(100, 25))
            res.status(200).send('Time spent: '+returned + 'ns ('+returned/1000000+'ms), avg time of one operation: '+(returned/25)+'ns ('+(returned/25000000)+'ms)\n')
        } else {
            res.status(400).send('Invalid request body\n');
        }
    })

    // Counts time from master to worker
    app.post('/time', (req, res) => {
        const start = process.hrtime.bigint()
        cluster.workers[workerIds[1]].send({ msg: 'giveTime', start: start.toString() })
        const msgHandler = (msg) => {
            msg = Number.parseFloat(msg.result)
            const avg = msg/1000000
            cluster.workers[workerIds[1]].removeListener('message', msgHandler)
            res.status(200).send('Time from master to worker: '+ msg + 'ns ('+avg+'ms)\n');
        }
        cluster.workers[workerIds[1]].on('message', msgHandler)
    })

    // Start app
    app.listen(8080, () => {
        console.log('Listening port 8080')
    })

    for (let i = 1; i <= 2; i++) {
        cluster.fork({name: i});
    }

    // Restart workers on death or log if killed on purpose
    cluster.on('exit', (worker, code, signal) => {
        if (worker.exitedAfterDisconnect === false) {
            restartWorker(worker.id)
        } else {
            if (worker.id === workerIds[REVERSE_ID]) {
                console.log('Worker 1 killed.')
            } else if (worker.id === workerIds[UPPERCASE_ID]) {
                console.log('worker 2 killed.')
            } else {
                console.log('Unknown worker killed.')
            }
        }
    })

    // Restart worker based on its id
    const restartWorker = id => {
        let worker = {}
        switch(id) {
            case workerIds[REVERSE_ID]:
                    console.log('Worker 1 disconnected. Restarting...')
                    worker = cluster.fork({name: REVERSE_ID})
                    workerIds[1] = worker.id
                    return
            case workerIds[UPPERCASE_ID]:
                    console.log('Worker 2 disconnected. Restarting...')
                    worker = cluster.fork({name: UPPERCASE_ID})
                    workerIds[2] = worker.id
                    return
            default:
                    console.log('Unknown worker disconnected.')
                return
        }
    }

    // define reversing node functionality to reverse a msg and returns it
} else if (process.env.name == REVERSE_ID) {
    console.log('Worker', process.env.name, 'with pid', process.pid, 'is listening')
    process.on('message', (msg) => {
        const end = process.hrtime.bigint()
        const objMsg = typeof(msg) === 'string' ? JSON.parse(msg) : msg
        if (objMsg.msg === 'giveTime') {
            console.log('Worker 1 sent time to master')
            process.send({result: (end - BigInt(objMsg.start)).toString()})
        } else {
            const msg = objMsg.msg
            const splitted = msg.split("")
            const reverse = splitted.reverse()
            const reversed = reverse.join("")
            console.log('Worker 1 sent reversed string to master')
            process.send({ msg: reversed, count: objMsg.count })
        }
    })

    // define uppercasing node functionality to uppercase a msg and returns it
} else if (process.env.name == UPPERCASE_ID) {
    console.log('Worker', process.env.name, 'with pid', process.pid, 'is listening')
    process.on('message', (msg) => {
        const objMsg = typeof(msg) === 'string' ? JSON.parse(msg) : msg
        console.log('Worker 2 sent uppercased string to master')
        process.send({ msg: objMsg.msg.toUpperCase(), count: objMsg.count })
    })
} else {
    console.log('Worker', process.env.name, 'is alive with pid', process.pid, 'but doesn\'t have any functions')
}