import express from 'express';
import {createServer} from 'node:http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import { connectToSocket } from './controllers/socketManager.js';
import userRoutes from './routes/user.routes.js';
import idsRoutes from './routes/ids.routes.js';

const app = express();
const server = createServer(app);
const io = connectToSocket(server);
// const allowedOrigins = ['https://videostreamfrontend.onrender.com'];
app.use(cors());
app.use(express.json({limit : "40kb"}));
app.use(express.urlencoded({limit: "40kb",extended:true}));
app.use("/api/v1/users",userRoutes);
app.use("/api/v1/ids", idsRoutes);

// Expose io instance to controllers
app.set("io", io);

app.set("port",(process.env.PORT || 8000));

app.get('/home',(req,res)=>{
    res.json({'hello':'world'});
});
const start = async ()=>{
    const connectionDb = await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/ids");
    console.log(`MongoDB connected: ${connectionDb.connection.host}`);
    server.listen(app.get('port'),()=>{
        console.log('Server is running on port 8000');
    });
}
start();