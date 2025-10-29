import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import "./Admin-Styles/AdminDashboard.css";
import Logo from "../assets/logo.png";
import { API_CONFIG, SOCKET_CONFIG } from "../config/api";

// Create axios instance with environment-aware config
const api = axios.create(API_CONFIG);

// Create socket connection with environment-aware config
const socket = io(SOCKET_CONFIG.url, SOCKET_CONFIG.options);

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
      socket.disconnect();
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

  // Calculate residence-wise pending requests
  const residencePendingCounts = requests.reduce((acc, request) => {
    if (request.status === "Pending") {
      const residence = request.residence || "Unknown";
      acc[residence] = (acc[residence] || 0) + 1;
    }
    return acc;
  }, {});

  // Convert to array and sort by residence name
  const residenceData = Object.entries(residencePendingCounts)
    .map(([residence, count]) => ({ residence, count }))
    .sort((a, b) => a.residence.localeCompare(b.residence));

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
          <>
            {/* ===== RESIDENCE PENDING REQUESTS TABLE ===== */}
            <div className="residence-table-container">
              <h2 className="table-title">Residence Requests</h2>
              {residenceData.length > 0 ? (
                <table className="residence-table">
                  <thead>
                    <tr>
                      <th className="table-header">Residence</th>
                      <th className="table-header">Requests</th>
                    </tr>
                  </thead>
                  <tbody>
                    {residenceData.map((item, index) => (
                      <tr key={index} className="table-row">
                        <td className="table-cell residence-name">{item.residence}</td>
                        <td className="table-cell pending-count">{item.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="no-data">No pending requests</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* ===== FLOATING STATS BOTTOM BAR ===== */}
      <div className="floating-stats-bar">
        <div className="stat-item" id="completed">
          <span className="stat-value-bottom">{completedCount}</span>
        </div>
        <div className="stat-item" id="pending">
          <span className="stat-value-bottom">{pendingCount}</span>
        </div>
      </div>
    </div>
  );
}