const express = require('express')
const app = express()

const cluster = require('cluster')
let workers = [];

if (cluster.isMaster) {

    cluster.on('message', (worker, msg) => {
        console.log(msg)
    })

    app.get('/', (req, res) => {
        eachWorker(worker => {
            worker.send('big announcement to all workers');
        });

        res.status(200).send();
    })

    const eachWorker = callback => {
        for (const id in cluster.workers) {
          callback(cluster.workers[id]);
        }
      }

    

    app.listen(8000, () => {
        console.log('Listening port 8000')
    })

    for (let i = 0; i < 2; i++) {
        workers.push(cluster.fork());
    }

} else if (cluster.worker.id === 1) {

    console.log('Worker ' + cluster.worker.id + ' is listening');
    process.on('message', (msg) => {
        process.send('got it')
    })
}else if (cluster.worker.id === 2) {

    console.log('Worker ' + cluster.worker.id + ' is listening');
    process.on('message', (msg) => {
        process.send('huehuehue')
    })
}