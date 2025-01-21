const { GoogleAuth } = require('google-auth-library');

async function getAuthClient() {
  const auth = new GoogleAuth();
  const client = await auth.getClient();
  console.log('Using credentials from:', auth.keyFilename || 'Application Default Credentials');
  return client;
}

getAuthClient()