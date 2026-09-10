import { useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
  Polygon
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import './App.css'

delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
})

const vessels = [
  {
    name: 'MV Ocean Star',
    imo: 'IMO 9384721',
    score: 91,
    proximity: 94,
    timeMatch: 92,
    trajectory: 89,
    behaviour: 82,
    lat: 13.08,
    lon: 74.61,
    status: 'HIGH PRIORITY'
  },
  {
    name: 'MV Blue Wave',
    imo: 'IMO 9273814',
    score: 78,
    proximity: 83,
    timeMatch: 79,
    trajectory: 76,
    behaviour: 69,
    lat: 13.15,
    lon: 74.72,
    status: 'REVIEW'
  },
  {
    name: 'MV Sea Falcon',
    imo: 'IMO 9156283',
    score: 66,
    proximity: 71,
    timeMatch: 68,
    trajectory: 65,
    behaviour: 58,
    lat: 12.94,
    lon: 74.48,
    status: 'LOWER PRIORITY'
  }
]

const spillPolygon = [
  [13.218, 74.77],
  [13.232, 74.795],
  [13.267, 74.84],
  [13.282, 74.855],
  [13.27, 74.88],
  [13.24, 74.86],
  [13.215, 74.82],
  [13.218, 74.77]
]

const forecastPath = [
  [13.245, 74.812],
  [13.27, 74.84],
  [13.30, 74.87],
  [13.33, 74.91],
  [13.37, 74.96]
]

function App() {
  const [file, setFile] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [detected, setDetected] = useState(false)
  const [selectedVessel, setSelectedVessel] = useState(vessels[0])

  const handleFile = (event) => {
    const selected = event.target.files[0]

    if (!selected) return

    setFile(selected)
    setImageUrl(URL.createObjectURL(selected))
    setDetected(false)
  }

  const analyzeImage = () => {
    if (!file) return

    setAnalyzing(true)

    setTimeout(() => {
      setAnalyzing(false)
      setDetected(true)
    }, 2200)
  }

  const reset = () => {
    setFile(null)
    setImageUrl(null)
    setDetected(false)
    setSelectedVessel(vessels[0])
  }

  return (
    <div className="app">

      <header className="header">

        <div className="brand">
          <div className="logo">
            OCEAN<span>TRACE</span>
          </div>

          <div className="brand-subtitle">
            MARITIME INTELLIGENCE PLATFORM
          </div>
        </div>

        <div className="header-right">

          <div className="live-status">
            <span></span>
            LIVE SYSTEM
          </div>

          <div className="header-divider"></div>

          <div className="mission">
            MISSION ID
            <strong>OT-26143</strong>
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
              conditions and vessel movement data to transform
              marine oil-spill detection into an actionable
              maritime investigation.
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

            {!file ? (

              <div className="upload-content">

                <div className="radar">

                  <div className="radar-ring ring-one"></div>
                  <div className="radar-ring ring-two"></div>
                  <div className="radar-ring ring-three"></div>
                  <div className="radar-cross horizontal"></div>
                  <div className="radar-cross vertical"></div>
                  <div className="radar-dot"></div>

                </div>

                <h2>
                  SATELLITE IMAGERY
                </h2>

                <p>
                  Upload SAR / EO imagery to begin
                  automated investigation.
                </p>

                <label className="primary-button">
                  UPLOAD IMAGE
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleFile}
                  />
                </label>

                <div className="supported">
                  JPG · PNG · TIFF · SAR · EO
                </div>

              </div>

            ) : (

              <div className="upload-content">

                <div className="image-preview">

                  <img
                    src={imageUrl}
                    alt="Satellite imagery"
                  />

                  <div className="scan-line"></div>

                </div>

                <div className="selected-file">
                  <span>FILE SELECTED</span>
                  <strong>{file.name}</strong>
                </div>

                <button
                  className="primary-button"
                  onClick={analyzeImage}
                  disabled={analyzing}
                >
                  {analyzing
                    ? 'ANALYZING SATELLITE DATA...'
                    : 'START INVESTIGATION →'}
                </button>

                <button
                  className="text-button"
                  onClick={reset}
                >
                  SELECT DIFFERENT IMAGE
                </button>

              </div>

            )}

          </div>

        </main>

      ) : (

        <main className="dashboard">

          <div className="dashboard-header">

            <div>

              <div className="eyebrow">
                INVESTIGATION / OT-26143 / COMPLETE
              </div>

              <h1>
                Marine Spill Investigation
              </h1>

              <p>
                Automated satellite detection, source tracing
                and vessel attribution.
              </p>

            </div>

            <div className="dashboard-actions">

              <div className="confidence-badge">
                <span>OVERALL CONFIDENCE</span>
                <strong>89.4%</strong>
              </div>

              <button
                className="outline-button"
                onClick={reset}
              >
                + NEW CASE
              </button>

            </div>

          </div>

          <div className="pipeline">

            <div className="pipeline-step active">
              <span>01</span>
              DETECTED
            </div>

            <div className="pipeline-connector active"></div>

            <div className="pipeline-step active">
              <span>02</span>
              CHARACTERIZED
            </div>

            <div className="pipeline-connector active"></div>

            <div className="pipeline-step active">
              <span>03</span>
              TRACED
            </div>

            <div className="pipeline-connector active"></div>

            <div className="pipeline-step active">
              <span>04</span>
              FORECAST
            </div>

            <div className="pipeline-connector active"></div>

            <div className="pipeline-step active">
              <span>05</span>
              ATTRIBUTED
            </div>

          </div>

          <div className="stats-grid">

            <div className="stat-card">

              <div className="stat-top">
                DETECTION CONFIDENCE
                <span>AI</span>
              </div>

              <strong>94.7%</strong>

              <div className="stat-bottom">
                HIGH CONFIDENCE
              </div>

            </div>

            <div className="stat-card">

              <div className="stat-top">
                SPILL AREA
                <span>AREA</span>
              </div>

              <strong>4.82 km²</strong>

              <div className="stat-bottom">
                ESTIMATED
              </div>

            </div>

            <div className="stat-card danger-card">

              <div className="stat-top">
                SEVERITY
                <span>ALERT</span>
              </div>

              <strong>HIGH</strong>

              <div className="stat-bottom">
                ACTIVE SPILL
              </div>

            </div>

            <div className="stat-card">

              <div className="stat-top">
                ESTIMATED AGE
                <span>TIME</span>
              </div>

              <strong>6–10 HRS</strong>

              <div className="stat-bottom">
                FROM DETECTION
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
                <span>
                  <i className="dot spill"></i>
                  DETECTED SPILL
                </span>

                <span>
                  <i className="dot origin"></i>
                  PROBABLE ORIGIN
                </span>

                <span>
                  <i className="dot ship"></i>
                  AIS VESSEL
                </span>
              </div>

            </div>

            <div className="map-wrapper">

              <MapContainer
                center={[13.18, 74.70]}
                zoom={9}
                scrollWheelZoom={true}
                style={{
                  width: '100%',
                  height: '100%'
                }}
              >

                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <Polygon
                  positions={spillPolygon}
                  pathOptions={{
                    color: '#ff665f',
                    fillColor: '#ff665f',
                    fillOpacity: 0.3,
                    weight: 2
                  }}
                />

                <Circle
                  center={[13.245, 74.812]}
                  radius={3500}
                  pathOptions={{
                    color: '#ff665f',
                    fillColor: '#ff665f',
                    fillOpacity: 0.08,
                    weight: 1
                  }}
                />

                <Marker
                  position={[13.245, 74.812]}
                >

                  <Popup>

                    <strong>
                      OIL SPILL DETECTED
                    </strong>

                    <br />

                    13.245° N · 74.812° E

                    <br />

                    Area: 4.82 km²

                  </Popup>

                </Marker>

                <Circle
                  center={[13.08, 74.61]}
                  radius={5000}
                  pathOptions={{
                    color: '#62d8c8',
                    fillOpacity: 0.08,
                    dashArray: '8 8'
                  }}
                />

                <Marker
                  position={[13.08, 74.61]}
                >

                  <Popup>

                    <strong>
                      PROBABLE ORIGIN
                    </strong>

                    <br />

                    13.080° N · 74.610° E

                    <br />

                    Trace confidence: 81%

                  </Popup>

                </Marker>

                <Polyline
                  positions={[
                    [13.08, 74.61],
                    [13.12, 74.65],
                    [13.18, 74.70],
                    [13.245, 74.812]
                  ]}
                  pathOptions={{
                    color: '#62d8c8',
                    weight: 3,
                    dashArray: '10 8'
                  }}
                />

                <Polyline
                  positions={forecastPath}
                  pathOptions={{
                    color: '#f3c969',
                    weight: 3,
                    dashArray: '5 8'
                  }}
                />

                {vessels.map((vessel) => (

                  <Marker
                    key={vessel.name}
                    position={[
                      vessel.lat,
                      vessel.lon
                    ]}
                    eventHandlers={{
                      click: () => setSelectedVessel(vessel)
                    }}
                  >

                    <Popup>

                      <strong>
                        {vessel.name}
                      </strong>

                      <br />

                      Evidence Score:
                      {' '}
                      {vessel.score}%

                      <br />

                      AIS correlation detected

                    </Popup>

                  </Marker>

                ))}

              </MapContainer>

              <div className="map-overlay top-left">
                <span>LIVE GEOREFERENCE</span>
                <strong>13.245° N</strong>
                <small>74.812° E</small>
              </div>

              <div className="map-overlay bottom-right">
                <span>FORECAST VECTOR</span>
                <strong>↗ NE</strong>
                <small>+6 HOURS</small>
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
                  ● VERIFIED
                </div>

              </div>

              <div className="data-grid">

                <div>
                  <span>LATITUDE</span>
                  <strong>13.245° N</strong>
                </div>

                <div>
                  <span>LONGITUDE</span>
                  <strong>74.812° E</strong>
                </div>

                <div>
                  <span>AREA</span>
                  <strong>4.82 km²</strong>
                </div>

                <div>
                  <span>EST. AGE</span>
                  <strong>6–10 hrs</strong>
                </div>

              </div>

              <div className="origin-panel">

                <div className="origin-header">
                  <span>PROBABLE SPILL ORIGIN</span>
                  <strong>81%</strong>
                </div>

                <div className="origin-location">
                  13.080° N
                  <span>·</span>
                  74.610° E
                </div>

                <div className="progress">
                  <div style={{ width: '81%' }}></div>
                </div>

                <p>
                  Backtracked using estimated spill age,
                  wind direction and ocean-current movement.
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
                  +6H FORECAST
                </div>

              </div>

              <div className="environment-list">

                <div className="environment-row">
                  <div>
                    <span>WIND</span>
                    <strong>SW → NE</strong>
                  </div>

                  <b>18 km/h</b>
                </div>

                <div className="environment-row">
                  <div>
                    <span>OCEAN CURRENT</span>
                    <strong>NW → SE</strong>
                  </div>

                  <b>1.4 m/s</b>
                </div>

                <div className="environment-row">
                  <div>
                    <span>SEA STATE</span>
                    <strong>MODERATE</strong>
                  </div>

                  <b>1.2 m</b>
                </div>

                <div className="forecast-box">
                  <div className="forecast-arrow">↗</div>

                  <div>
                    <span>PREDICTED MOVEMENT</span>
                    <strong>NORTHEAST</strong>
                  </div>

                  <small>
                    6 hour trajectory estimate
                  </small>
                </div>

              </div>

            </section>

          </div>

          <section className="vessel-section">

            <div className="section-heading">

              <div>
                <span>04 / AIS CORRELATION</span>
                <h2>Potential Responsible Vessels</h2>

                <p>
                  Evidence-ranked candidates based on spatial,
                  temporal and trajectory correlation.
                </p>
              </div>

              <div className="candidate-count">
                <strong>03</strong>
                CANDIDATES
              </div>

            </div>

            <div className="vessel-layout">

              <div className="vessel-list">

                {vessels.map((vessel, index) => (

                  <button
                    className={
                      selectedVessel.name === vessel.name
                        ? 'vessel-row selected'
                        : 'vessel-row'
                    }
                    key={vessel.name}
                    onClick={() =>
                      setSelectedVessel(vessel)
                    }
                  >

                    <div className="vessel-rank">
                      0{index + 1}
                    </div>

                    <div className="vessel-info">
                      <strong>{vessel.name}</strong>
                      <span>{vessel.imo}</span>
                    </div>

                    <div className="vessel-status">
                      {vessel.status}
                    </div>

                    <div className="vessel-score">
                      <span>SCORE</span>
                      <strong>{vessel.score}%</strong>
                    </div>

                  </button>

                ))}

              </div>

              <div className="evidence-panel">

                <div className="evidence-heading">

                  <div>
                    <span>SELECTED CANDIDATE</span>
                    <h3>
                      {selectedVessel.name}
                    </h3>

                    <small>
                      {selectedVessel.imo}
                    </small>
                  </div>

                  <div className="big-score">
                    <span>EVIDENCE</span>
                    <strong>
                      {selectedVessel.score}%
                    </strong>
                  </div>

                </div>

                <div className="evidence-bars">

                  <EvidenceBar
                    label="PROXIMITY"
                    value={selectedVessel.proximity}
                  />

                  <EvidenceBar
                    label="TIME MATCH"
                    value={selectedVessel.timeMatch}
                  />

                  <EvidenceBar
                    label="TRAJECTORY"
                    value={selectedVessel.trajectory}
                  />

                  <EvidenceBar
                    label="BEHAVIOURAL SIGNAL"
                    value={selectedVessel.behaviour}
                  />

                </div>

                <div className="evidence-note">

                  <span>INVESTIGATION NOTE</span>

                  <p>
                    Vessel movement shows strong spatial and
                    temporal correlation with the estimated
                    spill origin. This ranking indicates
                    investigative priority, not definitive
                    proof of responsibility.
                  </p>

                </div>

              </div>

            </div>

          </section>

          <section className="timeline-section">

            <div className="section-heading">

              <div>
                <span>05 / INCIDENT TIMELINE</span>
                <h2>Reconstructed Event</h2>
              </div>

            </div>

            <div className="timeline">

              <Timeline
                time="T−10 HRS"
                title="Possible Release Window"
                text="Environmental and AIS data indicate a potential release window."
              />

              <Timeline
                time="T−8 HRS"
                title="Vessel Correlation"
                text="Multiple vessels detected within the probable source corridor."
              />

              <Timeline
                time="T−6 HRS"
                title="Spill Expansion"
                text="Estimated slick movement begins toward northeast."
              />

              <Timeline
                time="NOW"
                title="Satellite Detection"
                text="Satellite imagery confirms active oil-spill signature."
                active
              />

              <Timeline
                time="T+6 HRS"
                title="Predicted Movement"
                text="Forecast trajectory indicates continued northeast displacement."
              />

            </div>

          </section>

          <section className="report-section">

            <div>

              <span>AUTHORITY OUTPUT</span>

              <h2>
                Investigation Package Ready
              </h2>

              <p>
                Compile satellite evidence, spill coordinates,
                environmental conditions, predicted trajectory
                and AIS vessel rankings into an investigation report.
              </p>

            </div>

            <div className="report-actions">

              <button className="primary-button">
                GENERATE REPORT →
              </button>

              <button className="outline-button">
                VIEW EVIDENCE
              </button>

            </div>

          </section>

          <footer>

            <div>
              OCEAN<span>TRACE</span>
            </div>

            <p>
              Probabilistic intelligence for maritime
              environmental protection.
            </p>

            <small>
              PROTOTYPE · SIH 2026
            </small>

          </footer>

        </main>

      )}

    </div>
  )
}

function EvidenceBar({ label, value }) {
  return (
    <div className="evidence-bar">

      <div className="evidence-bar-top">
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>

      <div className="bar">
        <div style={{ width: `${value}%` }}></div>
      </div>

    </div>
  )
}

function Timeline({ time, title, text, active }) {
  return (
    <div className={active ? 'timeline-item active' : 'timeline-item'}>

      <div className="timeline-time">
        {time}
      </div>

      <div className="timeline-node"></div>

      <div className="timeline-content">
        <strong>{title}</strong>
        <p>{text}</p>
      </div>

    </div>
  )
}

export default App