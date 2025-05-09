import { createContext, useState } from "react";
import axios from "axios";
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
// import httpStatus from "http-status-codes";
import { useEffect } from "react";
import server from '../environment'

export const AuthContext = createContext({});

const client = axios.create({
    baseURL:`${server}/api/v1/users`
})

export const AuthProvider = ({children}) => {
    const authContext = useContext(AuthContext);
    const [userData,SetUserData] = useState(authContext);


    const handleRegister = async (user,username,password)=>{
        try{
            let request = await client.post('/register',{
                name:user,
                username:username,
                password:password
            });
            if(request.status === 200){
                return request.data.message;
            }
        }catch(err){
            throw err;
        }
    }

    const router = useNavigate();

    const handleLogin = async (username,password) =>{
        try{
            let request = await client.post('/login',{
                username:username,
                password:password
            });
            if(request.status === 200){
                localStorage.setItem('token',request.data.token);
                router('/home');
            }
        }
        catch(err){
            throw err;
        }
    }

    const getHistoryOfUser = async () => {
        try {
            let request = await client.get("/get_all_activity", {
                params: {
                    token: localStorage.getItem("token")
                }
            });
            console.log(request.data);
            return request.data
        } catch(err) {
            console.log("Something went wrong in getting user history",err);
            throw err;
        }
    }

    const addToUserHistory = async (meetingCode) => {
        try {
            let request = await client.post("/add_to_activity", {
                token: localStorage.getItem("token"),
                meeting_code: meetingCode
            });
            return request
        } catch (e) {
            throw e;
        }
    }


    



    const data = {
        userData,SetUserData,handleRegister,handleLogin,getHistoryOfUser,addToUserHistory
    };
    return(
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    );
}