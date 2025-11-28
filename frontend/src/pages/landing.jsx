import React, { useState } from "react";
import "../App.css";
import bg from "../assets/background.png";
import { useNavigate } from "react-router-dom";
import CircularProgress from "@mui/material/CircularProgress";

export default function LandingPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGetStarted = () => {
    setLoading(true);
    // small delay to show loader;
    setTimeout(() => {
      navigate("/auth");
    }, 700);
  };

  return (
    <div
      className="landingPageContainer"
      style={{ backgroundImage: `url(${bg})` }}
    >
      {loading && (
        <div className="page-loader">
          <CircularProgress size={64} color="inherit" />
        </div>
      )}
      <nav>
        <div className="navHeader">
          <h2>KONVO</h2>
        </div>
        <div className="navlist">
          <p
            onClick={() => {
              navigate("/abcd");
            }}
          >
            Join as guest
          </p>
          <p
            onClick={() => {
              navigate("/auth");
            }}
          >
            Register
          </p>
          <div role="button">
            <p
              onClick={() => {
                navigate("/auth");
              }}
            >
              Login
            </p>
          </div>
        </div>
      </nav>

      <div className="landingMainContainer">
        <div>
          <h1>
            <span style={{ color: "#FF9839" }}>Connect</span> with your loved
            ones
          </h1>

          <p>Your people, one click away.</p>

          <div role="button" className="link-button">
            <button
              className="link"
              onClick={handleGetStarted}
              disabled={loading}
            >
              {loading ? "Please wait..." : "Get Started"}
            </button>
          </div>
        </div>
        <div className="main-image">
          <img src="/mobile.png" alt=""></img>
        </div>
      </div>
    </div>
  );
}
