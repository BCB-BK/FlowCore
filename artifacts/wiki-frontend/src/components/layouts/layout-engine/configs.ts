import {
  Building2, ArrowLeftRight, Users, ClipboardList, ShieldCheck, Link2,
  Target, BookOpen, Ban, Zap, PackageOpen, ListChecks, PackageCheck,
  History, FileStack, GraduationCap, Clock, Brain, Heart, BarChart3,
  Monitor, Wallet, Shield, BookMarked, Gavel,
  FileText, LayoutDashboard, ShieldAlert, Wrench, ListOrdered, CheckCircle,
  List, SearchCheck, FileCheck, GitBranch, Server, Layers, Database,
  Lock, Settings, Dumbbell, ClipboardCheck, MessageSquare, Calendar,
  ArrowRight, CheckCircle2, Flag, Cpu, AlertCircle, Info,
} from "lucide-react";
import type { LayoutConfig } from "./types";

export const areaOverviewConfig: LayoutConfig = {
  rows: [
    { key: "description", component: "editable", label: "Beschreibung", description: "Aufgaben und Zuständigkeiten des Bereichs", icon: Building2, iconColor: "text-primary", emptyText: "Noch keine Beschreibung" },
    { key: "structure", component: "editable", label: "Aufbauorganisation", description: "Organisatorischer Aufbau und Rollenverteilung", icon: Users, iconColor: "text-blue-600", emptyText: "Noch keine Aufbauorganisation dokumentiert" },
    { key: "interfaces", component: "editable", label: "Schnittstellen", description: "Zusammenarbeit mit anderen Bereichen", icon: ArrowLeftRight, iconColor: "text-cyan-600", emptyText: "Keine Schnittstellen dokumentiert" },
  ],
};

export const processOverviewConfig: LayoutConfig = {
  pageTypeKey: "core_process_overview",
  rows: [
    { key: "overview", component: "editable", label: "Zweck & Geltungsbereich", icon: ClipboardList, iconColor: "text-primary" },
    { key: "process_steps", component: "process_steps_table" },
    { key: "sipoc", component: "sipoc_table" },
    { key: "sub_processes", component: "editable", label: "Unterprozesse & Detailseiten", description: "Verlinkung auf untergeordnete Prozessseiten und Verfahrensanweisungen", icon: Link2, iconColor: "text-blue-600", emptyText: "Keine Unterprozesse verknüpft", requirement: "recommended" },
    { key: "kpis", component: "kpi_table" },
    { key: "interfaces_systems", component: "interfaces_systems_table" },
    { key: "compliance", component: "editable", label: "Normbezug & Compliance", icon: ShieldCheck, iconColor: "text-red-600", emptyText: "Kein Normbezug definiert" },
    { key: "risks", component: "risks_controls_table" },
  ],
};

export const processPageTextConfig: LayoutConfig = {
  rows: [
    { key: "trigger", component: "editable", label: "Auslöser & Eingaben", description: "Was löst den Prozess aus und welche Eingaben werden benötigt?", icon: Zap, iconColor: "text-yellow-600", emptyText: "Noch keine Auslöser definiert" },
    { key: "procedure", component: "editable", label: "Ablauf", description: "Verfahrensschritte & RACI", icon: ListChecks, iconColor: "text-blue-600", emptyText: "Noch keine Verfahrensschritte dokumentiert" },
    [
      { key: "outputs", component: "editable", label: "Ergebnisse & Ausgaben", description: "Was liefert der Prozess als Ergebnis?", icon: PackageCheck, iconColor: "text-green-600", emptyText: "Keine Ergebnisse definiert" },
      { key: "interfaces", component: "editable", label: "Schnittstellen", description: "Systeme & Dokumente", icon: ArrowLeftRight, iconColor: "text-purple-600", emptyText: "Keine Schnittstellen definiert" },
    ],
  ],
};

export const processPageGraphicConfig: LayoutConfig = {
  rows: [
    { key: "diagram", component: "swimlane_diagram" },
    { key: "description", component: "editable", label: "Erläuterung", description: "Textuelle Beschreibung zum Diagramm", icon: FileText, iconColor: "text-blue-600", emptyText: "Noch keine Erläuterung" },
    { key: "legend", component: "editable", label: "Legende & Symbole", description: "Erklärung der verwendeten Symbole und Farben", icon: List, iconColor: "text-amber-600", emptyText: "Keine Legende definiert" },
  ],
};

export const procedureConfig: LayoutConfig = {
  pageTypeKey: "procedure_instruction",
  rows: [
    { key: "purpose", component: "editable", label: "Zweck", description: "Zweck und Ziel der Verfahrensanweisung", icon: Target, iconColor: "text-primary", emptyText: "Noch kein Zweck definiert", requirement: "required" },
    [
      { key: "scope", component: "editable", label: "Geltungsbereich", description: "Für wen und wo gilt diese Anweisung?", icon: BookOpen, iconColor: "text-blue-600", emptyText: "Noch kein Geltungsbereich definiert", requirement: "required" },
      { key: "exclusions", component: "editable", label: "Ausschlüsse", description: "Was wird explizit NICHT durch diese Anweisung geregelt?", icon: Ban, iconColor: "text-gray-500", emptyText: "Keine Ausschlüsse definiert", requirement: "recommended" },
    ],
    { key: "sipoc_light", component: "sipoc_table" },
    [
      { key: "trigger", component: "editable", label: "Auslöser & Vorbedingungen", description: "Was löst das Verfahren aus?", icon: Zap, iconColor: "text-yellow-600", emptyText: "Noch keine Auslöser definiert" },
      { key: "inputs", component: "editable", label: "Eingaben & Voraussetzungen", description: "Benötigte Dokumente, Daten und Ressourcen", icon: PackageOpen, iconColor: "text-indigo-600", emptyText: "Noch keine Eingaben definiert" },
    ],
    { key: "swimlane", component: "swimlane_diagram" },
    { key: "responsibilities", component: "raci_matrix" },
    { key: "interfaces", component: "interfaces_systems_table" },
    { key: "outputs", component: "editable", label: "Ergebnisse & Ausgaben", description: "Was wird durch das Verfahren erzeugt?", icon: PackageCheck, iconColor: "text-green-600", emptyText: "Keine Ergebnisse definiert" },
    { key: "risks", component: "risks_controls_table" },
    { key: "kpis", component: "kpi_table" },
    { key: "compliance", component: "editable", label: "Normbezug & Compliance", description: "Regulatorische Anforderungen, Normreferenzen und gesetzliche Vorgaben", icon: ShieldCheck, iconColor: "text-red-600", emptyText: "Kein Normbezug definiert", requirement: "recommended" },
    { key: "relations", component: "editable", label: "Verknüpfungen & Querverweise", description: "Verknüpfte Prozesse, übergeordnete Dokumente und abhängige Seiten", icon: Link2, iconColor: "text-cyan-600", emptyText: "Keine Verknüpfungen dokumentiert", requirement: "recommended" },
    { key: "changelog", component: "editable", label: "Änderungshistorie", description: "Dokumentierte Änderungen mit Datum und Verantwortlichem", icon: History, iconColor: "text-gray-500", emptyText: "Keine Änderungen dokumentiert", requirement: "recommended" },
  ],
};

export const roleProfileConfig: LayoutConfig = {
  pageTypeKey: "role_profile",
  rows: [
    { key: "role_definition", component: "editable", label: "Zielsetzung & Einordnung", description: "Stellenziel, organisatorische Einordnung und Kernauftrag", icon: Target, iconColor: "text-purple-600", emptyText: "Noch keine Zielsetzung definiert", requirement: "required" },
    { key: "core_tasks", component: "editable", label: "Kernaufgaben", description: "Die 5–8 wichtigsten Aufgaben der Stelle mit Gewichtung", icon: ClipboardList, iconColor: "text-orange-600", emptyText: "Noch keine Kernaufgaben definiert", requirement: "required" },
    { key: "responsibilities", component: "competency_areas" },
    [
      { key: "budget_authority", component: "editable", label: "Budget- & Personalverantwortung", description: "Budgetrahmen, Personalführung und Weisungsbefugnisse", icon: Wallet, iconColor: "text-emerald-600", emptyText: "—", requirement: "recommended" },
      { key: "routines", component: "editable", label: "Routinen & wiederkehrende Termine", description: "Regelmäßige Aufgaben, Meetings und Berichtspflichten", icon: Clock, iconColor: "text-blue-600", emptyText: "—", requirement: "recommended" },
    ],
    [
      { key: "competencies_professional", component: "editable", label: "Fachliche Kompetenzen", description: "Fachliche Qualifikationen, Ausbildung und Zertifizierungen", icon: GraduationCap, iconColor: "text-blue-600", emptyText: "—", requirement: "recommended" },
      { key: "competencies_methodical", component: "editable", label: "Methodische Kompetenzen", description: "Methodenkenntnisse und analytische Fähigkeiten", icon: Brain, iconColor: "text-indigo-600", emptyText: "—" },
    ],
    [
      { key: "competencies_social", component: "editable", label: "Soziale Kompetenzen", description: "Kommunikation, Teamfähigkeit und Führungskompetenzen", icon: Users, iconColor: "text-teal-600", emptyText: "—" },
      { key: "competencies_personal", component: "editable", label: "Persönliche Kompetenzen", description: "Persönliche Eigenschaften und Selbstmanagement", icon: Heart, iconColor: "text-rose-600", emptyText: "—" },
    ],
    { key: "success_metrics", component: "editable", label: "Messerfolg & Leistungskriterien", description: "Woran wird der Erfolg der Stelle gemessen?", icon: BarChart3, iconColor: "text-green-600", emptyText: "Keine Leistungskriterien definiert", requirement: "recommended" },
    [
      { key: "tools", component: "editable", label: "Arbeitsmittel & Systeme", description: "IT-Systeme, Tools und Arbeitsmittel", icon: Monitor, iconColor: "text-gray-600", emptyText: "—" },
      { key: "data_protection", component: "editable", label: "Datenschutz & Vertraulichkeit", description: "Umgang mit sensiblen Daten und Vertraulichkeitspflichten", icon: ShieldCheck, iconColor: "text-red-600", emptyText: "—" },
    ],
    { key: "working_model", component: "editable", label: "Arbeitszeitmodell & Arbeitsort", description: "Arbeitszeitregelung, Homeoffice, Reiseanteil", icon: Building2, iconColor: "text-amber-600", emptyText: "—" },
    { key: "interfaces", component: "editable", label: "Zusammenarbeit & Schnittstellen", description: "Interne und externe Kooperationspartner", icon: ArrowLeftRight, iconColor: "text-cyan-600", emptyText: "Keine Schnittstellen dokumentiert", requirement: "recommended" },
  ],
  legacyFields: [
    {
      key: "qualifications",
      showWhen: (f) => Boolean(f.qualifications) && !f.competencies_professional,
      label: "Qualifikationen & Anforderungen (Legacy)",
      description: "Fachliche und persönliche Anforderungen – bitte in die neuen Kompetenzfelder überführen",
      icon: GraduationCap,
      iconColor: "text-gray-400",
    },
    {
      key: "authority",
      showWhen: (f) => Boolean(f.authority) && !f.budget_authority,
      label: "Befugnisse (Legacy)",
      description: "Entscheidungs- und Handlungsbefugnisse – bitte in Budget- & Personalverantwortung überführen",
      icon: Wallet,
      iconColor: "text-gray-400",
    },
  ],
};

export const policyConfig: LayoutConfig = {
  rows: [
    { key: "purpose", component: "editable", label: "Zweck", description: "Warum existiert diese Richtlinie?", icon: Target, iconColor: "text-primary", emptyText: "Noch kein Zweck erfasst" },
    { key: "scope", component: "editable", label: "Geltungsbereich", description: "Für wen und wo gilt die Richtlinie?", icon: BookOpen, iconColor: "text-blue-600", emptyText: "Noch kein Geltungsbereich definiert" },
    { key: "definitions", component: "editable", label: "Begriffe & Definitionen", description: "Klärung zentraler Begriffe", icon: BookMarked, iconColor: "text-indigo-600", emptyText: "Keine Begriffe definiert" },
    { key: "enforcement", component: "editable", label: "Durchsetzung & Konsequenzen", description: "Maßnahmen bei Nichteinhaltung", icon: Gavel, iconColor: "text-amber-600", emptyText: "Noch keine Durchsetzungsmaßnahmen definiert" },
  ],
};

export const dashboardConfig: LayoutConfig = {
  rows: [
    { key: "description", component: "editable", label: "Beschreibung", description: "Zweck und Kontext des Dashboards", icon: FileText, iconColor: "text-primary", emptyText: "Noch keine Beschreibung" },
    { key: "widgets", component: "editable", label: "Widgets", description: "Dashboard-Konfiguration und Widgets", icon: LayoutDashboard, iconColor: "text-purple-600", emptyText: "Noch keine Widgets konfiguriert" },
  ],
};

export const workInstructionConfig: LayoutConfig = {
  rows: [
    [
      { key: "purpose", component: "editable", label: "Zweck", description: "Warum existiert diese Arbeitsanweisung?", icon: Target, iconColor: "text-primary", emptyText: "Noch kein Zweck definiert" },
      { key: "scope", component: "editable", label: "Geltungsbereich", description: "Für wen und wo gilt diese Anweisung?", icon: BookOpen, iconColor: "text-blue-600", emptyText: "Noch kein Geltungsbereich definiert" },
    ],
    { key: "safety", component: "editable", label: "Sicherheitshinweise", description: "Arbeitsschutz und Sicherheitsvorgaben", icon: ShieldAlert, iconColor: "text-red-600", emptyText: "Keine Sicherheitshinweise" },
    { key: "materials", component: "editable", label: "Werkzeuge & Materialien", description: "Benötigte Werkzeuge, Materialien und Hilfsmittel", icon: Wrench, iconColor: "text-amber-600", emptyText: "Keine Werkzeuge/Materialien angegeben" },
    { key: "quality_criteria", component: "editable", label: "Qualitätskriterien", description: "Prüfmerkmale und Akzeptanzkriterien", icon: CheckCircle, iconColor: "text-green-600", emptyText: "Keine Qualitätskriterien definiert" },
  ],
};

export const checklistConfig: LayoutConfig = {
  pageTypeKey: "checklist",
  rows: [
    { key: "purpose", component: "editable", label: "Zweck & Anwendung", description: "Wann und wofür wird diese Checkliste eingesetzt?", icon: Target, iconColor: "text-primary", emptyText: "Noch kein Zweck definiert", requirement: "required" },
    { key: "instructions", component: "editable", label: "Anleitung", description: "Hinweise zur Durchführung", icon: Info, iconColor: "text-blue-600", emptyText: "Keine Durchführungshinweise" },
    { key: "checklist_items", component: "check_items_editor" },
    { key: "completion_criteria", component: "editable", label: "Abschlusskriterien", description: "Wann gilt die Checkliste als vollständig abgeschlossen?", icon: Flag, iconColor: "text-amber-600", emptyText: "Keine Abschlusskriterien definiert", requirement: "recommended" },
  ],
};

export const faqConfig: LayoutConfig = {
  pageTypeKey: "faq",
  rows: [
    { key: "summary", component: "editable", label: "Zusammenfassung", description: "Kurze Zusammenfassung des Themas", icon: FileText, iconColor: "text-primary", emptyText: "Noch keine Zusammenfassung", requirement: "required" },
    { key: "content", component: "qa_repeater" },
    { key: "related_topics", component: "editable", label: "Verwandte Themen", description: "Links zu verwandten Artikeln und Prozessen", icon: Link2, iconColor: "text-blue-600", emptyText: "Keine verwandten Themen verknüpft", requirement: "recommended" },
  ],
};

export const glossaryConfig: LayoutConfig = {
  pageTypeKey: "glossary",
  rows: [
    { key: "terms", component: "term_repeater" },
  ],
};

export const auditObjectConfig: LayoutConfig = {
  rows: [
    { key: "finding", component: "editable", label: "Feststellung", description: "Was wurde festgestellt?", icon: SearchCheck, iconColor: "text-red-600", emptyText: "Noch keine Feststellung dokumentiert" },
    { key: "evidence", component: "editable", label: "Nachweise", description: "Belege und Evidenz für die Feststellung", icon: FileCheck, iconColor: "text-blue-600", emptyText: "Noch keine Nachweise dokumentiert" },
    { key: "root_cause", component: "editable", label: "Ursachenanalyse", description: "Warum ist das Problem aufgetreten?", icon: GitBranch, iconColor: "text-purple-600", emptyText: "Keine Ursachenanalyse durchgeführt" },
    [
      { key: "corrective_action", component: "editable", label: "Korrekturmaßnahme", description: "Sofortmaßnahme zur Behebung", icon: Wrench, iconColor: "text-orange-600", emptyText: "Keine Korrekturmaßnahme definiert" },
      { key: "preventive_action", component: "editable", label: "Vorbeugemaßnahme", description: "Maßnahme zur Verhinderung des Wiederauftretens", icon: Shield, iconColor: "text-green-600", emptyText: "Keine Vorbeugemaßnahme definiert" },
    ],
    { key: "risks_controls", component: "risks_controls_table" },
    { key: "effectiveness_check", component: "editable", label: "Wirksamkeitsprüfung", description: "Wie wird die Wirksamkeit der Maßnahme überprüft?", icon: CheckCircle, iconColor: "text-emerald-600", emptyText: "Keine Wirksamkeitsprüfung definiert" },
  ],
};

export const interfaceDescriptionConfig: LayoutConfig = {
  rows: [
    { key: "overview", component: "editable", label: "Übersicht", description: "Zweck und Kontext der Schnittstelle", icon: ArrowLeftRight, iconColor: "text-primary", emptyText: "Noch keine Übersicht erfasst" },
    { key: "interfaces", component: "interfaces_systems_table" },
    { key: "data_flow", component: "editable", label: "Datenfluss", description: "Welche Daten werden in welche Richtung übertragen?", icon: Database, iconColor: "text-blue-600", emptyText: "Noch kein Datenfluss beschrieben" },
    [
      { key: "protocol", component: "editable", label: "Protokoll & Technik", description: "Technisches Protokoll, Format und Verbindungsdetails", icon: Cpu, iconColor: "text-purple-600", emptyText: "Keine technischen Details" },
      { key: "error_handling", component: "editable", label: "Fehlerbehandlung", description: "Verhalten bei Fehlern und Wiederanlauf", icon: AlertCircle, iconColor: "text-red-600", emptyText: "Keine Fehlerbehandlung definiert" },
    ],
    { key: "sla", component: "editable", label: "SLA & Verfügbarkeit", description: "Service Level Agreements und Verfügbarkeitsanforderungen", icon: Clock, iconColor: "text-green-600", emptyText: "Keine SLAs definiert" },
    { key: "responsibilities", component: "editable", label: "Verantwortlichkeiten", description: "Wer ist für welche Seite der Schnittstelle verantwortlich?", icon: Users, iconColor: "text-amber-600", emptyText: "Keine Verantwortlichkeiten zugeordnet" },
  ],
};

export const meetingProtocolConfig: LayoutConfig = {
  rows: [
    [
      { key: "participants", component: "editable", label: "Teilnehmer", description: "Anwesende und entschuldigte Teilnehmer", icon: Users, iconColor: "text-primary", emptyText: "Keine Teilnehmer erfasst" },
      { key: "agenda", component: "editable", label: "Tagesordnung", description: "Geplante Tagesordnungspunkte", icon: List, iconColor: "text-blue-600", emptyText: "Keine Tagesordnung erfasst" },
    ],
    { key: "decisions", component: "editable", label: "Entscheidungen", description: "Getroffene Entscheidungen mit Begründung", icon: Gavel, iconColor: "text-amber-600", emptyText: "Keine Entscheidungen erfasst" },
    { key: "action_items", component: "editable", label: "Maßnahmen / ToDos", description: "Vereinbarte Maßnahmen mit Verantwortlichem und Termin", icon: ClipboardList, iconColor: "text-orange-600", emptyText: "Keine Maßnahmen definiert" },
    { key: "next_meeting", component: "editable", label: "Nächster Termin", description: "Datum und Ort der nächsten Sitzung", icon: Calendar, iconColor: "text-green-600", emptyText: "Kein nächster Termin festgelegt" },
  ],
};

export const systemDocumentationConfig: LayoutConfig = {
  rows: [
    { key: "system_info", component: "editable", label: "Systeminformationen", description: "Grundlegende Systembeschreibung", icon: Server, iconColor: "text-primary", emptyText: "Noch keine Systeminformationen erfasst" },
    { key: "architecture", component: "editable", label: "Architektur & Komponenten", description: "Technische Architektur und Systemkomponenten", icon: Layers, iconColor: "text-purple-600", emptyText: "Keine Architektur dokumentiert" },
    { key: "interfaces", component: "interfaces_systems_table" },
    { key: "data_objects", component: "editable", label: "Datenobjekte", description: "Verwaltete Daten und Datenmodell", icon: Database, iconColor: "text-amber-600", emptyText: "Keine Datenobjekte dokumentiert" },
    { key: "access_rights", component: "editable", label: "Zugriffsrechte & Berechtigungen", description: "Rollen- und Berechtigungskonzept", icon: Lock, iconColor: "text-red-600", emptyText: "Keine Berechtigungen dokumentiert" },
    { key: "operations", component: "editable", label: "Betrieb & Wartung", description: "Betriebskonzept, SLA und Wartungsfenster", icon: Settings, iconColor: "text-green-600", emptyText: "Kein Betriebskonzept dokumentiert" },
  ],
};

export const trainingResourceConfig: LayoutConfig = {
  rows: [
    { key: "objectives", component: "editable", label: "Lernziele", description: "Was sollen die Teilnehmer nach der Schulung können?", icon: Target, iconColor: "text-primary", emptyText: "Noch keine Lernziele definiert" },
    { key: "prerequisites", component: "editable", label: "Voraussetzungen", description: "Erforderliche Vorkenntnisse und Vorbereitungen", icon: BookOpen, iconColor: "text-blue-600", emptyText: "Keine Voraussetzungen angegeben" },
    { key: "exercises", component: "editable", label: "Übungen & Praxisbeispiele", description: "Praktische Übungen und Beispiele zur Vertiefung", icon: Dumbbell, iconColor: "text-orange-600", emptyText: "Keine Übungen vorhanden" },
    { key: "assessment", component: "editable", label: "Lernkontrolle", description: "Methoden zur Überprüfung des Lernerfolgs", icon: ClipboardCheck, iconColor: "text-green-600", emptyText: "Keine Lernkontrolle definiert" },
    { key: "materials", component: "editable", label: "Materialien & Ressourcen", description: "Benötigte und ergänzende Materialien", icon: FileStack, iconColor: "text-amber-600", emptyText: "Keine Materialien angegeben" },
  ],
};

export const useCaseConfig: LayoutConfig = {
  rows: [
    [
      { key: "actors", component: "editable", label: "Akteure", description: "Beteiligte Personen und Systeme", icon: Users, iconColor: "text-primary", emptyText: "Noch keine Akteure definiert", required: true },
      { key: "preconditions", component: "editable", label: "Vorbedingungen", description: "Was muss erfüllt sein, bevor der Use Case startet?", icon: CheckCircle2, iconColor: "text-green-600", emptyText: "Noch keine Vorbedingungen definiert", required: true },
    ],
    { key: "alternative_flows", component: "editable", label: "Alternativabläufe", description: "Abweichungen vom Normalablauf", icon: GitBranch, iconColor: "text-amber-600", emptyText: "Keine Alternativabläufe dokumentiert" },
    { key: "postconditions", component: "editable", label: "Nachbedingungen", description: "Was gilt nach erfolgreicher Durchführung?", icon: Flag, iconColor: "text-purple-600", emptyText: "Keine Nachbedingungen definiert" },
  ],
};

export const LAYOUT_CONFIG_MAP: Record<string, LayoutConfig> = {
  area_overview: areaOverviewConfig,
  core_process_overview: processOverviewConfig,
  process_page_text: processPageTextConfig,
  process_page_graphic: processPageGraphicConfig,
  procedure_instruction: procedureConfig,
  role_profile: roleProfileConfig,
  policy: policyConfig,
  dashboard: dashboardConfig,
  work_instruction: workInstructionConfig,
  checklist: checklistConfig,
  faq: faqConfig,
  glossary: glossaryConfig,
  audit_object: auditObjectConfig,
  interface_description: interfaceDescriptionConfig,
  meeting_protocol: meetingProtocolConfig,
  system_documentation: systemDocumentationConfig,
  training_resource: trainingResourceConfig,
  use_case: useCaseConfig,
};
