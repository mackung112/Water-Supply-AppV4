// ============================================
// 1. CONFIGURATION
// ============================================
const API_URL = CONFIG.API_URL;

window.onload = async function () {
    // 1. ตรวจสอบ URL
    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('id');

    if (!jobId) {
        alert("ไม่พบรหัสงาน (Job ID) ใน URL");
        return;
    }

    document.title = "ผังการติดตั้ง " + jobId;

    try {
        // 2. 🔥 NEW: ตรวจสอบ Cache ก่อน
        const cached = sessionStorage.getItem('REPORT_CACHE');
        let res;

        if (cached) {
            console.log('✅ Loading from cache...');
            res = JSON.parse(cached);
        } else {
            console.log('📡 Fetching from server...');
            // ดึงข้อมูล
            const response = await fetch(API_URL + "?action=getData");
            res = await response.json();

            if (res.status !== 'success') throw new Error(res.message);
        }

        const job = res.jobs.find(j => String(j.jobId) === String(jobId));
        if (!job) throw new Error("ไม่พบข้อมูลงาน ID: " + jobId);

        // 3. วาดหน้าจอ
        renderReport(job, res.personnel || []);

    } catch (error) {
        console.error(error);
        alert("เกิดข้อผิดพลาด: " + error.message);
    }
};

function renderReport(job, personnel) {
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    };

    const setSrc = (id, src) => {
        const el = document.getElementById(id);
        if (el) {
            if (src && src.trim() !== "") {
                el.src = src;
                el.classList.remove('d-none');
            } else {
                el.classList.add('d-none');
            }
        }
    };

    // Helper to find value case-insensitively
    const getValue = (obj, key) => {
        if (!obj) return null;
        if (obj[key]) return obj[key]; // Exact match
        const found = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase().replace(/_/g, ''));
        return found ? obj[found] : null;
    };

    // 1. ข้อมูลลูกค้า & ที่อยู่ (Compact)
    const cName = job.customerName || job.Customer_Name || "-";

    // Construct Address
    const getVal = (k) => job[k] || getValue(job, k) || "-";

    const house = getVal('houseNo') || getVal('House_No');
    const moo = getVal('moo') || getVal('Moo');
    const tambon = getVal('tambon') || getVal('Tambon');
    const amphoe = getVal('amphoe') || getVal('Amphoe');
    const province = getVal('province') || getVal('Province');

    // สร้าง String สำหรับที่อยู่
    // ใช้ &nbsp; เพื่อเว้นวรรคให้สวยงาม
    setText('val_customer_name', cName);

    const addressStr = `${house}  ม. ${moo}  ต. ${tambon}  อ. ${amphoe}  จ. ${province}`;
    setText('val_address', addressStr);


    // 2. ข้อมูลการสำรวจ (Survey Info)
    // ใช้วันที่ขอ (Request Date) หรือวันที่ปัจจุบันหากไม่มี
    const surveyDate = job.requestDate ? new Date(job.requestDate) : new Date();
    const thaiDate = surveyDate.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    setText('val_survey_date', thaiDate); // วันที่สำรวจ

    // ชื่อผู้สำรวจ (ด้านบน)
    setText('val_surveyor_name_top', job.surveyorName || "..................................................");


    // 3. แผนที่ (Map) - ใช้จากพิกัดสังเขป (GPS) + แนวท่อ
    const mapVal = getValue(job, 'mapurl') || getValue(job, 'map_url');

    const mapImg = document.getElementById('val_map_img');
    const mapFrame = document.getElementById('val_map_frame');
    const mapPlace = document.getElementById('map_placeholder');
    const maplibreBox = document.getElementById('val_map_maplibre');

    // Reset All
    if (mapImg) mapImg.classList.add('d-none');
    if (mapFrame) mapFrame.classList.add('d-none');
    if (maplibreBox) maplibreBox.classList.add('d-none');
    if (mapPlace) mapPlace.classList.remove('d-none');

    // Prepare QR URL
    let qrUrl = "";
    if (mapVal && mapVal.trim() !== "") {
        const isCoords = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(mapVal.trim());
        if (isCoords) {
            qrUrl = `https://maps.google.com/maps?q=${mapVal.replace(/\s/g, '')}`;
        } else {
            qrUrl = mapVal;
        }
    }

    // Display Map from GPS coordinates with MapLibre + Pipe layers
    if (mapVal && mapVal.trim() !== "") {
        if (mapPlace) mapPlace.classList.add('d-none');

        const isCoords = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(mapVal.trim());

        if (isCoords && maplibreBox) {
            maplibreBox.classList.remove('d-none');
            try {
                const parts = mapVal.split(',');
                const lat = parseFloat(parts[0].trim());
                const lng = parseFloat(parts[1].trim());

                if (!isNaN(lat) && !isNaN(lng)) {
                    // PWA GIS API Config
                    const API_KEY = "uVo4Txm5cyqWTfNOBKGTGx2PRc7uzVYhE07hdE0MrN2BgkPbjxmUKWD70ZHVjG5k";
                    const STYLE_URL = "https://gisapi-gateway.pwa.co.th/api/2.0/resources/styles/pwa-styles/styles-std?api_key=" + API_KEY;
                    const TILE_PIPE = "https://gisapi-gateway.pwa.co.th/api/2.0/resources/tiles/pwa-tiles/pwa-tile-pipe-b5541021?api_key=" + API_KEY;
                    const SRC_PIPE = "665c60f8dd708e21f678ae25";

                    const baseStyle = {
                        version: 8,
                        name: "R3PipeMap",
                        sprite: "https://gisdb.pwa.co.th/core/api/tiles/1.0-beta/sprite/65792edcd715b5ab12310280/sprites",
                        glyphs: "https://gisdb.pwa.co.th/core/tiles/fonts/{fontstack}/{range}.pbf",
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

                    if (window.myMaplibreMap) window.myMaplibreMap.remove();
                    const map = new maplibregl.Map({
                        container: "val_map_maplibre",
                        style: baseStyle,
                        center: [lng, lat],
                        zoom: 16,
                        maxZoom: 19,
                        interactive: false // รายงานไม่ต้อง interact
                    });
                    window.myMaplibreMap = map;

                    // วาง marker
                    new maplibregl.Marker({ color: '#e63946' })
                        .setLngLat([lng, lat])
                        .addTo(map);

                    // โหลด pipe layers
                    map.on("load", async () => {
                        try {
                            const res = await fetch(STYLE_URL);
                            const styleJSON = await res.json();

                            map.addSource("pipe", {
                                type: "vector",
                                url: TILE_PIPE
                            });

                            const pipeLayers = styleJSON.layers.filter(l =>
                                l.id.toLowerCase().includes("pipe")
                            );

                            pipeLayers.forEach(layer => {
                                const newLayer = {
                                    ...layer,
                                    id: "pipe-" + layer.id,
                                    source: "pipe",
                                    "source-layer": SRC_PIPE
                                };

                                if (layer.type === 'line') {
                                    const origWidth = layer.paint?.['line-width'] || 1;
                                    const boostedWidth = typeof origWidth === 'number'
                                        ? Math.max(origWidth * 3, 2)
                                        : origWidth;

                                    newLayer.paint = {
                                        ...(layer.paint || {}),
                                        'line-width': boostedWidth,
                                        'line-opacity': 1.0
                                    };
                                }

                                map.addLayer(newLayer);
                            });
                            console.log(`✅ R3: โหลดแนวท่อสำเร็จ (${pipeLayers.length} layers)`);
                        } catch (e) {
                            console.warn("⚠️ R3: โหลดแนวท่อไม่สำเร็จ:", e);
                        }
                    });

                    setTimeout(() => { map.resize(); }, 500);
                }
            } catch (e) { console.error("MapLibre Error", e); }
        } else if (mapImg) {
            mapImg.classList.remove('d-none');
            mapImg.src = mapVal;
        }
    }

    // Generate QR Code (Always Show if QR URL exists)
    const qrBox = document.getElementById('map_qr_code');
    if (qrBox && window.QRCode) {
        qrBox.innerHTML = '';
        if (qrUrl) {
            qrBox.classList.remove('d-none');
            try {
                new QRCode(qrBox, {
                    text: qrUrl,
                    width: 70,
                    height: 70,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.L
                });
            } catch (e) { console.error("QR Error", e); }
        } else {
            qrBox.classList.add('d-none');
        }
    }



    // 4. รูปแบบการติดตั้ง (Standard Drawing)
    const imgVal = getValue(job, 'imageurl') || getValue(job, 'image_url');
    // console.log("Image Value:", imgVal);
    setSrc('val_install_img', imgVal);

    // Toggle placeholder for Install img
    const installPlace = document.getElementById('install_placeholder');
    if (imgVal && imgVal.trim() !== "") {
        if (installPlace) installPlace.classList.add('d-none');
    } else {
        if (installPlace) installPlace.classList.remove('d-none');
    }


    // 5. Signatures
    const findPerson = (name) => personnel.find(p => p.name === name) || {};

    // Surveyor
    const surveyor = findPerson(job.surveyorName);
    setText('val_surveyor_name', job.surveyorName || "........................................................");
    setText('val_surveyor_pos', surveyor.position || "........................................................"); // Default/Fallback

    const surveyorContainer = document.getElementById('sig_surveyor_container');
    if (surveyorContainer) {
        surveyorContainer.innerHTML = '';
        if (surveyor.signatureUrl) {
            surveyorContainer.innerHTML = `<img src="${surveyor.signatureUrl}" class="sig-img">`;
        }
    }

    // Inspector
    const inspector = findPerson(job.inspectorName);
    setText('val_inspector_name', job.inspectorName || "........................................................");
    setText('val_inspector_pos', inspector.position || "........................................................"); // Default/Fallback

    const inspectorContainer = document.getElementById('sig_inspector_container');
    if (inspectorContainer) {
        inspectorContainer.innerHTML = '';
        if (inspector.signatureUrl) {
            inspectorContainer.innerHTML = `<img src="${inspector.signatureUrl}" class="sig-img">`;
        }
    }
}
