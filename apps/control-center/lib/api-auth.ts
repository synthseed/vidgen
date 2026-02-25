export function isApiAuthorized(request: Request): boolean {
  const token = process.env.CONTROL_CENTER_API_TOKEN;
  if (!token) return true;

  const authHeader = request.headers.get('authorization') || '';
  const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  return bearer.length > 0 && bearer === token;
}
