import React, { useState } from 'react';
import {
  Container,
  Button,
  Alert,
  Form,
  Card,
  Row,
  Col,
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

function Home() {
  const [selectedMode, setSelectedMode] = useState(''); // 'scrutiny' | 'preliminary' | 'final'

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

  // Headline helpers (unchanged)
  const addHeadline = () => { /* ... same as before */ };
  const removeHeadline = (id) => { /* ... */ };
  const updateHeadline = (id, value) => { /* ... */ };
  const addSubpoint = (mainId) => { /* ... */ };
  const updateSubpoint = (mainId, subId, value) => { /* ... */ };
  const removeSubpoint = (mainId, subId) => { /* ... */ };

  // File helpers (unchanged)
  const handleFileChange = (setter) => (e) => { /* ... */ };
  const handleMultipleFiles = (setter) => (e) => { /* ... */ };
  const removeFileFromList = (setter, index) => () => { /* ... */ };
  const removePhoto = (index) => () => { /* ... */ };

  const handleGenerate = async () => {
    if (!selectedMode) return setError('Please select a mode');
    if (!classOfBusiness) return setError('Please select Class of Business');
    if (!fieldReport) return setError('Please upload the Field Report');

    if (selectedMode === 'final' && !policyDocument) {
      return setError('Please upload the Policy Document for Final Report');
    }

    const formData = new FormData();

    // Mode mapping
    let reportTypeForApi = '';
    if (selectedMode === 'preliminary') reportTypeForApi = 'interim';
    else if (selectedMode === 'final') reportTypeForApi = 'final';
    else if (selectedMode === 'scrutiny') reportTypeForApi = 'scrutiny';

    formData.append('reportType', reportTypeForApi);
    formData.append('classOfBusiness', classOfBusiness);

    // Claim metadata
    formData.append('claimNumber', claimNumber);
    formData.append('policyNumber', policyNumber);
    formData.append('insuredName', insuredName);
    formData.append('dateOfLoss', dateOfLoss);
    formData.append('locationOfLoss', locationOfLoss);
    formData.append('lossDescription', lossDescription);

    // Structured headlines / focus areas
    const structuredHeadlines = headlines
      .filter((h) => h.value.trim() || h.subpoints.some((s) => s.value.trim()))
      .map((h) => ({
        main: h.value.trim(),
        number: `${h.id}.0`,
        subpoints: h.subpoints
          .filter((s) => s.value.trim())
          .map((s, idx) => ({
            title: s.value.trim(),
            number: `\( {h.id}. \){idx + 1}`,
          })),
      }));

    formData.append('headlines', JSON.stringify(structuredHeadlines));
    formData.append('excludePhotosFromAI', excludePhotosFromAI);

    // Files
    formData.append('questionnaire', fieldReport); // field report

    if (selectedMode === 'final') {
      formData.append('analyzedFile', policyDocument);
      if (endorsement) formData.append('endorsement', endorsement);
    }

    // Additional / Supporting docs
    [...additionalDocs, ...supportingDocs].forEach((file) =>
      formData.append('additionalDocs', file)
    );

    if (!excludePhotosFromAI) {
      photos.forEach((photo) => formData.append('photos', photo));
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

  const downloadReport = () => { /* unchanged */ };

  return (
    <Container className="py-4">
      <h1 className="mb-4 text-center">Topclass Adjusters Claims Processing</h1>

      <Card className="mb-4">
        <Card.Body>
          <Form.Group className="mb-4">
            <Form.Label>Select Class of Business</Form.Label>
            <Form.Select value={classOfBusiness} onChange={(e) => setClassOfBusiness(e.target.value)}>
              <option value="">-- Choose Class --</option>
              {CLASSES_OF_BUSINESS.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
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

          {/* Basic Claim Info - always shown */}
          {selectedMode && (
            <>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Claim Number</Form.Label>
                    <Form.Control value={claimNumber} onChange={(e) => setClaimNumber(e.target.value)} placeholder="e.g. CLM-2026-00123" />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Policy Number</Form.Label>
                    <Form.Control value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Insured Name</Form.Label>
                <Form.Control value={insuredName} onChange={(e) => setInsuredName(e.target.value)} />
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Date of Loss</Form.Label>
                    <Form.Control type="date" value={dateOfLoss} onChange={(e) => setDateOfLoss(e.target.value)} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Location of Loss</Form.Label>
                    <Form.Control value={locationOfLoss} onChange={(e) => setLocationOfLoss(e.target.value)} placeholder="City, Address" />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-4">
                <Form.Label>Loss Description</Form.Label>
                <Form.Control as="textarea" rows={3} value={lossDescription} onChange={(e) => setLossDescription(e.target.value)} placeholder="Brief summary of the incident..." />
              </Form.Group>
            </>
          )}
        </Card.Body>
      </Card>

      {selectedMode && (
        <Card className="mb-4">
          <Card.Body>
            <h3 className="mb-4">
              {selectedMode === 'scrutiny'
                ? 'Field Report Scrutiny & Analysis'
                : `${selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)} Report`}
            </h3>

            {selectedMode === 'scrutiny' && (
              <Alert variant="info" className="mb-4">
                <strong>AI Expert Mode:</strong> The AI will act as an experienced insurance claims adjuster.
                It will review the field report in detail, ask intelligent probing questions,
                highlight missing details, inconsistencies, or gaps in evidence,
                suggest documents/photographs needed, and provide tailored recommendations
                based on the selected class of business.
              </Alert>
            )}

            {/* Field Report Upload */}
            <Form.Group className="mb-4">
              <Form.Label>Upload Field Report (required)</Form.Label>
              <Form.Control
                type="file"
                accept=".docx,.pdf,.txt"
                onChange={handleFileChange(setFieldReport)}
              />
              {fieldReport && <small className="text-success d-block mt-1">{fieldReport.name}</small>}
            </Form.Group>

            {/* Final Report specific */}
            {selectedMode === 'final' && (
              <>
                <Form.Group className="mb-4">
                  <Form.Label>Upload Policy Document (required)</Form.Label>
                  <Form.Control type="file" accept=".docx,.pdf,.txt" onChange={handleFileChange(setPolicyDocument)} />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Upload Endorsement (optional)</Form.Label>
                  <Form.Control type="file" accept=".docx,.pdf,.txt" onChange={handleFileChange(setEndorsement)} />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Additional Documents</Form.Label>
                  <Form.Control type="file" multiple accept=".docx,.pdf,.txt,.xls,.xlsx" onChange={handleMultipleFiles(setAdditionalDocs)} />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Supporting Documents</Form.Label>
                  <Form.Control type="file" multiple accept=".docx,.pdf,.txt,.xls,.xlsx" onChange={handleMultipleFiles(setSupportingDocs)} />
                </Form.Group>
              </>
            )}

            {/* Preliminary & Scrutiny */}
            {(selectedMode === 'preliminary' || selectedMode === 'scrutiny') && (
              <Form.Group className="mb-4">
                <Form.Label>Additional Documents (optional)</Form.Label>
                <Form.Control type="file" multiple accept=".docx,.pdf,.txt,.xls,.xlsx" onChange={handleMultipleFiles(setAdditionalDocs)} />
              </Form.Group>
            )}

            {/* Headlines / Focus Areas */}
            <h5 className="mb-3">
              {selectedMode === 'scrutiny' ? 'Key Focus Areas for Scrutiny' : 'Report Arrangement'}
            </h5>
            {/* Headline rendering code - same as original, unchanged */}

            {/* Exclude photos checkbox */}
            <Form.Group className="mb-4">
              <Form.Check
                type="checkbox"
                label="Exclude uploaded photos from AI processing"
                checked={excludePhotosFromAI}
                onChange={(e) => setExcludePhotosFromAI(e.target.checked)}
              />
            </Form.Group>

            {/* Photos */}
            <Form.Group className="mb-4">
              <Form.Label>Upload Photos / Evidence</Form.Label>
              <Form.Control
                type="file"
                multiple
                accept="image/*"
                onChange={handleMultipleFiles(setPhotos)}
                disabled={excludePhotosFromAI}
              />
            </Form.Group>

            {photos.length > 0 && (
              /* photo list rendering */
            )}

            <div className="text-center mt-4">
              <Button
                variant="success"
                size="lg"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? 'Processing...' : `Generate \( {selectedMode === 'scrutiny' ? 'Scrutiny Report' : ` \){selectedMode} Report`}`}
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Error & Success handling - unchanged */}
    </Container>
  );
}

export default Home;