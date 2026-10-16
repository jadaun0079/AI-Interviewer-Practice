export default function AudioWave({ active = false }: { active?: boolean }) {
  return (
    <div className="audio-visualizer" aria-hidden="true" style={{ opacity: active ? 1 : 0.4 }}>
      <span className="audio-bar" style={{ animationPlayState: active ? 'running' : 'paused' }} />
      <span className="audio-bar" style={{ animationPlayState: active ? 'running' : 'paused' }} />
      <span className="audio-bar" style={{ animationPlayState: active ? 'running' : 'paused' }} />
      <span className="audio-bar" style={{ animationPlayState: active ? 'running' : 'paused' }} />
      <span className="audio-bar" style={{ animationPlayState: active ? 'running' : 'paused' }} />
    </div>
  );
}
