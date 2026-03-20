# Agent Behavior & Workflow

This document defines how to work with this AI Video Editing Agent codebase.

---

## 1. Code Style & Conventions

### TypeScript
- Use strict TypeScript with explicit types
- Prefer `interface` over `type` for object shapes
- Use `Record<string, any>` sparingly - prefer discriminated unions

### File Naming
- React components: PascalCase (`VideoPlayer/index.tsx`)
- Utilities/lib: camelCase (`videoProcessor.ts`)
- API routes: kebab-case (`/api/chat/route.ts`)

### State Management
- Use Zustand for client state
- Store pattern: create store with `create<StoreName>((set, get) => ({...}))`

---

## 2. Component Structure

```
ComponentName/
├── index.tsx          # Main export
├── ComponentName.tsx # Main component
├── SubComponent.tsx   # Sub-components
└── types.ts           # Component-specific types (if needed)
```

---

## 3. API Design

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/video/upload` | Upload video, returns `{ videoId, metadata }` |
| POST | `/api/chat` | Send chat message with video context |
| POST | `/api/preview` | Generate preview for instructions |
| POST | `/api/render` | Start full render job |
| GET | `/api/render/[jobId]` | Check render status |

### Request/Response Pattern
- Use consistent response wrapper: `{ data, error, status }`
- Always validate inputs before processing
- Return appropriate HTTP status codes

---

## 4. Video Processing Rules

### Instruction Validation
Before executing any instruction:
1. Validate parameters against video metadata (duration, dimensions)
2. Check for conflicting instructions in the plan
3. Provide clear error messages for invalid params

### Execution Order
1. **ffmpeg operations first** (crop, cut, speed change)
2. **Remotion operations second** (text overlays, transitions)
3. **seek operations last** (if needed for preview)

---

## 5. AI Integration

### Chat Flow
1. User sends message
2. AI receives: video metadata + full conversation history + current plan
3. AI responds with: text message + proposed actions (as JSON)
4. Actions displayed as clickable chips awaiting confirmation
5. On confirm: execute actions, update plan, show preview

### System Prompt Guidelines
- Always explain what edit will happen before executing
- Use natural language to describe technical operations
- Suggest alternatives if user request is ambiguous
- Confirm destructive operations (delete, crop) explicitly

---

## 6. Error Handling

### User-Facing Errors
- Show toast notifications for transient errors
- Display inline errors for form/validation issues
- Provide retry options where applicable

### Error Categories
| Category | Handling |
|----------|----------|
| Upload failure | Retry option + error toast |
| Invalid instruction | AI regenerates corrected instruction |
| Render failure | Show error details + retry option |
| Network issues | Offline queue + graceful degradation |

---

## 7. File Structure Reference

```
remotion-agent/
├── src/app/
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
├── src/components/
│   ├── VideoPlayer/
│   ├── ChatPanel/
│   ├── UploadZone/
│   └── Editor/
├── src/lib/
│   ├── instructions/
│   ├── remotion/
│   ├── ai/
│   └── video/
├── src/stores/
│   └── editorStore.ts
├── docs/superpowers/specs/
│   └── 2026-03-19-ai-video-editor-design.md
└── public/
    ├── uploads/
    └── outputs/
```

---

## 8. Next.js Specific (App Router)

- Server Components by default; use `'use client'` for interactivity
- API routes in `app/api/` - use for server-side operations
- Use `next/font` for fonts (already configured with Geist)
- Image optimization: use `next/image` for static images
- Video files: serve from `public/` directory
