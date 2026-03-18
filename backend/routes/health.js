const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

// ============================================================
// GET /health
// Quick health check — tests DB connectivity
// ============================================================
router.get('/', async (req, res) => {
  const start = Date.now();

  try {
    // Lightweight DB ping
    const { error } = await supabase
      .from('restaurants')
      .select('id')
      .limit(1);

    const dbLatency = Date.now() - start;

    if (error) {
      return res.status(503).json({
        status: 'degraded',
        database: 'error',
        error: error.message,
        uptime: process.uptime(),
      });
    }

    res.json({
      status: 'ok',
      database: 'connected',
      db_latency_ms: dbLatency,
      uptime: Math.floor(process.uptime()),
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: 'unreachable',
      error: error.message,
    });
  }
});

module.exports = router;