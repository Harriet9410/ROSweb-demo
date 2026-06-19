import { useState } from 'react';
import { useRosStore } from '../../stores/rosStore';
import { useA11yStore } from '../../stores/a11yStore';
import { t } from '../../i18n';
import { connect, disconnect } from '../../ros/connection';
import { startMock, stopMock } from '../../ros/mock';

export function ROSConnection() {
  const { status, url, setUrl, isMock, setMock } = useRosStore();
  const locale = useA11yStore((s) => s.locale);
  const [inputUrl, setInputUrl] = useState(url);

  const handleConnect = () => {
    if (isMock) { stopMock(); setMock(false); }
    setUrl(inputUrl);
    connect(inputUrl);
  };

  const handleDisconnect = () => {
    if (isMock) { stopMock(); setMock(false); }
    else disconnect();
  };

  const handleMock = () => {
    if (!isMock) disconnect();
    setMock(true);
    startMock('default');
  };

  const statusColor: Record<string, string> = {
    disconnected: 'bg-gray-400',
    connecting: 'bg-yellow-400',
    connected: isMock ? 'bg-purple-500' : 'bg-green-500',
    error: 'bg-red-500',
  };

  return (
    <div className="flex flex-col gap-1.5" role="group" aria-label={t('ROS Connection', locale)}>
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${statusColor[status] || 'bg-gray-400'}`} role="status" aria-label={`ROS ${status}`} />
        <input
          className="bg-gray-700 text-white text-xs px-2 py-1 rounded w-40 outline-none focus:ring-1 focus:ring-blue-400"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          placeholder="ws://localhost:9090"
          aria-label="ROS bridge URL"
        />
        {status === 'connected' && !isMock ? (
          <button onClick={handleDisconnect} className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded" aria-label={t('Disconnect', locale)}>
            {t('Disconnect', locale)}
          </button>
        ) : (
          <button onClick={handleConnect} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded" aria-label={t('Connect', locale)}>
            {t('Connect', locale)}
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isMock ? (
          <button onClick={handleDisconnect} className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded" aria-label={t('Exit Mock', locale)}>
            {t('Exit Mock', locale)}
          </button>
        ) : (
          <button onClick={handleMock} className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded" aria-label={t('Mock Mode', locale)}>
            {t('Mock Mode', locale)}
          </button>
        )}
        <span className="text-xs text-gray-400 capitalize" aria-label={`Status: ${status}`}>
          {status}{isMock ? ` ${t('(mock)', locale)}` : ''}
        </span>
      </div>
    </div>
  );
}
