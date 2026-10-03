BEGIN;
CREATE OR REPLACE FUNCTION gangstarz_atelier_legacy_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE old_page uuid;new_page uuid;b record;
BEGIN
 IF TG_TABLE_NAME='pages' THEN
  IF TG_OP<>'INSERT' THEN old_page:=OLD.id;END IF;
  IF TG_OP<>'DELETE' THEN new_page:=NEW.id;END IF;
 ELSE
  IF TG_OP<>'INSERT' THEN old_page:=OLD.page_id;END IF;
  IF TG_OP<>'DELETE' THEN new_page:=NEW.page_id;END IF;
 END IF;
 -- Lock inactive bindings too: activating cutover waits for an in-flight legacy write.
 FOR b IN SELECT active FROM atelier_gangstarz_bindings WHERE source_page_id=old_page OR source_page_id=new_page FOR SHARE LOOP
  IF b.active THEN RAISE EXCEPTION 'This website is edited and published in Atelier' USING ERRCODE='55000';END IF;
 END LOOP;
 IF TG_OP='DELETE' THEN RETURN OLD;END IF;RETURN NEW;
END$$;
DO $$DECLARE tab text;BEGIN
 FOREACH tab IN ARRAY ARRAY['pages','page_blocks','website_drafts','website_publications','website_revisions'] LOOP
  IF to_regclass('public.'||tab) IS NOT NULL THEN
   EXECUTE format('DROP TRIGGER IF EXISTS gangstarz_atelier_legacy_guard ON %I',tab);
   EXECUTE format('CREATE TRIGGER gangstarz_atelier_legacy_guard BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION gangstarz_atelier_legacy_guard()',tab);
  END IF;
 END LOOP;
END$$;
REVOKE ALL ON FUNCTION gangstarz_atelier_legacy_guard() FROM PUBLIC;
COMMIT;
