import React from "react";
import Logo from "../assets/Logo.png";
import "./LandingPage.css";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  const handleProceed = () => {
    navigate("/Registration");
  };

  return (
    <div className="main-content">
      <img src={Logo} alt="Logo" />

      <div className="proceed-button">
        <button type="button" onClick={handleProceed}>
          PROCEED
        </button>
      </div>
    </div>
  );
}
