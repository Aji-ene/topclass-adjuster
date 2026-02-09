import React, { useState, useEffect } from 'react';
import {
  Container,
  Button,
  Alert,
  Form,
  Card,
  Row,
  Col,
  Badge,
  Table,
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
  'Property',
];

const AI_AGENTS = [
  { value: 'claude', label: 'Claude', description: 'Anthropic - Best for detailed analysis' },
  { value: 'chatgpt', label: 'ChatGPT', description: 'OpenAI - Versatile and creative' },
  { value: 'grok', label: 'Grok', description: 'xAI - Real-time insights' },
  { value: 'gemini', label: 'Gemini', description: 'Google - Multimodal processing' },
];

const DEFAULT_SCRUTINY_ITEMS = [
  { value: 'INTRODUCTION', label: 'INTRODUCTION' },
  { value: 'THE INSURED', label: 'THE INSURED' },
  { value: 'INTERVIEWS', label: 'INTERVIEWS' },
  { value: 'POLICY TERMS AND CONDITION', label: 'POLICY TERMS AND CONDITION' },
];

const CLASS_DOCUMENT_REQUIREMENTS = {
  'Marine': ['Bill of Lading', 'Survey Report', 'Insurance Certificate', 'Commercial Invoice'],
  'Fire & Special Peril': ['Fire Brigade Report', 'Forensic Report', 'Inventory List', 'Building Plans'],
  'Oil & Gas': ['Daily Drilling Report', 'Well Logs', 'Safety Certificates', 'Maintenance Records'],
  'Professional Indemnity': ['Client Contract', 'Negligence Proof', 'Legal Correspondence', 'Fee Notes'],
  'Money': ['Bank Statements', 'Security Audit', 'Cash Handling Procedures', 'Alarm Certificates'],
  'Burglary': ['Police Report', 'Security System Logs', 'Inventory Records', 'Key Control Records'],
  'Theft': ['Police Report', 'CCTV Footage', 'Witness Statements', 'Stock Records'],
  'Machinery Breakdown': ['Maintenance Logs', 'Operator Certificates', 'Manufacturer Manuals', 'Service Reports'],
  'GIT': ['Travel Itinerary', 'Boarding Passes', 'Medical Reports', 'Embassy Correspondence'],
  'Fraud': ['Forensic Audit', 'Internal Investigation', 'Bank Statements', 'Whistleblower Statements'],
  'Business Interruption': ['Financial Statements', 'Production Records', 'Supplier Contracts', 'Customer Orders'],
  'Fidelity Guarantee': ['Employee Records', 'Internal Controls', 'Audit Reports', 'Bonding Certificates'],
  'Property': ['Title Deeds', 'Valuation Reports', 'Lease Agreements', 'Building Certificates'],
};

function Home() {
  const [selectedMode, setSelectedMode] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('claude');

  // Claim metadata
  const [claimNumber, setClaimNumber] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [insuredName, setInsuredName] = useState('');
  const [dateOfLoss, setDateOfLoss] = useState('');
  const [locationOfLoss, setLocationOfLoss] = useState('');
  const [lossDescription, setLossDescription] = useState('');

  const [classOfBusiness, setClassOfBusiness] = useState('');

  // Document uploads - Policy document made optional for all modes
  const [policyDocument, setPolicyDocument] = useState(null);

  // New state for default scrutiny items
  const [selectedScrutinyItems, setSelectedScrutinyItems] = useState([]);
  const [interviewDetails, setInterviewDetails] = useState([
    { id: 1, name: '', conversation: '' }
  ]);

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
  const [endorsement, setEndorsement] = useState(null);
  const [additionalDocs, setAdditionalDocs] = useState([]);
  const [supportingDocs, setSupportingDocs] = useState([]);
  const [photos, setPhotos] = useState([]);

  const [excludePhotosFromAI, setExcludePhotosFromAI] = useState(false);
  const [customScrutinyPrompt, setCustomScrutinyPrompt] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedReport, setGeneratedReport] = useState(null);

  // Update document requirements when class changes
  const [documentRequirements, setDocumentRequirements] = useState([]);

  useEffect(() => {
    if (classOfBusiness && CLASS_DOCUMENT_REQUIREMENTS[classOfBusiness]) {
      setDocumentRequirements(CLASS_DOCUMENT_REQUIREMENTS[classOfBusiness]);
    } else {
      setDocumentRequirements([]);
    }
  }, [classOfBusiness]);

  // ───────────────────────────────────────────────
  // New Interview handlers
  // ───────────────────────────────────────────────
  const addInterview = () => {
    const newId = Math.max(...interviewDetails.map(i => i.id), 0) + 1;
    setInterviewDetails([...interviewDetails, { id: newId, name: '', conversation: '' }]);
  };

  const removeInterview = (id) => {
    if (interviewDetails.length > 1) {
      setInterviewDetails(interviewDetails.filter(i => i.id !== id));
    }
  };

  const updateInterview = (id, field, value) => {
    setInterviewDetails(interviewDetails.map(i => 
      i.id === id ? { ...i, [field]: value } : i
    ));
  };

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

    // Policy document is now optional for all modes
    if (selectedMode === 'final' && !policyDocument) {
      console.warn('Policy document not provided for Final Report - analysis may be limited');
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

    // Add default scrutiny items
    formData.append('scrutinyItems', JSON.stringify(selectedScrutinyItems));

    // Add interview details if any
    if (selectedScrutinyItems.includes('INTERVIEWS')) {
      formData.append('interviewDetails', JSON.stringify(interviewDetails.filter(i => i.name.trim() || i.conversation.trim())));
    }

    // Add custom scrutiny prompt if in scrutiny mode
    if (selectedMode === 'scrutiny' && customScrutinyPrompt.trim()) {
      formData.append('customScrutinyPrompt', customScrutinyPrompt.trim());
    }

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

    // Always include policy document if uploaded (now optional)
    if (policyDocument) {
      formData.append('policyDocument', policyDocument);
    }

    if (selectedMode === 'final' && endorsement) {
      formData.append('endorsement', endorsement);
    }

    [...additionalDocs, ...supportingDocs].forEach(file => 
      formData.append('additionalDocs', file)
    );

    // Add photos only if there are any uploaded
    if (photos.length > 0) {
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

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 500));
        throw new Error('Server returned non-JSON response. Check server logs.');
      }

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || `Server error: ${response.status}`);
      }

      setGeneratedReport(data.report);
    } catch (err) {
      setError(err.message || 'Error generating report');
      console.error('Generation error:', err);
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
            insuredName,
            dateOfLoss,
            locationOfLoss,
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

  // Render report in table format
  const renderReportWithTable = (report) => {
    if (!report) return report;
    
    // Create metadata table
    const metadataTable = `
<style>
.report-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
  font-family: 'Times New Roman', serif;
  font-size: 12pt;
}
.report-table td {
  padding: 8px 12px;
  border: none;
  vertical-align: top;
  line-height: 1.5;
}
.report-label {
  font-weight: bold;
  width: 30%;
  background-color: #f8f9fa;
}
</style>

<table class="report-table">
  <tr>
    <td class="report-label">Claim Number:</td>
    <td>${claimNumber || 'Not provided'}</td>
    <td class="report-label">Policy Number:</td>
    <td>${policyNumber || 'Not provided'}</td>
  </tr>
  <tr>
    <td class="report-label">Insured Name:</td>
    <td>${insuredName || 'Not provided'}</td>
    <td class="report-label">Class of Business:</td>
    <td>${classOfBusiness || 'Not provided'}</td>
  </tr>
  <tr>
    <td class="report-label">Date of Loss:</td>
    <td>${dateOfLoss || 'Not provided'}</td>
    <td class="report-label">Location of Loss:</td>
    <td>${locationOfLoss || 'Not provided'}</td>
  </tr>
</table>

${report.replace(/^[\s\S]*?(?=\n\n|$)/, '')}`;

    return metadataTable;
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

          {classOfBusiness && documentRequirements.length > 0 && (
            <Alert variant="info" className="mb-4">
              <strong>Suggested Documents for {classOfBusiness}:</strong>
              <ul className="mb-0 mt-2">
                {documentRequirements.map((doc, idx) => (
                  <li key={idx}>{doc}</li>
                ))}
              </ul>
              <small className="text-muted">These documents are recommended but not mandatory</small>
            </Alert>
          )}

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
              <>
                <Alert variant="info" className="mb-4">
                  <strong>AI Expert Mode:</strong> The AI will act as an experienced insurance claims adjuster.
                  It will review the field report in detail, ask intelligent probing questions,
                  highlight missing details, inconsistencies, or gaps in evidence,
                  suggest documents/photographs needed, and provide tailored recommendations
                  based on the selected class of business.
                </Alert>

                {/* Default Scrutiny Items */}
                <Card className="mb-4">
                  <Card.Body>
                    <Form.Group>
                      <Form.Label><strong>Select Default Focus Areas</strong></Form.Label>
                      <Form.Text className="text-muted d-block mb-2">
                        Choose from predefined focus areas or add custom ones below
                      </Form.Text>
                      <div className="mb-3">
                        {DEFAULT_SCRUTINY_ITEMS.map(item => (
                          <Form.Check
                            key={item.value}
                            type="checkbox"
                            id={`scrutiny-${item.value}`}
                            label={item.label}
                            checked={selectedScrutinyItems.includes(item.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedScrutinyItems([...selectedScrutinyItems, item.value]);
                              } else {
                                setSelectedScrutinyItems(selectedScrutinyItems.filter(i => i !== item.value));
                              }
                            }}
                            className="mb-2"
                          />
                        ))}
                      </div>
                    </Form.Group>
                  </Card.Body>
                </Card>

                {/* Interview Details - Only shown if INTERVIEWS is selected */}
                {selectedScrutinyItems.includes('INTERVIEWS') && (
                  <Card className="mb-4 border-primary">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="mb-0">Interview Details</h5>
                        <Button variant="outline-primary" size="sm" onClick={addInterview}>
                          + Add Interview
                        </Button>
                      </div>
                      {interviewDetails.map(interview => (
                        <Card key={interview.id} className="mb-3">
                          <Card.Body>
                            <Row className="mb-2">
                              <Col md={6}>
                                <Form.Control
                                  placeholder="Interviewee Name"
                                  value={interview.name}
                                  onChange={(e) => updateInterview(interview.id, 'name', e.target.value)}
                                />
                              </Col>
                              <Col md={6} className="d-flex align-items-start">
                                {interviewDetails.length > 1 && (
                                  <Button 
                                    variant="outline-danger" 
                                    size="sm"
                                    onClick={() => removeInterview(interview.id)}
                                  >
                                    Remove
                                  </Button>
                                )}
                              </Col>
                            </Row>
                            <Form.Control
                              as="textarea"
                              rows={3}
                              placeholder="Conversation details..."
                              value={interview.conversation}
                              onChange={(e) => updateInterview(interview.id, 'conversation', e.target.value)}
                            />
                          </Card.Body>
                        </Card>
                      ))}
                    </Card.Body>
                  </Card>
                )}

                {/* Custom Prompt Field for Scrutiny Mode */}
                <Card className="mb-4 border-warning">
                  <Card.Body>
                    <Form.Group>
                      <Form.Label className="d-flex align-items-center gap-2">
                        <strong>Additional Analysis Instructions</strong>
                        <Badge bg="warning" text="dark">Optional</Badge>
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        value={customScrutinyPrompt}
                        onChange={e => setCustomScrutinyPrompt(e.target.value)}
                        placeholder="Enter any specific analysis tasks you want the AI to perform alongside the standard scrutiny. Examples:&#10;• Compare this claim with similar past claims&#10;• Identify potential subrogation opportunities&#10;• Assess compliance with industry regulations&#10;• Evaluate fraud indicators&#10;• Provide risk assessment for litigation&#10;• Suggest cost-saving measures"
                      />
                      <Form.Text className="text-muted">
                        This prompt will be used in addition to the standard scrutiny analysis. 
                        Leave blank to use only the standard scrutiny process.
                      </Form.Text>
                    </Form.Group>
                  </Card.Body>
                </Card>
              </>
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

            {/* Policy Document - Now optional for all modes */}
            <Form.Group className="mb-4">
              <Form.Label>Upload Policy Document (optional)</Form.Label>
              <Form.Control 
                type="file" 
                accept=".docx,.pdf,.txt" 
                onChange={handleFileChange(setPolicyDocument)} 
              />
              <Form.Text className="text-muted">
                Recommended for better analysis. The AI will read through the policy if provided.
              </Form.Text>
              {policyDocument && <small className="text-success d-block mt-1">✓ {policyDocument.name}</small>}
            </Form.Group>

            {selectedMode === 'final' && (
              <>
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
              {selectedMode === 'scrutiny' ? 'Custom Focus Areas' : 'Report Arrangement'}
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

            {/* Photo Uploads with Exclude Option */}
            <Card className="mb-4">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">Upload Photos / Evidence</h5>
                  <Form.Check
                    type="switch"
                    id="exclude-photos-switch"
                    label="Exclude from AI processing"
                    checked={excludePhotosFromAI}
                    onChange={(e) => setExcludePhotosFromAI(e.target.checked)}
                    className="mb-0"
                  />
                </div>
                
                <Form.Group>
                  <Form.Label>Select Photos (optional)</Form.Label>
                  <Form.Control
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleMultipleFiles(setPhotos)}
                  />
                  <Form.Text className="text-muted">
                    {excludePhotosFromAI 
                      ? "Photos will be stored but excluded from AI analysis"
                      : "Photos will be analyzed by AI and included in the report"}
                  </Form.Text>
                  
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
                      <div className="mt-2 text-muted">
                        <small>
                          {excludePhotosFromAI 
                            ? "✓ Photos will be stored only (not analyzed by AI)"
                            : "✓ Photos will be analyzed by AI"}
                        </small>
                      </div>
                    </div>
                  )}
                </Form.Group>
              </Card.Body>
            </Card>

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

            <div 
              className="p-3 rounded border"
              style={{ 
                maxHeight: '500px', 
                overflow: 'auto',
                fontFamily: 'Times New Roman, serif',
                fontSize: '12pt',
                lineHeight: '1.5'
              }}
              dangerouslySetInnerHTML={{ __html: renderReportWithTable(generatedReport) }}
            />
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}

export default Home;