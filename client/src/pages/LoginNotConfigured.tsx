export default function LoginNotConfigured() {
  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif", maxWidth: 720, margin: "0 auto" }}>
      <h1>Authentication setup required</h1>
      <p>TextPoint has been switched away from external OAuth.</p>
      <p>For local testing, enable the local development bypass in your <code>.env</code> file:</p>
      <ul>
        <li><code>LOCAL_AUTH_BYPASS=true</code></li>
        <li><code>VITE_LOCAL_AUTH_BYPASS=true</code></li>
        <li><code>LOCAL_AUTH_EMAIL=admin@company.com</code></li>
        <li><code>LOCAL_AUTH_NAME=Admin</code></li>
      </ul>
      <p>When you are ready for production, replace the bypass with your final authentication provider.</p>
      <p>Allocated client users will sign in through the same TextPoint login page under Client Portal Login.</p>
      <p style={{ marginTop: "2rem", color: "#666" }}>TextPoint designed by A.Strydom</p>
    </div>
  );
}
