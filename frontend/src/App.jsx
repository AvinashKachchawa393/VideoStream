import { useState } from 'react'
import './App.css'
import LandingPage from './pages/landing'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Authentication from './pages/authentication'
import  {AuthProvider}  from './contexts/AuthContext.jsx'
import VideoMeetComponent from './pages/VideoMeet.jsx'
import history from './pages/history.jsx'
import History from './pages/history.jsx'
import HomeComponent from './pages/home.jsx'

function App() {
  

  return (
    <div>
      
      <Router>

      <AuthProvider>

        <Routes>

          <Route path="/" element={<LandingPage/>}/>
          <Route path="/auth" element={<Authentication/>}/>
          <Route path="/:url" element={<VideoMeetComponent/>}/>
          <Route path='/history' element = {<History/>} />
          <Route path='/home's element={<HomeComponent />} />
        </Routes>

        </AuthProvider>

      </Router>
      
    </div>
  );
}

export default App
