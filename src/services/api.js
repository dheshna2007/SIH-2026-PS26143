/**
 * OceanTrace API service layer
 * Connects to TideTrace backend (FastAPI) at http://127.0.0.1:8000
 */

export const API_BASE = import.meta.env.VITE_TIDETRACE_API || 'http://127.0.0.1:8000'

/**
 * Fetch compact incident model for a completed, audited pipeline run
 * @param {string} jobId
 * @returns {Promise<Object>}
 */
export async function fetchIncident(jobId = 'job_oceantrace_mc20_demo') {
  const url = `${API_BASE}/api/incidents/${encodeURIComponent(jobId)}`
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      const errorText = await res.text()
      let message = `API request failed with status ${res.status}`
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.detail) message = errorJson.detail
      } catch {
        if (errorText) message = errorText
      }
      throw new Error(message)
    }

    return await res.json()
  } catch (err) {
    console.error(`[OceanTrace API] Failed to fetch incident ${jobId}:`, err)
    throw err
  }
}

/**
 * Returns full URL to the official Maritime Pollution Attribution Note (HTML)
 * @param {string} jobId
 */
export function getReportUrl(jobId = 'job_oceantrace_mc20_demo') {
  return `${API_BASE}/api/report/${encodeURIComponent(jobId)}`
}

/**
 * Returns full URL to the complete raw audited job JSON
 * @param {string} jobId
 */
export function getJobJsonUrl(jobId = 'job_oceantrace_mc20_demo') {
  return `${API_BASE}/api/jobs/${encodeURIComponent(jobId)}`
}

/**
 * Returns full URL to the unified GeoJSON GIS export
 * @param {string} jobId
 */
export function getGeoJsonUrl(jobId = 'job_oceantrace_mc20_demo') {
  return `${API_BASE}/api/jobs/${encodeURIComponent(jobId)}/geojson`
}

/**
 * Format latitude & longitude into standard navigational representation
 * @param {number} lat
 * @param {number} lon
 * @returns {string} e.g. "28.977° N · 88.939° W"
 */
export function formatCoords(lat, lon) {
  if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) return 'N/A'
  const latStr = `${Math.abs(lat).toFixed(3)}° ${lat >= 0 ? 'N' : 'S'}`
  const lonStr = `${Math.abs(lon).toFixed(3)}° ${lon >= 0 ? 'E' : 'W'}`
  return `${latStr} · ${lonStr}`
}

/**
 * Format ISO datetime to concise UTC string
 * @param {string} isoString
 * @returns {string} e.g. "2023-09-24 00:02 UTC"
 */
export function formatUtc(isoString) {
  if (!isoString) return 'N/A'
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return String(isoString)
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    const hh = String(d.getUTCHours()).padStart(2, '0')
    const mm = String(d.getUTCMinutes()).padStart(2, '0')
    return `${y}-${m}-${day} ${hh}:${mm} UTC`
  } catch {
    return String(isoString)
  }
}
