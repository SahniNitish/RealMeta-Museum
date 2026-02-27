import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import axios from 'axios'
import { getMediaUrl } from '../lib/api'

interface ArtworkDetail {
  _id: string
  title: string
  author: string
  year: string
  style: string
  imageUrl: string
  description: string
  educationalNotes?: string
  relatedWorks?: string
  museumLinks?: string
  descriptions?: {
    en: string
    fr: string
    es: string
  }
  audioUrls?: {
    en: string
    fr: string
    es: string
  }
  sources?: Array<{
    provider: string
    url: string
  }>
  externalLinks?: Array<{
    label: string
    url: string
  }>
  currentLanguage: string
  localizedDescription: string
  localizedAudioUrl?: string
  availableLanguages: {
    en: boolean
    fr: boolean
    es: boolean
  }
  createdAt: string
  updatedAt: string
}

const ArtworkDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [artwork, setArtwork] = useState<ArtworkDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const currentLang = (searchParams.get('lang') || 'en') as 'en' | 'fr' | 'es'
  // Use centralized API config
  const API_HOST = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? `http://${window.location.hostname}:4000` : window.location.origin);
  const API_BASE = `${API_HOST}/api`;

  const languageOptions = {
    en: { flag: '🇺🇸', name: 'English' },
    fr: { flag: '🇫🇷', name: 'Français' },
    es: { flag: '🇪🇸', name: 'Español' }
  }

  useEffect(() => {
    if (id) {
      fetchArtwork()
    }
  }, [id, currentLang])

  const fetchArtwork = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get(`${API_BASE}/visit/artwork/${id}?language=${currentLang}`)
      
      // Transform the response to match the expected interface
      const artworkData = response.data.artwork
      const transformedArtwork: ArtworkDetail = {
        _id: artworkData.id,
        title: artworkData.title,
        author: artworkData.author,
        year: artworkData.year,
        style: artworkData.style,
        imageUrl: artworkData.imageUrl,
        description: artworkData.description,
        educationalNotes: artworkData.educationalNotes,
        relatedWorks: artworkData.relatedWorks,
        museumLinks: artworkData.museumLinks,
        sources: artworkData.sources || [],
        externalLinks: artworkData.externalLinks || [],
        currentLanguage: currentLang,
        localizedDescription: artworkData.description,
        localizedAudioUrl: artworkData.audioUrl,
        availableLanguages: {
          en: true,  // Assume all artworks have English
          fr: true,  // Assume all artworks have French  
          es: true   // Assume all artworks have Spanish
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      setArtwork(transformedArtwork)
    } catch (error: any) {
      console.error('Failed to fetch artwork:', error)
      setError(error.response?.data?.error || 'Failed to load artwork')
    } finally {
      setLoading(false)
    }
  }

  const changeLanguage = (lang: 'en' | 'fr' | 'es') => {
    setSearchParams({ lang })
  }

  const handleAudioPlay = () => {
    setIsPlaying(true)
  }

  const handleAudioPause = () => {
    setIsPlaying(false)
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
  }

  if (loading) {
    return (
      <div className="artwork-detail">
        <div className="loading">
          <div className="loading-spinner">🎨</div>
          <p>Loading artwork details...</p>
        </div>
      </div>
    )
  }

  if (error || !artwork) {
    return (
      <div className="artwork-detail">
        <div className="error">
          <h2>❌ Error</h2>
          <p>{error || 'Artwork not found'}</p>
          <Link to="/" className="back-btn">← Back to Collection</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="artwork-detail">
      {/* Navigation */}
      <div className="artwork-nav">
        <Link to="/" className="back-btn">← Back to Collection</Link>
        
        {/* Language Switcher */}
        <div className="language-switcher">
          <span>Language: </span>
          {Object.entries(languageOptions).map(([code, info]) => (
            <button
              key={code}
              onClick={() => changeLanguage(code as 'en' | 'fr' | 'es')}
              className={`lang-btn ${currentLang === code ? 'active' : ''}`}
              disabled={!artwork.availableLanguages[code as keyof typeof artwork.availableLanguages]}
            >
              {info.flag} {info.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="artwork-content">
        {/* Image Section */}
        <div className="artwork-image-section">
          <div className="artwork-image-container">
            <img 
              src={getMediaUrl(artwork.imageUrl)}
              alt={artwork.title}
              className="artwork-main-image"
            />
          </div>
          
          {/* Audio Player */}
          {artwork.localizedAudioUrl && (
            <div className="audio-player-section">
              <h3>🎵 Audio Guide</h3>
              <div className="audio-controls">
                <audio 
                  controls
                  onPlay={handleAudioPlay}
                  onPause={handleAudioPause}
                  onEnded={handleAudioEnded}
                  className="audio-player"
                >
                  <source
                    src={getMediaUrl(artwork.localizedAudioUrl)}
                    type="audio/mpeg"
                  />
                  Your browser does not support the audio element.
                </audio>
                <p className="audio-info">
                  {isPlaying ? '🔊 Playing' : '🔇 Paused'} - 
                  {languageOptions[currentLang].flag} {languageOptions[currentLang].name} narration
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="artwork-details-section">
          <div className="artwork-header">
            <h1 className="artwork-title">{artwork.title}</h1>
            {artwork.author && (
              <p className="artwork-author">by {artwork.author}</p>
            )}
            <div className="artwork-meta">
              {artwork.year && <span className="artwork-year">📅 {artwork.year}</span>}
              {artwork.style && <span className="artwork-style">🎨 {artwork.style}</span>}
            </div>
          </div>

          {/* Description */}
          <div className="artwork-description">
            <h3>📖 Description</h3>
            <div className="description-content">
              <p>{artwork.localizedDescription}</p>
            </div>
            
            {/* Show available translations */}
            <div className="available-translations">
              <h4>Available in:</h4>
              <div className="translation-badges">
                {Object.entries(artwork.availableLanguages).map(([lang, available]) => (
                  available && (
                    <span key={lang} className="translation-badge">
                      {languageOptions[lang as keyof typeof languageOptions].flag}
                      {languageOptions[lang as keyof typeof languageOptions].name}
                    </span>
                  )
                ))}
              </div>
            </div>
          </div>

          {/* Educational Notes */}
          {artwork.educationalNotes && (
            <div className="educational-notes">
              <h3>🎓 Educational Insights</h3>
              <div className="educational-content">
                <p>{artwork.educationalNotes}</p>
              </div>
            </div>
          )}

          {/* Related Works */}
          {artwork.relatedWorks && (
            <div className="related-works">
              <h3>🎨 Related Works</h3>
              <div className="related-content">
                <p>{artwork.relatedWorks}</p>
              </div>
            </div>
          )}

          {/* Museum Links */}
          {artwork.museumLinks && (
            <div className="museum-links">
              <h3>🏛️ Learn More</h3>
              <div className="museum-content">
                <p>{artwork.museumLinks}</p>
              </div>
            </div>
          )}

          {/* Sources */}
          {artwork.sources && artwork.sources.length > 0 && (
            <div className="artwork-sources">
              <h3>📚 Sources</h3>
              <div className="sources-list">
                {artwork.sources.map((source, index) => (
                  <a
                    key={index}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="source-link"
                  >
                    📖 {source.provider} →
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* External Resources */}
          {artwork.externalLinks && artwork.externalLinks.length > 0 && (
            <div className="external-links">
              <h3>🔗 External Resources</h3>
              <div className="external-links-list">
                {artwork.externalLinks.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="external-link"
                  >
                    🌐 {link.label} →
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Technical Details */}
          <div className="technical-details">
            <h3>⚙️ Technical Information</h3>
            <div className="tech-grid">
              <div className="tech-detail">
                <strong>Artwork ID:</strong> {artwork._id}
              </div>
              <div className="tech-detail">
                <strong>Current Language:</strong> {languageOptions[currentLang].flag} {languageOptions[currentLang].name}
              </div>
              <div className="tech-detail">
                <strong>Added to Collection:</strong> {new Date(artwork.createdAt).toLocaleDateString()}
              </div>
              <div className="tech-detail">
                <strong>Last Updated:</strong> {new Date(artwork.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* All Languages Preview */}
          {artwork.descriptions && (
            <div className="all-languages">
              <h3>🌍 All Language Versions</h3>
              <div className="language-previews">
                {Object.entries(artwork.descriptions).map(([lang, description]) => (
                  <div key={lang} className="language-preview">
                    <h4>
                      {languageOptions[lang as keyof typeof languageOptions].flag}
                      {languageOptions[lang as keyof typeof languageOptions].name}
                    </h4>
                    <p>{description.substring(0, 150)}...</p>
                    {artwork.audioUrls?.[lang as keyof typeof artwork.audioUrls] && (
                      <audio controls className="preview-audio">
                        <source
                          src={getMediaUrl(artwork.audioUrls[lang as keyof typeof artwork.audioUrls])}
                          type="audio/mpeg"
                        />
                      </audio>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QR Code Section */}
          <div className="qr-section">
            <h3>📱 Share This Artwork</h3>
            <p>Share this artwork with others:</p>
            <div className="share-options">
              <button 
                onClick={() => navigator.clipboard.writeText(window.location.href)}
                className="share-btn"
              >
                📋 Copy Link
              </button>
              <button 
                onClick={() => window.print()}
                className="share-btn"
              >
                🖨️ Print
              </button>
            </div>
            <p className="share-url">{window.location.href}</p>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="artwork-actions">
        <Link to="/" className="action-btn secondary">
          ← View More Artworks
        </Link>
        <button 
          onClick={() => window.location.reload()}
          className="action-btn primary"
        >
          🔄 Refresh
        </button>
      </div>
    </div>
  )
}

export default ArtworkDetail
