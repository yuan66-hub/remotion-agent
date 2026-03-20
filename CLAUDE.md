# Project Overview

**Project Name**: AI Video Editing Agent (Remotion Agent)
**Type**: Next.js Web Application
**Core Functionality**: An intelligent AI-powered video editing agent that allows users to collaborate with GPT-4o through natural conversation to edit videos.
**Current Date**: 2026-03-19

---

# Key Paths

- **Source**: `src/app/`
- **Components**: `src/components/` (or `components/` at root)
- **Lib/Utilities**: `src/lib/`
- **Stores**: `src/stores/`
- **API Routes**: `src/app/api/`
- **Design Spec**: `docs/superpowers/specs/2026-03-19-ai-video-editor-design.md`

---

# Tech Stack

- **Framework**: Next.js (App Router)
- **AI**: Vercel AI SDK + OpenAI GPT-4o
- **Video Processing**: Remotion (overlays) + ffmpeg (底层操作)
- **State Management**: Zustand
- **Styling**: Tailwind CSS

---

# Architecture

## Video Processing Pipeline

```
输入视频 → ffmpeg (裁剪/变速) → 中间视频 → Remotion (叠加层) → 最终视频
```

## Two-Layer Instruction System

| 类型 | 指令 | 处理引擎 |
|------|------|----------|
| 视频操作 | `crop`, `splitClip`, `deleteClip`, `changeSpeed` | ffmpeg |
| 叠加层 | `addText`, `addHighlight`, `addTransition` | Remotion |
| 控制 | `seek`, `confirmPlan`, `render` | 前端/后端 |

## Supported Instructions

- `seek` - 跳转到指定时间点
- `crop` - 裁剪视频片段
- `addText` - 添加文字叠加（花字）
- `addHighlight` - 高亮某个时间段
- `changeSpeed` - 变速（0.5x, 2x等）
- `addTransition` - 添加转场
- `splitClip` - 在指定时间点分割
- `deleteClip` - 删除片段
- `confirmPlan` - 用户确认执行计划
- `render` - 触发渲染

---

# Important Rules

1. **Read Next.js docs before coding**: This is NOT the Next.js you know. Read `node_modules/next/dist/docs/` before writing code.
2. **Follow the design spec**: The comprehensive design spec is in `docs/superpowers/specs/2026-03-19-ai-video-editor-design.md`
3. **Two-engine architecture**: Always distinguish between ffmpeg operations (底层视频) and Remotion operations (叠加层)
4. **User confirmation required**: AI action chips require user confirmation before execution

---

# CLI Commands

```bash
npm run dev      # 开发服务器
npm run build    # 生产构建
npm run lint     # ESLint 检查
```

---

# Environment Variables

- `OPENAI_API_KEY` - Required for AI functionality
