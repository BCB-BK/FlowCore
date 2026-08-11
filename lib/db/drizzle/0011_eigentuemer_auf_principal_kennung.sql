-- Migration: Eigentuemerverweis auf die interne Personenkennung vereinheitlichen
--
-- content_nodes.owner_id war ein freies Textfeld ohne Fremdschluessel. Die
-- Personenauswahl im Formular liefert je nach Verfuegbarkeit von Microsoft Graph
-- die Entra-Objektkennung ODER die interne Kennung -- beides im selben Feld.
-- Gespeichert wurde, was ankam; abgefragt wird ueber die interne Kennung.
-- Folge in Produktion: 184 von 184 Eigentuemerverweisen unaufloesbar, 873
-- Abfragen mit 404, und der Eigentuemer einer vertraulichen Seite wurde von
-- confidentiality.service nie als solcher erkannt.
--
-- Diese Migration schreibt die Bestandswerte auf die interne Kennung um und
-- macht daraus einen von der Datenbank geprueften Verweis.
--
-- Sie ist wiederholbar: ist die Spalte bereits uuid, passiert nichts.
-- Sie bricht ab, statt Daten zu verwerfen, wenn ein Wert keiner Person
-- zuzuordnen ist.

DO $$
DECLARE
  spaltentyp   text;
  umgestellt   integer := 0;
  unaufloesbar integer := 0;
BEGIN
  SELECT data_type INTO spaltentyp
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = 'content_nodes'
     AND column_name  = 'owner_id';

  IF spaltentyp IS NULL THEN
    RAISE EXCEPTION 'Spalte content_nodes.owner_id nicht gefunden.';
  END IF;

  IF spaltentyp = 'uuid' THEN
    RAISE NOTICE 'owner_id ist bereits uuid -- nichts zu tun.';
    RETURN;
  END IF;

  -- 1. Entra-Objektkennungen auf die zugehoerige interne Kennung umschreiben.
  --    Beide Schreibweisen des Anbieters kommen im Bestand vor.
  UPDATE content_nodes n
     SET owner_id = p.id::text
    FROM principals p
   WHERE n.owner_id IS NOT NULL
     AND p.external_id = n.owner_id
     AND p.external_provider IN ('entra', 'entra_id');
  GET DIAGNOSTICS umgestellt = ROW_COUNT;
  RAISE NOTICE 'Auf die interne Kennung umgestellt: % Verweise', umgestellt;

  -- 2. Bleibt etwas uebrig, das keiner Person zuzuordnen ist, wird nicht
  --    stillschweigend geleert, sondern abgebrochen.
  SELECT count(*) INTO unaufloesbar
    FROM content_nodes n
   WHERE n.owner_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM principals p WHERE p.id::text = n.owner_id);

  IF unaufloesbar > 0 THEN
    RAISE EXCEPTION
      'Abbruch: % Eigentuemerverweise sind keiner Person zuzuordnen. '
      'Vor der Migration klaeren (Werte anzeigen mit: SELECT id, title, owner_id '
      'FROM content_nodes n WHERE owner_id IS NOT NULL AND NOT EXISTS '
      '(SELECT 1 FROM principals p WHERE p.id::text = n.owner_id)).', unaufloesbar;
  END IF;

  -- 3. Aus dem Textfeld einen geprueften Verweis machen.
  ALTER TABLE content_nodes
    ALTER COLUMN owner_id TYPE uuid USING owner_id::uuid;

  ALTER TABLE content_nodes
    ADD CONSTRAINT content_nodes_owner_id_principals_id_fk
    FOREIGN KEY (owner_id) REFERENCES principals(id) ON DELETE SET NULL;

  RAISE NOTICE 'owner_id ist jetzt uuid mit Fremdschluessel auf principals.';
END $$;
