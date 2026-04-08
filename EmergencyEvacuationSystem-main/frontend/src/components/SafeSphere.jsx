import React, { useEffect } from 'react';
import './SafeSphere.css';

const SafeSphere = () => {
  useEffect(() => {
    // Only initialize map if it hasn't been initialized yet
    if (!window.ssMapInitialized) {
      window.ssMapInitialized = true;
      const L = window.L;

      // MAP INIT
      const map = L.map('safesphere-map', { center: [13.02, 80.22], zoom: 12, zoomControl: true, attributionControl: false });
      window.ssMap = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);
      
      window.ssFlyTo = function(pos, z) { map.flyTo(pos, z, { duration: 1.2 }); };

      // Icons
      function dot(color, size = 10) {
        return L.divIcon({
          className: '',
          html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:2px solid rgba(255,255,255,.3);box-shadow:0 0 6px ${color}"></div>`,
          iconSize: [size, size], iconAnchor: [size / 2, size / 2]
        });
      }
      function labelIcon(text, color, bg) {
        return L.divIcon({
          className: '',
          html: `<div style="background:${bg || color};color:${bg ? '#000' : '#000'};padding:2px 6px;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:10px;letter-spacing:1px;white-space:nowrap;box-shadow:0 0 6px ${color}">${text}</div>`,
          iconSize: [70, 16], iconAnchor: [35, 8]
        });
      }
      function reportIcon() {
        return L.divIcon({
          className: '',
          html: `<div style="width:10px;height:10px;background:#ffb300;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px #ffb300;animation:ss-glow-pulse 1s infinite"></div>`,
          iconSize: [10, 10], iconAnchor: [5, 5]
        });
      }

      // GRAPH
      const NODES = {
        velachery: [12.9784, 80.2179], adyar: [12.9516, 80.2573], pallikaranai: [12.9279, 80.1700],
        tnagar: [13.0418, 80.2341], tambaram: [12.9249, 80.1000], chrompet: [12.9516, 80.1403],
        guindy: [13.0069, 80.2206], nungambakkam: [13.0569, 80.2425], annanagar: [13.0878, 80.2785],
        tidel: [12.9798, 80.2474], koyambedu: [13.0667, 80.1906], tambaram_camp: [12.9249, 80.1000],
        perungudi: [12.9626, 80.2444], sholinganallur: [12.9010, 80.2270],
        mylapore: [13.0335, 80.2676], thiruvanmiyur: [12.9863, 80.2603],
        egmore: [13.0732, 80.2609], chennai_central: [13.0827, 80.2707],
      };

      const BASE_EDGES = [
        ['velachery', 'adyar', 5.2], ['velachery', 'tnagar', 7.8], ['velachery', 'perungudi', 3.4],
        ['velachery', 'pallikaranai', 4.1], ['adyar', 'guindy', 5.5], ['adyar', 'nungambakkam', 8.2],
        ['adyar', 'perungudi', 4.0], ['pallikaranai', 'tambaram', 8.0], ['pallikaranai', 'chrompet', 7.0],
        ['pallikaranai', 'sholinganallur', 3.5], ['tambaram', 'chrompet', 5.0], ['tambaram', 'tambaram_camp', 0.5],
        ['chrompet', 'guindy', 7.2], ['guindy', 'koyambedu', 4.2], ['guindy', 'tnagar', 3.8],
        ['tnagar', 'nungambakkam', 3.2], ['tnagar', 'koyambedu', 4.5], ['nungambakkam', 'annanagar', 4.1],
        ['nungambakkam', 'tidel', 0.1], ['koyambedu', 'annanagar', 3.8], ['perungudi', 'sholinganallur', 3.2],
        ['sholinganallur', 'tambaram', 6.5],
        ['adyar', 'thiruvanmiyur', 2.0], ['thiruvanmiyur', 'perungudi', 3.0], ['adyar', 'mylapore', 3.5], 
        ['mylapore', 'egmore', 4.0], ['egmore', 'chennai_central', 1.5], ['chennai_central', 'annanagar', 5.0], 
        ['thiruvanmiyur', 'tidel', 1.0], ['egmore', 'nungambakkam', 2.5]
      ];

      const FLOOD_DANGER = {
        velachery: 1.0, adyar: 0.95, pallikaranai: 0.9, perungudi: 0.6, sholinganallur: 0.5, chrompet: 0.3,
        tambaram: 0.2, guindy: 0.3, tnagar: 0.4, nungambakkam: 0.2, annanagar: 0.05, tidel: 0.1,
        koyambedu: 0.05, tambaram_camp: 0.1, mylapore: 0.2, thiruvanmiyur: 0.4, egmore: 0.1, chennai_central: 0.3
      };

      let edgeW = {};
      function resetW() {
        edgeW = {};
        BASE_EDGES.forEach(([a, b, d]) => {
          const danger = ((FLOOD_DANGER[a] || 0) + (FLOOD_DANGER[b] || 0)) / 2;
          const w = d * (1 + danger * 3);
          edgeW[a + '-' + b] = w; edgeW[b + '-' + a] = w;
        });
      }
      resetW();

      function nbrs(n) { return BASE_EDGES.filter(([a, b]) => a === n || b === n).map(([a, b]) => a === n ? b : a); }
      function hdist(a, b) {
        const [la, loa] = NODES[a] || [0, 0], [lb, lob] = NODES[b] || [0, 0];
        return Math.sqrt((la - lb) ** 2 + (loa - lob) ** 2) * 111;
      }

      function astar(start, end) {
        const g = {}, f = {}, prev = {}, vis = new Set();
        Object.keys(NODES).forEach(n => { g[n] = Infinity; f[n] = Infinity; });
        g[start] = 0; f[start] = hdist(start, end);
        const pq = [[f[start], start]];
        while (pq.length) {
          pq.sort((a, b) => a[0] - b[0]);
          const [, u] = pq.shift();
          if (vis.has(u)) continue; vis.add(u);
          if (u === end) break;
          for (const v of nbrs(u)) {
            const cost = edgeW[u + '-' + v] || Infinity;
            if (cost === Infinity) continue;
            const ng = g[u] + cost;
            if (ng < g[v]) { g[v] = ng; prev[v] = u; f[v] = ng + hdist(v, end); pq.push([f[v], v]); }
          }
        }
        if (g[end] === Infinity) return null;
        const path = []; let c = end;
        while (c) { path.unshift(c); c = prev[c]; }
        return { path, cost: g[end] };
      }

      let floodLayers = [], shelterLayers = [], foodLayers = [], hospitalLayers = [], routeLayer = null, droneMarkers = [];
      let layerState = { flood: true, shelter: true, food: true, hospital: true, route: true, drone: true };

      function renderFloodZones() {
        floodLayers.forEach(l => map.removeLayer(l));
        floodLayers = [];
        if (!layerState.flood) return;

        const zones = [
          { c: [12.9784, 80.2179], r: 2200, color: '#0d47a1', op: .55, label: 'Severe flood' },
          { c: [12.9516, 80.2573], r: 1800, color: '#0d47a1', op: .6, label: 'Critical' },
          { c: [12.9279, 80.1700], r: 2500, color: '#0d47a1', op: .5, label: 'Severe flood' },
          { c: [12.9626, 80.2444], r: 1200, color: '#1565c0', op: .38, label: 'Flooded' },
          { c: [13.0418, 80.2341], r: 1400, color: '#1976d2', op: .28, label: 'Waterlogged' },
          { c: [13.0569, 80.2425], r: 900, color: '#1976d2', op: .18, label: 'Wet roads' },
          { c: [12.9010, 80.2270], r: 1600, color: '#1565c0', op: .4, label: 'Moderate' },
        ];
        zones.forEach(z => {
          const c = L.circle(z.c, { radius: z.r, color: z.color, fillColor: z.color, fillOpacity: z.op, weight: 1, opacity: .5 }).addTo(map);
          floodLayers.push(c);
        });
      }

      function renderShelters() {
        shelterLayers.forEach(l => map.removeLayer(l));
        shelterLayers = [];
        if (!layerState.shelter) return;
        const shelters = [
          { pos: [13.0878, 80.2785], name: 'Anna Nagar', color: '#00e676' },
          { pos: [12.9798, 80.2474], name: 'Tidel Park', color: '#00e676' },
          { pos: [13.0667, 80.1906], name: 'Koyambedu', color: '#69f0ae' },
          { pos: [12.9249, 80.1000], name: 'Tambaram', color: '#ffb300' },
          { pos: [13.0732, 80.2609], name: 'Egmore Stadium', color: '#00e676' },
        ];
        shelters.forEach(s => {
          const m = L.marker(s.pos, { icon: labelIcon(s.name, s.color) }).addTo(map);
          shelterLayers.push(m);
        });
      }

      function renderFood() {
        foodLayers.forEach(l => map.removeLayer(l));
        foodLayers = [];
        if (!layerState.food) return;
        const camps = [
          { pos: [13.0200, 80.2100], name: 'Food Camp A' },
          { pos: [13.0600, 80.2600], name: 'Food Camp B' },
          { pos: [12.9700, 80.1500], name: 'Food Camp C' },
          { pos: [12.9863, 80.2603], name: 'Thiruvanmiyur Camp' },
          { pos: [13.0335, 80.2676], name: 'Mylapore Base' },
        ];
        camps.forEach(c => {
          const m = L.marker(c.pos, {
            icon: L.divIcon({
              className: '',
              html: `<div style="background:#ff6f00;color:#000;padding:2px 5px;font-family:Rajdhani,sans-serif;font-weight:700;font-size:9px;letter-spacing:1px;box-shadow:0 0 5px #ff6f00">${c.name}</div>`,
              iconSize: [70, 14], iconAnchor: [35, 7]
            })
          }).addTo(map);
          foodLayers.push(m);
        });
      }

      function renderHospitals() {
        hospitalLayers.forEach(l => map.removeLayer(l));
        hospitalLayers = [];
        if (!layerState.hospital) return;
        const hosps = [
          { pos: [13.0069, 80.2206], name: 'Guindy Hospital' },
          { pos: [13.0820, 80.2707], name: 'Apollo Hospital' },
          { pos: [12.9600, 80.1900], name: 'KMCH Tambaram' },
          { pos: [13.0827, 80.2707], name: 'Rajiv Gandhi Gen' },
          { pos: [12.9798, 80.2474], name: 'Tidel Med Center' },
        ];
        hosps.forEach(h => {
          const m = L.marker(h.pos, {
            icon: L.divIcon({
              className: '',
              html: `<div style="background:#ff80ab;color:#4b1528;padding:2px 5px;font-family:Rajdhani,sans-serif;font-weight:700;font-size:9px;letter-spacing:1px">${h.name}</div>`,
              iconSize: [90, 14], iconAnchor: [45, 7]
            })
          }).addTo(map);
          hospitalLayers.push(m);
        });
      }

      function renderOrigins() {
        ['velachery', 'adyar', 'pallikaranai', 'tnagar', 'tambaram', 'chrompet'].forEach(id => {
          const pos = NODES[id];
          if (pos) L.marker(pos, { icon: dot('#00bfff', 8) }).bindTooltip(id.replace(/^\w/, c => c.toUpperCase())).addTo(map);
        });
      }

      window.ssToggleLayer = function(type, btn) {
        layerState[type] = !layerState[type];
        btn.classList.toggle('on', layerState[type]);
        if (type === 'flood') renderFloodZones();
        if (type === 'shelter') renderShelters();
        if (type === 'food') renderFood();
        if (type === 'hospital') renderHospitals();
        if (type === 'route' && routeLayer) { layerState.route ? map.addLayer(routeLayer) : map.removeLayer(routeLayer); }
        if (type === 'drone') droneMarkers.forEach(m => layerState.drone ? map.addLayer(m) : map.removeLayer(m));
      };

      let routePolyline = null, routeGlow = null, routeStart = null, routeEnd = null;

      function clearRoute() {
        [routePolyline, routeGlow, routeStart, routeEnd].forEach(l => l && map.removeLayer(l));
        routePolyline = routeGlow = routeStart = routeEnd = null;
        document.getElementById('routeBox').classList.remove('show');
      }

      window.ssDrawRoute = function(result, origin, dest, algo, silent=false) {
        if (!result) {
          window.ssAddAlert('<strong>NO ROUTE</strong> — All paths are submerged. Stay in place and report location.', 'danger');
          return;
        }
        const lls = result.path.map(id => NODES[id]).filter(Boolean);
        routePolyline = L.polyline(lls, { color: '#00e676', weight: 5, opacity: .9 }).addTo(map);
        routeGlow = L.polyline(lls, { color: '#00e676', weight: 14, opacity: .12 }).addTo(map);
        routeStart = L.marker(lls[0], { icon: dot('#00bfff', 13) }).addTo(map);
        routeEnd = L.marker(lls[lls.length - 1], { icon: dot('#00e676', 15) }).addTo(map);
        map.fitBounds(routePolyline.getBounds(), { padding: [50, 50] });

        const steps = [];
        for (let i = 0; i < result.path.length - 1; i++) {
          const a = result.path[i], b = result.path[i + 1];
          const fd = ((FLOOD_DANGER[a] || 0) + (FLOOD_DANGER[b] || 0)) / 2;
          const risk = fd > 0.7 ? '⚠ AVOID if possible' : fd > 0.4 ? '— caution, wet roads' : '— clear';
          steps.push(`${a.replace(/^\w/, c => c.toUpperCase())} → ${b.replace(/^\w/, c => c.toUpperCase())} ${risk}`);
        }

        document.getElementById('routeTitle').textContent = '✓ FLOOD-SAFE ROUTE FOUND';
        document.getElementById('routeTitle').style.color = 'var(--safe)';
        document.getElementById('routeMeta').innerHTML =
          `DISTANCE: <span>~${Math.round(result.cost / 4)} km</span><br>` +
          `ETA: <span>~${Math.round(result.cost / 4 / 30 * 60)} min</span><br>` +
          `FLOOD RISK: <span style="color:${result.cost > 40 ? '#ffb300' : '#00e676'}">${result.cost > 40 ? 'MEDIUM' : 'LOW'}</span><br>` +
          `ALGO: <span>${algo === 'astar' ? 'A* Search' : 'Dijkstra'}</span>`;
        const stepsEl = document.getElementById('routeSteps');
        if (stepsEl) stepsEl.innerHTML = steps.map((s, i) => `<div class="r-step"><span class="r-n">[${String(i + 1).padStart(2, '0')}]</span>${s}</div>`).join('');
        document.getElementById('routeBox').classList.add('show');
        if (!silent) window.ssAddAlert(`<strong>ROUTE ACTIVE</strong> — Flood-safe path via ${result.path.length - 1} segments. Stay on highlighted road.`, 'safe');
      };

      window.ssCalcRoute = function() {
        const o = document.getElementById('origin').value;
        const d = document.getElementById('dest').value;
        const algo = document.getElementById('algo').value;
        if (!o || !d) { window.ssAddAlert('<strong>INPUT REQUIRED</strong> — Select origin and destination.', 'warn'); return; }
        document.getElementById('computing').classList.add('show');
        clearRoute();
        setTimeout(() => {
          document.getElementById('computing').classList.remove('show');
          const result = astar(o, d);
          window.ssDrawRoute(result, o, d, algo);
        }, 1300);
      };

      window.ssRunAIRecommend = function() {
        const origin = document.getElementById('aiOrigin').value;
        if (!origin) { window.ssAddAlert('<strong>INPUT REQUIRED</strong> — Select origin for AI recommendation.', 'warn'); return; }
        document.getElementById('aiComputing').classList.add('show');
        document.getElementById('aiResultBox').classList.remove('show');
        clearRoute();

        setTimeout(() => {
          document.getElementById('aiComputing').classList.remove('show');
          const sheltersOpt = [
            { id: 'annanagar', name: 'Anna Nagar Govt School', cap: 400, occ: 230 },
            { id: 'tidel', name: 'Tidel Park Shelter', cap: 1200, occ: 500 },
            { id: 'koyambedu', name: 'Koyambedu Evac Hub', cap: 2000, occ: 1480 },
            { id: 'tambaram', name: 'Tambaram Relief Camp', cap: 800, occ: 710 },
            { id: 'egmore', name: 'Egmore Stadium Camp', cap: 1500, occ: 400 }
          ];

          let bestScore = -Infinity, bestShelter = null, routeResult = null;
          
          sheltersOpt.forEach(s => {
            const res = astar(origin, s.id);
            if (!res) return;
            const distCost = res.cost; 
            let realDist = 0;
            for(let i=1; i<res.path.length; i++) {
              const e = edgeW[res.path[i-1]+'-'+res.path[i]] || 0;
              const a = res.path[i-1], b=res.path[i];
              const danger = ((FLOOD_DANGER[a]||0)+(FLOOD_DANGER[b]||0))/2;
              realDist += e / (1 + danger*3);
            }
            
            const distScore = Math.max(0, 100 - (realDist * 2));
            const availPct = ((s.cap - s.occ) / s.cap) * 100;
            const floodRiskScore = Math.max(0, 100 - ((distCost - realDist)*4));
            
            const score = (distScore * 0.4) + (floodRiskScore * 0.4) + (availPct * 0.2);
            if (score > bestScore) {
              bestScore = score;
              bestShelter = { ...s, dist: realDist/2, availPct, floodRiskScore };
              routeResult = res;
            }
          });

          if (!bestShelter) {
            window.ssAddAlert('<strong>NO ROUTE</strong> — Unable to find safe shelter.', 'danger');
            return;
          }

          document.getElementById('aiResultBox').classList.add('show');
          document.getElementById('aiResName').textContent = bestShelter.name;
          document.getElementById('aiResDist').textContent = `${bestShelter.dist.toFixed(1)} km`;
          document.getElementById('aiResCap').textContent = `${Math.round(bestShelter.availPct)}% available`;
          document.getElementById('aiResRisk').textContent = bestShelter.floodRiskScore > 70 ? 'Low' : bestShelter.floodRiskScore > 40 ? 'Medium' : 'High';
          document.getElementById('aiResRisk').style.color = bestShelter.floodRiskScore > 70 ? 'var(--safe)' : bestShelter.floodRiskScore > 40 ? 'var(--warn)' : 'var(--danger)';
          document.getElementById('aiResTime').textContent = `${Math.round(bestShelter.dist / 30 * 60)} mins`;

          window.ssDrawRoute(routeResult, origin, bestShelter.id, 'astar', true);
          window.ssAddAlert(`<strong>AI RECOMMENDATION</strong> — ${bestShelter.name} selected as optimal safe zone. Route plotted.`, 'safe');
        }, 1200);
      };

      let selectedType = 'trapped';
      window.ssSelType = function(el, type) {
        document.querySelectorAll('.rtype').forEach(r => r.classList.remove('sel'));
        el.classList.add('sel'); selectedType = type;
      };
      
      const reportPositions = [
        [12.9800, 80.2100], [12.9600, 80.2400], [13.0200, 80.2300],
        [12.9400, 80.1800], [13.0000, 80.2500], [12.9700, 80.2000],
      ];
      let reportIdx = 0;
      window.ssSubmitReport = function() {
        const text = document.getElementById('reportText').value || 'Emergency situation reported';
        const pos = reportPositions[reportIdx % reportPositions.length]; reportIdx++;
        const m = L.marker(pos, { icon: reportIcon() })
          .bindPopup(`<b style="font-family:Rajdhani">${selectedType.toUpperCase()}</b><br><span style="font-size:11px">${text}</span>`)
          .addTo(map);
        map.flyTo(pos, 14, { duration: 1 });
        m.openPopup();
        window.ssAddAlert(`<strong>REPORT RECEIVED</strong> — ${selectedType.replace(/^\w/, c => c.toUpperCase())}: "${text.substring(0, 40)}..."`, 'warn');
        document.getElementById('reportText').value = '';
      };

      const dronePaths = [
        [[13.10, 80.28], [13.05, 80.25], [13.00, 80.22], [12.96, 80.23]],
        [[12.88, 80.20], [12.91, 80.22], [12.94, 80.24], [12.97, 80.22]],
      ];
      let droneStates = [];
      function initDrones() {
        droneMarkers.forEach(m => map.removeLayer(m));
        droneMarkers = [];
        dronePaths.forEach((path, i) => {
          const m = L.marker(path[0], {
            icon: L.divIcon({
              className: '',
              html: `<div style="font-size:16px;filter:drop-shadow(0 0 3px #00bfff)">🚁</div>`,
              iconSize: [20, 20], iconAnchor: [10, 10]
            })
          }).addTo(map);
          droneMarkers.push(m);
          droneStates.push({ path, idx: 0 });
        });
      }
      function stepDrones() {
        droneStates.forEach((ds, i) => {
          if (!layerState.drone) return;
          ds.idx = (ds.idx + 1) % ds.path.length;
          droneMarkers[i].setLatLng(ds.path[ds.idx]);
        });
      }

      window.ssRunRelief = function() {
        window.ssAddAlert('<strong>AI RELIEF ENGINE</strong> — Calculating optimal truck distribution across 14 zones...', 'relief');
        setTimeout(() => {
          window.ssAddAlert('<strong>DISPATCH ORDER</strong> — Truck T-04 + T-07 → Velachery Zone B (supply critical, 12k people).', 'relief');
          setTimeout(() => {
            window.ssAddAlert('<strong>DISPATCH ORDER</strong> — Truck T-02 + Medical Unit → Pallikaranai (31% supply, high need).', 'relief');
            const truckRoute = [[13.0067, 80.2206], [12.9800, 80.2100]];
            L.polyline(truckRoute, { color: '#ff6f00', weight: 3, opacity: .8, dashArray: '10 5' }).addTo(map);
            L.marker(truckRoute[truckRoute.length - 1], {
              icon: L.divIcon({
                className: '',
                html: `<div style="background:#ff6f00;color:#000;padding:2px 5px;font-family:Rajdhani,sans-serif;font-weight:700;font-size:10px">🚛 T-04</div>`,
                iconSize: [50, 16], iconAnchor: [25, 8]
              })
            }).addTo(map);
            window.ssAnimStat('sTrucks', 10);
          }, 1200);
        }, 600);
      };

      const modes = {
        flood: {
          center: [13.02, 80.22], zoom: 12,
          badge: 'CHENNAI FLOOD — LEVEL 3 SEVERE',
          badgeColor: 'var(--flood-light)',
          stats: [84200, 12450, 14, 8],
          panelShow: true,
        },
        war: {
          center: [32.27, 75.65], zoom: 11,
          badge: 'PATHANKOT — THREAT: CRITICAL',
          badgeColor: 'var(--danger)',
          stats: [2847, 1203, 3, 2],
          panelShow: false,
        },
        quake: {
          center: [28.61, 77.20], zoom: 11,
          badge: 'DELHI — EARTHQUAKE M6.2',
          badgeColor: 'var(--warn)',
          stats: [120000, 8400, 8, 5],
          panelShow: false,
        }
      };

      window.ssSetMode = function(name, btn) {
        document.querySelectorAll('.mode-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const m = modes[name];
        map.flyTo(m.center, m.zoom, { duration: 1.5 });
        document.getElementById('eventBadge').textContent = m.badge;
        document.getElementById('eventBadge').style.borderColor = m.badgeColor;
        document.getElementById('eventBadge').style.color = m.badgeColor;
        document.getElementById('floodPanel').style.display = m.panelShow ? 'block' : 'none';
        window.ssAnimStat('sAffected', m.stats[0]);
        window.ssAnimStat('sEvac', m.stats[1]);
        window.ssAnimStat('sFlood', m.stats[2]);
        window.ssAnimStat('sTrucks', m.stats[3]);
        window.ssAddAlert(`<strong>MODE: ${name.toUpperCase()}</strong> — Switching disaster response context.`, 'warn');
        if (name !== 'flood') { renderFloodZones(); }
      };

      window.ssAnimStat = function(id, target) {
        const el = document.getElementById(id);
        if (!el) return;
        const start = parseInt(el.textContent.replace(/[^0-9]/g, '')) || 0;
        const diff = target - start, steps = 20; let i = 0;
        const iv = setInterval(() => {
          i++;
          const v = Math.round(start + diff * i / steps);
          el.textContent = v >= 1000 ? v.toLocaleString() : v;
          if (i >= steps) clearInterval(iv);
        }, 30);
      };

      window.ssAddAlert = function(msg, type = 'danger') {
        const el = document.createElement('div');
        el.className = `alert-item ${type}`;
        el.innerHTML = `${msg}<span class="a-time">just now</span>`;
        const list = document.getElementById('alertsList');
        if (list) {
          list.insertBefore(el, list.firstChild);
          while (list.children.length > 7) list.removeChild(list.lastChild);
        }
      };

      // INIT
      renderFloodZones();
      renderShelters();
      renderFood();
      renderHospitals();
      renderOrigins();
      initDrones();

      // Intervals
      const dsiv = setInterval(stepDrones, 2500);
      const evaciv = setInterval(() => {
        const el = document.getElementById('sEvac');
        if (el) {
          const v = parseInt(el.textContent.replace(/,/g, ''));
          el.textContent = (v + Math.floor(Math.random() * 12 + 3)).toLocaleString();
          const hev = document.getElementById('hEvac');
          if (hev) hev.textContent = el.textContent;
        }
      }, 4000);

      let floodTick = 0;
      const fdliv = setInterval(() => {
        floodTick++;
        const adyar = (4.2 + Math.sin(floodTick * .3) * .15).toFixed(1);
        const cooum = (3.1 + Math.sin(floodTick * .2) * .1).toFixed(1);
        const elAdyar = document.getElementById('flAdyar');
        const elCooum = document.getElementById('flCooum');
        const fbA = document.getElementById('fbAdyar');
        const fbC = document.getElementById('fbCooum');
        if(elAdyar) elAdyar.textContent = `+${adyar}m`;
        if(elCooum) elCooum.textContent = `+${cooum}m`;
        if(fbA) fbA.style.width = Math.min(100, 84 + Math.sin(floodTick * .3) * 5) + '%';
        if(fbC) fbC.style.width = Math.min(100, 62 + Math.sin(floodTick * .2) * 4) + '%';
      }, 2000);

      const clkiv = setInterval(() => {
        const c = document.getElementById('clock');
        if (c) c.textContent = new Date().toTimeString().split(' ')[0];
      }, 1000);

      // Save timers on window to clear them on unmount
      window.ssTimers = [dsiv, evaciv, fdliv, clkiv];
    }

    return () => {
      // Cleanup if needed when component unmounts fully
      if (window.ssTimers) {
        window.ssTimers.forEach(clearInterval);
        window.ssTimers = null;
        window.ssMapInitialized = false;
        if (window.ssMap) {
          window.ssMap.remove();
          window.ssMap = null;
        }
      }
    };
  }, []);

  return (
    <div className="safesphere-wrapper">
      <div className="topbar">
        <div className="logo">
          <div className="logo-icon">🌐</div>
          Safe<em>Sphere</em>
        </div>
        <div className="top-center">
          <div className="mode-tabs">
            <button className="mode-tab active flood" onClick={(e) => window.ssSetMode('flood', e.target)}>Flood</button>
            <button className="mode-tab war" onClick={(e) => window.ssSetMode('war', e.target)}>War</button>
            <button className="mode-tab quake" onClick={(e) => window.ssSetMode('quake', e.target)}>Quake</button>
          </div>
          <div className="event-badge" id="eventBadge">CHENNAI FLOOD — LEVEL 3 SEVERE</div>
        </div>
        <div className="top-right">
          <div className="top-stat">CIVILIANS: <span id="hCiv">84,200</span></div>
          <div className="top-stat">EVACUATED: <span id="hEvac">12,450</span></div>
          <div className="top-stat">TRUCKS: <span id="hTrucks" style={{ color: 'var(--relief)' }}>8</span> ACTIVE</div>
          <div className="clock" id="clock">--:--:--</div>
        </div>
      </div>

      <div className="main-content">
        <div className="left-panel">
          <div className="panel-sec">
            <div className="sec-hd">Map Layers</div>
            <div className="layer-grid">
              <button className="layer-btn flood-layer on" id="lFlood" onClick={(e) => window.ssToggleLayer('flood', e.target)}>Flood zones</button>
              <button className="layer-btn shelter-layer on" id="lShelter" onClick={(e) => window.ssToggleLayer('shelter', e.target)}>Shelters</button>
              <button className="layer-btn food-layer on" id="lFood" onClick={(e) => window.ssToggleLayer('food', e.target)}>Food camps</button>
              <button className="layer-btn hospital-layer on" id="lHospital" onClick={(e) => window.ssToggleLayer('hospital', e.target)}>Hospitals</button>
              <button className="layer-btn on" id="lRoute" onClick={(e) => window.ssToggleLayer('route', e.target)}>Routes</button>
              <button className="layer-btn on" id="lDrone" onClick={(e) => window.ssToggleLayer('drone', e.target)}>Drones</button>
            </div>
          </div>

          <div className="panel-sec" id="floodPanel">
            <div className="sec-hd">Flood Level Monitor</div>
            <div className="flood-label"><span>Adyar River</span><span id="flAdyar">+4.2m</span></div>
            <div className="flood-level-bar"><div className="flood-fill" id="fbAdyar" style={{ width: '84%' }}></div></div>
            <div className="flood-label"><span>Cooum River</span><span id="flCooum">+3.1m</span></div>
            <div className="flood-level-bar"><div className="flood-fill" id="fbCooum" style={{ width: '62%' }}></div></div>
            <div className="flood-label"><span>Buckingham Canal</span><span id="flBuck">+2.8m</span></div>
            <div className="flood-level-bar"><div className="flood-fill" id="fbBuck" style={{ width: '56%' }}></div></div>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '9px', color: 'var(--danger)', marginTop: '8px', animation: 'ss-blink .8s infinite' }}>
              ⚠ ADYAR ABOVE DANGER MARK — EVACUATE SOUTH ZONES
            </div>
          </div>

          <div className="panel-sec">
            <div className="sec-hd">Safe Route Finder</div>
            <div className="fld">
              <label>YOUR LOCATION</label>
              <select id="origin">
                <option value="">— Select area —</option>
                <option value="velachery">Velachery (severely flooded)</option>
                <option value="adyar">Adyar (critically flooded)</option>
                <option value="tnagar">T.Nagar (waterlogged)</option>
                <option value="tambaram">Tambaram</option>
                <option value="pallikaranai">Pallikaranai (severe)</option>
                <option value="chrompet">Chrompet</option>
              </select>
            </div>
            <div className="fld">
              <label>DESTINATION</label>
              <select id="dest">
                <option value="">— Select safe zone —</option>
                <option value="annanagar">Anna Nagar Relief Camp</option>
                <option value="tidel">Tidel Park Emergency Shelter</option>
                <option value="koyambedu">Koyambedu Evac Hub</option>
                <option value="guindy">Guindy Hospital</option>
                <option value="tambaram_camp">Tambaram Relief Camp</option>
              </select>
            </div>
            <div className="fld">
              <label>ALGORITHM</label>
              <select id="algo">
                <option value="astar">A* (fastest safe path)</option>
                <option value="dijkstra">Dijkstra (minimum flood risk)</option>
              </select>
            </div>
            <button className="btn-main" onClick={() => window.ssCalcRoute()}>Find Safe Route</button>
            <div className="computing" id="computing">⟳ Calculating flood-safe path...</div>
            <div className="route-box" id="routeBox">
              <div className="route-title" id="routeTitle">✓ SAFE ROUTE FOUND</div>
              <div className="route-meta" id="routeMeta"></div>
              <div id="routeSteps" style={{ marginTop: '6px' }}></div>
            </div>
          </div>

          <div className="panel-sec">
            <div className="sec-hd">AI Shelter Recommendation <span className="tag" style={{background:'var(--accent)',color:'#000',padding:'2px 6px',borderRadius:'4px',fontSize:'10px',marginLeft:'6px'}}>AI</span></div>
            <div className="fld">
              <label>YOUR LOCATION</label>
              <select id="aiOrigin">
                <option value="">— Select origin area —</option>
                <option value="velachery">Velachery</option>
                <option value="adyar">Adyar</option>
                <option value="pallikaranai">Pallikaranai</option>
                <option value="tnagar">T.Nagar</option>
                <option value="tambaram">Tambaram</option>
                <option value="mylapore">Mylapore</option>
                <option value="thiruvanmiyur">Thiruvanmiyur</option>
                <option value="perungudi">Perungudi</option>
              </select>
            </div>
            <button className="btn-main" onClick={() => window.ssRunAIRecommend()}>Recommend Shelter</button>
            <div className="computing" id="aiComputing">⟳ Optimizing best shelter...</div>
            <div className="route-box" id="aiResultBox" style={{ marginTop: '10px', borderLeft: '3px solid var(--accent)' }}>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '13px', color: 'var(--accent)', marginBottom: '5px', letterSpacing:'1px' }}>RECOMMENDED SHELTER</div>
              <div id="aiResName" style={{ fontWeight: 600, fontSize: '15px', color: '#fff', marginBottom: '8px' }}>-</div>
              <div style={{ fontSize: '12px', lineHeight: '1.8', color: 'var(--text)' }}>
                <div>Dist: <span id="aiResDist" style={{fontFamily:'Share Tech Mono', color:'#fff', marginLeft:'4px'}}></span></div>
                <div>Capacity: <span id="aiResCap" style={{fontFamily:'Share Tech Mono', color:'#fff', marginLeft:'4px'}}></span></div>
                <div>Flood Risk: <span id="aiResRisk" style={{fontFamily:'Share Tech Mono', fontWeight:'bold', marginLeft:'4px'}}></span></div>
                <div>ETA: <span id="aiResTime" style={{fontFamily:'Share Tech Mono', color:'#fff', marginLeft:'4px'}}></span></div>
              </div>
            </div>
          </div>

          <div className="panel-sec">
            <div className="sec-hd">Citizen Emergency Report</div>
            <div className="report-type" id="reportTypes">
              <div className="rtype sel" onClick={(e) => window.ssSelType(e.target, 'trapped')}>Trapped</div>
              <div className="rtype" onClick={(e) => window.ssSelType(e.target, 'flood')}>Rising water</div>
              <div className="rtype" onClick={(e) => window.ssSelType(e.target, 'road')}>Road blocked</div>
              <div className="rtype" onClick={(e) => window.ssSelType(e.target, 'supplies')}>Need supplies</div>
            </div>
            <textarea className="report-input" id="reportText" rows="2" placeholder="Describe situation..."></textarea>
            <button className="btn-main" style={{ background: 'var(--warn)', color: '#000' }} onClick={() => window.ssSubmitReport()}>Submit Report</button>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '9px', color: 'var(--muted)', marginTop: '5px' }}>
              Reports update map instantly · 847 reports today
            </div>
          </div>

          <div className="panel-sec" style={{ flex: 1 }}>
            <div className="sec-hd">Live Alerts</div>
            <div id="alertsList">
              <div className="alert-item flood"><strong>FLOOD ALERT</strong> — Adyar crossing danger mark. Velachery and Adyar residents evacuate immediately.<span className="a-time">03:12 ago</span></div>
              <div className="alert-item warn"><strong>ROAD CLOSED</strong> — GST Road waterlogged near Chrompet. Use NH-48 alternate.<span className="a-time">08:45 ago</span></div>
              <div className="alert-item relief"><strong>TRUCK DISPATCHED</strong> — Food truck T-04 sent to Velachery Zone B. ETA 22 min.<span className="a-time">11:20 ago</span></div>
              <div className="alert-item safe"><strong>SHELTER OPEN</strong> — Anna Nagar Govt School — 400 spaces available.<span className="a-time">15:00 ago</span></div>
            </div>
          </div>
        </div>

        <div id="safesphere-map"></div>

        <div className="right-panel">
          <div className="stat-grid">
            <div className="stat-box"><div className="stat-n n-r" id="sAffected">84.2k</div><div className="stat-l">Affected</div></div>
            <div className="stat-box"><div className="stat-n n-g" id="sEvac">12,450</div><div className="stat-l">Evacuated</div></div>
            <div className="stat-box"><div className="stat-n n-b" id="sFlood">14</div><div className="stat-l">Flood zones</div></div>
            <div className="stat-box"><div className="stat-n n-o" id="sTrucks">8</div><div className="stat-l">Relief trucks</div></div>
          </div>

          <div className="relief-panel">
            <div className="sec-hd">AI Relief Distribution <span className="tag">NEW</span></div>

            <div className="relief-zone critical">
              <div className="rz-name">Velachery Zone B</div>
              <div className="rz-meta">
                Population: <span>~12,000</span><br />
                Flood depth: <span style={{ color: 'var(--danger)' }}>1.8m severe</span><br />
                Supply level: <span style={{ color: 'var(--danger)' }}>8% critical</span>
              </div>
              <div className="supply-bar"><div className="supply-fill" style={{ width: '8%', background: 'var(--danger)' }}></div></div>
              <div className="rz-action dispatch">▶ DISPATCH: 2 food trucks + rescue boat</div>
            </div>

            <div className="relief-zone high">
              <div className="rz-name">Pallikaranai Marshland</div>
              <div className="rz-meta">
                Population: <span>~8,400</span><br />
                Flood depth: <span style={{ color: 'var(--warn)' }}>1.2m high</span><br />
                Supply level: <span style={{ color: 'var(--warn)' }}>31% low</span>
              </div>
              <div className="supply-bar"><div className="supply-fill" style={{ width: '31%', background: 'var(--warn)' }}></div></div>
              <div className="rz-action dispatch">▶ DISPATCH: 1 food truck + medical</div>
            </div>

            <div className="relief-zone high">
              <div className="rz-name">Adyar Riverside</div>
              <div className="rz-meta">
                Population: <span>~6,200</span><br />
                Flood depth: <span style={{ color: 'var(--warn)' }}>2.1m critical</span><br />
                Supply level: <span style={{ color: 'var(--warn)' }}>24% low</span>
              </div>
              <div className="supply-bar"><div className="supply-fill" style={{ width: '24%', background: 'var(--warn)' }}></div></div>
              <div className="rz-action monitor">⚑ MONITOR: boat access only</div>
            </div>

            <div className="relief-zone ok">
              <div className="rz-name">T.Nagar Central</div>
              <div className="rz-meta">
                Population: <span>~9,100</span><br />
                Flood depth: <span style={{ color: 'var(--safe)' }}>0.4m low</span><br />
                Supply level: <span style={{ color: 'var(--safe)' }}>72% adequate</span>
              </div>
              <div className="supply-bar"><div className="supply-fill" style={{ width: '72%', background: 'var(--safe)' }}></div></div>
              <div className="rz-action hold">✓ HOLD: supplies adequate</div>
            </div>

            <button className="btn-sec" onClick={() => window.ssRunRelief()}>▶ RUN AI DISTRIBUTION PLAN</button>
          </div>

          <div className="panel-sec">
            <div className="sec-hd">TN Emergency Contacts</div>
            <div style={{ fontSize: '12px', lineHeight: '2.0', marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom:'4px', marginBottom:'4px' }}>
                <span>State Control Room</span><span style={{ fontFamily: 'Share Tech Mono', color: 'var(--accent)', fontSize:'14px' }}>1070</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom:'4px', marginBottom:'4px' }}>
                <span>District Control Room</span><span style={{ fontFamily: 'Share Tech Mono', color: 'var(--warn)', fontSize:'14px' }}>1077</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom:'4px', marginBottom:'4px' }}>
                <span>Ambulance / Medical</span><span style={{ fontFamily: 'Share Tech Mono', color: 'var(--safe)', fontSize:'14px' }}>108</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom:'4px', marginBottom:'4px' }}>
                <span>Corporation of Chennai</span><span style={{ fontFamily: 'Share Tech Mono', color: '#fff', fontSize:'14px' }}>1913</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Police Rescue</span><span style={{ fontFamily: 'Share Tech Mono', color: 'var(--danger)', fontSize:'14px' }}>100</span>
              </div>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div className="sec-hd" style={{ padding: '10px 14px 6px' }}>Zone Status</div>
            <div className="zone-row" onClick={() => window.ssFlyTo([12.9784, 80.2179], 13)}><div className="zdot d"></div><div><div className="z-name">Velachery</div><div className="z-status">SEVERE · 1.8m depth</div></div></div>
            <div className="zone-row" onClick={() => window.ssFlyTo([12.9516, 80.2573], 13)}><div className="zdot d"></div><div><div className="z-name">Adyar</div><div className="z-status">CRITICAL · above danger</div></div></div>
            <div className="zone-row" onClick={() => window.ssFlyTo([12.9279, 80.1700], 13)}><div className="zdot d"></div><div><div className="z-name">Pallikaranai</div><div className="z-status">SEVERE · marshland</div></div></div>
            <div className="zone-row" onClick={() => window.ssFlyTo([13.0418, 80.2341], 13)}><div className="zdot w"></div><div><div className="z-name">T.Nagar</div><div className="z-status">WATERLOGGED · passable</div></div></div>
            <div className="zone-row" onClick={() => window.ssFlyTo([13.0569, 80.2425], 13)}><div className="zdot w"></div><div><div className="z-name">Nungambakkam</div><div className="z-status">MODERATE · clearing</div></div></div>
            <div className="zone-row" onClick={() => window.ssFlyTo([13.0878, 80.2785], 13)}><div className="zdot s"></div><div><div className="z-name">Anna Nagar</div><div className="z-status">SAFE · evac active</div></div></div>
            <div className="zone-row" onClick={() => window.ssFlyTo([13.0067, 80.2206], 13)}><div className="zdot s"></div><div><div className="z-name">Koyambedu</div><div className="z-status">SAFE · relief hub</div></div></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafeSphere;
