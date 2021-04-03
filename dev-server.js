const express = require('express')

const app = express()

app.use('/syzygy', express.static(__dirname))

const port = process.env.PORT || 8000
app.listen(port, () => {
    console.log(`listening at http://localhost:${port}/syzygy`)
})