import Roles from "./roles";

// Reads the payload only; the signature is verified by the backend.
function jwtDecode(jwt) {
  const base64 = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

export class UserTokenResult {
  constructor(decodedJwtToken, succeeded) {
    this.succeeded = succeeded;
    if (succeeded) {
      this.token = decodedJwtToken;
      this.user = {
        name: decodedJwtToken.family_name,
        firstName: decodedJwtToken.given_name,
        roles: decodedJwtToken.role,
        translatedRoles: []
          .concat(decodedJwtToken.role)
          .map((x) => UserTokenResult.translateRole(x)),
      };
    }
  }

  get expiration() {
    return this.token.exp;
  }

  get isExpired() {
    return Date.now() >= this.expiration * 1000;
  }

  static translateRole(role) {
    switch (role) {
      case "algemeenBeheerder":
        return Roles.AlgemeenBeheerder;
      case "vlimpersBeheerder":
        return Roles.VlimpersBeheerder;
      case "decentraalBeheerder":
        return Roles.DecentraalBeheerder;
      case "orgaanBeheerder":
        return Roles.OrgaanBeheerder;
      case "developer":
        return Roles.Developer;
      case "regelgevingBeheerder":
        return Roles.Regelgever;
    }
    return "";
  }

  static fromJwt(jwt) {
    if (!jwt) return new UserTokenResult(null, false);

    try {
      return new UserTokenResult(jwtDecode(jwt), true);
    } catch (e) {
      console.error(e);
      return new UserTokenResult(null, false);
    }
  }
}
