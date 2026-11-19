/** Next strips basePath; put it back before the DPoP `htu` check. */
export const BASE_PATH = "/lender-53";

export function publicRequestUrl(request: Request): string {
  const url = new URL(request.url);
  if (url.pathname !== BASE_PATH && !url.pathname.startsWith(`${BASE_PATH}/`)) {
    url.pathname = `${BASE_PATH}${url.pathname}`;
  }
  return url.href;
}
