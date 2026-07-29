// client/src/components/ClassBulletPresetControls.jsx
//
// Sits next to the existing headline/subpoint editor Home.js already
// has (addHeadline/updateHeadline/addSubpoint/etc. — unchanged). This
// component only adds the "make it permanent" actions:
//   - Save the CURRENT headlines/subpoints as the default for the
//     selected class (so next time that class is picked, it auto-fills).
//   - Clear the saved default for that class.
// The GIT class ships pre-populated (see classBulletPoints.json /
// route/classBullets.js) — this is how the user builds the other
// eleven classes over time, and how anyone revises GIT later.

import React, { useState } from 'react';
import { Button, Spinner } from 'react-bootstrap';

function ClassBulletPresetControls({ classOfBusiness, headlines }) {
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [msg, setMsg] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || '';

  const saveAsDefault = async () => {
    if (!classOfBusiness) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/class-bullets/${encodeURIComponent(classOfBusiness)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headlines }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setMsg({ ok: true, text: `Saved as the default bullet set for ${classOfBusiness}.` });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const clearDefault = async () => {
    if (!classOfBusiness) return;
    if (!window.confirm(`Remove the saved default bullet set for ${classOfBusiness}?`)) return;
    setClearing(true);
    setMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/class-bullets/${encodeURIComponent(classOfBusiness)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setMsg({ ok: true, text: `Cleared the saved default for ${classOfBusiness}.` });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setClearing(false);
    }
  };

  if (!classOfBusiness) return null;

  return (
    <div className="d-flex align-items-center gap-2 mt-2 mb-3">
      <Button size="sm" variant="outline-primary" onClick={saveAsDefault} disabled={saving}>
        {saving ? <Spinner size="sm" animation="border" /> : `Save as ${classOfBusiness} default`}
      </Button>
      <Button size="sm" variant="outline-danger" onClick={clearDefault} disabled={clearing}>
        {clearing ? <Spinner size="sm" animation="border" /> : 'Clear saved default'}
      </Button>
      {msg && (
        <span className={`small ${msg.ok ? 'text-success' : 'text-danger'}`}>{msg.text}</span>
      )}
    </div>
  );
}

export default ClassBulletPresetControls;

/*
Patch for Home.js (near the existing `useEffect` that reacts to
classOfBusiness for REQUIRED_DOCUMENTS):

  useEffect(() => {
    if (!classOfBusiness) return;
    fetch(`${process.env.REACT_APP_API_URL || ''}/api/class-bullets/${encodeURIComponent(classOfBusiness)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.headlines?.length) {
          setHeadlines(data.headlines);   // auto-fill
        }
        // else: leave whatever the user already has (e.g. blank 8-slot
        // default) — nothing saved yet for this class.
      })
      .catch(() => {}); // silent — preset is a convenience, not required
  }, [classOfBusiness]);

Then render <ClassBulletPresetControls classOfBusiness={classOfBusiness} headlines={headlines} />
right under the existing headline editor. The existing addHeadline /
removeHeadline / updateHeadline / addSubpoint / updateSubpoint /
removeSubpoint functions in Home.js need NO changes — the user still
adds/removes points per-report exactly as today; this only adds the
"remember this permanently" layer on top.
*/
