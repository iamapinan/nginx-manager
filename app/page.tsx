'use client';

import { useState, useEffect } from 'react';
import { ProxySitesList } from '@/components/ProxySitesList';
import { AddSiteDialog } from '@/components/AddSiteDialog';
import { EditSiteDialog } from '@/components/EditSiteDialog';
import { ProxySite } from '@/lib/database';
import { Plus, Server, Globe, Shield, Activity } from 'lucide-react';

export default function Home() {
  const [sites, setSites] = useState<ProxySite[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<ProxySite | null>(null);
  const [editMode, setEditMode] = useState<'basic' | 'code'>('basic');

  const fetchSites = async () => {
    try {
      const response = await fetch('/api/sites');
      if (response.ok) {
        const data = await response.json();
        setSites(data);
      }
    } catch (error) {
      console.error('Error fetching sites:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const handleSiteAdded = () => {
    fetchSites();
    setIsAddDialogOpen(false);
  };

  const handleSiteUpdated = () => {
    fetchSites();
    setEditingSite(null);
    setEditMode('basic');
  };

  const handleSiteDeleted = () => {
    fetchSites();
  };

  const handleEditSite = (site: ProxySite) => {
    setEditingSite(site);
    setEditMode('basic');
  };

  const handleEditCode = (site: ProxySite) => {
    setEditingSite(site);
    setEditMode('code');
  };

  // Calculate statistics
  const totalSites = sites.length;
  const sslEnabledSites = sites.filter(site => site.ssl).length;
  const upstreamSites = sites.filter(site => site.upstream_id).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-3 border-blue-200 border-t-3 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Server className="w-5 h-5 text-blue-600" />
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
      {/* Add Site Dialog */}
      <AddSiteDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSiteAdded={handleSiteAdded}
      />

      {/* Edit Site Dialog */}
      {editingSite && (
        <EditSiteDialog
          site={editingSite}
          open={!!editingSite}
          onOpenChange={(open: boolean) => {
            if (!open) {
              setEditingSite(null);
              setEditMode('basic');
            }
          }}
          onSiteUpdated={handleSiteUpdated}
          initialTab={editMode}
        />
      )}

      {/* Top Bar with Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-600" />
            Proxy Hosts
          </h1>
          <p className="text-gray-600 text-sm mt-1">Manage all your proxy hosts with SSL and security features</p>
        </div>
        <button
          onClick={() => setIsAddDialogOpen(true)}
          className="group relative overflow-hidden px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          <div className="relative flex items-center gap-2 text-sm">
            <Plus className="w-5 h-5" />
            <span className="font-normal">Add Proxy Host</span>
          </div>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/80 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Server className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Sites</p>
              <p className="text-2xl font-bold text-gray-900">{totalSites}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/80 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">SSL Enabled</p>
              <p className="text-2xl font-bold text-gray-900">{sslEnabledSites}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/80 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Upstreams</p>
              <p className="text-2xl font-bold text-gray-900">{upstreamSites}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200/80 bg-gradient-to-r from-gray-50/50 to-gray-100/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Globe className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Proxy Hosts</h2>
                <p className="text-sm text-gray-600">Manage all your proxy hosts with SSL and security features</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {totalSites} {totalSites === 1 ? 'host' : 'hosts'}
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <ProxySitesList
            sites={sites}
            onSiteUpdated={handleSiteUpdated}
            onSiteDeleted={handleSiteDeleted}
            onEditSite={handleEditSite}
            onEditCode={handleEditCode}
          />
        </div>
      </div>
    </div>
  );
} 