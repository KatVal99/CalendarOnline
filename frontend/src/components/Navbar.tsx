import React, { useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LiveClock from './LiveClock';

export default function Navbar() {
  const { isAuthenticated, email, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      if (result) {
        localStorage.setItem('spideyBgImage', result);
        window.dispatchEvent(new Event('spidey-bg-updated'));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearBg = () => {
    localStorage.removeItem('spideyBgImage');
    window.dispatchEvent(new Event('spidey-bg-updated'));
  };

  return (
    <>
      <nav className="spidey-tracker-navbar">
        {/* Top Header Row matching Spidey Tracker Reference UI */}
        <div className="tracker-header-row">
          
          {/* Top Left: Spidey Circle Avatar using exact Pixel Spidey Mask Image */}
          <div className="spidey-circle-avatar" title="Spidey Pixel Avatar">
            <img src="./spidey-icon.png" className="spidey-circle-avatar-img" alt="Spidey Icon" />
          </div>

          {/* Top Center: Pixel Spidey Tracker Pill Badge */}
          <div className="spidey-tracker-pill">
            <span className="pill-web-left">🕸️</span>
            <span className="pill-title">SPIDEY 🕷️ BUDGET</span>
            <span className="pill-web-right">🕸️</span>
          </div>

          {/* Top Right: Custom Background Upload / Action Square Button */}
          <div className="spidey-right-actions">
            <button 
              className="spidey-icon-btn" 
              title="Cambia Sfondo Personalizzato"
              onClick={() => fileInputRef.current?.click()}
            >
              🕷️
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={handleBgUpload} 
            />
            {localStorage.getItem('spideyBgImage') && (
              <button 
                className="spidey-icon-btn btn-reset-bg" 
                title="Ripristina Sfondo Spidey"
                onClick={handleClearBg}
              >
                ✖
              </button>
            )}
          </div>
        </div>

        {/* Hanging Upside-Down Spiderman Animation directly under the header badge */}
        <div className="hanging-spidey-container">
          <div className="web-thread" />
          <div className="hanging-spidey-body">
            {/* Upside Down Chibi Spiderman Pixel Sprite */}
            <svg viewBox="0 0 32 36" className="hanging-spidey-svg">
              {/* Head */}
              <rect x="8" y="18" width="16" height="14" rx="3" fill="#e62429" stroke="#000" strokeWidth="1.5" />
              {/* Upside down Spidey Eyes */}
              <polygon points="11,26 17,28 14,21" fill="#fff" stroke="#000" strokeWidth="1" />
              <polygon points="21,26 15,28 18,21" fill="#fff" stroke="#000" strokeWidth="1" />
              {/* Suit Body upside down */}
              <rect x="11" y="8" width="10" height="10" fill="#0b5ed7" stroke="#000" strokeWidth="1" />
              <rect x="13" y="10" width="6" height="6" fill="#e62429" />
              {/* Spider chest logo */}
              <rect x="15" y="12" width="2" height="3" fill="#000" />
              {/* Legs grasping web thread above */}
              <path d="M9 8 L13 2 M23 8 L19 2" stroke="#e62429" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Main Navigation Links Tabs Bar */}
        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <span className="nav-icon">🏙️</span> <span className="nav-text">Dashboard</span>
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

        {/* User Info & Clock bar */}
        <div className="nav-right">
          <LiveClock />
          {isAuthenticated && (
            <>
              <span className="user-badge"><span className="nav-icon">🕸️</span> <span className="user-email-text">{email}</span></span>
              <button className="btn btn-logout-large" onClick={handleLogout}>Logout</button>
            </>
          )}
        </div>

        {/* Bottom Spidey Marquee Ticker Banner (matching reference bottom banner) */}
        <div className="spidey-bottom-ticker-bar">
          <div className="ticker-chibi-spidey">
            <span className="chibi-icon">🕷️</span>
          </div>
          <div className="ticker-scroll-text">
            <span>SPIDEY BUDGET ONLINE • TAP A TAB TO EXPLORE • CUSTOM BACKGROUND ENABLED •</span>
          </div>
        </div>
      </nav>
    </>
  );
}
