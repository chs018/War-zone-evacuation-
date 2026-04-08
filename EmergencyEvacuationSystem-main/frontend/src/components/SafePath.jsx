import React, { useEffect } from 'react';
import './SafePath.css';
import { Link } from 'react-router-dom';

export default function SafePath() {
  useEffect(() => {
    if (!window.L) return;

    // Initialize timers array
    window.spTimers = [];
    window.spMapInitialized = true; // Add a flag to indicate map is initialized

    try {
      // MAP INIT
      const map = window.L.map('safepath-map', { center: [32.27, 75.65], zoom: 11, zoomControl: true, attributionControl: false });
      window.spMap = map;
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);

      window.spFlyTo = (pos, zoom) => { map.flyTo(pos, zoom, { duration: 1.2 }); };

      function dot(color, size=10) {
        return window.L.divIcon({
          className:'',
          html:`<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:2px solid rgba(255,255,255,.4);box-shadow:0 0 8px ${color}"></div>`,
          iconSize:[size,size], iconAnchor:[size/2,size/2]
        });
      }
      function shelterIcon(color) {
        return window.L.divIcon({
          className:'',
          html:`<div style="background:${color};color:#000;padding:2px 6px;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:10px;letter-spacing:1px;box-shadow:0 0 8px ${color}">SHELTER</div>`,
          iconSize:[56,16], iconAnchor:[28,8]
        });
      }
      function droneIcon(id) {
        return window.L.divIcon({
          className:'',
          html:`<div style="font-size:18px;filter:drop-shadow(0 0 4px #ff353599)" title="Drone ${id}">✈</div>`,
          iconSize:[24,24], iconAnchor:[12,12]
        });
      }

      const NODES = {
        pathankot: [32.2643, 75.6521], dhar: [32.2480, 75.6310], chakki: [32.2710, 75.6430],
        mamoon: [32.2350, 75.6150], sarna: [32.2550, 75.6700], sujanpur: [32.1700, 75.5400],
        dera: [32.0800, 75.4800], gurdaspur: [32.0407, 75.4061], dhariwal: [32.0350, 75.3120],
        batala: [31.8198, 75.2027], amritsar: [31.6340, 74.8723], dinanagar: [32.1500, 75.5000],
        mukerian: [31.9500, 75.6200],
      };

      const BASE_EDGES = [
        ['pathankot','dhar', 4.2], ['pathankot','chakki', 3.1], ['pathankot','sarna', 3.8],
        ['pathankot','mamoon', 5.0], ['dhar','sujanpur', 12.0], ['chakki','sujanpur', 14.0],
        ['mamoon','dinanagar', 9.0], ['sarna','mukerian', 25.0], ['sujanpur','dera', 10.0],
        ['sujanpur','dinanagar', 6.0], ['dinanagar','gurdaspur', 12.0], ['dinanagar','dera', 8.0],
        ['dera','gurdaspur', 8.0], ['dera','dhariwal', 9.0], ['gurdaspur','dhariwal', 8.0],
        ['gurdaspur','batala', 24.0], ['dhariwal','batala', 20.0], ['batala','amritsar', 42.0],
        ['mukerian','batala', 30.0],
      ];

      let edgeWeights = {};
      function resetWeights() {
        edgeWeights = {};
        BASE_EDGES.forEach(([a,b,d]) => {
          edgeWeights[a+'-'+b] = { dist: d, danger: 0, blocked: false };
          edgeWeights[b+'-'+a] = { dist: d, danger: 0, blocked: false };
        });
      }
      resetWeights();

      function edgeCost(a, b) {
        const e = edgeWeights[a+'-'+b];
        if (!e || e.blocked) return Infinity;
        return e.dist * (1 + e.danger * 2.5);
      }
      function heuristic(a, b) {
        const [lat1,lng1] = NODES[a], [lat2,lng2] = NODES[b];
        const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
        const h = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
      }
      function neighbors(node) {
        return BASE_EDGES.filter(([a,b]) => a===node || b===node).map(([a,b]) => a===node ? b : a);
      }

      function findPath(start, end, mode='astar') {
        const dist = {}, prev = {}, visited = new Set();
        const fScore = {};
        Object.keys(NODES).forEach(n => { dist[n]=Infinity; fScore[n]=Infinity; });
        dist[start] = 0;
        fScore[start] = mode==='astar' ? heuristic(start,end) : 0;

        const pq = [[fScore[start], start]];
        while (pq.length) {
          pq.sort((a,b)=>a[0]-b[0]);
          const [,u] = pq.shift();
          if (visited.has(u)) continue;
          visited.add(u);
          if (u===end) break;
          for (const v of neighbors(u)) {
            const cost = edgeCost(u,v);
            if (cost===Infinity) continue;
            const newDist = dist[u] + cost;
            if (newDist < dist[v]) {
              dist[v] = newDist;
              prev[v] = u;
              fScore[v] = newDist + (mode==='astar' ? heuristic(v,end) : 0);
              pq.push([fScore[v], v]);
            }
          }
        }
        if (dist[end]===Infinity) return null;
        const path = []; let cur = end;
        while (cur) { path.unshift(cur); cur = prev[cur]; }
        return { path, cost: dist[end] };
      }

      const scenarios = {
        border: {
          danger: [
            { c:[32.320,75.690], r:4500, label:'Combat Zone', edges:['pathankot-sarna','sarna-mukerian'] },
            { c:[32.241,75.634], r:2800, label:'Strike Zone', edges:['pathankot-chakki','chakki-sujanpur'] },
          ],
          caution: [
            { c:[32.181,75.498], r:2000, label:'Bridge Damaged', edges:[] },
            { c:[32.241,75.634], r:1200, label:'Road Blocked', edges:[] },
          ],
          safe: [{ c:[32.022,75.381], r:4500, label:'Safe Corridor' }]
        },
        flood: {
          danger: [
            { c:[32.271,75.615], r:5000, label:'Flood Zone', edges:['pathankot-chakki','chakki-sujanpur','pathankot-dhar'] },
            { c:[32.180,75.560], r:3000, label:'Submerged Roads', edges:['sujanpur-dera','dinanagar-dera'] },
          ],
          caution: [{ c:[32.10,75.47], r:2500, label:'Rising Waters', edges:[] }],
          safe: [{ c:[31.90,75.30], r:5500, label:'Highland Camp' }]
        },
        quake: {
          danger: [
            { c:[32.265,75.652], r:6000, label:'Epicentre', edges:['pathankot-chakki','pathankot-dhar','pathankot-sarna','pathankot-mamoon'] },
            { c:[32.240,75.600], r:2800, label:'Collapse Zone', edges:['dhar-sujanpur'] },
          ],
          caution: [
            { c:[32.150,75.520], r:3500, label:'Aftershock Risk', edges:[] },
            { c:[32.300,75.500], r:2000, label:'Unstable Ground', edges:[] },
          ],
          safe: [{ c:[31.950,75.350], r:6000, label:'Open Camp' }]
        }
      };

      let zoneLayers = [], shelterMarkers = [], originMarkers = [];
      window.spCurrentScenario = 'border';

      function applyScenario(name) {
        zoneLayers.forEach(l => map.removeLayer(l)); zoneLayers = [];
        shelterMarkers.forEach(l => map.removeLayer(l)); shelterMarkers = [];
        originMarkers.forEach(l => map.removeLayer(l)); originMarkers = [];
        resetWeights();
        window.spCurrentScenario = name;
        const s = scenarios[name];

        (s.danger||[]).forEach(z => {
          const c = window.L.circle(z.c, { radius:z.r, color:'#ff3535', fillColor:'#ff3535', fillOpacity:.15, weight:1.5, opacity:.6 }).addTo(map);
          const lb = window.L.marker(z.c, { icon: window.L.divIcon({ className:'', html:`<div style="font-family:'Share Tech Mono',monospace;font-size:9px;color:#ff3535;white-space:nowrap">${z.label}</div>`, iconSize:[100,14], iconAnchor:[50,7] }) }).addTo(map);
          zoneLayers.push(c, lb);
          if (z.edges) z.edges.forEach(e => {
            if (edgeWeights[e]) edgeWeights[e].danger = 0.85;
            const rev = e.split('-').reverse().join('-');
            if (edgeWeights[rev]) edgeWeights[rev].danger = 0.85;
          });
        });

        (s.caution||[]).forEach(z => {
          const c = window.L.circle(z.c, { radius:z.r, color:'#ffaa00', fillColor:'#ffaa00', fillOpacity:.12, weight:1, opacity:.5 }).addTo(map);
          zoneLayers.push(c);
        });

        (s.safe||[]).forEach(z => {
          const c = window.L.circle(z.c, { radius:z.r, color:'#00e676', fillColor:'#00e676', fillOpacity:.08, weight:1, opacity:.4 }).addTo(map);
          zoneLayers.push(c);
        });

        ['pathankot','dhar','chakki','mamoon','sarna'].forEach(id => {
          const m = window.L.marker(NODES[id], { icon: dot('#00e5ff',9) })
            .bindTooltip(id.replace(/^\w/,c=>c.toUpperCase()), {permanent:false}).addTo(map);
          originMarkers.push(m);
        });

        [
          {id:'gurdaspur',color:'#00e676'}, {id:'batala',color:'#ffaa00'},
          {id:'amritsar',color:'#00e676'}, {id:'dhariwal',color:'#ff3535'},
        ].forEach(({id,color}) => {
          const m = window.L.marker(NODES[id], { icon: shelterIcon(color) })
            .bindTooltip(id.replace(/^\w/,c=>c.toUpperCase())+' Shelter', {permanent:false}).addTo(map);
          shelterMarkers.push(m);
        });
      }

      window.spSetScenario = function(name, btnId) {
        document.querySelectorAll('.safepath-wrapper .sim-btn').forEach(b=>b.classList.remove('active'));
        document.getElementById(btnId)?.classList.add('active');
        applyScenario(name);
        window.spClearRoute();
        window.spAddAlert(`<strong>SCENARIO</strong> — ${name.toUpperCase()} simulation loaded.`, 'warn');
        const stats = { border:[2847,1203,3,4], flood:[4120,890,1,5], quake:[3560,650,0,6] };
        const [civ,ev,dr,zo] = stats[name];
        window.spAnimStat('sCiv',civ); window.spAnimStat('sEvac',ev); window.spAnimStat('sDrones',dr); window.spAnimStat('spZones',zo);
        document.getElementById('dc').textContent = dr;
      };

      window.spClearAllZones = function() {
        zoneLayers.forEach(l => map.removeLayer(l));
        zoneLayers = [];
        resetWeights();
        window.spAddAlert('<strong>ZONES CLEARED</strong> — All danger zones removed.', 'safe');
      };

      let routeLayerMain = null, routeGlow = null, routeStartM = null, routeEndM = null;
      window.spClearRoute = function() {
        [routeLayerMain, routeGlow, routeStartM, routeEndM].forEach(l => l && map.removeLayer(l));
        routeLayerMain = routeGlow = routeStartM = routeEndM = null;
        document.getElementById('spRouteBox')?.classList.remove('show');
        document.getElementById('spRecalcNotice')?.classList.remove('show');
      };

      let currentOrigin = null, currentDest = null, currentAlgo = null;

      window.spCalculateRoute = function(silent=false) {
        const origin = document.getElementById('spOrigin').value;
        const dest   = document.getElementById('spDest').value;
        const algo   = document.getElementById('spAlgo').value;

        if (!origin || !dest) {
          if (!silent) window.spAddAlert('<strong>INPUT ERROR</strong> — Select origin and destination.', 'warn');
          return;
        }

        currentOrigin = origin; currentDest = dest; currentAlgo = algo;

        if (!silent) {
          document.getElementById('spComputing').classList.add('show');
          document.getElementById('spRouteBox').classList.remove('show');
        }

        setTimeout(() => {
          document.getElementById('spComputing')?.classList.remove('show');
          const result = findPath(origin, dest, algo);
          window.spDrawRoute(result, origin, dest, algo, silent);
        }, silent ? 0 : 1200);
      };

      window.spDrawRoute = function(result, origin, dest, algo, silent) {
        window.spClearRoute();
        if (!result) {
          window.spAddAlert('<strong>NO SAFE ROUTE</strong> — All paths blocked. Shelter in place.', 'danger');
          document.getElementById('spRouteBox').classList.add('show');
          document.getElementById('spRouteTitle').textContent = '✗ NO SAFE ROUTE FOUND';
          document.getElementById('spRouteTitle').style.color = 'var(--danger)';
          document.getElementById('spRouteMeta').innerHTML = `All paths from <span>${origin}</span> are currently blocked by threat zones.`;
          document.getElementById('spRouteSteps').innerHTML = '';
          return;
        }

        const latLngs = result.path.map(id => NODES[id]);
        routeLayerMain = window.L.polyline(latLngs, { color:'#00e5ff', weight:4, opacity:.9 }).addTo(map);
        routeGlow = window.L.polyline(latLngs, { color:'#00e5ff', weight:12, opacity:.12 }).addTo(map);
        routeStartM = window.L.marker(latLngs[0], { icon: dot('#00e5ff',13) }).addTo(map);
        routeEndM   = window.L.marker(latLngs[latLngs.length-1], { icon: dot('#00e676',15) }).addTo(map);
        map.fitBounds(routeLayerMain.getBounds(), { padding:[50,50] });

        const steps = [];
        for (let i=0; i<result.path.length-1; i++) {
          const a = result.path[i], b = result.path[i+1];
          const w = edgeWeights[a+'-'+b];
          const danger = w ? (w.danger>0.5 ? ' ⚠ HIGH RISK' : w.danger>0 ? ' — caution' : '') : '';
          steps.push(`${a.replace(/^\w/,c=>c.toUpperCase())} → ${b.replace(/^\w/,c=>c.toUpperCase())}${danger}`);
        }

        const dangerColor = result.cost > 80 ? '#ffaa00' : '#00e676';
        const dangerLabel = result.cost > 80 ? 'MEDIUM' : 'LOW';

        document.getElementById('spRouteTitle').textContent = '✓ SAFE ROUTE FOUND';
        document.getElementById('spRouteTitle').style.color = 'var(--safe)';
        document.getElementById('spRouteMeta').innerHTML =
          `DIST: <span>~${Math.round(result.cost)} km</span><br>` +
          `ETA: <span>~${Math.round(result.cost/55*60)} min</span><br>` +
          `RISK: <span style="color:${dangerColor}">${dangerLabel}</span><br>` +
          `ALGO: <span>${algo==='astar'?'A* Search':'Dijkstra'}</span>`;

        const stepsEl = document.getElementById('spRouteSteps');
        if(stepsEl) stepsEl.innerHTML = steps.map((s,i)=>`<div class="route-step"><span class="step-n">[${String(i+1).padStart(2,'0')}]</span>${s}</div>`).join('');
        document.getElementById('spRouteBox').classList.add('show');

        if (!silent) window.spAddAlert(`<strong>ROUTE ACTIVE</strong> — ${result.path.length-1} segments, ${Math.round(result.cost)} km, ETA ~${Math.round(result.cost/55*60)} min.`, 'safe');
      };

      window.spMaybeRecalc = function(reason) {
        if (!currentOrigin || !currentDest) return;
        if (!document.getElementById('spAutoRecalc')?.checked) return;
        const notice = document.getElementById('spRecalcNotice');
        if(notice) notice.classList.add('show');
        setTimeout(() => {
          if(notice) notice.classList.remove('show');
          window.spCalculateRoute(true);
          window.spAddAlert(`<strong>ROUTE RECALCULATED</strong> — ${reason}`, 'warn');
        }, 800);
      };

      let droneMarkers = [], droneStates = [], dronesActive = true;
      const DRONE_PATHS = [
        { pts: [[32.35,75.72],[32.30,75.68],[32.27,75.65],[32.24,75.62]], attackAt: 2 },
        { pts: [[32.40,75.60],[32.35,75.58],[32.29,75.55],[32.23,75.52]], attackAt: 3 },
        { pts: [[32.28,75.80],[32.25,75.72],[32.22,75.66],[32.19,75.60]], attackAt: 2 },
      ];

      function initDrones() {
        droneMarkers.forEach(m => map.removeLayer(m));
        droneMarkers = []; droneStates = [];
        DRONE_PATHS.forEach((dp, i) => {
          const m = window.L.marker(dp.pts[0], { icon: droneIcon(i+1), zIndexOffset: 1000 })
            .bindTooltip(`UAV-${String(i+1).padStart(2,'0')} · HOSTILE`, { className:'drone-label', permanent:false }).addTo(map);
          droneMarkers.push(m);
          droneStates.push({ path: dp.pts, idx: 0, attackAt: dp.attackAt, attacked: false });
        });
      }

      function stepDrones() {
        if (!dronesActive) return;
        droneStates.forEach((ds, i) => {
          if (ds.idx >= ds.path.length - 1) {
            ds.idx = 0; ds.attacked = false; return;
          }
          ds.idx++;
          const pos = ds.path[ds.idx];
          droneMarkers[i].setLatLng(pos);
          if (ds.idx === ds.attackAt && !ds.attacked) {
            ds.attacked = true; window.spTriggerExplosion(pos, i);
          }
        });
      }

      window.spTriggerExplosion = function(pos, droneId) {
        const pulse = window.L.circle(pos, { radius:100, color:'#ff3535', fillColor:'#ffaa00', fillOpacity:.6, weight:0, opacity:0 }).addTo(map);
        const expand = window.L.circle(pos, { radius:10, color:'#ff3535', fillColor:'#ff3535', fillOpacity:.3, weight:2, opacity:.8 }).addTo(map);
        zoneLayers.push(pulse, expand);
        let r = 10;
        const explosionGrow = setInterval(() => {
          r += 80; expand.setRadius(r);
          if (r > 3000) clearInterval(explosionGrow);
        }, 60);
        window.spTimers.push(explosionGrow); // Store interval ID

        setTimeout(() => {
          expand.setStyle({ fillOpacity:.12, opacity:.5, color:'#ff3535' });
          window.spAddAlert(`<strong>DRONE STRIKE</strong> — UAV-${String(droneId+1).padStart(2,'0')} attack at [${pos[0].toFixed(3)}, ${pos[1].toFixed(3)}]. Danger zone expanding.`, 'danger');
          Object.keys(NODES).forEach(id => {
            const [lat,lng] = NODES[id];
            const dist = Math.sqrt((lat-pos[0])**2 + (lng-pos[1])**2) * 111;
            if (dist < 4) {
              neighbors(id).forEach(nb => {
                const key = id+'-'+nb, rev = nb+'-'+id;
                if (edgeWeights[key]) edgeWeights[key].danger = Math.max(edgeWeights[key].danger, 0.7);
                if (edgeWeights[rev]) edgeWeights[rev].danger = Math.max(edgeWeights[rev].danger, 0.7);
              });
            }
          });
          const el = document.getElementById('spZones');
          if(el) {
            const cur = parseInt(el.textContent||'0');
            window.spAnimStat('spZones', cur+1);
          }
          window.spMaybeRecalc(`Drone strike UAV-${droneId+1} near active route.`);
        }, 600);

        setTimeout(()=>pulse.setStyle({fillOpacity:.3}),200);
        setTimeout(()=>pulse.setStyle({fillOpacity:.05}),1000);
      };

      window.spSpawnDroneAttack = function() {
        const lat = 32.22 + Math.random()*0.12, lng = 75.58 + Math.random()*0.12, pos = [lat, lng];
        window.spAddAlert(`<strong>INCOMING UAV</strong> — Hostile drone detected. Strike imminent.`, 'danger');
        const tempDrone = window.L.marker([lat+0.05, lng+0.03], { icon: droneIcon('X'), zIndexOffset:2000 }).addTo(map);
        map.flyTo(pos, 12, { duration:.8 });
        setTimeout(() => {
          tempDrone.setLatLng(pos);
          setTimeout(() => { map.removeLayer(tempDrone); window.spTriggerExplosion(pos, 99); }, 600);
        }, 800);
      };

      window.spToggleDrones = function(on) {
        dronesActive = on;
        droneMarkers.forEach(m => on ? map.addLayer(m) : map.removeLayer(m));
      };

      window.spAddAlert = function(msg, type='danger') {
        const el = document.createElement('div');
        el.className = `alert-item ${type}`;
        el.innerHTML = `${msg}<span class="alert-time">just now</span>`;
        const list = document.getElementById('spAlertsList');
        if(!list) return;
        list.insertBefore(el, list.firstChild);
        while (list.children.length > 7) list.removeChild(list.lastChild);
      };

      window.spAnimStat = function(id, target) {
        const el = document.getElementById(id);
        if(!el) return;
        const start = parseInt(el.textContent.replace(/,/g,''))||0;
        const diff = target - start, steps = 20; let i=0;
        const iv = setInterval(()=>{ i++; el.textContent=(Math.round(start+diff*i/steps)).toLocaleString(); if(i>=steps)clearInterval(iv); }, 30);
        window.spTimers.push(iv); // Store interval ID
      };

      applyScenario('border');
      initDrones();
      window.spTimers.push(setInterval(stepDrones, 2200)); // Store interval ID

      window.spTimers.push(setInterval(()=>{ // Store interval ID
        const el = document.getElementById('sEvac');
        if(!el) return;
        const v = parseInt(el.textContent.replace(/,/g,''))||0;
        el.textContent = (v + Math.floor(Math.random()*6+2)).toLocaleString();
        const hEl = document.getElementById('hEvac');
        if(hEl) hEl.textContent = el.textContent;
      }, 3800));

      window.spTimers.push(setInterval(()=>{ // Store interval ID
        const c = document.getElementById('spClock');
        if(c) c.textContent = new Date().toTimeString().split(' ')[0];
      }, 1000));

    } catch(err) { console.error(err); }

    return () => {
      if (window.spTimers) {
        window.spTimers.forEach(clearInterval);
        window.spTimers = null;
        window.spMapInitialized = false;
        if (window.spMap) {
          window.spMap.remove();
          window.spMap = null;
        }
      }
    };
  }, []);

  return (
    <div className="safepath-wrapper">
      <div className="topbar">
        <Link to="/" style={{textDecoration:'none'}}>
          <div className="logo">Safe<em>Path</em></div>
        </Link>
        <div className="topbar-center">
          <div><span className="live-dot"></span><span style={{fontSize:'12px',fontFamily:'Share Tech Mono,monospace',color:'var(--muted)'}}>SYSTEM LIVE</span></div>
          <div className="threat-badge">⚠ THREAT: CRITICAL</div>
          <div id="spDroneCount" style={{fontFamily:'Share Tech Mono,monospace',fontSize:'11px',color:'var(--muted)'}}>DRONES: <span style={{color:'var(--danger)'}} id="dc">3</span> ACTIVE</div>
        </div>
        <div className="stat-pills">
          <div className="pill">EVAC: <span id="hEvac">1,203</span></div>
          <div className="pill">ROUTES: <span id="hRoutes">7</span></div>
          <div className="pill">ZONES: <span id="hZones">4</span></div>
        </div>
        <div className="clock" id="spClock">--:--:--</div>
      </div>

      <div className="main-content">
        <div className="left-panel">
          <div className="sec">
            <div className="sec-label">// Simulate Drone Strike</div>
            <div className="toggle-row">
              <span>Drone simulation</span>
              <label className="toggle">
                <input type="checkbox" defaultChecked onChange={(e)=>window.spToggleDrones(e.target.checked)}/>
                <div className="toggle-track"></div><div className="toggle-thumb"></div>
              </label>
            </div>
            <div className="toggle-row">
              <span>Auto route recalc</span>
              <label className="toggle">
                <input type="checkbox" id="spAutoRecalc" defaultChecked/>
                <div className="toggle-track"></div><div className="toggle-thumb"></div>
              </label>
            </div>
            <button className="btn danger-btn" onClick={()=>window.spSpawnDroneAttack()}>▶ TRIGGER ATK</button>
            <button className="btn" style={{marginTop:'6px',background:'transparent',border:'1px solid var(--accent)',color:'var(--accent)'}} onClick={()=>window.spClearAllZones()}>✕ CLEAR ZONES</button>
          </div>

          <div className="sec">
            <div className="sec-label">// Safe Route Finder</div>
            <div className="field">
              <label>ORIGIN</label>
              <select id="spOrigin">
                <option value="">— Select location —</option>
                <option value="pathankot">Pathankot City Centre</option>
                <option value="dhar">Dhar Road Area</option>
                <option value="chakki">Chakki Bank</option>
                <option value="mamoon">Mamoon Cantonment</option>
                <option value="sarna">Sarna Nagar</option>
              </select>
            </div>
            <div className="field">
              <label>DESTINATION (SAFE ZONE)</label>
              <select id="spDest">
                <option value="">— Select destination —</option>
                <option value="gurdaspur">Gurdaspur Relief Camp</option>
                <option value="batala">Batala Emergency Shelter</option>
                <option value="amritsar">Amritsar Evac Hub</option>
                <option value="dhariwal">Dhariwal Safe Zone</option>
              </select>
            </div>
            <div className="field">
              <label>ALGORITHM</label>
              <select id="spAlgo" defaultValue="astar">
                <option value="astar">A* Search (fastest)</option>
                <option value="dijkstra">Dijkstra (safest)</option>
              </select>
            </div>
            <button className="btn" onClick={()=>window.spCalculateRoute()}>▶ FIND SAFE ROUTE</button>
            <div className="computing" id="spComputing">⟳ Running algorithm...</div>
            <div className="recalc-notice" id="spRecalcNotice">⚠ Threat detected — recalculating...</div>
            <div className="route-box" id="spRouteBox">
              <div className="route-title" id="spRouteTitle">✓ SAFE ROUTE FOUND</div>
              <div className="route-meta" id="spRouteMeta"></div>
              <div id="spRouteSteps" style={{marginTop:'6px'}}></div>
            </div>
          </div>

          <div className="sec">
            <div className="sec-label">// Live Alerts</div>
            <div id="spAlertsList">
              <div className="alert-item">
                <strong>DRONE DETECTED</strong> — UAV approaching NH-44 corridor near Pathankot bypass.
                <span className="alert-time">01:42 ago</span>
              </div>
              <div className="alert-item warn">
                <strong>ROAD BLOCKED</strong> — Chakki River bridge structurally compromised. Use alternate.
                <span className="alert-time">06:15 ago</span>
              </div>
              <div className="alert-item safe">
                <strong>CORRIDOR OPEN</strong> — Gurdaspur route via Batala confirmed safe & clear.
                <span className="alert-time">11:00 ago</span>
              </div>
            </div>
          </div>

          <div className="sec" style={{flex:1}}>
            <div className="sec-label">// Nearest Shelters</div>
            <div className="shelter-row" onClick={()=>window.spFlyTo([32.0407,75.4061],13)}>
              <div><div className="shelter-name">Gurdaspur Relief Camp</div><div className="shelter-sub">38 km · Food + Medical</div></div>
              <div className="cap ok">62%</div>
            </div>
            <div className="shelter-row" onClick={()=>window.spFlyTo([31.8198,75.2027],13)}>
              <div><div className="shelter-name">Batala Shelter</div><div className="shelter-sub">52 km · Capacity 800</div></div>
              <div className="cap mid">78%</div>
            </div>
            <div className="shelter-row" onClick={()=>window.spFlyTo([31.634,74.8723],13)}>
              <div><div className="shelter-name">Amritsar Evac Hub</div><div className="shelter-sub">90 km · Major facility</div></div>
              <div className="cap ok">41%</div>
            </div>
            <div className="shelter-row" onClick={()=>window.spFlyTo([32.035,75.312],13)}>
              <div><div className="shelter-name">Dhariwal Safe Zone</div><div className="shelter-sub">45 km · Basic supplies</div></div>
              <div className="cap full">94%</div>
            </div>
          </div>
        </div>

        <div id="safepath-map"></div>

        <div className="right-panel">
          <div className="stat-grid">
            <div className="stat-box"><div className="stat-n n-cyan" id="sCiv">2,847</div><div className="stat-l">Civilians</div></div>
            <div className="stat-box"><div className="stat-n n-green" id="sEvac">1,203</div><div className="stat-l">Evacuated</div></div>
            <div className="stat-box"><div className="stat-n n-red" id="sDrones">3</div><div className="stat-l">Active drones</div></div>
            <div className="stat-box"><div className="stat-n n-yellow" id="spZones">4</div><div className="stat-l">Danger zones</div></div>
          </div>

          <div className="sim-btns">
            <div className="sim-label">// Scenario</div>
            <button id="btn-border" className="sim-btn active" onClick={()=>window.spSetScenario('border','btn-border')}>⚠ Border Conflict</button>
            <button id="btn-flood" className="sim-btn" onClick={()=>window.spSetScenario('flood','btn-flood')}>🌊 Flash Flood</button>
            <button id="btn-quake" className="sim-btn" onClick={()=>window.spSetScenario('quake','btn-quake')}>⚡ Earthquake</button>
          </div>

          <div className="zone-list">
            <div className="zone-row" onClick={()=>window.spFlyTo([32.32,75.69],13)}><div className="zdot d"></div><div><div className="zone-name">Pathankot North</div><div className="zone-status">DANGER · Active drone</div></div></div>
            <div className="zone-row" onClick={()=>window.spFlyTo([32.241,75.634],13)}><div className="zdot d"></div><div><div className="zone-name">NH-44 Bypass</div><div className="zone-status">DANGER · Road blocked</div></div></div>
            <div className="zone-row" onClick={()=>window.spFlyTo([32.181,75.498],12)}><div className="zdot w"></div><div><div className="zone-name">Chakki Bridge</div><div className="zone-status">CAUTION · Structural</div></div></div>
            <div className="zone-row" onClick={()=>window.spFlyTo([32.022,75.381],12)}><div className="zdot s"></div><div><div className="zone-name">Gurdaspur Corridor</div><div className="zone-status">CLEAR · Evac active</div></div></div>
          </div>

          <div className="legend">
            <div style={{fontFamily:'Share Tech Mono,monospace',fontSize:'9px',color:'var(--muted)',letterSpacing:'2px',marginBottom:'8px'}}>// LEGEND</div>
            <div className="leg-item"><div className="leg-swatch" style={{background:'rgba(255,53,53,.6)'}}></div>Danger / drone zone</div>
            <div className="leg-item"><div className="leg-swatch" style={{background:'rgba(255,170,0,.6)'}}></div>Caution area</div>
            <div className="leg-item"><div className="leg-swatch" style={{background:'rgba(0,230,118,.5)'}}></div>Safe / evac zone</div>
            <div className="leg-item"><div className="leg-swatch" style={{background:'#00e5ff'}}></div>AI evacuation route</div>
          </div>
        </div>
      </div>
    </div>
  );
}
