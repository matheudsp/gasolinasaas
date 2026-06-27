const TENANT_ROUTE_SEGMENTS = new Set(["api", "rpc"]);

export const stripTenantPrefixFromRequest = (request: Request): Request => {
  const url = new URL(request.url);
  const segments = url.pathname.split("/").filter(Boolean);

  if (segments.length < 2) {
    return request;
  }

  const [firstSegment, secondSegment] = segments;

  if (TENANT_ROUTE_SEGMENTS.has(firstSegment)) {
    return request;
  }

  if (!TENANT_ROUTE_SEGMENTS.has(secondSegment)) {
    return request;
  }

  const updatedUrl = new URL(url.toString());
  updatedUrl.pathname = `/${segments.slice(1).join("/")}`;

  return new Request(updatedUrl.toString(), request);
};
