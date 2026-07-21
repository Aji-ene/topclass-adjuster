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
  Tabs,
  Tab,
  ListGroup,
  Modal,
} from 'react-bootstrap';
import LetterheadRewriteTab from './LetterheadRewriteTab';
import CollaborationTab from './CollaborationTab';

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

const REQUIRED_DOCUMENTS = {
  'Marine': ['Bill of Lading', 'Survey Report', 'Marine Certificate', 'Invoice', 'Packing List'],
  'Fire & Special Peril': ['Fire Service Report', 'Police Report', 'Building Valuation', 'Inventory List'],
  'Oil & Gas': ['Incident Report', 'Safety Assessment', 'Equipment Inspection Report', 'Maintenance Records'],
  'Professional Indemnity': ['Client Correspondence', 'Service Agreement', 'Professional Opinion', 'Legal Notice'],
  'Money': ['Police Report', 'Cash Register Records', 'Bank Statements', 'Security Footage Log'],
  'Burglary': ['Police Report', 'Break-in Assessment', 'Inventory of Stolen Items', 'Security System Report'],
  'Theft': ['Police Report', 'Statement of Loss', 'Proof of Ownership', 'CCTV Footage'],
  'Machinery Breakdown': ['Engineer Report', 'Maintenance History', 'Repair Estimate', 'Manufacturer Specifications'],
  'GIT': ['Goods in Transit Certificate', 'Transport Documents', 'Consignment Note', 'Driver Statement'],
  'Fraud': ['Police Report', 'Forensic Report', 'Transaction Records', 'Witness Statements'],
  'Business Interruption': ['Financial Statements', 'Profit & Loss Report', 'Business Continuity Plan', 'Revenue Records'],
  'Fidelity Guarantee': ['Employee Records', 'Audit Report', 'Financial Discrepancy Report', 'Internal Investigation'],
  'Property': ['Property Valuation', 'Damage Assessment', 'Repair Quotations', 'Title Documents'],
};

const AI_AGENTS = [
  { value: 'claude', label: 'Claude', description: 'Anthropic - Best for detailed analysis' },
  { value: 'chatgpt', label: 'ChatGPT', description: 'OpenAI - Versatile and creative' },
  { value: 'grok', label: 'Grok', description: 'xAI - Real-time insights' },
  { value: 'gemini', label: 'Gemini', description: 'Google - Multimodal processing' },
];

const DEFAULT_FOCUS_AREAS = [
  'INTRODUCTION',
  'THE INSURED',
  'INTERVIEWS',
  'POLICY TERMS AND CONDITIONS'
];

function Home() {
  const [activeTab, setActiveTab] = useState('generate'); // 'generate' | 'training' | 'letterhead' | 'collaboration'
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
  const [requiredDocsList, setRequiredDocsList] = useState([]);

  const [headlines, setHeadlines] = useState(
    Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      value: '',
      subpoints: [],
    }))
  );

  const [interviewFields, setInterviewFields] = useState([
    { id: 1, name: '', conversation: '' }
  ]);

  // File states
  const [fieldReport, setFieldReport] = useState(null);
  const [policyDocument, setPolicyDocument] = useState(null);
  const [endorsement, setEndorsement] = useState(null);
  const [additionalDocs, setAdditionalDocs] = useState([]);
  const [supportingDocs, setSupportingDocs] = useState([]);
  const [photos, setPhotos] = useState([]);

  const [excludePhotosFromAI, setExcludePhotosFromAI] = useState(false);
  const [customScrutinyPrompt, setCustomScrutinyPrompt] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedReport, setGeneratedReport] = useState(null);

  // Training/Reference Reports State
  const [trainingReports, setTrainingReports] = useState([]);
  const [uploadingTraining, setUploadingTraining] = useState(false);
  const [trainingFiles, setTrainingFiles] = useState([]);
  const [trainingMetadata, setTrainingMetadata] = useState({
    reportType: 'scrutiny',
    classOfBusiness: '',
    description: '',
    author: '',
    yearWritten: new Date().getFullYear(),
  });
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [loadedTrainingReports, setLoadedTrainingReports] = useState([]);
  const [useTraining, setUseTraining] = useState(true);

  useEffect(() => {
    if (classOfBusiness) {
      setRequiredDocsList(REQUIRED_DOCUMENTS[classOfBusiness] || []);
    } else {
      setRequiredDocsList([]);
    }
  }, [classOfBusiness]);

  // Load training reports on component mount
  useEffect(() => {
    fetchTrainingReports();
  }, []);

  const fetchTrainingReports = async () => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${API_URL}/api/files/training-reports`);
      const data = await response.json();
      if (data.success) {
        setLoadedTrainingReports(data.reports || []);
      }
    } catch (err) {
      console.error('Error fetching training reports:', err);
    }
  };

  // Headline helpers
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

  // Interview field helpers
  const addInterviewField = () => {
    const newId = Math.max(...interviewFields.map(f => f.id), 0) + 1;
    setInterviewFields([...interviewFields, { id: newId, name: '', conversation: '' }]);
  };

  const removeInterviewField = (id) => {
    setInterviewFields(interviewFields.filter(f => f.id !== id));
  };

  const updateInterviewField = (id, field, value) => {
    setInterviewFields(interviewFields.map(f => 
      f.id === id ? { ...f, [field]: value } : f
    ));
  };

  const hasInterviewsSelected = headlines.some(h => 
    h.value.toUpperCase().includes('INTERVIEW')
  );

  // File helpers
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

  // Training report upload
  const handleTrainingFilesChange = (e) => {
    if (e.target.files) {
      setTrainingFiles(Array.from(e.target.files));
    }
  };

  const uploadTrainingReports = async () => {
    if (trainingFiles.length === 0) {
      setError('Please select at least one training report to upload');
      return;
    }

    if (!trainingMetadata.reportType || !trainingMetadata.classOfBusiness) {
      setError('Please fill in report type and class of business for training reports');
      return;
    }

    setUploadingTraining(true);
    setError(null);

    try {
      const formData = new FormData();
      trainingFiles.forEach(file => formData.append('trainingReports', file));
      formData.append('metadata', JSON.stringify(trainingMetadata));

      const API_URL = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${API_URL}/api/files/upload-training`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Upload failed');

      alert(`Successfully uploaded ${trainingFiles.length} training report(s)!`);
      setTrainingFiles([]);
      setTrainingMetadata({
        reportType: 'scrutiny',
        classOfBusiness: '',
        description: '',
        author: '',
        yearWritten: new Date().getFullYear(),
      });
      fetchTrainingReports(); // Reload training reports
    } catch (err) {
      setError(err.message || 'Error uploading training reports');
    } finally {
      setUploadingTraining(false);
    }
  };

  const deleteTrainingReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this training report?')) {
      return;
    }

    try {
      const API_URL = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${API_URL}/api/files/training-reports/${reportId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Delete failed');

      alert('Training report deleted successfully!');
      fetchTrainingReports();
    } catch (err) {
      setError(err.message || 'Error deleting training report');
    }
  };

  // Report generation
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

    // Add training preference
    formData.append('useTraining', useTraining);

    if (selectedMode === 'scrutiny' && customScrutinyPrompt.trim()) {
      formData.append('customScrutinyPrompt', customScrutinyPrompt.trim());
    }

    if (hasInterviewsSelected) {
      formData.append('interviews', JSON.stringify(interviewFields.filter(f => 
        f.name.trim() || f.conversation.trim()
      )));
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

    if (policyDocument) {
      formData.append('policyDocument', policyDocument);
    }
    
    if (endorsement) {
      formData.append('endorsement', endorsement);
    }

    [...additionalDocs, ...supportingDocs].forEach(file => 
      formData.append('additionalDocs', file)
    );

    photos.forEach(photo => formData.append('photos', photo));

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

  // Download handlers
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
            policyNumber,
            insuredName,
            dateOfLoss,
            locationOfLoss,
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

  // Filter training reports by current selection
  const relevantTrainingReports = loadedTrainingReports.filter(report => {
    if (!classOfBusiness) return false;
    const reportType = selectedMode === 'preliminary' ? 'interim' : selectedMode;
    return report.classOfBusiness === classOfBusiness && 
           (!reportType || report.reportType === reportType);
  });

  return (
    <Container className="py-4">
      <h1 className="mb-4 text-center">Topclass Adjusters Claims Processing</h1>

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
        {/* GENERATE REPORT TAB */}
        <Tab eventKey="generate" title="Generate Report">
          <Card className="mb-4">
            <Card.Body>
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

              {requiredDocsList.length > 0 && (
                <Alert variant="info" className="mb-4">
                  <strong>Suggested Documents for {classOfBusiness}:</strong>
                  <ul className="mb-0 mt-2">
                    {requiredDocsList.map((doc, idx) => (
                      <li key={idx}>{doc}</li>
                    ))}
                  </ul>
                  <small className="text-muted d-block mt-2">
                    Note: These are recommended but not mandatory
                  </small>
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

              {/* Training Reports Info */}
              {relevantTrainingReports.length > 0 && (
                <Alert variant="success" className="mb-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>📚 Training Available:</strong> {relevantTrainingReports.length} reference report(s) found for {classOfBusiness} {selectedMode ? `(${selectedMode})` : ''}
                    </div>
                    <Form.Check
                      type="switch"
                      id="use-training"
                      label="Use Training"
                      checked={useTraining}
                      onChange={e => setUseTraining(e.target.checked)}
                    />
                  </div>
                  <Button 
                    variant="link" 
                    size="sm" 
                    onClick={() => setShowTrainingModal(true)}
                    className="p-0 mt-2"
                  >
                    View Training Reports
                  </Button>
                </Alert>
              )}

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
                            placeholder="Enter any specific analysis tasks..."
                          />
                          <Form.Text className="text-muted">
                            This prompt will be used in addition to the standard scrutiny analysis.
                          </Form.Text>
                        </Form.Group>
                      </Card.Body>
                    </Card>
                  </>
                )}

                <Form.Group className="mb-4">
                  <Form.Label>Upload Field Report (required)</Form.Label>
                  <Form.Control
                    type="file"
                    accept=".docx,.pdf,.txt"
                    onChange={handleFileChange(setFieldReport)}
                  />
                  {fieldReport && <small className="text-success d-block mt-1">✓ {fieldReport.name}</small>}
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>
                    Upload Policy Document {selectedMode === 'final' ? '(required)' : '(optional)'}
                  </Form.Label>
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

                {selectedMode === 'final' && (
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
                )}

                <h5 className="mb-3">
                  {selectedMode === 'scrutiny' ? 'Key Focus Areas for Scrutiny' : 'Report Arrangement'}
                </h5>

                {headlines.map(headline => (
                  <Card key={headline.id} className="mb-3">
                    <Card.Body>
                      <div className="d-flex gap-2 mb-2">
                        <Form.Select
                          value={headline.value}
                          onChange={e => updateHeadline(headline.id, e.target.value)}
                          className="me-2"
                        >
                          <option value="">-- Select or type custom --</option>
                          {DEFAULT_FOCUS_AREAS.map(area => (
                            <option key={area} value={area}>{area}</option>
                          ))}
                        </Form.Select>
                        <Form.Control
                          placeholder={`Or type custom headline ${headline.id}`}
                          value={!DEFAULT_FOCUS_AREAS.includes(headline.value) ? headline.value : ''}
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

                {hasInterviewsSelected && (
                  <Card className="mb-4 border-info">
                    <Card.Body>
                      <h5 className="mb-3">Interview Details</h5>
                      {interviewFields.map(field => (
                        <Card key={field.id} className="mb-3">
                          <Card.Body>
                            <Row>
                              <Col md={4}>
                                <Form.Group className="mb-2">
                                  <Form.Label>Name of Person Interviewed</Form.Label>
                                  <Form.Control
                                    placeholder="e.g. John Doe, Operations Manager"
                                    value={field.name}
                                    onChange={e => updateInterviewField(field.id, 'name', e.target.value)}
                                  />
                                </Form.Group>
                              </Col>
                              <Col md={8}>
                                <Form.Group className="mb-2">
                                  <Form.Label>Conversation Summary</Form.Label>
                                  <Form.Control
                                    as="textarea"
                                    rows={2}
                                    placeholder="Key points from the interview..."
                                    value={field.conversation}
                                    onChange={e => updateInterviewField(field.id, 'conversation', e.target.value)}
                                  />
                                </Form.Group>
                              </Col>
                            </Row>
                            {interviewFields.length > 1 && (
                              <Button 
                                variant="outline-danger" 
                                size="sm" 
                                onClick={() => removeInterviewField(field.id)}
                              >
                                Remove Interview
                              </Button>
                            )}
                          </Card.Body>
                        </Card>
                      ))}
                      <Button variant="outline-primary" size="sm" onClick={addInterviewField}>
                        + Add Another Interview
                      </Button>
                    </Card.Body>
                  </Card>
                )}

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

                <pre 
                  className="bg-light p-3 rounded" 
                  style={{ 
                    maxHeight: '500px', 
                    overflow: 'auto',
                    fontFamily: 'Times New Roman, serif',
                    fontSize: '12pt',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {generatedReport}
                </pre>
              </Card.Body>
            </Card>
          )}
        </Tab>

        {/* TRAINING TAB */}
        <Tab eventKey="training" title={<span>📚 Training Reports <Badge bg="warning">New</Badge></span>}>
          <Card className="mb-4">
            <Card.Body>
              <h3 className="mb-3">Upload Reference Reports for AI Training</h3>
              <Alert variant="info">
                <strong>How it works:</strong> Upload your existing high-quality reports as training examples. 
                The AI will learn from the writing style, structure, terminology, and approach used in these reports.
                When generating new reports, the AI will mimic the style and format of your uploaded examples.
              </Alert>

              <Card className="mb-4 border-primary">
                <Card.Body>
                  <h5>Upload New Training Reports</h5>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Select Report Files</Form.Label>
                    <Form.Control
                      type="file"
                      multiple
                      accept=".docx,.pdf,.txt"
                      onChange={handleTrainingFilesChange}
                    />
                    {trainingFiles.length > 0 && (
                      <div className="mt-2">
                        <strong>Selected Files:</strong>
                        {trainingFiles.map((file, idx) => (
                          <Badge key={idx} bg="secondary" className="me-2 mb-1 d-block">
                            {file.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Form.Group>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Report Type</Form.Label>
                        <Form.Select
                          value={trainingMetadata.reportType}
                          onChange={e => setTrainingMetadata({...trainingMetadata, reportType: e.target.value})}
                        >
                          <option value="scrutiny">Scrutiny</option>
                          <option value="interim">Preliminary/Interim</option>
                          <option value="final">Final</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Class of Business</Form.Label>
                        <Form.Select
                          value={trainingMetadata.classOfBusiness}
                          onChange={e => setTrainingMetadata({...trainingMetadata, classOfBusiness: e.target.value})}
                        >
                          <option value="">-- Select Class --</option>
                          {CLASSES_OF_BUSINESS.map(cls => (
                            <option key={cls} value={cls}>{cls}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Author/Adjuster Name (Optional)</Form.Label>
                        <Form.Control
                          value={trainingMetadata.author}
                          onChange={e => setTrainingMetadata({...trainingMetadata, author: e.target.value})}
                          placeholder="e.g., John Smith"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Year Written (Optional)</Form.Label>
                        <Form.Control
                          type="number"
                          value={trainingMetadata.yearWritten}
                          onChange={e => setTrainingMetadata({...trainingMetadata, yearWritten: parseInt(e.target.value)})}
                          min="2000"
                          max={new Date().getFullYear()}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>Description (Optional)</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={trainingMetadata.description}
                      onChange={e => setTrainingMetadata({...trainingMetadata, description: e.target.value})}
                      placeholder="Brief description of this report (e.g., Warehouse fire claim with detailed damage assessment)"
                    />
                  </Form.Group>

                  <Button
                    variant="primary"
                    onClick={uploadTrainingReports}
                    disabled={uploadingTraining || trainingFiles.length === 0}
                  >
                    {uploadingTraining ? 'Uploading...' : 'Upload Training Reports'}
                  </Button>
                </Card.Body>
              </Card>

              <h5 className="mb-3">Uploaded Training Reports ({loadedTrainingReports.length})</h5>
              
              {loadedTrainingReports.length === 0 ? (
                <Alert variant="warning">
                  No training reports uploaded yet. Upload some reference reports to train the AI.
                </Alert>
              ) : (
                <ListGroup>
                  {loadedTrainingReports.map(report => (
                    <ListGroup.Item key={report.id}>
                      <Row className="align-items-center">
                        <Col md={8}>
                          <div>
                            <strong>{report.filename}</strong>
                            <br />
                            <Badge bg="info" className="me-2">{report.reportType}</Badge>
                            <Badge bg="secondary" className="me-2">{report.classOfBusiness}</Badge>
                            {report.author && <small className="text-muted">by {report.author}</small>}
                          </div>
                          {report.description && (
                            <small className="text-muted d-block mt-1">{report.description}</small>
                          )}
                          <small className="text-muted">
                            Uploaded: {new Date(report.uploadedAt).toLocaleDateString()}
                            {report.yearWritten && ` | Written: ${report.yearWritten}`}
                          </small>
                        </Col>
                        <Col md={4} className="text-end">
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => deleteTrainingReport(report.id)}
                          >
                            Delete
                          </Button>
                        </Col>
                      </Row>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}

              <Alert variant="success" className="mt-4">
                <strong>💡 Tips for Best Results:</strong>
                <ul className="mb-0 mt-2">
                  <li>Upload multiple examples of each report type for better learning</li>
                  <li>Use your best, most professional reports as training examples</li>
                  <li>Include reports from different scenarios within the same class of business</li>
                  <li>The more diverse examples you provide, the better the AI adapts to different situations</li>
                  <li>Reports should be in DOCX, PDF, or TXT format</li>
                </ul>
              </Alert>
            </Card.Body>
          </Card>
        </Tab>

        {/* LETTERHEAD REWRITE TAB */}
        <Tab eventKey="letterhead" title={<span>📄 Letterhead Rewrite</span>}>
          <LetterheadRewriteTab />
        </Tab>

        {/* COLLABORATION TAB */}
        <Tab eventKey="collaboration" title={<span>🤝 AI Collaboration</span>}>
          <CollaborationTab />
        </Tab>
      </Tabs>

      {/* Training Reports Modal */}
      <Modal show={showTrainingModal} onHide={() => setShowTrainingModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Reference Reports for Current Selection</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {relevantTrainingReports.length === 0 ? (
            <Alert variant="info">No training reports found for this combination.</Alert>
          ) : (
            <ListGroup>
              {relevantTrainingReports.map(report => (
                <ListGroup.Item key={report.id}>
                  <strong>{report.filename}</strong>
                  <br />
                  <Badge bg="info" className="me-2">{report.reportType}</Badge>
                  <Badge bg="secondary">{report.classOfBusiness}</Badge>
                  {report.description && (
                    <p className="mb-1 mt-2"><small>{report.description}</small></p>
                  )}
                  <small className="text-muted">
                    {report.author && `Author: ${report.author} | `}
                    Uploaded: {new Date(report.uploadedAt).toLocaleDateString()}
                  </small>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTrainingModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default Home;
