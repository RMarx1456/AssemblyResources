const express = require('express');
const mariadb = require('mariadb');
const dotenv = require('dotenv').config();
const path = require('path');
const PORT = 10001;

//Executable stuff
const {execute} = require('child_process');
const Assembler = 'nasm'
const AssemblerArgs = ['-f elf64 executables/init.asm', __dirname]
const Linker = 'ld'
const LinkerArgs = ['executables/init.o -o init', __dirname]

let processRowID;
let execution = false;

let savedData;

let regBuffer = [];

const BufferOffsets = {
    RAX: 120,
    RDI: 112,
    RSI: 104,
    RDX: 96,
    R10: 56,
    R8: 72,
    R9: 64,

    RET: 80
}


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

function CreateExecutable() {
    execute(Assembler, AssemblerArgs);
    execute(Linker, LinkerArgs);
}

function setupChild(childProcess) {
    childProcess.stdout.on('data', (data) => {
        regBuffer.push(data);
    });
    childProcess.on('close', (code) => {
        console.log(code)
    });
}

async function createProcessQuery(connection, name, path, args) {
    try {
        let result = await connection.query(
            `INSERT INTO process (name, EXECUTION_PATH, ARGS)
            VALUES (${name}, ${path}, ${args})`
        );
        processRowID = result[0].ID;
    }
    catch (err) {
        console.error(err);
        throw err;
    }
}
async function syscallQuery(connection, ID, RAX, RDI, RSI, RDX, R10, R8, R9, RET) {
    try {
        let result = await connection.query(
            `INSERT INTO SYSCALL (ID, RAX, RDI, RSI, RDX, R10, R8, R9, RET)
            VALUES (${ID}, 
            ${RAX.toString()}, ${RDI.toString()}, 
            ${RSI.toString()}, ${RDX.toString()}, 
            ${R10.toString()}, ${R8.toString()}, 
            ${R9.toString()}, ${RET.toString()}, )`
        );
    }
    catch (err) {
        console.error(err);
        throw err;
    }
}
async function addSyscall(connection, ID, regsBuffer) {
    regs = regsBuffer.shift();
    let RAX = buffer.readBigUInt64LE(BufferOffsets.RAX);
    let RDI = buffer.readBigUInt64LE(BufferOffsets.RDI);
    let RSI = buffer.readBigUInt64LE(BufferOffsets.RSI);
    let RDX = buffer.readBigUInt64LE(BufferOffsets.RDX);
    let R10 = buffer.readBigUInt64LE(BufferOffsets.R10);
    let R8 = buffer.readBigUInt64LE(BufferOffsets.R8);
    let R9 = buffer.readBigUInt64LE(BufferOffsets.R9);
    let RET = buffer.readBigUInt64LE(BufferOffsets.RET);




}

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.static('views'));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Home page
app.get('/', (req, res) => {
    CreateExecutable();
    res.render('home', { errors: []});
});
app.post('/submit', async (req, res) => {
    const data = req.body;
    savedData = data;
    let errors = [];
    const conn = await connect();

    async function createProcess(processName, processPath, processArgs) {
        const childProcess = execute(processName, [processArgs, null]);
        setupChild(childProcess);
        await createProcessQuery(conn, data.name, data.path, data.args)
    }

    if(data.name != null && data.path != null && execution == false) {
        execution = true; //Locking execution



        res.render('home', {data, errors: []});
    }


    res.render('home', {data, errors: []});
})




// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
