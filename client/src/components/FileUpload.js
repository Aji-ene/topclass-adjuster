import React from 'react';
import { Form } from 'react-bootstrap';

function FileUpload({ label, onFileSelect, acceptedFormats }) {
  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <Form.Group>
      <Form.Label>{label}</Form.Label>
      <Form.Control
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleChange}
      />
    </Form.Group>
  );
}

export default FileUpload; 