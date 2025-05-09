import express from 'express';
import {createServer} from 'node:http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import { connectToSocket } from './controllers/socketManager.js';
import userRoutes from './routes/user.routes.js';

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

app.use(cors());
app.use(express.json({limit : "40kb"}));
app.use(express.urlencoded({limit: "40kb",extended:true}));
app.use("/api/v1/users",userRoutes);
app.use(express.json()); 
// app.use(express.urlencoded({ extended: true })); 

app.set("port",(process.env.PORT || 8000));

app.get('/home',(req,res)=>{
    res.json({'hello':'world'});
});
const start = async ()=>{
    const connectionDb = await mongoose.connect("mongodb+srv://avinashsaini:avinash@cluster0.y96ujok.mongodb.net/");
    console.log(`MongoDB connected: ${connectionDb.connection.host}`);
    server.listen(app.get('port'),()=>{
        console.log('Server is running on port 8000');
    });
}
start();