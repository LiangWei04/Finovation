interface VideoTileProps {
  title: string;
  channel: string;
  metadata: string;
  duration: string;
  accent: string;
}

export function VideoTile({ title, channel, metadata, duration, accent }: VideoTileProps) {
  return (
    <article className="group">
      <div className="rb-thumbnail relative">
        <div className={`h-full w-full bg-gradient-to-br ${accent}`} />
        <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium leading-4 text-white">{duration}</span>
      </div>
      <div className="mt-3 grid grid-cols-[36px_minmax(0,1fr)] gap-3">
        <div className="h-9 w-9 rounded-full bg-broadcast-surface" aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-medium leading-5 text-broadcast-text">{title}</h3>
          <p className="mt-1 truncate text-sm leading-5 text-broadcast-muted">{channel}</p>
          <p className="text-xs leading-4 text-broadcast-muted">{metadata}</p>
        </div>
      </div>
    </article>
  );
}
