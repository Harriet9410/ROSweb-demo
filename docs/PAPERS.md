# 参考文献

本项目的核心功能复现自以下两篇学术论文。原文基于 HoloLens + Unity 的 Mixed Reality 实现，本项目改为 Web 浏览器实现。

---

## MRHaD

**Kosaka, A., et al., "MRHaD: Mixed Reality-based Hand-drawn Restricted Zone Editing Interface for Mobile Robot Navigation"**

arXiv:2504.00580, 2025

- 论文链接: https://arxiv.org/abs/2504.00580
- PDF: https://arxiv.org/pdf/2504.00580

**核心贡献：** 用户通过 MR 手势在地图上绘制多边形限制区域（HRZ: Hand-drawn Restricted Zone），系统将 HRZ 区域写入 costmap，机器人导航时自动避开禁区。

**本项目复现内容：**
- HRZ 多边形绘制（Web 版改为鼠标点击顶点）
- HRZ 区域类型分级（Forbidden / Slow / Charging，原文无分级）
- HRZ → costmap 更新管线（hrz_costmap_node.py）

---

## MRReP

**Kosaka, A., et al., "MRReP: Mixed Reality-based Hand-drawn Reference Path Editing Interface for Mobile Robot Navigation"**

arXiv:2604.00059, 2025

- 论文链接: https://arxiv.org/abs/2604.00059
- PDF: https://arxiv.org/pdf/2604.00059

**核心贡献：** 用户在物理地面手绘参考路径（HRP: Hand-drawn Reference Path），系统将参考路径转换为全局导航路径，机器人按参考路径行驶。

**本项目复现内容：**
- HRP 自由绘制路径（Web 版改为鼠标拖拽）
- 分段速度标注（原文无速度标注）
- HRP → 全局规划器管线（hrp_planner_node.py）
- 路径可达性预检（Web 版扩展）

---

## BibTeX

```bibtex
@article{kosaka2025mrhad,
  title={MRHaD: Mixed Reality-based Hand-drawn Restricted Zone Editing Interface for Mobile Robot Navigation},
  author={Kosaka, Akihiro and others},
  journal={arXiv preprint arXiv:2504.00580},
  year={2025}
}

@article{kosaka2025mrrep,
  title={MRReP: Mixed Reality-based Hand-drawn Reference Path Editing Interface for Mobile Robot Navigation},
  author={Kosaka, Akihiro and others},
  journal={arXiv preprint arXiv:2604.00059},
  year={2025}
}
```
