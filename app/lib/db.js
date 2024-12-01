// lib/db.js
import mysql from 'mysql2/promise';

const connection = mysql.createPool({
  host: process.env.DB_HOST,//'localhost', // Change if your MySQL server is hosted elsewhere
  user: process.env.DB_USER, // Your MySQL username
  password: process.env.DB_PASSWORD, // Your MySQL password
  database: process.env.DB_NAME, // Your database name
  port:process.env.DB_PORT,
});

export default connection;