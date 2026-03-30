import React from 'react';
import { Composition } from 'remotion';
import { VideoComposition } from './VideoComposition';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="VideoEditor"
      component={VideoComposition as unknown as React.FC<Record<string, unknown>>}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        videoSrc: '',
        overlays: [],
        fps: 30,
        width: 1920,
        height: 1080,
        durationInFrames: 300,
      }}
    />
  );
};
