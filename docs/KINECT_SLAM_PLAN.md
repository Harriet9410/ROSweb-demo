# Kinect 连接建图方案

## 概述

将 Azure Kinect DK 深度相机接入 WebRop 平台，实现实时 2D 建图。Kinect 扫描环境 → SLAM 生成 OccupancyGrid → WebRop 前端实时显示地图。

**硬件**：Azure Kinect DK + 电脑（无移动机器人）
**SLAM**：gmapping（2D 粒子滤波）
**里程计**：rf2o_laser_odometry（扫描匹配，替代轮式里程计）

## 架构

```
Azure Kinect DK (USB 3.0)
    ↓
Azure_Kinect_ROS_Driver
    ├─ /camera/depth/image_raw
    ├─ /camera/rgb/image_raw
    └─ /camera/imu
         ↓
    depthimage_to_laserscan → /scan
         ↓
    rf2o_laser_odometry → /tf (odom→base_link)
         ↓
    gmapping → /map (OccupancyGrid)
         ↓
    rosbridge_server (ws://localhost:9090)
         ↓ WebSocket
    WebRop 前端（现有 /map 订阅，零改动）
```

## Step 1：安装依赖

```bash
# ROS 1 Noetic（假设已安装）

# Azure Kinect DK 驱动
sudo apt install k4a-tools libk4a1.4-dev

# Azure Kinect ROS 驱动
cd ~/catkin_ws/src
git clone https://github.com/microsoft/Azure_Kinect_ROS_Driver.git

# depthimage_to_laserscan
sudo apt install ros-noetic-depthimage-to-laserscan

# rf2o_laser_odometry（扫描匹配里程计，无需轮式里程计）
git clone https://github.com/MAPIRlab/rf2o_laser_odometry.git

# gmapping
sudo apt install ros-noetic-gmapping

# rosbridge
sudo apt install ros-noetic-rosbridge-suite

# 编译
cd ~/catkin_ws
catkin_make
source devel/setup.bash
```

## Step 2：创建启动文件

在 `ros1_bridge/launch/` 下新建 `kinect_slam.launch`：

```xml
<launch>
  <!-- 1. Azure Kinect DK 驱动 -->
  <include file="$(find azure_kinect_ros_driver)/launch/driver.launch">
    <arg name="depth_mode" value="NFOV_UNBINNED"/>
    <arg name="color_resolution" value="720P"/>
    <arg name="fps" value="15"/>
  </include>

  <!-- 2. 深度图转 LaserScan -->
  <node pkg="depthimage_to_laserscan" type="depthimage_to_laserscan"
        name="depth_to_laser" output="screen">
    <remap from="image" to="/camera/depth/image_raw"/>
    <remap from="camera_info" to="/camera/depth/camera_info"/>
    <param name="range_min" value="0.45"/>
    <param name="range_max" value="8.0"/>
    <param name="scan_height" value="20"/>
    <param name="output_frame_id" value="camera_depth_frame"/>
  </node>

  <!-- 3. 扫描匹配里程计（替代轮式里程计） -->
  <node pkg="rf2o_laser_odometry" type="rf2o_laser_odometry_node"
        name="rf2o_laser_odometry" output="screen">
    <param name="laser_scan_topic" value="/scan"/>
    <param name="odom_topic" value="/rf2o_odom"/>
    <param name="base_frame_id" value="camera_link"/>
    <param name="odom_frame_id" value="odom"/>
    <param name="freq" value="15"/>
  </node>

  <!-- 4. 静态 TF：base_link → camera_link -->
  <node pkg="tf" type="static_transform_publisher" name="base_to_camera"
        args="0 0 0.5 0 0 0 base_link camera_link 100"/>

  <!-- 5. gmapping SLAM -->
  <node pkg="gmapping" type="slam_gmapping" name="gmapping" output="screen">
    <param name="base_frame" value="base_link"/>
    <param name="odom_frame" value="odom"/>
    <param name="map_frame" value="map"/>
    <param name="delta" value="0.3"/>
    <param name="linearUpdate" value="0.2"/>
    <param name="angularUpdate" value="0.15"/>
    <param name="maxUrange" value="8.0"/>
    <param name="xmin" value="-10"/>
    <param name="ymin" value="-10"/>
    <param name="xmax" value="10"/>
    <param name="ymax" value="10"/>
    <param name="resolution" value="0.05"/>
  </node>

  <!-- 6. rosbridge_server -->
  <node pkg="rosbridge_server" type="rosbridge_websocket"
        name="rosbridge_websocket" output="screen">
    <param name="port" value="9090"/>
  </node>
</launch>
```

## Step 3：运行建图

```bash
# 终端 1：启动所有节点
roslaunch webrop kinect_slam.launch

# 终端 2：启动 WebRop 前端
cd D:\mrrep-web
npm run dev
```

## Step 4：前端连接

1. 浏览器打开 `http://localhost:3000`
2. 在 Sidebar 的 ROS 连接面板输入 `ws://<ROS电脑IP>:9090`
3. 点击 Connect
4. gmapping 发布的 `/map` 会自动推送到前端，`MapFloor.tsx` 实时渲染

**前端代码改动：零** — `src/ros/connection.ts` 已完整实现 `/map`（OccupancyGrid）的订阅和渲染链。

## 手持建图注意事项

| 问题 | 解决方案 |
|------|----------|
| 手持抖动导致里程计漂移 | 移动速度 ≤0.5m/s，缓慢平滑移动 |
| gmapping 粒子发散 | 减小粒子数 `<param name="particles" value="15"/>` |
| 扫描匹配在长走廊失效 | 尽量在有特征的区域（墙角、家具旁）建图 |
| Azure Kinect USB 带宽不足 | 使用 USB 3.0 口，避免使用集线器 |
| 地图旋转/漂移 | 定期回环到起点，让 SLAM 闭环修正 |

## 进阶方案

### 方案 A：换用 RTAB-Map（推荐手持场景）

RTAB-Map 自带 RGBD 视觉里程计，对手持场景更鲁棒，仍输出 2D `/map`：

```bash
sudo apt install ros-noetic-rtabmap-ros
```

```xml
<node pkg="rtabmap_ros" type="rtabmap" name="rtabmap" output="screen">
  <param name="frame_id" value="camera_link"/>
  <param name="odom_frame_id" value="odom"/>
  <param name="rgb_topic" value="/camera/rgb/image_raw"/>
  <param name="depth_topic" value="/camera/depth/image_raw"/>
  <param name="camera_info_topic" value="/camera/rgb/camera_info"/>
  <param name="scan_topic" value="/scan"/>
  <param name="visual_odometry" value="true"/>
  <param name="approx_sync" value="true"/>
</node>
```

### 方案 B：IMU 融合里程计

用 `robot_localization` 融合 Azure Kinect 的 IMU + rf2o 里程计，提升手持稳定性：

```xml
<node pkg="robot_localization" type="ekf_localization_node" name="ekf">
  <param name="frequency" value="30"/>
  <param name="sensor0" value="/rf2o_odom"/>
  <param name="sensor1" value="/camera/imu"/>
  <param name="odom0" value="/rf2o_odom"/>
  <param name="imu0" value="/camera/imu"/>
</node>
```

### 方案 C：离线建图

先录制 bag 再离线跑 SLAM，可调参数反复优化：

```bash
# 录制
rosbag record /camera/depth/image_raw /camera/rgb/image_raw /camera/imu /camera/depth/camera_info /camera/rgb/camera_info -O kinect_scan

# 回放建图
rosbag play kinect_scan.bag --clock
```

### 方案 D：点云 3D 可视化（第二阶段）

在 WebRop 3D 场景中实时渲染 Kinect 点云，需新增以下模块：

| 模块 | 文件 | 改动 |
|------|------|------|
| ROS 类型 | `src/ros/types.ts` | 新增 `RosMsg_PointCloud2` 接口 |
| ROS 连接 | `src/ros/connection.ts` | 新增 `/point_cloud` topic 订阅 |
| Store | `src/stores/pointCloudStore.ts`（新建） | 点云数据、降采样参数 |
| 3D 组件 | `src/components/scene/PointCloudViewer.tsx`（新建） | `THREE.Points` + `BufferGeometry` 渲染 |
| 场景 | `src/components/scene/Scene3D.tsx` | 挂载 `<PointCloudViewer />` |

关键点：Kinect 点云每帧约 30 万点，需降采样至约 5 万点才能流畅渲染（体素滤波或随机采样）。点云 frame_id 需通过 TF 树变换到 map frame。

### 方案 E：语义建图（第三阶段）

点云 + RGB → 物体识别 → 语义 costmap → 自动禁区标注。详见 `FEATURE_DESIGN.md` 中"点云大模型 + MRReP/MRHaD 拓展设计"章节。
