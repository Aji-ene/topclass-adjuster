import React, { useState } from 'react';
import {
  Container,
  Row,
  Col,
  Button,
  Alert,
  Form,
  Card,
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
  const [classOfBusiness, setClassOfBusiness] = useState('');
  const [reportType, setReportType] = useState(''); // 'preliminary' or 'final'

  const [headlines, setHeadlines] = useState(
    Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      value: '',
      subpoints: [], // array of { id: unique, value: string }
    }))
  );

  // File states
  const [fieldReport, setFieldReport] = useState(null);
  const [policyDocument, setPolicyDocument] = useState(null);
  const [endorsement, setEndorsement] = useState(null);
  const [additionalDocs, setAdditionalDocs] = useState([]); // array of files
  const [supportingDocs, setSupportingDocs] = useState([]); // array of files
  const [photos, setPhotos] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedReport, setGeneratedReport] = useState(null);

  // Headline functions
  const addHeadline = () => {
    setHeadlines([
      ...headlines,
      {
        id: headlines.length + 1,
        value: '',
        subpoints: [],
      },
    ]);
  };

  const removeHeadline = (id) => {
    setHeadlines(headlines.filter((h) => h.id !== id));
  };

  const updateHeadline = (id, value) => {
    setHeadlines(
      headlines.map((h) => (h.id === id ? { ...h, value } : h))
    );
  };

  const addSubpoint = (mainId) => {
    setHeadlines(
      headlines.map((h) =>
        h.id === mainId
          ? {
              ...h,
              subpoints: [...h.subpoints, { id: Date.now(), value: '' }],
            }
          : h
      )
    );
  };

  const updateSubpoint = (mainId, subId, value) => {
    setHeadlines(
      headlines.map((h) =>
        h.id === mainId
          ? {
              ...h,
              subpoints: h.subpoints.map((s) =>
                s.id === subId ? { ...s, value } : s
              ),
            }
          : h
      )
    );
  };

  const removeSubpoint = (mainId, subId) => {
    setHeadlines(
      headlines.map((h) =>
        h.id === mainId
          ? {
              ...h,
              subpoints: h.subpoints.filter((s) => s.id !== subId),
            }
          : h
      )
    );
  };

  // File handling helpers
  const handleFileChange = (setter) => (e) => {
    const file = e.target.files[0];
    if (file) setter(file);
  };

  const handleMultipleFiles = (setter) => (e) => {
    const files = Array.from(e.target.files);
    setter((prev) => [...prev, ...files]);
  };

  const removeFileFromList = (setter, index) => () => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!classOfBusiness) {
      setError('Please select Class of Business');
      return;
    }
    if (!reportType) {
      setError('Please select Report Type');
      return;
    }
    if (!fieldReport) {
      setError('Please upload the Field Report');
      return;
    }
    if (reportType === 'final' && !policyDocument) {
      setError('Please upload the Policy Document for Final Report');
      return;
    }

    const formData = new FormData();
    formData.append('classOfBusiness', classOfBusiness);
    formData.append(
      'reportType',
      reportType === 'preliminary' ? 'interim' : 'final'
    );

    // Send structured headlines (main + subpoints)
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

    // Files
    formData.append('questionnaire', fieldReport); // reused field name for compatibility
    if (reportType === 'final') {
      formData.append('analyzedFile', policyDocument);
      if (endorsement) formData.append('endorsement', endorsement);
    }

    // Additional / Supporting docs
    [...additionalDocs, ...supportingDocs].forEach((file) =>
      formData.append('additionalDocs', file)
    );

    // Photos
    photos.forEach((photo) => formData.append('photos', photo));

    setLoading(true);
    setError(null);

    try {
      const API_URL = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${API_URL}/api/files/process-files`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to generate report');
      }

      setGeneratedReport(data.report);
    } catch (err) {
      setError(err.message || 'Error generating report');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (generatedReport && generatedReport.filename) {
      const baseUrl = process.env.REACT_APP_API_URL || '';
      const url = `\( {baseUrl}/api/files/download/ \){generatedReport.filename}`;
      window.location.href = url;
    }
  };

  return (
    <Container className="py-4">
      <h1 className="mb-4 text-center">Topclass Adjusters Claims Processing</h1>

      <Card className="mb-4">
        <Card.Body>
          <Form.Group className="mb-4">
            <Form.Label>Select Class of Business</Form.Label>
            <Form.Select
              value={classOfBusiness}
              onChange={(e) => setClassOfBusiness(e.target.value)}
            >
              <option value="">-- Choose Class --</option>
              {CLASSES_OF_BUSINESS.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Choose Report to Generate</Form.Label>
            <div>
              <Button
                variant={reportType === 'preliminary' ? 'primary' : 'outline-primary'}
                className="me-3"
                onClick={() => setReportType('preliminary')}
              >
                Preliminary Report
              </Button>
              <Button
                variant={reportType === 'final' ? 'primary' : 'outline-primary'}
                onClick={() => setReportType('final')}
              >
                Final Report
              </Button>
            </div>
          </Form.Group>
        </Card.Body>
      </Card>

      {reportType && (
        <Card className="mb-4">
          <Card.Body>
            <h3 className="mb-4">
              {reportType === 'preliminary' ? 'Preliminary' : 'Final'} Report
            </h3>

            {/* Field Report - common to both */}
            <Form.Group className="mb-4">
              <Form.Label>Upload Field Report</Form.Label>
              <Form.Control
                type="file"
                accept=".docx,.pdf,.txt"
                onChange={handleFileChange(setFieldReport)}
              />
              {fieldReport && <small className="text-success d-block mt-1">{fieldReport.name}</small>}
            </Form.Group>

            {reportType === 'final' && (
              <>
                <Form.Group className="mb-4">
                  <Form.Label>Upload Policy Document</Form.Label>
                  <Form.Control
                    type="file"
                    accept=".docx,.pdf,.txt"
                    onChange={handleFileChange(setPolicyDocument)}
                  />
                  {policyDocument && <small className="text-success d-block mt-1">{policyDocument.name}</small>}
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Upload Endorsement (Optional)</Form.Label>
                  <Form.Control
                    type="file"
                    accept=".docx,.pdf,.txt"
                    onChange={handleFileChange(setEndorsement)}
                  />
                  {endorsement && <small className="text-success d-block mt-1">{endorsement.name}</small>}
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Upload Additional Documents</Form.Label>
                  <Form.Control
                    type="file"
                    multiple
                    accept=".docx,.pdf,.txt"
                    onChange={handleMultipleFiles(setAdditionalDocs)}
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Upload Supporting Documents (+ Click to add more)</Form.Label>
                  <Form.Control
                    type="file"
                    multiple
                    accept=".docx,.pdf,.txt"
                    onChange={handleMultipleFiles(setSupportingDocs)}
                  />
                </Form.Group>
              </>
            )}

            {reportType === 'preliminary' && (
              <Form.Group className="mb-4">
                <Form.Label>Click to Add More Documents</Form.Label>
                <Form.Control
                  type="file"
                  multiple
                  accept=".docx,.pdf,.txt"
                  onChange={handleMultipleFiles(setAdditionalDocs)}
                />
              </Form.Group>
            )}

            {/* Uploaded additional/supporting files list */}
            {(additionalDocs.length > 0 || supportingDocs.length > 0) && (
              <div className="mb-4">
                <strong>Uploaded Additional / Supporting Files:</strong>
                <ul className="mt-2">
                  {[...additionalDocs, ...supportingDocs].map((file, idx) => (
                    <li key={idx} className="d-flex align-items-center">
                      {file.name}
                      <Button
                        size="sm"
                        variant="danger"
                        className="ms-2"
                        onClick={removeFileFromList(
                          idx < additionalDocs.length ? setAdditionalDocs : setSupportingDocs,
                          idx < additionalDocs.length ? idx : idx - additionalDocs.length
                        )}
                      >
                        ×
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Report Arrangement - Headlines with Sub-points */}
            <h5 className="mb-3">Select Report Arrangement</h5>

            {headlines.map((headline) => (
              <div key={headline.id} className="mb-4 border p-3 rounded bg-light">
                {/* Main Headline */}
                <Form.Group className="d-flex align-items-center mb-3">
                  <Form.Label className="me-2 mb-0 fw-bold" style={{ width: '60px' }}>
                    {headline.id}.0
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter main headliner / Click to select"
                    value={headline.value}
                    onChange={(e) => updateHeadline(headline.id, e.target.value)}
                  />
                  {headlines.length > 8 && (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="ms-2"
                      onClick={() => removeHeadline(headline.id)}
                    >
                      Remove
                    </Button>
                  )}
                </Form.Group>

                {/* Sub-points */}
                {headline.subpoints.length > 0 && (
                  <div className="ms-5 mb-3">
                    {headline.subpoints.map((sub, subIdx) => (
                      <Form.Group
                        key={sub.id}
                        className="d-flex align-items-center mb-2"
                      >
                        <Form.Label
                          className="me-2 mb-0 text-muted"
                          style={{ width: '60px' }}
                        >
                          {headline.id}.{subIdx + 1}
                        </Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Enter sub-point title"
                          value={sub.value}
                          onChange={(e) =>
                            updateSubpoint(headline.id, sub.id, e.target.value)
                          }
                        />
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="ms-2"
                          onClick={() => removeSubpoint(headline.id, sub.id)}
                        >
                          –
                        </Button>
                      </Form.Group>
                    ))}
                  </div>
                )}

                {/* Add Sub-point Button */}
                <div className="ms-5">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => addSubpoint(headline.id)}
                  >
                    + Add Sub-point ({headline.id}.1, {headline.id}.2, etc.)
                  </Button>
                </div>
              </div>
            ))}

            <Button variant="link" className="mb-4" onClick={addHeadline}>
              + Add More Main Headline
            </Button>

            {/* Photos */}
            <Form.Group className="mt-4 mb-4">
              <Form.Label>Click to Upload Photos</Form.Label>
              <Form.Control
                type="file"
                multiple
                accept="image/*"
                onChange={handleMultipleFiles(setPhotos)}
              />
              {photos.length > 0 && (
                <small className="text-success d-block mt-1">
                  {photos.length} photo(s) selected
                </small>
              )}
            </Form.Group>

            <div className="text-center">
              <Button
                variant="success"
                size="lg"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading
                  ? 'Generating...'
                  : `Generate ${reportType === 'preliminary' ? 'Preliminary' : 'Final'} Report`}
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {error && <Alert variant="danger">{error}</Alert>}

      {generatedReport && (
        <Alert variant="success">
          <h4>Report Generated Successfully!</h4>
          <p>Filename: {generatedReport.filename}</p>
          <Button variant="primary" onClick={downloadReport}>
            Download Report
          </Button>
          <pre className="mt-3">{JSON.stringify(generatedReport, null, 2)}</pre>
        </Alert>
      )}
    </Container>
  );
}

export default Home;