const { parse } = require('parse-multipart');
const fetch = require('node-fetch');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Handle case-insensitive headers
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    if (!contentType || !contentType.includes('boundary=')) {
      return { statusCode: 400, body: 'Invalid content type' };
    }
    
    const boundary = contentType.split('boundary=')[1];

    // Decode body correctly
    const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : Buffer.from(event.body);

    // Parse multipart form data
    const parts = parse(body, boundary);
    const file = parts.find(part => part.name === 'file');

    if (!file) {
      return { statusCode: 400, body: 'No file uploaded' };
    }

    // Upload to Netlify Blob Storage
    const uploadUrl = `https://api.netlify.com/api/v1/sites/${process.env.NETLIFY_BLOB_SITE_ID}/blobstore/${encodeURIComponent(file.filename)}`;
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Authorization': `Bearer ${process.env.NETLIFY_BLOB_TOKEN}`
      },
      body: file.data
    });

    if (!response.ok) throw new Error('Blob upload failed');

    const blobData = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify({ url: blobData.url }) // Use actual returned URL
    };

  } catch (error) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: error.message }) 
    };
  }
};
