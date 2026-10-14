import "server-only";
import { PortalBilharError } from "./types";

const DEFAULT_TIMEOUT_MS = 15_000;
const ALLOWED_HOST = "www.portalbilhar.pt";

function validatePortalUrl(input: string | URL): URL {
  const url = input instanceof URL ? input : new URL(input);
  if (url.protocol !== "https:" || url.hostname !== ALLOWED_HOST) {
    throw new PortalBilharError(
      "O endereço pedido não pertence ao Portal Bilhar.",
      "INVALID_ARGUMENT",
    );
  }
  return url;
}

function decodeHtml(buffer: ArrayBuffer, contentType: string | null): string {
  const match = contentType?.match(/charset=([^;]+)/i);
  const declared = match?.[1]?.trim().replace(/["']/g, "");
  const encodings = [declared, "utf-8", "windows-1252"].filter(
    (value, index, values): value is string => Boolean(value) && values.indexOf(value) === index,
  );

  for (const encoding of encodings) {
    try {
      return new TextDecoder(encoding, { fatal: true }).decode(buffer);
    } catch {
      // Experimenta a codificação seguinte.
    }
  }
  return new TextDecoder("utf-8").decode(buffer);
}

export async function fetchPortalHtml(
  input: string | URL,
  options?: { timeoutMs?: number; referer?: string },
): Promise<{ html: string; url: string }> {
  const url = validatePortalUrl(input);
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.6",
        "User-Agent": "AmigosBilhar/1.0 (+https://amigosbilhar.bilhar3tabelas.com)",
        ...(options?.referer ? { Referer: options.referer } : {}),
      },
    });

    if (!response.ok) {
      throw new PortalBilharError(
        `O Portal Bilhar respondeu com HTTP ${response.status}.`,
        "HTTP_ERROR",
        response.status,
      );
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.toLowerCase().includes("text/html")) {
      throw new PortalBilharError(
        "O Portal Bilhar devolveu um conteúdo inesperado.",
        "UNEXPECTED_CONTENT",
        response.status,
      );
    }

    const html = decodeHtml(await response.arrayBuffer(), contentType);
    if (!/Federa[cç][aã]o Portuguesa de Bilhar|Portal Gestão Desportiva/i.test(html)) {
      throw new PortalBilharError(
        "A resposta não corresponde a uma página reconhecida do Portal Bilhar.",
        "UNEXPECTED_CONTENT",
        response.status,
      );
    }

    return { html, url: response.url };
  } catch (error) {
    if (error instanceof PortalBilharError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new PortalBilharError(
        "O pedido ao Portal Bilhar excedeu o tempo limite.",
        "TIMEOUT",
      );
    }
    throw new PortalBilharError(
      error instanceof Error ? error.message : "Falha ao consultar o Portal Bilhar.",
      "HTTP_ERROR",
    );
  } finally {
    clearTimeout(timer);
  }
}
