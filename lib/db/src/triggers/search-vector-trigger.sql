CREATE OR REPLACE FUNCTION update_content_node_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('german', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('german', coalesce(NEW.display_code, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_content_nodes_search_vector ON content_nodes;

CREATE TRIGGER trg_content_nodes_search_vector
BEFORE INSERT OR UPDATE OF title, display_code ON content_nodes
FOR EACH ROW
EXECUTE FUNCTION update_content_node_search_vector();

UPDATE content_nodes SET search_vector =
  setweight(to_tsvector('german', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('german', coalesce(display_code, '')), 'B')
WHERE search_vector IS NULL
   OR search_vector IS DISTINCT FROM (
     setweight(to_tsvector('german', coalesce(title, '')), 'A') ||
     setweight(to_tsvector('german', coalesce(display_code, '')), 'B')
   );
