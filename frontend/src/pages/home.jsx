import React, { useContext, useState } from 'react'
import withAuth from '../utils/withAuth';
import { useNavigate } from 'react-router-dom';
import '../App.css'
import { Button, IconButton } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import TextField from '@mui/material/TextField';
import { AuthContext } from '../contexts/AuthContext';


function HomeComponent() {

    let navigate = useNavigate();
    let [meetingCode,setMeetingCode] = useState('');
    let {addToUserHistory} = useContext(AuthContext)

    let handleJoinVideoCall = async() => {
        await addToUserHistory(meetingCode);
        navigate(`/${meetingCode}`);
    }


  return (
    <>
    <div className="navBar">

       <div style={{display:'flex',alignItems:'center'}}>
        <h2>AirStreem</h2>
       </div>

        <div style={{display:'flex',alignItems:'center'}}>
            <IconButton onClick={()=>{
                navigate('/history');
            }}>
                <RestoreIcon/>
                
            </IconButton>
            <p>History</p>
            <Button style={{marginTop:'4px'}} onClick={()=>{
                localStorage.removeItem('token');
                navigate('/auth');
            }}>
                Logout
            </Button>
        </div>

    </div>

            <div className='meetContainer'>
                <div className='leftPanel'>
                    <div>
                    <h2>Providing Quality Video Call Just Like Quality Education</h2>
                    <div style={{display:'flex',gap:'10px'}}>
                        <TextField onChange={e => setMeetingCode(e.target.value)} id='outlined-basic' label='Meeting Code' varient='outlined'/>
                        <Button variant='contained' onClick={handleJoinVideoCall}>Join</Button>
                    </div>
                    </div>
                </div>
                <div className='rightPanel'>
                    <img src="/logo3.png" alt="logo 3 png" />
                </div>
            </div>



    </>
  )
}

export default withAuth(HomeComponent);