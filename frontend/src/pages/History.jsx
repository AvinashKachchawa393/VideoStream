import React, { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
// import Card from '@mui/material/Card';
// import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { IconButton } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';


export default function History() {
  let { getHistoryOfUser } = useContext(AuthContext);

  let [meetings, setMeetings] = useState([]);

  const routeTo = useNavigate();

  useEffect(() => {
    let fetchHistory = async () => {
      try {
        const history = await getHistoryOfUser();
        setMeetings(history);
      }
      catch (err) {
        console.log(err);
      }
    }
    fetchHistory();
  }, []);

  let dateFormate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2,'0')
    const month = (date.getMonth() + 1).toString().padStart(2,'0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return (


    <>
    <IconButton onClick={()=>{
            routeTo('/home');
          }}>
            <HomeIcon/>
          </IconButton>


    <div>
      { (meetings.lemgth !== 0) ?   meetings.map((e,i) => {
        return (<>
          
          
          <Card key={i} variant="outlined">
            <CardContent>
              <Typography gutterBottom sx={{ color: 'text.secondary', fontSize: 14 }}>
                Code: {e.meetingCode}
              </Typography>
              <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>
                Date: {dateFormate(e.date)}
                </Typography>
              
            </CardContent>
            
          </Card>
        </>)
      }):<></>}
    </div>
    </>
  )
}
