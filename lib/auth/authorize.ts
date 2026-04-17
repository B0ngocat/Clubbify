import type { SessionContext } from "@/lib/auth/session";

export type AuthorizeAction =
  | "club.view"
  | "club.create"
  | "club.update"
  | "club.delete"
  | "club.join"
  | "club.leave"
  | "event.view"
  | "event.create"
  | "event.update"
  | "event.delete"
  | "event.rsvp"
  | "event.attendance.mark"
  | "announcement.create"
  | "announcement.delete"
  | "points.rule.manage"
  | "points.award.manual"
  | "advisor.student.view"
  | "intervention.create"
  | "admin.any";

export type ResourceContext = {
  orgId: string;
  clubId?: string;
  ownerUserId?: string;
};

export class AuthorizationError extends Error {
  constructor(action: AuthorizeAction) {
    super(`Not authorized: ${action}`);
    this.name = "AuthorizationError";
  }
}

export function authorize(
  action: AuthorizeAction,
  resource: ResourceContext,
  ctx: SessionContext,
): void {
  if (resource.orgId !== ctx.orgId) throw new AuthorizationError(action);

  const isAdmin = ctx.roles.has("ADMIN");
  const isAdvisor = ctx.roles.has("ADVISOR");
  const isOfficerOfClub =
    !!resource.clubId && ctx.officerClubIds.has(resource.clubId);

  if (isAdmin) return;

  switch (action) {
    case "club.view":
    case "event.view":
      return; // any authenticated same-org user
    case "club.join":
    case "club.leave":
    case "event.rsvp":
      return;
    case "club.create":
      throw new AuthorizationError(action);
    case "club.update":
    case "club.delete":
    case "event.create":
    case "event.update":
    case "event.delete":
    case "event.attendance.mark":
    case "announcement.create":
    case "announcement.delete":
    case "points.rule.manage":
    case "points.award.manual":
      if (isOfficerOfClub) return;
      throw new AuthorizationError(action);
    case "advisor.student.view":
    case "intervention.create":
      if (isAdvisor) return;
      throw new AuthorizationError(action);
    case "admin.any":
      throw new AuthorizationError(action);
    default:
      throw new AuthorizationError(action);
  }
}

export function can(
  action: AuthorizeAction,
  resource: ResourceContext,
  ctx: SessionContext | null,
): boolean {
  if (!ctx) return false;
  try {
    authorize(action, resource, ctx);
    return true;
  } catch {
    return false;
  }
}
