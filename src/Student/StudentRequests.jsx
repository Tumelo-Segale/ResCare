import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import "./Student-Styles/StudentRequests.css";
import Logo from "../assets/logo.png";

// Create axios instance with base URL
const api = axios.create({
  baseURL: "http://localhost:5000",
  timeout: 10000,
});

const socket = io("http://localhost:5000");

export default function StudentRequests() {
  const [studentData, setStudentData] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Format date and time
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return `${formattedDate} at ${formattedTime}`;
  };

  // Get student data from localStorage and fetch requests
  useEffect(() => {
    const storedStudent = localStorage.getItem('student');
    
    if (storedStudent) {
      try {
        const student = JSON.parse(storedStudent);
        setStudentData(student);
        fetchRequests(student);
        
        // Join student room for real-time updates
        socket.emit("join-student-room", {
          residence: student.residence,
          block: student.block
        });

        // Listen for new requests in the same residence and block
        socket.on("new-request", (newRequest) => {
          setRequests(prev => [newRequest, ...prev]);
        });

        // Listen for request updates
        socket.on("request-updated", (updatedRequest) => {
          setRequests(prev => 
            prev.map(req => 
              req.id === updatedRequest.id ? updatedRequest : req
            )
          );
        });

      } catch (error) {
        console.error("Error parsing student data:", error);
        setError("Error loading student data");
        setLoading(false);
      }
    } else {
      setError("No student data found. Please login again.");
      setLoading(false);
    }

    // Cleanup on unmount
    return () => {
      socket.off("new-request");
      socket.off("request-updated");
    };
  }, []);

  const fetchRequests = async (student) => {
    try {
      setLoading(true);
      setError("");
      
      const response = await api.get(
        `/api/requests/block/${student.residence}/${student.block}`
      );

      if (response.data.success) {
        setRequests(response.data.requests);
      } else {
        setError("Failed to load requests");
      }
    } catch (err) {
      console.error("Error fetching requests:", err);
      setError(err.response?.data?.message || "Failed to load requests from server");
    } finally {
      setLoading(false);
    }
  };

  // Get status class based on status value
  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'status-pending';
      case 'approved':
        return 'status-approved';
      case 'completed':
        return 'status-completed';
      default:
        return 'status-pending';
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  if (!studentData) {
    return (
      <div className="page-content">
        <div className="loading">Loading student data...</div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="heading">
        <NavLink to="#" onClick={handleLogout}>
          <img src={Logo} alt="Logo" />
        </NavLink>
        <h1 className="title">RES REQUESTS</h1>
      </div>

      <div className="student-requests-container">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading">Loading requests...</div>
        ) : requests.length > 0 ? (
          <div className="requests-list">
            {requests.map((req) => (
              <div key={req.id} className="request-card">
                <h4>{req.subject}</h4>
                <p><strong>Student:</strong> {req.fullName}</p>
                <p><strong>Residence:</strong> {req.residence} - Block {req.block}</p>
                <p className="desc"><strong>Description:</strong> {req.description}</p>
                <p><strong>Date & Time:</strong> {formatDateTime(req.dateCreated)}</p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span className={`status ${getStatusClass(req.status)}`}>
                    {req.status}
                  </span>
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-requests">
            <p>No requests found for your block.</p>
            <p>Be the first to submit a maintenance request!</p>
          </div>
        )}
      </div>
    </div>
  );
}