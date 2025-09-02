import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import AdminDashboard from './components/AdminDashboard'
import VisitorInterface from './components/VisitorInterface'
import ArtworkDetail from './components/ArtworkDetail'
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
              <Link to="/" className="nav-link">Visitor</Link>
              <Link to="/admin" className="nav-link">Admin</Link>
            </div>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<VisitorInterface />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/artwork/:id" element={<ArtworkDetail />} />
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