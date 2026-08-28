import { db } from "../src/lib/db";
import { tenants, products, assets } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";
import fs from "fs";

async function main() {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, "coleccion-reyes-veray")
  });

  if (!tenant) {
    console.error("Tenant not found.");
    process.exit(1);
  }

  const artworksPath = "/Users/admin/Developer/coleccion_reyes_veray_modern/frontend/src/data/artworks.json";
  const artworksJson = JSON.parse(fs.readFileSync(artworksPath, "utf-8"));
  
  console.log(`Found ${artworksJson.length} artworks. Syncing to MAC...`);

  let count = 0;
  for (const art of artworksJson) {
    // Insert images to DAM
    const damImages = [];
    let pos = 0;
    
    // We get high res urls from the frontend logic
    const highResImages = art.images.map((img: string) => {
      // Map it exactly how the frontend Maps it (Jetpack CDN)
      if (img.includes("/wp-content/uploads/")) {
        return `https://i0.wp.com/coleccionreyesveray.com${img}?ssl=1`;
      }
      return img;
    });

    for (const imgUrl of highResImages) {
       await db.insert(assets).values({
         tenantId: tenant.id,
         name: art.title,
         url: imgUrl,
         mimeType: "image/jpeg",
         category: "image",
         source: "url",
         altText: art.title,
       });
       damImages.push({ url: imgUrl, alt: art.title, position: pos++ });
    }

    // Insert Product
    await db.insert(products).values({
      tenantId: tenant.id,
      name: art.title,
      slug: art.url.replace("/index.html", "").replace(/^\/+/, ''), // strip leading slash and index.html
      description: art.description || "",
      status: "active",
      price: "0.00",
      images: damImages,
      metadata: {
        originalUrl: art.url,
      }
    });
    count++;
    if (count % 10 === 0) console.log(`Synced ${count}...`);
  }
  
  console.log("Successfully synced all artworks to MAC!");
  process.exit(0);
}

main();
