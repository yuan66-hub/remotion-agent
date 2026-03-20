import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

export interface CropOptions {
  startTime: number;
  endTime: number;
}

export async function cropVideo(
  inputPath: string,
  outputPath: string,
  options: CropOptions
): Promise<void> {
  const { startTime, endTime } = options;
  const duration = endTime - startTime;

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

export async function splitVideo(
  inputPath: string,
  outputDir: string,
  options: CropOptions
): Promise<string[]> {
  const { startTime, endTime } = options;
  const outputPath = path.join(outputDir, `split_${startTime}_${endTime}.mp4`);

  await cropVideo(inputPath, outputPath, { startTime, endTime });
  return [outputPath];
}

export async function deleteClip(
  inputPath: string,
  outputPath: string,
  keepRanges: Array<{ start: number; end: number }>
): Promise<void> {
  // For simplicity, we'll concatenate the kept ranges
  // This is a basic implementation - a full implementation would handle more complex cases
  if (keepRanges.length === 0) {
    throw new Error('No ranges to keep specified');
  }

  const tempFiles: string[] = [];
  const outputDir = path.dirname(outputPath);

  // Extract each kept range
  for (let i = 0; i < keepRanges.length; i++) {
    const range = keepRanges[i];
    const tempOutput = path.join(outputDir, `temp_${i}.mp4`);
    tempFiles.push(tempOutput);

    await cropVideo(inputPath, tempOutput, { startTime: range.start, endTime: range.end });
  }

  // Concatenate all temp files
  const concatList = tempFiles.map(f => `file '${f}'`).join('\n');
  const listFile = path.join(outputDir, 'concat_list.txt');

  await fs.promises.writeFile(listFile, concatList);

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(listFile)
      .inputOption('-f concat')
      .inputOption('-safe 0')
      .output(outputPath)
      .on('end', async () => {
        // Cleanup temp files
        for (const f of tempFiles) {
          await fs.promises.unlink(f).catch(() => {});
        }
        await fs.promises.unlink(listFile).catch(() => {});
        resolve();
      })
      .on('error', reject)
      .run();
  });
}

export async function changeSpeed(
  inputPath: string,
  outputPath: string,
  options: { startTime: number; endTime: number; speed: number }
): Promise<void> {
  const { startTime, endTime, speed } = options;
  const duration = endTime - startTime;
  const pts = 1 / speed;

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .videoFilter(`setpts=${pts}*PTS`)
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

export async function getVideoDuration(inputPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata.format.duration || 0);
    });
  });
}

export async function getVideoMetadata(inputPath: string): Promise<{
  duration: number;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) reject(err);
      else {
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        resolve({
          duration: metadata.format.duration || 0,
          width: videoStream?.width || 0,
          height: videoStream?.height || 0,
        });
      }
    });
  });
}
