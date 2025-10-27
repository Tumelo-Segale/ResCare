import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./Student-Styles/Registration.css";
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

export default function Registration() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    contactNumber: "",
    email: "",
    residence: "",
    block: "",
    password: "",
    confirmPassword: "",
  });

  const [isFormValid, setIsFormValid] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "contactNumber") {
      if (/^\d{0,10}$/.test(value)) setFormData(prev => ({ ...prev, [name]: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  useEffect(() => {
    const { fullName, contactNumber, email, residence, block, password, confirmPassword } = formData;
    const allFilled =
      fullName.trim() &&
      contactNumber.length === 10 &&
      email.trim() &&
      residence.trim() &&
      block.trim() &&
      password.trim() &&
      confirmPassword.trim() &&
      password === confirmPassword;
    setIsFormValid(allFilled);
  }, [formData]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {      
      console.log("Registering student:", formData.email);
      
      // Register the student
      const registerRes = await api.post("/api/students/register", formData);

      if (registerRes.data.success) {
        console.log("Registration successful, attempting auto-login...");
        
        // Immediately login after successful registration
        const loginRes = await api.post("/api/login", {
          email: formData.email,
          password: formData.password
        });

        if (loginRes.data.success) {
          const { token, user } = loginRes.data;
          localStorage.setItem("token", token);
          localStorage.setItem("student", JSON.stringify(user));
          
          alert("Registration successful!");
          navigate("/StudentRequests", { replace: true });
        } else {
          throw new Error("Auto-login failed");
        }
      } else {
        setError(registerRes.data.message || "Registration failed.");
      }
    } catch (err) {
      console.error("Registration error:", err);
      if (err.response?.status === 400) {
        setError(err.response.data.message || "Email already registered.");
      } else if (err.message === "Auto-login failed") {
        setError("Registration successful! Please login manually.");
        navigate("/Login");
      } else if (err.code === 'NETWORK_ERROR' || err.message.includes('Network Error')) {
        setError("Cannot connect to server. Please make sure the backend server is running on port 5000.");
      } else if (err.response?.status === 404) {
        setError("Server endpoint not found. Please check if the server is running.");
      } else {
        setError(err.response?.data?.message || "Server error. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => navigate("/Login");

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

      <form className="registration-form" onSubmit={handleRegister}>
        <h1>REGISTRATION</h1>
        {error && <div className="error-message">{error}</div>}

        <div className="form-item">
          <label>Full Name:</label>
          <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Sam Smith" required />
        </div>

        <div className="form-item">
          <label>Contact Number:</label>
          <input type="tel" name="contactNumber" value={formData.contactNumber} onChange={handleChange} placeholder="0987654321" required />
          {formData.contactNumber && formData.contactNumber.length !== 10 && (
            <small style={{ color: "red" }}>Contact number must be exactly 10 digits.</small>
          )}
        </div>

        <div className="form-item">
          <label>Email:</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="student@edu.uni.ac.za" required />
        </div>

        <div className="form-item">
          <label>Residence:</label>
          <select name="residence" value={formData.residence} onChange={handleChange} required>
            <option value="">Select Residence</option>
            <option value="Dinaleding">Dinaleding</option>
            <option value="Malema">Malema</option>
            <option value="Kutlwanong">Kutlwanong</option>
            <option value="Meloding">Meloding</option>
          </select>
        </div>

        <div className="form-item">
          <label>Block:</label>
          <input type="text" name="block" value={formData.block} onChange={handleChange} placeholder="'1' or 'A'" required />
        </div>

        <div className="form-item">
          <label>Password:</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength="6" />
        </div>

        <div className="form-item">
          <label>Confirm Password:</label>
          <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
          {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
            <small style={{ color: "red" }}>Passwords do not match.</small>
          )}
        </div>

        <div className="action-buttons">
          <button type="submit" disabled={!isFormValid || loading}>
            {loading ? "Registering..." : "REGISTER"}
          </button>
          <button type="button" onClick={handleLogin}>LOGIN</button>
        </div>
      </form>
    </div>
  );
}