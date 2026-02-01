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
import { 
  Sparkles, 
  Upload, 
  Download, 
  Brain, 
  FileText, 
  Image as ImageIcon,
  X,
  ChevronRight,
  Zap,
  Shield,
  CheckCircle,
  TrendingUp
} from 'lucide-react';

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
  { 
    value: 'claude', 
    label: 'Claude', 
    description: 'Deep analysis pro',
    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    icon: '🧠'
  },
  { 
    value: 'chatgpt', 
    label: 'ChatGPT', 
    description: 'Creative genius',
    color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    icon: '✨'
  },
  { 
    value: 'grok', 
    label: 'Grok', 
    description: 'Real-time insights',
    color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    icon: '🚀'
  },
  { 
    value: 'gemini', 
    label: 'Gemini', 
    description: 'Multimodal master',
    color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    icon: '🔮'
  },
];

function Home() {
  const [selectedMode, setSelectedMode] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('claude');

  const [claimNumber, setClaimNumber] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [insuredName, setInsuredName] = useState('');
  const [dateOfLoss, setDateOfLoss] = useState('');
  const [locationOfLoss, setLocationOfLoss] = useState('');
  const [lossDescription, setLossDescription] = useState('');
  const [classOfBusiness, setClassOfBusiness] = useState('');

  const [headlines, setHeadlines] = useState(
    Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      value: '',
      subpoints: [],
    }))
  );

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

  const ModeCard = ({ title, description, mode, icon: Icon }) => (
    <Card 
      className={`mode-card ${selectedMode === mode ? 'active' : ''}`}
      onClick={() => setSelectedMode(mode)}
    >
      <Card.Body className="text-center p-4">
        <div className="mode-icon mb-3">
          <Icon size={32} />
        </div>
        <h5 className="mb-2">{title}</h5>
        <p className="text-muted small mb-0">{description}</p>
        {selectedMode === mode && (
          <div className="selected-indicator">
            <CheckCircle size={20} />
          </div>
        )}
      </Card.Body>
    </Card>
  );

  return (
    <Container className="py-4" style={{ 
      background: 'linear-gradient(135deg, #f0f8ff 0%, #e6f0ff 50%, #d9e8ff 100%)',
      minHeight: '100vh'
    }}>
      <div className="text-center mb-5">
        <div className="d-flex align-items-center justify-content-center gap-3 mb-3">
          <div className="logo-icon">
            <Shield size={40} />
          </div>
          <h1 className="display-5 fw-bold gradient-text m-0">
            Topclass Adjusters
          </h1>
        </div>
        <p className="lead text-muted">
          AI-Powered Claims Processing • Lightning Fast • Expert-Level Analysis
        </p>
      </div>

      <Card className="mb-4 glass-card">
        <Card.Body className="p-4">
          <div className="d-flex align-items-center gap-2 mb-4">
            <Brain size={24} />
            <h3 className="mb-0">Setup Your Claim</h3>
          </div>

          <Form.Group className="mb-4">
            <Form.Label className="fw-bold d-flex align-items-center gap-2">
              <TrendingUp size={20} />
              Class of Business
            </Form.Label>
            <Form.Select 
              value={classOfBusiness} 
              onChange={e => setClassOfBusiness(e.target.value)}
              className="modern-select"
            >
              <option value="">🎯 Choose your specialty...</option>
              {CLASSES_OF_BUSINESS.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="fw-bold">Pick Your Task</Form.Label>
            <Row className="g-3">
              <Col md={4}>
                <ModeCard 
                  title="Field Report Scrutiny"
                  description="Deep analysis & gap identification"
                  mode="scrutiny"
                  icon={FileText}
                />
              </Col>
              <Col md={4}>
                <ModeCard 
                  title="Preliminary Report"
                  description="Initial assessment & findings"
                  mode="preliminary"
                  icon={Sparkles}
                />
              </Col>
              <Col md={4}>
                <ModeCard 
                  title="Final Report"
                  description="Complete adjustment report"
                  mode="final"
                  icon={CheckCircle}
                />
              </Col>
            </Row>
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label className="fw-bold d-flex align-items-center gap-2">
              <Zap size={20} />
              Choose Your AI Assistant
              <Badge bg="info" className="ms-2">Powered by AI</Badge>
            </Form.Label>
            <Row className="g-3">
              {AI_AGENTS.map(agent => (
                <Col md={6} lg={3} key={agent.value}>
                  <Card 
                    className={`ai-agent-card ${selectedAgent === agent.value ? 'selected' : ''}`}
                    onClick={() => setSelectedAgent(agent.value)}
                    style={{ 
                      background: selectedAgent === agent.value ? agent.color : 'white',
                      border: selectedAgent === agent.value ? 'none' : '1px solid #dee2e6',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <Card.Body className="text-center p-3">
                      <div className="agent-icon mb-2 fs-2">
                        {agent.icon}
                      </div>
                      <h6 className="mb-1" style={{ 
                        color: selectedAgent === agent.value ? 'white' : 'inherit'
                      }}>
                        {agent.label}
                      </h6>
                      <small style={{ 
                        color: selectedAgent === agent.value ? 'rgba(255,255,255,0.9)' : '#6c757d'
                      }}>
                        {agent.description}
                      </small>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </Form.Group>

          {selectedMode && (
            <>
              <div className="section-divider">
                <span>Claim Details</span>
              </div>

              <Row className="g-3 mb-4">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Claim Number</Form.Label>
                    <Form.Control 
                      value={claimNumber} 
                      onChange={e => setClaimNumber(e.target.value)} 
                      placeholder="CLM-2024-00123" 
                      className="modern-input"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Policy Number</Form.Label>
                    <Form.Control 
                      value={policyNumber} 
                      onChange={e => setPolicyNumber(e.target.value)} 
                      placeholder="POL-789456"
                      className="modern-input"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-4">
                <Form.Label>Insured Name</Form.Label>
                <Form.Control 
                  value={insuredName} 
                  onChange={e => setInsuredName(e.target.value)} 
                  placeholder="Enter insured name"
                  className="modern-input"
                />
              </Form.Group>

              <Row className="g-3 mb-4">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>📅 Date of Loss</Form.Label>
                    <Form.Control 
                      type="date" 
                      value={dateOfLoss} 
                      onChange={e => setDateOfLoss(e.target.value)}
                      className="modern-input"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>📍 Location of Loss</Form.Label>
                    <Form.Control 
                      value={locationOfLoss} 
                      onChange={e => setLocationOfLoss(e.target.value)} 
                      placeholder="City, Address" 
                      className="modern-input"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-4">
                <Form.Label>📝 Loss Description</Form.Label>
                <Form.Control 
                  as="textarea" 
                  rows={3} 
                  value={lossDescription} 
                  onChange={e => setLossDescription(e.target.value)} 
                  placeholder="What happened? Tell us the story..."
                  className="modern-input"
                />
              </Form.Group>
            </>
          )}
        </Card.Body>
      </Card>

      {selectedMode && (
        <Card className="mb-4 glass-card">
          <Card.Body className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
              <div className="d-flex align-items-center gap-3">
                <div className="task-badge">
                  {selectedMode === 'scrutiny' && <FileText size={24} />}
                  {selectedMode === 'preliminary' && <Sparkles size={24} />}
                  {selectedMode === 'final' && <CheckCircle size={24} />}
                </div>
                <div>
                  <h3 className="mb-0">
                    {selectedMode === 'scrutiny'
                      ? '🔍 Field Report Scrutiny'
                      : `${selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)} Report`}
                  </h3>
                  <small className="text-muted">
                    Powered by {AI_AGENTS.find(a => a.value === selectedAgent)?.label}
                  </small>
                </div>
              </div>
              <Badge bg="primary" className="fs-6 px-3 py-2">
                {selectedMode === 'scrutiny' ? 'Analysis Mode' : 'Report Mode'}
              </Badge>
            </div>

            {selectedMode === 'scrutiny' && (
              <Alert variant="info" className="modern-alert">
                <div className="d-flex align-items-start gap-3">
                  <Brain size={24} />
                  <div>
                    <strong>AI Expert Mode Activated</strong>
                    <p className="mb-0">Your AI adjuster will analyze every detail, spot inconsistencies, 
                    suggest evidence needs, and provide expert recommendations.</p>
                  </div>
                </div>
              </Alert>
            )}

            <div className="upload-section mb-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <Upload size={20} />
                <h5 className="mb-0">Upload Documents</h5>
              </div>
              
              <Form.Group className="mb-4">
                <Form.Label className="fw-bold">
                  📄 Field Report <span className="text-danger">*</span>
                </Form.Label>
                <div className="file-upload-area">
                  <Form.Control
                    type="file"
                    accept=".docx,.pdf,.txt"
                    onChange={handleFileChange(setFieldReport)}
                    className="d-none"
                    id="fieldReport"
                  />
                  <label htmlFor="fieldReport" className="upload-label">
                    <Upload size={20} />
                    <span>{fieldReport ? `✓ ${fieldReport.name}` : 'Drop your field report here'}</span>
                  </label>
                </div>
              </Form.Group>

              {selectedMode === 'final' && (
                <>
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-bold">
                      📑 Policy Document <span className="text-danger">*</span>
                    </Form.Label>
                    <div className="file-upload-area">
                      <Form.Control
                        type="file"
                        accept=".docx,.pdf,.txt"
                        onChange={handleFileChange(setPolicyDocument)}
                        className="d-none"
                        id="policyDocument"
                      />
                      <label htmlFor="policyDocument" className="upload-label">
                        <Upload size={20} />
                        <span>{policyDocument ? `✓ ${policyDocument.name}` : 'Upload policy document'}</span>
                      </label>
                    </div>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-bold">📎 Endorsement (Optional)</Form.Label>
                    <div className="file-upload-area">
                      <Form.Control
                        type="file"
                        accept=".docx,.pdf,.txt"
                        onChange={handleFileChange(setEndorsement)}
                        className="d-none"
                        id="endorsement"
                      />
                      <label htmlFor="endorsement" className="upload-label">
                        <Upload size={20} />
                        <span>{endorsement ? `✓ ${endorsement.name}` : 'Add endorsement if available'}</span>
                      </label>
                    </div>
                  </Form.Group>
                </>
              )}

              {(selectedMode === 'preliminary' || selectedMode === 'scrutiny' || selectedMode === 'final') && (
                <Form.Group className="mb-4">
                  <Form.Label className="fw-bold">📂 Additional Documents</Form.Label>
                  <div className="file-upload-area">
                    <Form.Control
                      type="file"
                      multiple
                      accept=".docx,.pdf,.txt,.xls,.xlsx"
                      onChange={handleMultipleFiles(setAdditionalDocs)}
                      className="d-none"
                      id="additionalDocs"
                    />
                    <label htmlFor="additionalDocs" className="upload-label">
                      <Upload size={20} />
                      <span>Click to add multiple files</span>
                    </label>
                  </div>
                  {additionalDocs.length > 0 && (
                    <div className="file-list mt-3">
                      {additionalDocs.map((file, idx) => (
                        <div key={idx} className="file-item">
                          <FileText size={16} />
                          <span className="file-name">{file.name}</span>
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="p-0 ms-2"
                            onClick={removeFileFromList(setAdditionalDocs, idx)}
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Form.Group>
              )}
            </div>

            <div className="structure-section mb-4">
              <h5 className="fw-bold mb-3">
                {selectedMode === 'scrutiny' ? '🎯 Key Focus Areas' : '📋 Report Structure'}
              </h5>

              {headlines.map(headline => (
                <div key={headline.id} className="headline-item mb-3">
                  <div className="d-flex gap-2 align-items-center mb-2">
                    <div className="headline-number">{headline.id}.</div>
                    <Form.Control
                      placeholder={`Enter headline ${headline.id}...`}
                      value={headline.value}
                      onChange={e => updateHeadline(headline.id, e.target.value)}
                      className="headline-input"
                    />
                    <Button 
                      variant="outline-danger" 
                      size="sm"
                      onClick={() => removeHeadline(headline.id)}
                      className="px-2"
                    >
                      <X size={16} />
                    </Button>
                  </div>

                  {headline.subpoints.map(sub => (
                    <div key={sub.id} className="d-flex gap-2 ms-5 mb-2">
                      <div className="subpoint-number">{headline.id}.{sub.id}</div>
                      <Form.Control
                        size="sm"
                        placeholder={`Subpoint detail...`}
                        value={sub.value}
                        onChange={e => updateSubpoint(headline.id, sub.id, e.target.value)}
                        className="subpoint-input"
                      />
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={() => removeSubpoint(headline.id, sub.id)}
                        className="px-2"
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ))}

                  <Button 
                    variant="outline-primary" 
                    size="sm" 
                    className="ms-5 mt-1"
                    onClick={() => addSubpoint(headline.id)}
                  >
                    + Add Subpoint
                  </Button>
                </div>
              ))}

              <Button 
                variant="outline-primary" 
                onClick={addHeadline}
                className="w-100 mt-3"
              >
                + Add New Headline
              </Button>
            </div>

            <div className="photos-section mb-4">
              <div className="d-flex align-items-center gap-2 mb-3">
                <ImageIcon size={20} />
                <h5 className="mb-0">📸 Evidence Photos</h5>
              </div>

              <Form.Group className="mb-3">
                <Form.Check
                  type="switch"
                  id="excludePhotos"
                  label="Exclude photos from AI analysis"
                  checked={excludePhotosFromAI}
                  onChange={e => setExcludePhotosFromAI(e.target.checked)}
                  className="modern-switch"
                />
              </Form.Group>

              <div className="file-upload-area">
                <Form.Control
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleMultipleFiles(setPhotos)}
                  disabled={excludePhotosFromAI}
                  className="d-none"
                  id="photos"
                />
                <label 
                  htmlFor="photos" 
                  className={`upload-label ${excludePhotosFromAI ? 'disabled' : ''}`}
                >
                  <ImageIcon size={20} />
                  <span>Drag & drop or click to upload photos</span>
                </label>
              </div>

              {photos.length > 0 && (
                <Row className="mt-3 g-2">
                  {photos.map((photo, idx) => (
                    <Col key={idx} xs={6} md={4} lg={3}>
                      <div className="photo-preview">
                        <img 
                          src={URL.createObjectURL(photo)} 
                          alt={`Evidence ${idx + 1}`}
                          className="photo-img"
                        />
                        <Button 
                          variant="danger" 
                          size="sm"
                          className="photo-remove"
                          onClick={removePhoto(idx)}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    </Col>
                  ))}
                </Row>
              )}
            </div>

            <div className="text-center mt-5">
              <Button
                variant="primary"
                size="lg"
                onClick={handleGenerate}
                disabled={loading}
                className="generate-btn px-5 py-3"
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Processing with {AI_AGENTS.find(a => a.value === selectedAgent)?.label}...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} className="me-2" />
                    Generate {selectedMode === 'scrutiny' ? 'Analysis' : 'Report'}
                    <ChevronRight size={20} className="ms-2" />
                  </>
                )}
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="modern-alert">
          <div className="d-flex align-items-center gap-2">
            <X size={20} />
            <strong>Oops!</strong>
          </div>
          <p className="mb-0 mt-2">{error}</p>
        </Alert>
      )}

      {generatedReport && (
        <Card className="glass-card">
          <Card.Body className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
              <div>
                <h4 className="mb-1">🎉 Report Generated!</h4>
                <small className="text-muted">Ready to download and share</small>
              </div>
              <div className="d-flex gap-2">
                <Button 
                  variant="outline-primary" 
                  onClick={downloadReportAsTxt}
                  className="d-flex align-items-center gap-2"
                >
                  <Download size={16} />
                  TXT
                </Button>
                <Button 
                  variant="success" 
                  onClick={downloadReportAsDocx}
                  className="d-flex align-items-center gap-2"
                >
                  <Download size={16} />
                  DOCX
                </Button>
              </div>
            </div>

            <div className="report-preview">
              <pre className="bg-light p-4 rounded" style={{ 
                maxHeight: '500px', 
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: '14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0'
              }}>
                {generatedReport}
              </pre>
            </div>
          </Card.Body>
        </Card>
      )}

      <style jsx>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(31, 38, 135, 0.1);
        }
        
        .gradient-text {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .mode-card {
          cursor: pointer;
          transition: all 0.3s ease;
          border-radius: 15px;
          border: 2px solid transparent;
        }
        
        .mode-card:hover {
          transform: translateY(-5px);
          border-color: #4facfe;
        }
        
        .mode-card.active {
          border-color: #667eea;
          background: linear-gradient(135deg, #667eea10 0%, #764ba210 100%);
        }
        
        .mode-icon {
          color: #667eea;
        }
        
        .selected-indicator {
          position: absolute;
          top: 10px;
          right: 10px;
          color: #667eea;
        }
        
        .ai-agent-card {
          cursor: pointer;
          transition: all 0.3s ease;
          border-radius: 15px;
          overflow: hidden;
        }
        
        .ai-agent-card:hover {
          transform: scale(1.05);
        }
        
        .ai-agent-card.selected {
          color: white !important;
        }
        
        .section-divider {
          display: flex;
          align-items: center;
          margin: 30px 0;
          color: #6c757d;
          font-weight: 600;
        }
        
        .section-divider::before,
        .section-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, #dee2e6, transparent);
        }
        
        .section-divider span {
          padding: 0 20px;
        }
        
        .modern-input {
          border-radius: 10px;
          border: 2px solid #e2e8f0;
          padding: 12px;
          transition: all 0.3s ease;
        }
        
        .modern-input:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .file-upload-area {
          border: 2px dashed #cbd5e0;
          border-radius: 15px;
          padding: 40px 20px;
          text-align: center;
          transition: all 0.3s ease;
          background: #f8fafc;
        }
        
        .file-upload-area:hover {
          border-color: #667eea;
          background: #edf2f7;
        }
        
        .upload-label {
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: #4a5568;
        }
        
        .file-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .file-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: #f1f5f9;
          border-radius: 8px;
        }
        
        .headline-item {
          padding: 15px;
          background: #f8fafc;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }
        
        .headline-number, .subpoint-number {
          font-weight: bold;
          color: #667eea;
          min-width: 30px;
        }
        
        .headline-input, .subpoint-input {
          flex: 1;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        
        .photo-preview {
          position: relative;
          border-radius: 10px;
          overflow: hidden;
        }
        
        .photo-img {
          width: 100%;
          height: 150px;
          object-fit: cover;
          border-radius: 10px;
        }
        
        .photo-remove {
          position: absolute;
          top: 5px;
          right: 5px;
          padding: 2px 6px;
          border-radius: 50%;
        }
        
        .generate-btn {
          border-radius: 50px;
          font-weight: 600;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          transition: all 0.3s ease;
        }
        
        .generate-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }
        
        .modern-alert {
          border-radius: 15px;
          border: none;
          background: linear-gradient(135deg, #667eea10 0%, #764ba210 100%);
        }
        
        .modern-switch .form-check-input:checked {
          background-color: #667eea;
          border-color: #667eea;
        }
      `}</style>
    </Container>
  );
}

export default Home;