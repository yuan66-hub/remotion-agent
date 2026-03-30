import type {
  TextAnimationType,
  TextAnimationConfig,
  RemotionTextParams,
  RemotionModifyTextParams,
} from '../types';

export interface EffectTemplate {
  name: string;
  description: string;
  position: { x: number; y: number };
  fontSize: number;
  color: string;
  entranceAnimation?: TextAnimationType;
  exitAnimation?: TextAnimationType;
  animationDuration?: number;
  animation?: TextAnimationConfig;
}

export const EFFECT_TEMPLATES: Record<string, EffectTemplate> = {
  subtitle: {
    name: 'subtitle',
    description: '字幕 — 底部居中，白色，fade 动画',
    position: { x: 0.5, y: 0.85 },
    fontSize: 32,
    color: '#FFFFFF',
    entranceAnimation: 'fade',
    exitAnimation: 'fade',
    animationDuration: 200,
  },
  'title-card': {
    name: 'title-card',
    description: '标题卡 — 居中，金色，scaleInBounce 动画',
    position: { x: 0.5, y: 0.5 },
    fontSize: 72,
    color: '#FFD700',
    entranceAnimation: 'scaleInBounce',
    exitAnimation: 'fade',
    animationDuration: 400,
  },
  'pop-annotation': {
    name: 'pop-annotation',
    description: '弹出注释 — 左上，青色，bounceIn 动画',
    position: { x: 0.2, y: 0.15 },
    fontSize: 36,
    color: '#00E5FF',
    entranceAnimation: 'bounceIn',
    exitAnimation: 'scaleOut',
    animationDuration: 350,
  },
  emphasis: {
    name: 'emphasis',
    description: '强调文字 — 居中，红色，springIn 动画',
    position: { x: 0.5, y: 0.5 },
    fontSize: 64,
    color: '#FF0000',
    entranceAnimation: 'springIn',
    exitAnimation: 'springOut',
    animationDuration: 500,
  },
  'lower-third': {
    name: 'lower-third',
    description: '下三分之一 — 左下，白色，slideUp 动画',
    position: { x: 0.3, y: 0.8 },
    fontSize: 28,
    color: '#FFFFFF',
    entranceAnimation: 'slideUp',
    exitAnimation: 'fade',
    animationDuration: 300,
  },
  watermark: {
    name: 'watermark',
    description: '水印 — 右下角，半透明白，fade 动画',
    position: { x: 0.85, y: 0.9 },
    fontSize: 24,
    color: 'rgba(255,255,255,0.5)',
    entranceAnimation: 'fade',
    exitAnimation: 'fade',
    animationDuration: 200,
  },
  'chapter-title': {
    name: 'chapter-title',
    description: '章节标题 — 居中偏上，白色，blurIn 动画',
    position: { x: 0.5, y: 0.3 },
    fontSize: 56,
    color: '#FFFFFF',
    entranceAnimation: 'blurIn',
    exitAnimation: 'blurOut',
    animationDuration: 600,
  },
  countdown: {
    name: 'countdown',
    description: '倒计时 — 居中，白色，scaleInBounce 动画',
    position: { x: 0.5, y: 0.5 },
    fontSize: 80,
    color: '#FFFFFF',
    entranceAnimation: 'scaleInBounce',
    exitAnimation: 'scaleOutBounce',
    animationDuration: 400,
  },
};

/**
 * Resolve template defaults merged with explicit params.
 * Explicit params override template defaults.
 */
export function resolveTemplate<T extends RemotionTextParams | RemotionModifyTextParams>(
  params: T & { template?: string },
): T {
  const { template, ...rest } = params;
  if (!template) return params;

  const tmpl = EFFECT_TEMPLATES[template];
  if (!tmpl) return params;

  // Build template defaults (only visual style fields)
  const defaults: Record<string, unknown> = {
    position: tmpl.position,
    fontSize: tmpl.fontSize,
    color: tmpl.color,
  };
  if (tmpl.entranceAnimation) defaults.entranceAnimation = tmpl.entranceAnimation;
  if (tmpl.exitAnimation) defaults.exitAnimation = tmpl.exitAnimation;
  if (tmpl.animationDuration) defaults.animationDuration = tmpl.animationDuration;
  if (tmpl.animation) defaults.animation = tmpl.animation;

  // Merge: template defaults first, then explicit params override
  const merged = { ...defaults } as Record<string, unknown>;
  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }

  return merged as T;
}

/**
 * Generate template documentation for AI system prompt.
 */
export function generateTemplateDoc(): string {
  const rows = Object.entries(EFFECT_TEMPLATES)
    .map(([key, t]) => {
      const pos = `{x:${t.position.x}, y:${t.position.y}}`;
      const anim = t.entranceAnimation || 'none';
      return `| ${key} | ${t.description.split('—')[0].trim()} | ${pos} | ${t.fontSize} | ${t.color} | ${anim} |`;
    })
    .join('\n');

  return `## Effect Templates (快捷模板)
Use "template" field to apply predefined styles. Explicit params override template defaults.

| Template | Description | Position | Size | Color | Animation |
|----------|-------------|----------|------|-------|-----------|
${rows}

Example: {"type":"addText","params":{"template":"subtitle","startTime":2,"endTime":5,"text":"Hello"}}
Example with override: {"type":"addText","params":{"template":"subtitle","startTime":2,"endTime":5,"text":"Hello","color":"#FFD700"}}`;
}
