import { SharePointExplorer } from "@/components/sharepoint/SharePointExplorer";

/**
 * Reine Ansicht der SharePoint-Ablagen in der Konnektor-Verwaltung: Teams,
 * Bibliotheken, Ordner und Dateien durchsehen, ohne etwas auszuwählen.
 * Verknüpft werden Dokumente dort, wo sie hingehören — auf der Wiki-Seite.
 */
export function SharePointBrowser() {
  return <SharePointExplorer select="none" />;
}
