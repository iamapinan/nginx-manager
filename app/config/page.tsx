'use client';

import NginxConfigEditor from '@/components/NginxConfigEditor';

export default function ConfigPage() {
  const handleConfigSave = (content: string) => {
    console.log('Configuration saved:', content.length, 'characters');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <NginxConfigEditor onSave={handleConfigSave} />
    </div>
  );
} 