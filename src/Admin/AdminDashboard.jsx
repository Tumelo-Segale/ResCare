import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import "./Admin-Styles/AdminDashboard.css";
import Logo from "../assets/logo.png";

// Create axios instance with base URL
const api = axios.create({
  baseURL: "http://localhost:5000",
  timeout: 10000,
});

const socket = io("http://localhost:5000");

export default function AdminDashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch all requests from the database
  const fetchAllRequests = async () => {
    try {
      setLoading(true);
      setError("");
      
      const response = await api.get("/api/requests");
      
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

  // Load all requests from database on component mount
  useEffect(() => {
    fetchAllRequests();
    
    // Join admin room for real-time updates
    socket.emit("join-admin-room");

    // Listen for new requests
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

    // Cleanup on unmount
    return () => {
      socket.off("new-request");
      socket.off("request-updated");
    };
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  // Calculate quick stats from database data
  const pendingCount = requests.filter(r => r.status === "Pending").length;
  const approvedCount = requests.filter(r => r.status === "Approved").length;
  const completedCount = requests.filter(r => r.status === "Completed").length;
  const totalCount = requests.length;

  return (
    <div className="page-content">
      <div className="heading">
        <NavLink to="#" onClick={handleLogout}>
          <img src={Logo} alt="Logo" />
        </NavLink>
        <h1 className="title">DASHBOARD</h1>
      </div>

      <div className="admin-dashboard">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading">Loading dashboard...</div>
        ) : (
          /* ===== QUICK STATS ===== */
          <div className="quick-stats">
            <div className="stat-box pending">
              <p className="stat-label">PENDING REQUESTS</p>
              <p className="stat-value">{pendingCount}</p>
            </div>

            <div className="stat-box completed">
              <p className="stat-label">COMPLETED REQUESTS</p>
              <p className="stat-value">{completedCount}</p>
            </div>

            <div className="stat-box total">
              <p className="stat-label">TOTAL REQUESTS</p>
              <p className="stat-value">{totalCount}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}