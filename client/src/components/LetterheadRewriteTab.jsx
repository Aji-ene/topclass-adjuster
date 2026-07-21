import React, { useState } from 'react';
import { Card, Form, Row, Col, Button, Badge, Alert, ListGroup } from 'react-bootstrap';

const AI_AGENTS = [
  { value: 'claude', label: 'Claude' },
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'grok', label: 'Grok' },
  { value: 'gemini', label: 'Gemini' },
];

// Drop this in as a new <Tab eventKey="letterhead" title="Letterhead Rewrite"> inside
// the existing <Tabs> in Home.jsx, alongside "generate" and "training".
function LetterheadRewriteTab() {
  const [selectedAgent, setSelectedAgent] = useState('claude');

  const [letterhead, setLetterhead] = useState(null);       // single file: template (doc or image)
  const [fieldReports, setFieldReports] = useState([]);      // one or many
  const [policyDocument, setPolicyDocument] = useState(null);
  const [endorsement, setEndorsement] = useState(null);
  const [additionalDocs, setAdditionalDocs] = useState([]);
  const [photos, setPhotos] = useState([]);

  const [claimNumber, setClaimNumber] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [insuredName, setInsuredName] = useState('');
  const [dateOfLoss, setDateOfLoss] = useState('');
  const [locationOfLoss, setLocationOfLoss] = useState('');
  const [classOfBusiness, setClassOfBusiness] = useState('');

  const [instructions, setInstructions] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [thread, setThread] = useState([]); // [{role: 'user'|'assistant', content}]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const hasInitialFiles = letterhead && fieldReports.length > 0;
  const isFollowUp = thread.length > 0;

  const handleSingleFile = (setter) => (e) => {
    if (e.target.files?.[0]) setter(e.target.files[0]);
  };
  const handleMultiFile = (setter) => (e) => {
    if (e.target.files) setter(Array.from(e.target.files));
  };

  const submit = async () => {
    if (!isFollowUp && !hasInitialFiles) {
      setError('Please upload the letterhead template and at least one field report to get started.');
      return;
    }
    if (isFollowUp && !instructions.trim()) {
      setError('Add an instruction or question for the follow-up.');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    if (letterhead) formData.append('letterhead', letterhead);
    fieldReports.forEach(f => formData.append('fieldReports', f));
    if (policyDocument) formData.append('policyDocument', policyDocument);
    if (endorsement) formData.append('endorsement', endorsement);
    additionalDocs.forEach(f => formData.append('additionalDocs', f));
    photos.forEach(f => formData.append('photos', f));

    formData.append('agent', selectedAgent);
    formData.append('instructions', instructions);
    formData.append('isFollowUp', String(isFollowUp));
    if (sessionId) formData.append('sessionId', sessionId);
    formData.append('metadata', JSON.stringify({
      claimNumber, policyNumber, insuredName, dateOfLoss, locationOfLoss, classOfBusiness,
    }));

    const userTurnLabel = instructions.trim() || '[Generate initial letterhead rewrite]';
    setThread(prev => [...prev, { role: 'user', content: userTurnLabel }]);
    setInstructions('');

    try {
      const API_URL = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${API_URL}/api/files/letterhead-rewrite`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to generate');

      setSessionId(data.sessionId);
      setThread(prev => [...prev, { role: 'assistant', content: data.report }]);
    } catch (err) {
      setError(err.message || 'Error generating letterhead rewrite');
    } finally {
      setLoading(false);
    }
  };

  const latestReport = [...thread].reverse().find(t => t.role === 'assistant')?.content;

  const downloadAsTxt = () => {
    if (!latestReport) return;
    const blob = new Blob([latestReport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `letterhead_report_${claimNumber || 'draft'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Card className="mb-4">
        <Card.Body>
          <h3 className="mb-3">Letterhead Rewrite</h3>
          <Alert variant="info">
            Upload your official letterhead template and a field report. The AI rewrites (or extends)
            the field report content into the letterhead's own structure and formatting — then you can
            keep the conversation going below to add, clarify, or correct anything before finalizing.
          </Alert>

          {!isFollowUp && (
            <>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Letterhead Template (required)</Form.Label>
                    <Form.Control type="file" accept=".docx,.pdf,.txt,image/*" onChange={handleSingleFile(setLetterhead)} />
                    <Form.Text className="text-muted">Doc, PDF, or an image/scan of the letterhead.</Form.Text>
                    {letterhead && <small className="text-success d-block mt-1">✓ {letterhead.name}</small>}
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Field Report(s) (required)</Form.Label>
                    <Form.Control type="file" multiple accept=".docx,.pdf,.txt" onChange={handleMultiFile(setFieldReports)} />
                    {fieldReports.length > 0 && (
                      <div className="mt-2">
                        {fieldReports.map((f, i) => <Badge key={i} bg="secondary" className="me-2">{f.name}</Badge>)}
                      </div>
                    )}
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Policy Document (optional)</Form.Label>
                    <Form.Control type="file" accept=".docx,.pdf,.txt" onChange={handleSingleFile(setPolicyDocument)} />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Endorsement (optional)</Form.Label>
                    <Form.Control type="file" accept=".docx,.pdf,.txt" onChange={handleSingleFile(setEndorsement)} />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Additional Documents (optional)</Form.Label>
                    <Form.Control type="file" multiple accept=".docx,.pdf,.txt,.xls,.xlsx" onChange={handleMultiFile(setAdditionalDocs)} />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Photos / Evidence (optional — analyzed if provided)</Form.Label>
                <Form.Control type="file" multiple accept="image/*" onChange={handleMultiFile(setPhotos)} />
                {photos.length > 0 && <small className="text-muted d-block mt-1">{photos.length} photo(s) selected</small>}
              </Form.Group>

              <Row>
                <Col md={6}><Form.Group className="mb-2">
                  <Form.Label>Claim Number</Form.Label>
                  <Form.Control value={claimNumber} onChange={e => setClaimNumber(e.target.value)} />
                </Form.Group></Col>
                <Col md={6}><Form.Group className="mb-2">
                  <Form.Label>Policy Number</Form.Label>
                  <Form.Control value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} />
                </Form.Group></Col>
              </Row>
              <Row>
                <Col md={4}><Form.Group className="mb-2">
                  <Form.Label>Insured Name</Form.Label>
                  <Form.Control value={insuredName} onChange={e => setInsuredName(e.target.value)} />
                </Form.Group></Col>
                <Col md={4}><Form.Group className="mb-2">
                  <Form.Label>Date of Loss</Form.Label>
                  <Form.Control type="date" value={dateOfLoss} onChange={e => setDateOfLoss(e.target.value)} />
                </Form.Group></Col>
                <Col md={4}><Form.Group className="mb-2">
                  <Form.Label>Class of Business</Form.Label>
                  <Form.Control value={classOfBusiness} onChange={e => setClassOfBusiness(e.target.value)} placeholder="e.g. Marine" />
                </Form.Group></Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Agent</Form.Label>
                <Form.Select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)}>
                  {AI_AGENTS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </Form.Select>
              </Form.Group>
            </>
          )}

          {thread.length > 0 && (
            <Card className="mb-3 bg-light">
              <Card.Body style={{ maxHeight: 400, overflowY: 'auto' }}>
                {thread.map((t, i) => (
                  <div key={i} className={`mb-3 ${t.role === 'user' ? 'text-primary' : ''}`}>
                    <strong>{t.role === 'user' ? 'You' : AI_AGENTS.find(a => a.value === selectedAgent)?.label}:</strong>
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{t.content}</pre>
                  </div>
                ))}
              </Card.Body>
            </Card>
          )}

          <Form.Group className="mb-3">
            <Form.Label>{isFollowUp ? 'Add instructions, corrections, or a question' : 'Optional instructions for this rewrite'}</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder={isFollowUp
                ? 'e.g. "Add a paragraph on the salvage recommendation" or "What else do you need from me to finalize this?"'
                : 'e.g. "Keep the existing intro paragraph, only rewrite the findings section"'}
            />
          </Form.Group>

          {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

          <div className="d-flex gap-2">
            <Button variant="success" onClick={submit} disabled={loading}>
              {loading ? 'Working...' : isFollowUp ? 'Send' : 'Generate Letterhead Report'}
            </Button>
            {latestReport && (
              <Button variant="outline-primary" onClick={downloadAsTxt}>Download Latest Draft (TXT)</Button>
            )}
          </div>
        </Card.Body>
      </Card>
    </>
  );
}

export default LetterheadRewriteTab;
