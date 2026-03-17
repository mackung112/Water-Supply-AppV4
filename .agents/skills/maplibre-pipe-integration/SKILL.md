---
name: maplibre-pipe-integration
description: Guidelines for integrating MapLibre GL JS with PWA GIS pipe data into the Water Supply App.
---

# MapLibre GL + PWA Pipe Layer Integration

แนวทางการรวม MapLibre GL JS กับข้อมูลแนวท่อ (Pipe) จาก PWA GIS API เข้ากับแอพพลิเคชัน Water Supply AppV4

## 1. Library & Resources

- **MapLibre GL JS**: ใช้ `maplibre-gl` จาก unpkg CDN
  - JS: `https://unpkg.com/maplibre-gl/dist/maplibre-gl.js`
  - CSS: `https://unpkg.com/maplibre-gl/dist/maplibre-gl.css`
- **Base Map**: OpenStreetMap raster tiles (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`)
- **Pipe Data**: PWA GIS API vector tiles

## 2. PWA GIS API Configuration

```javascript
// API Key สำหรับเข้าถึง GIS Data ของการประปา
const PIPE_API_KEY = "uVo4Txm5cyqWTfNOBKGTGx2PRc7uzVYhE07hdE0MrN2BgkPbjxmUKWD70ZHVjG5k";

// Style URL - ข้อมูล style สำหรับแสดง pipe layers
const PIPE_STYLE_URL =
  "https://gisapi-gateway.pwa.co.th/api/2.0/resources/styles/pwa-styles/styles-std?api_key=" + PIPE_API_KEY;

// Tile URL - ข้อมูล vector tiles ของแนวท่อ (branch 5541021 = สาขาอยุธยา)
const PIPE_TILE_URL =
  "https://gisapi-gateway.pwa.co.th/api/2.0/resources/tiles/pwa-tiles/pwa-tile-pipe-b5541021?api_key=" + PIPE_API_KEY;

// Source Layer ID สำหรับ pipe data
const PIPE_SOURCE_LAYER = "665c60f8dd708e21f678ae25";

// Sprite & Glyphs สำหรับ symbol rendering
const PIPE_SPRITE = "https://gisdb.pwa.co.th/core/api/tiles/1.0-beta/sprite/65792edcd715b5ab12310280/sprites";
const PIPE_GLYPHS = "https://gisdb.pwa.co.th/core/tiles/fonts/{fontstack}/{range}.pbf";
```

## 3. Base Style Configuration

```javascript
const baseStyle = {
  version: 8,
  name: "PipeMapStyle",
  sprite: PIPE_SPRITE,
  glyphs: PIPE_GLYPHS,
  sources: {
    carto: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256
    }
  },
  layers: [
    { id: "carto-base", type: "raster", source: "carto" }
  ]
};
```

## 4. Loading Pipe Layers

ขั้นตอนการโหลดแนวท่อ:
1. สร้าง MapLibre map instance ด้วย base style (OSM)
2. ใน `map.on("load")` ให้ fetch style JSON จาก `PIPE_STYLE_URL`
3. เพิ่ม pipe vector source ด้วย `map.addSource("pipe", { type: "vector", url: PIPE_TILE_URL })`
4. Filter เฉพาะ layers ที่มีคำว่า "pipe" ในชื่อ
5. เพิ่ม layer เข้า map โดยเปลี่ยน source เป็น "pipe" และ source-layer เป็น `PIPE_SOURCE_LAYER`

```javascript
map.on("load", async () => {
  const res = await fetch(PIPE_STYLE_URL);
  const styleJSON = await res.json();

  map.addSource("pipe", {
    type: "vector",
    url: PIPE_TILE_URL
  });

  const pipeLayers = styleJSON.layers.filter(l =>
    l.id.toLowerCase().includes("pipe")
  );

  pipeLayers.forEach(layer => {
    map.addLayer({
      ...layer,
      id: "pipe-" + layer.id,
      source: "pipe",
      "source-layer": PIPE_SOURCE_LAYER
    });
  });
});
```

## 5. Pin / Marker Support

MapLibre GL ใช้ `maplibregl.Marker` สำหรับปักหมุด:

```javascript
// สร้าง marker
const marker = new maplibregl.Marker({ draggable: true })
  .setLngLat([lng, lat])
  .addTo(map);

// รับพิกัดเมื่อ drag จบ
marker.on('dragend', () => {
  const lngLat = marker.getLngLat();
  // อัพเดต input field
});

// คลิกแผนที่เพื่อปักหมุด
map.on('click', (e) => {
  const { lng, lat } = e.lngLat;
  marker.setLngLat([lng, lat]);
});
```

## 6. Default Center & Zoom

- Default Center: `[100.55, 14.35]` (อยุธยา)
- Default Zoom: `11` (ระดับจังหวัด/อำเภอ)
- Pin Zoom: `15` (ระดับหมู่บ้าน/ถนน)

## 7. Integration Notes

- **แทนที่ Leaflet**: เมื่อใช้ MapLibre ในส่วน "พิกัดสังเขป" ต้องใช้ MapLibre แทน Leaflet
- **NavigationControl**: เพิ่ม `map.addControl(new maplibregl.NavigationControl())` สำหรับ zoom/rotate
- **Container Resize**: ใช้ `map.resize()` เมื่อ container เปลี่ยนขนาด (แทน `invalidateSize()` ของ Leaflet)
- **Coordinate Format**: ใช้ `[lng, lat]` (MapLibre) แทน `[lat, lng]` (Leaflet) — **สำคัญมาก!**

## 8. Workflow & Documentation Standard
- **Explanation Language**: ALWAYS explain changes in **THAI language** (ภาษาไทย).
- **Walkthrough Generation**: Document changes in `walkthrough.md` after completing the task.
