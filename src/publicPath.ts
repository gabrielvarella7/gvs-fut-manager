/** URL de arquivo em `public/` (respeita base do Vite, ex. GitHub Pages). */
export function publicPath(relative: string): string {
  const clean = relative.replace(/^\//, '');
  const base = import.meta.env.BASE_URL;
  return base.endsWith('/') ? `${base}${clean}` : `${base}/${clean}`;
}