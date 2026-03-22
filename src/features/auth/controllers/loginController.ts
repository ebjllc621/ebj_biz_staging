/**
 * @deprecated TEMPORARY BRIDGE - Remove when AuthenticationService.register() is implemented
 * @timeline Phase 3 Email Service Integration will complete registration flow
 * @see docs/auth/newday2ndRemediation/03-email-service-integration.md
 */
import { ZodError } from "zod";
import { LoginSchema } from "@/lib/validation/authSchemas";
import { fromZod, fromUnknown, toResponse } from "@/lib/api/errorEnvelope";
import { HTTP } from "@/lib/api/httpCodes";
import type { AuthService } from "@/features/auth/ports/AuthService";

function isNotImplemented(e: unknown): boolean {
  return e instanceof Error && e.message.startsWith("NOT_IMPLEMENTED");
}

export interface LoginDeps {
  authService: AuthService;
  getIp?: (req: Request) => string;
}

/**
 * Extract IP address from request headers
 * Uses X-Forwarded-For header if available, falls back to default IP
 */
const ipOf = (req: Request): string => {
  const forwardedFor = req.headers.get('x-forwarded-for') || '';
  return forwardedFor.split(',')[0]?.trim() || '0.0.0.0';
};

export function makeLoginController(deps: LoginDeps) {
  return {
    async POST(req: Request): Promise<Response> {
      try {
        let payload;
        try {
          payload = await req.json();
        } catch (jsonError) {
          return toResponse(HTTP.BAD_REQUEST, { code: "INVALID_JSON", message: "Invalid JSON format." });
        }

        const input = LoginSchema.parse(payload);

        // Rate limiting is now handled at the apiHandler level
        // Proceed with authentication
        const result = await deps.authService.loginUser(input);
        return new Response(JSON.stringify(result), {
          status: HTTP.OK,
          headers: { "content-type": "application/json; charset=utf-8" }
        });
      } catch (e) {
        if (e instanceof ZodError) return toResponse(HTTP.BAD_REQUEST, fromZod(e));
        if (isNotImplemented(e)) return toResponse(501, { code: "NOT_IMPLEMENTED", message: "Not implemented." });
        return toResponse(HTTP.INTERNAL_SERVER_ERROR, fromUnknown(e));
      }
    }
  };
}