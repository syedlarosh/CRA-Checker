require([
  "esri/config",
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/layers/GraphicsLayer",
  "esri/layers/WebTileLayer",
  "esri/Basemap",
  "esri/Graphic",
  "esri/geometry/Point",
  "esri/widgets/Locate"
], function (
  esriConfig, Map, MapView, FeatureLayer, GraphicsLayer, WebTileLayer,
  Basemap, Graphic, Point, Locate
) {

  // ============================================================
  // 1. CONFIGURATION
  // ============================================================
  // esriConfig.apiKey = "YOUR_API_KEY";

  const PARCEL_URL =
    "https://services9.arcgis.com/Gh9awoU677aKree0/arcgis/rest/services/Florida_Statewide_Cadastral/FeatureServer/0";

  const CRA_URL =
    "https://services1.arcgis.com/L2Neyx2ylSeTBS0F/arcgis/rest/services/Florida_CRAs_DRAFT_WFL1/FeatureServer/1";

  const BROWNFIELD_URL =
    "https://ca.dep.state.fl.us/arcgis/rest/services/OpenData/BROWNFIELD_AREAS/MapServer/0";

  const GEOCODE_URL =
    "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer";

  const CRA_PURPLE = [128, 0, 128];
  const BROWNFIELD_BROWN = [139, 69, 19];

  // ============================================================
  // 2. CUSTOM BASEMAPS
  // ============================================================

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

  const brownfieldLayer = new FeatureLayer({
    url: BROWNFIELD_URL,
    title: "Brownfield Areas (FDEP)",
    outFields: [
      "AREA_ID", "AREA_NAME", "CITY", "COUNTY",
      "ACREAGE", "RESOLUTION_NUMBER", "OBJECTID"
    ],
    opacity: 0.5,
    visible: true,
    renderer: {
      type: "simple",
      symbol: {
        type: "simple-fill",
        color: [...BROWNFIELD_BROWN, 0.5],
        outline: { color: [...BROWNFIELD_BROWN, 1], width: 1.5 }
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
    layers: [parcelLayer, craLayer, brownfieldLayer, highlightLayer]
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
    const target = basemapMap[basemapSelect.value];
    if (target) map.basemap = target;
  });

  // ============================================================
  // 6. LAYERS PANEL
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
  wireLayerControl(brownfieldLayer, "chkBrownfield", "opaBrownfield", "opaBrownfieldVal");
  wireLayerControl(highlightLayer, "chkHighlight", "opaHighlight", "opaHighlightVal");

  // ============================================================
  // 7. UI HELPERS
  // ============================================================

  const addressInput = document.getElementById("addressInput");
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
  // 8. CORE TEST — runs CRA + Brownfield queries in parallel
  // ============================================================

  async function queryCRA(parcelGeometry) {
    const q = craLayer.createQuery();
    q.geometry = parcelGeometry;
    q.spatialRelationship = "intersects";
    q.returnGeometry = false;
    q.outFields = ["CRA_NAME", "COUNTY", "CRA_DISTRICT", "OBJECTID"];
    return craLayer.queryFeatures(q);
  }

  async function queryBrownfield(parcelGeometry) {
    const q = brownfieldLayer.createQuery();
    q.geometry = parcelGeometry;
    q.spatialRelationship = "intersects";
    q.returnGeometry = false;
    q.outFields = [
      "AREA_ID", "AREA_NAME", "CITY", "COUNTY",
      "ACREAGE", "RESOLUTION_NUMBER", "OBJECTID"
    ];
    return brownfieldLayer.queryFeatures(q);
  }

  async function checkOverlays(parcelFeature) {
    setResult("Checking CRA &amp; Brownfield status…", "loading");

    const parcel = parcelFeature.attributes;
    const parcelId = parcel.PARCEL_ID || "(no PARCEL_ID)";
    const parcelAddr = parcel.PHY_ADDR1 || "(no address)";

    try {
      // Run both queries in parallel for speed
      const [craRes, bfRes] = await Promise.all([
        queryCRA(parcelFeature.geometry),
        queryBrownfield(parcelFeature.geometry)
      ]);

      const inCRA = craRes.features.length > 0;
      const inBrownfield = bfRes.features.length > 0;
      const isMatch = inCRA || inBrownfield;

      // ---- CRA section ----
      let craSection;
      if (inCRA) {
        const lines = craRes.features.map(function (f) {
          const a = f.attributes;
          const craName = a.CRA_NAME || "(unnamed CRA)";
          const county = a.COUNTY ? " — " + a.COUNTY + " County" : "";
          const district = a.CRA_DISTRICT ? " [" + a.CRA_DISTRICT + "]" : "";
          return "<strong>" + craName + "</strong>" + county + district;
        });
        craSection =
          "<div class='result-section cra'>" +
            "<h4>CRA<span class='badge'>YES</span></h4>" +
            lines.join("<br>") +
          "</div>";
      } else {
        craSection =
          "<div class='result-section cra'>" +
            "<h4>CRA<span class='badge no'>NO</span></h4>" +
            "Not within any CRA zone." +
          "</div>";
      }

      // ---- Brownfield section ----
      let bfSection;
      if (inBrownfield) {
        const lines = bfRes.features.map(function (f) {
          const a = f.attributes;
          const name = a.AREA_NAME || "(unnamed brownfield)";
          const city = a.CITY ? " — " + a.CITY : "";
          const county = a.COUNTY ? ", " + a.COUNTY + " County" : "";
          const acreage = (a.ACREAGE != null)
            ? " · " + Number(a.ACREAGE).toFixed(1) + " ac"
            : "";
          const res = a.RESOLUTION_NUMBER
            ? " · Res. " + a.RESOLUTION_NUMBER
            : "";
          return "<strong>" + name + "</strong>" + city + county + acreage + res;
        });
        bfSection =
          "<div class='result-section brownfield'>" +
            "<h4>Brownfield Area<span class='badge'>YES</span></h4>" +
            lines.join("<br>") +
          "</div>";
      } else {
        bfSection =
          "<div class='result-section brownfield'>" +
            "<h4>Brownfield Area<span class='badge no'>NO</span></h4>" +
            "Not within any designated Brownfield Area." +
          "</div>";
      }

      // ---- Header line ----
      const headerIcon = isMatch ? "✅" : "❌";
      const headerText = isMatch
        ? "This parcel overlaps at least one designated area."
        : "This parcel is not within a CRA or Brownfield Area.";

      setResult(
        "<strong>" + headerIcon + " " + headerText + "</strong><br><br>" +
        "<div class='small'><b>Parcel ID:</b> " + parcelId + "<br>" +
        "<b>Address:</b> " + parcelAddr + "</div>" +
        craSection +
        bfSection,
        isMatch ? "cra-yes" : "cra-no"
      );

      drawParcel(parcelFeature.geometry, isMatch);

    } catch (err) {
      console.error("Overlay query failed:", err);
      setResult(
        "Error while checking CRA / Brownfield status. See the browser console for details.",
        "cra-no"
      );
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
      await checkOverlays(res.features[0]);
    } catch (err) {
      console.error("Parcel-ID search failed:", err);
      setResult("Search failed. See the browser console for details.", "cra-no");
    }
  }

  // ============================================================
  // 10. SEARCH BY ADDRESS
  // ============================================================

  async function geocodeAddress(address) {
    const url =
      GEOCODE_URL +
      "/findAddressCandidates" +
      "?f=json" +
      "&SingleLine=" + encodeURIComponent(address) +
      "&outFields=*" +
      "&maxLocations=1" +
      "&forStorage=false";

    const response = await fetch(url);
    if (!response.ok) throw new Error("Geocoder HTTP " + response.status);

    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0) return null;

    const c = data.candidates[0];
    return {
      point: new Point({
        longitude: c.location.x,
        latitude: c.location.y,
        spatialReference: { wkid: 4326 }
      }),
      address: c.address,
      score: c.score
    };
  }

  async function searchByAddress(raw) {
    const value = raw.trim();
    if (!value) { setResult("Please enter an address.", "cra-no"); return; }

    setResult("Looking up address…", "loading");

    let geo;
    try {
      geo = await geocodeAddress(value);
    } catch (err) {
      console.error("Geocode failed:", err);
      setResult("Address lookup failed. Check your network connection and try again.", "cra-no");
      return;
    }

    if (!geo) {
      setResult(
        "No match found for that address. Try adding a city and state, e.g. " +
        "“100 N Main St, Miami, FL”.",
        "cra-no"
      );
      return;
    }

    setResult("Address found: " + geo.address + "<br>Locating parcel…", "loading");

    // Zoom to the geocoded point first
    await view.goTo({
      center: geo.point,
      zoom: 17
    });

    // Spatial query: find the parcel polygon that contains the point
    const q = parcelLayer.createQuery();
    q.geometry = geo.point;
    q.spatialRelationship = "intersects";
    q.returnGeometry = true;
    q.outFields = ["PARCEL_ID", "PHY_ADDR1", "OWN_NAME"];
    q.num = 1;

    try {
      const res = await parcelLayer.queryFeatures(q);
      if (res.features.length === 0) {
        setResult(
          "Address matched at " + geo.address + ", but no parcel polygon was found there. " +
          "The parcel layer may not have coverage for this location.",
          "cra-no"
        );
        return;
      }
      await checkOverlays(res.features[0]);
    } catch (err) {
      console.error("Parcel spatial query failed:", err);
      setResult("Parcel lookup failed at that location. See the browser console.", "cra-no");
    }
  }

  // ============================================================
  // 11. WIRING
  // ============================================================

  document.getElementById("parcelSearchBtn").addEventListener("click", function () {
    searchByParcelId(parcelInput.value);
  });
  document.getElementById("addressSearchBtn").addEventListener("click", function () {
    searchByAddress(addressInput.value);
  });
  parcelInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") searchByParcelId(parcelInput.value);
  });
  addressInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") searchByAddress(addressInput.value);
  });

  // ============================================================
  // 12. MAP CLICK → DUAL OVERLAY TEST
  // ============================================================

  view.on("click", async function (event) {
    const hit = await view.hitTest(event, { include: [parcelLayer] });
    if (!hit.results.length) return;

    const g = hit.results[0].graphic;
    if (!g) return;

    if (g.attributes && g.attributes.PARCEL_ID) {
      await checkOverlays({
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
      if (res.features.length) await checkOverlays(res.features[0]);
    }
  });

  // ============================================================
  // 13. FIRST-LOAD MESSAGE
  // ============================================================

  setResult("Ready. Search by address or parcel number — or click any parcel on the map.", "");
});