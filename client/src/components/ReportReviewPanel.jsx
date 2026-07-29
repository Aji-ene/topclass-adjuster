// client/src/components/ReportReviewPanel.jsx
//
// Renders under the generated report (replacing the current bare
// download buttons). Two states:
//   1. Review: "Looks good" -> Accept  |  "Needs changes" -> opens a
//      feedback box, re-submits to /api/files/rework, and swaps the
//      report text in place. Repeatable — no cap on rounds.
//   2. Accepted: shows the existing docx/txt download buttons PLUS a
//      new "Place on letterhead" button, which is the existing
//      LetterheadRewriteTab flow invoked programmatically instead of
//      as a separate tab (see IMPLEMENTATION_PLAN.md for the tab-merge
//      details) — same /api/files endpoints that tab already posts to.

import React, { useState } from 'react';
import { Card, Button, Form, Spinner, ButtonGroup } from 'react-bootstrap';

function ReportReviewPanel({
  generatedReport,
  setGeneratedReport,
  reportContext, // { reportType, classOfBusiness, aiAgent, claimNumber, ... } — same fields handleGenerate already sends
  onDownloadTxt,
  onDownloadDocx,
  onPlaceOnLetterhead, // wire to existing LetterheadRewriteTab submit logic
}) {
  const [accepted, setAccepted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [reworking, setReworking] = useState(false);
  const [error, setError] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || '';

  const submitRework = async () => {
    if (!feedback.trim()) return;
    setReworking(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/files/rework`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentReport: generatedReport,
          feedback: feedback.trim(),
          ...reportContext,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Rework failed');
      setGeneratedReport(data.report);
      setFeedback('');
      setShowFeedback(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setReworking(false);
    }
  };

  if (!generatedReport) return null;

  return (
    <Card className="mt-3">
      <Card.Body>
        {!accepted ? (
          <>
            <Card.Title>Review this report</Card.Title>
            <p className="text-muted mb-3">
              Read through the generated report above. Accept it to move on to download and
              letterhead placement, or request changes and it'll be reworked in place.
            </p>
            <ButtonGroup>
              <Button variant="success" onClick={() => setAccepted(true)}>
                Accept report
              </Button>
              <Button variant="outline-secondary" onClick={() => setShowFeedback((s) => !s)}>
                Request changes
              </Button>
            </ButtonGroup>

            {showFeedback && (
              <div className="mt-3">
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="e.g. Expand paragraph 6 on the driver's statement; tighten the subrogation section; fix the excess figure to N15,000..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
                <Button
                  className="mt-2"
                  onClick={submitRework}
                  disabled={reworking || !feedback.trim()}
                >
                  {reworking ? <Spinner size="sm" animation="border" /> : 'Rework report'}
                </Button>
                {error && <div className="text-danger small mt-2">{error}</div>}
              </div>
            )}
          </>
        ) : (
          <>
            <Card.Title>Report accepted</Card.Title>
            <ButtonGroup>
              <Button variant="outline-primary" onClick={onDownloadTxt}>
                Download .txt
              </Button>
              <Button variant="outline-primary" onClick={onDownloadDocx}>
                Download .docx
              </Button>
              <Button variant="primary" onClick={onPlaceOnLetterhead}>
                Place on letterhead
              </Button>
            </ButtonGroup>
            <div className="mt-2">
              <Button variant="link" size="sm" onClick={() => setAccepted(false)}>
                Actually, I need to change something
              </Button>
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  );
}

export default ReportReviewPanel;
