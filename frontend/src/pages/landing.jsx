import React from 'react'
import "../App.css"
import { Link, useNavigate } from 'react-router-dom'
// import { useNavigate } from 'react-router-dom';



export default function LandingPage() {
  const router = useNavigate();
  return (<>
    <div className='landingPageContainer'>
      <nav>
        <div className='navHeader'>
          <h2>AirStreem</h2>
        </div>
        <div className="navList">
          <p onClick={() => {
            router('/sgge3')
          }}>Join as Guest</p>
          <p onClick={() => {
            router('/auth');
          }}>Register</p>
          <div role='button'>
            <p onClick={() => {
              router('/auth')
            }}>Login</p>
          </div>
        </div>
      </nav>

      <div className='landingMainContainer'>

        <div>
          <h1><span style={{ color: "#ff9839" }}>Connect</span> with your love Ones</h1>
          <p>Cover distance by Video Stream.</p>
          <div role="button">
            <Link to={"/auth"}>Get Started</Link>
          </div>
        </div>

        <div>
          <img src="/mobile.png" alt="moblie app image" />
        </div>
      </div>
    </div>


  </>
  )
}
