export const joinpath = (path: string, ...childs: string[]): string => {
  return [path, ...childs].join('/').replace(/(^|[^:])(\/\/+)/g, '$1/');
};

export const joinParams = (
  url: string,
  params: Record<string, string | number | boolean | { toString: () => string }>,
): string => {
  const queryString = new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString();
  return `${url}?${queryString}`;
};
