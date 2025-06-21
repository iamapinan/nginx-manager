'use client';

import { useState, useEffect } from 'react';
import { ProxySite } from '@/lib/database';
import { X, Server, Save, RefreshCw, Code, CheckCircle, AlertTriangle, FileText, Download } from 'lucide-react';

interface Upstream {
  id: number;
  name: string;
  description: string;
  method: string;
  servers: any[];
}

interface EditSiteDialogProps {
  site: ProxySite;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSiteUpdated: () => void;
  initialTab?: 'basic' | 'features' | 'advanced' | 'code';
}

export function EditSiteDialog({ site, open, onOpenChange, onSiteUpdated, initialTab = 'basic' }: EditSiteDialogProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'features' | 'advanced' | 'code'>(initialTab);
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
  const [customConfig, setCustomConfig] = useState('');
  const [configPath, setConfigPath] = useState('');
  const [isNewConfig, setIsNewConfig] = useState(false);
  const [upstreams, setUpstreams] = useState<Upstream[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [error, setError] = useState('');
  const [validatingConfig, setValidatingConfig] = useState(false);
  const [configValidation, setConfigValidation] = useState<{
    valid: boolean;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      fetchUpstreams();
      loadSiteConfig(); // โหลด config ไฟล์จริง
    }
  }, [open, initialTab, site.id]);

  useEffect(() => {
    if (site) {
      setFormData({
        name: site.name,
        domain: site.domain,
        target: site.target,
        upstream_id: site.upstream_id ? site.upstream_id.toString() : '',
        ssl: site.ssl,
        ssl_forced: site.ssl_forced,
        hsts_enabled: site.hsts_enabled,
        http2_support: site.http2_support,
        block_exploits: site.block_exploits,
        caching_enabled: site.caching_enabled,
        client_max_body_size: site.client_max_body_size || '1m',
        advanced_config: site.advanced_config || '',
      });
    }
  }, [site]);

  const loadSiteConfig = async () => {
    try {
      setLoadingConfig(true);
      const response = await fetch(`/api/sites/${site.id}/config`);
      
      if (response.ok) {
        const data = await response.json();
        setCustomConfig(data.content);
        setConfigPath(data.path);
        setIsNewConfig(data.isNew || false);
      } else {
        const errorData = await response.json();
        setError(`Failed to load config: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error loading site config:', error);
      setError('Failed to load site configuration');
    } finally {
      setLoadingConfig(false);
    }
  };

  const validateConfig = async (config: string) => {
    try {
      setValidatingConfig(true);
      
      // ใช้ API ใหม่สำหรับ validate config ไฟล์จริง
      const response = await fetch('/api/nginx/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          config,
          domain: formData.domain 
        })
      });
      
      const result = await response.json();
      setConfigValidation(result);
      return result;
    } catch (error) {
      console.error('Error validating config:', error);
      const errorResult = { valid: false, error: 'Validation failed' };
      setConfigValidation(errorResult);
      return errorResult;
    } finally {
      setValidatingConfig(false);
    }
  };

  const saveConfigFile = async (content: string) => {
    try {
      const response = await fetch(`/api/sites/${site.id}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save config file');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      throw error;
    }
  };

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      if (e.shiftKey) {
        // Shift+Tab: Remove indentation
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const lineEnd = value.indexOf('\n', end);
        const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;
        
        const lines = value.substring(lineStart, actualLineEnd).split('\n');
        const newLines = lines.map(line => {
          if (line.startsWith('\t')) {
            return line.substring(1);
          } else if (line.startsWith('    ')) {
            return line.substring(4);
          }
          return line;
        });
        
        const newValue = value.substring(0, lineStart) + newLines.join('\n') + value.substring(actualLineEnd);
        setCustomConfig(newValue);
        
        // Restore cursor position
        setTimeout(() => {
          const removedChars = lines.reduce((acc, line, index) => {
            if (line.startsWith('\t')) return acc + 1;
            if (line.startsWith('    ')) return acc + 4;
            return acc;
          }, 0);
          textarea.selectionStart = Math.max(lineStart, start - Math.min(removedChars, start - lineStart));
          textarea.selectionEnd = Math.max(lineStart, end - removedChars);
        }, 0);
      } else {
        // Tab: Add indentation
        if (start === end) {
          // No selection, just insert tab
          const newValue = value.substring(0, start) + '    ' + value.substring(end);
          setCustomConfig(newValue);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + 4;
          }, 0);
        } else {
          // Selection exists, indent all selected lines
          const lineStart = value.lastIndexOf('\n', start - 1) + 1;
          const lineEnd = value.indexOf('\n', end);
          const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;
          
          const lines = value.substring(lineStart, actualLineEnd).split('\n');
          const newLines = lines.map(line => '    ' + line);
          
          const newValue = value.substring(0, lineStart) + newLines.join('\n') + value.substring(actualLineEnd);
          setCustomConfig(newValue);
          
          // Restore selection
          setTimeout(() => {
            textarea.selectionStart = start + 4;
            textarea.selectionEnd = end + (lines.length * 4);
          }, 0);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (activeTab === 'code') {
        // บันทึกไฟล์ config โดยตรง
        await saveConfigFile(customConfig);
        onSiteUpdated();
      } else {
        // บันทึกข้อมูล site ปกติ
        const submitData = {
          ...formData,
          upstream_id: formData.upstream_id ? parseInt(formData.upstream_id) : null,
          advanced_config: formData.advanced_config
        };

        const response = await fetch(`/api/sites/${site.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData),
        });

        if (response.ok) {
          onSiteUpdated();
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Error editing site');
        }
      }
    } catch (error: any) {
      setError(error.message || 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setActiveTab(initialTab);
    setConfigValidation(null);
    onOpenChange(false);
  };

  const downloadConfig = () => {
    const blob = new Blob([customConfig], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${site.domain}.conf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  const tabs = [
    { id: 'basic', label: 'Basic' },
    { id: 'features', label: 'Features' },
    { id: 'advanced', label: 'Advanced' },
    { id: 'code', label: 'Config File', icon: FileText }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 top-0" style={{ marginTop: '0px' }}>
      <div className="bg-background border rounded-lg max-w-4xl w-full p-6 mt-16">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Edit Proxy Site</h2>
            {activeTab === 'code' && configPath ? (
              <p className="text-sm text-muted-foreground mt-1">
                {isNewConfig ? 'New config file' : `Config file: ${configPath}`}
              </p>
            ):(
              <p className="text-sm text-muted-foreground mt-1">
                {site.domain}
              </p>
            )}
          </div>
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
              onClick={() => setActiveTab(tab.id as 'basic' | 'features' | 'advanced' | 'code')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon && <tab.icon className="w-4 h-4" />}
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium mb-1">
                  Site Name
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. My Website"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit-domain" className="block text-sm font-medium mb-1">
                  Domain
                </label>
                <input
                  id="edit-domain"
                  type="text"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit-upstream" className="block text-sm font-medium mb-1">
                  <Server className="w-4 h-4 inline mr-1" />
                  Upstream (Use instead of Target URL)
                </label>
                <select
                  id="edit-upstream"
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
                <label htmlFor="edit-target" className="block text-sm font-medium mb-1">
                  Target URL {formData.upstream_id && '(Not required if using Upstream)'}
                </label>
                <input
                  id="edit-target"
                  type="url"
                  value={formData.target}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="http://localhost:3000"
                  required={!formData.upstream_id}
                />
              </div>

              <div>
                <label htmlFor="edit-client-max-body-size" className="block text-sm font-medium mb-1">
                  Client Max Body Size
                </label>
                <select
                  id="edit-client-max-body-size"
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
                  id="edit-ssl"
                  type="checkbox"
                  checked={formData.ssl}
                  onChange={(e) => setFormData({ ...formData, ssl: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="edit-ssl" className="text-sm font-medium">
                  Enable SSL
                </label>
              </div>

              {formData.ssl ? (
                <div className="pl-6 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      id="edit-ssl-forced"
                      type="checkbox"
                      checked={formData.ssl_forced}
                      onChange={(e) => setFormData({ ...formData, ssl_forced: e.target.checked })}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="edit-ssl-forced" className="text-sm">
                      Force HTTPS
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="edit-hsts-enabled"
                      type="checkbox"
                      checked={formData.hsts_enabled}
                      onChange={(e) => setFormData({ ...formData, hsts_enabled: e.target.checked })}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="edit-hsts-enabled" className="text-sm">
                      Enable HSTS
                    </label>
                  </div>
                </div>
              ) : (
                <div className="pl-6 space-y-2">
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  id="edit-http2-support"
                  type="checkbox"
                  checked={formData.http2_support}
                  onChange={(e) => setFormData({ ...formData, http2_support: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="edit-http2-support" className="text-sm font-medium">
                  Support HTTP/2
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="edit-block-exploits"
                  type="checkbox"
                  checked={formData.block_exploits}
                  onChange={(e) => setFormData({ ...formData, block_exploits: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="edit-block-exploits" className="text-sm font-medium">
                  Block Common Exploits
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="edit-caching-enabled"
                  type="checkbox"
                  checked={formData.caching_enabled}
                  onChange={(e) => setFormData({ ...formData, caching_enabled: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="edit-caching-enabled" className="text-sm font-medium">
                  Enable Caching
                </label>
              </div>
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="edit-advanced-config" className="block text-sm font-medium mb-1">
                  Advanced Config (Nginx directives)
                </label>
                <textarea
                  id="edit-advanced-config"
                  value={formData.advanced_config}
                  onChange={(e) => setFormData({ ...formData, advanced_config: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs"
                  rows={8}
                  placeholder="# Additional nginx configuration (if needed)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Additional nginx configuration (if needed)
                </p>
              </div>
            </div>
          )}

          {/* Config File Tab */}
          {activeTab === 'code' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">
                  Nginx Configuration File (Direct Edit)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => validateConfig(customConfig)}
                    disabled={validatingConfig}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {validatingConfig ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3 h-3" />
                    )}
                    Validate
                  </button>
                  <button
                    type="button"
                    onClick={downloadConfig}
                    className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                </div>
              </div>

              {loadingConfig && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading configuration file...
                </div>
              )}

              {/* Config validation status */}
              {configValidation && (
                <div className={`p-3 rounded-md flex items-center gap-2 text-sm ${
                  configValidation.valid 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {configValidation.valid ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  {configValidation.valid ? 'Configuration is valid' : configValidation.error}
                </div>
              )}

              <div className="border rounded-md">
                <div className="bg-gray-50 px-3 py-2 border-b text-xs text-gray-600 font-mono flex justify-between items-center">
                  <span>{formData.domain}.conf</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    isNewConfig 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {isNewConfig ? 'New File' : 'Existing File'}
                  </span>
                </div>
                <textarea
                  value={customConfig}
                  onChange={(e) => setCustomConfig(e.target.value)}
                  className="w-full px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={25}
                  onKeyDown={handleKeyDown}
                  placeholder="# Loading configuration file..."
                  style={{ fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace' }}
                  disabled={loadingConfig}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Direct edit of the nginx configuration file for {site.domain}. Changes are written directly to the server. Use Tab/Shift+Tab for indentation.
              </p>
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
              disabled={loading || loadingConfig}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {activeTab === 'code' ? 'Saving Config...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {activeTab === 'code' ? 'Save Config File' : 'Save Changes'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 