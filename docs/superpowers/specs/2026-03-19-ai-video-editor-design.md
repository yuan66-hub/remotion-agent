# AI Video Editing Agent - Design Specification

**Date**: 2026-03-19
**Status**: Draft

---

## 1. Concept & Vision

An intelligent AI-powered video editing agent that allows users to collaborate with GPT-4o through natural conversation to edit videos. The interface combines a video player with a chat panel, enabling a multi-turn dialogue where users describe their editing goals and the AI proposes, explains, and executes edits using fine-grained Remotion instructions. The experience feels like having a professional video editor assistant that understands both creative intent and technical execution.

---

## 2. Design Language

**Aesthetic Direction**: Clean, professional video editing tool with dark mode optimized for video review. Inspired by DaVinci Resolve's functionality with a modern web approach.

**Color Palette**:
- Primary: `#6366F1` (Indigo)
- Secondary: `#8B5CF6` (Violet)
- Accent: `#22D3EE` (Cyan for AI actions)
- Background: `#0F0F0F` (Near black)
- Surface: `#1A1A1A` (Dark gray)
- Text Primary: `#FFFFFF`
- Text Secondary: `#A1A1AA`
- Success: `#22C55E`
- Warning: `#F59E0B`
- Error: `#EF4444`

**Typography**:
- Font: System UI stack (Next.js default)
- Headings: Bold, 24px/20px/16px
- Body: Regular, 14px
- Code/Actions: Monospace, 12px

**Spatial System**:
- Base unit: 4px
- Component padding: 12px/16px
- Section gaps: 24px
- Border radius: 8px

**Motion Philosophy**:
- Subtle transitions for UI state changes (150ms ease)
- Video seek: instant with smooth timeline scroll
- Chat messages: fade-in 200ms
- Action chips: scale on hover 100ms

---

## 3. Layout & Structure

**Main Layout**: Side-by-side split view
```
┌─────────────────────────────────────────────────────────────┐
│                      Header (App Title)                      │
├────────────────────────────┬────────────────────────────────┤
│                            │                                 │
│      Video Player           │         Chat Panel               │
│      (Left 60%)             │         (Right 40%)              │
│                            │                                 │
│  ┌──────────────────────┐  │  ┌────────────────────────────┐  │
│  │                      │  │  │ Message History           │  │
│  │    Video Display     │  │  │ (scrollable)               │  │
│  │                      │  │  │                            │  │
│  └──────────────────────┘  │  │                            │  │
│  ┌──────────────────────┐  │  └────────────────────────────┘  │
│  │ Timeline + Controls  │  │  ┌────────────────────────────┐  │
│  └──────────────────────┘  │  │ Input Area                │  │
│                            │  └────────────────────────────┘  │
├────────────────────────────┴────────────────────────────────┤
│                      Status Bar                              │
└─────────────────────────────────────────────────────────────┘
```

**Responsive Strategy**:
- Desktop (>1024px): Side-by-side layout
- Tablet (768-1024px): Stacked with collapsible chat
- Mobile (<768px): Tab-based switching between video and chat

---

## 4. Features & Interactions

### 4.1 Video Upload
- Drag-and-drop zone or file picker
- Supports: MP4 (H.264), MOV, WebM
- Shows upload progress bar
- On complete: extracts metadata, displays in player

### 4.2 Video Player
- Play/pause toggle
- Seek bar with preview thumbnails (future)
- Current time / duration display
- Volume control
- Fullscreen toggle
- **AI Seek**: When AI emits `seek` action, player jumps to timestamp with visual indicator

### 4.3 Chat Panel
- Full conversation history (all messages preserved)
- Message types:
  - **User message**: Right-aligned, user color
  - **AI text**: Left-aligned, with avatar
  - **AI action**: Special chips showing edit commands (e.g., `crop(0, 30)`)
- Action chips require user confirmation before execution
- Edit commands shown as clickable cards

### 4.4 Conversation Flow
1. User uploads video
2. AI analyzes video, sends analysis message
3. User describes editing goal
4. AI proposes edit plan with action chips
5. User approves (clicks confirm) or requests changes
6. AI executes approved actions
7. Preview renders (quick preview for simple, full render for complex)
8. User can request further adjustments
9. Final render when satisfied

### 4.5 Instruction System

Custom Remotion editing instructions (fine-grained, composable):

| Instruction | Parameters | Description |
|------------|-----------|-------------|
| `seek` | `time: number` | 跳转到指定时间点 |
| `crop` | `start: number, end: number` | 裁剪视频片段 |
| `addText` | `text, start, end, position, style` | 添加文字叠加（花字） |
| `addHighlight` | `start, end, color` | 高亮某个时间段 |
| `changeSpeed` | `start, end, factor` | 变速（0.5x, 2x等） |
| `addTransition` | `type: fade\|slide\|blur` | 添加转场 |
| `splitClip` | `time: number` | 在指定时间点分割 |
| `deleteClip` | `start, end` | 删除片段 |
| `confirmPlan` | `{instructions: []}` | 用户确认执行计划 |
| `render` | `{quality: preview\|final}` | 触发渲染 |

**AI Decision Flow**:
- AI receives video metadata + conversation history
- AI proposes appropriate instructions
- Instructions validated before execution
- Preview decision: simple edits → instant preview, complex → full render

### 4.6 Preview System
- **Quick Preview**: Uses Remotion preview server for text overlays, speed changes
- **Full Render**: Complete Remotion render for complex compositions
- Preview appears in VideoPlayer area
- User can compare original vs edited

### 4.7 Error Handling
- Upload failure: Show error toast, retry option
- Invalid instruction: AI regenerates corrected instruction
- Render failure: Show error details, offer retry
- Network issues: Graceful degradation, offline queue

---

## 5. Component Inventory

### 5.1 VideoPlayer
- **States**: empty (no video), loading, playing, paused, error
- **Sub-components**: VideoDisplay, Timeline, Controls
- **AI integration**: Receives seek commands from chat

### 5.2 ChatPanel
- **States**: empty (no messages), active conversation, loading (AI thinking)
- **Sub-components**: MessageList, MessageItem, ActionChip, ChatInput
- **AI integration**: Uses Vercel AI SDK `useChat` hook

### 5.3 ActionChip
- **States**: pending (awaiting confirmation), approved, executing, complete, error
- **Appearance**: Pill-shaped with icon + instruction text
- **Interaction**: Click to approve, hover shows details

### 5.4 UploadZone
- **States**: idle, drag-over, uploading, complete, error
- **Appearance**: Dashed border, icon + text
- **Interaction**: Drag-and-drop or click to browse

### 5.5 Timeline
- **States**: empty, populated, seeking
- **Shows**: Video duration, current position, markers from AI highlights

### 5.6 StatusBar
- Shows: Current operation status, render progress, video metadata

---

## 6. Technical Approach

### 6.1 Framework & Libraries
- **Next.js** (latest stable, App Router)
- **Vercel AI SDK** + OpenAI gpt-4o
- **AI Elements** (`npx shadcn@latest add @ai-elements/all`) — AI UI components
- **Remotion** for video overlays and preview rendering
- **ffmpeg** for video processing (crop, cut, speed change, format conversion)
- **Zustand** for client state management
- **Tailwind CSS** for styling

### 6.2 Video Processing Pipeline

**两层架构**：
- **ffmpeg** — 处理底层视频操作（裁剪、切割、变速、格式转换、合并）
- **Remotion** — 处理叠加层（花字、文字动画、高亮、转场动画）

```
输入视频 → ffmpeg (裁剪/变速) → 中间视频 → Remotion (叠加层) → 最终视频
```

**指令分类**：

| 类型 | 指令 | 处理引擎 |
|------|------|----------|
| 视频操作 | `crop`, `splitClip`, `deleteClip`, `changeSpeed` | ffmpeg |
| 叠加层 | `addText`, `addHighlight`, `addTransition` | Remotion |
| 控制 | `seek`, `confirmPlan`, `render` | 前端/后端 |

### 6.2 API Design

```
POST /api/video/upload
  Request: FormData (video file)
  Response: { videoId: string, metadata: { duration, width, height, fps } }

POST /api/chat
  Request: { videoId: string, messages: Message[], currentPlan: Plan }
  Response: { message: Message, actions: Action[], updatedPlan: Plan }

POST /api/preview
  Request: { videoId: string, instructions: Instruction[] }
  Response: { previewUrl: string, isFullRender: boolean }

POST /api/render
  Request: { videoId: string, instructions: Instruction[] }
  Response: { jobId: string, status: string }

GET /api/render/[jobId]
  Response: { status: string, progress?: number, downloadUrl?: string }

GET /api/video/[videoId]/timeline
  Response: { duration: number, markers: Marker[], segments: Segment[] }
```

### 6.3 Data Models

```typescript
interface Video {
  id: string;
  originalUrl: string;
  metadata: {
    duration: number;
    width: number;
    height: number;
    fps: number;
  };
  createdAt: Date;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: Action[];
  createdAt: Date;
}

interface Action {
  type: 'seek' | 'crop' | 'addText' | 'addHighlight' | 'changeSpeed' | 'addTransition' | 'splitClip' | 'deleteClip' | 'confirmPlan' | 'render';
  params: Record<string, any>;
  status: 'pending' | 'approved' | 'executing' | 'complete' | 'error';
}

interface Plan {
  instructions: Instruction[];
  status: 'editing' | 'approved' | 'rendering' | 'complete';
}
```

### 6.4 Instruction Engine
- Parses AI's JSON action outputs
- Validates parameters against video metadata
- Maps high-level requests to Remotion compositions
- Returns structured instructions for execution

### 6.5 Storage
- **Uploads**: `public/uploads/[videoId]/`
- **Rendered**: `public/outputs/[jobId].mp4`
- **Metadata**: In-memory or simple JSON files

### 6.6 Deployment
- Self-hosted (Docker container)
- Requires: Node.js 18+, ffmpeg for video processing
- Environment variables: `OPENAI_API_KEY`

---

## 7. File Structure

```
remotion-agent/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── api/
│       ├── video/
│       │   ├── upload/route.ts
│       │   └── [videoId]/route.ts
│       ├── chat/route.ts
│       ├── preview/route.ts
│       └── render/
│           ├── route.ts
│           └── [jobId]/route.ts
├── components/
│   ├── VideoPlayer/
│   │   ├── index.tsx
│   │   ├── Timeline.tsx
│   │   └── Controls.tsx
│   ├── ChatPanel/
│   │   ├── index.tsx
│   │   ├── Message.tsx
│   │   ├── ActionChip.tsx
│   │   └── ChatInput.tsx
│   ├── UploadZone/
│   │   └── index.tsx
│   └── Editor/
│       └── index.tsx
├── lib/
│   ├── instructions/
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── crop.ts
│   │   ├── addText.ts
│   │   ├── addHighlight.ts
│   │   ├── changeSpeed.ts
│   │   └── transitions.ts
│   ├── remotion/
│   │   ├── VideoComposition.tsx
│   │   └── registry.ts
│   ├── ai/
│   │   └── chat.ts
│   └── video/
│       ├── processor.ts
│       └── storage.ts
├── stores/
│   └── editorStore.ts
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-03-19-ai-video-editor-design.md
├── public/
│   ├── uploads/
│   └── outputs/
├── package.json
├── next.config.js
├── remotion.config.ts
├── tsconfig.json
└── Dockerfile
```
