import { useState } from 'react';

const AURA_AUTH_URL = import.meta.env.VITE_AURA_AUTH_URL;
const CLIENT_ID = import.meta.env.VITE_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const configRes = await fetch(`${AURA_AUTH_URL}/.well-known/openid-configuration`);
      if (!configRes.ok) {
        throw new Error("Failed to fetch OIDC configuration");
      }
      const config = await configRes.json();

      if (!config.authorization_endpoint) {
        throw new Error("authorization_endpoint missing from well-known config");
      }

      const authUrl = new URL(config.authorization_endpoint);
      authUrl.searchParams.set("client_id", CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", "openid profile email");

      window.location.href = authUrl.toString();
    } catch (err: any) {
      setError(err.message || "An error occurred during login initialization");
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <img src="/favicon.png" alt="Emitly logo" width="60" height="60" />
        </div>

        {/* Title */}
        <h1 className="login-title">Emitly</h1>
        <p className="login-subtitle">Powered by Socket Box</p>

        {/* Divider */}
        <div className="login-divider" />

        {/* Error */}
        {error && <div className="login-error">{error}</div>}

        {/* Sign in button */}
        <button className="login-btn" onClick={handleLogin} disabled={loading}>
          {loading ? (
            <span className="login-btn-loading">
              <span className="login-spinner" />
              Connecting…
            </span>
          ) : (
            'Sign in with Aura Auth'
          )}
        </button>

        <p className="login-footer">Secure OAuth 2.0 authentication</p>
      </div>
    </div>
  );
}
