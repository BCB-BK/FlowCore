import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Upload, Search, Image, FileText, Video, Loader2, Globe } from "lucide-react";
import { SharePointMediaBrowser } from "./SharePointMediaBrowser";

interface MediaAsset {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  classification: string;
  altText?: string | null;
  caption?: string | null;
  createdAt: string;
}

interface MediaLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (asset: MediaAsset) => void;
  filterType?: "image" | "video" | "file" | null;
  nodeId?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function MediaLibraryDialog({
  open,
  onOpenChange,
  onSelect,
  filterType,
  nodeId,
}: MediaLibraryDialogProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [caption, setCaption] = useState("");
  const [source, setSource] = useState("");
  const [copyright, setCopyright] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const { toast } = useToast();
  const apiBase = import.meta.env.BASE_URL + "api";

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (filterType === "image") params.set("classification", "image");
      if (filterType === "video") params.set("classification", "video");
      if (filterType === "file") params.set("classification", "document");

      const res = await fetch(`${apiBase}/media/assets?${params}`, {
        credentials: "include",
      });
      if (res.ok) {
        setAssets(await res.json());
      }
    } catch {
      toast({ variant: "destructive", title: "Fehler beim Laden der Medien" });
    } finally {
      setIsLoading(false);
    }
  }, [apiBase, searchQuery, filterType, toast]);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        if (title) formData.append("title", title);
        if (altText) formData.append("altText", altText);
        if (caption) formData.append("caption", caption);
        if (source) formData.append("source", source);
        if (sourceUrl) formData.append("sourceUrl", sourceUrl);
        if (copyright) formData.append("copyright", copyright);
        if (nodeId) formData.append("nodeId", nodeId);

        const res = await fetch(`${apiBase}/media/upload`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload fehlgeschlagen");

        const asset = await res.json();
        toast({ title: "Datei hochgeladen" });
        onSelect(asset);
        onOpenChange(false);
      } catch {
        toast({ variant: "destructive", title: "Upload fehlgeschlagen" });
      } finally {
        setIsUploading(false);
      }
    },
    [
      apiBase,
      title,
      altText,
      caption,
      source,
      sourceUrl,
      copyright,
      nodeId,
      onSelect,
      onOpenChange,
      toast,
    ],
  );

  const getIcon = (classification: string) => {
    if (classification === "image") return Image;
    if (classification === "video") return Video;
    return FileText;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Medienbibliothek</DialogTitle>
        </DialogHeader>

        <Tabs
          defaultValue="upload"
          onValueChange={(v) => {
            if (v === "browse") loadAssets();
          }}
        >
          <TabsList className="w-full">
            <TabsTrigger value="upload" className="flex-1">
              <Upload className="h-4 w-4 mr-1" />
              Hochladen
            </TabsTrigger>
            <TabsTrigger value="browse" className="flex-1">
              <Search className="h-4 w-4 mr-1" />
              Durchsuchen
            </TabsTrigger>
            <TabsTrigger value="sharepoint" className="flex-1">
              <Globe className="h-4 w-4 mr-1" />
              SharePoint
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="upload"
            className="space-y-3 mt-4 max-h-[60vh] overflow-y-auto pr-1"
          >
            <div className="space-y-1">
              <Label htmlFor="media-title">Titel</Label>
              <Input
                id="media-title"
                placeholder="Titel der Datei"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="alt-text">Alternativtext</Label>
              <Input
                id="alt-text"
                placeholder="Beschreibung für Barrierefreiheit"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="caption-text">Bildunterschrift</Label>
              <Input
                id="caption-text"
                placeholder="Optionale Bildunterschrift"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="media-source">Quelle</Label>
              <Input
                id="media-source"
                placeholder="Ursprüngliche Quelle (z.B. Fotograf, Verlag)"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="media-source-url">Quell-URL</Label>
              <Input
                id="media-source-url"
                placeholder="https://..."
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="media-copyright">Urheberrecht / Lizenz</Label>
              <Input
                id="media-copyright"
                placeholder="z.B. CC BY 4.0, © 2025 Bildungscampus"
                value={copyright}
                onChange={(e) => setCopyright(e.target.value)}
              />
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8">
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                Datei zum Hochladen auswählen (max. 50 MB)
              </p>
              <label>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={isUploading}
                  accept={
                    filterType === "image"
                      ? "image/*"
                      : filterType === "video"
                        ? "video/*"
                        : undefined
                  }
                />
                <Button asChild disabled={isUploading}>
                  <span>
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Wird hochgeladen...
                      </>
                    ) : (
                      "Datei auswählen"
                    )}
                  </span>
                </Button>
              </label>
            </div>
          </TabsContent>

          <TabsContent value="browse" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Input
                placeholder="Medien suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadAssets();
                }}
              />
              <Button variant="outline" onClick={loadAssets}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : assets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Keine Medien gefunden</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                {assets.map((asset) => {
                  const Icon = getIcon(asset.classification);
                  const isImage = asset.classification === "image";
                  return (
                    <button
                      key={asset.id}
                      className="flex flex-col items-center p-2 rounded-lg border hover:border-primary hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => {
                        onSelect(asset);
                        onOpenChange(false);
                      }}
                    >
                      {isImage ? (
                        <img
                          src={asset.url}
                          alt={asset.altText || asset.originalFilename}
                          className="h-20 w-full object-cover rounded"
                        />
                      ) : (
                        <div className="h-20 w-full flex items-center justify-center bg-muted rounded">
                          <Icon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <p className="text-xs truncate w-full mt-1 text-center">
                        {asset.originalFilename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(asset.sizeBytes)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sharepoint" className="mt-4">
            <SharePointMediaBrowser
              nodeId={nodeId}
              filterType={filterType}
              onSelect={(asset) => {
                onSelect(asset);
                onOpenChange(false);
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
