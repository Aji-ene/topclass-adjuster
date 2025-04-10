import React, { useState } from 'react';
import { Container, Row, Col, Button, Alert } from 'react-bootstrap';
import FileUpload from './FileUpload';
import { processFiles } from '../services/api';

function Home() {
  const [questionnaireFile, setQuestionnaireFile] = useState(null);
  const [analyzedFile, setAnalyzedFile] = useState(null);
  const [interimReport, setInterimReport] = useState(null);
  const [finalReport, setFinalReport] = useState(null);
  const [loading, setLoading] = useState({ interim: false, final: false });
  const [error, setError] = useState(null);

  const handleProcessFiles = async (reportType) => {
    if (!questionnaireFile || !analyzedFile) {
      setError('Please upload both files');
      return;
    }
    setLoading(prev => ({ ...prev, [reportType]: true }));
    setError(null);

    try {
      const formData = new FormData();
      formData.append('questionnaire', questionnaireFile);
      formData.append('analyzedFile', analyzedFile);
      formData.append('reportType', reportType);
      const response = await processFiles(formData);
      console.log(`${reportType} Report Received:`, response.report);
      if (reportType === 'interim') {
        setInterimReport(response.report);
      } else {
        setFinalReport(response.report);
      }
    } catch (err) {
      setError(err.message || `Error processing ${reportType} report`);
    } finally {
      setLoading(prev => ({ ...prev, [reportType]: false }));
    }
  };

  const downloadReport = (report) => {
    if (report && report.filename) {
      const baseUrl = process.env.REACT_APP_API_URL || '';
      const url = `${BASEuRL}/api/files/download/${report.filename}`;
      window.location.href = url;
    }
  };

  return (
    <Container className="py-4">
      <h1 className="mb-4">Topclass Adjusters Claims Processing</h1>
      <Row className="mb-4">
        <Col md={6}><FileUpload label="Questionnaire File" onFileSelect={setQuestionnaireFile} acceptedFormats={['.docx', '.pdf', '.txt']} /></Col>
        <Col md={6}><FileUpload label="Analyzed File" onFileSelect={setAnalyzedFile} acceptedFormats={['.docx', '.pdf', '.txt']} /></Col>
      </Row>
      <Row className="mb-4">
        <Col>
          <Button
            onClick={() => handleProcessFiles('interim')}
            disabled={loading.interim || loading.final}
            className="me-2"
          >
            {loading.interim ? 'Processing...' : 'Generate Interim Report'}
          </Button>
          <Button
            onClick={() => handleProcessFiles('final')}
            disabled={loading.interim || loading.final}
          >
            {loading.final ? 'Processing...' : 'Generate Final Report'}
          </Button>
        </Col>
      </Row>
      {error && <Alert variant="danger">{error}</Alert>}
      {interimReport && (
        <Row className="mb-4">
          <Col>
            <h3>Interim Report</h3>
            <p>Generated: {interimReport.filename}</p>
            <Button onClick={() => downloadReport(interimReport)} variant="success">
              Download Interim Report
            </Button>
            <pre>{JSON.stringify(interimReport, null, 2)}</pre>
          </Col>
        </Row>
      )}
      {finalReport && (
        <Row>
          <Col>
            <h3>Final Report</h3>
            <p>Generated: {finalReport.filename}</p>
            <Button onClick={() => downloadReport(finalReport)} variant="success">
              Download Final Report
            </Button>
            <pre>{JSON.stringify(finalReport, null, 2)}</pre>
          </Col>
        </Row>
      )}
    </Container>
  );
}

export default Home;

