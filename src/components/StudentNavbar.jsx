import React from 'react';
import '../components/StudentNavbar.css';
import AllRequests from '../assets/AllRequests.png';
import NewRequest from '../assets/NewRequest.png';
import Profile from '../assets/Profile.png';
import Help from '../assets/HelpIcon.png';
import { NavLink } from "react-router-dom";

export default function StudentNavbar() {
    return (
        <div className="student-menu-contents">

            <div className="student-menu-items">

                <NavLink to="/StudentRequests" className={({ isActive }) => `student-icon-link ${isActive ? 'active' : ''}`}>
                    <img src={AllRequests} alt="Student-Requests" />
                </NavLink>

                <NavLink to="/NewRequest" className={({ isActive }) => `student-icon-link ${isActive ? 'active' : ''}`}>
                    <img src={NewRequest} alt="New-Requests" />
                </NavLink>

                <NavLink to="/Profile" className={({ isActive }) => `student-icon-link ${isActive ? 'active' : ''}`}>
                    <img src={Profile} alt="Profile" />
                </NavLink>

                <NavLink to="/Help" className={({ isActive }) => `student-icon-link ${isActive ? 'active' : ''}`}>
                    <img src={Help} alt="Help" />
                </NavLink>

            </div>
        </div>
    )
}
