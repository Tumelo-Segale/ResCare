import React, { useState, useEffect, useCallback } from "react";
import { NavLink } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import "./Admin-Styles/AllRequests.css";
import Logo from "../assets/logo.png";
import { API_CONFIG, SOCKET_CONFIG } from "../config/api";

// Create axios instance with environment-aware config
const api = axios.create(API_CONFIG);

// Create socket connection with environment-aware config
const socket = io(SOCKET_CONFIG.url, SOCKET_CONFIG.options);

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

  // Sort requests: completed at bottom, others at top (sorted by date, newest first)
  const sortRequests = (requestsArray) => {
    return requestsArray.sort((a, b) => {
      // If both are completed or both are not completed, sort by date (newest first)
      if ((a.status.toLowerCase() === 'completed' && b.status.toLowerCase() === 'completed') ||
          (a.status.toLowerCase() !== 'completed' && b.status.toLowerCase() !== 'completed')) {
        return new Date(b.dateCreated) - new Date(a.dateCreated);
      }
      // If a is completed and b is not, b comes first
      if (a.status.toLowerCase() === 'completed') return 1;
      // If b is completed and a is not, a comes first
      if (b.status.toLowerCase() === 'completed') return -1;
      return 0;
    });
  };

  // Fetch all requests from the database
  const fetchAllRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      
      const response = await api.get("/api/requests");
      
      if (response.data.success) {
        const sortedRequests = sortRequests(response.data.requests);
        setRequests(sortedRequests);
      } else {
        setError("Failed to load requests");
      }
    } catch (err) {
      console.error("Error fetching requests:", err);
      setError(err.response?.data?.message || "Failed to load requests from server");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load all requests from database on component mount
  useEffect(() => {
    fetchAllRequests();
    
    // Join admin room for real-time updates
    socket.emit("join-admin-room");

    // Listen for new requests
    socket.on("new-request", (newRequest) => {
      console.log("New request received:", newRequest);
      setRequests(prev => {
        // Check if request already exists to avoid duplicates
        const exists = prev.some(req => req.id === newRequest.id);
        if (!exists) {
          const updatedRequests = [newRequest, ...prev];
          return sortRequests(updatedRequests);
        }
        return prev;
      });
    });

    // Listen for request updates
    socket.on("request-updated", (updatedRequest) => {
      console.log("Request updated:", updatedRequest);
      setRequests(prev => {
        const updatedRequests = prev.map(req => 
          req.id === updatedRequest.id ? { ...req, ...updatedRequest } : req
        );
        return sortRequests(updatedRequests);
      });
    });

    // Listen for request deletions
    socket.on("request-deleted", (deletedRequestId) => {
      console.log("Request deleted:", deletedRequestId);
      setRequests(prev => {
        const updatedRequests = prev.filter(req => req.id !== deletedRequestId);
        return sortRequests(updatedRequests);
      });
    });

    // Handle connection errors
    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setError("Real-time connection failed. Updates may not be instant.");
    });

    // Handle reconnect
    socket.on("reconnect", () => {
      console.log("Socket reconnected, refreshing data...");
      fetchAllRequests();
    });

    // Cleanup on unmount
    return () => {
      socket.off("new-request");
      socket.off("request-updated");
      socket.off("request-deleted");
      socket.off("connect_error");
      socket.off("reconnect");
      socket.disconnect();
    };
  }, [fetchAllRequests]);

  // Update request status in database
  const updateStatus = async (requestId, newStatus) => {
    try {
      setError("");
      
      // Optimistically update the UI
      setRequests(prev => {
        const updatedRequests = prev.map(req => 
          req.id === requestId ? { ...req, status: newStatus } : req
        );
        return sortRequests(updatedRequests);
      });

      const response = await api.put(
        `/api/requests/${requestId}/status`,
        { status: newStatus }
      );

      if (response.data.success) {
        console.log(`Status updated to ${newStatus}`);
        // The socket event will handle the final update
      } else {
        setError("Failed to update request status");
        // Revert optimistic update on error
        fetchAllRequests();
      }
    } catch (err) {
      console.error("Error updating request status:", err);
      setError(err.response?.data?.message || "Failed to update request status");
      // Revert optimistic update on error
      fetchAllRequests();
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
    socket.disconnect();
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
            <button onClick={() => setError("")} className="dismiss-error">×</button>
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
                      <button 
                        className="approve-btn" 
                        onClick={() => updateStatus(req.id, "Approved")}
                      >
                        APPROVE
                      </button>
                    )}
                    <button 
                      className="complete-btn"  
                      onClick={() => updateStatus(req.id, "Completed")}
                    >
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