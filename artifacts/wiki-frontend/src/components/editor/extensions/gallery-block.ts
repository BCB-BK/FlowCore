import { Node, mergeAttributes } from "@tiptap/react";
import type { MediaSourceType } from "./video-block";

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  source?: string;
  license?: string;
  sourceType?: MediaSourceType;
}

export interface GalleryBlockOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    galleryBlock: {
      setGalleryBlock: (attrs: {
        images?: GalleryImage[];
        columns?: number;
        caption?: string;
        layout?: "grid" | "masonry" | "carousel";
      }) => ReturnType;
    };
  }
}

export const GalleryBlock = Node.create<GalleryBlockOptions>({
  name: "galleryBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      images: {
        default: [] as GalleryImage[],
        parseHTML: (el: HTMLElement) => {
          const val = el.getAttribute("data-images");
          try {
            return val ? JSON.parse(val) : [];
          } catch {
            return [];
          }
        },
        renderHTML: (attrs: { images?: GalleryImage[] }) => {
          return attrs.images && attrs.images.length > 0
            ? { "data-images": JSON.stringify(attrs.images) }
            : {};
        },
      },
      columns: { default: 3 },
      caption: { default: "" },
      layout: { default: "grid" as "grid" | "masonry" | "carousel" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="gallery-block"]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "gallery-block" }),
    ];
  },

  addCommands() {
    return {
      setGalleryBlock:
        (attrs) =>
        ({
          commands,
        }: {
          commands: {
            insertContent: (content: Record<string, unknown>) => boolean;
          };
        }) =>
          commands.insertContent({
            type: this.name,
            attrs,
          }),
    };
  },
});
