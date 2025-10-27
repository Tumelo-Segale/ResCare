import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./Student-Styles/Login.css";
import Logo from "../assets/logo.png";
import axios from "axios";

// Create axios instance with base URL
const api = axios.create({
  baseURL: "http://localhost:5000",
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log("Attempting login with:", formData.email);
      
      const response = await api.post("/api/login", formData);

      console.log("Login response:", response.data);

      if (response.data.success) {
        const { token, user, role } = response.data;
        
        localStorage.setItem("token", token);
        
        if (role === "admin") {
          localStorage.setItem("admin", JSON.stringify(user));
          navigate("/AdminDashboard", { replace: true });
        } else if (role === "student") {
          localStorage.setItem("student", JSON.stringify(user));
          navigate("/StudentRequests", { replace: true });
        } else {
          throw new Error("Unknown user role");
        }
      } else {
        setError(response.data.message || "Login failed.");
      }
    } catch (err) {
      console.error("Login error details:", err);
      if (err.response?.status === 401) {
        setError("Invalid email or password.");
      } else if (err.response?.status === 404) {
        setError("Server endpoint not found. Please make sure the backend server is running on port 5000.");
      } else if (err.code === 'NETWORK_ERROR' || err.message.includes('Network Error')) {
        setError("Cannot connect to server. Please check if the server is running on http://localhost:5000");
      } else if (err.code === 'ERR_BAD_REQUEST') {
        setError("Invalid request. Please check your input and try again.");
      } else {
        setError(err.response?.data?.message || "Server error. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => navigate("/Registration");

  // Test server connection
  const testServerConnection = async () => {
    try {
      const response = await api.get("/api/health");
      console.log("Server health:", response.data);
      alert(`Server is running: ${response.data.message}`);
    } catch (err) {
      console.error("Server health check failed:", err);
      alert("Server is not responding. Please make sure the backend server is running on port 5000.\n\nRun: node server.js");
    }
  };

  return (
    <div className="page-content">
      <div className="heading">
        <NavLink to="/" onClick={(e) => {
          e.preventDefault();
          localStorage.clear();
          navigate("/");
        }}>
          <img src={Logo} alt="Logo" />
        </NavLink>
      </div>

      <form className="login-form" onSubmit={handleLogin}>
        <h1>LOGIN</h1>
        {error && <div className="error-message">{error}</div>}

        <div className="form-item">
          <label>Email:</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="student@email.com" required />
        </div>

        <div className="form-item">
          <label>Password:</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Enter your password" required/>
        </div>

        <div className="action-buttons">
          <button type="submit" disabled={loading || !formData.email || !formData.password}>
            {loading ? "LOGGING IN..." : "LOGIN"}
          </button>
          <button type="button" onClick={handleRegister}>REGISTER</button>
        </div>
      </form>
    </div>
  );
}