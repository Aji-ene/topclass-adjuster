// route/classBullets.js
//
// Persists the per-Class-of-Business headline/subpoint presets used to
// auto-fill the report-creation form. GIT ships pre-populated from the
// Indorama UF 85 final report; every other class starts empty until a
// user builds one in the UI and hits "Save as class default" — from then
// on it behaves exactly like GIT: auto-filled, still editable, still
// removable per-report, and deletable at the class level from here.
//
// Swap the two fs-based functions (readStore/writeStore) for your ORM
// of choice (Mongo/Postgres) if you'd rather not keep this as a JSON
// file — the route contract stays the same either way.

const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const router = express.Router();

const STORE_PATH = path.join(__dirname, '..', 'data', 'classBulletPoints.json');

async function readStore() {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // Seed from the shipped preset (includes the GIT defaults) on first run.
      const seedPath = path.join(__dirname, '..', 'data', 'classBulletPoints.seed.json');
      const seed = JSON.parse(await fs.readFile(seedPath, 'utf-8'));
      await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
      await fs.writeFile(STORE_PATH, JSON.stringify(seed, null, 2));
      return seed;
    }
    throw err;
  }
}

async function writeStore(data) {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2));
}

// GET /api/class-bullets  -> { [className]: headlines[] } for every class
router.get('/class-bullets', async (req, res) => {
  try {
    const store = await readStore();
    res.json({ success: true, presets: store });
  } catch (err) {
    console.error('Error reading class bullet presets:', err);
    res.status(500).json({ success: false, message: 'Failed to load class bullet presets' });
  }
});

// GET /api/class-bullets/:className -> headlines[] for one class
router.get('/class-bullets/:className', async (req, res) => {
  try {
    const store = await readStore();
    const preset = store[req.params.className] || [];
    res.json({ success: true, headlines: preset });
  } catch (err) {
    console.error('Error reading class bullet preset:', err);
    res.status(500).json({ success: false, message: 'Failed to load class bullet preset' });
  }
});

// PUT /api/class-bullets/:className  body: { headlines: [...] }
// Saves (creates or overwrites) the permanent default for a class.
router.put('/class-bullets/:className', async (req, res) => {
  try {
    const { headlines } = req.body;
    if (!Array.isArray(headlines)) {
      return res.status(400).json({ success: false, message: '`headlines` must be an array' });
    }
    const store = await readStore();
    store[req.params.className] = headlines;
    await writeStore(store);
    res.json({ success: true, headlines: store[req.params.className] });
  } catch (err) {
    console.error('Error saving class bullet preset:', err);
    res.status(500).json({ success: false, message: 'Failed to save class bullet preset' });
  }
});

// DELETE /api/class-bullets/:className
// Clears a class's saved default back to empty (does not remove the class
// from CLASSES_OF_BUSINESS — it just stops auto-filling).
router.delete('/class-bullets/:className', async (req, res) => {
  try {
    const store = await readStore();
    store[req.params.className] = [];
    await writeStore(store);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting class bullet preset:', err);
    res.status(500).json({ success: false, message: 'Failed to delete class bullet preset' });
  }
});

// DELETE /api/class-bullets/:className/headline/:headlineId
// Removes a single saved headline (and its subpoints) from a class default,
// per the "can still be deleted... in case they want to change it" requirement.
router.delete('/class-bullets/:className/headline/:headlineId', async (req, res) => {
  try {
    const store = await readStore();
    const preset = store[req.params.className] || [];
    store[req.params.className] = preset.filter(
      (h) => String(h.id) !== req.params.headlineId
    );
    await writeStore(store);
    res.json({ success: true, headlines: store[req.params.className] });
  } catch (err) {
    console.error('Error deleting headline from class preset:', err);
    res.status(500).json({ success: false, message: 'Failed to delete headline' });
  }
});

module.exports = router;

// --- Wiring (server/server.js) ---
// const classBulletsRoutes = require('./route/classBullets');
// app.use('/api', classBulletsRoutes);
//
// --- Seed file ---
// Copy classBulletPoints.json (delivered alongside this route) to
// server/data/classBulletPoints.seed.json — that's what readStore()
// falls back to on first boot, so GIT arrives pre-filled in production
// without a manual migration step.
