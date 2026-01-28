# Byte Fisher 角色精灵图规格说明

## 🎨 总体设计原则

- **像素风格**: 所有精灵图应遵循像素艺术风格，低分辨率、清晰的边缘
- **基础单位**: 1个游戏像素 = 4个实际像素（在scale=1时）
- **透明背景**: 所有精灵图使用PNG格式，带Alpha通道
- **颜色方案**: 赛博朋克主题 - 霓虹绿(#39ff14)、粉(#ff00ff)、青(#00f3ff)、黄(#fdfd00)

## 📐 角色骨架尺寸

### 基础尺寸（游戏像素）
- **角色总高度**: 约 96 像素（从头顶到脚底）
- **角色总宽度**: 约 48 像素（肩膀最宽处）
- **锚点**: 胸部中心 (0, 0)

### 坐标系统
```
        头部 (0, -32)
          |
          |
    躯干中心 (0, 0) ← 锚点
          |
          |
        腿部 (0, 32)
          |
        靴子 (0, 56)
```

---

## 🧩 各部件精灵图规格

### 1. 头部 (Head)
- **尺寸**: 24x24 游戏像素 (96x96 实际像素)
- **位置**: 相对中心 (0, -32)
- **锚点**: 中心 (0.5, 0.5)
- **图层**: 5
- **包含元素**:
  - 基础头型
  - 眼睛
  - 嘴巴
  - 耳朵（可选）
- **文件命名**: `head_base.png`

### 2. 头部装备 (Headgear) - 5级系统

#### Level 1: 基础帽子
- **尺寸**: 32x8 游戏像素
- **位置**: 相对中心 (0, -40)
- **特征**: 简单棒球帽，深色
- **文件**: `headgear_lv1_cap.png`

#### Level 2: VR护目镜
- **尺寸**: 28x8 游戏像素
- **特征**: 红色护目镜，科技感
- **文件**: `headgear_lv2_vr.png`

#### Level 3: 金色护目镜
- **尺寸**: 28x8 游戏像素
- **特征**: 金色，带反光效果
- **需要**: 发光效果 (glowColor: #ffd700)
- **文件**: `headgear_lv3_golden.png`

#### Level 4: 赛博眼镜
- **尺寸**: 28x8 游戏像素
- **特征**: 黑框，绿色LED指示灯
- **需要**: 发光效果 (glowColor: #0f0)
- **文件**: `headgear_lv4_cyber.png`

#### Level 5: 全息光环
- **尺寸**: 48x32 游戏像素（包含光环）
- **特征**: 头顶悬浮金色光环，粒子效果
- **需要**:
  - 强发光效果 (glowColor: #fdfd00, intensity: 1.5)
  - 粒子轨迹
- **动画帧**: 4帧旋转动画（可选）
- **文件**: `headgear_lv5_halo.png` 或 `headgear_lv5_halo_sheet.png` (4x32x32)

---

### 3. 躯干 (Torso)
- **尺寸**: 32x40 游戏像素
- **位置**: 相对中心 (0, 24)
- **图层**: 4
- **包含**: 外套/夹克
- **文件**: `torso_jacket.png`

#### 躯干装饰 (Torso Detail)
- **尺寸**: 16x32 游戏像素
- **特征**: 内衣/T恤，霓虹绿色
- **文件**: `torso_shirt.png`

---

### 4. 腿部 (Legs)

#### 大腿 (Upper Legs)
- **尺寸**: 12x24 游戏像素（每条腿）
- **位置**: 左腿 (-8, 32), 右腿 (4, 32)
- **文件**: `leg_upper.png`

#### 小腿 (Lower Legs)
- **尺寸**: 12x24 游戏像素
- **位置**: 左 (-8, 48), 右 (4, 48)
- **文件**: `leg_lower.png`

---

### 5. 靴子 (Boots) - 5级系统

#### Level 1: 基础鞋
- **尺寸**: 32x8 游戏像素（两只脚合并）
- **位置**: (0, 56)
- **特征**: 简单黑色鞋子
- **文件**: `boots_lv1_basic.png`

#### Level 2: 重型靴
- **尺寸**: 32x16 游戏像素
- **特征**: 厚底靴，灰色，金属装饰
- **文件**: `boots_lv2_heavy.png`

#### Level 3: 活塞靴
- **尺寸**: 48x24 游戏像素
- **特征**: 机械活塞杆
- **需要**: 中等发光 (glowColor: #777, intensity: 0.8)
- **文件**: `boots_lv3_piston.png`

#### Level 4: 喷射靴
- **尺寸**: 48x24 游戏像素 + 火焰层
- **特征**: 白色靴体，底部喷射口
- **需要**:
  - 强发光 (glowColor: #ff6600, intensity: 1.2)
  - 火焰粒子效果
- **动画帧**: 3帧火焰动画
- **文件**:
  - `boots_lv4_jet.png`（靴子本体）
  - `boots_lv4_jet_flame_sheet.png`（3x24x8 火焰动画）

#### Level 5: 反重力靴
- **尺寸**: 72x24 游戏像素（包含平台）
- **特征**: 悬浮平台，青色能量线
- **需要**:
  - 极强发光 (glowColor: #00f3ff, intensity: 1.5)
  - 粒子轨迹
- **动画**: 轻微上下浮动
- **文件**: `boots_lv5_antigrav.png`

---

### 6. 背包装备 (Backpack) - 5级系统

#### Level 1: 无装备
（不显示）

#### Level 2: 基础背包
- **尺寸**: 8x24 游戏像素
- **位置**: (-24, 6)
- **特征**: 简单矩形背包
- **文件**: `backpack_lv2_basic.png`

#### Level 3: 天线背包
- **尺寸**: 8x24 游戏像素 + 16x40 天线
- **特征**: 背包 + 竖直天线，顶部红色LED
- **需要**: LED闪烁效果
- **动画帧**: 2帧LED开关
- **文件**: `backpack_lv3_antenna.png`

#### Level 4: 卫星碟
- **尺寸**: 24x32 游戏像素
- **特征**: 碟形天线，发射绿色信号波
- **需要**: 发光 + 信号波动画
- **动画帧**: 3帧信号波
- **文件**: `backpack_lv4_dish.png`

#### Level 5: 悬浮无人机
- **尺寸**: 16x8 游戏像素（无人机本体）
- **位置**: 动态（围绕角色悬浮）
- **特征**: 小型四旋翼，扫描光束
- **需要**:
  - 发光 (glowColor: #00f3ff, intensity: 1.5)
  - 粒子轨迹
  - 扫描光束效果
- **动画**: 正弦波运动路径
- **文件**: `backpack_lv5_drone.png`

---

### 7. 钓竿 (Fishing Rod) - 5级系统

#### Level 1: 竹竿
- **渲染方式**: 线条绘制
- **颜色**: #8b5a2b
- **线宽**: 3 游戏像素

#### Level 2: 钢竿
- **颜色**: #aaa
- **线宽**: 4 游戏像素

#### Level 3: 霓虹竿
- **颜色**: 动态彩虹色 `hsl(time*50, 100%, 50%)`
- **线宽**: 3 游戏像素
- **需要**: 发光 + 粒子轨迹

#### Level 4: 等离子竿
- **颜色**: #ff00ff
- **线宽**: 4 游戏像素
- **需要**: 强发光 + 等离子粒子
- **特效**: 竿身闪电效果（可选精灵叠加）

#### Level 5: 量子竿
- **颜色**: #fff
- **线宽**: 3 游戏像素
- **样式**: 虚线 [5, 5]
- **需要**:
  - 极强发光 (glowColor: #00f3ff)
  - 量子粒子
  - 竿尖发光球
- **特效**: 相位闪烁效果
- **可选精灵**: `rod_lv5_quantum_tip.png` (8x8) 竿尖发光球

#### 卷线器 (Reel) - Level 2+
- **尺寸**: 20x20 游戏像素
- **位置**: 竿根部往前 10 像素
- **文件**: `rod_reel.png`

---

### 8. 手臂和手 (Arms & Hands)

#### 上臂 (Upper Arm)
- **尺寸**: 12x20 游戏像素
- **渲染**: 线条绘制
- **锚点**: 顶端 (0.5, 0)

#### 下臂 (Forearm)
- **尺寸**: 12x20 游戏像素

#### 手 (Hand)
- **尺寸**: 12x12 游戏像素
- **特征**: 握竿姿势
- **文件**: `hand_holding.png`

---

## 📦 精灵图表组织（Sprite Sheet）

### 推荐格式：
对于需要多个状态或动画的部件，使用精灵图表：

```
格式: [部件名]_[等级]_sheet.png

示例: boots_lv4_jet_flame_sheet.png
布局: 横向排列
      [帧1][帧2][帧3]
      火焰动画 24x8 x 3帧 = 72x8 总尺寸
```

### 精灵图表索引：
```typescript
{
  "boots_lv4_flame": {
    "frames": 3,
    "frameWidth": 24,
    "frameHeight": 8,
    "fps": 12
  }
}
```

---

## 🎬 动画系统

### 支持的动画类型：

1. **序列帧动画** (Sprite Sheet)
   - 火焰效果
   - LED闪烁
   - 信号波

2. **程序化动画** (Procedural)
   - 悬浮（正弦波）
   - 旋转
   - 缩放脉冲

3. **粒子效果** (Particles)
   - 轨迹粒子
   - 火焰粒子
   - 能量粒子

### 动画时间轴：
```javascript
time = performance.now() / 1000; // 秒
frame = Math.floor((time * fps) % totalFrames);
```

---

## 📂 文件组织结构

推荐的资源目录结构：

```
src/assets/sprites/character/
├── base/
│   ├── head_base.png
│   ├── torso_jacket.png
│   ├── torso_shirt.png
│   ├── leg_upper.png
│   ├── leg_lower.png
│   └── hand_holding.png
│
├── headgear/
│   ├── headgear_lv1_cap.png
│   ├── headgear_lv2_vr.png
│   ├── headgear_lv3_golden.png
│   ├── headgear_lv4_cyber.png
│   └── headgear_lv5_halo.png
│
├── boots/
│   ├── boots_lv1_basic.png
│   ├── boots_lv2_heavy.png
│   ├── boots_lv3_piston.png
│   ├── boots_lv4_jet.png
│   ├── boots_lv4_jet_flame_sheet.png
│   └── boots_lv5_antigrav.png
│
├── backpack/
│   ├── backpack_lv2_basic.png
│   ├── backpack_lv3_antenna.png
│   ├── backpack_lv4_dish.png
│   └── backpack_lv5_drone.png
│
└── rod/
    ├── rod_reel.png
    └── rod_lv5_quantum_tip.png
```

---

## 🔧 使用精灵图替换像素绘制

### 步骤：

1. **加载精灵图**:
```typescript
const spriteManager = new SpriteManager();
await spriteManager.loadSprites({
  'head_base': '/assets/sprites/character/base/head_base.png',
  'boots_lv5': '/assets/sprites/character/boots/boots_lv5_antigrav.png'
});
```

2. **应用到部件**:
```typescript
skeleton.parts.head.image = spriteManager.getSprite('head_base');
skeleton.parts.head.sx = 0;
skeleton.parts.head.sy = 0;
skeleton.parts.head.sw = 96; // 24 * 4
skeleton.parts.head.sh = 96;
```

3. **渲染时自动选择**:
```typescript
// CharacterRenderer 会自动检测：
// - 如果有 image 属性，绘制精灵图
// - 否则调用 pixelArt 函数绘制像素艺术
```

---

## 🎨 调色板参考

### 基础颜色
- **皮肤**: #f0d0b0
- **外套**: #0a2a0a (深绿)
- **内衣**: #39ff14 (霓虹绿)
- **裤子**: #1a1a1a (深灰)

### 赛博朋克强调色
- **霓虹绿**: #39ff14
- **霓虹粉**: #ff00ff
- **霓虹青**: #00f3ff
- **霓虹黄**: #fdfd00

### 金属色
- **钢铁**: #aaa
- **铬**: #ccc
- **铜**: #b87333
- **金**: #ffd700

---

## 📝 制作建议

1. **使用像素艺术工具**: Aseprite, Pyxel Edit, GraphicsGale
2. **保持一致的像素比例**: 避免半像素
3. **使用有限调色板**: 每个部件不超过8-16种颜色
4. **添加轮廓**: 1像素深色轮廓增强清晰度
5. **考虑动画**: 预留足够空间避免裁切
6. **测试不同缩放**: 在0.5x, 1x, 2x下测试效果

---

## 🔗 替换流程

当你准备好精灵图后：

1. 将PNG文件放入对应目录
2. 在 `characterParts.ts` 中更新部件定义
3. 在游戏启动时加载精灵图
4. 刷新页面查看效果

无需修改绘制逻辑，渲染器会自动处理！

---

## 📧 技术支持

如有问题，请参考：
- `src/utils/characterParts.ts` - 部件定义
- `src/utils/characterRenderer.ts` - 渲染逻辑
- `src/components/VoidCanvas.tsx` - 集成示例
