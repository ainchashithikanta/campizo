/**
 * College Hub Backup Platform (MS-57) — minimal S3-compatible client.
 *
 * Zero-dependency implementation of the AWS Signature Version 4 protocol over
 * HTTPS/HTTP with path-style addressing, compatible with MinIO, AWS S3,
 * Cloudflare R2 and GCS interop endpoints. Covers the operations the backup
 * subsystem needs: PUT/GET/DELETE/HEAD of objects and ListObjectsV2.
 *
 * Design constraints:
 *  - No commercial SaaS dependency, no SDK dependency.
 *  - Signed payloads (x-amz-content-sha256 = real digest), so payloads are
 *    integrity-protected in transit even over plain HTTP (e.g. local MinIO).
 *  - Streaming file uploads/downloads (bounded memory).
 *  - Transient failures (5xx / network) are retried with exponential backoff.
 */

import { createHash, createHmac, randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { statSync } from 'node:fs';
import { request as httpRequest, type IncomingMessage, type RequestOptions } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { pipeline } from 'node:stream/promises';
import { URL } from 'node:url';
import type { ObjectMetadata } from './types.js';
import { ObjectNotFoundError } from './types.js';

export interface S3ClientOptions {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
  maxRetries?: number;
  retryBaseDelayMs?: number;
}

export interface S3ErrorOptions {
  statusCode: number;
  code?: string;
}

export class S3Error extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, options: S3ErrorOptions) {
    super(message);
    this.name = 'S3Error';
    this.statusCode = options.statusCode;
    this.code = options.code ?? 'Unknown';
  }
}

const SERVICE = 's3';
const ALGORITHM = 'AWS4-HMAC-SHA256';
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

/** RFC 3986 URI encoding (encodeURIComponent leaves !'()* unencoded). */
function uriEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function hmac(key: Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

function sha256Hex(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

export function computeFileSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk as Buffer));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseXmlTag(xml: string, tag: string): string | undefined {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`).exec(xml);
  return match?.[1];
}

function parseXmlTags(xml: string, tag: string): string[] {
  const tags: string[] = [];
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'g');
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    tags.push(match[1] ?? '');
  }
  return tags;
}

export class S3Client {
  public readonly endpoint: URL;
  private readonly region: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly forcePathStyle: boolean;
  private readonly maxRetries: number;
  private readonly retryBaseDelayMs: number;

  constructor(options: S3ClientOptions) {
    this.endpoint = new URL(options.endpoint);
    this.region = options.region;
    this.accessKeyId = options.accessKeyId;
    this.secretAccessKey = options.secretAccessKey;
    this.forcePathStyle = options.forcePathStyle ?? true;
    this.maxRetries = options.maxRetries ?? MAX_RETRIES;
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? RETRY_BASE_DELAY_MS;
  }

  /** Full URL for an object (or bucket when key is empty). */
  public objectUrl(bucket: string, key: string, query: URLSearchParams = new URLSearchParams()): URL {
    const url = new URL(this.endpoint);
    if (this.forcePathStyle) {
      url.pathname = `/${bucket}${key ? `/${key.split('/').map(uriEncode).join('/')}` : ''}`;
    } else {
      url.hostname = `${bucket}.${url.hostname}`;
      url.pathname = `/${key.split('/').map(uriEncode).join('/')}`;
    }
    url.search = query.toString();
    return url;
  }

  private signingKey(date: string): Buffer {
    const dateKey = hmac(Buffer.from(`AWS4${this.secretAccessKey}`, 'utf8'), date);
    const regionKey = hmac(dateKey, this.region);
    const serviceKey = hmac(regionKey, SERVICE);
    return hmac(serviceKey, 'aws4_request');
  }

  /**
   * Sign a request with AWS Signature Version 4.
   * `payloadHash` must be `UNSIGNED-PAYLOAD` or the hex sha256 of the payload.
   */
  private sign(
    method: string,
    url: URL,
    headers: Record<string, string>,
    payloadHash: string,
    amzDate: string,
    dateStamp: string
  ): string {
    const canonicalUri = url.pathname === '' ? '/' : url.pathname;
    const queryPairs = Array.from(url.searchParams.entries())
      .map(([k, v]) => `${uriEncode(k)}=${uriEncode(v)}`)
      .sort();
    const canonicalQuery = queryPairs.join('&');

    const signedHeaderNames = ['host', 'x-amz-content-sha256', 'x-amz-date'];
    const canonicalHeaders =
      signedHeaderNames.map((name) => `${name}:${(headers[name] ?? '').trim()}`).join('\n') + '\n';

    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQuery,
      canonicalHeaders,
      signedHeaderNames.join(';'),
      payloadHash
    ].join('\n');

    const scope = `${dateStamp}/${this.region}/${SERVICE}/aws4_request`;
    const stringToSign = [
      ALGORITHM,
      amzDate,
      scope,
      createHash('sha256').update(canonicalRequest, 'utf8').digest('hex')
    ].join('\n');

    const signature = hmac(this.signingKey(dateStamp), stringToSign).toString('hex');
    return `${ALGORITHM} Credential=${this.accessKeyId}/${scope}, SignedHeaders=${signedHeaderNames.join(
      ';'
    )}, Signature=${signature}`;
  }

  private buildHeaders(
    url: URL,
    payloadHash: string,
    extra?: Record<string, string>
  ): {
    headers: Record<string, string>;
    amzDate: string;
    dateStamp: string;
  } {
    const amzDate = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
    const dateStamp = amzDate.slice(0, 8);
    const headers: Record<string, string> = {
      host: url.host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      ...extra
    };
    return { headers, amzDate, dateStamp };
  }

  private perform(
    method: string,
    url: URL,
    headers: Record<string, string>,
    payloadHash: string,
    amzDate: string,
    dateStamp: string,
    body?: NodeJS.ReadableStream | Buffer
  ): Promise<IncomingMessage> {
    const authorization = this.sign(method, url, headers, payloadHash, amzDate, dateStamp);
    const requestHeaders: Record<string, string> = { ...headers, authorization };
    if (headers['content-length'] !== undefined) {
      requestHeaders['content-length'] = headers['content-length'];
    }
    const options: RequestOptions = { method, headers: requestHeaders };
    return new Promise<IncomingMessage>((resolve, reject) => {
      const requester = url.protocol === 'https:' ? httpsRequest : httpRequest;
      const req = requester(url, options, (res) => {
        if (res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res);
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk as Buffer));
        res.on('end', () => {
          const xml = Buffer.concat(chunks).toString('utf8');
          const code = parseXmlTag(xml, 'Code') ?? 'Unknown';
          const message = parseXmlTag(xml, 'Message') ?? `HTTP ${res.statusCode ?? 'unknown'}`;
          if (res.statusCode === 404 && code !== 'NoSuchBucket') {
            reject(new ObjectNotFoundError(url.pathname));
            return;
          }
          reject(new S3Error(message, { statusCode: res.statusCode ?? 500, code }));
        });
        res.resume();
      });
      req.on('error', reject);
      if (body !== undefined) {
        if (body instanceof Buffer) {
          req.write(body);
          req.end();
        } else {
          pipeline(body, req).catch(reject);
        }
      } else {
        req.end();
      }
    });
  }

  private async execute(
    method: string,
    url: URL,
    payloadHash: string,
    extraHeaders?: Record<string, string>,
    body?: NodeJS.ReadableStream | Buffer
  ): Promise<IncomingMessage> {
    const { headers, amzDate, dateStamp } = this.buildHeaders(url, payloadHash, extraHeaders);
    let attempt = 0;
    for (;;) {
      try {
        return await this.perform(method, url, headers, payloadHash, amzDate, dateStamp, body);
      } catch (err) {
        const retryable =
          (err instanceof S3Error && err.statusCode >= 500) ||
          (err instanceof ObjectNotFoundError
            ? false
            : !(err instanceof ObjectNotFoundError) && err instanceof Error && err.message.includes('ECONN'));
        if (!retryable || attempt >= this.maxRetries) {
          throw err;
        }
        attempt += 1;
        const delay = this.retryBaseDelayMs * 2 ** (attempt - 1) + (randomBytes(4).readUInt32BE(0) % 100);
        await sleep(delay);
      }
    }
  }

  /** Upload a file with a fully signed payload digest (streaming, bounded memory). */
  public async putFile(
    bucket: string,
    key: string,
    filePath: string,
    contentType = 'application/octet-stream'
  ): Promise<ObjectMetadata> {
    const size = statSync(filePath).size;
    const payloadHash = await computeFileSha256(filePath);
    const url = this.objectUrl(bucket, key);
    const extraHeaders: Record<string, string> = {
      'content-type': contentType,
      'content-length': String(size)
    };
    const stream = createReadStream(filePath);
    let res: IncomingMessage;
    try {
      res = await this.execute('PUT', url, payloadHash, extraHeaders, stream);
    } catch (err) {
      stream.destroy();
      throw err;
    }
    const etag = res.headers['etag']?.replace(/"/g, '');
    res.resume();
    return {
      key,
      sizeBytes: size,
      ...(etag !== undefined ? { etag } : {})
    };
  }

  public async putBuffer(
    bucket: string,
    key: string,
    content: Buffer,
    contentType = 'application/octet-stream'
  ): Promise<ObjectMetadata> {
    const payloadHash = sha256Hex(content);
    const url = this.objectUrl(bucket, key);
    const extraHeaders: Record<string, string> = {
      'content-type': contentType,
      'content-length': String(content.length)
    };
    const res = await this.execute('PUT', url, payloadHash, extraHeaders, content);
    const etag = res.headers['etag']?.replace(/"/g, '');
    res.resume();
    return {
      key,
      sizeBytes: content.length,
      ...(etag !== undefined ? { etag } : {})
    };
  }

  public async downloadToFile(bucket: string, key: string, destPath: string): Promise<void> {
    const url = this.objectUrl(bucket, key);
    const res = await this.execute('GET', url, 'UNSIGNED-PAYLOAD');
    await pipeline(res, createWriteStream(destPath));
  }

  public async downloadBuffer(bucket: string, key: string): Promise<Buffer> {
    const url = this.objectUrl(bucket, key);
    const res = await this.execute('GET', url, 'UNSIGNED-PAYLOAD');
    const chunks: Buffer[] = [];
    for await (const chunk of res) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
  }

  public async head(bucket: string, key: string): Promise<ObjectMetadata> {
    const url = this.objectUrl(bucket, key);
    const res = await this.execute('HEAD', url, 'UNSIGNED-PAYLOAD');
    res.resume();
    const sizeBytes = Number(res.headers['content-length'] ?? '0');
    const etag = res.headers['etag']?.replace(/"/g, '');
    const lastModified = res.headers['last-modified'] ? new Date(res.headers['last-modified']) : undefined;
    return {
      key,
      sizeBytes,
      ...(etag !== undefined ? { etag } : {}),
      ...(lastModified !== undefined ? { lastModified } : {})
    };
  }

  public async delete(bucket: string, key: string): Promise<void> {
    const url = this.objectUrl(bucket, key);
    const res = await this.execute('DELETE', url, 'UNSIGNED-PAYLOAD');
    res.resume();
  }

  /** List all object keys under a prefix (handles continuation-token pagination). */
  public async listAll(bucket: string, prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let token: string | undefined;
    for (;;) {
      const query = new URLSearchParams({ 'list-type': '2', prefix, 'max-keys': '1000' });
      if (token !== undefined) {
        query.set('continuation-token', token);
      }
      const url = this.objectUrl(bucket, '', query);
      const res = await this.execute('GET', url, 'UNSIGNED-PAYLOAD');
      const chunks: Buffer[] = [];
      for await (const chunk of res) {
        chunks.push(chunk as Buffer);
      }
      const body = Buffer.concat(chunks).toString('utf8');
      keys.push(...parseXmlTags(body, 'Key').filter((k) => k !== ''));
      if (!/<IsTruncated>true<\/IsTruncated>/.test(body)) {
        break;
      }
      token = parseXmlTag(body, 'NextContinuationToken');
      if (token === undefined) {
        break;
      }
    }
    return keys;
  }
}
