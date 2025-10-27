import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import "./Admin-Styles/AllRequests.css";
import Logo from "../assets/logo.png";

// Create axios instance with base URL
const api = axios.create({
  baseURL: "http://localhost:5000",
  timeout: 10000,
});

const socket = io("http://localhost:5000");

export default function AllRequest() {
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

  // Update request status in database
  const updateStatus = async (requestId, newStatus) => {
    try {
      setError("");
      
      const response = await api.put(
        `/api/requests/${requestId}/status`,
        { status: newStatus }
      );

      if (response.data.success) {
        console.log(`Status updated to ${newStatus}`);
      } else {
        setError("Failed to update request status");
      }
    } catch (err) {
      console.error("Error updating request status:", err);
      setError(err.response?.data?.message || "Failed to update request status");
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

  return (
    <div className="page-content">
      <div className="heading">
        <NavLink to="#" onClick={handleLogout}>
          <img src={Logo} alt="Logo" />
        </NavLink>
        <h1 className="title">ALL REQUESTS</h1>
      </div>

      <div className="all-requests-container">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading">Loading requests...</div>
        ) : requests.length > 0 ? (
          <div className="requests-grid">
            {requests.map((req) => (
              <div key={req.id} className="request-card">
                <h3>{req.subject}</h3>
                <p><strong>By:</strong> {req.fullName}</p>
                <p><strong>Residence:</strong> {req.residence} - Block {req.block}</p>
                <p className="desc"><strong>Description:</strong> {req.description}</p>
                <p><strong>Date & Time:</strong> {formatDateTime(req.dateCreated)}</p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span className={`status ${getStatusClass(req.status)}`}>
                    {req.status}
                  </span>
                </p>

                {/* Show action buttons only if not completed */}
                {req.status !== "Completed" && (
                  <div className="all-request-action-buttons">
                    {req.status !== "Approved" && (
                      <button className="approve-btn" onClick={() => updateStatus(req.id, "Approved")}>
                        APPROVE
                      </button>
                    )}
                    <button className="complete-btn"  onClick={() => updateStatus(req.id, "Completed")}>
                      COMPLETE
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="no-requests">No requests available.</p>
        )}
      </div>
    </div>
  );
}