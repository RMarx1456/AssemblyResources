const express = require('express');
const mariadb = require('mariadb');
const dotenv = require('dotenv').config();
const path = require('path');
const PORT = 10001;


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
async function updateDB(
    name, RAX, 
    RDI, RSI, 
    RDX, R10, 
    R8, R9) {
    if(isNaN(RAX) == true) {
        console.log("RAX MUST be an integer").
        return;
    }
    name = name.slice(0, 257);
    RDI = RDI.slice(0, 257);
    RSI = RSI.slice(0, 257);
    RDX = RDX.slice(0, 257);
    R10 = R10.slice(0, 257);
    R8 = R8.slice(0, 257);
    R9 = R9.slice(0, 257);
    const query = `
    INSERT INTO SYSCALL (RAX, SYS_NAME, RDI, RSI, RDX, R10, R8, R9)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
        RAX = VALUES(RAX),
        SYS_NAME = VALUES(SYS_NAME),
        RDI = VALUES(RDI),
        RSI = VALUES(RSI),
        RDX = VALUES(RDX),
        R10 = VALUES(R10),
        R8 = VALUES(R8),
        R9 = VALUES(R9);
    `;

    conn = await pool.getConnection();

    const result = await conn.query(query, [
        RAX, 
        name, 
        RDI, 
        RSI, 
        RDX, 
        R10, 
        R8, 
        R9])

    
}
async function pullSYSCALLS() {
    const query = `SELECT * FROM SYSCALL`;
    conn = await pool.getConnection();

    const result = await conn.query(query);

    return result;
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
app.post('/confirm', async (req, res) => {
    const regs = req.body;

    await updateDB(
        regs.SYS_NAME, regs.RAX, 
        regs.RDI, regs.RSI, 
        regs.RDX, regs.R10, 
        regs.R8, regs.R9,);


    res.render('confirmation', {details: regs, errors: []});
});

app.get('/SYSCALLS', async (req, res) => {
    const data = await pullSYSCALLS();
    console.log(data);
    res.render('SYSCALLS', {details: data, errors: []});
});




// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
