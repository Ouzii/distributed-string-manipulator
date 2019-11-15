const express = require('express')
const app = express()
app.use(express.json());

const cluster = require('cluster')
const REVERSE_ID = 1
const UPPERCASE_ID = 2

// request type is 1 or 2
const isValid = typeNumber => {
    if (!Number.isInteger(typeNumber)) {
        return false
    }
    if (typeNumber >= 1 && typeNumber <= 2) {
        return true
    } else {
        return false
    }
}

const createTestData = () => {

    let testData = []

    for (let index = 0; index < 50; index++) {
        let string = ""
        for (let i = 0; i < Math.floor(Math.random() * 100) + 1; i++) {
            string += Math.random().toString(36).replace(/[^a-z]+/g, '')
        }

        for (let index = 0; index < 10; index++) {
            string += string
        }

        testData.push(string)

    }
    console.log('TestData created');

    let temp = 0;
    testData.forEach(element => {
        temp += element.length
        console.log(element.length);

    })

    temp = temp / testData.length

    console.log('Average length ', temp);


    return testData
}



const formRandomStrings = (maxLength = 100000, amount) => {
    const result = []
    for (let i = 0; i < amount; i++) {
        let string = ""
        for (let i = 0; i < Math.floor(Math.random() * 99) + 1; i++) {
            string += Math.random().toString(36).replace(/[^a-z]+/g, '')
        }
        result.push(string.substr(0, maxLength))   
    }

    return result
}

const sendMessages = (id, messages) => {
    return new Promise((resolve, reject) => {
        const hrTime = process.hrtime()
        const startTime = hrTime[0] * 1000000 + hrTime[1]
        messages.forEach((message, i) => {
            cluster.workers[id].send(JSON.stringify({msg: message, count: i}))
        });

        cluster.workers[id].on('message', msg => {
            msg = JSON.parse(msg)
            if (msg.count >= messages.length-1) {
                const hrTime = process.hrtime()
                const endTime = hrTime[0] * 1000000 + hrTime[1]
                cluster.workers[id].removeAllListeners()
                resolve(endTime-startTime)
            }
        })
    })
}

// takes request and delegates it
// to the node that is responsible for the type of the request
// type 1 requests are delegated to reversing node
// type 2 requests are delegated to uppercasing node
if (cluster.isMaster) {
    const testData = createTestData()

    app.post('/', (req, res) => {
        if (req.body && req.body.type) {
            const typeNumber = parseInt(req.body.type);
            if (isValid(typeNumber)) {
                const data = {
                    msg: req.body.msg
                }
                cluster.workers[req.body.type].send(JSON.stringify(data));

                const msgHandler = (msg) => {
                    res.status(200).send(msg)
                    cluster.workers[req.body.type].removeListener('message', msgHandler)
                }

                cluster.workers[req.body.type].on('message', msgHandler)
            } else {
                res.status(400).send('Invalid type');
            }
        }
    })


    //What is the average time for sending 50 messages between two nodes (random payload)?
    app.post("/50", async (req, res) => {
        if (isValid(req.body.type)) {
            const maxLength = typeof(req.body.msg) === 'string' ? req.body.msg.length : Number.isInteger(req.body.msg) ? req.body.msg : 20
            const returned = await sendMessages(req.body.type, formRandomStrings(maxLength, 50))
            res.status(200).send('Time spent: '+returned.toString() + 'ns ('+returned/1000000+'ms), avg time of one operation: '+(returned/50).toString()+'ns ('+(returned/50000000)+'ms)\n')
        } else {
            res.status(400).send('Invalid type');
        }
    })

    // Counts execute time for 25 empty messages.
    app.post("/min", async (req, res) => {
        if (isValid(req.body.type)) {
            const returned = await sendMessages(req.body.type, formRandomStrings(0, 25))
            res.status(200).send('Time spent: '+returned.toString() + 'ns ('+returned/1000000+'ms), avg time of one operation: '+(returned/25).toString()+'ns ('+(returned/25000000)+'ms)\n')
        } else {
            res.status(400).send('Invalid type');
        }
    })

    app.post('/time', (req, res) => {
        const start = new Date().getTime()

        cluster.workers[1].send(JSON.stringify({ msg: 'giveTime', start }))

        const msgHandler = (msg) => {
            cluster.workers[1].removeListener('message', msgHandler)
            res.status(200).send(msg.toString() + 'ms');
        }
        cluster.workers[1].on('message', msgHandler)
    })
    // start app
    app.listen(8080, () => {
        console.log('Listening port 8080')
    })

    for (let i = 0; i < 2; i++) {
        cluster.fork();
    }

    // define reversing node functionality to reverse a msg and returns it
} else if (cluster.worker.id === REVERSE_ID) {

    console.log('Worker ' + cluster.worker.id + ' is listening');
    process.on('message', (msg) => {
        const objMsg = JSON.parse(msg)
        if (objMsg.msg === 'giveTime') {
            process.send(new Date().getTime() - objMsg.start)
        } else {
        const msg = objMsg.msg
        const splitted = msg.split("")
        const reverse = splitted.reverse()
        const reversed = reverse.join("")
        process.send(JSON.stringify({msg: reversed, count: objMsg.count}))
        }
    })

    // define uppercasing node functionality to uppercase a msg and returns it
} else if (cluster.worker.id === UPPERCASE_ID) {

    console.log('Worker ' + cluster.worker.id + ' is listening');
    process.on('message', (msg) => {
        const objMsg = JSON.parse(msg)
        process.send(JSON.stringify({msg: objMsg.msg.toUpperCase(), count: objMsg.count}))
    })
} 