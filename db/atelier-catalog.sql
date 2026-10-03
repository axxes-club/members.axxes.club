-- Additive catalog entry; preserves all existing products and Members editors.
INSERT INTO axxes_product(key,name,tagline,description,url,color,category,status,sso,icon,members_path,surface_in_members,sort_order)
VALUES('atelier','Atelier','A home for every idea.','Build and publish websites with your AXXES organization.','https://atelier.axxes.app','#d8a657','Work','beta',true,'Globe','/atelier',true,90)
ON CONFLICT(key) DO UPDATE SET name=EXCLUDED.name,tagline=EXCLUDED.tagline,description=EXCLUDED.description,url=EXCLUDED.url,color=EXCLUDED.color,category=EXCLUDED.category,status=EXCLUDED.status,sso=EXCLUDED.sso,icon=EXCLUDED.icon,members_path=EXCLUDED.members_path,surface_in_members=true,updated_at=now();
