import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import SafePath from './components/SafePath';
import SafeSphere from './components/SafeSphere';
import './App.css';

function Home() {
  return (
    <div className="home-wrapper">
      <div className="home-header">
        <div className="home-logo">🚨 EVAC-PLATFORM</div>
        <h1>Emergency Evacuation &amp; Disaster Response</h1>
        <p>Unified command center for dynamic threat scenarios. Select an operational module to begin.</p>
      </div>
      
      <div className="home-cards">
        <Link to="/safepath" className="feature-card safepath-card">
          <div className="card-icon">🚁</div>
          <div className="card-content">
            <h2>SafePath</h2>
            <div className="card-badge threat">THREAT EVACUATION</div>
            <p>Designed for combat zones and active threats with real-time drone tracking and danger avoidance.</p>
            <ul className="card-features">
              <li>✓ Real-Time Drone Tracking</li>
              <li>✓ Blast Zone Avoidance</li>
              <li>✓ AI A* Route Finding</li>
            </ul>
            <div className="card-btn">LAUNCH SAFEPATH</div>
          </div>
        </Link>
        
        <Link to="/safesphere" className="feature-card safesphere-card">
          <div className="card-icon">🌊</div>
          <div className="card-content">
            <h2>SafeSphere</h2>
            <div className="card-badge disaster">DISASTER RELIEF</div>
            <p>Built for natural disasters, monitoring flood levels, and coordinating AI-driven relief distribution.</p>
            <ul className="card-features">
              <li>✓ Live Flood Monitoring</li>
              <li>✓ AI Relief Distribution</li>
              <li>✓ Citizen S.O.S Reports</li>
            </ul>
            <div className="card-btn">LAUNCH SAFESPHERE</div>
          </div>
        </Link>
      </div>
      
      <div className="about-section" id="about-project">
        <h2 className="about-title">ABOUT PROJECT: AI ARCHITECTURE &amp; PROTOCOLS</h2>
        
        <div className="about-grid">
          <div className="about-card">
            <h3>1. The Core Problem &amp; Solution</h3>
            <p>During disasters, static maps fail. Civilians panic and need to know <em>"Where do I go right now?"</em>, while emergency coordinators need to balance crowd flow and prioritize aid distribution.</p>
            <p>Our platform uses <strong>adaptive load-balancing routing</strong>. Rather than just finding the shortest path, it actively redistributes evacuees across multiple corridors based on live danger zones, network congestion, and structural passability.</p>
          </div>

          <div className="about-card">
            <h3>2. Dynamic Graph Weighting</h3>
            <p>Traditional GIS applies static distances. Our routing layer applies real-time contextual variables to every road edge using the following core heuristic:</p>
            <div className="formula-box">
              <code>w = distance × (1 + danger × 2.5 + congestion × 1.5)</code>
            </div>
            <p>This ensures that a short road immediately becomes "expensive" to the routing algorithm (A* / Dijkstra) if a drone strike hits nearby or flood waters exceed safe depth thresholds, recalculating paths actively mid-flight.</p>
          </div>

          <div className="about-card">
            <h3>3. AI Shelter Recommendation</h3>
            <p>To prevent overcrowding at obvious relief centers, the system evaluates all reachable shelters using multi-criteria optimization:</p>
            <div className="formula-box">
              <code>Score = (dist_weight × 0.4) + (safety_weight × 0.4) + (capacity_weight × 0.2)</code>
            </div>
            <p>When an evacuation is requested, the backend instantly ranks all shelters by this combined score, auto-selecting the optimal safe zone and generating a route avoiding active threat zones.</p>
          </div>

          <div className="about-card">
            <h3>4. Real-Time Data Pipeline</h3>
            <p>The system digests multi-modal intelligence to update graph parameters instantly:</p>
            <ul>
              <li><strong>Crowd-Sourced Reports:</strong> Civilians ping trapped locations or blocked roads via the dashboard, instantly re-weighting road networks.</li>
              <li><strong>Manual Overrides:</strong> Command center operators manually mark roads as blocked or dangerous.</li>
              <li><strong>Simulated Feeds:</strong> The prototype ingests automated drone telemetry and rising flood level feeds to demonstrate dynamic recalculation mid-route.</li>
            </ul>
          </div>
        </div>

        <h3 className="diagram-title" style={{ marginTop: '40px', color: '#ffb300', fontFamily: 'Rajdhani', fontSize: '22px', textAlign: 'center', letterSpacing: '2px' }}>SAFEPATH SYSTEM ARCHITECTURE</h3>
        <img src="/safepath_system_architecture.svg" alt="SafePath Architecture" className="architecture-diagram" />

        <h3 className="diagram-title" style={{ marginTop: '40px', color: '#00e676', fontFamily: 'Rajdhani', fontSize: '22px', textAlign: 'center', letterSpacing: '2px' }}>SAFESPHERE FEATURE PLAN</h3>
        <img src="/safesphere_feature_plan.svg" alt="SafeSphere Feature Plan" className="architecture-diagram" />
      </div>

      <div className="home-footer">
        Platform initialized • Connected to central relay • System Nominal
      </div>
    </div>
  );
}

// Navigation Wrapper to show Home button inside modules
function FeatureWrapper({ children, title, theme }) {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      <div style={{
        background: theme === 'safepath' ? '#091012' : '#080f18',
        padding: '5px 16px',
        borderBottom: `2px solid ${theme === 'safepath' ? '#00e676' : '#1565c0'}`,
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
        zIndex: 3000
      }}>
        <button 
          onClick={() => navigate('/')} 
          style={{
            background: 'transparent',
            border: `1px solid ${theme === 'safepath' ? '#00e676' : '#1565c0'}`,
            color: '#fff',
            cursor: 'pointer',
            padding: '4px 12px',
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '12px',
            borderRadius: '4px'
          }}
        >
          &larr; BACK TO HUB
        </button>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        {children}
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/safepath" element={<FeatureWrapper theme="safepath"><SafePath /></FeatureWrapper>} />
        <Route path="/safesphere" element={<FeatureWrapper theme="safesphere"><SafeSphere /></FeatureWrapper>} />
      </Routes>
    </Router>
  );
}

export default App;
