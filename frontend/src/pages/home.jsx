import React, { useContext, useState } from 'react'
import withAuth from '../utils/withAuth'
import { useNavigate } from 'react-router-dom'
import "../App.css";
import { Button, IconButton, TextField } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import { AuthContext } from '../contexts/AuthContext';
import homeImage from "../assets/home.png";

function HomeComponent() {

    let navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");

    const {addToUserHistory} = useContext(AuthContext);
    let handleJoinVideoCall = async () => {
        await addToUserHistory(meetingCode)
        navigate(`/${meetingCode}`)
    }

    return (
      <div
        className="landingPageContainer"
        style={{ backgroundImage: `url(${homeImage})` }}
      >
            <div className="navBar">

                <div style={{ display: "flex", alignItems: "center",color:"#0f0f10ff" ,fontSize:"25px", marginLeft:"20px"}}>

                    <h2>KONVO</h2>
                </div>

                <div style={{ display: "flex", alignItems: "center"}}>
                    <IconButton onClick={
                        () => {
                            navigate("/history")
                        }
                    }>
                        <RestoreIcon />
                        <p style={{fontSize:"25px",fontWeight:"bold",color:"black"}}>History</p>
                    </IconButton>

                    <Button style={{fontSize:"25px",fontWeight:"bold",color:"black"}} onClick={() => {
                        localStorage.removeItem("token")
                        navigate("/auth")
                    }}>
                        Logout
                    </Button>
                </div>

            </div>

            <div className="meetContainer">
                <div className="leftPanel">
                    <div>
                        <h2 style={{color:"black"}}>Providing Quality Video Call</h2>

                        <div style={{ display: 'flex', gap: "10px", marginTop:"20px" }}>

                            <TextField onChange={e => setMeetingCode(e.target.value)} id="outlined-basic" label="Meeting Code" variant="outlined" />
                            <Button onClick={handleJoinVideoCall} variant='contained'>Join</Button>

                        </div>
                    </div>
                </div>
                <div className='rightPanel'>
                    <img srcSet='/logo3.png' alt="" />
                </div>
            </div>
      </div>
    )
}

export default withAuth(HomeComponent)