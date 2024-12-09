const express = require('express');
const mariadb = require('mariadb');
const dotenv = require('dotenv').config();
const path = require('path');
const PORT = 10001;

//Executable stuff
const { spawn } = require('child_process');
const Assembler = '/usr/bin/nasm'
const AssemblerArgs = ['-f', 'elf64', __dirname + '/executables/init.asm']
const Linker = '/usr/bin/ld'
const LinkerArgs = [__dirname + '/executables/init.o', '-o', 'init']
const initPath = __dirname + '/executables/init'

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

async function CreateExecutable() {
    console.log(__dirname);
    let assembler = spawn(Assembler, AssemblerArgs, { stdio: 'inherit' });
    assembler.on('spawn', () => {
        console.log('Assembler Spawned!');
    });
    assembler.on('error', (err) => {
        console.error(err);
    });
    assembler.stdout?.on('data', (data) => {
        console.log(`${data.toString()}`);
    });
    assembler.on('close', () => {
        console.log('Assembler Closed!');
    });

    let linker = spawn(Linker, LinkerArgs, { stdio: 'inherit'});
    linker.on('spawn', () => {
        console.log('Linker Spawned!');
    });
    linker.on('error', (err) => {
        console.error(err);
    });
    linker.stdout?.on('data', (data) => {
        console.log(`${data.toString()}`);
    });
    linker.on('close', () => {
        console.log('Linker Closed!');
    });
}
CreateExecutable();

function setupChild(childProcess) {
    console.log('Debug flag!');
    childProcess.stdout.on('data', (data) => {
        console.log('Testing output');
        console.log(data);
        regBuffer.push(data.toString());
    });
    childProcess.on('error', (err) => {
        console.error(err);
    });
    childProcess.on('close', (code) => {
        console.log(code + " Close")
    });
}

async function createProcessQuery(connection, name, path, args) {
    console.log(name);
    console.log(path);
    console.log(args);
    try {
        let result = await connection.query(
            `INSERT INTO process (name, EXECUTION_PATH, ARGS)
            VALUES (?, ?, ?)`, [name, path, args]
        );
        console.log(result.insertId);
        processRowID = parseInt(result.insertId);
        console.log(processRowID +" ROW ID");
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
        if(regsBuffer.length > 0 && regs.readInt32LE(BufferOffsets.identifier.toString() === 'regs')) {
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
        init = spawn(initPath, [], { cwd: path.join(__dirname, '/executables')});
        setupChild(init);
        init.stdin.write(processPath + '\n');
        init.stdin.write(processArgs + '\n');
        init.stdin.write('\n');
        init.stdin.end();
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
        createProcess(conn, data.name, data.path, args)

        execution = false;
        res.render('home', {data, errors: []});
    }
    else {

    }


})




// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
