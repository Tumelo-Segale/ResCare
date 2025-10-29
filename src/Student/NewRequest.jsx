import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import Logo from "../assets/logo.png";
import "./Student-Styles/NewRequest.css";
import { API_CONFIG } from "../config/api";

// Create axios instance with environment-aware config
const api = axios.create(API_CONFIG);

export default function NewRequest() {
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState(null);
  const [formData, setFormData] = useState({ subject: "", description: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedStudent = localStorage.getItem('student');
    if (storedStudent) {
      setStudentData(JSON.parse(storedStudent));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentData) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await api.post(
        "/api/requests",
        {
          studentId: studentData.id,
          subject: formData.subject,
          description: formData.description,
        },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
          } 
        }
      );

      if (response.data.success) {
        alert('Request submitted successfully!');
        // Clear the form
        setFormData({ subject: "", description: "" });
        navigate("/StudentRequests");
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      console.error("Request submission error:", err);
      alert(err.response?.data?.message || "Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  if (!studentData) {
    return (
      <div className="page-content">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="heading">
        <NavLink to="#" onClick={handleLogout}>
          <img src={Logo} alt="Logo" />
        </NavLink>
        <h1 className="title">NEW REQUEST</h1>
      </div>

      <form className="new-request-form" onSubmit={handleSubmit}>
        <div className="form-item">
          <label>Full Name:</label>
          <input type="text" value={studentData.fullName} readOnly />
        </div>

        <div className="form-item">
          <label>Residence:</label>
          <input type="text" value={studentData.residence} readOnly />
        </div>

        <div className="form-item">
          <label>Block:</label>
          <input type="text" value={studentData.block} readOnly />
        </div>

        <div className="form-item">
          <label>Subject:</label>
          <input type="text" name="subject" value={formData.subject} onChange={handleChange} placeholder="Broken Stove, Leaking Tap, etc." required />
        </div>

        <div className="form-item">
          <label>Description:</label>
          <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Describe the issue in detail..." required />
        </div>

        <button  type="submit"  disabled={!formData.subject.trim() || !formData.description.trim() || loading} className={loading ? "loading" : ""}>
          {loading ? "SUBMITTING..." : "SUBMIT REQUEST"}
        </button>
      </form>
    </div>
  );
}