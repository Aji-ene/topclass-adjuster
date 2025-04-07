import axios from 'axios';

const API_URL = '/api';
/*** 
export const processFiles = async (formData) => {
  return await axios.post(`${API_URL}/files/process-files`, formData);
};

*/

export const processFiles = async (formData) => {
  const response = await axios.post(`${API_URL}/files/process-files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};