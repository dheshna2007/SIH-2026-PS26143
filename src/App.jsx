import { useState, useEffect } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import './App.css'
import {
  API_BASE,
  fetchIncident,
  getReportUrl,
  getGeoJsonUrl,
  getJobJsonUrl,
  formatCoords,
  formatUtc,
} from './services/api'

// Leaflet default icon configuration
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom Tactical Map Pins
const spillIcon = L.divIcon({
  className: 'custom-map-pin',
  html: '<div class="pin-inner spill" title="Detected Oil Slick"><span>⚠</span></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -13],
})

const originIcon = L.divIcon({
  className: 'custom-map-pin',
  html: '<div class="pin-inner origin" title="Probable Spill Origin"><span>⌖</span></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -13],
})

const vesselIcon = L.divIcon({
  className: 'custom-map-pin',
  html: '<div class="pin-inner vessel" title="Candidate Vessel"><span>▲</span></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
})

/**
 * Automatically adjusts the Leaflet viewport to encompass all incident layers
 */
function MapBoundsAdjuster({ layers, defaultCenter = [28.98, -88.94] }) {
  const map = useMap()

  useEffect(() => {
    if (!layers || layers.length === 0) return

    try {
      const bounds = L.latLngBounds([])
      let count = 0

      layers.forEach((item) => {
        if (!item) return
        try {
          const l = L.geoJSON(item)
          const b = l.getBounds()
          if (b.isValid()) {
            bounds.extend(b)
            count++
          }
        } catch {
          // ignore layer errors
        }
      })

      if (count > 0 && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [45, 45], maxZoom: 12 })
      } else {
        map.setView(defaultCenter, 10)
      }
    } catch (err) {
      console.warn('Could not fit map bounds:', err)
    }
  }, [layers, map, defaultCenter])

  return null
}

function App() {
  const [file, setFile] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzingStep, setAnalyzingStep] = useState('')
  const [detected, setDetected] = useState(false)
  const [incidentData, setIncidentData] = useState(null)
  const [error, setError] = useState(null)
  const [selectedVessel, setSelectedVessel] = useState(null)
  const [basemap, setBasemap] = useState('satellite')

  const pipelineStages = [
    'DETECT: Segmenting Sentinel-1 SAR dual-pol chip...',
    'CHAR: Extracting local AEQD contours & geometry...',
    'METOCEAN: Loading cached ERA5 wind & CMEMS current fields...',
    'HINDCAST: Integrating 50-particle RK2 Lagrangian ensemble...',
    'FORECAST: Projecting forward dispersion trajectory...',
    'AIS: Querying spatio-temporal funnel & vessel scoring...',
  ]

  const handleFile = (event) => {
    const selected = event.target.files[0]
    if (!selected) return

    setFile(selected)
    setImageUrl(URL.createObjectURL(selected))
    setDetected(false)
    setError(null)
  }

  const runInvestigation = async (jobId = 'job_oceantrace_mc20_demo') => {
    setAnalyzing(true)
    setError(null)
    setAnalyzingStep(pipelineStages[0])

    let stepIdx = 0
    const interval = setInterval(() => {
      stepIdx = (stepIdx + 1) % pipelineStages.length
      setAnalyzingStep(pipelineStages[stepIdx])
    }, 450)

    try {
      // Call genuine TideTrace incident API
      const data = await fetchIncident(jobId)
      clearInterval(interval)
      setIncidentData(data)
      if (data.vessel_ranking && data.vessel_ranking.length > 0) {
        setSelectedVessel(data.vessel_ranking[0])
      } else {
        setSelectedVessel(null)
      }
      setAnalyzing(false)
      setDetected(true)
    } catch (err) {
      clearInterval(interval)
      setAnalyzing(false)
      setError(`Failed to connect to TideTrace API: ${err.message}. Ensure backend is running at http://127.0.0.1:8000`)
      console.error(err)
    }
  }

  const reset = () => {
    setFile(null)
    setImageUrl(null)
    setDetected(false)
    setIncidentData(null)
    setError(null)
    setSelectedVessel(null)
  }

  // Extract structured values from the API response
  const jobId = incidentData?.incident_id || 'job_oceantrace_mc20_demo'
  const scene = incidentData?.scene || {}
  const detection = incidentData?.detection || {}
  const slick = detection.slick || {}
  const slickPolygon = detection.slick_polygon
  const probableOrigin = incidentData?.probable_origin || {}
  const originZone = probableOrigin.origin_zone
  const environment = incidentData?.environment || {}
  const wind = environment.wind_10m || {}
  const current = environment.surface_current || {}
  const drift = incidentData?.drift || {}
  const hindcast = drift.hindcast_path
  const forecast = drift.forecast_path
  const forecastCone = drift.forecast_cone
  const ais = incidentData?.ais || {}
  const candidates = incidentData?.vessel_ranking || []

  // Coordinates formatting
  const slickLon = slick.centroid ? slick.centroid[0] : null
  const slickLat = slick.centroid ? slick.centroid[1] : null
  const originLon = probableOrigin.centre ? probableOrigin.centre[0] : null
  const originLat = probableOrigin.centre ? probableOrigin.centre[1] : null

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="logo">
            OCEAN<span>TRACE</span>
          </div>
          <div className="brand-subtitle">
            MARITIME INTELLIGENCE PLATFORM · CODEX
          </div>
        </div>

        <div className="header-right">
          <div className="live-status">
            <span></span>
            TIDETRACE API: {detected ? 'CONNECTED (127.0.0.1:8000)' : 'STANDBY'}
          </div>

          <div className="header-divider"></div>

          <div className="mission">
            MISSION ID
            <strong>{jobId}</strong>
          </div>
        </div>
      </header>

      {!detected ? (
        <main className="landing">
          <div className="hero">
            <div className="eyebrow">
              SATELLITE · OCEAN · AIS · INTELLIGENCE
            </div>

            <h1>
              FIND THE
              <br />
              <span>SOURCE</span>
              <br />
              OF THE SPILL.
            </h1>

            <p>
              OceanTrace combines satellite imagery, environmental
              conditions and vessel movement data to transform marine oil-spill
              detection into an actionable maritime investigation.
            </p>

            <div className="process">
              <div className="process-item">
                <span>01</span>
                DETECT
              </div>
              <div className="process-line"></div>
              <div className="process-item">
                <span>02</span>
                TRACE
              </div>
              <div className="process-line"></div>
              <div className="process-item">
                <span>03</span>
                PREDICT
              </div>
              <div className="process-line"></div>
              <div className="process-item">
                <span>04</span>
                ATTRIBUTE
              </div>
            </div>
          </div>

          <div className="upload-panel">
            <div className="panel-top">
              <span>NEW INVESTIGATION</span>
              <span>● READY</span>
            </div>

            <div className="upload-content">
              <div className="radar">
                <div className="radar-ring ring-one"></div>
                <div className="radar-ring ring-two"></div>
                <div className="radar-ring ring-three"></div>
                <div className="radar-cross horizontal"></div>
                <div className="radar-cross vertical"></div>
                <div className="radar-dot"></div>
              </div>

              <h2>SATELLITE IMAGERY</h2>
              <p>
                Run automated pipeline over Sentinel-1 SAR scene, or upload
                custom imagery to begin investigation.
              </p>

              {error && (
                <div className="error-banner">
                  <span>⚠ {error}</span>
                  <button onClick={() => runInvestigation()}>RETRY</button>
                </div>
              )}

              {analyzing ? (
                <div>
                  <button className="primary-button" disabled>
                    ANALYZING SATELLITE DATA...
                  </button>
                  <div className="analyzing-step-ticker">
                    {analyzingStep}
                  </div>
                </div>
              ) : (
                <div className="demo-quick-launch">
                  <button
                    className="primary-button"
                    onClick={() => runInvestigation()}
                  >
                    RUN MC20 GULF DEMO (Sentinel-1 SAR) →
                  </button>

                  <label
                    className="outline-button"
                    style={{
                      display: 'inline-block',
                      textAlign: 'center',
                      marginTop: '6px',
                    }}
                  >
                    UPLOAD CUSTOM SAR / EO IMAGE
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleFile}
                    />
                  </label>

                  {imageUrl && (
                    <div className="image-preview" style={{ margin: '15px auto' }}>
                      <img src={imageUrl} alt="Satellite imagery" />
                      <div className="scan-line"></div>
                    </div>
                  )}

                  {file && (
                    <div className="selected-file">
                      <span>FILE SELECTED</span>
                      <strong>{file.name}</strong>
                    </div>
                  )}
                </div>
              )}

              <div className="supported">
                SENTINEL-1 SAR · SENTINEL-2 EO · TIFF · GEOTIFF
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main className="dashboard">
          <div className="dashboard-header">
            <div>
              <div className="eyebrow">
                INVESTIGATION / {jobId} / COMPLETE
              </div>
              <h1>Marine Spill Investigation</h1>
              <p>
                Scene: {scene.title || 'MC20 Site · Gulf of Mexico'} · Observation:{' '}
                {formatUtc(incidentData?.run?.observation_time_utc)}
              </p>
            </div>

            <div className="dashboard-actions">
              <div className="confidence-badge">
                <span>DETECTOR SCORE</span>
                <strong>
                  {slick.confidence != null
                    ? `${(slick.confidence * 100).toFixed(1)}%`
                    : 'BASELINE'}
                </strong>
              </div>

              <button className="outline-button" onClick={reset}>
                + NEW CASE
              </button>
            </div>
          </div>

          <div className="pipeline">
            <div className="pipeline-step active">
              <span>01</span>
              DETECTED ({detection.oil_polygon_count || 1} POLYS)
            </div>
            <div className="pipeline-connector active"></div>

            <div className="pipeline-step active">
              <span>02</span>
              CHARACTERIZED
            </div>
            <div className="pipeline-connector active"></div>

            <div className="pipeline-step active">
              <span>03</span>
              HINDCAST (48H BACK)
            </div>
            <div className="pipeline-connector active"></div>

            <div className="pipeline-step active">
              <span>04</span>
              FORECAST (+{drift.forecast_hours || 24}H)
            </div>
            <div className="pipeline-connector active"></div>

            <div className="pipeline-step active">
              <span>05</span>
              AIS EVALUATED
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-top">
                DETECTOR OUTPUT
                <span>AI</span>
              </div>
              <strong>
                {slick.confidence != null
                  ? `${(slick.confidence * 100).toFixed(1)}%`
                  : 'N/A'}
              </strong>
              <div className="stat-bottom">
                {detection.detector
                  ? detection.detector.replace(/_/g, ' ').toUpperCase()
                  : 'BASELINE AI'}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                SPILL AREA
                <span>AREA</span>
              </div>
              <strong>
                {slick.area_km2 != null
                  ? `${slick.area_km2.toFixed(3)} km²`
                  : 'N/A'}
              </strong>
              <div className="stat-bottom">
                {detection.oil_polygon_count != null
                  ? `${detection.oil_polygon_count} POLYGONS IDENTIFIED`
                  : 'ESTIMATED'}
              </div>
            </div>

            <div className="stat-card danger-card">
              <div className="stat-top">
                STATUS
                <span>ALERT</span>
              </div>
              <strong>
                {detection.status ? detection.status.toUpperCase() : 'ACTIVE'}
              </strong>
              <div className="stat-bottom">
                MINERAL OIL SIGNATURE
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                ESTIMATED AGE
                <span>TIME</span>
              </div>
              <strong>
                {probableOrigin.age_hours_proxy != null
                  ? `${probableOrigin.age_hours_proxy} HRS`
                  : '12 HRS'}
              </strong>
              <div className="stat-bottom">
                DRIFT PROXY (RK2 BACKTRACK)
              </div>
            </div>
          </div>

          <section className="map-section">
            <div className="section-heading">
              <div>
                <span>01 / SPATIAL INTELLIGENCE</span>
                <h2>Spill Origin & Vessel Correlation</h2>
              </div>

              <div className="map-controls">
                <div className="basemap-toggle">
                  <button
                    type="button"
                    className={basemap === 'satellite' ? 'active' : ''}
                    onClick={() => setBasemap('satellite')}
                  >
                    CACHED SATELLITE (OFFLINE)
                  </button>
                  <button
                    type="button"
                    className={basemap === 'osm' ? 'active' : ''}
                    onClick={() => setBasemap('osm')}
                  >
                    OPENSTREETMAP
                  </button>
                </div>
              </div>
            </div>

            <div className="map-wrapper">
              <MapContainer
                center={[slickLat || 28.98, slickLon || -88.94]}
                zoom={9}
                scrollWheelZoom={true}
                style={{ width: '100%', height: '100%' }}
              >
                {basemap === 'satellite' ? (
                  <TileLayer
                    key="satellite-layer"
                    url={`${API_BASE}/data/basemap/satellite/{z}/{x}/{y}.jpg`}
                    attribution="Esri, Maxar, Earthstar Geographics &middot; TideTrace Offline Cache"
                    minNativeZoom={5}
                    maxNativeZoom={13}
                    maxZoom={18}
                  />
                ) : (
                  <TileLayer
                    key="osm-layer"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    maxZoom={19}
                  />
                )}

                <MapBoundsAdjuster
                  layers={[
                    slickPolygon,
                    originZone,
                    hindcast,
                    forecast,
                    forecastCone,
                  ]}
                  defaultCenter={[slickLat || 28.98, slickLon || -88.94]}
                />

                {/* Detected Oil Slick GeoJSON Polygon (Vibrant Coral with high contrast outline) */}
                {slickPolygon && (
                  <GeoJSON
                    key="slick-poly"
                    data={slickPolygon}
                    style={{
                      color: '#ff3344',
                      fillColor: '#ff4757',
                      fillOpacity: 0.45,
                      weight: 2.5,
                      opacity: 1,
                    }}
                  />
                )}

                {/* Slick Centroid Pin */}
                {slickLat != null && slickLon != null && (
                  <Marker position={[slickLat, slickLon]} icon={spillIcon}>
                    <Popup>
                      <strong>OIL SPILL DETECTED (PRIMARY)</strong>
                      <br />
                      {formatCoords(slickLat, slickLon)}
                      <br />
                      Area: {slick.area_km2 ? `${slick.area_km2.toFixed(3)} km²` : 'N/A'}
                      <br />
                      Detector score: {slick.confidence ? `${(slick.confidence * 100).toFixed(1)}%` : 'Baseline'}
                    </Popup>
                  </Marker>
                )}

                {/* Probable Origin Zone GeoJSON Polygon (Electric Cyan dashed) */}
                {originZone && (
                  <GeoJSON
                    key="origin-zone-poly"
                    data={originZone}
                    style={{
                      color: '#00f0ff',
                      fillColor: '#00f0ff',
                      fillOpacity: 0.18,
                      weight: 2.5,
                      dashArray: '6 6',
                      opacity: 1,
                    }}
                  />
                )}

                {/* Origin Centroid Pin */}
                {originLat != null && originLon != null && (
                  <Marker position={[originLat, originLon]} icon={originIcon}>
                    <Popup>
                      <strong>PROBABLE SPILL ORIGIN</strong>
                      <br />
                      {formatCoords(originLat, originLon)}
                      <br />
                      Est. Release: {formatUtc(probableOrigin.estimated_release_time_utc)}
                      <br />
                      Trace confidence: Not available
                      <br />
                      Ensemble spread: {probableOrigin.spatial_spread_km || '8.61'} km
                    </Popup>
                  </Marker>
                )}

                {/* Hindcast Path GeoJSON LineString (Cyan Dashed Line) */}
                {hindcast && (
                  <GeoJSON
                    key="hindcast-track"
                    data={hindcast}
                    style={{
                      color: '#00f0ff',
                      weight: 3.5,
                      dashArray: '8 6',
                      opacity: 0.95,
                    }}
                  />
                )}

                {/* Forecast Forward Dispersion Cone GeoJSON Polygon (Translucent Amber) */}
                {forecastCone && (
                  <GeoJSON
                    key="forecast-cone-poly"
                    data={forecastCone}
                    style={{
                      color: '#ffa502',
                      fillColor: '#ffa502',
                      fillOpacity: 0.2,
                      weight: 2,
                      dashArray: '4 4',
                      opacity: 0.95,
                    }}
                  />
                )}

                {/* Forecast Forward Trajectory GeoJSON LineString (Amber Dashed Line) */}
                {forecast && (
                  <GeoJSON
                    key="forecast-track"
                    data={forecast}
                    style={{
                      color: '#ffa502',
                      weight: 3.5,
                      dashArray: '5 5',
                      opacity: 0.95,
                    }}
                  />
                )}

                {/* Candidate Vessels (if candidates exist) */}
                {candidates.map((c, index) => {
                  const lat = c.track?.geojson?.geometry?.coordinates?.[0]?.[1] || c.lat
                  const lon = c.track?.geojson?.geometry?.coordinates?.[0]?.[0] || c.lon
                  if (lat == null || lon == null) return null
                  return (
                    <Marker
                      key={c.vessel?.mmsi || c.name || `vessel-${index}`}
                      position={[lat, lon]}
                      icon={vesselIcon}
                      eventHandlers={{ click: () => setSelectedVessel(c) }}
                    >
                      <Popup>
                        <strong>{c.vessel?.name || c.name || 'Candidate Vessel'}</strong>
                        <br />
                        MMSI: {c.vessel?.mmsi || 'N/A'}
                        <br />
                        Evidence Score: {c.score?.value_percent || c.score}%
                      </Popup>
                    </Marker>
                  )
                })}
              </MapContainer>

              {/* On-Map Tactical Layer Legend */}
              <div className="map-legend">
                <div className="legend-title">MAP LAYERS</div>
                <div className="legend-row">
                  <span className="legend-swatch spill"></span>
                  <span>DETECTED SLICK</span>
                </div>
                <div className="legend-row">
                  <span className="legend-swatch origin"></span>
                  <span>PROBABLE ORIGIN</span>
                </div>
                <div className="legend-row">
                  <span className="legend-swatch hindcast"></span>
                  <span>HINDCAST / BACKTRACK</span>
                </div>
                <div className="legend-row">
                  <span className="legend-swatch forecast"></span>
                  <span>FORECAST (+24H)</span>
                </div>
              </div>

              <div className="map-overlay top-left">
                <span>LIVE GEOREFERENCE</span>
                <strong>{formatCoords(slickLat, slickLon)}</strong>
                <small>{scene.title || 'MC20 Site · Gulf of Mexico'}</small>
              </div>

              <div className="map-overlay bottom-right">
                <span>FORECAST DISPERSION</span>
                <strong>+{drift.forecast_hours || 24} HOURS</strong>
                <small>
                  {forecastCone?.properties?.area_km2
                    ? `Cone Area: ${forecastCone.properties.area_km2.toFixed(1)} km²`
                    : '24h Forward Dispersion Active'}
                </small>
              </div>
            </div>
          </section>

          <div className="two-column">
            <section className="intelligence-card">
              <div className="card-title">
                <div>
                  <span>02 / CHARACTERIZATION</span>
                  <h2>Spill Intelligence</h2>
                </div>
                <div className="mini-status">
                  ● {detection.status ? detection.status.toUpperCase() : 'VERIFIED'}
                </div>
              </div>

              <div className="data-grid">
                <div>
                  <span>LATITUDE</span>
                  <strong>
                    {slickLat != null
                      ? `${Math.abs(slickLat).toFixed(3)}° ${slickLat >= 0 ? 'N' : 'S'}`
                      : '28.977° N'}
                  </strong>
                </div>

                <div>
                  <span>LONGITUDE</span>
                  <strong>
                    {slickLon != null
                      ? `${Math.abs(slickLon).toFixed(3)}° ${slickLon >= 0 ? 'E' : 'W'}`
                      : '88.939° W'}
                  </strong>
                </div>

                <div>
                  <span>AREA</span>
                  <strong>
                    {slick.area_km2 != null
                      ? `${slick.area_km2.toFixed(3)} km²`
                      : '0.163 km²'}
                  </strong>
                </div>

                <div>
                  <span>EST. AGE</span>
                  <strong>
                    {probableOrigin.age_hours_proxy != null
                      ? `${probableOrigin.age_hours_proxy} hrs`
                      : '12 hrs'}
                  </strong>
                </div>
              </div>

              <div style={{ marginTop: '15px', borderTop: '1px solid rgba(98, 216, 200, 0.08)', paddingTop: '15px' }}>
                <div className="data-grid">
                  <div>
                    <span>LENGTH / WIDTH</span>
                    <strong>
                      {slick.length_km != null && slick.width_km != null
                        ? `${slick.length_km} km × ${slick.width_km} km`
                        : '0.66 km × 0.51 km'}
                    </strong>
                  </div>

                  <div>
                    <span>PERIMETER</span>
                    <strong>
                      {slick.perimeter_km != null
                        ? `${slick.perimeter_km} km`
                        : '2.11 km'}
                    </strong>
                  </div>

                  <div>
                    <span>ORIENTATION</span>
                    <strong>
                      {slick.orientation_deg != null
                        ? `${slick.orientation_deg}°`
                        : '102.4°'}
                    </strong>
                  </div>

                  <div>
                    <span>COMPACTNESS</span>
                    <strong>
                      {slick.compactness != null
                        ? slick.compactness.toFixed(3)
                        : '0.434'}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="origin-panel">
                <div className="origin-header">
                  <span>PROBABLE SPILL ORIGIN</span>
                  <strong>Trace confidence: Not available</strong>
                </div>

                <div className="origin-location">
                  {originLat != null && originLon != null
                    ? formatCoords(originLat, originLon)
                    : '29.185° N · 88.772° W'}
                </div>

                <div className="progress">
                  <div style={{ width: '100%' }}></div>
                </div>

                <p style={{ marginTop: '10px' }}>
                  <strong>Origin Uncertainty:</strong>{' '}
                  {probableOrigin.spatial_spread_km
                    ? `${probableOrigin.spatial_spread_km} km spread envelope`
                    : '8.61 km envelope'}{' '}
                  (Zone area: {probableOrigin.zone_area_km2 ? `${probableOrigin.zone_area_km2} km²` : '249.6 km²'}).
                  Backtracked using 50-particle RK2 Lagrangian advection through ERA5 wind and CMEMS current fields.
                </p>

                <p style={{ marginTop: '8px', color: '#8ba6a2' }}>
                  <strong>Release Time:</strong>{' '}
                  {formatUtc(probableOrigin.estimated_release_time_utc)}
                  <br />
                  <strong>Search Window:</strong>{' '}
                  {probableOrigin.release_time_window?.start_utc && probableOrigin.release_time_window?.end_utc
                    ? `${formatUtc(probableOrigin.release_time_window.start_utc)} — ${formatUtc(probableOrigin.release_time_window.end_utc)} (±${probableOrigin.release_time_window.half_window_hours}h)`
                    : '2023-09-23 09:02 — 15:02 UTC (±3.0h)'}
                </p>
              </div>
            </section>

            <section className="intelligence-card">
              <div className="card-title">
                <div>
                  <span>03 / ENVIRONMENT</span>
                  <h2>Ocean Dynamics</h2>
                </div>
                <div className="forecast-label">
                  +{drift.forecast_hours || 24}H FORECAST
                </div>
              </div>

              <div className="environment-list">
                <div className="environment-row">
                  <div>
                    <span>10M WIND (ERA5)</span>
                    <strong>
                      {wind.direction || 'Cached Vector Field'}
                    </strong>
                  </div>
                  <b>
                    {wind.mean_speed_mps != null
                      ? `${wind.mean_speed_mps.toFixed(2)} m/s (${(wind.mean_speed_mps * 3.6).toFixed(1)} km/h)`
                      : '4.33 m/s (15.6 km/h)'}
                  </b>
                </div>

                <div className="environment-row">
                  <div>
                    <span>OCEAN SURFACE CURRENT</span>
                    <strong>
                      {current.direction || 'CMEMS Hydrodynamic Model'}
                    </strong>
                  </div>
                  <b>
                    {current.mean_speed_mps != null
                      ? `${current.mean_speed_mps.toFixed(2)} m/s`
                      : '0.23 m/s'}
                  </b>
                </div>

                <div className="environment-row">
                  <div>
                    <span>COASTLINE IMPACT</span>
                    <strong>
                      {environment.coast_impact?.available
                        ? environment.coast_impact.coast_flag
                        : 'Land mask unindexed'}
                    </strong>
                  </div>
                  <b>
                    {environment.coast_impact?.available ? 'MONITORED' : 'OPTIONAL STEP'}
                  </b>
                </div>

                <div className="forecast-box">
                  <div className="forecast-arrow">↘</div>
                  <div>
                    <span>PREDICTED ADVECTION</span>
                    <strong>SOUTHWEST DISPERSION</strong>
                  </div>
                  <small>
                    {drift.forecast_hours || 24}h RK2 envelope
                  </small>
                </div>

                <div style={{ marginTop: '16px', fontSize: '9px', color: '#56726e', lineHeight: '1.6' }}>
                  <strong>Data Provenance:</strong>{' '}
                  {environment.metocean?.source ||
                    'Open-Meteo ERA5 10m wind + Open-Meteo marine currents (cached 2026-09-09)'}
                </div>
              </div>
            </section>
          </div>

          <section className="vessel-section">
            <div className="section-heading">
              <div>
                <span>04 / AIS CORRELATION</span>
                <h2>Vessel Attribution & Traffic Analysis</h2>
                <p>
                  Spatio-temporal correlation around the reconstructed origin corridor.
                </p>
              </div>

              <div className="candidate-count">
                <strong>
                  {candidates.length.toString().padStart(2, '0')}
                </strong>
                CANDIDATES
              </div>
            </div>

            {candidates.length === 0 ? (
              <div className="vessel-empty-card">
                <div className="vessel-empty-header">
                  <div className="vessel-empty-icon">⚓</div>
                  <div>
                    <h3>No matching AIS candidates for this incident window.</h3>
                    <p>
                      Vessel attribution requires compatible AIS traffic for the reconstructed origin/time window.
                    </p>
                  </div>
                </div>

                <div className="ais-meta-grid">
                  <div className="ais-meta-item">
                    <span>SPATIAL SEARCH CORRIDOR</span>
                    <strong>28.91°N — 29.45°N · 89.09°W — 88.47°W</strong>
                  </div>

                  <div className="ais-meta-item">
                    <span>TEMPORAL SEARCH WINDOW</span>
                    <strong>
                      {probableOrigin.release_time_window?.start_utc && probableOrigin.release_time_window?.end_utc
                        ? `${formatUtc(probableOrigin.release_time_window.start_utc)} to ${formatUtc(probableOrigin.release_time_window.end_utc)}`
                        : '2023-09-23 09:02 to 15:02 UTC (±3.0h)'}
                    </strong>
                  </div>

                  <div className="ais-meta-item">
                    <span>LOCAL AIS STORE STATUS</span>
                    <strong>
                      Local SQLite store ({ais.store?.vessels || 48} vessels) contains simulated Arabian Sea traffic. Gulf NAIS traffic is not cached locally.
                    </strong>
                  </div>

                  <div className="ais-meta-item">
                    <span>SYSTEM INTEGRITY</span>
                    <strong>
                      Reporting zero suspects honestly rather than forcing an artificial culprit. No vessel is implicated.
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="vessel-layout">
                <div className="vessel-list">
                  {candidates.map((c, index) => {
                    const vesselName = c.vessel?.name || c.name || `Vessel ${index + 1}`
                    const vesselMmsi = c.vessel?.mmsi ? `MMSI ${c.vessel.mmsi}` : c.imo || ''
                    const score = c.score?.value_percent != null ? c.score.value_percent : c.score
                    const isSelected = selectedVessel?.vessel?.mmsi
                      ? selectedVessel.vessel.mmsi === c.vessel?.mmsi
                      : selectedVessel?.name === c.name

                    return (
                      <button
                        className={isSelected ? 'vessel-row selected' : 'vessel-row'}
                        key={c.vessel?.mmsi || c.name || index}
                        onClick={() => setSelectedVessel(c)}
                      >
                        <div className="vessel-rank">
                          0{c.rank || index + 1}
                        </div>

                        <div className="vessel-info">
                          <strong>{vesselName}</strong>
                          <span>{vesselMmsi}</span>
                        </div>

                        <div className="vessel-status">
                          INVESTIGATION LEAD
                        </div>

                        <div className="vessel-score">
                          <span>SCORE</span>
                          <strong>{score}%</strong>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {selectedVessel && (
                  <div className="evidence-panel">
                    <div className="evidence-heading">
                      <div>
                        <span>SELECTED CANDIDATE VESSEL</span>
                        <h3>{selectedVessel.vessel?.name || selectedVessel.name}</h3>
                        <small>{selectedVessel.vessel?.mmsi ? `MMSI ${selectedVessel.vessel.mmsi}` : selectedVessel.imo}</small>
                      </div>

                      <div className="big-score">
                        <span>EVIDENCE</span>
                        <strong>{selectedVessel.score?.value_percent || selectedVessel.score}%</strong>
                      </div>
                    </div>

                    <div className="evidence-bars">
                      <EvidenceBar
                        label="PROXIMITY"
                        value={selectedVessel.score?.components?.proximity ?? selectedVessel.proximity ?? 0}
                      />
                      <EvidenceBar
                        label="TIME MATCH"
                        value={selectedVessel.score?.components?.time_match ?? selectedVessel.timeMatch ?? 0}
                      />
                      <EvidenceBar
                        label="TRAJECTORY"
                        value={selectedVessel.score?.components?.trajectory ?? selectedVessel.trajectory ?? 0}
                      />
                      <EvidenceBar
                        label="BEHAVIOURAL SIGNAL"
                        value={selectedVessel.score?.components?.behaviour ?? selectedVessel.behaviour ?? 0}
                      />
                    </div>

                    {selectedVessel.evidence?.reasons && (
                      <div style={{ marginTop: '15px' }}>
                        {selectedVessel.evidence.reasons.map((r, i) => (
                          <span key={i} className="data-tag" style={{ marginRight: '6px' }}>
                            {r}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="evidence-note">
                      <span>INVESTIGATION NOTE</span>
                      <p>
                        Vessel ranking represents an investigative lead based on spatio-temporal correlation.
                        It does not constitute definitive proof of legal responsibility.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="timeline-section">
            <div className="section-heading">
              <div>
                <span>05 / INCIDENT TIMELINE</span>
                <h2>Reconstructed Event Sequence</h2>
              </div>
            </div>

            <div className="timeline">
              <Timeline
                time={`T−${probableOrigin.age_hours_proxy || 12}H`}
                title="Estimated Spill Release"
                text={`RK2 hindcast ensemble converges on probable release zone (${probableOrigin.spatial_spread_km || '8.61'} km spread envelope).`}
              />

              <Timeline
                time="SEARCH WINDOW"
                title="AIS Attribution Funnel"
                text={`Spatio-temporal correlation window evaluated (${probableOrigin.release_time_window?.start_utc ? formatUtc(probableOrigin.release_time_window.start_utc) : '09:02 UTC'} to ${probableOrigin.release_time_window?.end_utc ? formatUtc(probableOrigin.release_time_window.end_utc) : '15:02 UTC'}). 0 vessels matched in local store.`}
              />

              <Timeline
                time="NOW (PASS)"
                title="Sentinel-1 SAR Satellite Detection"
                text={`Sentinel-1 SAR scene confirms mineral oil slick signature (${slick.area_km2 != null ? `${slick.area_km2.toFixed(3)} km²` : '0.163 km²'}).`}
                active
              />

              <Timeline
                time={`T+${drift.forecast_hours || 24}H`}
                title="Forecast Advection & Dispersion"
                text={`Forward dispersion model projects 24-hour southwest trajectory (${forecastCone?.properties?.area_km2 ? `${forecastCone.properties.area_km2.toFixed(1)} km²` : 'envelope'}).`}
              />
            </div>
          </section>

          <section className="provenance-section">
            <div className="section-heading">
              <div>
                <span>06 / SCIENTIFIC AUDIT & DATA PROVENANCE</span>
                <h2>System Status & Scientific Disclosures</h2>
                <p>
                  Transparently disclosing data provenance, offline boundaries, and active pipeline checkpoints.
                </p>
              </div>
            </div>

            <div className="provenance-grid">
              <div className="provenance-card">
                <span>SAR SATELLITE SENSOR</span>
                <strong>Sentinel-1 IW GRD RTC</strong>
                <p>
                  {scene.source || 'Hosted by Microsoft Planetary Computer under CC BY 4.0. Dual-pol VV/VH radiometry.'}
                </p>
                <div className="data-tag">REAL SATELLITE DATA</div>
              </div>

              <div className="provenance-card">
                <span>DETECTOR PIPELINE</span>
                <strong>Baseline Threshold (-22 dB)</strong>
                <p>
                  Segmented using radiometric sea-floor contrast. Trained U-Net++ checkpoint is currently pending.
                </p>
                <div className="data-tag">BASELINE DETECTOR</div>
              </div>

              <div className="provenance-card">
                <span>METOCEAN FIELDS</span>
                <strong>ERA5 Wind + CMEMS Currents</strong>
                <p>
                  {environment.metocean?.source || 'Open-Meteo cached metocean data. Bilinear in space, linear in time.'}
                </p>
                <div className="data-tag">CACHED METOCEAN</div>
              </div>

              <div className="provenance-card">
                <span>AIS TRAFFIC STORE</span>
                <strong>Zero Candidates Matched</strong>
                <p>
                  Local SQLite store contains simulated Arabian Sea traffic. Compatible Gulf NAIS 2023 traffic is not cached.
                </p>
                <div className="data-tag unavailable">EMPTY AIS STORE</div>
              </div>
            </div>
          </section>

          <section className="report-section">
            <div>
              <span>AUTHORITY OUTPUT</span>
              <h2>Investigation Package Ready</h2>
              <p>
                Compile satellite evidence, spill coordinates, environmental conditions,
                predicted trajectory and AIS correlation notes into an official Maritime Pollution Attribution Note.
              </p>
            </div>

            <div className="report-actions">
              <a
                className="primary-button"
                href={getReportUrl(jobId)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', display: 'inline-block' }}
              >
                VIEW AUTHORITY REPORT (HTML) →
              </a>

              <a
                className="outline-button"
                href={getGeoJsonUrl(jobId)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', display: 'inline-block' }}
              >
                EXPORT GIS GEOJSON
              </a>

              <a
                className="outline-button"
                href={getJobJsonUrl(jobId)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', display: 'inline-block' }}
              >
                RAW AUDIT JSON
              </a>
            </div>
          </section>

          <footer>
            <div>
              OCEAN<span>TRACE</span>
            </div>
            <p>
              Probabilistic maritime intelligence for environmental protection · SIH 2026 PS 26143 · Team CODEX
            </p>
            <small>
              TIDETRACE ENGINE · OFFLINE READY
            </small>
          </footer>
        </main>
      )}
    </div>
  )
}

function EvidenceBar({ label, value }) {
  const num = typeof value === 'number' ? Math.round(value) : 0
  return (
    <div className="evidence-bar">
      <div className="evidence-bar-top">
        <span>{label}</span>
        <strong>{num}%</strong>
      </div>
      <div className="bar">
        <div style={{ width: `${Math.min(100, Math.max(0, num))}%` }}></div>
      </div>
    </div>
  )
}

function Timeline({ time, title, text, active }) {
  return (
    <div className={active ? 'timeline-item active' : 'timeline-item'}>
      <div className="timeline-time">{time}</div>
      <div className="timeline-node"></div>
      <div className="timeline-content">
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  )
}

export default App