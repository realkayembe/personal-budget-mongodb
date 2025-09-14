// Budget API

const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const port = 3000;

app.use(cors());
app.use('/', express.static('public'));

const budgetData = require(path.join(__dirname, 'budgetdata.json'));

app.get('/budget', (req, res) => {
    res.json(budgetData);
});

app.listen(port, () => {
    console.log(`API served at http://localhost:${port}`);
});