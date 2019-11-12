const express = require('express')
const app = express()

const cluster = require('cluster')


if (cluster.isMaster) {

app.use('')

} else {



}