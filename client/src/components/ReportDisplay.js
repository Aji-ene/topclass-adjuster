
import React from 'react';
import { Card, Button } from 'react-bootstrap';

function ReportDisplay({ report }) {
  return (
    <Card>
      <Card.Header>Analysis Report</Card.Header>
      <Card.Body>
        <Card.Title>{report.claimType} Claim</Card.Title>
        <h5>Summary</h5>
        <p>{report.summary}</p>
        
        <h5>Fraud Risk Assessment</h5>
        <p>Risk Score: {report.fraudRisk.riskScore}/10</p>
        {report.fraudRisk.redFlags.length > 0 && (
          <ul>
            {report.fraudRisk.redFlags.map((flag, index) => (
              <li key={index}>{flag}</li>
            ))}
          </ul>
        )}
        
        <h5>Claim Value</h5>
        <p>{report.claimValue.valueRange.min} - {report.claimValue.valueRange.max}</p>
        
        <h5>Recommendations</h5>
        <p>{report.recommendations}</p>
        
        <div className="mt-3">
          <Button
            variant="outline-primary"
            href={`/api/files/download/${report.id}?format=docx`}
            className="me-2"
          >
            Download DOCX
          </Button>
          <Button
            variant="outline-primary"
            href={`/api/files/download/${report.id}?format=pdf`}
          >
            Download PDF
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}

export default ReportDisplay;