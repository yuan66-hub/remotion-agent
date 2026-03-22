# 任务系统设计方案

**日期**: 2026-03-22
**类型**: 功能增强
**状态**: 设计中

---

## 1. 概述

本设计文档描述了 AI 视频编辑智能体的任务系统增强方案，包括：
- `deleteText` 指令：按时间范围删除文字叠加层
- 扩展转场特效：支持组合效果（fade-blur、dissolve-zoom、slide-rotate）
- 任务进度系统：三层任务队列（Plan → Task → SubTask），支持暂停/恢复/跳过/取消

---

## 2. 架构概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                           用户交互层                                 │
│  ChatPanel (内联任务列表)  ←→  VideoPlayer (预览)  ←→  Editor      │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                        状态管理层 (Zustand)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐   │
│  │ editorStore │  │ planStore   │  │ instructionStore         │   │
│  │ (现有)      │  │ (新增)      │  │ (新增 - 任务队列)        │   │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                        执行引擎层                                     │
│  ┌─────────────────┐        ┌─────────────────┐                     │
│  │ TaskExecutor    │        │ VideoProcessor  │                     │
│  │ (任务调度器)    │        │ (视频处理)      │                     │
│  └─────────────────┘        └─────────────────┘                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. 数据模型

### 3.1 Plan - 编辑计划

```typescript
interface Plan {
  id: string;
  title: string;                    // AI 生成的计划名称
  status: 'draft' | 'executing' | 'paused' | 'completed' | 'failed';
  tasks: Task[];                    // 子任务列表
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 Task - 单个任务

```typescript
interface Task {
  id: string;
  planId: string;
  type: TaskType;                  // 'ffmpeg' | 'remotion' | 'render'
  instructionType: InstructionType; // 'crop' | 'addText' | 'addTransition' 等
  params: Record<string, any>;      // 任务参数
  status: TaskStatus;
  progress: number;                 // 0-100
  result?: TaskResult;
  dependencies: string[];           // 依赖的 task IDs
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

type TaskStatus = 
  | 'pending'    // 等待执行
  | 'queued'     // 已加入队列
  | 'running'    // 执行中
  | 'paused'     // 暂停
  | 'skipped'    // 跳过
  | 'completed'  // 完成
  | 'failed';    // 失败
```

### 3.3 SubTask - 子任务（可选）

```typescript
interface SubTask {
  id: string;
  taskId: string;
  name: string;                     // e.g., "裁剪视频段 1"
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
}
```

---

## 4. deleteText 指令

### 4.1 指令参数

```typescript
interface DeleteTextParams {
  mode: 'timeRange' | 'textIds';    // 删除模式
  startTime?: number;               // 时间范围模式
  endTime?: number;
  textIds?: string[];                // 指定 ID 模式
}
```

### 4.2 执行流程

```
用户："删除第 5-10 秒的文字"
    ↓
AI 解析 → { type: 'deleteText', params: { mode: 'timeRange', startTime: 5, endTime: 10 } }
    ↓
editorStore.deleteTextOverlay(startTime, endTime)
    ↓
过滤 overlays 中时间范围重叠的文字叠加层
    ↓
返回被删除的文字列表给用户确认
```

---

## 5. 扩展转场特效

### 5.1 效果类型

```typescript
type TransitionEffect = 
  // 基础效果
  | 'fade' | 'dissolve' | 'slide'
  // 组合效果
  | 'fade-blur' | 'dissolve-zoom' | 'slide-rotate'
  // 增强效果
  | 'blur' | 'zoom' | 'rotate' | 'scale';

type TransitionDirection = 'left' | 'right' | 'up' | 'down';
type EasingType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
```

### 5.2 扩展参数

```typescript
interface ExtendedTransitionParams {
  startTime: number;
  endTime: number;
  effect: TransitionEffect;
  direction?: TransitionDirection;  // slide 类效果的方向
  duration?: number;               // 持续时间（秒）
  easing?: EasingType;            // 缓动函数
  intensity?: number;              // 效果强度 0-1
}
```

### 5.3 组合转场实现

```typescript
function applyTransitionEffect(
  ctx: CanvasRenderingContext2D,
  effect: TransitionEffect,
  progress: number,               // 0-1
  direction?: TransitionDirection,
  easing?: EasingFunction,
  intensity: number = 1
): void {
  const easedProgress = easing ? easing(progress) : progress;
  
  switch (effect) {
    case 'fade-blur':
      ctx.filter = `blur(${intensity * easedProgress * 10}px)`;
      ctx.globalAlpha = 1 - easedProgress;
      break;
      
    case 'dissolve-zoom':
      ctx.globalAlpha = 1 - easedProgress;
      ctx.scale(1 + easedProgress * 0.2, 1 + easedProgress * 0.2);
      break;
      
    case 'slide-rotate':
      const translateX = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
      ctx.translate(translateX * easedProgress * 100, 0);
      ctx.rotate(easedProgress * Math.PI * 0.1);
      break;
  }
}
```

---

## 6. UI 设计

### 6.1 TaskQueue 组件（内联于 ChatPanel）

```
┌─────────────────────────────────────────────────────────────┐
│ 📋 执行计划: "视频剪辑+加字幕+转场"              [全部暂停]  │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 1. ✅ 裁剪视频 0:05-0:15                    [⏸] [⏭] [✕]│ │
│ │    └── 裁剪完成: output_001.mp4                         │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ 2. 🔄 添加文字 "Hello World"                  [⏸] [⏭] [✕]│ │
│ │    ████████████░░░░░░░ 60%                            │ │
│ │    └── 正在渲染文字叠加层...                            │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ 3. ⏳ 添加转场 fade-blur                     [⏸] [⏭] [✕]│ │
│ │    └── 等待前置任务完成                                │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ 4. ⏳ 渲染最终视频                           [⏸] [⏭] [✕]│ │
│ │    └── 等待前置任务完成                                │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [▶ 继续执行]  [⏹ 全部停止]                                  │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 状态图标

| 图标 | 状态 | 颜色 |
|------|------|------|
| ⏳ | pending | 灰色 |
| 🔄 | running | 蓝色（旋转） |
| ⏸ | paused | 黄色 |
| ⏭ | skipped | 橙色 |
| ✅ | completed | 绿色 |
| ❌ | failed | 红色 |

### 6.3 控制按钮

- **暂停/继续** (⏸/▶): 暂停当前任务或继续
- **跳过** (⏭): 跳过当前任务
- **取消** (✕): 取消任务

---

## 7. 组件结构

```
src/components/
├── ChatPanel/
│   ├── index.tsx          # 主组件（修改 - 集成 TaskQueue）
│   ├── TaskQueue.tsx      # 新增：任务队列组件
│   ├── TaskItem.tsx       # 新增：单个任务项
│   └── SubTaskItem.tsx    # 新增：子任务项
```

---

## 8. 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/stores/planStore.ts` | 新增 | 任务计划状态管理 |
| `src/lib/executor/TaskExecutor.ts` | 新增 | 任务执行引擎 |
| `src/lib/instructions/types.ts` | 修改 | 添加 deleteText、扩展转场参数 |
| `src/lib/instructions/remotion/index.ts` | 修改 | 实现组合转场效果 |
| `src/lib/instructions/index.ts` | 修改 | 添加 deleteText 指令处理 |
| `src/components/ChatPanel/TaskQueue.tsx` | 新增 | 任务队列组件 |
| `src/components/ChatPanel/TaskItem.tsx` | 新增 | 任务项组件 |
| `src/components/ChatPanel/SubTaskItem.tsx` | 新增 | 子任务项组件 |
| `src/components/ChatPanel/index.tsx` | 修改 | 集成 TaskQueue |
| `src/stores/editorStore.ts` | 修改 | 添加 deleteTextOverlay 方法 |

---

## 9. 实现优先级

1. **Phase 1**: deleteText 指令（基础删除功能）
2. **Phase 2**: planStore 和任务状态管理
3. **Phase 3**: TaskQueue UI 组件
4. **Phase 4**: TaskExecutor 执行引擎
5. **Phase 5**: 扩展转场特效（fade-blur、dissolve-zoom、slide-rotate）
