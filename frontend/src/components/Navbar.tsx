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
          📊 Dashboard
        </NavLink>
        <NavLink to="/operations" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          💳 Operazioni
        </NavLink>
        <NavLink to="/report" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          📈 Report
        </NavLink>
        <NavLink to="/help" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          ❓ Aiuto
        </NavLink>
        <NavLink to="/game" className={({ isActive }) => isActive ? 'nav-link active nav-link-game' : 'nav-link nav-link-game'}>
          👾 Arcade
        </NavLink>
      </div>
      <div className="nav-right">
        <LiveClock />
        {isAuthenticated && (
          <>
            <span className="user-badge">👤 {email}</span>
            <button className="btn btn-small" onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>
    </nav>
  );
}

