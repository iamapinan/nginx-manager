'use client';

import { useState, useEffect } from 'react';
import { Plus, Server, Edit, Trash2, Settings, Users, Clock, Weight } from 'lucide-react';

interface UpstreamServer {
  id?: number;
  upstream_id: number;
  server: string;
  weight: number;
  max_fails: number;
  fail_timeout: string;
  backup: boolean;
  down: boolean;
}

interface Upstream {
  id?: number;
  name: string;
  description: string;
  method: 'round_robin' | 'least_conn' | 'ip_hash' | 'hash';
  hash_key?: string;
  servers: UpstreamServer[];
  created_at?: string;
  updated_at?: string;
}

export default function UpstreamsPage() {
  const [upstreams, setUpstreams] = useState<Upstream[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingUpstream, setEditingUpstream] = useState<Upstream | null>(null);

  useEffect(() => {
    fetchUpstreams();
  }, []);

  const fetchUpstreams = async () => {
    try {
      const response = await fetch('/api/upstreams');
      if (response.ok) {
        const data = await response.json();
        setUpstreams(data);
      }
    } catch (error) {
      console.error('Error fetching upstreams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this upstream?')) return;

    try {
      const response = await fetch(`/api/upstreams/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchUpstreams();
      } else {
        alert('Error deleting upstream');
      }
    } catch (error) {
      alert('Connection error');
    }
  };

  const getMethodName = (method: string) => {
    switch (method) {
      case 'round_robin': return 'Round Robin';
      case 'least_conn': return 'Least Conn';
      case 'ip_hash': return 'IP Hash';
      case 'hash': return 'Hash';
      default: return method;
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'round_robin': return 'bg-blue-100 text-blue-800';
      case 'least_conn': return 'bg-green-100 text-green-800';
      case 'ip_hash': return 'bg-purple-100 text-purple-800';
      case 'hash': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Server className="w-6 h-6 text-blue-600" />
            Upstreams
          </h1>
          <p className="text-gray-600 text-sm mt-1">Manage load balancing and backend servers</p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="group relative overflow-hidden px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          <div className="relative flex items-center gap-2 text-sm">
            <Plus className="w-5 h-5" />
            <span className="font-normal">Add Upstream</span>
          </div>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Server className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{upstreams.length}</p>
              <p className="text-sm text-gray-600">Total Upstreams</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {upstreams.reduce((total, upstream) => total + upstream.servers.length, 0)}
              </p>
              <p className="text-sm text-gray-600">Total Servers</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Settings className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {upstreams.reduce((total, upstream) => 
                  total + upstream.servers.filter(s => s.down).length, 0
                )}
              </p>
              <p className="text-sm text-gray-600">Down Servers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upstreams List */}
      {upstreams.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Server className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Upstreams</h3>
          <p className="text-gray-600 mb-6">Start creating upstreams for load balancing</p>
          <button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Create First Upstream
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {upstreams.map((upstream) => (
            <div key={upstream.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
              {/* Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{upstream.name}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getMethodColor(upstream.method)}`}>
                        {getMethodName(upstream.method)}
                      </span>
                      {upstream.hash_key && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                          Hash: {upstream.hash_key}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm">{upstream.description}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <button
                      onClick={() => setEditingUpstream(upstream)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(upstream.id!)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Servers */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Servers ({upstream.servers.length})
                  </h4>
                </div>
                
                <div className="grid gap-2">
                  {upstream.servers.map((server, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${server.down ? 'bg-red-500' : 'bg-green-500'}`} />
                        <code className="text-sm font-medium text-gray-900">{server.server}</code>
                        <div className="flex items-center gap-2">
                          {server.down ? (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                              Down
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                              Up
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Weight className="w-3 h-3" />
                          <span>{server.weight}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Settings className="w-3 h-3" />
                          <span>{server.max_fails}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{server.fail_timeout}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialogs */}
      {showAddDialog && (
        <UpstreamDialog
          upstream={null}
          onClose={() => setShowAddDialog(false)}
          onSave={() => {
            setShowAddDialog(false);
            fetchUpstreams();
          }}
        />
      )}

      {editingUpstream && (
        <UpstreamDialog
          upstream={editingUpstream}
          onClose={() => setEditingUpstream(null)}
          onSave={() => {
            setEditingUpstream(null);
            fetchUpstreams();
          }}
        />
      )}
    </div>
  );
}

interface UpstreamDialogProps {
  upstream: Upstream | null;
  onClose: () => void;
  onSave: () => void;
}

function UpstreamDialog({ upstream, onClose, onSave }: UpstreamDialogProps) {
  const [formData, setFormData] = useState<Upstream>({
    name: '',
    description: '',
    method: 'round_robin',
    hash_key: '',
    servers: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (upstream) {
      setFormData(upstream);
    }
  }, [upstream]);

  const addServer = () => {
    setFormData(prev => ({
      ...prev,
      servers: [...prev.servers, {
        upstream_id: prev.id || 0,
        server: '',
        weight: 1,
        max_fails: 1,
        fail_timeout: '10s',
        backup: false,
        down: false
      }]
    }));
  };

  const removeServer = (index: number) => {
    setFormData(prev => ({
      ...prev,
      servers: prev.servers.filter((_, i) => i !== index)
    }));
  };

  const updateServer = (index: number, field: keyof UpstreamServer, value: any) => {
    setFormData(prev => ({
      ...prev,
      servers: prev.servers.map((server, i) => 
        i === index ? { ...server, [field]: value } : server
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.servers.length === 0) {
      setError('At least 1 server is required');
      setLoading(false);
      return;
    }

    try {
      const url = upstream ? `/api/upstreams/${upstream.id}` : '/api/upstreams';
      const method = upstream ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSave();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'An error occurred');
      }
    } catch (error) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-900">
            {upstream ? 'Edit Upstream' : 'Add Upstream'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upstream Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="my-app-backend"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Load Balancing Method</label>
                <select
                  value={formData.method}
                  onChange={(e) => setFormData({ ...formData, method: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="round_robin">Round Robin</option>
                  <option value="least_conn">Least Connections</option>
                  <option value="ip_hash">IP Hash</option>
                  <option value="hash">Hash</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Backend servers for my application"
              />
            </div>

            {formData.method === 'hash' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hash Key</label>
                <input
                  type="text"
                  value={formData.hash_key || ''}
                  onChange={(e) => setFormData({ ...formData, hash_key: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="$remote_addr consistent"
                />
              </div>
            )}

            {/* Servers Section */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  Servers ({formData.servers.length})
                </h3>
                <button
                  type="button"
                  onClick={addServer}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  Add Server
                </button>
              </div>

              <div className="space-y-3">
                {formData.servers.map((server, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Server {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeServer(index)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                      <div className="lg:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Server Address *</label>
                        <input
                          type="text"
                          value={server.server}
                          onChange={(e) => updateServer(index, 'server', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="192.168.1.10:3000"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Weight</label>
                        <input
                          type="number"
                          value={server.weight}
                          onChange={(e) => updateServer(index, 'weight', parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          min="1"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Max Fails</label>
                        <input
                          type="number"
                          value={server.max_fails}
                          onChange={(e) => updateServer(index, 'max_fails', parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          min="1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Fail Timeout</label>
                        <input
                          type="text"
                          value={server.fail_timeout}
                          onChange={(e) => updateServer(index, 'fail_timeout', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="10s"
                        />
                      </div>

                      <div className="flex items-center pt-5">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={server.backup}
                            onChange={(e) => updateServer(index, 'backup', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          Backup Server
                        </label>
                      </div>

                      <div className="flex items-center pt-5">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={server.down}
                            onChange={(e) => updateServer(index, 'down', e.target.checked)}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                          />
                          Down
                        </label>
                      </div>
                    </div>
                  </div>
                ))}

                {formData.servers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Server className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No servers yet</p>
                    <p className="text-sm">Click "Add Server" to get started</p>
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : (upstream ? 'Save Changes' : 'Create Upstream')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 