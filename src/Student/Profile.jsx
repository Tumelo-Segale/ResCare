import React, { useState, useEffect } from 'react';
import './Student-Styles/Profile.css';
import Logo from '../assets/logo.png';
import { NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: "http://localhost:5000",
  timeout: 10000,
});

export default function Profile() {
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedStudent = localStorage.getItem('student');
    if (storedStudent) {
      setStudentData(JSON.parse(storedStudent));
    }
  }, []);

  const handleDeleteAccount = async () => {
    if (!studentData) return;

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem('token');
      
      // This endpoint should only delete the student account, not their requests
      const response = await api.delete(`/api/students/${studentData.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        data: {
          preserveRequests: true // Send flag to backend to preserve requests
        }
      });

      if (response.data.success) {
        alert('Your account has been deleted successfully. Your maintenance requests will be preserved anonymously.');
        // Clear local storage and redirect to home
        localStorage.clear();
        navigate("/", { replace: true });
      } else {
        throw new Error(response.data.message || "Failed to delete account");
      }
    } catch (err) {
      console.error("Delete account error:", err);
      setError(err.response?.data?.message || "Failed to delete account. Please try again.");
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(true);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setError("");
  };

  return (
    <div className="page-content">
      <div className="heading">
        <NavLink to="#" onClick={handleLogout}>
          <img src={Logo} alt="Logo" />
        </NavLink>
        <h1>PROFILE</h1>
      </div>

      {studentData && (
        <div className="profile-content">
          <div className="profile-info">
            <div className="info-item">
              <strong>Full Name:</strong> 
              <span>{studentData.fullName}</span>
            </div>
            <div className="info-item">
              <strong>Email:</strong> 
              <span>{studentData.email}</span>
            </div>
            <div className="info-item">
              <strong>Residence:</strong> 
              <span>{studentData.residence}</span>
            </div>
            <div className="info-item">
              <strong>Block:</strong> 
              <span>{studentData.block}</span>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="profile-actions">
            <button  className="delete-account-btn" onClick={confirmDelete} disabled={loading}>
              {loading ? "DELETING..." : "DELETE ACCOUNT"}
            </button>
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="delete-confirmation-modal">
              <div className="modal-content">
                <h3>Confirm Account Deletion</h3>
                <p>Are you sure you want to delete your account? This action cannot be undone.</p>

                <div className="modal-actions">
                  <button className="cancel-btn" onClick={cancelDelete} disabled={loading}>
                    CANCEL
                  </button>

                  <button  className="confirm-delete-btn" onClick={handleDeleteAccount} disabled={loading}>
                    {loading ? "DELETING..." : "YES, DELETE MY ACCOUNT"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}