'use client';

import { useState, useEffect } from 'react';
import { X, Server } from 'lucide-react';

interface Upstream {
  id: number;
  name: string;
  description: string;
  method: string;
  servers: any[];
}

interface AddSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSiteAdded: () => void;
}

export function AddSiteDialog({ open, onOpenChange, onSiteAdded }: AddSiteDialogProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    target: '',
    upstream_id: '',
    ssl: false,
    ssl_forced: false,
    hsts_enabled: false,
    http2_support: true,
    block_exploits: true,
    caching_enabled: false,
    client_max_body_size: '1m',
    advanced_config: '',
  });
  const [upstreams, setUpstreams] = useState<Upstream[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      fetchUpstreams();
    }
  }, [open]);

  const fetchUpstreams = async () => {
    try {
      const response = await fetch('/api/upstreams');
      if (response.ok) {
        const data = await response.json();
        setUpstreams(data);
      }
    } catch (error) {
      console.error('Error fetching upstreams:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        upstream_id: formData.upstream_id ? parseInt(formData.upstream_id) : null
      };

      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        setFormData({ 
          name: '', domain: '', target: '', upstream_id: '', ssl: false,
          ssl_forced: false, hsts_enabled: false, http2_support: true,
          block_exploits: true, caching_enabled: false, client_max_body_size: '1m',
          advanced_config: ''
        });
        onSiteAdded();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error adding site');
      }
    } catch (error) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ 
      name: '', domain: '', target: '', upstream_id: '', ssl: false,
      ssl_forced: false, hsts_enabled: false, http2_support: true,
      block_exploits: true, caching_enabled: false, client_max_body_size: '1m',
      advanced_config: ''
    });
    setError('');
    setActiveTab('basic');
    onOpenChange(false);
  };

  if (!open) return null;

  const tabs = [
    { id: 'basic', label: 'Basic' },
    { id: 'features', label: 'Features' },
    { id: 'advanced', label: 'Advanced' }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 top-0" style={{ marginTop: '0px' }}>
      <div className="bg-background border rounded-lg max-w-lg w-full p-6 mt-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Add Proxy Site</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">
                  Site Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. My Website"
                  required
                />
              </div>

              <div>
                <label htmlFor="domain" className="block text-sm font-medium mb-1">
                  Domain
                </label>
                <input
                  id="domain"
                  type="text"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="upstream" className="block text-sm font-medium mb-1">
                  <Server className="w-4 h-4 inline mr-1" />
                  Upstream (Use instead of Target URL)
                </label>
                <select
                  id="upstream"
                  value={formData.upstream_id}
                  onChange={(e) => setFormData({ ...formData, upstream_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">No Upstream</option>
                  {upstreams.map((upstream) => (
                    <option key={upstream.id} value={upstream.id}>
                      {upstream.name} ({upstream.servers.length} servers)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="target" className="block text-sm font-medium mb-1">
                  Target URL {formData.upstream_id && '(Not required if using Upstream)'}
                </label>
                <input
                  id="target"
                  type="url"
                  value={formData.target}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="http://localhost:3000"
                  required={!formData.upstream_id}
                />
              </div>

              <div>
                <label htmlFor="client_max_body_size" className="block text-sm font-medium mb-1">
                  Client Max Body Size
                </label>
                <select
                  id="client_max_body_size"
                  value={formData.client_max_body_size}
                  onChange={(e) => setFormData({ ...formData, client_max_body_size: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="1m">1MB</option>
                  <option value="5m">5MB</option>
                  <option value="10m">10MB</option>
                  <option value="25m">25MB</option>
                  <option value="50m">50MB</option>
                  <option value="100m">100MB</option>
                  <option value="256m">256MB</option>
                  <option value="512m">512MB</option>
                  <option value="1g">1GB</option>
                  <option value="2g">2GB</option>
                  <option value="3g">3GB</option>
                  <option value="4g">4GB</option>
                  <option value="8g">8GB</option>
                  <option value="16g">16GB</option>
                  <option value="32g">32GB</option>
                  <option value="64g">64GB</option>
                  <option value="128g">128GB</option>
                  <option value="256g">256GB</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum file upload size
                </p>
              </div>
            </div>
          )}

          {/* Features Tab */}
          {activeTab === 'features' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  id="ssl"
                  type="checkbox"
                  checked={formData.ssl}
                  onChange={(e) => setFormData({ ...formData, ssl: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="ssl" className="text-sm font-medium">
                  Enable SSL
                </label>
              </div>

              {formData.ssl && (
                <div className="pl-6 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      id="ssl_forced"
                      type="checkbox"
                      checked={formData.ssl_forced}
                      onChange={(e) => setFormData({ ...formData, ssl_forced: e.target.checked })}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="ssl_forced" className="text-sm">
                      Force HTTPS
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="hsts_enabled"
                      type="checkbox"
                      checked={formData.hsts_enabled}
                      onChange={(e) => setFormData({ ...formData, hsts_enabled: e.target.checked })}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="hsts_enabled" className="text-sm">
                      Enable HSTS
                    </label>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  id="http2_support"
                  type="checkbox"
                  checked={formData.http2_support}
                  onChange={(e) => setFormData({ ...formData, http2_support: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="http2_support" className="text-sm font-medium">
                  Support HTTP/2
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="block_exploits"
                  type="checkbox"
                  checked={formData.block_exploits}
                  onChange={(e) => setFormData({ ...formData, block_exploits: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="block_exploits" className="text-sm font-medium">
                  Block Common Exploits
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="caching_enabled"
                  type="checkbox"
                  checked={formData.caching_enabled}
                  onChange={(e) => setFormData({ ...formData, caching_enabled: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="caching_enabled" className="text-sm font-medium">
                  Enable Cache for Static Files
                </label>
              </div>
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="advanced_config" className="block text-sm font-medium mb-1">
                  Advanced Configuration (Optional)
                </label>
                <textarea
                  id="advanced_config"
                  value={formData.advanced_config}
                  onChange={(e) => setFormData({ ...formData, advanced_config: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs"
                  placeholder="# Custom nginx directives here..."
                  rows={8}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Additional nginx configuration for this site
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Site'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 