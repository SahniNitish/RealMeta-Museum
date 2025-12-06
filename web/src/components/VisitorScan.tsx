import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Museum {
  id: string;
  name: string;
  location: string;
  description?: string;
  website?: string;
  artworkCount: number;
}

interface MatchedArtwork {
  id: string;
  title: string;
  author: string;
  year: string;
  style: string;
  imageUrl: string;
  description: string;
  audioUrl?: string;
  matchScore: number;
  sources?: Array<{ provider: string; url: string }>;
}

const VisitorScan: React.FC = () => {
  const { qrCode } = useParams<{ qrCode: string }>();
  const navigate = useNavigate();

  const [museum, setMuseum] = useState<Museum | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');

  // Camera states
  const [showCamera, setShowCamera] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [identifying, setIdentifying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Match results
  const [matchResult, setMatchResult] = useState<{
    confident: boolean;
    bestMatch: MatchedArtwork | null;
    alternatives: MatchedArtwork[];
  } | null>(null);

  const API_HOST = `http://${window.location.hostname}:4000`;
  const API_BASE = `${API_HOST}/api`;

  const languageOptions = {
    en: { flag: '🇺🇸', name: 'English' },
    fr: { flag: '🇫🇷', name: 'Français' },
    es: { flag: '🇪🇸', name: 'Español' },
    de: { flag: '🇩🇪', name: 'Deutsch' },
    zh: { flag: '🇨🇳', name: '中文' },
    ja: { flag: '🇯🇵', name: '日本語' },
    it: { flag: '🇮🇹', name: 'Italiano' },
    pt: { flag: '🇵🇹', name: 'Português' },
    ru: { flag: '🇷🇺', name: 'Русский' },
    ar: { flag: '🇸🇦', name: 'العربية' }
  };

  useEffect(() => {
    fetchMuseum();
  }, [qrCode]);

  const fetchMuseum = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/visit/${qrCode}`);
      setMuseum(response.data.museum);
    } catch (err: any) {
      console.error('Failed to fetch museum:', err);
      setError('Museum not found or invalid QR code');
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      streamRef.current = stream;
      setShowCamera(true);
    } catch (err) {
      console.error('Camera error:', err);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const captureAndIdentify = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0);

      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert('Failed to capture photo');
          setCapturing(false);
          return;
        }

        setIdentifying(true);
        stopCamera();

        const formData = new FormData();
        formData.append('photo', blob, 'artwork.jpg');
        formData.append('language', selectedLanguage);

        try {
          console.log('🔍 Identifying artwork...');
          const response = await axios.post(
            `${API_BASE}/visit/${qrCode}/identify`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          );

          console.log('✅ Match result:', response.data);
          setMatchResult(response.data);
        } catch (error: any) {
          console.error('Identification failed:', error);
          alert(error.response?.data?.error || 'Failed to identify artwork');
        } finally {
          setIdentifying(false);
          setCapturing(false);
        }
      }, 'image/jpeg', 0.85);

    } catch (error) {
      console.error('Capture error:', error);
      alert('Failed to capture photo');
      setCapturing(false);
      setIdentifying(false);
    }
  };

  const handleTryAgain = () => {
    setMatchResult(null);
    setShowCamera(false);
  };

  if (loading) {
    return (
      <div className="visitor-scan">
        <div className="loading">
          <div className="loading-spinner">🏛️</div>
          <p>Loading museum...</p>
        </div>
      </div>
    );
  }

  if (error || !museum) {
    return (
      <div className="visitor-scan">
        <div className="error-state">
          <h2>❌ Museum Not Found</h2>
          <p>{error || 'Invalid QR code'}</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // Show match results
  if (matchResult) {
    return (
      <div className="visitor-scan">
        <div className="match-results">
          <h2>
            {matchResult.confident ? '✅ Artwork Identified!' : '🤔 Possible Matches'}
          </h2>

          {matchResult.bestMatch && (
            <div className="artwork-match">
              <div className="match-header">
                <span className="confidence-badge">
                  {matchResult.bestMatch.matchScore}% Match
                </span>
              </div>

              <img
                src={`${API_HOST}${matchResult.bestMatch.imageUrl}`}
                alt={matchResult.bestMatch.title}
                className="artwork-image"
              />

              <div className="artwork-info">
                <h3>{matchResult.bestMatch.title}</h3>
                <p className="artwork-meta">
                  <strong>Artist:</strong> {matchResult.bestMatch.author}<br />
                  <strong>Year:</strong> {matchResult.bestMatch.year}<br />
                  <strong>Style:</strong> {matchResult.bestMatch.style}
                </p>

                <div className="artwork-description">
                  <p>{matchResult.bestMatch.description}</p>
                </div>

                {matchResult.bestMatch.audioUrl && (
                  <div className="audio-player">
                    <h4>🎧 Audio Guide</h4>
                    <audio controls style={{ width: '100%' }}>
                      <source src={`${API_HOST}${matchResult.bestMatch.audioUrl}`} type="audio/mpeg" />
                    </audio>
                  </div>
                )}

                {matchResult.bestMatch.sources && matchResult.bestMatch.sources.length > 0 && (
                  <div className="sources">
                    <h4>📚 Learn More</h4>
                    {matchResult.bestMatch.sources.map((source, idx) => (
                      <a
                        key={idx}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="source-link"
                      >
                        {source.provider}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {!matchResult.confident && matchResult.alternatives.length > 0 && (
            <div className="alternatives">
              <h3>Other Possible Matches:</h3>
              <div className="alternatives-grid">
                {matchResult.alternatives.map(artwork => (
                  <div key={artwork.id} className="alternative-card">
                    <img src={`${API_HOST}${artwork.imageUrl}`} alt={artwork.title} />
                    <div className="alternative-info">
                      <h4>{artwork.title}</h4>
                      <p>{artwork.author}</p>
                      <span className="match-score">{artwork.matchScore}% match</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="match-actions">
            <button onClick={handleTryAgain} className="btn-primary">
              📸 Scan Another Artwork
            </button>
            <button onClick={() => navigate(`/visit/${qrCode}/browse`)} className="btn-secondary">
              📚 Browse Collection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show camera interface
  if (showCamera) {
    return (
      <div className="visitor-scan">
        <div className="camera-interface">
          <h2>📸 Capture Artwork</h2>
          <p>Position the artwork in the frame and tap capture</p>

          <div className="camera-container">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="camera-video"
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {identifying && (
              <div className="identifying-overlay">
                <div className="spinner"></div>
                <p>Identifying artwork...</p>
              </div>
            )}
          </div>

          <div className="camera-controls">
            <button
              onClick={captureAndIdentify}
              disabled={capturing || identifying}
              className="btn-capture"
            >
              {capturing || identifying ? '🔄 Processing...' : '📸 Capture'}
            </button>
            <button
              onClick={stopCamera}
              disabled={capturing || identifying}
              className="btn-secondary"
            >
              ✖ Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show welcome screen
  return (
    <div className="visitor-scan">
      <div className="welcome-screen">
        <div className="museum-info">
          <h1>🏛️ {museum.name}</h1>
          <p className="museum-location">📍 {museum.location}</p>
          {museum.description && (
            <p className="museum-description">{museum.description}</p>
          )}
          {museum.website && (
            <a href={museum.website} target="_blank" rel="noopener noreferrer" className="museum-website">
              🌐 Visit Website
            </a>
          )}
          <p className="artwork-count">🎨 {museum.artworkCount} artworks in collection</p>
        </div>

        <div className="language-selector">
          <h3>🌍 Select Your Language</h3>
          <div className="language-grid">
            {Object.entries(languageOptions).map(([code, info]) => (
              <button
                key={code}
                onClick={() => setSelectedLanguage(code)}
                className={`language-btn ${selectedLanguage === code ? 'active' : ''}`}
              >
                <span className="flag">{info.flag}</span>
                <span className="lang-name">{info.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="scan-actions">
          <button onClick={startCamera} className="btn-scan-artwork">
            📸 Scan Artwork
          </button>
          <button
            onClick={() => navigate(`/visit/${qrCode}/browse`)}
            className="btn-browse"
          >
            📚 Browse Collection
          </button>
        </div>

        <div className="instructions">
          <h4>📱 How to Use:</h4>
          <ol>
            <li>Select your preferred language above</li>
            <li>Tap "Scan Artwork" to open camera</li>
            <li>Point camera at any artwork in the museum</li>
            <li>Capture the photo and get instant information</li>
            <li>Listen to audio guide in your language</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default VisitorScan;
