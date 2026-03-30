# Remotion 真实渲染管线

> 实施日期：2026-03-30

## 概述

本次更新将 Remotion 从"仅用于类型定义和动画计算"升级为**完整的服务端渲染引擎**。用户在编辑器中添加的文字、高亮、转场等 overlay 现在会被真正合成（烧录）到输出视频中，而非仅作为 HTML 浮层叠加在 `<video>` 上。

### 之前

```
用户添加 overlay → HTML div 浮层叠加 → 导出时复制原始视频（overlay 丢失）
```

### 现在

```
用户添加 overlay → HTML div 实时预览 → 导出时 Remotion 逐帧渲染 → overlay 烧录进 mp4
```

---

## 新增功能

### 1. 真实视频渲染

overlay（文字花字、高亮、转场）会被 Remotion headless Chrome 逐帧合成到视频中，输出标准 H.264 mp4 文件。

### 2. 多级质量选择

| 质量 | 分辨率缩放 | CRF | 用途 |
|------|-----------|-----|------|
| `low` | 0.5x | 28 | 快速预览，文件小 |
| `medium` | 0.75x | 23 | 日常使用 |
| `high` | 1x | 18 | 最终导出，全质量 |

### 3. 渲染进度实时展示

渲染过程中前端显示进度条（百分比），每秒轮询更新，用户不再面对无反馈的等待。

### 4. Bundle 缓存

Remotion 入口文件只在首次渲染时打包，后续渲染复用缓存，显著减少重复开销。

---

## 操作示例

### 示例 1：对话添加文字后导出

```
1. 上传视频
2. 在聊天框输入："在第 3 秒到第 8 秒添加文字'Hello World'，居中显示，带 bounceIn 动效"
3. AI 返回 addText 指令 → 自动添加到 overlay
4. 视频预览区实时看到文字浮层
5. 在聊天框输入："导出视频" 或触发 render 指令
6. 弹出渲染进度条（0% → 100%）
7. 渲染完成后提示下载路径：/outputs/render_xxx.mp4
8. 下载视频 → 文字已烧录在视频画面中
```

### 示例 2：多个 overlay 叠加导出

```
1. 上传视频
2. 添加文字 overlay："在 0-5 秒显示标题"
3. 添加高亮 overlay："在 5-10 秒高亮画面"
4. 添加转场 overlay："在 10-11 秒添加 fade 转场"
5. 触发渲染 → 三个 overlay 全部合成进输出视频
```

### 示例 3：快速预览 vs 高质量导出

```
# 快速预览（低质量，速度快）
发送 render 指令，quality 设为 "low"
→ 输出 960x540（原视频一半分辨率），适合快速检查效果

# 最终导出（高质量）
发送 render 指令，quality 设为 "high"
→ 输出原始分辨率 1920x1080，CRF 18 高画质
```

### 示例 4：API 直接调用

```bash
# 发起渲染请求
curl -X POST http://localhost:3000/api/render \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "your-video-id",
    "overlays": [
      {
        "id": "text_1",
        "type": "text",
        "startTime": 2,
        "endTime": 8,
        "text": "Hello World",
        "position": { "x": 0.5, "y": 0.5 },
        "fontSize": 64,
        "color": "#FFFFFF",
        "entranceAnimation": "bounceIn",
        "animationDuration": 500
      }
    ],
    "outputFormat": "mp4",
    "quality": "high"
  }'

# 返回
# { "jobId": "render_1711785600000", "status": "pending", "message": "Render job started" }

# 轮询进度
curl http://localhost:3000/api/render/render_1711785600000

# 返回
# { "jobId": "render_1711785600000", "status": "processing", "progress": 0.45, ... }
# { "jobId": "render_1711785600000", "status": "complete", "progress": 1, "outputPath": "/outputs/render_1711785600000.mp4", ... }
```

---

## 文件变更清单

### 新增文件

| 文件 | 说明 |
|------|------|
| `src/remotion/index.ts` | Remotion 入口文件，调用 `registerRoot()` |
| `src/remotion/Root.tsx` | 注册 `VideoEditor` Composition，设置默认 props |
| `src/remotion/VideoComposition.tsx` | 核心渲染组件：`<OffthreadVideo>` + overlay 叠加层 |
| `src/lib/render/remotion-renderer.ts` | 服务端渲染封装：bundle 缓存 + `renderVideo()` |

### 修改文件

| 文件 | 变更内容 |
|------|---------|
| `package.json` | 添加 `remotion: ^4.0.436` 为显式依赖 |
| `next.config.ts` | 添加 `serverExternalPackages` 排除 Remotion 原生二进制 |
| `src/app/api/render/route.ts` | 接收 `overlays[]` 参数，调用 `renderVideo()` 替代 `copyFile()` |
| `src/app/api/render/[jobId]/route.ts` | 响应新增 `progress` 字段 |
| `src/lib/video/storage.ts` | `RenderJob` 接口新增 `progress?: number` |
| `src/stores/editorStore.ts` | 新增 `renderProgress` 状态和 `setRenderProgress` action |
| `src/components/Editor/index.tsx` | 渲染时传递 overlays、轮询进度、显示进度条 UI |

---

## 复用的现有模块

| 模块 | 复用方式 |
|------|---------|
| `src/lib/instructions/remotion/animations.ts` | `VideoComposition` 直接 import `getAnimationConfig()`、`getAnimationKeyframes()` 等 |
| `src/lib/instructions/remotion/index.ts` | `Overlay` 类型定义 + 工厂函数 |
| `src/lib/video/storage.ts` | `RenderJob` CRUD 函数 |
| `VideoPlayer/index.tsx` L296-462 | overlay 渲染逻辑移植到 `VideoComposition`，保持视觉一致 |

---

## 架构图

```
┌─────────────────────────────────────────────────┐
│                    前端 Editor                    │
│                                                   │
│  overlays[] ──→ POST /api/render                 │
│                  { videoId, overlays, quality }    │
│                                                   │
│  轮询 GET /api/render/:jobId ──→ { progress }    │
│  显示进度条 ██████░░░░ 60%                        │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│              服务端 /api/render                    │
│                                                   │
│  1. createRenderJob()                             │
│  2. renderVideo({                                 │
│       videoPath, overlays, quality,               │
│       onProgress → updateRenderJob(progress)      │
│     })                                            │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│           remotion-renderer.ts                    │
│                                                   │
│  bundle() ──→ 缓存 bundlePath                    │
│  selectComposition("VideoEditor", inputProps)     │
│  renderMedia({                                    │
│    codec: 'h264',                                 │
│    crf: qualityPresets[quality],                  │
│    scale: qualityPresets[quality],                │
│  })                                               │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│           VideoComposition.tsx                     │
│           (Remotion headless Chrome)              │
│                                                   │
│  <OffthreadVideo src={videoSrc} />               │
│  ├── <TextOverlayRenderer />    ← animations.ts  │
│  ├── <HighlightOverlayRenderer />                │
│  └── <TransitionOverlayRenderer />               │
│                                                   │
│  逐帧渲染 → 输出 mp4 到 public/outputs/          │
└─────────────────────────────────────────────────┘
```

---

## 注意事项

1. **首次渲染较慢**：第一次渲染需要 bundle Remotion 入口文件（约 10-30 秒），后续渲染复用缓存会快很多。
2. **Chrome 依赖**：Remotion 渲染需要系统安装 Chrome/Chromium。生产部署时确保环境中有可用的浏览器。
3. **视频路径**：本地视频路径会被转换为 `file://` URL 供 `<OffthreadVideo>` 使用。
4. **无 overlay 时**：如果 overlays 为空数组，渲染会直接复制原始视频，跳过 Remotion 流程。
