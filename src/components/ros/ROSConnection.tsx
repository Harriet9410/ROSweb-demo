import { useState } from 'react';
import { useRosStore } from '../../stores/rosStore';
import { connect, disconnect } from '../../ros/connection';
import { startMock, stopMock } from '../../ros/mock';

type MockMapType = 'default' | 'blank';

export function ROSConnection() {
  const { status, url, setUrl, isMock, setMock } = useRosStore();
  const [inputUrl, setInputUrl] = useState(url);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const handleConnect = () => {
    if (isMock) {
      stopMock();
      setMock(false);
    }
    setUrl(inputUrl);
    connect(inputUrl);
  };

  const handleDisconnect = () => {
    if (isMock) {
      stopMock();
      setMock(false);
    } else {
      disconnect();
    }
  };

  const handleMockStart = (mapType: MockMapType) => {
    if (!isMock) {
      disconnect();
    }
    setMock(true);
    startMock(mapType);
    setShowMapPicker(false);
  };

  const statusColor: Record<string, string> = {
    disconnected: 'bg-gray-400',
    connecting: 'bg-yellow-400',
    connected: isMock ? 'bg-purple-500' : 'bg-green-500',
    error: 'bg-red-500',
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${statusColor[status] || 'bg-gray-400'}`} />
        <input
          className="bg-gray-700 text-white text-xs px-2 py-1 rounded w-40 outline-none focus:ring-1 focus:ring-blue-400"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          placeholder="ws://localhost:9090"
        />
        {status === 'connected' && !isMock ? (
          <button
            onClick={handleDisconnect}
            className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={handleConnect}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
          >
            Connect
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isMock ? (
          <button
            onClick={handleDisconnect}
            className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
          >
            Exit Mock
          </button>
        ) : (
          <>
            <button
              onClick={() => setShowMapPicker(!showMapPicker)}
              className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded"
            >
              Mock Mode
            </button>
          </>
        )}
        <span className="text-xs text-gray-400 capitalize">
          {status}{isMock ? ' (mock)' : ''}
        </span>
      </div>
      {showMapPicker && !isMock && (
        <div className="bg-gray-700 rounded p-2 space-y-1.5">
          <div className="text-xs text-gray-300 font-medium">Select Map Type</div>
          <button
            onClick={() => handleMockStart('default')}
            className="w-full text-xs text-left bg-gray-600 hover:bg-gray-500 text-white px-2 py-1.5 rounded"
          >
            <span className="font-medium">Default Map</span>
            <span className="text-gray-300 ml-1">- Pre-built walls & obstacles</span>
          </button>
          <button
            onClick={() => handleMockStart('blank')}
            className="w-full text-xs text-left bg-gray-600 hover:bg-gray-500 text-white px-2 py-1.5 rounded"
          >
            <span className="font-medium">Blank Map</span>
            <span className="text-gray-300 ml-1">- Empty with borders only</span>
          </button>
        </div>
      )}
    </div>
  );
}
