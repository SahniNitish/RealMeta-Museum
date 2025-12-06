import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Artwork {
  id: string;
  title: string;
  author: string;
  year: string;
  style: string;
  imageUrl: string;
  description: string;
  audioUrl?: string;
}

interface Museum {
  id: string;
  name: string;
}

const BrowseCollection: React.FC = () => {
  const { qrCode } = useParams<{ qrCode: string }>();
  const navigate = useNavigate();

  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [museum, setMuseum] = useState<Museum | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);

  const API_HOST = `http://${window.location.hostname}:4000`;
  const API_BASE = `${API_HOST}/api`;

  const languageOptions = {
    en: { flag: '🇺🇸', name: 'English' },
    fr: { flag: '🇫🇷', name: 'Français' },
    es: { flag: '🇪🇸', name: 'Español' }
  };

  useEffect(() => {
    fetchArtworks();
  }, [qrCode, selectedLanguage]);

  const fetchArtworks = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/visit/${qrCode}/artworks`, {
        params: { language: selectedLanguage }
      });
      setArtworks(response.data.artworks || []);
      setMuseum(response.data.museum);
    } catch (error) {
      console.error('Failed to fetch artworks:', error);
      alert('Failed to load collection');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="browse-collection">
        <div className="loading">
          <div className="loading-spinner">🎨</div>
          <p>Loading collection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="browse-collection">
      <div className="browse-header">
        <button onClick={() => navigate(`/visit/${qrCode}`)} className="back-btn">
          ← Back
        </button>
        <div>
          <h1>🎨 {museum?.name} Collection</h1>
          <p>{artworks.length} artworks</p>
        </div>

        <div className="language-switcher">
          {Object.entries(languageOptions).map(([code, info]) => (
            <button
              key={code}
              onClick={() => setSelectedLanguage(code)}
              className={`lang-btn ${selectedLanguage === code ? 'active' : ''}`}
              title={info.name}
            >
              {info.flag}
            </button>
          ))}
        </div>
      </div>

      {artworks.length === 0 ? (
        <div className="empty-state">
          <h3>No artworks yet</h3>
          <p>This museum's collection is being updated</p>
        </div>
      ) : (
        <div className="artworks-grid">
          {artworks.map(artwork => (
            <div
              key={artwork.id}
              className="artwork-card"
              onClick={() => setSelectedArtwork(artwork)}
            >
              <img
                src={`${API_HOST}${artwork.imageUrl}`}
                alt={artwork.title}
                className="artwork-thumbnail"
              />
              <div className="artwork-card-info">
                <h3>{artwork.title}</h3>
                <p className="artwork-author">{artwork.author}</p>
                <p className="artwork-year">{artwork.year}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Artwork Detail Modal */}
      {selectedArtwork && (
        <div className="modal-overlay" onClick={() => setSelectedArtwork(null)}>
          <div className="modal-content artwork-detail" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedArtwork(null)} className="close-btn">✖</button>

            <img
              src={`${API_HOST}${selectedArtwork.imageUrl}`}
              alt={selectedArtwork.title}
              className="artwork-detail-image"
            />

            <div className="artwork-detail-info">
              <h2>{selectedArtwork.title}</h2>
              <p className="meta">
                <strong>Artist:</strong> {selectedArtwork.author}<br />
                <strong>Year:</strong> {selectedArtwork.year}<br />
                <strong>Style:</strong> {selectedArtwork.style}
              </p>

              <div className="description">
                <p>{selectedArtwork.description}</p>
              </div>

              {selectedArtwork.audioUrl && (
                <div className="audio-section">
                  <h4>🎧 Audio Guide</h4>
                  <audio controls style={{ width: '100%' }}>
                    <source src={`${API_HOST}${selectedArtwork.audioUrl}`} type="audio/mpeg" />
                  </audio>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrowseCollection;
