import { removeItem } from "@/api/localStorage";

// Authorization code flow with PKCE. The code is exchanged by the backend
// (security/exchange), so only the sign-in and sign-out URLs are built here.

const base64Url = (bytes) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const random = () => base64Url(crypto.getRandomValues(new Uint8Array(32)));

const withParams = (url, params) =>
  url +
  (url.includes("?") ? "&" : "?") +
  Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

class OidcClient {
  constructor(data) {
    this.authorizationEndpoint = data.authorizationEndpoint; // 'https://authenticatie-ti.vlaanderen.be/op/v1/auth'
    this.endSessionEndpoint = data.endSessionEndPoint; // 'https://authenticatie-ti.vlaanderen.be/op/v1/logout'
    this.clientId = data.clientId;
    this.redirectUri = data.redirectUri.replace("/#/", "/v2/");
    this.postLogoutRedirectUri = data.postLogoutRedirectUri;
  }

  async signIn() {
    const verifier = random();
    const challenge = base64Url(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(verifier)
        )
      )
    );
    localStorage.setItem("verifier", verifier);

    window.location = withParams(this.authorizationEndpoint, {
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: "openid profile vo iv_wegwijs",
      state: random(),
      code_challenge: challenge,
      code_challenge_method: "S256",
    });
  }

  signOut() {
    removeItem("token");

    window.location = withParams(this.endSessionEndpoint, {
      post_logout_redirect_uri: this.postLogoutRedirectUri,
      state: random(),
    });
  }
}

export default OidcClient;
