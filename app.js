const express = require('express');
const mariadb = require('mariadb');
const dotenv = require('dotenv').config();
const PORT = 10001;

//Executable stuff
const execute = require('child_process');

let processTableID;
let execution = false;

let savedData;


const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

async function connect() {
    try {
        let conn = await pool.getConnection();
        console.log('Connected to the database');
        return conn;
    } catch (err) {
        console.error('Error connecting to the database', err);
        throw err;
    }
}

function setupChild(childProcess) {
    childProcess.stdout.on('data', (data) => {
        console.log(data);
    });
    childProcess.on('close', (code) => {
        console.log(code)
    });
}

async function createProcessQuery(connection, name, path, args) {

}

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.static('views'));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Home page
app.get('/', (req, res) => {
    res.render('home', { errors: []});
});
app.post('/submit', async (req, res) => {
    const data = req.body;
    savedData = data;
    let errors = [];
    const conn = await connect();

    async function createProcess(processName, processPath, processArgs) {
        const childProcess = spawn(processName, [processArgs, null]);
        setupChild(childProcess);
        await createProcessQuery(conn, data.name, data.path, data.args)
    }

    if(data.name != null && data.path != null && execution == false) {
        execution = true; //Locking execution

    }
    res.render('home', {data, errors: []});
})




// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
