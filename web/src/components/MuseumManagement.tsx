import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Museum {
  _id: string;
  name: string;
  location: string;
  qrCode: string;
  website?: string;
  description?: string;
  artworkCount?: number;
  createdAt: string;
}

const MuseumManagement: React.FC = () => {
  const [museums, setMuseums] = useState<Museum[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMuseum, setEditingMuseum] = useState<Museum | null>(null);
  const [qrCodeData, setQrCodeData] = useState<{ museumId: string; image: string; url: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    website: '',
    description: ''
  });

  const API_HOST = `http://${window.location.hostname}:4000`;
  const API_BASE = `${API_HOST}/api`;

  useEffect(() => {
    fetchMuseums();
  }, []);

  const fetchMuseums = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/museums`);
      setMuseums(response.data.museums || []);
    } catch (error) {
      console.error('Failed to fetch museums:', error);
      alert('Failed to load museums');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.location) {
      alert('Name and location are required');
      return;
    }

    try {
      if (editingMuseum) {
        // Update existing museum
        await axios.put(`${API_BASE}/museums/${editingMuseum._id}`, formData);
        alert('Museum updated successfully!');
      } else {
        // Create new museum
        await axios.post(`${API_BASE}/museums`, formData);
        alert('Museum created successfully!');
      }

      setFormData({ name: '', location: '', website: '', description: '' });
      setShowForm(false);
      setEditingMuseum(null);
      fetchMuseums();
    } catch (error: any) {
      console.error('Failed to save museum:', error);
      alert(error.response?.data?.error || 'Failed to save museum');
    }
  };

  const handleEdit = (museum: Museum) => {
    setEditingMuseum(museum);
    setFormData({
      name: museum.name,
      location: museum.location,
      website: museum.website || '',
      description: museum.description || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (museum: Museum) => {
    if (!confirm(`Delete "${museum.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`${API_BASE}/museums/${museum._id}`);
      alert('Museum deleted successfully!');
      fetchMuseums();
    } catch (error: any) {
      console.error('Failed to delete museum:', error);
      alert(error.response?.data?.error || 'Failed to delete museum');
    }
  };

  const handleShowQR = async (museum: Museum) => {
    try {
      const response = await axios.get(`${API_BASE}/museums/${museum._id}/qr`);
      setQrCodeData({
        museumId: museum._id,
        image: response.data.qrCodeImage,
        url: response.data.visitorUrl
      });
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      alert('Failed to generate QR code');
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingMuseum(null);
    setFormData({ name: '', location: '', website: '', description: '' });
  };

  if (loading) {
    return (
      <div className="museum-management">
        <div className="loading">
          <div className="loading-spinner">🏛️</div>
          <p>Loading museums...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="museum-management">
      <div className="museum-header">
        <h1>🏛️ Museum Management</h1>
        <p>Manage museums and their QR codes for visitor access</p>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary"
          style={{ marginTop: '16px' }}
        >
          ➕ Add New Museum
        </button>
      </div>

      {/* Museum Form */}
      {showForm && (
        <div className="modal-overlay" onClick={handleCancelForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingMuseum ? '✏️ Edit Museum' : '➕ Add New Museum'}</h2>
              <button onClick={handleCancelForm} className="close-btn">✖</button>
            </div>

            <form onSubmit={handleSubmit} className="museum-form">
              <div className="form-group">
                <label>Museum Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Louvre Museum"
                  required
                />
              </div>

              <div className="form-group">
                <label>Location *</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g., Paris, France"
                  required
                />
              </div>

              <div className="form-group">
                <label>Website</label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="https://museum-website.com"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Brief description of the museum..."
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleCancelForm} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingMuseum ? 'Update Museum' : 'Create Museum'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrCodeData && (
        <div className="modal-overlay" onClick={() => setQrCodeData(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📱 Museum QR Code</h2>
              <button onClick={() => setQrCodeData(null)} className="close-btn">✖</button>
            </div>

            <div className="qr-code-display">
              <img src={qrCodeData.image} alt="Museum QR Code" style={{ width: '100%', maxWidth: '400px' }} />
              <div className="qr-info">
                <p><strong>Visitor URL:</strong></p>
                <a href={qrCodeData.url} target="_blank" rel="noopener noreferrer">
                  {qrCodeData.url}
                </a>
                <p style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
                  💡 Print this QR code and place it at your museum entrance. Visitors can scan it to access the collection.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Museums List */}
      <div className="museums-list">
        {museums.length === 0 ? (
          <div className="empty-state">
            <h3>No museums yet</h3>
            <p>Create your first museum to get started</p>
          </div>
        ) : (
          <div className="museums-grid">
            {museums.map(museum => (
              <div key={museum._id} className="museum-card">
                <div className="museum-card-header">
                  <h3>{museum.name}</h3>
                  <div className="museum-actions">
                    <button
                      onClick={() => handleShowQR(museum)}
                      className="btn-icon"
                      title="Show QR Code"
                    >
                      📱
                    </button>
                    <button
                      onClick={() => handleEdit(museum)}
                      className="btn-icon"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(museum)}
                      className="btn-icon btn-danger"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="museum-card-body">
                  <p><strong>📍 Location:</strong> {museum.location}</p>
                  {museum.website && (
                    <p><strong>🌐 Website:</strong> <a href={museum.website} target="_blank" rel="noopener noreferrer">{museum.website}</a></p>
                  )}
                  {museum.description && (
                    <p><strong>📝 Description:</strong> {museum.description}</p>
                  )}
                  <p><strong>🎨 Artworks:</strong> {museum.artworkCount || 0}</p>
                  <p><strong>🔑 QR Code:</strong> <code>{museum.qrCode}</code></p>
                </div>

                <div className="museum-card-footer">
                  <small>Created: {new Date(museum.createdAt).toLocaleDateString()}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MuseumManagement;
