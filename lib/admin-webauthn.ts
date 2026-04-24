import "server-only"

export function getAdminRelyingParty(request: Request) {
  const url = new URL(request.url)

  return {
    rpID: url.hostname,
    origin: url.origin,
    rpName: "Hoppsann Admin",
  }
}
