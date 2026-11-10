import { DATA_LICENSE, DATA_LICENSE_URL } from './domain/api.js';
import { PRO_ACCESS_URL } from './access.js';
import type { ToolLocale } from './tools.js';

/**
 * The terms that come with every answer of the MCP server:
 * `attribution`, the sentence to quote with the data (obligatory, the BY of
 * the licence), and `license`, what the answer may be used for (no commercial
 * use without the pro access, the NC).
 */

export type Access = 'public' | 'pro';

export function attributionFor(baseUrl: string, locale: ToolLocale, paths: readonly string[] = []): string {
  const pages = paths.length > 0 ? paths.map((p) => `${baseUrl}${p}`).join(', ') : baseUrl;
  return locale === 'en' ? `Source: Vuntum, ${pages}, ${DATA_LICENSE}` : `Source : Vuntum, ${pages}, ${DATA_LICENSE}`;
}

export function licenseFor(access: Access, locale: ToolLocale) {
  if (access === 'pro') {
    return {
      name: 'Vuntum Pro',
      dataLicense: DATA_LICENSE,
      url: PRO_ACCESS_URL[locale],
      attributionRequired: true,
      commercialUse: true,
      terms:
        locale === 'en'
          ? 'Pro access: commercial use covered by the key’s licence. Quote the `attribution` field with the data.'
          : 'Accès pro : usage commercial couvert par la licence de la clé. Reprendre le champ `attribution` avec les données.',
    };
  }
  return {
    name: DATA_LICENSE,
    url: DATA_LICENSE_URL,
    attributionRequired: true,
    commercialUse: false,
    terms:
      locale === 'en'
        ? `Attribution required: quote the \`attribution\` field, with its link, wherever the data is shown. No commercial use without the pro access: ${PRO_ACCESS_URL.en}`
        : `Attribution obligatoire : reprendre le champ \`attribution\`, avec son lien, partout où les données sont montrées. Pas d’usage commercial sans l’accès pro : ${PRO_ACCESS_URL.fr}`,
  };
}

/** Adds the terms to a tool's answer, in front so that a reader sees them first. */
export function withTerms(
  payload: unknown,
  opts: { baseUrl: string; locale: ToolLocale; access: Access; paths?: readonly string[] },
): Record<string, unknown> {
  const terms = {
    attribution: attributionFor(opts.baseUrl, opts.locale, opts.paths),
    license: licenseFor(opts.access, opts.locale),
  };
  if (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) {
    return { ...terms, ...(payload as Record<string, unknown>), ...terms };
  }
  return { ...terms, data: payload };
}
