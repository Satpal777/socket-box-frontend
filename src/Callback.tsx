import { useEffect, useState } from 'react';

const AURA_AUTH_URL = import.meta.env.VITE_AURA_AUTH_URL;
const CLIENT_ID = import.meta.env.VITE_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_CLIENT_SECRET;
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI;

export default function Callback() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const err = urlParams.get('error');

    if (err) {
      setError(err);
      return;
    }

    if (!code) {
      setError("No authorization code provided in the URL.");
      return;
    }

    const exchangeToken = async () => {
      try {
        const configRes = await fetch(`${AURA_AUTH_URL}/.well-known/openid-configuration`);
        if (!configRes.ok) {
          throw new Error("Failed to fetch OIDC configuration");
        }
        const config = await configRes.json();

        if (!config.token_endpoint) {
          throw new Error("token_endpoint missing from well-known config");
        }

        const tokenRes = await fetch(config.token_endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
          })
        });

        const data = await tokenRes.json();

        if (data.error) {
          setError(data.error);
        } else {
          // Store token securely (localStorage is used here for simplicity)
          localStorage.setItem('aura_token', data.id_token || data.access_token);

          // Redirect to the main application
          window.location.href = '/';
        }
      } catch (e: any) {
        setError(e.message || "An error occurred while exchanging the token");
      }
    };

    exchangeToken();
  }, []);

  if (error) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>Authentication Error</h1>
            <p className="error" style={{ padding: '16px', marginTop: '16px', borderRadius: '8px' }}>{error}</p>
          </div>
          <div className="login-body">
            <button className="btn-primary" onClick={() => window.location.href = '/'}>Go back to Login</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card" style={{ padding: '60px' }}>
        <div className="spinner" style={{ margin: '0 auto', width: '48px', height: '48px' }}></div>
        <p style={{ marginTop: '24px', color: 'var(--text-secondary)' }}>Authenticating...</p>
      </div>
    </div>
  );
}
