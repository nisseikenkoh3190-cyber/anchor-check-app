(function (global) {
  "use strict";

  function sanitizeText(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalizeDrawingRecord(drawing) {
    const drawingId = sanitizeText(drawing && drawing.drawingId);
    const drawingName = sanitizeText(drawing && drawing.drawingName);
    const keyPlanImage = sanitizeText(drawing && (drawing.keyPlanImage || drawing.image));
    const positionsFile = sanitizeText(drawing && drawing.positionsFile);

    return { drawingId: drawingId, drawingName: drawingName, keyPlanImage: keyPlanImage, positionsFile: positionsFile };
  }

  function normalizeSiteRecord(site) {
    const siteId = sanitizeText(site && site.siteId)
      || sanitizeText(site && site.title)
      || sanitizeText(site && site.siteName);
    const title = sanitizeText(site && site.title)
      || sanitizeText(site && site.siteName)
      || siteId;
    const siteName = sanitizeText(site && site.siteName)
      || title
      || siteId;
    const drawings = Array.isArray(site && site.drawings)
      ? site.drawings
          .map(normalizeDrawingRecord)
          .filter(function (drawing) {
            return drawing.drawingId && drawing.drawingName && drawing.keyPlanImage && drawing.positionsFile;
          })
      : [];

    let defaultDrawingId = sanitizeText(site && site.defaultDrawingId);
    if (!drawings.some(function (drawing) { return drawing.drawingId === defaultDrawingId; })) {
      defaultDrawingId = drawings[0] && drawings[0].drawingId || "";
    }

    return {
      siteId: siteId,
      title: title,
      siteName: siteName,
      defaultDrawingId: defaultDrawingId,
      drawings: drawings
    };
  }

  async function loadSitesData(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to load " + url + ": " + response.status);
    }

    const data = await response.json();
    const rawSites = Array.isArray(data && data.sites) ? data.sites : [];
    const normalized = rawSites
      .map(normalizeSiteRecord)
      .filter(function (site) {
        return site.siteId && site.title && site.siteName && site.drawings.length;
      });

    if (!normalized.length) {
      throw new Error(url + " does not contain any valid site records.");
    }

    return normalized;
  }

  function findSiteById(sites, siteId) {
    return (sites || []).find(function (site) {
      return site.siteId === siteId;
    }) || null;
  }

  function resolveRequestedSiteId(sites, params) {
    const requestedSiteId = params.get("SITE") || params.get("TITLE");
    return findSiteById(sites, requestedSiteId) ? requestedSiteId : (sites[0] && sites[0].siteId || "");
  }

  function resolveRequestedDrawingId(site, params) {
    if (!site || !Array.isArray(site.drawings) || !site.drawings.length) return "";

    const requestedDrawingId = sanitizeText(params.get("DRAWING"));
    if (site.drawings.some(function (drawing) { return drawing.drawingId === requestedDrawingId; })) {
      return requestedDrawingId;
    }

    if (site.drawings.some(function (drawing) { return drawing.drawingId === site.defaultDrawingId; })) {
      return site.defaultDrawingId;
    }

    return site.drawings[0].drawingId;
  }

  function buildDrawingPaths(siteId, drawingId) {
    return {
      keyPlanImage: "assets/" + siteId + "/" + drawingId + "/keyplan.png",
      positionsFile: "assets/" + siteId + "/" + drawingId + "/positions.json"
    };
  }

  function buildDrawingConfig(meta) {
    const paths = buildDrawingPaths(meta.siteId, meta.drawingId);
    return {
      drawingId: meta.drawingId,
      drawingName: meta.drawingName,
      keyPlanImage: paths.keyPlanImage,
      positionsFile: paths.positionsFile
    };
  }

  function buildSiteConfig(meta) {
    return {
      siteId: meta.siteId,
      title: meta.title,
      siteName: meta.title,
      defaultDrawingId: meta.drawingId,
      drawings: [buildDrawingConfig(meta)]
    };
  }

  function buildAppendConfig(existingSites, meta) {
    const existingSite = findSiteById(existingSites, meta.siteId);
    if (existingSite) {
      return {
        kind: "drawing",
        payload: {
          siteId: meta.siteId,
          drawing: buildDrawingConfig(meta)
        }
      };
    }

    return {
      kind: "site",
      payload: buildSiteConfig(meta)
    };
  }

  function getHistoryStorageKey(siteId, drawingId) {
    return "history_" + siteId + "_" + drawingId;
  }

  function getPlannerStorageKey(siteId, drawingId) {
    return "planner_positions_" + siteId + "_" + drawingId;
  }

  function getSharedKeyplanStorageKey(siteId, drawingId) {
    return "planner_keyplan_" + siteId + "_" + drawingId;
  }

  function getCandidateRegionStorageKey(siteId, drawingId) {
    return "planner_candidate_region_" + siteId + "_" + drawingId;
  }

  global.SiteConfig = {
    sanitizeText: sanitizeText,
    normalizeDrawingRecord: normalizeDrawingRecord,
    normalizeSiteRecord: normalizeSiteRecord,
    loadSitesData: loadSitesData,
    findSiteById: findSiteById,
    resolveRequestedSiteId: resolveRequestedSiteId,
    resolveRequestedDrawingId: resolveRequestedDrawingId,
    buildDrawingPaths: buildDrawingPaths,
    buildDrawingConfig: buildDrawingConfig,
    buildSiteConfig: buildSiteConfig,
    buildAppendConfig: buildAppendConfig,
    getHistoryStorageKey: getHistoryStorageKey,
    getPlannerStorageKey: getPlannerStorageKey,
    getSharedKeyplanStorageKey: getSharedKeyplanStorageKey,
    getCandidateRegionStorageKey: getCandidateRegionStorageKey
  };
})(window);
