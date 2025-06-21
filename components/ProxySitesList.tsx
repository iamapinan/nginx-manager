'use client';

import { useState, useEffect } from 'react';
import { ProxySite } from '@/lib/database';
import { Edit, Trash2, ExternalLink, Shield, ShieldOff, Server, Globe, Zap, Code } from 'lucide-react';

interface Upstream {
  id: number;
  name: string;
  description: string;
}

interface ProxySitesListProps {
  sites: ProxySite[];
  onSiteUpdated: () => void;
  onSiteDeleted: () => void;
  onEditSite: (site: ProxySite) => void;
  onEditCode?: (site: ProxySite) => void;
}

export function ProxySitesList({ sites, onSiteUpdated, onSiteDeleted, onEditSite, onEditCode }: ProxySitesListProps) {
  const [deletingSite, setDeletingSite] = useState<number | null>(null);
  const [upstreams, setUpstreams] = useState<Upstream[]>([]);

  // Fetch upstreams on component mount
  useEffect(() => {
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
    fetchUpstreams();
  }, []);

  const getUpstreamName = (upstreamId?: number) => {
    if (!upstreamId) return null;
    const upstream = upstreams.find(u => u.id === upstreamId);
    return upstream?.name;
  };

  const handleDeleteSite = async (id: number) => {
    if (!confirm('Are you sure you want to delete this site?')) {
      return;
    }

    setDeletingSite(id);
    try {
      const response = await fetch(`/api/sites/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onSiteDeleted();
      } else {
        alert('Failed to delete site');
      }
    } catch (error) {
      console.error('Error deleting site:', error);
      alert('Error occurred while deleting site');
    } finally {
      setDeletingSite(null);
    }
  };

  if (sites.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="relative">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl flex items-center justify-center shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-600/10 rounded-2xl"></div>
            <Server className="w-10 h-10 text-blue-500 relative z-10" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">No Proxy Sites</h3>
        <p className="text-gray-500 mb-6">Start by adding your first site to get started</p>
        <div className="w-32 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {sites.map((site) => (
        <div
          key={site.id}
          className="group relative bg-white border border-gray-200/60 rounded-2xl p-4 hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-200 hover:-translate-y-1 transition-all duration-300 ease-out overflow-hidden"
        >
          {/* Background gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-indigo-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
          
          <div className="relative z-10 flex items-center justify-between">
            {/* Left side - Main info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-gray-900 text-lg truncate">
                    {site.name}
                  </h3>
                </div>
                {site.ssl ? (
                  <div className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-3 py-1 rounded-full shadow-sm">
                    <Shield className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">SSL</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-gradient-to-r from-gray-400 to-gray-500 text-white px-3 py-1 rounded-full shadow-sm">
                    <ShieldOff className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">HTTP</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Domain */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                    <ExternalLink className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-0.5">Domain</p>
                    <a
                      href={`http${site.ssl ? 's' : ''}://${site.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 font-mono text-sm flex items-center gap-1 truncate group-hover:text-blue-700 transition-colors duration-200"
                    >
                      {site.domain}
                    </a>
                  </div>
                </div>

                {/* Target/Upstream */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
                    {site.upstream_id ? (
                      <Zap className="w-4 h-4 text-purple-600" />
                    ) : (
                      <Server className="w-4 h-4 text-purple-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-0.5">Target</p>
                    {site.upstream_id ? (
                      <div className="flex items-center inline-flex gap-1.5 bg-gradient-to-r from-purple-500 to-violet-500 text-white px-2.5 py-1 rounded-full shadow-sm">
                        <Server className="w-3 h-3" />
                        <span className="text-xs font-semibold">
                          {getUpstreamName(site.upstream_id) || `Upstream #${site.upstream_id}`}
                        </span>
                      </div>
                    ) : (
                      <span className="font-mono text-sm text-gray-700 truncate block">
                        {site.target}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2 ml-6">
              <button
                onClick={() => onEditSite(site)}
                className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                title="Edit Site"
              >
                <Edit className="w-4 h-4" />
              </button>

              {onEditCode && (
                <button
                  onClick={() => onEditCode(site)}
                  className="p-2.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                  title="Edit Code"
                >
                  <Code className="w-4 h-4" />
                </button>
              )}
              
              <button
                onClick={() => handleDeleteSite(site.id!)}
                disabled={deletingSite === site.id}
                className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                title="Delete Site"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 