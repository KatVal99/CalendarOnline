import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LiveClock from './LiveClock';

export default function Navbar() {
  const { isAuthenticated, email, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-links">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <span className="nav-icon">📊</span> <span className="nav-text">Dashboard</span>
        </NavLink>
        <NavLink to="/operations" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <span className="nav-icon">💳</span> <span className="nav-text">Operazioni</span>
        </NavLink>
        <NavLink to="/report" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <span className="nav-icon">📈</span> <span className="nav-text">Report</span>
        </NavLink>
        <NavLink to="/help" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <span className="nav-icon">❓</span> <span className="nav-text">Aiuto</span>
        </NavLink>
        <NavLink to="/game" className={({ isActive }) => isActive ? 'nav-link active nav-link-game' : 'nav-link nav-link-game'}>
          <span className="nav-icon">👾</span> <span className="nav-text">Arcade</span>
        </NavLink>
      </div>
      <div className="nav-right">
        <LiveClock />
        {isAuthenticated && (
          <>
            <span className="user-badge"><span className="nav-icon">👤</span> <span className="user-email-text">{email}</span></span>
            <button className="btn btn-logout-large" onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>
    </nav>
  );
}

