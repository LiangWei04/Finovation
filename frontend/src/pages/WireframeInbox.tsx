import { FileImage, Upload } from "lucide-react";
import { VideoTile } from "../components/VideoTile";

const previewTiles = [
  {
    title: "Dashboard overview wireframe placeholder",
    channel: "ESG Momentum Radar",
    metadata: "Ready for first sketch",
    duration: "0:45",
    accent: "from-[#ff0000] via-[#0f0f0f] to-[#606060]",
  },
  {
    title: "Company analysis page placeholder",
    channel: "ESG Momentum Radar",
    metadata: "Layout follows upcoming drawing",
    duration: "1:12",
    accent: "from-[#065fd4] via-[#f2f2f2] to-[#0f0f0f]",
  },
  {
    title: "Evidence explorer placeholder",
    channel: "ESG Momentum Radar",
    metadata: "Data wiring after wireframe",
    duration: "2:08",
    accent: "from-[#2ba640] via-[#f2f2f2] to-[#ff0000]",
  },
];

export function WireframeInbox() {
  return (
    <div className="space-y-8">
      <section className="max-w-3xl">
        <p className="text-sm font-medium leading-5 text-broadcast-red">Frontend reset complete</p>
        <h1 className="rb-page-title mt-1">Send the next hand-drawn wireframe</h1>
        <p className="mt-2 text-sm leading-5 text-broadcast-muted">
          This clean frontend is ready to turn each sketch into a web page. The layout will follow the wireframe, while colors, typography,
          navigation, chips, and content density follow Red Broadcast.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="inline-flex h-9 items-center gap-2 rounded-full bg-broadcast-text px-4 text-sm font-medium text-white">
            <Upload className="h-4 w-4" />
            Wireframe ready
          </button>
          <button type="button" className="inline-flex h-9 items-center gap-2 rounded-full border border-broadcast-border px-4 text-sm font-medium text-broadcast-text">
            <FileImage className="h-4 w-4" />
            Page-by-page build
          </button>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="rb-section-title">Route-ready canvas</h2>
            <p className="text-sm leading-5 text-broadcast-muted">Placeholder tiles use the content-first Red Broadcast card rhythm.</p>
          </div>
        </div>
        <div className="grid gap-x-4 gap-y-10 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {previewTiles.map((tile) => (
            <VideoTile key={tile.title} {...tile} />
          ))}
        </div>
      </section>
    </div>
  );
}
