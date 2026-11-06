require([
  "esri/config",
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/layers/GraphicsLayer",
  "esri/layers/WebTileLayer",
  "esri/Basemap",
  "esri/Graphic",
  "esri/widgets/Locate"
], function (esriConfig, Map, MapView, FeatureLayer, GraphicsLayer, WebTileLayer, Basemap, Graphic, Locate) {

  // ============================================================
  // 1. CONFIGURATION
  // ============================================================
  // esriConfig.apiKey = "YOUR_API_KEY";

  const PARCEL_URL =
    "https://services9.arcgis.com/Gh9awoU677aKree0/arcgis/rest/services/Florida_Statewide_Cadastral/FeatureServer/0";

  const CRA_URL =
    "https://services1.arcgis.com/L2Neyx2ylSeTBS0F/arcgis/rest/services/Florida_CRAs_DRAFT_WFL1/FeatureServer/1";

  const CRA_PURPLE = [128, 0, 128];

  // ============================================================
  // 2. CUSTOM BASEMAPS (Google + OSM)
  // ============================================================

  // Google Satellite (hybrid: satellite + labels)
  const googleSatellite = new Basemap({
    baseLayers: [
      new WebTileLayer({
        urlTemplate: "https://mt{subDomain}.google.com/vt/lyrs=y&x={col}&y={row}&z={level}",
        subDomains: ["0", "1", "2", "3"],
        title: "Google Satellite",
        copyright: "Google"
      })
    ],
    title: "Google Satellite",
    id: "google-satellite"
  });

  // Google Streets
  const googleStreets = new Basemap({
    baseLayers: [
      new WebTileLayer({
        urlTemplate: "https://mt{subDomain}.google.com/vt/lyrs=m&x={col}&y={row}&z={level}",
        subDomains: ["0", "1", "2", "3"],
        title: "Google Streets",
        copyright: "Google"
      })
    ],
    title: "Google Streets",
    id: "google-streets"
  });

  // OpenStreetMap
  const osmBasemap = new Basemap({
    baseLayers: [
      new WebTileLayer({
        urlTemplate: "https://{subDomain}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        subDomains: ["a", "b", "c"],
        title: "OpenStreetMap",
        copyright: "© OpenStreetMap contributors"
      })
    ],
    title: "OpenStreetMap",
    id: "osm"
  });

  // Map of dropdown value → Basemap instance (or string for built-in)
  const basemapMap = {
    "streets-navigation-vector": "streets-navigation-vector",
    "topo-vector": "topo-vector",
    "satellite": "satellite",
    "google-satellite": googleSatellite,
    "google-streets": googleStreets,
    "osm": osmBasemap
  };

  // ============================================================
  // 3. LAYERS
  // ============================================================

  const parcelLayer = new FeatureLayer({
    url: PARCEL_URL,
    title: "Florida Parcels (FDOR 2024)",
    outFields: ["PARCEL_ID", "PHY_ADDR1", "OWN_NAME"],
    returnGeometry: true,
    opacity: 0.55,
    visible: true
  });

  const craLayer = new FeatureLayer({
    url: CRA_URL,
    title: "CRAs (Statewide)",
    outFields: ["CRA_NAME", "COUNTY", "CRA_DISTRICT", "OBJECTID"],
    opacity: 0.5,
    visible: true,
    renderer: {
      type: "simple",
      symbol: {
        type: "simple-fill",
        color: [...CRA_PURPLE, 0.5],
        outline: { color: [...CRA_PURPLE, 1], width: 1.5 }
      }
    }
  });

  const highlightLayer = new GraphicsLayer({
    title: "Search highlight",
    listMode: "hide",
    opacity: 1,
    visible: true
  });

  // ============================================================
  // 4. MAP & VIEW
  // ============================================================

  const map = new Map({
    basemap: "streets-navigation-vector",
    layers: [parcelLayer, craLayer, highlightLayer]
  });

  const view = new MapView({
    container: "viewDiv",
    map: map,
    center: [-81.5, 27.8],
    zoom: 7,
    popup: { dockEnabled: true, dockOptions: { buttonEnabled: false } }
  });

  view.ui.add(new Locate({ view: view }), "top-left");

  // ============================================================
  // 5. BASEMAP SWITCHER
  // ============================================================

  const basemapSelect = document.getElementById("basemapSelect");
  basemapSelect.addEventListener("change", function () {
    const selected = basemapSelect.value;
    const target = basemapMap[selected];
    if (target) {
      map.basemap = target;
    }
  });

  // ============================================================
  // 6. LAYERS PANEL WIRING
  // ============================================================

  const layersHeader = document.getElementById("layersHeader");
  const layersBody = document.getElementById("layersBody");
  const layersChevron = document.getElementById("layersChevron");

  function toggleLayers() {
    const collapsed = layersBody.classList.toggle("collapsed");
    layersChevron.classList.toggle("collapsed", collapsed);
    layersHeader.setAttribute("aria-expanded", String(!collapsed));
  }
  layersHeader.addEventListener("click", toggleLayers);
  layersHeader.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleLayers(); }
  });

  function wireLayerControl(layer, chkId, opaId, opaValId) {
    const chk = document.getElementById(chkId);
    const opa = document.getElementById(opaId);
    const opaVal = document.getElementById(opaValId);

    chk.addEventListener("change", function () { layer.visible = chk.checked; });
    opa.addEventListener("input", function () {
      const v = Number(opa.value);
      layer.opacity = v / 100;
      opaVal.textContent = v + "%";
    });

    layer.watch("visible", function (v) { chk.checked = v; });
    layer.watch("opacity", function (o) {
      const v = Math.round(o * 100);
      if (Number(opa.value) !== v) {
        opa.value = v;
        opaVal.textContent = v + "%";
      }
    });
  }

  wireLayerControl(parcelLayer, "chkParcels", "opaParcels", "opaParcelsVal");
  wireLayerControl(craLayer, "chkCRA", "opaCRA", "opaCRAVal");
  wireLayerControl(highlightLayer, "chkHighlight", "opaHighlight", "opaHighlightVal");

  // ============================================================
  // 7. UI HELPERS
  // ============================================================

  const parcelInput = document.getElementById("parcelInput");
  const resultPanel = document.getElementById("resultPanel");

  function setResult(html, state) {
    resultPanel.className = "ui-result" + (state ? " " + state : "");
    resultPanel.innerHTML = html;
  }

  function drawParcel(geometry, isInCRA) {
    highlightLayer.removeAll();
    highlightLayer.add(
      new Graphic({
        geometry: geometry,
        symbol: {
          type: "simple-fill",
          color: isInCRA ? [22, 163, 74, 0.35] : [220, 38, 38, 0.25],
          outline: { color: isInCRA ? [21, 128, 61] : [185, 28, 28], width: 2 }
        }
      })
    );
    view.goTo(geometry.extent.expand(2.2));
  }

  // ============================================================
  // 8. CORE TEST
  // ============================================================

  async function checkCRA(parcelFeature) {
    setResult("Checking CRA status…", "loading");

    const parcel = parcelFeature.attributes;
    const parcelId = parcel.PARCEL_ID || "(no PARCEL_ID)";
    const parcelAddr = parcel.PHY_ADDR1 || "(no address)";

    try {
      const q = craLayer.createQuery();
      q.geometry = parcelFeature.geometry;
      q.spatialRelationship = "intersects";
      q.returnGeometry = false;
      q.outFields = ["CRA_NAME", "COUNTY", "CRA_DISTRICT", "OBJECTID"];

      const res = await craLayer.queryFeatures(q);

      if (res.features.length > 0) {
        const lines = res.features.map(function (f) {
          const a = f.attributes;
          const craName = a.CRA_NAME || "(unnamed CRA)";
          const county = a.COUNTY ? " — " + a.COUNTY + " County" : "";
          const district = a.CRA_DISTRICT ? " [" + a.CRA_DISTRICT + "]" : "";
          return "<strong>" + craName + "</strong>" + county + district;
        });

        setResult(
          "<strong>✅ YES — this parcel lies within a CRA zone.</strong><br><br>" +
            "<div class='small'><b>Parcel ID:</b> " + parcelId + "<br>" +
            "<b>Address:</b> " + parcelAddr + "</div><br>" +
            "<div><b>Matched CRA(s):</b><br>" + lines.join("<br>") + "</div>",
          "cra-yes"
        );

        drawParcel(parcelFeature.geometry, true);
      } else {
        setResult(
          "<strong>❌ NO — this parcel is not within any CRA zone.</strong><br><br>" +
            "<div class='small'><b>Parcel ID:</b> " + parcelId + "<br>" +
            "<b>Address:</b> " + parcelAddr + "</div>",
          "cra-no"
        );

        drawParcel(parcelFeature.geometry, false);
      }
    } catch (err) {
      console.error("CRA query failed:", err);
      setResult("Error while checking CRA status. See the browser console for details.", "cra-no");
    }
  }

  // ============================================================
  // 9. SEARCH BY PARCEL ID
  // ============================================================

  async function searchByParcelId(raw) {
    const value = raw.trim();
    if (!value) { setResult("Please enter a Parcel ID.", "cra-no"); return; }

    setResult("Searching for parcel…", "loading");
    const safe = value.replace(/'/g, "''");

    const q = parcelLayer.createQuery();
    q.where = "PARCEL_ID = '" + safe + "'";
    q.returnGeometry = true;
    q.outFields = ["PARCEL_ID", "PHY_ADDR1", "OWN_NAME"];
    q.num = 1;

    try {
      const res = await parcelLayer.queryFeatures(q);
      if (res.features.length === 0) {
        setResult("No parcel found with that ID. Check the format (e.g., 01-1234-567-8900) and try again.", "cra-no");
        return;
      }
      await checkCRA(res.features[0]);
    } catch (err) {
      console.error("Parcel-ID search failed:", err);
      setResult("Search failed. See the browser console for details.", "cra-no");
    }
  }

  // ============================================================
  // 10. WIRING
  // ============================================================

  document.getElementById("parcelSearchBtn").addEventListener("click", function () {
    searchByParcelId(parcelInput.value);
  });
  parcelInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") searchByParcelId(parcelInput.value);
  });

  // ============================================================
  // 11. MAP CLICK → CRA TEST
  // ============================================================

  view.on("click", async function (event) {
    const hit = await view.hitTest(event, { include: [parcelLayer] });
    if (!hit.results.length) return;

    const g = hit.results[0].graphic;
    if (!g) return;

    if (g.attributes && g.attributes.PARCEL_ID) {
      await checkCRA({
        geometry: g.geometry,
        attributes: {
          PARCEL_ID: g.attributes.PARCEL_ID,
          PHY_ADDR1: g.attributes.PHY_ADDR1,
          OWN_NAME: g.attributes.OWN_NAME
        }
      });
    } else if (g.attributes && g.attributes.OBJECTID != null) {
      const q = parcelLayer.createQuery();
      q.objectIds = [g.attributes.OBJECTID];
      q.returnGeometry = true;
      q.outFields = ["PARCEL_ID", "PHY_ADDR1", "OWN_NAME"];
      const res = await parcelLayer.queryFeatures(q);
      if (res.features.length) await checkCRA(res.features[0]);
    }
  });

  // ============================================================
  // 12. FIRST-LOAD MESSAGE
  // ============================================================

  setResult("Ready. Enter a parcel number — or click any parcel on the map.", "");
});