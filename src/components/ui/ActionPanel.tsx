import { useHRZStore, ZONE_COLORS, ZoneType, ZONE_SPEED } from '../../stores/hrzStore';
import { useHRPStore, SPEED_LEVELS, speedToColor, DEFAULT_SPEED } from '../../stores/hrpStore';
import { useRosStore } from '../../stores/rosStore';
import { useWaypointStore } from '../../stores/waypointStore';
import { useMapStore } from '../../stores/mapStore';
import { useMapEditorStore, MapTool } from '../../stores/mapEditorStore';
import { useUndoStore } from '../../stores/undoStore';
import { useLabelStore } from '../../stores/labelStore';
import { useA11yStore } from '../../stores/a11yStore';
import { t } from '../../i18n';
import { publishHRZZones, publishHRPPath, publishHRPSpeeds, publishNavGoal } from '../../ros/connection';
import { mockPublishHRZZones, mockPublishHRPPath, mockStartWaypointNav, mockCancelNav, mockResetMap, mockClearMap } from '../../ros/mock';
import { sceneToRos, dist } from '../../utils/coordinate';
import { checkPathReachability } from '../../utils/pathCheck';
import type { AppMode } from '../ui/ModeSelector';

interface ActionPanelProps {
  mode: AppMode;
}

export function ActionPanel({ mode }: ActionPanelProps) {
  const hrzZones = useHRZStore((s) => s.zones);
  const hrzCurrentVertices = useHRZStore((s) => s.currentVertices);
  const hrpPath = useHRPStore((s) => s.path);
  const hrpSegmentSpeeds = useHRPStore((s) => s.segmentSpeeds);
  const hrpBlockedSegments = useHRPStore((s) => s.blockedSegments);
  const hrpSelectedSegment = useHRPStore((s) => s.selectedSegment);
  const wpWaypoints = useWaypointStore((s) => s.waypoints);
  const wpCurrentWaypointIdx = useWaypointStore((s) => s.currentWaypointIdx);
  const wpNavigating = useWaypointStore((s) => s.navigating);
  const isMock = useRosStore((s) => s.isMock);
  const isConnected = useRosStore((s) => s.status) === 'connected';
  const editTool = useMapEditorStore((s) => s.tool);
  const brushSize = useMapEditorStore((s) => s.brushSize);
  const labels = useLabelStore((s) => s.labels);
  const locale = useA11yStore((s) => s.locale);

  const mapTools: { key: MapTool; label: string; desc: string }[] = [
    { key: 'wall', label: t('Wall', locale), desc: t('Draw walls (click & drag)', locale) },
    { key: 'erase', label: t('Eraser', locale), desc: t('Erase walls (click & drag)', locale) },
    { key: 'rect', label: t('Rectangle', locale), desc: t('Draw rectangular wall (click & drag)', locale) },
    { key: 'robot', label: t('Place Robot', locale), desc: t('Click to place robot', locale) },
  ];

  const handlePublishHRZ = () => {
    const zones = useHRZStore.getState().zones;
    const data = zones.map((z) => ({
      id: z.id,
      vertices: z.vertices.map((v) => sceneToRos(v.x, v.z)),
    }));
    const json = JSON.stringify(data);
    if (isMock) mockPublishHRZZones(json);
    else publishHRZZones(json);
  };

  const handlePublishHRP = () => {
    const path = useHRPStore.getState().path;
    const speeds = useHRPStore.getState().segmentSpeeds;
    if (path.length < 2) return;
    const rosPoints = path.map((p) => sceneToRos(p.x, p.z));
    if (isMock) mockPublishHRPPath(rosPoints, speeds);
    else { publishHRPPath(rosPoints); publishHRPSpeeds(speeds); }
  };

  const handleCheckPath = () => {
    const grid = useMapStore.getState().grid;
    const path = useHRPStore.getState().path;
    if (!grid || path.length < 2) return;
    const blocked = checkPathReachability(grid, path);
    useHRPStore.getState().setBlockedSegments(blocked);
  };

  const handleAutoSpeed = () => {
    const zones = useHRZStore.getState().zones;
    const path = useHRPStore.getState().path;
    const speeds = useHRPStore.getState().segmentSpeeds;
    if (zones.length === 0 || path.length < 2) return;
    useUndoStore.getState().pushUndo();
    const newSpeeds = [...speeds];
    for (let i = 0; i < path.length - 1; i++) {
      const midX = (path[i].x + path[i + 1].x) / 2;
      const midZ = (path[i].z + path[i + 1].z) / 2;
      let matchedSpeed: number | null = null;
      for (const zone of zones) {
        if (pointInPolygon(midX, midZ, zone.vertices)) {
          const zoneSpeed = ZONE_SPEED[zone.zoneType];
          if (zone.zoneType === 'forbidden') matchedSpeed = 0.05;
          else if (matchedSpeed === null || zoneSpeed < matchedSpeed) matchedSpeed = zoneSpeed;
        }
      }
      if (matchedSpeed !== null) newSpeeds[i] = matchedSpeed;
    }
    useHRPStore.setState({ segmentSpeeds: newSpeeds });
  };

  const calcTotalDist = () => {
    let total = 0;
    for (let i = 0; i < hrpPath.length - 1; i++) total += dist(hrpPath[i], hrpPath[i + 1]);
    return total;
  };

  const calcEstTime = () => {
    let totalSec = 0;
    for (let i = 0; i < hrpPath.length - 1; i++) {
      const d = dist(hrpPath[i], hrpPath[i + 1]);
      const speed = hrpSegmentSpeeds[i] || DEFAULT_SPEED;
      totalSec += speed > 0 ? d / speed : 0;
    }
    if (totalSec < 60) return `${totalSec.toFixed(0)}s`;
    const min = Math.floor(totalSec / 60);
    const sec = Math.round(totalSec % 60);
    return `${min}m${sec}s`;
  };

  const handleStartNav = () => {
    if (isMock) { mockStartWaypointNav(); }
    else {
      const wps = useWaypointStore.getState().waypoints;
      if (wps.length > 0) {
        publishNavGoal(wps[0].x, wps[0].z);
        useWaypointStore.getState().setCurrentWaypointIdx(0);
        useWaypointStore.getState().setNavigating(true);
      }
    }
  };

  const handleCancelNav = () => {
    if (isMock) mockCancelNav();
    else useWaypointStore.getState().clearNav();
  };

  const canPublish = isConnected;

  return (
    <div className="space-y-3" role="region" aria-label={t('Actions', locale)}>
      {mode === 'navigate' && (
        <>
          <div className="text-xs text-gray-400">
            {t('Left-click on the map to add waypoints. Robot will navigate to each in order.', locale)}
          </div>
          {wpWaypoints.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-gray-300 font-medium">
                {t('Waypoints', locale)} ({wpWaypoints.length})
              </div>
              <div className="max-h-48 overflow-y-auto space-y-0.5" role="list" aria-label={t('Waypoints', locale)}>
                {wpWaypoints.map((wp, i) => (
                  <div key={wp.id} role="listitem" className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                    wpNavigating && i === wpCurrentWaypointIdx ? 'bg-pink-600/40 ring-1 ring-pink-400'
                    : wpNavigating && i < wpCurrentWaypointIdx ? 'bg-gray-600/30 opacity-50'
                    : 'bg-gray-700/50'
                  }`}>
                    <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                    <span className="text-gray-300 flex-1 truncate">({wp.x.toFixed(1)}, {wp.z.toFixed(1)})</span>
                    {!wpNavigating && (
                      <>
                        <button onClick={() => useWaypointStore.getState().moveWaypoint(wp.id, 'up')} disabled={i === 0} className="text-gray-400 hover:text-white disabled:opacity-30 px-0.5" aria-label="Move up">▲</button>
                        <button onClick={() => useWaypointStore.getState().moveWaypoint(wp.id, 'down')} disabled={i === wpWaypoints.length - 1} className="text-gray-400 hover:text-white disabled:opacity-30 px-0.5" aria-label="Move down">▼</button>
                        <button onClick={() => useWaypointStore.getState().removeWaypoint(wp.id)} className="text-red-400 hover:text-red-300 px-0.5" aria-label="Remove waypoint">✕</button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {wpNavigating ? (
            <>
              <div className="text-xs text-pink-400">
                {t('Navigating: waypoint', locale)} {wpCurrentWaypointIdx + 1}/{wpWaypoints.length}
              </div>
              <button onClick={handleCancelNav} className="w-full text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded" aria-label={t('Cancel Navigation', locale)}>
                {t('Cancel Navigation', locale)}
              </button>
            </>
          ) : (
            <>
              <button onClick={handleStartNav} disabled={wpWaypoints.length === 0} className="w-full text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded" aria-label={t('Start Navigation', locale)}>
                {t('Start Navigation', locale)} ({wpWaypoints.length} {t('waypoints', locale)})
              </button>
              {wpWaypoints.length > 0 && (
                <button onClick={() => useWaypointStore.getState().clearWaypoints()} className="w-full text-xs bg-red-700 hover:bg-red-800 text-white px-3 py-1.5 rounded">
                  {t('Clear All Waypoints', locale)}
                </button>
              )}
            </>
          )}
          <div className="border-t border-gray-700 pt-2 space-y-1">
            <div className="text-xs text-gray-300 font-medium">{t('Map Labels', locale)}</div>
            <div className="text-xs text-gray-500">{t('Double-click map to add label', locale)}</div>
            {labels.length > 0 && (
              <div className="max-h-24 overflow-y-auto space-y-0.5">
                {labels.map((l) => (
                  <div key={l.id} className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-700/50">
                    <span className="text-gray-300 flex-1 truncate">{l.text}</span>
                    <button onClick={() => useLabelStore.getState().removeLabel(l.id)} className="text-red-400 hover:text-red-300 px-0.5" aria-label="Remove label">✕</button>
                  </div>
                ))}
              </div>
            )}
            {labels.length > 0 && (
              <button onClick={() => useLabelStore.getState().clearAll()} className="w-full text-[10px] bg-red-700/60 hover:bg-red-600/60 text-red-200 px-1.5 py-1 rounded">
                {t('Clear All Labels', locale)}
              </button>
            )}
          </div>
        </>
      )}
      {mode === 'mapedit' && isMock && (
        <>
          <div className="text-xs text-gray-400">{t('Edit the map by drawing walls and obstacles.', locale)}</div>
          <div className="space-y-1">
            {mapTools.map((mt) => (
              <button key={mt.key} onClick={() => useMapEditorStore.getState().setTool(mt.key)} className={`w-full text-left text-xs px-2 py-1.5 rounded ${editTool === mt.key ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`} aria-label={mt.label}>
                <span className="font-medium">{mt.label}</span>
                <span className="ml-1 text-gray-400">- {mt.desc}</span>
              </button>
            ))}
          </div>
          {(editTool === 'wall' || editTool === 'erase') && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{t('Brush:', locale)}</span>
              <input type="range" min={1} max={15} value={brushSize} onChange={(e) => useMapEditorStore.getState().setBrushSize(Number(e.target.value))} className="flex-1 h-1 accent-blue-500" aria-label="Brush size" />
              <span className="text-xs text-gray-300 w-4 text-right">{brushSize}</span>
            </div>
          )}
          <button onClick={mockResetMap} className="w-full text-xs bg-yellow-700 hover:bg-yellow-800 text-white px-3 py-1.5 rounded">{t('Reset Default Map', locale)}</button>
          <button onClick={mockClearMap} className="w-full text-xs bg-red-700 hover:bg-red-800 text-white px-3 py-1.5 rounded">{t('Clear All Walls', locale)}</button>
        </>
      )}
      {mode === 'hrz' && (
        <>
          <div className="text-xs text-gray-400">
            {t('Left-click to add vertices. Click the first vertex (yellow) to close. Hold Shift to snap to 0.5m grid.', locale)}
          </div>
          {hrzZones.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-0.5">
              {hrzZones.map((z) => (
                <div key={z.id} className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-700/50">
                  <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: ZONE_COLORS[z.zoneType] }} />
                  <div className="flex gap-1 flex-1">
                    {(['forbidden', 'slow', 'charging'] as ZoneType[]).map((zt) => (
                      <button key={zt} type="button" onMouseDown={(e) => { e.stopPropagation(); useUndoStore.getState().pushUndo(); useHRZStore.getState().setZoneType(z.id, zt); }} className={`flex-1 text-[10px] px-1 py-0.5 rounded cursor-pointer select-none ${z.zoneType === zt ? 'ring-2 ring-white font-bold' : 'opacity-50 hover:opacity-90'}`} style={{ backgroundColor: ZONE_COLORS[zt] + 'cc', color: '#fff' }} aria-label={t(zt, locale)} aria-pressed={z.zoneType === zt}>
                        {t(zt, locale)}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => { useUndoStore.getState().pushUndo(); useHRZStore.getState().removeZone(z.id); }} className="text-red-400 hover:text-red-300 px-0.5" aria-label="Remove zone">✕</button>
                </div>
              ))}
            </div>
          )}
          <button onClick={handlePublishHRZ} disabled={!canPublish || hrzZones.length === 0} className="w-full text-xs bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded" aria-label={isMock ? t('Apply Zones to Map', locale) : t('Publish HRZ Zones', locale)}>
            {isMock ? t('Apply Zones to Map', locale) : t('Publish HRZ Zones', locale)} ({hrzZones.length})
          </button>
          <button onClick={() => useHRZStore.getState().cancelDrawing()} className="w-full text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded">{t('Cancel Drawing', locale)}</button>
          <button onClick={() => { useUndoStore.getState().pushUndo(); useHRZStore.getState().clearAll(); }} className="w-full text-xs bg-red-700 hover:bg-red-800 text-white px-3 py-1.5 rounded">{t('Clear All Zones', locale)}</button>
          <div className="text-xs text-gray-500">
            {t('Zones:', locale)} {hrzZones.length} | {t('Drawing:', locale)} {hrzCurrentVertices.length} {t('pts', locale)}
          </div>
        </>
      )}
      {mode === 'hrp' && (
        <>
          <div className="text-xs text-gray-400">
            {isMock
              ? t('Draw a path by clicking & dragging. Robot will follow with obstacle avoidance. Hold Shift to snap to 0.5m grid.', locale)
              : t('Draw a path by clicking & dragging, then publish to ROS. Hold Shift to snap to 0.5m grid.', locale)}
          </div>
          {hrpPath.length >= 2 && (
            <div className="space-y-1.5">
              <div className="text-xs text-gray-300 font-medium">{t('Segment Speeds', locale)}</div>
              <div className="text-xs text-gray-500">{t('Click segment on map or below to cycle speed. Yellow=slow → Green=fast.', locale)}</div>
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {hrpSegmentSpeeds.map((speed, i) => (
                  <div key={i} className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${hrpSelectedSegment === i ? 'bg-blue-600/40 ring-1 ring-blue-400' : 'bg-gray-700/50'}`}>
                    <span className="text-gray-300 w-14 shrink-0">{t('Seg', locale)} {i + 1}</span>
                    <input type="range" min={0} max={SPEED_LEVELS.length - 1} value={SPEED_LEVELS.indexOf(speed as any) === -1 ? 4 : SPEED_LEVELS.indexOf(speed as any)} onChange={(e) => useHRPStore.getState().setSegmentSpeed(i, SPEED_LEVELS[Number(e.target.value)])} className="flex-1 h-1 accent-green-500" aria-label={`Segment ${i + 1} speed`} />
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 min-w-[52px] text-center" style={{ backgroundColor: (hrpBlockedSegments[i] ? '#dc2626' : speedToColor(speed)) + 'cc', color: '#fff' }}>
                      {hrpBlockedSegments[i] ? t('BLOCKED', locale) : `${speed.toFixed(1)} m/s`}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-1">
                <button onClick={() => hrpSegmentSpeeds.forEach((_, i) => useHRPStore.getState().setSegmentSpeed(i, SPEED_LEVELS[SPEED_LEVELS.length - 1]))} className="flex-1 text-[10px] bg-green-700/60 hover:bg-green-600/60 text-green-200 px-1.5 py-1 rounded">
                  {t('All', locale)} {SPEED_LEVELS[SPEED_LEVELS.length - 1]} m/s
                </button>
                <button onClick={() => hrpSegmentSpeeds.forEach((_, i) => useHRPStore.getState().setSegmentSpeed(i, SPEED_LEVELS[0]))} className="flex-1 text-[10px] bg-yellow-700/60 hover:bg-yellow-600/60 text-yellow-200 px-1.5 py-1 rounded">
                  {t('All', locale)} {SPEED_LEVELS[0]} m/s
                </button>
              </div>
            </div>
          )}
          <button onClick={handleCheckPath} disabled={hrpPath.length < 2} className="w-full text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded">
            {t('Check Path', locale)} ({hrpPath.length} {t('pts', locale)})
          </button>
          {hrpBlockedSegments.length > 0 && (
            <div className="text-xs">
              {hrpBlockedSegments.some((b) => b) ? (
                <span className="text-red-400">{t('Blocked segments:', locale)} {hrpBlockedSegments.map((b, i) => b ? i + 1 : null).filter(Boolean).join(', ')}</span>
              ) : (
                <span className="text-green-400">{t('All segments reachable', locale)}</span>
              )}
            </div>
          )}
          <button onClick={handlePublishHRP} disabled={!canPublish || hrpPath.length < 2} className="w-full text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded">
            {isMock ? t('Follow Drawn Path', locale) : t('Publish HRP Path', locale)} ({hrpPath.length} {t('pts', locale)})
          </button>
          <button onClick={() => { useUndoStore.getState().pushUndo(); useHRPStore.getState().clearPath(); }} className="w-full text-xs bg-red-700 hover:bg-red-800 text-white px-3 py-1.5 rounded">{t('Clear Path', locale)}</button>
          <div className="text-xs text-gray-500">{t('Points:', locale)} {hrpPath.length} | {t('Segments:', locale)} {hrpSegmentSpeeds.length}</div>
          {hrpPath.length >= 2 && (
            <div className="space-y-1">
              <button onClick={handleAutoSpeed} className="w-full text-[10px] bg-purple-700/60 hover:bg-purple-600/60 text-purple-200 px-1.5 py-1 rounded">{t('Auto Speed (Zone Match)', locale)}</button>
              <div className="text-xs text-gray-400">
                {t('Est. time:', locale)} <span className="text-cyan-400 font-mono">{calcEstTime()}</span>
                {' | '}{t('Total:', locale)} <span className="text-cyan-400 font-mono">{calcTotalDist().toFixed(1)}m</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function pointInPolygon(px: number, pz: number, vertices: { x: number; z: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, zi = vertices[i].z;
    const xj = vertices[j].x, zj = vertices[j].z;
    if (((zi > pz) !== (zj > pz)) && (px < (xj - xi) * (pz - zi) / (zj - zi) + xi)) inside = !inside;
  }
  return inside;
}
