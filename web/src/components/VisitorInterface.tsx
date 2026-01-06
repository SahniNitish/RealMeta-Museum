import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

interface Artwork {
  _id: string
  title: string
  author: string
  year: string
  style: string
  imageUrl: string
  description: string
  descriptions?: {
    en: string
    fr: string
    es: string
  }
  createdAt: string
}

const VisitorInterface: React.FC = () => {
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'fr' | 'es'>('en')

  // Use centralized API config - supports both dev and production
  const API_HOST = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? `http://${window.location.hostname}:4000` : window.location.origin);
  const API_BASE = `${API_HOST}/api`;

  const languageOptions = {
    en: { flag: '🇺🇸', name: 'English' },
    fr: { flag: '🇫🇷', name: 'Français' },
    es: { flag: '🇪🇸', name: 'Español' }
  }

  useEffect(() => {
    fetchArtworks()
  }, [])

  const fetchArtworks = async () => {
    try {
      // Get all museums first
      const museumsResponse = await axios.get(`${API_BASE}/museums`)
      const museums = museumsResponse.data.museums || []
      
      // Fetch artworks from all museums
      const allArtworks: Artwork[] = []
      for (const museum of museums) {
        try {
          const artworksResponse = await axios.get(`${API_BASE}/museums/${museum._id}/artworks`)
          const museumArtworks = artworksResponse.data.artworks || []
          allArtworks.push(...museumArtworks)
        } catch (err) {
          console.warn(`Failed to fetch artworks for museum ${museum.name}:`, err)
        }
      }
      
      setArtworks(allArtworks)
    } catch (error) {
      console.error('Failed to fetch artworks:', error)
    } finally {
      setLoading(false)
    }
  }

  const getLocalizedDescription = (artwork: Artwork) => {
    if (artwork.descriptions) {
      return artwork.descriptions[selectedLanguage] || artwork.description
    }
    return artwork.description
  }

  if (loading) {
    return (
      <div className="visitor-interface">
        <div className="loading">
          <div className="loading-spinner">🎨</div>
          <p>Loading museum collection...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="visitor-interface">
      {/* Header */}
      <div className="visitor-header">
        <h1>🏛️ Welcome to Museum AI</h1>
        <p>Discover artworks with multilingual AI-powered descriptions and audio guides</p>
        
        {/* Language Selector */}
        <div className="language-selector">
          <h3>Choose your language:</h3>
          <div className="language-buttons">
            {Object.entries(languageOptions).map(([code, info]) => (
              <button
                key={code}
                onClick={() => setSelectedLanguage(code as 'en' | 'fr' | 'es')}
                className={`language-btn ${selectedLanguage === code ? 'active' : ''}`}
              >
                {info.flag} {info.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="instructions">
        <div className="instruction-card">
          <h3>📱 How to Use</h3>
          <ol>
            <li><strong>Browse Collection:</strong> View all artworks below</li>
            <li><strong>Select Language:</strong> Choose English, French, or Spanish</li>
            <li><strong>Click Artwork:</strong> Get detailed information and audio guide</li>
            <li><strong>Listen:</strong> Play AI-generated narration in your language</li>
          </ol>
        </div>

        <div className="instruction-card">
          <h3>🎵 Features</h3>
          <ul>
            <li>✅ <strong>AI Recognition:</strong> Automatic artwork identification</li>
            <li>✅ <strong>Multi-language:</strong> English, French, Spanish support</li>
            <li>✅ <strong>Audio Guides:</strong> Natural voice narration</li>
            <li>✅ <strong>Wikipedia Integration:</strong> Rich historical context</li>
          </ul>
        </div>
      </div>

      {/* Artwork Collection */}
      <div className="artwork-collection">
        <h2>🎨 All Museum Collections ({artworks.length} artworks)</h2>
        
        {artworks.length === 0 ? (
          <div className="empty-collection">
            <h3>📭 No artworks yet</h3>
            <p>No museums have uploaded artworks yet. Create a museum and add artworks using the admin dashboard.</p>
            <Link to="/admin/museums" className="admin-link">
              Go to Museum Management →
            </Link>
          </div>
        ) : (
          <div className="artwork-grid">
            {artworks.map((artwork) => (
              <div key={artwork._id} className="artwork-card">
                <div className="artwork-image-container">
                  <img 
                    src={`${API_HOST}${artwork.imageUrl}`} 
                    alt={artwork.title}
                    className="artwork-image"
                  />
                  <div className="artwork-overlay">
                    <button className="view-details-btn">
                      👁️ View Details
                    </button>
                  </div>
                </div>
                
                <div className="artwork-info">
                  <h3 className="artwork-title">{artwork.title}</h3>
                  <p className="artwork-author">
                    {artwork.author && `by ${artwork.author}`}
                    {artwork.year && ` (${artwork.year})`}
                  </p>
                  <p className="artwork-style">{artwork.style}</p>
                  
                  <div className="artwork-description">
                    <p>{getLocalizedDescription(artwork).substring(0, 120)}...</p>
                  </div>
                  
                  <div className="artwork-actions">
                    <Link 
                      to={`/artwork/${artwork._id}?lang=${selectedLanguage}`}
                      className="view-artwork-btn"
                    >
                      {languageOptions[selectedLanguage].flag} View in {languageOptions[selectedLanguage].name}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Demo Section */}
      <div className="demo-section">
        <h2>🚀 How It Works</h2>
        <div className="demo-steps">
          <div className="demo-step">
            <div className="step-number">1</div>
            <h3>📸 Admin Uploads</h3>
            <p>Museum admin uploads artwork images via the admin dashboard</p>
          </div>
          
          <div className="demo-step">
            <div className="step-number">2</div>
            <h3>🤖 AI Analysis</h3>
            <p>OpenAI Vision API identifies artwork details and Wikipedia provides context</p>
          </div>
          
          <div className="demo-step">
            <div className="step-number">3</div>
            <h3>🌍 Auto Translation</h3>
            <p>Google Translate creates French and Spanish versions automatically</p>
          </div>
          
          <div className="demo-step">
            <div className="step-number">4</div>
            <h3>🎵 Voice Generation</h3>
            <p>ElevenLabs creates natural audio narration in all three languages</p>
          </div>
          
          <div className="demo-step">
            <div className="step-number">5</div>
            <h3>👥 Visitor Access</h3>
            <p>Visitors can view artworks and listen to audio guides in their preferred language</p>
          </div>
        </div>
      </div>

      {/* Technical Info */}
      <div className="tech-info">
        <h3>⚙️ Technology Stack</h3>
        <div className="tech-grid">
          <div className="tech-item">
            <h4>🧠 AI Recognition</h4>
            <p>OpenAI GPT-4o Vision</p>
          </div>
          <div className="tech-item">
            <h4>🌍 Translation</h4>
            <p>Google Translate API</p>
          </div>
          <div className="tech-item">
            <h4>🎵 Text-to-Speech</h4>
            <p>ElevenLabs Voice AI</p>
          </div>
          <div className="tech-item">
            <h4>📚 Knowledge</h4>
            <p>Wikipedia Integration</p>
          </div>
          <div className="tech-item">
            <h4>💾 Backend</h4>
            <p>Node.js + MongoDB</p>
          </div>
          <div className="tech-item">
            <h4>⚛️ Frontend</h4>
            <p>React + TypeScript</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VisitorInterface
