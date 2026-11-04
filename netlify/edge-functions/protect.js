// Asks for a password before serving anything under /tools/ (those pages contain class rosters).
// Any username works; the password is the ADMIN_PASSCODE environment variable.
export default async (request, context) => {
  const pass = Netlify.env.get("ADMIN_PASSCODE");
  const auth = request.headers.get("authorization") || "";
  if (pass && auth.startsWith("Basic ")) {
    try {
      const [, given] = atob(auth.slice(6)).split(/:(.*)/s);
      if (given === pass) return context.next();
    } catch (e) {}
  }
  return new Response("Instructor tools: sign in with your instructor passcode (any username).", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="RTTP instructor tools", charset="UTF-8"', "Cache-Control": "no-store" },
  });
};
export const config = { path: "/tools/*" };
