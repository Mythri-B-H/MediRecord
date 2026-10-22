import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = "medirecord_token";

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Reads the JWT from the request's cookies and returns the decoded
// payload ({ userId, name, role }) or null if missing/invalid.
export function getSessionFromRequest(req) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export { COOKIE_NAME };

// Call from an API route to enforce that the caller has one of the
// allowed roles. Returns the session on success, or null (and the
// caller should respond 401/403) on failure.
export function requireRole(req, allowedRoles) {
  const session = getSessionFromRequest(req);
  if (!session) return null;
  if (allowedRoles && !allowedRoles.includes(session.role)) return null;
  return session;
}
