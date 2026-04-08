const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Evacuation Platform Backend system nominal.' });
});

// Endpoint for SafeSphere citizen reports
app.post('/api/reports', (req, res) => {
  const { type, text, location } = req.body;
  console.log(`[REPORT RECEIVED] Type: ${type}`);
  console.log(`Details: ${text}`);
  res.status(201).json({ success: true, message: 'Report logged successfully' });
});

// Endpoint for SafePath route telemetry
app.post('/api/telemetry', (req, res) => {
  const { distance, eta, dangerFactor } = req.body;
  console.log(`[TELEMETRY] Route plotted. DIST: ${distance} | ETA: ${eta} | DANGER: ${dangerFactor}`);
  res.status(200).json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});
