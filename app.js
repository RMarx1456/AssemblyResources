const express = require('express');
const mariadb = require('mariadb');
const dotenv = require('dotenv').config();
const path = require('path');
const PORT = 10001;

//Executable stuff
const { spawn } = require('child_process');
const Assembler = 'nasm'
const AssemblerArgs = ['-f elf64 executables/init.asm', __dirname]
const Linker = 'ld'
const LinkerArgs = ['executables/init.o -o init', __dirname]
const initPath = 'init'
const initArgs = [null, null];

let init;

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

    RET: 80,
    identifier: 220
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
    spawn(Assembler, AssemblerArgs);
    spawn(Linker, LinkerArgs);
}

function setupChild(childProcess) {
    Console.log('Debug flag.');
    childProcess.stdout.on('data', (data) => {
        regBuffer.push(data);
        console.log(data.toString());
    });
    childProcess.on('close', (code) => {
        console.log(code)
    });
}

async function createProcessQuery(connection, name, path, args) {
    console.log(name);
    console.log(path);
    console.log(args);
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
            ${RAX.toString(10)}, ${RDI.toString(10)}, 
            ${RSI.toString(10)}, ${RDX.toString(10)}, 
            ${R10.toString(10)}, ${R8.toString(10)}, 
            ${R9.toString(10)}, ${RET.toString(10)})`
        );
    }
    catch (err) {
        console.error(err);
        throw err;
    }
}
async function addSyscall(connection, ID, regsBuffer) {
    while(true) {
        regs = regsBuffer.shift();
        if(regs.readInt32LE(BufferOffsets.identifier.toString === 'regs')) {
            let RAX = regs.readBigUInt64LE(BufferOffsets.RAX);
            let RDI = regs.readBigUInt64LE(BufferOffsets.RDI);
            let RSI = regs.readBigUInt64LE(BufferOffsets.RSI);
            let RDX = regs.readBigUInt64LE(BufferOffsets.RDX);
            let R10 = regs.readBigUInt64LE(BufferOffsets.R10);
            let R8 = regs.readBigUInt64LE(BufferOffsets.R8);
            let R9 = regs.readBigUInt64LE(BufferOffsets.R9);
            let RET = regs.readBigUInt64LE(BufferOffsets.RET);
    
        await syscallQuery(regs, RAX, RDI, RSI, RDX, R10, R8, R9, RET);
        break;
        }
        else {

            continue;
        }
    }



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

    async function createProcess(conn, processName, processPath, processArgs) {
        await createProcessQuery(conn, processName, processPath, processArgs);
        init = spawn(initPath, initArgs);
        init.stdin.write(processPath);
        init.stdin.write(processArgs);
        init.stdin.write(null);
    }

    if(data.name != null && data.path != null && execution == false) {
        execution = true; //Locking execution
        let args;
        if(data.args === undefined) {
            args = 'NULL'
        }
        else {
            args = data.args;
        }
        await createProcess(conn, data.name, data.path, args)


        res.render('home', {data, errors: []});
    }


    res.render('home', {data, errors: []});
})




// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
