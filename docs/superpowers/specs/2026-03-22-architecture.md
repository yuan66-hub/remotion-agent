# AI Video Editing Agent - 架构文档

**日期**: 2026-03-22
**状态**: Complete

---

## 1. 系统架构图

### 1.1 整体架构

```mermaid
graph TB
    subgraph UI["用户界面层 (UI Layer)"]
        VP["VideoPlayer<br/>视频播放器 · 时间线控制 · 预览渲染"]
        CP["ChatPanel<br/>消息历史 · AI 对话 · 指令卡片"]
    end

    subgraph State["状态层 (State Layer)"]
        Store["Zustand EditorStore<br/>video · messages · instructions<br/>overlays · currentTime · isPlaying"]
    end

    subgraph AI["AI 层 (AI Layer)"]
        AI_SDK["Vercel AI SDK<br/>useChat Hook"]
        LLM["通义千问 / GPT-4o<br/>AI 助手"]
        Parser["指令解析器<br/>Validator"]
    end

    subgraph Video["视频处理层 (Video Processing Layer)"]
        subgraph Engine["双引擎架构"]
            FF["ffmpeg<br/>底层视频操作<br/>crop · split · delete · speed"]
            RM["Remotion<br/>叠加层渲染<br/>addText · addHighlight · transitions"]
        end
        Output["最终视频输出<br/>public/outputs/"]
    end

    VP <--> Store
    CP <--> Store
    AI_SDK <--> LLM
    AI_SDK <--> Parser
    FF --> Output
    RM --> Output
```

### 1.2 分层说明

| 层级 | 组件 | 职责 |
|------|------|------|
| **UI Layer** | VideoPlayer, ChatPanel | 用户交互、视频预览、消息展示 |
| **State Layer** | Zustand EditorStore | 集中管理应用状态 |
| **AI Layer** | Vercel AI SDK, LLM, Parser | 自然语言理解、指令生成 |
| **Video Layer** | ffmpeg, Remotion | 底层视频处理、叠加层渲染 |

---

## 2. 数据流程图

### 2.1 指令处理流程

```mermaid
flowchart LR
    A["用户输入<br/>自然语言"] --> B["AI 理解意图"]
    B --> C{指令类型识别}
    C -->|视频操作| D["ffmpeg 操作队列<br/>crop · split · delete · speed"]
    C -->|叠加层| E["Remotion 叠加队列<br/>addText · addHighlight · transitions"]
    C -->|控制| F["前端控制<br/>seek · confirmPlan · render"]
    D --> G["视频预览 / 最终输出"]
    E --> G
    F --> G
```

### 2.2 完整数据流

```mermaid
flowchart TB
    subgraph Input["输入阶段"]
        UserInput["用户自然语言输入"]
        Video["视频文件上传"]
    end

    subgraph AI["AI 处理阶段"]
        LLM["LLM 意图理解"]
        Parse["指令解析与验证"]
        Plan["编辑计划生成"]
    end

    subgraph Execute["执行阶段"]
        FF["ffmpeg 视频操作"]
        RM["Remotion 叠加层"]
        Preview["实时预览"]
    end

    subgraph Output["输出阶段"]
        Final["最终视频输出"]
        Download["下载 / 分享"]
    end

    UserInput --> LLM
    Video --> LLM
    LLM --> Parse
    Parse --> Plan
    Plan -->|确认| Execute
    Execute --> Preview
    Preview -->|满意| Final
    Final --> Download
```

---

## 3. 时序图

### 3.1 典型编辑会话流程

```mermaid
sequenceDiagram
    participant U as 用户
    participant UI as VideoPlayer + ChatPanel
    participant Store as Zustand Store
    participant AI as AI (通义千问/GPT-4o)
    participant FF as ffmpeg
    participant RM as Remotion

    U->>UI: 上传视频
    UI->>Store: 保存 video metadata
    Store->>AI: 发送视频分析请求
    AI-->>UI: 返回视频分析结果

    U->>UI: 发送编辑指令（如"加速2-5秒"）
    UI->>AI: 转发用户消息 + 上下文
    AI-->>UI: 返回编辑方案（action chips）
    UI->>U: 显示待确认的指令卡片

    U->>UI: 确认执行
    UI->>FF: 执行 ffmpeg 操作
    UI->>RM: 执行 Remotion 叠加
    FF-->>UI: 返回处理结果
    RM-->>UI: 返回叠加预览

    alt 简单操作
        UI->>UI: 即时预览
    else 复杂操作
        UI->>RM: 完整渲染
        RM-->>UI: 返回渲染结果
    end

    UI->>U: 展示最终结果
```

### 3.2 指令执行时序

```mermaid
sequenceDiagram
    participant U as 用户
    participant AI as AI 助手
    participant Store as Zustand Store
    participant FF as ffmpeg
    participant RM as Remotion

    U->>AI: "把5-10秒加速2倍"

    AI-->>Store: 解析指令<br/>{type: changeSpeed, params: {start: 5, end: 10, speed: 2}}

    Note over Store: 指令进入待确认状态

    U->>AI: 确认执行

    alt ffmpeg 操作
        Store->>FF: 调用 ffmpeg<br/>ffmpeg -i input.mp4 -filter:v "setpts=0.5*PTS" output.mp4
        FF-->>Store: 返回处理后的中间视频
    end

    alt Remotion 叠加
        Store->>RM: 应用叠加层<br/>文字、高亮等
        RM-->>Store: 返回叠加后的预览
    end

    Store-->>U: 显示最终结果
```

---

## 4. 组件关系图

### 4.1 前端组件关系

```mermaid
graph LR
    subgraph Components["组件层次"]
        Editor["Editor (根组件)"]
        VP["VideoPlayer"]
        CP["ChatPanel"]
        UZ["UploadZone"]
    end

    subgraph SubComponents["子组件"]
        VP_TL["Timeline"]
        VP_CTRL["Controls"]
        CP_MSG["MessageList"]
        CP_CHIP["ActionChip"]
        CP_INPUT["ChatInput"]
    end

    Editor --> VP
    Editor --> CP
    Editor --> UZ
    VP --> VP_TL
    VP --> VP_CTRL
    CP --> CP_MSG
    CP --> CP_CHIP
    CP --> CP_INPUT
```

### 4.2 状态流向

```mermaid
flowchart LR
    subgraph Store["Zustand EditorStore"]
        Video["video: Video | null"]
        Messages["messages: Message[]"]
        Instructions["instructions: Instruction[]"]
        Overlays["overlays: Overlay[]"]
        CurrentTime["currentTime: number"]
        IsPlaying["isPlaying: boolean"]
    end

    subgraph Components["组件"]
        VP["VideoPlayer"]
        CP["ChatPanel"]
    end

    VP -.->|setCurrentTime, setIsPlaying| Store
    CP -.->|addMessage, addInstruction| Store
    Store -.->|video, currentTime| VP
    Store -.->|messages, instructions| CP
```

---

## 5. 双引擎架构详解

### 5.1 ffmpeg 与 Remotion 职责划分

```mermaid
flowchart LR
    subgraph Input["输入视频"]
        RawVideo["原始视频文件"]
    end

    subgraph FFmpeg["ffmpeg 引擎"]
        Crop["crop - 裁剪"]
        Split["split - 分割"]
        Delete["deleteClip - 删除"]
        Speed["changeSpeed - 变速"]
    end

    subgraph Remotion["Remotion 引擎"]
        Text["addText - 文字叠加"]
        Highlight["addHighlight - 高亮"]
        Transition["addTransition - 转场"]
    end

    subgraph Output["最终输出"]
        Final["public/outputs/"]
    end

    RawVideo --> FFmpeg
    FFmpeg --> Middle["中间视频"]
    Middle --> Remotion
    Remotion --> Final
```

### 5.2 指令到引擎的映射

| 指令类型 | 引擎 | 处理内容 |
|----------|------|----------|
| `crop` | ffmpeg | 裁剪指定时间段 |
| `splitClip` | ffmpeg | 在指定时间点分割 |
| `deleteClip` | ffmpeg | 删除片段 |
| `changeSpeed` | ffmpeg | 变速处理 |
| `addText` | Remotion | 文字叠加层 |
| `addHighlight` | Remotion | 高亮区域标记 |
| `addTransition` | Remotion | 转场动画 |
| `seek` | 前端 | 跳转播放位置 |
| `confirmPlan` | 前端 | 确认编辑计划 |
| `render` | 后端 | 触发完整渲染 |

---

## 6. API 数据流

### 6.1 主要 API 端点

```mermaid
flowchart LR
    subgraph Endpoints["API 端点"]
        Upload["POST /api/video/upload"]
        Chat["POST /api/chat"]
        Preview["POST /api/preview"]
        Render["POST /api/render"]
        Status["GET /api/render/[jobId]"]
    end

    subgraph Handlers["处理器"]
        UploadH["上传处理器"]
        ChatH["对话处理器"]
        PreviewH["预览处理器"]
        RenderH["渲染处理器"]
    end

    Upload --> UploadH
    Chat --> ChatH
    Preview --> PreviewH
    Render --> RenderH
    Status --> RenderH
```

### 6.2 请求/响应模式

```mermaid
sequenceDiagram
    participant C as 客户端
    participant API as API Route
    participant AI as AI 服务
    participant FF as ffmpeg
    participant RM as Remotion

    C->>API: POST /api/chat
    API->>AI: 发送消息 + 上下文
    AI-->>API: 返回指令方案
    API-->>C: {response, actions}

    C->>API: POST /api/preview
    API->>FF: 预处理视频
    API->>RM: 渲染预览
    RM-->>API: 预览URL
    API-->>C: {previewUrl, isFullRender}

    C->>API: POST /api/render
    API->>FF: 执行底层操作
    API->>RM: 渲染完整视频
    API-->>C: {jobId, status}
```

---

## 7. 文件结构与组件对应

```mermaid
graph TD
    subgraph Root["项目根目录"]
        Src["src/"]
        Docs["docs/"]
        Public["public/"]
    end

    subgraph Src["src/"]
        App["app/"]
        Components["components/"]
        Lib["lib/"]
        Stores["stores/"]
    end

    subgraph App["app/"]
        API["api/"]
        Layout["layout.tsx"]
        Page["page.tsx"]
    end

    subgraph API["api/"]
        VideoAPI["video/"]
        ChatAPI["chat/"]
        RenderAPI["render/"]
    end

    subgraph Components["components/"]
        Editor["Editor/"]
        VideoPlayer["VideoPlayer/"]
        ChatPanel["ChatPanel/"]
        UploadZone["UploadZone/"]
    end

    subgraph Lib["lib/"]
        Instructions["instructions/"]
        Remotion["remotion/"]
        AI["ai/"]
        Video["video/"]
    end

    subgraph Stores["stores/"]
        EditorStore["editorStore.ts"]
    end

    Editor --> EditorStore
    VideoPlayer --> EditorStore
    ChatPanel --> EditorStore
    Instructions -->|ffmpeg| Video
    Instructions -->|remotion| Remotion
```
