'use client';

import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Shield, AlertTriangle, CheckCircle, XCircle, Calendar, Mail, Globe, Lock } from 'lucide-react';

interface Certificate {
  id: number;
  domain: string;
  email: string;
  status: 'pending' | 'active' | 'expired' | 'failed';
  certificate_path?: string;
  private_key_path?: string;
  expires_at?: string;
  created_at?: string;
  updated_at?: string;
  isValid?: boolean;
  daysLeft?: number;
  expiryDate?: string;
}

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [processingDomains, setProcessingDomains] = useState<Set<string>>(new Set());

  const [newCert, setNewCert] = useState({
    domain: '',
    email: ''
  });

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const response = await fetch('/api/certificates');
      if (response.ok) {
        const data = await response.json();
        setCertificates(data);
      }
    } catch (error) {
      console.error('Failed to fetch certificates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueCertificate = async () => {
    if (!newCert.domain || !newCert.email) {
      alert('Please fill in all fields');
      return;
    }

    setProcessingDomains(prev => new Set(prev).add(newCert.domain));

    try {
      const response = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: newCert.domain,
          email: newCert.email,
          action: 'issue'
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        setShowAddDialog(false);
        setNewCert({ domain: '', email: '' });
        fetchCertificates();
      } else {
        alert(data.error || 'Error');
      }
    } catch (error) {
      alert('Error creating certificate');
    } finally {
      setProcessingDomains(prev => {
        const newSet = new Set(prev);
        newSet.delete(newCert.domain);
        return newSet;
      });
    }
  };

  const handleRenewCertificate = async (domain: string, email: string) => {
    if (!confirm(`Do you want to renew certificate for ${domain}?`)) {
      return;
    }

    setProcessingDomains(prev => new Set(prev).add(domain));

    try {
      const response = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          email,
          action: 'renew'
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        fetchCertificates();
      } else {
        alert(data.error || 'Error');
      }
    } catch (error) {
      alert('Error renewing certificate');
    } finally {
      setProcessingDomains(prev => {
        const newSet = new Set(prev);
        newSet.delete(domain);
        return newSet;
      });
    }
  };

  const handleRevokeCertificate = async (domain: string, email: string) => {
    if (!confirm(`Do you want to revoke certificate for ${domain}?\n\nThis action cannot be undone!`)) {
      return;
    }

    setProcessingDomains(prev => new Set(prev).add(domain));

    try {
      const response = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain,
          email,
          action: 'revoke'
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        fetchCertificates();
      } else {
        alert(data.error || 'Error');
      }
    } catch (error) {
      alert('Error revoking certificate');
    } finally {
      setProcessingDomains(prev => {
        const newSet = new Set(prev);
        newSet.delete(domain);
        return newSet;
      });
    }
  };

  const getStatusIcon = (cert: Certificate) => {
    if (processingDomains.has(cert.domain)) {
      return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
    }

    switch (cert.status) {
      case 'active':
        if (cert.isValid) {
          if (cert.daysLeft && cert.daysLeft <= 30) {
            return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
          }
          return <CheckCircle className="h-5 w-5 text-green-500" />;
        }
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <RefreshCw className="h-5 w-5 text-blue-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'expired':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default:
        return <Shield className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (cert: Certificate) => {
    if (processingDomains.has(cert.domain)) {
      return 'Processing...';
    }

    switch (cert.status) {
      case 'active':
        if (cert.isValid) {
          if (cert.daysLeft && cert.daysLeft <= 30) {
            return `Expires in ${cert.daysLeft} days`;
          }
          return `Active (${cert.daysLeft} days left)`;
        }
        return 'Expired';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      case 'expired':
        return 'Expired';
      default:
        return 'Unknown';
    }
  };

  const getStatusBadgeColor = (cert: Certificate) => {
    if (processingDomains.has(cert.domain)) {
      return 'bg-blue-100 text-blue-800';
    }

    switch (cert.status) {
      case 'active':
        if (cert.isValid) {
          if (cert.daysLeft && cert.daysLeft <= 30) {
            return 'bg-yellow-100 text-yellow-800';
          }
          return 'bg-green-100 text-green-800';
        }
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate statistics
  const totalCerts = certificates.length;
  const activeCerts = certificates.filter(cert => cert.status === 'active' && cert.isValid).length;
  const expiringSoon = certificates.filter(cert => 
    cert.status === 'active' && cert.isValid && cert.daysLeft && cert.daysLeft <= 30
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-3 border-blue-200 border-t-3 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-medium text-gray-900">Loading...</h3>
            <p className="text-sm text-gray-500">Please wait a moment</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Top Bar with Add Button */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowAddDialog(true)}
          className="group relative overflow-hidden px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          <div className="relative flex items-center gap-2 text-sm">
            <Plus className="w-5 h-5" />
            <span className="font-normal">Add Certificate</span>
          </div>
        </button>
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/80 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Certificates</p>
              <p className="text-2xl font-bold text-gray-900">{totalCerts}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/80 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Certificates</p>
              <p className="text-2xl font-bold text-gray-900">{activeCerts}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/80 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-gray-900">{expiringSoon}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200/80 bg-gradient-to-r from-gray-50/50 to-gray-100/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Lock className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">SSL Certificates</h2>
                <p className="text-sm text-gray-600">Manage SSL certificates with Let's Encrypt</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-500">
                {totalCerts} {totalCerts === 1 ? 'certificate' : 'certificates'}
              </div>
              <button
                onClick={fetchCertificates}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {certificates.length === 0 ? (
            <div className="text-center py-16">
              <div className="relative">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl flex items-center justify-center shadow-lg">
                  <Shield className="w-10 h-10 text-green-500 relative z-10" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No SSL Certificates</h3>
              <p className="text-gray-500 mb-6">Start by adding your first SSL certificate to secure your domains</p>
              <div className="w-32 h-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mx-auto"></div>
            </div>
          ) : (
            <div className="grid gap-4">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="group relative bg-white border border-gray-200/60 rounded-2xl p-4 hover:shadow-xl hover:shadow-green-500/10 hover:border-green-200 hover:-translate-y-1 transition-all duration-300 ease-out overflow-hidden"
                >
                  {/* Background gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 via-transparent to-emerald-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                  
                  <div className="relative z-10 flex items-center justify-between">
                    {/* Left side - Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(cert)}
                          <h3 className="font-semibold text-gray-900 text-lg truncate">
                            {cert.domain}
                          </h3>
                        </div>
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(cert)}`}>
                          {getStatusText(cert)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {/* Domain */}
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                            <Globe className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-0.5">Domain</p>
                            <span className="font-mono text-sm text-gray-700 truncate block">
                              {cert.domain}
                            </span>
                          </div>
                        </div>

                        {/* Email & Expiry */}
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
                            {cert.expires_at ? (
                              <Calendar className="w-4 h-4 text-purple-600" />
                            ) : (
                              <Mail className="w-4 h-4 text-purple-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-0.5">
                              {cert.expires_at ? 'Expires' : 'Email'}
                            </p>
                            <span className="text-sm text-gray-700 truncate block">
                              {cert.expires_at ? 
                                new Date(cert.expires_at).toLocaleDateString('en-US') : 
                                cert.email
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right side - Actions */}
                    <div className="flex items-center gap-2 ml-6">
                      {cert.status === 'active' && (
                        <button
                          onClick={() => handleRenewCertificate(cert.domain, cert.email)}
                          disabled={processingDomains.has(cert.domain)}
                          className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors disabled:opacity-50"
                        >
                          Renew
                        </button>
                      )}
                      {cert.status === 'failed' && (
                        <button
                          onClick={() => handleIssueCertificate()}
                          disabled={processingDomains.has(cert.domain)}
                          className="px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors disabled:opacity-50"
                        >
                          Retry
                        </button>
                      )}
                      {(cert.status === 'active' || cert.status === 'expired') && (
                        <button
                          onClick={() => handleRevokeCertificate(cert.domain, cert.email)}
                          disabled={processingDomains.has(cert.domain)}
                          className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Certificate Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ marginTop: '0px' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-semibold mb-6 text-gray-900">Add SSL Certificate</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domain
                </label>
                <input
                  type="text"
                  value={newCert.domain}
                  onChange={(e) => setNewCert(prev => ({ ...prev, domain: e.target.value }))}
                  placeholder="example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newCert.email}
                  onChange={(e) => setNewCert(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="admin@example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 mb-1">Important Note</p>
                    <p className="text-sm text-amber-700">
                      Please ensure that the domain points to this server and is accessible via HTTP before proceeding.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-8">
              <button
                onClick={() => {
                  setShowAddDialog(false);
                  setNewCert({ domain: '', email: '' });
                }}
                className="px-6 py-2.5 text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleIssueCertificate}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
              >
                Create Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 