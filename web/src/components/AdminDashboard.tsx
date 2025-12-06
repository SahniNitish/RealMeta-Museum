import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'

interface Artwork {
  id: string
  title: string
  author: string
  year: string
  style: string
  imageUrl: string
  descriptions: {
    english: string
    french: string
    spanish: string
  }
  audioUrls: {
    english: string
    french: string
    spanish: string
  }
  translationsGenerated: string[]
  audioFilesGenerated: string[]
}

interface Museum {
  _id: string;
  name: string;
  location: string;
}

const AdminDashboard: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [finalizing, setFinalizing] = useState(false)
  const [artwork, setArtwork] = useState<Artwork | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)

  // Museum selection
  const [museums, setMuseums] = useState<Museum[]>([])
  const [selectedMuseum, setSelectedMuseum] = useState<string>('')
  const [loadingMuseums, setLoadingMuseums] = useState(true)

  const API_HOST = `http://${window.location.hostname}:4000`
  const API_BASE = `${API_HOST}/api`

  // Fetch museums on component mount
  useEffect(() => {
    fetchMuseums()
  }, [])

  const fetchMuseums = async () => {
    try {
      setLoadingMuseums(true)
      const response = await axios.get(`${API_BASE}/museums`)
      setMuseums(response.data.museums || [])
    } catch (error) {
      console.error('Failed to fetch museums:', error)
    } finally {
      setLoadingMuseums(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadResult(null)
      setArtwork(null)
    }
  }

  const handleStartCamera = async () => {
    try {
      console.log('🎥 Starting camera...')

      // Show camera UI immediately
      setShowCamera(true)
      setCameraReady(false)

      // Try with environment camera first, fallback to any camera
      let stream: MediaStream | null = null

      try {
        console.log('📷 Requesting camera with environment mode...')
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        })
        console.log('✅ Got environment camera stream')
      } catch (envError) {
        console.log('⚠️ Environment camera not available, using default camera...')
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        })
        console.log('✅ Got default camera stream')
      }

      if (!stream) {
        throw new Error('Failed to get camera stream')
      }

      console.log('📺 Setting up video element...')

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        console.log('✅ Stream attached to video element')

        // Set up event handler BEFORE playing
        videoRef.current.onloadedmetadata = () => {
          console.log('📊 Video metadata loaded')
          setCameraReady(true)
          console.log('✅ Camera ready:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight)
        }

        // Add a safety timeout in case loadedmetadata never fires
        setTimeout(() => {
          if (!videoRef.current) return
          const width = videoRef.current.videoWidth
          const height = videoRef.current.videoHeight
          console.log('⏰ Timeout check - dimensions:', width, 'x', height)
          if (width > 0 && height > 0) {
            console.log('⏰ Forcing camera ready')
            setCameraReady(true)
          }
        }, 2000)

        try {
          await videoRef.current.play()
          console.log('▶️ Video playing')
        } catch (playError) {
          console.error('❌ Video play error:', playError)
          // Even if play fails, keep stream active
        }
      }

      streamRef.current = stream
      console.log('✅ Camera setup complete')

    } catch (err) {
      console.error('❌ Camera error:', err)
      setShowCamera(false)
      setCameraReady(false)
      alert('Camera permission denied or unavailable. Please check your browser settings and ensure you are using HTTPS.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setShowCamera(false)
    setCameraReady(false)
  }

  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      alert('Camera not initialized')
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const width = video.videoWidth
    const height = video.videoHeight

    // Validate video dimensions
    if (width === 0 || height === 0) {
      alert('Camera not ready yet. Please wait a moment and try again.')
      console.error('Invalid video dimensions:', width, 'x', height)
      return
    }

    console.log('Capturing photo:', width, 'x', height)

    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      alert('Failed to get canvas context')
      return
    }

    ctx.drawImage(video, 0, 0, width, height)

    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Failed to create image blob')
        alert('Failed to capture photo. Please try again.')
        return
      }

      console.log('Photo captured successfully, size:', blob.size, 'bytes')
      const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' })
      setSelectedFile(file)
      setUploadResult(null)
      setArtwork(null)
      stopCamera()
    }, 'image/jpeg', 0.92)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    if (!selectedMuseum) {
      alert('Please select a museum first')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('image', selectedFile)
    formData.append('museumId', selectedMuseum)

    try {
      console.log('📤 Uploading file:', selectedFile.name, 'Size:', selectedFile.size, 'bytes', 'Museum:', selectedMuseum)

      const response = await axios.post(`${API_BASE}/admin/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setUploadResult(response.data)
      console.log('✅ Upload successful:', response.data)
    } catch (error: any) {
      console.error('❌ Upload failed:', error)
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      })

      const errorMsg = error.response?.data?.error || error.message || 'Upload failed'
      alert(`Upload failed: ${errorMsg}\n\nCheck console for details.`)
    } finally {
      setUploading(false)
    }
  }

  const handleFinalize = async (artworkData: any) => {
    if (!uploadResult?.id) return

    setFinalizing(true)
    
    try {
      const response = await axios.post(`${API_BASE}/admin/${uploadResult.id}/finalize`, {
        title: artworkData.title,
        author: artworkData.author,
        year: artworkData.year,
        style: artworkData.style,
        description: artworkData.description,
        sources: artworkData.sources,
        sourceLanguage: 'en'
      })
      
      setArtwork(response.data)
      console.log('Finalize result:', response.data)
    } catch (error) {
      console.error('Finalize failed:', error)
      alert('Finalize failed. Please try again.')
    } finally {
      setFinalizing(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this artwork?')) return
    try {
      await axios.delete(`${API_BASE}/admin/${id}`)
      alert('Artwork deleted')
      setUploadResult(null)
      setArtwork(null)
    } catch (error) {
      alert('Failed to delete')
    }
  }

  const resetForm = () => {
    setSelectedFile(null)
    setUploadResult(null)
    setArtwork(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>🎨 Museum Admin Dashboard</h1>
        <p>Upload artwork images and manage multilingual content</p>
      </div>

      {/* Step 1: Select Museum & Upload Image */}
      <div className="admin-section">
        <h2>📸 Step 1: Select Museum & Upload Artwork</h2>

        {/* Museum Selector */}
        <div className="upload-area" style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="museum-select" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#2c3e50' }}>
            🏛️ Select Museum *
          </label>
          {loadingMuseums ? (
            <p>Loading museums...</p>
          ) : museums.length === 0 ? (
            <div style={{ padding: '1rem', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
              <p style={{ margin: 0 }}>⚠️ No museums found. Please <a href="/admin/museums" style={{ color: '#667eea', fontWeight: 'bold' }}>create a museum first</a>.</p>
            </div>
          ) : (
            <select
              id="museum-select"
              value={selectedMuseum}
              onChange={(e) => setSelectedMuseum(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '1rem',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">-- Select a museum --</option>
              {museums.map(museum => (
                <option key={museum._id} value={museum._id}>
                  {museum.name} ({museum.location})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* File Upload */}
        <div className="upload-area">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="file-input"
            disabled={!selectedMuseum}
          />
          <div style={{ marginTop: '8px' }}>
            <button
              onClick={handleStartCamera}
              className="upload-btn"
              type="button"
              disabled={!selectedMuseum}
              style={{ opacity: selectedMuseum ? 1 : 0.5 }}
            >
              📷 Use Camera
            </button>
          </div>

          {showCamera && (
            <div style={{ marginTop: '12px', border: '2px solid #3498db', borderRadius: 8, padding: '8px', background: '#000' }}>
              <video
                ref={videoRef}
                style={{ width: '100%', borderRadius: 8, display: 'block', minHeight: '200px', background: '#000' }}
                autoPlay
                muted
                playsInline
              />
              {!cameraReady && (
                <p style={{ color: '#f39c12', marginTop: '8px' }}>⏳ Initializing camera...</p>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  onClick={handleCapturePhoto}
                  className="upload-btn"
                  type="button"
                  disabled={!cameraReady}
                  style={{ opacity: cameraReady ? 1 : 0.5 }}
                >
                  📸 {cameraReady ? 'Capture' : 'Wait...'}
                </button>
                <button onClick={stopCamera} className="upload-btn" type="button" style={{ background: '#7f8c8d' }}>✖ Close</button>
              </div>
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
          )}
          
          {selectedFile && (
            <div className="file-preview">
              <img 
                src={URL.createObjectURL(selectedFile)} 
                alt="Preview" 
                className="preview-image"
              />
              <p>Selected: {selectedFile.name}</p>
            </div>
          )}
          
          <button
            onClick={handleUpload}
            disabled={!selectedFile || !selectedMuseum || uploading}
            className="upload-btn"
          >
            {uploading ? '🔄 Processing...' : '🚀 Upload & Analyze'}
          </button>
          {selectedFile && !selectedMuseum && (
            <p style={{ color: '#e74c3c', marginTop: '0.5rem' }}>⚠️ Please select a museum before uploading</p>
          )}
        </div>
      </div>

      {/* Step 2: Review AI Results */}
      {uploadResult && (
        <div className="admin-section">
          <h2>🤖 Step 2: AI Analysis Results</h2>
          <div className="analysis-results">
            <div className="result-card">
              <h3>📷 Image Analysis</h3>
              <img 
                src={`${API_HOST}${uploadResult.imageUrl}`} 
                alt="Uploaded artwork"
                className="result-image"
              />
            </div>
            
            <div className="result-card">
              <h3>🧠 AI Recognition</h3>
              <div className="ai-data">
                <p><strong>Title:</strong> {uploadResult.ai?.title || 'Unknown'}</p>
                <p><strong>Author:</strong> {uploadResult.ai?.author || 'Unknown'}</p>
                <p><strong>Year:</strong> {uploadResult.ai?.year || 'Unknown'}</p>
                <p><strong>Style:</strong> {uploadResult.ai?.style || 'Unknown'}</p>
                <p><strong>Description:</strong> {uploadResult.ai?.description || 'No description'}</p>
              </div>
            </div>

            <div className="result-card">
              <h3>📚 Wikipedia Data</h3>
              <div className="wiki-data">
                <p><strong>Found:</strong> {uploadResult.wiki?.title || 'No match'}</p>
                <p><strong>Description:</strong> {uploadResult.wiki?.description?.substring(0, 200)}...</p>
                {uploadResult.wiki?.sources && (
                  <a href={uploadResult.wiki.sources[0]?.url} target="_blank" rel="noopener noreferrer">
                    View Wikipedia Article
                  </a>
                )}
              </div>
            </div>

            {uploadResult.autoTranslated && (
              <div className="result-card">
                <h3>🌍 Translations Generated</h3>
                <div className="translations">
                  <div className="translation">
                    <h4>🇺🇸 English</h4>
                    <p>{uploadResult.descriptions?.english}</p>
                    {uploadResult.audioUrls?.english && (
                      <audio controls>
                        <source src={`${API_HOST}${uploadResult.audioUrls.english}`} type="audio/mpeg" />
                      </audio>
                    )}
                  </div>
                  
                  <div className="translation">
                    <h4>🇫🇷 French</h4>
                    <p>{uploadResult.descriptions?.french}</p>
                    {uploadResult.audioUrls?.french && (
                      <audio controls>
                        <source src={`${API_HOST}${uploadResult.audioUrls.french}`} type="audio/mpeg" />
                      </audio>
                    )}
                  </div>
                  
                  <div className="translation">
                    <h4>🇪🇸 Spanish</h4>
                    <p>{uploadResult.descriptions?.spanish}</p>
                    {uploadResult.audioUrls?.spanish && (
                      <audio controls>
                        <source src={`${API_HOST}${uploadResult.audioUrls.spanish}`} type="audio/mpeg" />
                      </audio>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Finalize */}
      {uploadResult && !artwork && (
        <div className="admin-section">
          <h2>✅ Step 3: Finalize Artwork</h2>
          <FinalizeForm 
            initialData={uploadResult}
            onFinalize={handleFinalize}
            isLoading={finalizing}
          />
        </div>
      )}

      {/* Step 4: Final Results */}
      {artwork && (
        <div className="admin-section">
          <h2>🎉 Step 4: Artwork Saved Successfully!</h2>
          <div className="final-results">
            <div className="success-card">
              <h3>📋 Artwork Details</h3>
              <p><strong>ID:</strong> {artwork.id}</p>
              <p><strong>Title:</strong> {artwork.title}</p>
              <p><strong>Author:</strong> {artwork.author}</p>
              <p><strong>Year:</strong> {artwork.year}</p>
              <p><strong>Style:</strong> {artwork.style}</p>
            </div>

            <div className="success-card">
              <h3>🌍 Multilingual Content</h3>
              <p><strong>Translations:</strong> {artwork.translationsGenerated.join(', ')}</p>
              <p><strong>Audio Files:</strong> {artwork.audioFilesGenerated.join(', ')}</p>
              
              <div className="language-tabs">
                <div className="language-content">
                  <h4>🇺🇸 English</h4>
                  <p>{artwork.descriptions.english}</p>
                  <audio controls>
                    <source src={`${API_HOST}${artwork.audioUrls.english}`} type="audio/mpeg" />
                  </audio>
                </div>
                
                <div className="language-content">
                  <h4>🇫🇷 French</h4>
                  <p>{artwork.descriptions.french}</p>
                  <audio controls>
                    <source src={`${API_HOST}${artwork.audioUrls.french}`} type="audio/mpeg" />
                  </audio>
                </div>
                
                <div className="language-content">
                  <h4>🇪🇸 Spanish</h4>
                  <p>{artwork.descriptions.spanish}</p>
                  <audio controls>
                    <source src={`${API_HOST}${artwork.audioUrls.spanish}`} type="audio/mpeg" />
                  </audio>
                </div>
              </div>
            </div>

            <div className="success-card">
              <h3>🔗 Public Access</h3>
              <p>Visitors can now access this artwork at:</p>
              <a 
                href={`/artwork/${artwork.id}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="public-link"
              >
                View Public Page →
              </a>
              <div style={{ marginTop: '12px' }}>
                <button onClick={() => handleDelete(artwork.id)} className="upload-btn" style={{ background:'#c0392b' }}>
                  🗑️ Delete Artwork
                </button>
              </div>
            </div>

            <button onClick={resetForm} className="reset-btn">
              ➕ Add Another Artwork
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Finalize Form Component
interface FinalizeFormProps {
  initialData: any
  onFinalize: (data: any) => void
  isLoading: boolean
}

const FinalizeForm: React.FC<FinalizeFormProps> = ({ initialData, onFinalize, isLoading }) => {
  const [formData, setFormData] = useState({
    title: initialData.ai?.title || '',
    author: initialData.ai?.author || '',
    year: initialData.ai?.year || '',
    style: initialData.ai?.style || '',
    description: initialData.descriptions?.english || initialData.ai?.description || '',
    sources: initialData.wiki?.sources || []
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onFinalize(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <form onSubmit={handleSubmit} className="finalize-form">
      <div className="form-grid">
        <div className="form-group">
          <label>Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="Artwork title"
          />
        </div>

        <div className="form-group">
          <label>Author</label>
          <input
            type="text"
            name="author"
            value={formData.author}
            onChange={handleChange}
            placeholder="Artist name"
          />
        </div>

        <div className="form-group">
          <label>Year</label>
          <input
            type="text"
            name="year"
            value={formData.year}
            onChange={handleChange}
            placeholder="Creation year"
          />
        </div>

        <div className="form-group">
          <label>Style</label>
          <input
            type="text"
            name="style"
            value={formData.style}
            onChange={handleChange}
            placeholder="Art style/period"
          />
        </div>
      </div>

      <div className="form-group">
        <label>Description *</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
          rows={4}
          placeholder="Detailed description (will be translated to French and Spanish automatically)"
        />
        <small>💡 This description will be automatically translated to French and Spanish with audio narration</small>
      </div>

      <button 
        type="submit" 
        disabled={isLoading}
        className="finalize-btn"
      >
        {isLoading ? '🔄 Generating Translations & Audio...' : '🌍 Finalize & Generate Multilingual Content'}
      </button>
    </form>
  )
}

export default AdminDashboard
