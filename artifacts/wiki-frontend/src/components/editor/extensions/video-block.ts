import { Node, mergeAttributes } from "@tiptap/react";
import { EDITOR_CONFIG, isDomainAllowed } from "@/lib/editor-config";

export function isAllowedVideoSource(url: string): boolean {
  return isDomainAllowed(url, EDITOR_CONFIG.allowedVideoDomains);
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
      blockId: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-block-id"),
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.blockId ? { "data-block-id": attrs.blockId } : {},
      },
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

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "video-block" }),
    ];
  },

  addCommands() {
    return {
      setVideoBlock:
        (attrs: { src: string; caption?: string }) =>
        ({
          commands,
        }: {
          commands: {
            insertContent: (content: Record<string, unknown>) => boolean;
          };
        }) =>
          commands.insertContent({
            type: this.name,
            attrs: { ...attrs, blockId: crypto.randomUUID() },
          }),
    };
  },
});
