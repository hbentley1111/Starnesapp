import { Injectable } from "@nestjs/common";
import type { UserRole } from "@starnes/shared";

/**
 * auth-rbac (§8 Authentication/Authorization):
 * Google SSO (OAuth2/OIDC, auth-code + PKCE) restricted to the firm domain
 * (hd claim). No app-managed passwords; MFA delegated to Workspace 2-Step.
 * Session: HttpOnly+Secure+SameSite cookie, sliding ~8h, absolute 24h.
 * Authorization enforced SERVER-SIDE on every privileged action — the FE
 * RBAC HOC (S6) is UX only, never security.
 *
 * TODO(B1): OIDC callback, ID-token validation per request, session store,
 * role guards, HITL-approval capability restricted to founder + relations.
 */
@Injectable()
export class AuthRbacService {
  /** Capability matrix (§8) — governs actions, especially privileged ones. */
  can(role: UserRole, action: "hitl.approve" | "config.routing" | "admin.users" | "migration.run"): boolean {
    switch (action) {
      case "hitl.approve":
        return role === "founder" || role === "relations"; // deliberately narrow
      case "config.routing":
        return role === "founder" || role === "ops";
      case "admin.users":
        return role === "founder" || role === "ops";
      case "migration.run":
        return role === "ops";
    }
  }
}
