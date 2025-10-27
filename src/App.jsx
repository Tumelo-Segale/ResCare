import './App.css';
import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom';
import LandingPage from './LandingPage';
import Registration from './Student/Registration';
import Login from './Student/Login';

import AdminDashboard from './Admin/AdminDashboard';
import AdminNavbar from './components/AdminNavbar';
import AllRequests from './Admin/AllRequests';

import StudentRequests from './Student/StudentRequests';
import StudentNavbar from './components/StudentNavbar';
import NewRequest from './Student/NewRequest';
import Profile from './Student/Profile';
import Help from './Student/Help';

// Protected Route Components - SIMPLIFIED
const ProtectedStudentRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const student = localStorage.getItem('student');
  
  if (!token || !student) {
    return <Navigate to="/Login" replace />;
  }
  
  return children;
};

const ProtectedAdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const admin = localStorage.getItem('admin');
  
  if (!token || !admin) {
    return <Navigate to="/Login" replace />;
  }
  
  return children;
};

// Layouts with navbar only
function StudentLayout({ children }) {
  return (
    <>
      <StudentNavbar />
      <div className="page-content">{children}</div>
    </>
  );
}

function AdminLayout({ children }) {
  return (
    <>
      <AdminNavbar />
      <div className="page-content">{children}</div>
    </>
  );
}

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          {/* Landing Page */}
          <Route path='/' element={<LandingPage/>}/>

          {/* Public Routes */}
          <Route path='/Registration' element={<Registration/>}/>
          <Route path='/Login' element={<Login/>}/>

          {/* Protected Student Pages with Navbar */}
          <Route path='/StudentRequests' element={
            <ProtectedStudentRoute>
              <StudentLayout>
                <StudentRequests/>
              </StudentLayout>
            </ProtectedStudentRoute>
          }/>

          <Route path='/Profile' element={
            <ProtectedStudentRoute>
              <StudentLayout>
                <Profile/>
              </StudentLayout>
            </ProtectedStudentRoute>
          }/>

          <Route path='/Help' element={
            <ProtectedStudentRoute>
              <StudentLayout>
                <Help/>
              </StudentLayout>
            </ProtectedStudentRoute>
          }/>

          <Route path='/NewRequest' element={
            <ProtectedStudentRoute>
              <StudentLayout>
                <NewRequest/>
              </StudentLayout>
            </ProtectedStudentRoute>
          }/>

          {/* Protected Admin Pages with Navbar */}
          <Route path='/AdminDashboard' element={
            <ProtectedAdminRoute>
              <AdminLayout>
                <AdminDashboard/>
              </AdminLayout>
            </ProtectedAdminRoute>
          } />

          <Route path='/AllRequests' element={
            <ProtectedAdminRoute>
              <AdminLayout>
                <AllRequests/>
              </AdminLayout>
            </ProtectedAdminRoute>
          } />

          {/* Fallback route */}
          <Route path='*' element={<Navigate to="/" replace />} />

        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App