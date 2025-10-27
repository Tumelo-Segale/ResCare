import React from 'react';
import './Student-Styles/Help.css';
import Logo from '../assets/logo.png';
import { NavLink } from 'react-router-dom';

export default function Help() {
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
        <h1>HELP</h1>
      </div>
      <div className="help-content">
        <p className='content'>
          🙂 <b>ResCare</b> is a smart, user-friendly maintenance management system designed for University residences. <br />
          🙂 Students can report maintenance issues, track request progress, and receive updates - all from one convenient platform. <br />
          🙂 Experience a smoother, more efficient way to keep University residences in top condition - because every student deserves a comfortable home away from home.
          <br /><b className='motto'>Your residence. Your ResCare.</b>
        </p>
        <div className="how-it-works">
          <h1>HOW IT WORKS</h1>
          <h4>Register</h4>
          <p>Sign up with your full name, contact number, student email, residence, block, and password.</p>

          <h4>Submit Request</h4>
          <p>Report maintenance issues like plumbing problems, broken lights, or other repairs in your residence block.</p>

          <h4>Track & Update</h4>
          <p>See all requests from your block, track their status, and receive admin responses in real-time.</p>
        </div>
      </div>
    </div>
  )
}