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

  const addHeadline = () => {
    setHeadlines([
      ...headlines,
      { id: headlines.length + 1, value: '' },
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

    const formData = new FormData();
    formData.append('classOfBusiness', classOfBusiness);
    formData.append(
      'reportType',
      reportType === 'preliminary' ? 'interim' : 'final'
    );

    // Append headlines as JSON string (server can parse if needed)
    formData.append('headlines', JSON.stringify(headlines.map(h => h.value).filter(v => v.trim())));

    if (reportType === 'preliminary') {
      if (!fieldReport) {
        setError('Please upload Field Report');
        return;
      }
      formData.append('questionnaire', fieldReport); // reuse existing field names
      additionalDocs.forEach((file, i) =>
        formData.append('additionalDocs', file)
      );
    } else {
      // Final report
      if (!fieldReport) {
        setError('Please upload Field Report');
        return;
      }
      if (!policyDocument) {
        setError('Please upload Policy Document');
        return;
      }
      formData.append('questionnaire', fieldReport);
      formData.append('analyzedFile', policyDocument);
      if (endorsement) formData.append('endorsement', endorsement);
      additionalDocs.forEach((file) =>
        formData.append('additionalDocs', file)
      );
      supportingDocs.forEach((file) =>
        formData.append('supportingDocs', file)
      );
    }

    // Photos (common to both)
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
          <Form.Group className="mb-3">
            <Form.Label>Select Class of Business</Form.Label>
            <Form.Select
              value={classOfBusiness}
              onChange={(e) => setClassOfBusiness(e.target.value)}
              required
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

            {/* Common: Field Report */}
            <Form.Group className="mb-3">
              <Form.Label>
                {reportType === 'preliminary'
                  ? 'Click to Upload Field Report'
                  : 'Upload Field Report'}
              </Form.Label>
              <Form.Control
                type="file"
                accept=".docx,.pdf,.txt"
                onChange={handleFileChange(setFieldReport)}
              />
              {fieldReport && <small className="text-success">{fieldReport.name}</small>}
            </Form.Group>

            {reportType === 'final' && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Upload Policy Document</Form.Label>
                  <Form.Control
                    type="file"
                    accept=".docx,.pdf,.txt"
                    onChange={handleFileChange(setPolicyDocument)}
                  />
                  {policyDocument && <small className="text-success">{policyDocument.name}</small>}
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Upload Endorsement (Optional)</Form.Label>
                  <Form.Control
                    type="file"
                    accept=".docx,.pdf,.txt"
                    onChange={handleFileChange(setEndorsement)}
                  />
                  {endorsement && <small className="text-success">{endorsement.name}</small>}
                </Form.Group>

                <Form.Group className="mb-3">
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
              <Form.Group className="mb-3">
                <Form.Label>Click to Add More Documents</Form.Label>
                <Form.Control
                  type="file"
                  multiple
                  accept=".docx,.pdf,.txt"
                  onChange={handleMultipleFiles(setAdditionalDocs)}
                />
              </Form.Group>
            )}

            {/* Display uploaded additional/supporting files */}
            {(additionalDocs.length > 0 || supportingDocs.length > 0) && (
              <div className="mb-3">
                <strong>Uploaded Additional Files:</strong>
                <ul>
                  {[...additionalDocs, ...supportingDocs].map((file, idx) => (
                    <li key={idx}>
                      {file.name}{' '}
                      <Button
                        size="sm"
                        variant="danger"
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

            {/* Report Arrangement - Headlines */}
            <h5 className="mb-3">Select Report Arrangement</h5>
            {headlines.map((headline) => (
              <Form.Group key={headline.id} className="mb-2 d-flex align-items-center">
                <Form.Label className="me-2 mb-0" style={{ width: '60px' }}>
                  {headline.id}.0
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter headliner / Click to select"
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
                    –
                  </Button>
                )}
              </Form.Group>
            ))}
            <Button variant="link" onClick={addHeadline}>
              + Add more
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
                <small className="text-success">
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
        </Alert>
      )}
    </Container>
  );
}

export default Home;