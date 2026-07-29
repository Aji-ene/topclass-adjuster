// client/src/components/FieldReportInput.jsx
//
// Drop-in replacement for the current single <input type="file"> field
// report control in Home.js. Adds a link option alongside upload.
//
// Usage in Home.js:
//   <FieldReportInput
//     file={fieldReport}
//     onFile={setFieldReport}
//     onLinkResolved={(text) => setFieldReportLinkText(text)}
//     selectedAgent={selectedAgent}
//   />
// `fieldReportLinkText` is a new piece of state (string | null) that,
// when present, gets appended to formData as `fieldReportText` in
// handleGenerate instead of (or alongside) the `fieldReport` file.

import React, { useState } from 'react';
import { Form, Tabs, Tab, Button, Spinner, Alert } from 'react-bootstrap';

function FieldReportInput({ file, onFile, onLinkResolved, selectedAgent }) {
  const [mode, setMode] = useState('upload'); // 'upload' | 'link'
  const [url, setUrl] = useState('');
  const [resolving, setResolving] = useState(false);
  const [linkStatus, setLinkStatus] = useState(null); // { ok, message, source }

  const resolveLink = async () => {
    if (!url.trim()) return;
    setResolving(true);
    setLinkStatus(null);
    try {
      const API_URL = process.env.REACT_APP_API_URL || '';
      const res = await fetch(`${API_URL}/api/files/fetch-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), agent: selectedAgent }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not read that link');
      onLinkResolved(data.text);
      setLinkStatus({
        ok: true,
        message:
          data.source?.startsWith('ai-agent-fallback')
            ? `Read via ${selectedAgent} (page needed AI extraction)`
            : 'Field report read successfully',
      });
    } catch (err) {
      onLinkResolved(null);
      setLinkStatus({ ok: false, message: err.message });
    } finally {
      setResolving(false);
    }
  };

  return (
    <Form.Group className="mb-3">
      <Form.Label>Field Report *</Form.Label>
      <Tabs
        activeKey={mode}
        onSelect={(k) => {
          setMode(k);
          if (k === 'upload') onLinkResolved(null);
        }}
        className="mb-2"
      >
        <Tab eventKey="upload" title="Upload file">
          <Form.Control
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          {file && <div className="text-muted small mt-1">{file.name}</div>}
        </Tab>
        <Tab eventKey="link" title="Paste a link">
          <div className="d-flex gap-2">
            <Form.Control
              type="url"
              placeholder="https://drive.google.com/... or any accessible report URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button onClick={resolveLink} disabled={resolving || !url.trim()}>
              {resolving ? <Spinner size="sm" animation="border" /> : 'Read link'}
            </Button>
          </div>
          {linkStatus && (
            <Alert variant={linkStatus.ok ? 'success' : 'danger'} className="mt-2 py-2 mb-0">
              {linkStatus.message}
            </Alert>
          )}
        </Tab>
      </Tabs>
    </Form.Group>
  );
}

export default FieldReportInput;
