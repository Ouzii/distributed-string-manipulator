const express = require('express')
const app = express()
app.use(express.json());

const cluster = require('cluster')
const REVERSE_ID = 1
const UPPERCASE_ID = 2

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



if (cluster.isMaster) {

    app.post('/', (req, res) => {
        if (req.body && req.body.type) {
            const typeNumber = parseInt(req.body.type);
            if (isValid(typeNumber)) {
                const data = {
                    msg: req.body.msg
                }
                cluster.workers[req.body.type].send(JSON.stringify(data));

                const msgHandler = (msg) => {
                    console.log(msg)
                    res.status(200).send(msg)
                    cluster.removeListener('message', msgHandler)
                }

                cluster.workers[req.body.type].on('message', msgHandler)
            } else {
                res.status(400).send('Invalid type');
            }
        }
    })


    //What is the average time for sending 50 messages between two nodes (random payload)?
    app.post("/50", async (req, res) => {

        const start = new Date().getTime()
        const typeNumber = parseInt(req.body.type)


        if (isValid(typeNumber)) {
            const data = {
                res: res,
                msg: req.body.msg
            }
            const returned = await sendMsg(req.body.type, req.body.msg, 0)
            const resulttime = new Date().getTime() - start;
            res.status(200).send(resulttime.toString() + 'ms')
        } else {
            res.status(400).send('Invalid type');
        }
    })

    // Counts execute time for 25 empty messages.
    app.post("/min", async (req, res) => {
        const msg = ""


        const start = new Date().getTime()
        const typeNumber = parseInt(req.body.type)
        if (isValid(typeNumber)) {
            const returned = await sendMinimalMessages(req.body.type, msg, 0)
            const resulttime = new Date().getTime() - start;
            res.status(200).send(resulttime.toString() + 'ms')
        } else {
            res.status(400).send('Invalid type');
        }
    })


    const sendMinimalMessages = (id, msg, count) => {
        return new Promise((resolve, reject, ) => {

            cluster.workers[id].send(JSON.stringify({msg: msg}))

            const msgHandler = async (worker, msg) => {
                // console.log('final: ', msg)
                cluster.removeListener('message', msgHandler)
                if (count < 25) {
                    const result = await sendMinimalMessages(id, msg, count + 1)
                    resolve(result)
                } else {
                    resolve(msg)
                }
            }

            cluster.workers[id].on('message', msgHandler)
        })
    }





    const sendMsg = (id, msg, count) => {
        return new Promise((resolve, reject, ) => {
            let string = ""
            for (let i = 0; i < Math.floor(Math.random() * 99) + 1; i++) {
                string += Math.random().toString(36).replace(/[^a-z]+/g, '')
            }

            msg = string

            // console.log('original: ', msg, count, msg.length)
            cluster.workers[id].send(JSON.stringify({msg: msg}))

            const msgHandler = async (worker, msg) => {
                // console.log('final: ', msg)
                cluster.removeListener('message', msgHandler)
                if (count < 50) {
                    const result = await sendMsg(id, msg, count + 1)
                    resolve(result)
                } else {
                    resolve(msg)
                }
            }

            cluster.workers[id].on('message', msgHandler)
        })
    }

    app.get('/time', (req, res) => {
        const start = new Date().getTime()

        cluster.workers[1].send(JSON.stringify({msg: 'giveTime', start}))
        
        const msgHandler = (worker, msg) => {
            cluster.removeListener('message', msgHandler)
            res.status(200).send(msg.toString()+'ms');
        }
        cluster.workers[1].on('message', msgHandler)
    })

    app.listen(8080, () => {
        console.log('Listening port 8080')
    })

    for (let i = 0; i < 2; i++) {
        cluster.fork();
    }

} else if (cluster.worker.id === REVERSE_ID) {

    console.log('Worker ' + cluster.worker.id + ' is listening');
    process.on('message', (msg) => {
        const objMsg = JSON.parse(msg)
        if (objMsg.msg === 'giveTime') {
            process.send(new Date().getTime()-objMsg.start)
        } else {
        const msg = objMsg.msg
        const splitted = msg.split("")
        const reverse = splitted.reverse()
        const reversed = reverse.join("")
        process.send(reversed)
        }
    })

} else if (cluster.worker.id === UPPERCASE_ID) {

    console.log('Worker ' + cluster.worker.id + ' is listening');
    process.on('message', (msg) => {
        const objMsg = JSON.parse(msg)
        process.send(objMsg.msg.toUpperCase())
    })
} 