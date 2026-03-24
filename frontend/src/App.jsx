import './App.css'
import LandingPage from './pages/landing'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Authentication from './pages/authentication'
import  {AuthProvider}  from './contexts/AuthContext.jsx'
import VideoMeetComponent from './pages/VideoMeet.jsx'
import History from './pages/History.jsx'
import HomeComponent from './pages/home.jsx'
import IDSDashboard from './pages/IDSDashboard.jsx'

function App() {
  

  return (
    <div>
      
      <Router>

      <AuthProvider>

        <Routes>

          <Route path="/" element={<LandingPage/>}/>
          <Route path="/auth" element={<Authentication/>}/>
          <Route path="/ids" element={<IDSDashboard/>}/>
          <Route path="/:url" element={<VideoMeetComponent/>}/>
          <Route path='/history' element = {<History/>} />
          <Route path='/home' element={<HomeComponent />} />
        </Routes>

        </AuthProvider>

      </Router>
      
    </div>
  );
}

export default App
