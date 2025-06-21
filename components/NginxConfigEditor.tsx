'use client';

import { useState, useEffect } from 'react';
import { Save, RefreshCw, FileText, AlertTriangle, CheckCircle, Undo, Download, Code, Server, Settings } from 'lucide-react';

interface NginxConfigEditorProps {
  onSave?: (content: string) => void;
}

export default function NginxConfigEditor({ onSave }: NginxConfigEditorProps) {
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<{
    valid: boolean;
    error?: string;
  } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    setHasChanges(content !== originalContent);
  }, [content, originalContent]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/nginx');
      const data = await response.json();
      
      if (response.ok) {
        setContent(data.content);
        setOriginalContent(data.content);
      } else {
        alert(data.error || 'Failed to load configuration');
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      alert('Error loading configuration');
    } finally {
      setLoading(false);
    }
  };

  const validateConfig = async (configContent: string = content) => {
    try {
      setValidating(true);
      const response = await fetch('/api/nginx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate', content: configContent })
      });
      
      const result = await response.json();
      setValidation(result);
      return result;
    } catch (error) {
      console.error('Error validating config:', error);
      const errorResult = { valid: false, error: 'Validation failed' };
      setValidation(errorResult);
      return errorResult;
    } finally {
      setValidating(false);
    }
  };

  const saveConfig = async () => {
    if (!hasChanges) return;
    
    try {
      setSaving(true);
      
      // Validate first
      const validationResult = await validateConfig();
      if (!validationResult.valid) {
        alert(`Configuration is invalid:\n${validationResult.error}`);
        return;
      }

      const response = await fetch('/api/nginx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', content })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setOriginalContent(content);
        alert('Configuration saved successfully');
        onSave?.(content);
      } else {
        alert(data.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const reloadNginx = async () => {
    if (!confirm('Do you want to reload Nginx with the current configuration?')) {
      return;
    }

    try {
      const response = await fetch('/api/nginx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reload' })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Nginx reloaded successfully');
      } else {
        alert(data.error || 'Failed to reload Nginx');
      }
    } catch (error) {
      console.error('Error reloading nginx:', error);
      alert('Error reloading Nginx');
    }
  };

  const createBackup = async () => {
    try {
      const response = await fetch('/api/nginx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'backup' })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Backup created successfully');
      } else {
        alert(data.error || 'Failed to create backup');
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      alert('Error creating backup');
    }
  };

  const restoreBackup = async () => {
    if (!confirm('Do you want to restore from backup? Current changes will be lost!')) {
      return;
    }

    try {
      const response = await fetch('/api/nginx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        await fetchConfig();
        alert('Configuration restored from backup');
      } else {
        alert(data.error || 'Failed to restore backup');
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      alert('Error restoring backup');
    }
  };

  const resetChanges = () => {
    if (!hasChanges) return;
    
    if (confirm('Do you want to discard all changes?')) {
      setContent(originalContent);
    }
  };

  const downloadConfig = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nginx.conf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const tabChar = '  '; // 2 spaces for consistency

      if (e.shiftKey) {
        // Shift+Tab: Remove indentation
        const beforeCursor = content.substring(0, start);
        const afterCursor = content.substring(end);
        
        // Find the start of the current line
        const lineStart = beforeCursor.lastIndexOf('\n') + 1;
        const currentLine = beforeCursor.substring(lineStart);
        
        // Remove leading spaces (up to tabChar length)
        if (currentLine.startsWith(tabChar)) {
          const newValue = 
            content.substring(0, lineStart) + 
            currentLine.substring(tabChar.length) + 
            content.substring(start) + 
            afterCursor;
          
          setContent(newValue);
          
          // Adjust cursor position
          setTimeout(() => {
            const newPos = Math.max(lineStart, start - tabChar.length);
            textarea.selectionStart = textarea.selectionEnd = newPos;
          }, 0);
        }
      } else {
        // Tab: Add indentation
        if (start === end) {
          // No selection - just insert tab
          const newValue = content.substring(0, start) + tabChar + content.substring(end);
          setContent(newValue);
          
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + tabChar.length;
          }, 0);
        } else {
          // Selection exists - indent all selected lines
          const beforeSelection = content.substring(0, start);
          const selection = content.substring(start, end);
          const afterSelection = content.substring(end);
          
          const lines = selection.split('\n');
          const indentedLines = lines.map(line => tabChar + line);
          const newSelection = indentedLines.join('\n');
          
          const newValue = beforeSelection + newSelection + afterSelection;
          setContent(newValue);
          
          setTimeout(() => {
            textarea.selectionStart = start;
            textarea.selectionEnd = start + newSelection.length;
          }, 0);
        }
      }
    }
    
    // Handle Enter key for auto-indentation
    if (e.key === 'Enter') {
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const beforeCursor = content.substring(0, start);
      
      // Find the current line's indentation
      const lineStart = beforeCursor.lastIndexOf('\n') + 1;
      const currentLine = content.substring(lineStart, start);
      const indentMatch = currentLine.match(/^(\s*)/);
      const currentIndent = indentMatch ? indentMatch[1] : '';
      
      // Auto-indent new line
      setTimeout(() => {
        const newStart = textarea.selectionStart;
        const newValue = 
          content.substring(0, newStart) + 
          currentIndent + 
          content.substring(newStart);
        
        setContent(newValue);
        
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = newStart + currentIndent.length;
        }, 0);
      }, 0);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-3 border-blue-200 border-t-3 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-medium text-gray-900">Loading Configuration...</h3>
            <p className="text-sm text-gray-500">Please wait a moment</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Code className="w-6 h-6 text-blue-600" />
            Nginx Configuration
          </h1>
          <p className="text-gray-600 text-sm mt-1">Edit and manage your Nginx server configuration</p>
        </div>
        {hasChanges && (
          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 px-4 py-2 rounded-full">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-amber-700 font-medium">Unsaved changes</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200/80 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Primary Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={saveConfig}
              disabled={!hasChanges || saving}
              className="group relative overflow-hidden px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <div className="relative flex items-center gap-2 text-sm font-medium">
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Config'}</span>
              </div>
            </button>
            
            <button
              onClick={() => validateConfig()}
              disabled={validating}
              className="group relative overflow-hidden px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <div className="relative flex items-center gap-2 text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                <span>{validating ? 'Validating...' : 'Validate'}</span>
              </div>
            </button>
            
            <button
              onClick={reloadNginx}
              className="group relative overflow-hidden px-5 py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl hover:from-purple-700 hover:to-violet-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <div className="relative flex items-center gap-2 text-sm font-medium">
                <RefreshCw className="w-4 h-4" />
                <span>Reload Nginx</span>
              </div>
            </button>
          </div>

          {/* Secondary Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={createBackup}
              className="flex items-center px-4 py-2.5 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 hover:shadow-md transform hover:-translate-y-0.5"
            >
              <FileText className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">Backup</span>
            </button>
            
            <button
              onClick={restoreBackup}
              className="flex items-center px-4 py-2.5 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 hover:shadow-md transform hover:-translate-y-0.5"
            >
              <Undo className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">Restore</span>
            </button>
            
            <button
              onClick={downloadConfig}
              className="flex items-center px-4 py-2.5 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 hover:shadow-md transform hover:-translate-y-0.5"
            >
              <Download className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">Download</span>
            </button>
            
            {hasChanges && (
              <button
                onClick={resetChanges}
                className="flex items-center px-4 py-2.5 text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 hover:border-red-300 transition-all duration-200 hover:shadow-md transform hover:-translate-y-0.5"
              >
                <span className="text-sm font-medium">Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Validation Status */}
      {validation && (
        <div className={`relative overflow-hidden rounded-xl p-4 border ${
          validation.valid 
            ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200' 
            : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-r from-white/40 via-transparent to-white/40"></div>
          <div className="relative flex items-start gap-3">
            <div className={`p-2 rounded-xl ${
              validation.valid ? 'bg-emerald-100' : 'bg-red-100'
            }`}>
              {validation.valid ? (
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div className="flex-1">
              <p className={`font-semibold ${
                validation.valid ? 'text-emerald-800' : 'text-red-800'
              }`}>
                {validation.valid ? 'Configuration is valid ✓' : 'Configuration has errors ✗'}
              </p>
              {validation.error && (
                <pre className={`mt-2 text-sm ${
                  validation.valid ? 'text-emerald-700' : 'text-red-700'
                } whitespace-pre-wrap font-mono bg-white/50 p-3 rounded-lg border border-white/80`}>
                  {validation.error}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Editor Card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
        {/* Editor Header */}
        <div className="bg-gradient-to-r from-gray-50/50 to-gray-100/50 px-6 py-4 border-b border-gray-200/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
                <Server className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">/etc/nginx/nginx.conf</h3>
                <p className="text-sm text-gray-600">Main Nginx configuration file</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                {content.split('\n').length} lines
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {content.length} chars
              </span>
            </div>
          </div>
        </div>
        
        {/* Editor */}
        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-96 p-6 font-mono text-sm border-none resize-none focus:outline-none focus:ring-0 bg-transparent placeholder-gray-400"
            placeholder="Loading configuration..."
            spellCheck={false}
            style={{ 
              lineHeight: '1.6',
              tabSize: 2
            }}
            onKeyDown={handleKeyDown}
          />
          {/* Line numbers background effect */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-gray-50/30 via-transparent to-transparent"></div>
        </div>
      </div>

      {/* Help Tips */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 mb-3">Configuration Tips</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-800">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span>Always validate before saving</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span>Create backups before major changes</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span>Use "Reload" to apply changes safely</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span>Test configuration in staging first</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 