import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import AdminDashboard from './components/AdminDashboard'
import VisitorInterface from './components/VisitorInterface'
import ArtworkDetail from './components/ArtworkDetail'
import MuseumManagement from './components/MuseumManagement'
import VisitorScan from './components/VisitorScan'
import BrowseCollection from './components/BrowseCollection'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="nav-logo">
              🏛️ Museum AI
            </Link>
            <div className="nav-menu">
              <Link to="/" className="nav-link">Home</Link>
              <Link to="/admin/museums" className="nav-link">Museums</Link>
              <Link to="/admin" className="nav-link">Upload Art</Link>
            </div>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<VisitorInterface />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/museums" element={<MuseumManagement />} />
            <Route path="/artwork/:id" element={<ArtworkDetail />} />
            <Route path="/visit/:qrCode" element={<VisitorScan />} />
            <Route path="/visit/:qrCode/browse" element={<BrowseCollection />} />
          </Routes>
        </main>

        <footer className="footer">
          <p>© 2024 Museum AI - Multi-language artwork recognition system</p>
        </footer>
      </div>
    </Router>
  )
}

export default App