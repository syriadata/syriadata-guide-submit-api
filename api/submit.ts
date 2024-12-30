import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Type definition for expected request body
interface SubmissionData {
  email?: string;
  url: string;
  formats: string[];
  topics: string[];
  description?: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', 'https://guide.syriadata.net');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS (preflight) request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.GOOGLE_SHEET_ID || 
        !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 
        !process.env.GOOGLE_PRIVATE_KEY) {
        throw new Error('Missing required environment variables');
    }

    const data = req.body as SubmissionData;

    // Validate required fields
    if (!data.url || !data.formats || !data.topics) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    
    const sheet = doc.sheetsByTitle["Submissions"];
    
    if (!sheet) {
      throw new Error('Submissions sheet not found');
    }

    // Add the row to the sheet
    await sheet.addRow({
      email: data.email || '',
      url: data.url,
      formats: data.formats.join(', '),
      topics: data.topics.join(', '),
      description: data.description || '',
      submitted_at: new Date().toISOString(),
      status: 'pending'
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error submitting data:', error);
    return res.status(500).json({ error: 'Failed to submit data' });
  }
}