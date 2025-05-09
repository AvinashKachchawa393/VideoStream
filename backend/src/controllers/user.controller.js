import {User} from "../models/user.model.js";
import httpStatus from "http-status";
import bcrpty,{hash} from "bcrypt";
import crypto from "crypto";
// import { User } from "../models/user.model.js";
import {Meeting} from "../models/meeting.model.js";


const login = async(req,res)=>{
    const {username,password} = req.body;
    if(!username || !password){
        return res.status(400).json({message:"Please provide username and password"});
    }
    try{
        const user = await User.findOne({username});
        if(!user){
           return res.status(httpStatus.NOT_FOUND).json({message:"User not Found"}); 
        }

        let isPassword = await bcrpty.compare(password,user.password); 
        if(isPassword){
            let token = crypto.randomBytes(20).toString("hex");
            user.token = token;
            await user.save();
            console.log("User found",user);
            return res.status(httpStatus.OK).json({message:"Login successful", token:token});

        }
        else
        {
            return res.status(httpStatus.UNAUTHORIZED).json({message:"Invalid credentials"});

        }
    }
    catch(err){
       return res.status(500).json({message:`Something went wrong: ${err}`});
    }
}

const register = async (req,res)=>{
    const {name, username, password} = req.body;
    try{
        const existingUser = await User.findOne({username});
        if(existingUser){
            return res.status(httpStatus.FOUND).json({message:"User already exists"});
        }
        const hashedPassword = await bcrpty.hash(password,10);
        const newUser = new User({
            name: name,
            username: username,
            password: hashedPassword
        });
        await newUser.save();
        res.status(httpStatus.CREATED).json({message:"User registered successfully"});
    }
    catch(err){
        console.log(err);
        res.json({message: `Something went wrong: ${err}`});
    }

}

const getUserHistory = async (req,res)=>{
    const {token} = req.query;
    try{
        const user = await User.findOne({token : token});
        const meetings = await Meeting.find({user_id:user.username});
        console.log(meetings);
        res.json(meetings);

    }catch(err){
        console.log("Something went wrong in getting user history",err);
        res.json({message:`Something went wrong: ${err}`});
    }
}

const addToHistory = async (req,res)=>{
    const {token,meeting_code} = req.body;
    try{

        const user = await User.findOne({token:token});
        const newMeeting = new Meeting({
            user_id:user.username,
            meetingCode:meeting_code
        });
        await newMeeting.save();
        res.status(httpStatus.CREATED).json({message:"Meeting added to history"});

    }catch(err){
        console.log("Something went wrong",err);
        res.json({message:`Something went wrong: ${err}`});
    }
}

export {login, register, getUserHistory, addToHistory};