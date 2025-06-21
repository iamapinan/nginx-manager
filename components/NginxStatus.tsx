'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Server, AlertCircle, CheckCircle } from 'lucide-react';

interface NginxStatusData {
  running: string;
  message: string;
  timestamp?: string;
}

// Component แบบเล็กสำหรับ navigation bar
export function NginxStatusMini() {
  const [status, setStatus] = useState<NginxStatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/nginx/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Error fetching nginx status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async () => {
    setRestarting(true);
    try {
      const response = await fetch('/api/nginx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'reload' }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Reload result:', result);
        setTimeout(fetchStatus, 2000);
      }
    } catch (error) {
      console.error('Error reloading nginx:', error);
    } finally {
      setRestarting(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2">
      {/* Status Indicator */}
      <div className="flex items-center gap-1" title={status?.message || 'Checking nginx status...'}>
        {status ? (
          status.running === 'yes' ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )
        ) : (
          <Server className="w-4 h-4 text-gray-400" />
        )}
        <span className={`text-xs font-medium ${
          status ? (status.running === 'yes' ? 'text-green-600' : 'text-red-600') : 'text-gray-500'
        }`}>
          {status ? (status.running === 'yes' ? 'Online' : 'Offline') : 'Check...'}
        </span>
      </div>

      {/* Restart Button */}
      <button
        onClick={handleRestart}
        disabled={restarting || loading}
        className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 disabled:opacity-50"
        title={restarting ? 'Reloading Nginx...' : 'Reload Nginx'}
      >
        <RefreshCw className={`w-4 h-4 ${restarting ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}

// Component แบบเดิมสำหรับใช้ในหน้าหลัก
export function NginxStatus() {
  const [status, setStatus] = useState<NginxStatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/nginx/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Error fetching nginx status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async () => {
    setRestarting(true);
    try {
      const response = await fetch('/api/nginx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'reload' }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Reload result:', result);
        // รอสักครู่แล้วอัปเดตสถานะ
        setTimeout(fetchStatus, 2000);
      }
    } catch (error) {
      console.error('Error reloading nginx:', error);
    } finally {
      setRestarting(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // อัปเดตสถานะทุก 30 วินาที
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Server className="w-5 h-5 text-muted-foreground" />
          <div>
            <h3 className="font-medium">Nginx Status</h3>
            <div className="flex items-center gap-2 mt-1">
              {status ? (
                <>
                  {status.running ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span
                    className={`text-sm ${
                      status.running ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {status.message}
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {loading ? 'Checking...' : 'Cannot check'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            title="Refresh Status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={handleRestart}
            disabled={restarting || loading}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {restarting ? 'Reloading...' : 'Reload Nginx'}
          </button>
        </div>
      </div>
    </div>
  );
} 