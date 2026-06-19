# AGENTS.md — AI Agent Guide for WebRop

This file helps AI coding assistants (Claude, Copilot, etc.) understand the WebRop project architecture, coding conventions, and design patterns before making changes.

## Project Overview

WebRop is a web-based robot navigation editing and control platform. Users draw reference paths and restricted zones in a 3D scene, and robots navigate according to the marked constraints.

The project reproduces the core functionality of two academic papers as a web-based interface:

- **MRHaD**: Kosaka, A., et al., "MRHaD: Mixed Reality-based Hand-drawn Restricted Zone Editing Interface for Mobile Robot Navigation," arXiv:2504.00580, 2025. [论文链接](https://arxiv.org/abs/2504.00580)
  - Reproduced: HRZ polygon drawing on map, zone → costmap update pipeline
- **MRReP**: Kosaka, A., et al., "MRReP: Mixed Reality-based Hand-drawn Reference Path Editing Interface for Mobile Robot Navigation," arXiv:2604.00059, 2025. [论文链接](https://arxiv.org/abs/2604.00059)
  - Reproduced: HRP freehand path drawing, robot-to-path connection, path → global planner pipeline

Additional features beyond the papers: fleet management, multi-waypoint navigation, offline mock mode, 3D labels, inflation overlay, mini-map, scene snapshots, WASD teleop, i18n.

### Paper → Web Concept Mapping

| 论文概念 | 原文实现（HoloLens + Unity） | Web 实现 |
|----------|------------------------------|----------|
| HRZ 禁区绘制 | HoloLens 手势 + 空间锚点 | 鼠标点击顶点 → 闭合多边形 |
| HRZ 禁区类型 | 无分级（全部禁止） | 三级：Forbidden / Slow / Charging |
| HRZ → costmap | Unity 插件直写 | hrz_costmap_node.py / Mock 内存写入 |
| HRP 路径绘制 | HoloLens 手势 + 地面投射 | 鼠标拖拽绘制 |
| HRP 路径速度 | 无速度标注 | 13 档分段速度 + 自动匹配 HRZ 区域 |
| HRP → 全局规划 | Unity 插件直写 | hrp_planner_node.py / Mock A* 跟随 |
| 机器人导航 | move_base（ROS 1） | move_base（ROS 1） / Mock A* 模拟 |
| 场景感知 | HoloLens Spatial Mapping | OccupancyGrid 订阅 / Mock 生成 |

## Tech Stack

| Category | Technology |
|----------|-----------|
| Frontend | React 18 + TypeScript 6 |
| 3D Rendering | Three.js 0.184 + @react-three/fiber 8 + @react-three/drei 9 |
| State Management | Zustand 5 |
| Styling | Tailwind CSS 4 |
| Build | Vite 8 |
| ROS Bridge | roslib 2 (WebSocket to rosbridge_server) |
| Backend (ROS) | Python 3 (ros1_bridge/ — catkin package) |

## Project Structure

```
WebRop/
├── src/
│   ├── components/
│   │   ├── editor/          # HRZPolygon, HRZEditor3D, HRPEditor3D
│   │   ├── layout/          # Sidebar, StatusBar
│   │   ├── ros/             # ROSConnection
│   │   ├── scene/           # Scene3D, RobotModel, MapFloor, CameraControls, MiniMap, NavPathVisual, InflationOverlay, MapLabels3D, MapEditPreview, BreadcrumbTrail
│   │   └── ui/              # ModeSelector, ActionPanel, SnapshotPanel, ToastOverlay
│   ├── stores/              # Zustand stores (17 stores)
│   │   ├── rosStore.ts      # Connection status, mock flag, edit mode
│   │   ├── mapStore.ts      # Occupancy grid data
│   │   ├── hrzStore.ts      # HRZ zones (polygons, types, drawing state)
│   │   ├── hrpStore.ts      # HRP path (points, per-segment speeds, drawing state)
│   │   ├── robotPoseStore.ts # Robot position + orientation
│   │   ├── waypointStore.ts # Navigation waypoints
│   │   ├── navTargetStore.ts# Navigation target + planned path
│   │   ├── navPlanStore.ts  # move_base plan (from ROS)
│   │   ├── fleetStore.ts    # Multi-robot fleet, formations
│   │   ├── mapEditorStore.ts# Map edit tool state
│   │   ├── cameraStore.ts   # Camera position & target (for snapshots)
│   │   ├── dragStore.ts     # Vertex drag state
│   │   ├── teleopStore.ts   # WASD teleop
│   │   ├── trailStore.ts    # Breadcrumb trail
│   │   ├── undoStore.ts     # Undo/redo for HRZ + HRP
│   │   ├── toastStore.ts    # Toast notifications
│   │   ├── inflationStore.ts# Inflation overlay toggle
│   │   ├── labelStore.ts    # 3D map labels
│   │   ├── poseSyncStore.ts # Multi-robot pose sync
│   │   ├── snapshotStore.ts # Scene snapshots
│   │   └── a11yStore.ts     # Locale, high-contrast
│   ├── ros/
│   │   ├── connection.ts    # roslib wrapper (connect, subscribe, publish)
│   │   ├── mock.ts          # Offline mock mode (A*, robot simulation, map editing)
│   │   └── types.ts         # ROS message type interfaces
│   ├── utils/
│   │   ├── coordinate.ts    # Scene↔ROS coordinate transforms
│   │   ├── mapRenderer.ts   # OccupancyGrid → CanvasTexture
│   │   ├── pathCheck.ts     # Path reachability (Bresenham collision)
│   │   └── persistence.ts   # localStorage save/load
│   └── i18n/
│       └── index.ts         # EN / zh / ja translations
├── ros1_bridge/             # ROS 1 catkin package
│   ├── launch/              # web_bridge.launch
│   └── scripts/             # hrz_costmap_node.py, hrp_planner_node.py
└── docs/                    # Papers, design docs, usage guide
```

## Architecture & Design Patterns

### 1. State Management — Zustand with standalone stores

- Each store is a separate module file.
- Components subscribe via `useStore(s => s.field)`.
- Outside React (ROS callbacks, event handlers), access via `useStore.getState()`.
- All stores store **scene coordinates** (3D x, z). Conversion to ROS coordinates happens at publish time via `sceneToRos()`.

### 2. 3D Interaction — Canvas native events + manual raycasting

- Uses Canvas native `pointerdown/move/up` events, NOT R3F mesh events.
- `Scene3D.tsx` contains a centralized event handler that dispatches based on current mode.
- Manual raycasting to y=0 ground plane via `Raycaster` + ground plane intersection.
- This avoids event blocking by 3D objects covering the ground.

### 3. Camera Controls

- **Right-click** = rotate, **Middle-click/scroll-drag** = pan, **Scroll wheel** = zoom
- **Left-click** reserved for business logic (place vertex, draw path, set waypoint, paint map)
- Camera presets: Top-down, Side, 45-degree perspective (animated cubic ease)
- Follow-robot mode via lerp to robot position

### 4. Mode-Driven UI

Current mode (`rosStore.editMode`) determines:
- What pointer events do (navigate / mapedit / hrz / hrp)
- What action panel shows
- What 3D overlays appear
- Available keyboard shortcuts

### 5. Dual-Mode Operation

Every action checks `isMock` (in rosStore) to route to either:
- **Mock functions** (mock.ts) — offline simulation with A*, robot motion, map editing
- **Real ROS publish calls** (connection.ts) — publish to rosbridge topics

### 6. Undo/Redo

- Captures snapshots of HRZ zones + HRP path state
- Max 50 history entries
- Ctrl+Z / Ctrl+Y keyboard shortcuts
- Implemented via Zustand `set()` with current state snapshot

### 7. HRZ Zone Editor

- Click to place vertices, yellow sphere at first vertex for close affordance
- Click within 0.3m of first vertex to close polygon (3+ vertices required)
- Three zone types: forbidden (red), slow (yellow), charging (green)
- Vertices draggable after polygon is closed
- Zone rendering: ShapeGeometry with DoubleSide material + outline line

### 8. HRP Path Editor

- Click-drag to draw path (0.1m minimum point spacing)
- Per-segment speed control (13 levels: 0.05–2.0 m/s)
- Speed color gradient on segments (yellow=slow → green=fast)
- Right-click to insert point on segment
- Dashed connector line from robot to first path point (green if ≤1m, red if >1m)
- Path reachability check via Bresenham line collision against inflated grid

### 9. ROS Communication

- **Subscribe**: `/map` (OccupancyGrid), `/odom` (Odometry), `/move_base/NavfnROS/plan` (Path)
- **Publish**: `/move_base_simple/goal`, `/cmd_vel`, `/waypoint_goals`, `/hrz_zones`, `/hrp_path`, `/hrp_speeds`
- Coordinate transform: `sceneToRos(px, pz)` = `originX + px * resolution` (and vice versa)

### 10. Mock Mode

- 500x500 grid (0.02m resolution), wall obstacles
- A* pathfinding with 8-directional neighbors, inflation-layer collision, line-of-sight smoothing
- Robot motion: differential drive, max 0.5 m/s linear, 2.0 rad/s angular
- Event log system with subscriber pattern

## Common Tasks

### Adding a new store
1. Create file in `src/stores/` using Zustand `create` + `StateCreator`
2. Export the hook as `useXxxStore`
3. Add to type exports if needed

### Adding a new 3D component
1. Create in `src/components/scene/` (or `editor/` for editor-specific)
2. Use R3F primitives (`<mesh>`, `<line>`, `<sprite>`) within R3F `<Canvas>` context
3. Access store via zustand hooks
4. For pointer interaction, add logic in `Scene3D.tsx`'s centralized event handler

### Adding a new ROS topic
1. Add message type interface in `src/ros/types.ts`
2. Add subscribe/publish function in `src/ros/connection.ts`
3. If needed in mock mode, add simulation logic in `src/ros/mock.ts`

### Adding a translation
1. Add key-value pair in `src/i18n/index.ts` for all three locales (en/zh/ja)
2. Call `t('key', locale)` in components
3. The key itself IS the English string

## Naming Conventions

- **Files**: camelCase for TS/TSX files (`robotModel.tsx`, `mapRenderer.ts`)
- **Components**: PascalCase (`HRZPolygon`, `RobotModel`)
- **Stores**: camelCase + Store suffix (`hrzStore`, `useHRZStore`)
- **Functions**: camelCase (`sceneToRos`, `publishNavGoal`)
- **Types**: PascalCase (`HRZone`, `Vec2`)
- **CSS**: Tailwind utility classes (no custom CSS files)

## References

- Kosaka, A., et al., "MRHaD: Mixed Reality-based Hand-drawn Restricted Zone Editing Interface for Mobile Robot Navigation," arXiv:2504.00580, 2025. https://arxiv.org/abs/2504.00580
- Kosaka, A., et al., "MRReP: Mixed Reality-based Hand-drawn Reference Path Editing Interface for Mobile Robot Navigation," arXiv:2604.00059, 2025. https://arxiv.org/abs/2604.00059
