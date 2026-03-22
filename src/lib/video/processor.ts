import { getVideoMetadata, cropVideo, splitVideo, deleteClip, changeSpeed, changeVolume } from '@/lib/instructions/ffmpeg';
import { createTextOverlay, createHighlightOverlay, createTransitionOverlay, type Overlay } from '@/lib/instructions/remotion';
import type { Instruction, RemotionTextParams, RemotionHighlightParams } from '@/lib/instructions/types';
import path from 'path';
import fs from 'fs';

export interface VideoInput {
  id: string;
  path: string;
  duration: number;
  width: number;
  height: number;
}

export class VideoProcessor {
  private input: VideoInput;
  private overlays: Overlay[] = [];
  private outputDir: string;

  constructor(input: VideoInput, outputDir: string) {
    this.input = input;
    this.outputDir = outputDir;
  }

  static async fromFile(filePath: string, outputDir: string): Promise<VideoProcessor> {
    console.log('[VideoProcessor.fromFile] Getting metadata for:', filePath)
    const metadata = await getVideoMetadata(filePath);
    console.log('[VideoProcessor.fromFile] Metadata:', metadata)
    const id = path.basename(filePath, path.extname(filePath));
    return new VideoProcessor(
      {
        id,
        path: filePath,
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
      },
      outputDir
    );
  }

  getMetadata() {
    return this.input;
  }

  addOverlay(instruction: Instruction): void {
    switch (instruction.type) {
      case 'addText':
        this.overlays.push(createTextOverlay(instruction.params as unknown as RemotionTextParams));
        break;
      case 'addHighlight':
        this.overlays.push(createHighlightOverlay(instruction.params as unknown as RemotionHighlightParams));
        break;
      case 'addTransition':
        this.overlays.push(createTransitionOverlay({
          startTime: instruction.params.startTime as number,
          endTime: instruction.params.endTime as number,
          effect: (instruction.params.effect || instruction.params.type) as 'fade' | 'dissolve' | 'slide' | 'fade-blur' | 'dissolve-zoom' | 'slide-rotate',
        }));
        break;
    }
  }

  getOverlays() {
    return this.overlays;
  }

  async executeInstruction(instruction: Instruction): Promise<string> {
    const { type, params } = instruction;
    const inputPath = this.input.path;
    const outputName = `${this.input.id}_${type}_${Date.now()}.mp4`;
    const outputPath = path.join(this.outputDir, outputName);

    switch (type) {
      case 'crop':
        await cropVideo(inputPath, outputPath, {
          startTime: params.startTime as number,
          endTime: params.endTime as number,
        });
        break;

      case 'splitClip':
        await splitVideo(inputPath, this.outputDir, {
          startTime: params.startTime as number,
          endTime: params.endTime as number,
        });
        return path.join(this.outputDir, `split_${params.startTime}_${params.endTime}.mp4`);

      case 'deleteClip':
        await deleteClip(inputPath, outputPath, [{
          start: params.startTime as number,
          end: params.endTime as number,
        }]);
        break;

      case 'changeSpeed':
        await changeSpeed(inputPath, outputPath, {
          startTime: params.startTime as number,
          endTime: params.endTime as number,
          speed: params.speed as number,
        });
        break;

      case 'changeVolume':
        await changeVolume(inputPath, outputPath, {
          startTime: params.startTime as number,
          endTime: params.endTime as number,
          volume: params.volume as number,
        });
        break;

      default:
        throw new Error(`Unsupported instruction type: ${type}`);
    }

    return outputPath;
  }
}

export async function processVideoUpload(
  file: Buffer,
  filename: string,
  uploadDir: string,
  outputDir: string
): Promise<{ id: string; path: string; metadata: VideoInput }> {
  const id = `${Date.now()}_${path.basename(filename, path.extname(filename))}`;
  const ext = path.extname(filename);
  const outputPath = path.join(uploadDir, `${id}${ext}`);

  await fs.promises.mkdir(uploadDir, { recursive: true });
  await fs.promises.mkdir(outputDir, { recursive: true });

  await fs.promises.writeFile(outputPath, file);

  const metadata = await getVideoMetadata(outputPath);

  return {
    id,
    path: outputPath,
    metadata: {
      id,
      path: outputPath,
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
    },
  };
}
