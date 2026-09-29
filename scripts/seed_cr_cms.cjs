/**
 * Seeds the Colección Reyes-Veray tenant's CMS with the real content that
 * currently only exists in the legacy WordPress install.
 *
 * Idempotent: pages are upserted by (tenant_id, slug) and their blocks are
 * replaced wholesale, so re-running is safe.
 *
 * Run: node scripts/seed_cr_cms.cjs
 */
const fs = require("fs");
const path = require("path");

const env = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
const m = env.match(/^DATABASE_URL="?([^"\n]+)"?/m);
if (!m) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}
const { neon } = require("@neondatabase/serverless");
const sql = neon(m[1]);

const TENANT = "coleccion-reyes-veray";

/** Real copy, taken from the WordPress REST API of coleccionreyesveray.com. */
const EXHIBITION_INTRO = [
  "El viernes 8 de agosto de 2008 a las 8 de la noche el Museo de Arte Contemporáneo de Puerto Rico abrió sus puertas al público con la Exposición de la Colección Reyes-Veray. El arquitecto Otto Octavio Reyes Casanova y su esposa Vionnette Veray compartieron con la comunidad parte de su valiosa colección de arte, la cual comprende sobre 1,800 obras que por más de 40 años han coleccionado.",
  "La exposición presenta 153 obras de 4 generaciones de artistas puertorriqueños/as. Las obras seleccionadas representan ocho diferentes medios, entre ellos: pinturas, grabados, esculturas, fotografías y medios mixtos.",
  "A la actividad de la noche inagural asistieron alrededor de 2,000 personas entre las que se encontraban artistas de todas las generaciones en un ambiente muy ameno y familiar. Durante los 88 días de la exposición asistieron sobre 8,000 visitantes. El evento fue un éxito rotundo que se convirtió en una gran celebración del arte puertorriqueño.",
  "Como parte de este grandioso proyecto se ha creado un libro-catálogo de 504 páginas que incluye las 153 obras fotografiadas por John Betancourt, ensayos del Dr. Osiris Delgado Mercado, Enrique García Gutiérrez, Manuel Álvarez Lezama y Adlín Ríos Rigau. Cada obra esta acompañada por datos biográficos de cada artista y una breve anécdota, lo cual le da un atractivo adicional. Este libro-catálogo está a la venta en la tienda del Museo y por internet.",
  "Se presentan aquí fotografias de las maquetas preparadas un año antes de la exposición, del montaje, de las salas y de la interacción del público.",
];

const WP = "https://i0.wp.com/coleccionreyesveray.com/wp-content/uploads";

const EXHIBITION_SECTIONS = [
  ["Curaduría / Curatorship", `${WP}/2021/02/Screen-Shot-2021-02-16-at-2.57.16-PM.png?ssl=1`],
  ["Maquetas / Models", `${WP}/2021/02/Screen-Shot-2021-02-16-at-2.57.45-PM.png?ssl=1`],
  ["Montaje / Mounting", `${WP}/2021/02/Screen-Shot-2021-02-16-at-2.57.24-PM.png?ssl=1`],
  ["Salas / Galleries", `${WP}/2021/02/Screen-Shot-2021-02-16-at-2.55.47-PM.png?ssl=1`],
  ["Inauguración / Opening", `${WP}/2021/02/mac89.jpg?ssl=1`],
  ["Visitas / Visits", `${WP}/2021/02/IMG_1768-rotated.jpg?ssl=1`],
  ["Clausura / Closing", `${WP}/2021/02/Screen-Shot-2021-02-16-at-2.51.50-PM.png?ssl=1`],
];

const COLLECTOR_BIO = [
  "The Colección Reyes-Veray is the private archive of architect Otto Octavio Reyes Casanova and Vionnette Veray. Over more than forty years the two of them built a collection of roughly 1,800 works that stands as one of the most significant surveys of contemporary visual art in Puerto Rico.",
  "Guided by an architectural sensibility, the collection emphasizes structure, space and the raw narrative of the human condition. It is not an aggregation of objects but a deliberate cultural thesis.",
  "In 2008 a selection of 153 works spanning four generations of Puerto Rican artists was shown at the Museo de Arte Contemporáneo de Puerto Rico, accompanied by a 504-page catalogue.",
];

const COLLECTOR_FACTS = [
  ["Architect", "Otto Octavio Reyes Casanova"],
  ["Collection founded", "Over 40 years"],
  ["Works in the archive", "c. 1,800"],
  ["Museum exhibition", "153 works, MAC Puerto Rico, 2008"],
];

const PAGES = [
  {
    title: "Exposición",
    slug: "exhibition",
    description: "The Colección Reyes-Veray in the Museo de Arte Contemporáneo de Puerto Rico.",
    metaTitle: "Exposición — Colección Reyes-Veray",
    metaDescription:
      "The 2008 Museo de Arte Contemporáneo de Puerto Rico exhibition of the Colección Reyes-Veray: 153 works, four generations of Puerto Rican artists.",
    sortOrder: 2,
    blocks: [
      {
        type: "heading",
        content: {
          text: "La Colección Reyes-Veray en el Museo de Arte Contemporáneo de Puerto Rico",
          level: "h1",
          alignment: "left",
        },
      },
      { type: "text", content: { html: EXHIBITION_INTRO.map((p) => `<p>${p}</p>`).join(""), alignment: "left" } },
      ...EXHIBITION_SECTIONS.map(([caption, url]) => ({
        type: "image",
        content: { url, caption, alt: caption, size: "large" },
      })),
    ],
  },
  {
    title: "El Coleccionista",
    slug: "about",
    description: "About the collector and the collection.",
    metaTitle: "El Coleccionista — Colección Reyes-Veray",
    metaDescription:
      "Otto Octavio Reyes Casanova and Vionnette Veray, and the private archive they assembled over forty years.",
    sortOrder: 3,
    blocks: [
      { type: "heading", content: { text: "Otto Octavio Reyes Casanova", level: "h1", alignment: "left" } },
      { type: "text", content: { html: COLLECTOR_BIO.map((p) => `<p>${p}</p>`).join(""), alignment: "left" } },
      {
        type: "text",
        content: {
          html:
            "<ul>" +
            COLLECTOR_FACTS.map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`).join("") +
            "</ul>",
          alignment: "left",
        },
      },
      {
        type: "cta",
        content: {
          text: "Ver el catálogo completo / Browse the catalogue",
          link: "/gallery",
          style: "outline",
          size: "sm",
          alignment: "left",
        },
      },
    ],
  },
  {
    title: "Contacto",
    slug: "contact",
    description: "Inquiries about works in the collection.",
    metaTitle: "Contacto — Colección Reyes-Veray",
    metaDescription: "Contact and acquisition inquiries for the Colección Reyes-Veray.",
    sortOrder: 4,
    blocks: [
      { type: "heading", content: { text: "Contacto / Contact", level: "h1", alignment: "left" } },
      {
        type: "text",
        content: {
          html: `<p>For inquiries regarding works in the collection, please write to <a href="mailto:ottoreyes88@gmail.com">ottoreyes88@gmail.com</a>.</p>`,
          alignment: "left",
        },
      },
      {
        type: "contactForm",
        content: {
          fields: [
            { name: "name", type: "text", required: true, placeholder: "Nombre / Name" },
            { name: "email", type: "email", required: true, placeholder: "Email" },
            { name: "artwork", type: "text", required: false, placeholder: "Obra / Artwork" },
            { name: "message", type: "textarea", required: true, placeholder: "Mensaje / Message" },
          ],
          submitText: "Enviar / Send",
          recipientEmail: "ottoreyes88@gmail.com",
        },
      },
    ],
  },
];

async function main() {
  const t = await sql`SELECT id FROM tenants WHERE slug = ${TENANT}`;
  if (!t.length) {
    console.error("Tenant not found:", TENANT);
    process.exit(1);
  }
  const tenantId = t[0].id;

  for (const p of PAGES) {
    const [row] = await sql`
      INSERT INTO pages (tenant_id, title, slug, description, meta_title, meta_description,
                         is_published, is_homepage, show_navigation, show_footer, sort_order, published_at)
      VALUES (${tenantId}, ${p.title}, ${p.slug}, ${p.description}, ${p.metaTitle},
              ${p.metaDescription}, true, false, true, true, ${p.sortOrder}, now())
      ON CONFLICT (tenant_id, slug) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        meta_title = EXCLUDED.meta_title,
        meta_description = EXCLUDED.meta_description,
        is_published = true,
        sort_order = EXCLUDED.sort_order,
        published_at = now(),
        updated_at = now()
      RETURNING id
    `;
    const pageId = row.id;

    await sql`DELETE FROM page_blocks WHERE page_id = ${pageId}`;

    let order = 0;
    for (const b of p.blocks) {
      await sql`
        INSERT INTO page_blocks (page_id, tenant_id, type, content, settings, sort_order, is_visible)
        VALUES (${pageId}, ${tenantId}, ${b.type}, ${JSON.stringify(b.content)}::jsonb, ${JSON.stringify({})}::jsonb, ${order++}, true)
      `;
    }
    console.log(`seeded /${p.slug}  (${p.blocks.length} blocks)`);
  }

  // The homepage is a page too, so the CMS owns the whole nav.
  const [home] = await sql`
    INSERT INTO pages (tenant_id, title, slug, description, meta_title, meta_description,
                       is_published, is_homepage, show_navigation, show_footer, sort_order, published_at)
    VALUES (${tenantId}, 'Portada', 'home', 'The Colección Reyes-Veray, private archive of Otto Octavio Reyes Casanova.',
            'Colección Reyes-Veray', 'Private collection archive of architect Otto Octavio Reyes Casanova and Vionnette Veray.',
            true, true, true, true, 1, now())
    ON CONFLICT (tenant_id, slug) DO UPDATE SET
      is_published = true, is_homepage = true, sort_order = 1, updated_at = now()
    RETURNING id
  `;
  const homeBlocks = await sql`SELECT count(*)::int AS n FROM page_blocks WHERE page_id = ${home.id}`;
  if (!homeBlocks[0].n) {
    await sql`
      INSERT INTO page_blocks (page_id, tenant_id, type, content, settings, sort_order, is_visible)
      VALUES (${home.id}, ${tenantId}, 'hero', ${JSON.stringify({
        title: "Colección Reyes-Veray",
        subtitle: "El archivo privado del arquitecto Otto Octavio Reyes Casanova",
        alignment: "left",
        overlay: true,
      })}::jsonb, ${JSON.stringify({})}::jsonb, 0, true)
    `;
  }
  console.log("seeded /home");

  // Website settings: claim the subdomain inside the axxes.club universe.
  await sql`
    INSERT INTO website_settings (tenant_id, subdomain, navigation_style, footer_style, show_powered_by, footer_text)
    VALUES (${tenantId}, 'coleccion-reyes-veray', 'horizontal', 'full', 'true',
            '© OTTO OCTAVIO REYES CASANOVA')
    ON CONFLICT (tenant_id) DO UPDATE SET
      subdomain = EXCLUDED.subdomain,
      footer_text = EXCLUDED.footer_text,
      updated_at = now()
  `;
  console.log("seeded website_settings");

  const check = await sql`SELECT slug, is_published, sort_order FROM pages WHERE tenant_id = ${tenantId} ORDER BY sort_order`;
  console.log("PAGES NOW:", JSON.stringify(check));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

