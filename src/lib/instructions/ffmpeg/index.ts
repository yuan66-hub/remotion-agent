import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import fs from 'fs'

export interface CropOptions {
  startTime: number
  endTime: number
}

export async function cropVideo(
  inputPath: string,
  outputPath: string,
  options: CropOptions
): Promise<void> {
  const { startTime, endTime } = options
  const duration = endTime - startTime

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', err => reject(err))
      .run()
  })
}

export async function splitVideo(
  inputPath: string,
  outputDir: string,
  options: CropOptions
): Promise<string[]> {
  const { startTime, endTime } = options
  const outputPath = path.join(outputDir, `split_${startTime}_${endTime}.mp4`)

  await cropVideo(inputPath, outputPath, { startTime, endTime })
  return [outputPath]
}

export async function deleteClip(
  inputPath: string,
  outputPath: string,
  keepRanges: Array<{ start: number; end: number }>
): Promise<void> {
  // For simplicity, we'll concatenate the kept ranges
  // This is a basic implementation - a full implementation would handle more complex cases
  if (keepRanges.length === 0) {
    throw new Error('No ranges to keep specified')
  }

  const tempFiles: string[] = []
  const outputDir = path.dirname(outputPath)

  // Extract each kept range
  for (let i = 0; i < keepRanges.length; i++) {
    const range = keepRanges[i]
    const tempOutput = path.join(outputDir, `temp_${i}.mp4`)
    tempFiles.push(tempOutput)

    await cropVideo(inputPath, tempOutput, {
      startTime: range.start,
      endTime: range.end
    })
  }

  // Concatenate all temp files
  const concatList = tempFiles.map(f => `file '${f}'`).join('\n')
  const listFile = path.join(outputDir, 'concat_list.txt')

  await fs.promises.writeFile(listFile, concatList)

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(listFile)
      .inputOption('-f concat')
      .inputOption('-safe 0')
      .output(outputPath)
      .on('end', async () => {
        // Cleanup temp files
        for (const f of tempFiles) {
          await fs.promises.unlink(f).catch(() => {})
        }
        await fs.promises.unlink(listFile).catch(() => {})
        resolve()
      })
      .on('error', reject)
      .run()
  })
}

export async function changeSpeed(
  inputPath: string,
  outputPath: string,
  options: { startTime: number; endTime: number; speed: number }
): Promise<void> {
  // Ensure numeric types (API might send strings)
  const startTime = Number(options.startTime)
  const endTime = Number(options.endTime)
  const speed = Number(options.speed)

  console.log('[changeSpeed] Input (after Number conversion):', { startTime, endTime, speed, inputPath, originalTypes: { startTime: typeof options.startTime, endTime: typeof options.endTime, speed: typeof options.speed } })

  if (isNaN(startTime) || isNaN(endTime) || isNaN(speed)) {
    throw new Error(`Invalid parameters: startTime=${startTime}, endTime=${endTime}, speed=${speed}`)
  }

  // 如果 endTime <= 0 或 endTime <= startTime，使用整个视频的时长
  let actualEndTime = endTime

  if (endTime <= 0 || endTime <= startTime) {
    console.log('[changeSpeed] Getting video metadata for duration...')
    const metadata = await getVideoMetadata(inputPath)
    console.log('[changeSpeed] Metadata:', metadata)
    actualEndTime = metadata.duration
  }

  console.log('[changeSpeed] actualEndTime:', actualEndTime)
  const duration = actualEndTime - startTime
  console.log('[changeSpeed] duration:', duration)

  if (duration <= 0 || isNaN(duration)) {
    throw new Error(
      `Invalid time range: startTime=${startTime}, endTime=${actualEndTime}, duration=${duration}`
    )
  }

  // speed > 1 表示加速（视频变快），speed < 1 表示减速（视频变慢）
  // setpts = 1/speed，所以 speed=2 时 setpts=0.5，视频加速
  const pts = 1 / speed

  // 音频同步：使用 atempo 滤镜（范围 0.5-2.0），如果超出范围需要链式调用
  const audioFilters: string[] = []

  if (speed >= 0.5 && speed <= 2.0) {
    audioFilters.push(`atempo=${speed}`)
  } else if (speed > 2.0) {
    // atempo 最大值是 2.0，需要链式处理
    const atempo1 = 2.0
    const atempo2 = speed / 2.0
    audioFilters.push(`atempo=${atempo1},atempo=${atempo2}`)
  } else if (speed < 0.5) {
    // atempo 最小值是 0.5，需要链式处理
    const atempo1 = 0.5
    const atempo2 = speed / 0.5
    audioFilters.push(`atempo=${atempo1},atempo=${atempo2}`)
  }

  return new Promise((resolve, reject) => {
    const command = ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .videoFilter(`setpts=${pts}*PTS`)

    if (audioFilters.length > 0) {
      command.audioFilter(audioFilters.join(','))
    }

    command
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', err => reject(err))
      .run()
  })
}

export async function changeVolume(
  inputPath: string,
  outputPath: string,
  options: { startTime: number; endTime: number; volume: number }
): Promise<void> {
  const { startTime, endTime, volume } = options
  // volume 是倍数：0 = 静音，0.5 = 50%，1 = 100%，2 = 200%

  // 如果 endTime <= 0 或 endTime <= startTime，使用整个视频的时长
  let actualEndTime = endTime

  if (endTime <= 0 || endTime <= startTime) {
    // 需要获取视频时长
    const metadata = await getVideoMetadata(inputPath)
    actualEndTime = metadata.duration
  }

  const duration = actualEndTime - startTime

  if (duration <= 0) {
    throw new Error(
      `Invalid time range: startTime=${startTime}, endTime=${actualEndTime}`
    )
  }

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .audioFilters(`volume=${volume}`)
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', err => reject(err))
      .run()
  })
}

export async function getVideoDuration(inputPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) reject(err)
      else resolve(metadata.format.duration || 0)
    })
  })
}

export async function getVideoMetadata(inputPath: string): Promise<{
  duration: number
  width: number
  height: number
}> {
  console.log('[getVideoMetadata] Starting for path:', inputPath)
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        console.error('[getVideoMetadata] ffprobe error:', err)
        reject(err)
      } else {
        console.log('[getVideoMetadata] Raw metadata:', metadata)
        const videoStream = metadata.streams.find(s => s.codec_type === 'video')
        const result = {
          duration: metadata.format.duration || 0,
          width: videoStream?.width || 0,
          height: videoStream?.height || 0
        }
        console.log('[getVideoMetadata] Result:', result)
        resolve(result)
      }
    })
  })
}
