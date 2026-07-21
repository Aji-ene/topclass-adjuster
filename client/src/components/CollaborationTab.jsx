import React, { useState } from 'react';
import { Card, Form, Row, Col, Button, Badge, Alert, Tabs, Tab } from 'react-bootstrap';

const AI_AGENTS = [
  { value: 'claude', label: 'Claude' },
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'grok', label: 'Grok' },
  { value: 'gemini', label: 'Gemini' },
];

// Drop this in as a new <Tab eventKey="collaboration" title="AI Collaboration"> inside
// the existing <Tabs> in Home.jsx.
function CollaborationTab() {
  const [selectedAgents, setSelectedAgents] = useState(['claude', 'chatgpt']);
  const [discuss, setDiscuss] = useState(false);
  const [rounds, setRounds] = useState(2);
  const [synthesizerAgent, setSynthesizerAgent] = useState('');

  const [prompt, setPrompt] = useState('');
  const [documents, setDocuments] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [claimNumber, setClaimNumber] = useState('');

  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // raw API response

  const toggleAgent = (value) => {
    setSelectedAgents(prev =>
      prev.includes(value) ? prev.filter(a => a !== value) : [...prev, value]
    );
  };

  const submit = async () => {
    if (!prompt.trim()) return setError('Enter a prompt or request for the agents.');
    if (selectedAgents.length === 0) return setError('Select at least one AI agent.');
    if (discuss && selectedAgents.length < 2) return setError('Discussion mode needs at least 2 agents — otherwise use parallel mode.');

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('agents', JSON.stringify(selectedAgents));
    formData.append('discuss', String(discuss));
    formData.append('rounds', String(rounds));
    if (synthesizerAgent) formData.append('synthesizerAgent', synthesizerAgent);
    if (sessionId) formData.append('sessionId', sessionId);
    documents.forEach(f => formData.append('documents', f));
    photos.forEach(f => formData.append('photos', f));
    formData.append('metadata', JSON.stringify({ claimNumber }));

    try {
      const API_URL = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${API_URL}/api/files/collaborate`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Collaboration failed');

      setSessionId(data.sessionId);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Error running collaboration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-4">
      <Card.Body>
        <h3 className="mb-3">AI Collaboration</h3>
        <Alert variant="info">
          Run a request across multiple AI agents. Turn on <strong>Discussion Mode</strong> to have them
          critique and build on each other's answers across a few rounds before a final synthesized
          answer — or leave it off to get each agent's independent take side by side.
        </Alert>

        <Form.Group className="mb-3">
          <Form.Label>Select Agents</Form.Label>
          <div className="d-flex flex-wrap gap-2">
            {AI_AGENTS.map(a => (
              <Button
                key={a.value}
                variant={selectedAgents.includes(a.value) ? 'primary' : 'outline-primary'}
                size="sm"
                onClick={() => toggleAgent(a.value)}
              >
                {a.label}
              </Button>
            ))}
          </div>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Check
            type="switch"
            id="discuss-toggle"
            label="Discussion Mode (agents see and respond to each other, then synthesize a final answer)"
            checked={discuss}
            onChange={e => setDiscuss(e.target.checked)}
          />
        </Form.Group>

        {discuss && (
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Discussion Rounds</Form.Label>
                <Form.Control
                  type="number" min={1} max={5}
                  value={rounds}
                  onChange={e => setRounds(parseInt(e.target.value, 10) || 1)}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Final Synthesis By</Form.Label>
                <Form.Select value={synthesizerAgent} onChange={e => setSynthesizerAgent(e.target.value)}>
                  <option value="">-- First selected agent --</option>
                  {selectedAgents.map(a => (
                    <option key={a} value={a}>{AI_AGENTS.find(x => x.value === a)?.label}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        )}

        <Form.Group className="mb-3">
          <Form.Label>Prompt / Request</Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="e.g. Review this field report and the policy document — flag any coverage gaps or exclusions that could affect this claim."
          />
        </Form.Group>

        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Shared Documents (optional)</Form.Label>
              <Form.Control type="file" multiple accept=".docx,.pdf,.txt,.xls,.xlsx" onChange={e => setDocuments(Array.from(e.target.files || []))} />
              {documents.length > 0 && (
                <div className="mt-2">{documents.map((f, i) => <Badge key={i} bg="secondary" className="me-2">{f.name}</Badge>)}</div>
              )}
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Shared Photos (optional)</Form.Label>
              <Form.Control type="file" multiple accept="image/*" onChange={e => setPhotos(Array.from(e.target.files || []))} />
            </Form.Group>
          </Col>
        </Row>

        <Form.Group className="mb-3">
          <Form.Label>Claim Number (optional — links this to a claim's shared history)</Form.Label>
          <Form.Control value={claimNumber} onChange={e => setClaimNumber(e.target.value)} />
        </Form.Group>

        {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

        <Button variant="success" onClick={submit} disabled={loading}>
          {loading ? 'Running...' : discuss ? 'Start Discussion' : 'Run All Selected Agents'}
        </Button>

        {result && result.mode === 'parallel' && (
          <Card className="mt-4">
            <Card.Body>
              <h5 className="mb-3">Independent Responses</h5>
              <Tabs defaultActiveKey={result.results[0]?.agent}>
                {result.results.map(r => (
                  <Tab key={r.agent} eventKey={r.agent} title={r.agentLabel}>
                    <pre className="bg-light p-3 rounded mt-3" style={{ whiteSpace: 'pre-wrap', maxHeight: 500, overflow: 'auto' }}>
                      {r.content}
                    </pre>
                  </Tab>
                ))}
              </Tabs>
            </Card.Body>
          </Card>
        )}

        {result && result.mode === 'discussion' && (
          <Card className="mt-4">
            <Card.Body>
              <h5 className="mb-3">Final Synthesized Answer ({AI_AGENTS.find(a => a.value === result.synthesis.agent)?.label})</h5>
              <pre className="bg-light p-3 rounded mb-4" style={{ whiteSpace: 'pre-wrap', maxHeight: 500, overflow: 'auto' }}>
                {result.synthesis.content}
              </pre>

              <details>
                <summary style={{ cursor: 'pointer' }}>View full discussion transcript ({result.rounds.length} turns)</summary>
                <div className="mt-3">
                  {result.rounds.map((t, i) => (
                    <div key={i} className="mb-3">
                      <strong>{t.agentLabel} — round {t.round}</strong>
                      <pre className="bg-light p-2 rounded" style={{ whiteSpace: 'pre-wrap' }}>{t.content}</pre>
                    </div>
                  ))}
                </div>
              </details>
            </Card.Body>
          </Card>
        )}
      </Card.Body>
    </Card>
  );
}

export default CollaborationTab;
