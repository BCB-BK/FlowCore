import { Node, mergeAttributes } from "@tiptap/react";

const ALLOWED_VIDEO_SOURCES = [
  "youtube.com",
  "youtu.be",
  "vimeo.com",
  "microsoft.com",
  "sharepoint.com",
  "stream.microsoft.com",
  "loom.com",
];

export function isAllowedVideoSource(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_VIDEO_SOURCES.some(
      (d) => parsed.hostname === d || parsed.hostname.endsWith(`.${d}`),
    );
  } catch {
    return false;
  }
}

export function getVideoEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname === "youtube.com" ||
      parsed.hostname === "www.youtube.com"
    ) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    if (parsed.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${parsed.pathname}`;
    }
    if (
      parsed.hostname === "vimeo.com" ||
      parsed.hostname === "www.vimeo.com"
    ) {
      const id = parsed.pathname.split("/").pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    return url;
  } catch {
    return null;
  }
}

export interface VideoBlockOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    videoBlock: {
      setVideoBlock: (attrs: { src: string; caption?: string }) => ReturnType;
    };
  }
}

export const VideoBlock = Node.create<VideoBlockOptions>({
  name: "videoBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      caption: { default: "" },
      width: { default: "100%" },
      height: { default: "315" },
      assetId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="video-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "video-block" }),
    ];
  },

  addCommands() {
    return {
      setVideoBlock:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
