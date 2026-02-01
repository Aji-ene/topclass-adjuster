import React, { useState } from 'react';
import {
  Container,
  Button,
  Alert,
  Form,
  Card,
  Row,
  Col,
  Badge,
} from 'react-bootstrap';

const CLASSES_OF_BUSINESS = [
  'Marine',
  'Fire & Special Peril',
  'Oil & Gas',
  'Professional Indemnity',
  'Money',
  'Burglary',
  'Theft',
  'Machinery Breakdown',
  'GIT',
  'Fraud',
  'Business Interruption',
  'Fidelity Guarantee',
];

const AI_AGENTS = [
  { value: 'claude', label: 'Claude', description: 'Anthropic - Best for detailed analysis' },
  { value: 'chatgpt', label: 'ChatGPT', description: 'OpenAI - Versatile and creative' },
  { value: 'grok', label: 'Grok', description: 'xAI - Real-time insights' },
  { value: 'gemini', label: 'Gemini', description: 'Google - Multimodal processing' },
];

function Home() {
  const [selectedMode, setSelectedMode] = useState(''); // 'scrutiny' | 'preliminary' | 'final'
  const [selectedAgent, setSelectedAgent] = useState('claude');

  // Claim metadata
  const [claimNumber, setClaimNumber] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [insuredName, setInsuredName] = useState('');
  const [dateOfLoss, setDateOfLoss] = useState('');
  const [locationOfLoss, setLocationOfLoss] = useState('');
  const [lossDescription, setLossDescription] = useState('');

  const [classOfBusiness, setClassOfBusiness] = useState('');

  // Headlines / Focus areas
  const [headlines, setHeadlines] = useState(
    Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      value: '',
      subpoints: [],
    }))
  );

  // File states
  const [fieldReport, setFieldReport] = useState(null);
  const [policyDocument, setPolicyDocument] = useState(null);
  const [endorsement, setEndorsement] = useState(null);
  const [additionalDocs, setAdditionalDocs] = useState([]);
  const [supportingDocs, setSupportingDocs] = useState([]);
  const [photos, setPhotos] = useState([]);

  const [excludePhotosFromAI, setExcludePhotosFromAI] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedReport, setGeneratedReport] = useState(null);

  // ───────────────────────────────────────────────
  // Headline helpers
  // ───────────────────────────────────────────────
  const addHeadline = () => {
    const newId = Math.max(...headlines.map(h => h.id), 0) + 1;
    setHeadlines([...headlines, { id: newId, value: '', subpoints: [] }]);
  };

  const removeHeadline = (id) => {
    setHeadlines(headlines.filter(h => h.id !== id));
  };

  const updateHeadline = (id, value) => {
    setHeadlines(headlines.map(h => h.id === id ? { ...h, value } : h));
  };

  const addSubpoint = (mainId) => {
    setHeadlines(headlines.map(h => {
      if (h.id === mainId) {
        const newSubId = Math.max(...h.subpoints.map(s => s.id || 0), 0) + 1;
        return { ...h, subpoints: [...h.subpoints, { id: newSubId, value: '' }] };
      }
      return h;
    }));
  };

  const updateSubpoint = (mainId, subId, value) => {
    setHeadlines(headlines.map(h => {
      if (h.id === mainId) {
        return {
          ...h,
          subpoints: h.subpoints.map(s => s.id === subId ? { ...s, value } : s)
        };
      }
      return h;
    }));
  };

  const removeSubpoint = (mainId, subId) => {
    setHeadlines(headlines.map(h => {
      if (h.id === mainId) {
        return { ...h, subpoints: h.subpoints.filter(s => s.id !== subId) };
      }
      return h;
    }));
  };

  // ───────────────────────────────────────────────
  // File helpers
  // ───────────────────────────────────────────────
  const handleFileChange = (setter) => (e) => {
    if (e.target.files?.[0]) {
      setter(e.target.files[0]);
    }
  };

  const handleMultipleFiles = (setter) => (e) => {
    if (e.target.files) {
      setter(Array.from(e.target.files));
    }
  };

  const removeFileFromList = (setter, index) => () => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const removePhoto = (index) => () => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // ───────────────────────────────────────────────
  // Report generation
  // ───────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!selectedMode) return setError('Please select a mode');
    if (!selectedAgent) return setError('Please select an AI agent');
    if (!classOfBusiness) return setError('Please select Class of Business');
    if (!fieldReport) return setError('Please upload the Field Report');

    if (selectedMode === 'final' && !policyDocument) {
      return setError('Please upload the Policy Document for Final Report');
    }

    const formData = new FormData();

    let reportTypeForApi = selectedMode === 'preliminary' ? 'interim' : selectedMode;

    formData.append('reportType', reportTypeForApi);
    formData.append('classOfBusiness', classOfBusiness);
    formData.append('aiAgent', selectedAgent);

    formData.append('claimNumber', claimNumber);
    formData.append('policyNumber', policyNumber);
    formData.append('insuredName', insuredName);
    formData.append('dateOfLoss', dateOfLoss);
    formData.append('locationOfLoss', locationOfLoss);
    formData.append('lossDescription', lossDescription);

    const structuredHeadlines = headlines
      .filter(h => h.value.trim() || h.subpoints.some(s => s.value.trim()))
      .map(h => ({
        main: h.value.trim(),
        number: `${h.id}.0`,
        subpoints: h.subpoints
          .filter(s => s.value.trim())
          .map((s, idx) => ({
            title: s.value.trim(),
            number: `${h.id}.${idx + 1}`,
          })),
      }));

    formData.append('headlines', JSON.stringify(structuredHeadlines));
    formData.append('excludePhotosFromAI', excludePhotosFromAI);

    formData.append('questionnaire', fieldReport);

    if (selectedMode === 'final') {
      formData.append('analyzedFile', policyDocument);
      if (endorsement) formData.append('endorsement', endorsement);
    }

    [...additionalDocs, ...supportingDocs].forEach(file => 
      formData.append('additionalDocs', file)
    );

    if (!excludePhotosFromAI) {
      photos.forEach(photo => formData.append('photos', photo));
    }

    setLoading(true);
    setError(null);

    try {
      const API_URL = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${API_URL}/api/files/process-files`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to process');

      setGeneratedReport(data.report);
    } catch (err) {
      setError(err.message || 'Error generating report');
    } finally {
      setLoading(false);
    }
  };

  // ───────────────────────────────────────────────
  // Download handlers
  // ───────────────────────────────────────────────
  const downloadReportAsTxt = () => {
    if (!generatedReport) return;
    const blob = new Blob([generatedReport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedMode}_report_${claimNumber || 'generated'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadReportAsDocx = async () => {
    if (!generatedReport) return;

    try {
      const API_URL = process.env.REACT_APP_API_URL || '';
      const res = await fetch(`${API_URL}/api/files/export/docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportText: generatedReport,
          metadata: {
            reportType: selectedMode === 'preliminary' ? 'interim' : selectedMode,
            aiAgent: selectedAgent,
            claimNumber,
            classOfBusiness,
            generatedAt: new Date().toISOString(),
          }
        })
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Server responded ${res.status}: ${errText || 'Download failed'}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedMode}_report_${claimNumber || 'generated'}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('DOCX download failed: ' + err.message);
    }
  };

  return (
    <Container className="py-4">
      <h1 className="mb-4 text-center">Topclass Adjusters Claims Processing</h1>

      <Card className="mb-4">
        <Card.Body>
          {/* ── Class of Business & Task & AI Agent selection ── */}
          <Form.Group className="mb-4">
            <Form.Label>Select Class of Business</Form.Label>
            <Form.Select 
              value={classOfBusiness} 
              onChange={e => setClassOfBusiness(e.target.value)}
            >
              <option value="">-- Choose Class --</option>
              {CLASSES_OF_BUSINESS.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label>Choose Task</Form.Label>
            <div className="d-flex flex-wrap gap-2">
              <Button
                variant={selectedMode === 'scrutiny' ? 'primary' : 'outline-primary'}
                onClick={() => setSelectedMode('scrutiny')}
              >
                Field Report Scrutiny / Analysis
              </Button>
              <Button
                variant={selectedMode === 'preliminary' ? 'primary' : 'outline-primary'}
                onClick={() => setSelectedMode('preliminary')}
              >
                Preliminary Report
              </Button>
              <Button
                variant={selectedMode === 'final' ? 'primary' : 'outline-primary'}
                onClick={() => setSelectedMode('final')}
              >
                Final Report
              </Button>
            </div>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="d-flex align-items-center gap-2">
              Select AI Agent <Badge bg="info">New</Badge>
            </Form.Label>
            <Row>
              {AI_AGENTS.map(agent => (
                <Col md={6} lg={3} key={agent.value} className="mb-3">
                  <Card 
                    className={`h-100 cursor-pointer ${selectedAgent === agent.value ? 'border-primary border-2' : ''}`}
                    onClick={() => setSelectedAgent(agent.value)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Card.Body className="text-center">
                      <Form.Check
                        type="radio"
                        id={`agent-${agent.value}`}
                        name="aiAgent"
                        checked={selectedAgent === agent.value}
                        onChange={() => {}}
                        label=""
                        className="mb-2"
                      />
                      <strong className="d-block mb-1">{agent.label}</strong>
                      <small className="text-muted">{agent.description}</small>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </Form.Group>

          {/* Claim metadata fields – shown after mode is selected */}
          {selectedMode && (
            <>
              <Row>
                <Col md={6}><Form.Group className="mb-3">
                  <Form.Label>Claim Number</Form.Label>
                  <Form.Control 
                    value={claimNumber} 
                    onChange={e => setClaimNumber(e.target.value)} 
                    placeholder="e.g. CLM-2026-00123" 
                  />
                </Form.Group></Col>
                <Col md={6}><Form.Group className="mb-3">
                  <Form.Label>Policy Number</Form.Label>
                  <Form.Control 
                    value={policyNumber} 
                    onChange={e => setPolicyNumber(e.target.value)} 
                  />
                </Form.Group></Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Insured Name</Form.Label>
                <Form.Control 
                  value={insuredName} 
                  onChange={e => setInsuredName(e.target.value)} 
                />
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Date of Loss</Form.Label>
                    <Form.Control 
                      type="date" 
                      value={dateOfLoss} 
                      onChange={e => setDateOfLoss(e.target.value)} 
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Location of Loss</Form.Label>
                    <Form.Control 
                      value={locationOfLoss} 
                      onChange={e => setLocationOfLoss(e.target.value)} 
                      placeholder="City, Address" 
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-4">
                <Form.Label>Loss Description</Form.Label>
                <Form.Control 
                  as="textarea" 
                  rows={3} 
                  value={lossDescription} 
                  onChange={e => setLossDescription(e.target.value)} 
                  placeholder="Brief summary of the incident..." 
                />
              </Form.Group>
            </>
          )}
        </Card.Body>
      </Card>

      {selectedMode && (
        <Card className="mb-4">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 className="mb-0">
                {selectedMode === 'scrutiny'
                  ? 'Field Report Scrutiny & Analysis'
                  : `${selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)} Report`}
              </h3>
              <Badge bg="secondary" className="fs-6">
                Using: {AI_AGENTS.find(a => a.value === selectedAgent)?.label}
              </Badge>
            </div>

            {selectedMode === 'scrutiny' && (
              <Alert variant="info" className="mb-4">
                <strong>AI Expert Mode:</strong> The AI will act as an experienced insurance claims adjuster.
                It will review the field report in detail, ask intelligent probing questions,
                highlight missing details, inconsistencies, or gaps in evidence,
                suggest documents/photographs needed, and provide tailored recommendations
                based on the selected class of business.
              </Alert>
            )}

            {/* ── File uploads ── */}
            <Form.Group className="mb-4">
              <Form.Label>Upload Field Report (required)</Form.Label>
              <Form.Control
                type="file"
                accept=".docx,.pdf,.txt"
                onChange={handleFileChange(setFieldReport)}
              />
              {fieldReport && <small className="text-success d-block mt-1">✓ {fieldReport.name}</small>}
            </Form.Group>

            {selectedMode === 'final' && (
              <>
                <Form.Group className="mb-4">
                  <Form.Label>Upload Policy Document (required)</Form.Label>
                  <Form.Control 
                    type="file" 
                    accept=".docx,.pdf,.txt" 
                    onChange={handleFileChange(setPolicyDocument)} 
                  />
                  {policyDocument && <small className="text-success d-block mt-1">✓ {policyDocument.name}</small>}
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Upload Endorsement (optional)</Form.Label>
                  <Form.Control 
                    type="file" 
                    accept=".docx,.pdf,.txt" 
                    onChange={handleFileChange(setEndorsement)} 
                  />
                  {endorsement && <small className="text-success d-block mt-1">✓ {endorsement.name}</small>}
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Additional Documents</Form.Label>
                  <Form.Control 
                    type="file" 
                    multiple 
                    accept=".docx,.pdf,.txt,.xls,.xlsx" 
                    onChange={handleMultipleFiles(setAdditionalDocs)} 
                  />
                  {additionalDocs.length > 0 && (
                    <div className="mt-2">
                      {additionalDocs.map((file, idx) => (
                        <Badge key={idx} bg="secondary" className="me-2 mb-1">
                          {file.name}
                          <Button variant="link" size="sm" className="text-white p-0 ms-1" onClick={removeFileFromList(setAdditionalDocs, idx)}>×</Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Supporting Documents</Form.Label>
                  <Form.Control 
                    type="file" 
                    multiple 
                    accept=".docx,.pdf,.txt,.xls,.xlsx" 
                    onChange={handleMultipleFiles(setSupportingDocs)} 
                  />
                  {supportingDocs.length > 0 && (
                    <div className="mt-2">
                      {supportingDocs.map((file, idx) => (
                        <Badge key={idx} bg="secondary" className="me-2 mb-1">
                          {file.name}
                          <Button variant="link" size="sm" className="text-white p-0 ms-1" onClick={removeFileFromList(setSupportingDocs, idx)}>×</Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </Form.Group>
              </>
            )}

            {(selectedMode === 'preliminary' || selectedMode === 'scrutiny') && (
              <Form.Group className="mb-4">
                <Form.Label>Additional Documents (optional)</Form.Label>
                <Form.Control 
                  type="file" 
                  multiple 
                  accept=".docx,.pdf,.txt,.xls,.xlsx" 
                  onChange={handleMultipleFiles(setAdditionalDocs)} 
                />
                {additionalDocs.length > 0 && (
                  <div className="mt-2">
                    {additionalDocs.map((file, idx) => (
                      <Badge key={idx} bg="secondary" className="me-2 mb-1">
                        {file.name}
                        <Button variant="link" size="sm" className="text-white p-0 ms-1" onClick={removeFileFromList(setAdditionalDocs, idx)}>×</Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </Form.Group>
            )}

            {/* Headlines */}
            <h5 className="mb-3">
              {selectedMode === 'scrutiny' ? 'Key Focus Areas for Scrutiny' : 'Report Arrangement'}
            </h5>

            {headlines.map(headline => (
              <Card key={headline.id} className="mb-3">
                <Card.Body>
                  <div className="d-flex gap-2 mb-2">
                    <Form.Control
                      placeholder={`Headline ${headline.id}`}
                      value={headline.value}
                      onChange={e => updateHeadline(headline.id, e.target.value)}
                    />
                    <Button variant="outline-danger" size="sm" onClick={() => removeHeadline(headline.id)}>
                      Remove
                    </Button>
                  </div>

                  {headline.subpoints.map(sub => (
                    <div key={sub.id} className="d-flex gap-2 ms-4 mb-2">
                      <Form.Control
                        size="sm"
                        placeholder={`Subpoint ${headline.id}.${sub.id}`}
                        value={sub.value}
                        onChange={e => updateSubpoint(headline.id, sub.id, e.target.value)}
                      />
                      <Button variant="outline-danger" size="sm" onClick={() => removeSubpoint(headline.id, sub.id)}>
                        ×
                      </Button>
                    </div>
                  ))}

                  <Button variant="outline-secondary" size="sm" className="ms-4" onClick={() => addSubpoint(headline.id)}>
                    + Add Subpoint
                  </Button>
                </Card.Body>
              </Card>
            ))}

            <Button variant="outline-primary" onClick={addHeadline} className="mb-4">
              + Add Headline
            </Button>

            <Form.Group className="mb-4">
              <Form.Check
                type="checkbox"
                label="Exclude uploaded photos from AI processing"
                checked={excludePhotosFromAI}
                onChange={e => setExcludePhotosFromAI(e.target.checked)}
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>Upload Photos / Evidence</Form.Label>
              <Form.Control
                type="file"
                multiple
                accept="image/*"
                onChange={handleMultipleFiles(setPhotos)}
                disabled={excludePhotosFromAI}
              />
              {photos.length > 0 && (
                <div className="mt-2">
                  <Row>
                    {photos.map((photo, idx) => (
                      <Col key={idx} xs={6} md={4} lg={3} className="mb-2">
                        <div className="position-relative">
                          <img 
                            src={URL.createObjectURL(photo)} 
                            alt={`Evidence ${idx + 1}`}
                            className="img-thumbnail w-100"
                            style={{ height: '150px', objectFit: 'cover' }}
                          />
                          <Button 
                            variant="danger" 
                            size="sm"
                            className="position-absolute top-0 end-0 m-1"
                            onClick={removePhoto(idx)}
                          >
                            ×
                          </Button>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}
            </Form.Group>

            <div className="text-center mt-4">
              <Button
                variant="success"
                size="lg"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? 'Processing...' : `Generate ${selectedMode === 'scrutiny' ? 'Scrutiny Report' : `${selectedMode} Report`}`}
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {generatedReport && (
        <Card className="mb-4">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <h4 className="mb-0">Generated Report</h4>
              <div className="d-flex gap-2">
                <Button variant="primary" onClick={downloadReportAsTxt}>
                  Download TXT
                </Button>
                <Button variant="success" onClick={downloadReportAsDocx}>
                  Download DOCX
                </Button>
              </div>
            </div>

            <pre className="bg-light p-3 rounded" style={{ maxHeight: '500px', overflow: 'auto' }}>
              {generatedReport}
            </pre>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}

export default Home;