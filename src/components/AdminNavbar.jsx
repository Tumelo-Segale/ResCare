import React from 'react';
import '../components/AdminNavbar.css';
import { NavLink } from "react-router-dom";
import AllRequests from '../assets/AllRequests.png';
import Dashboard from '../assets/Dashboard.png';

export default function AdminNavbar() {
    return (
        <div className="admin-menu-contents">

            <div className="admin-menu-items">

            <NavLink to="/AdminDashboard" className={({ isActive }) => `admin-icon-link ${isActive ? 'active' : ''}`}>
                    <img src={Dashboard} alt="Dashboard" />
                </NavLink>

                <NavLink to="/AllRequests" className={({ isActive }) => `admin-icon-link ${isActive ? 'active' : ''}`}>
                    <img src={AllRequests} alt="AllRequests" />
                </NavLink>

            </div>
        </div>
    )
}
