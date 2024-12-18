import express from 'express';
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { initializeSocketHandlers } from './modules/socketHandler.js';
import app from './routes/auth.js'

dotenv.config();


const server = createServer(app);
const io = new Server(server);

app.use(cors({ origin: '*' }));
app.use(bodyParser.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, '../public')));

initializeSocketHandlers(io);

server.listen(3000, () => {
    console.log('Server running on port 3000');
});

export default app;