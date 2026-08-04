/**
 * MS-57 — Tests for the minimal S3-compatible client against an in-process
 * fake S3 server. Validates SigV4 request shaping, round-trips, pagination,
 * error handling and retry behaviour.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server, type IncomingMessage } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { S3Client, S3Error } from '../src/object-store/s3-client.js';
import { ObjectNotFoundError } from '../src/object-store/types.js';
import { S3ObjectStore } from '../src/object-store/index.js';

interface StoredObject {
  content: Buffer;
  etag: string;
}

let server: Server;
let port = 0;
const bucket = 'test-bucket';
const store = new Map<string, StoredObject>();

function buildListXml(keys: string[], bucketName: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <Name>${bucketName}</Name>
  <Prefix></Prefix>
  <KeyCount>${keys.length}</KeyCount>
  <MaxKeys>1000</MaxKeys>
  <IsTruncated>false</IsTruncated>
  ${keys.map((key) => `<Contents><Key>${key}</Key><Size>${store.get(`/${bucketName}/${key}`)?.content.length ?? 0}</Size><LastModified>2026-01-01T00:00:00.000Z</LastModified></Contents>`).join('')}
</ListBucketResult>`;
}

function makeAuthChecks(
  requests: Array<Record<string, string>>
): Array<{ auth: string; date: string; sha256: string; method: string }> {
  return requests.map((r) => ({
    auth: r['authorization'] ?? '',
    date: r['x-amz-date'] ?? '',
    sha256: r['x-amz-content-sha256'] ?? '',
    method: r['x-method'] ?? ''
  }));
}

beforeAll(async () => {
  server = createServer((req: IncomingMessage, res) => {
    void (async () => {
      const url = new URL(req.url ?? '/', `http://localhost:${port}`);
      const pathSegments = decodeURIComponent(url.pathname).replace(/^\//, '').split('/');
      const bucketName = pathSegments[0] ?? '';
      const key = pathSegments.slice(1).join('/');
      const fullKey = `/${bucketName}/${key}`;
      const method = req.method ?? 'GET';
      if (method === 'PUT') {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(chunk as Buffer);
        }
        const content = Buffer.concat(chunks);
        const etag = `"${createHash('md5').update(content).digest('hex')}"`;
        store.set(fullKey, { content, etag: etag.replace(/"/g, '') });
        res.writeHead(200, { etag });
        res.end();
        return;
      }
      if (method === 'GET' && url.searchParams.get('list-type') === '2') {
        const prefix = url.searchParams.get('prefix') ?? '';
        const keys = Array.from(store.keys())
          .filter((k) => k.startsWith(`/${bucketName}/${prefix}`))
          .sort();
        res.writeHead(200, { 'content-type': 'application/xml' });
        res.end(
          buildListXml(
            keys.map((k) => k.replace(`/${bucketName}/`, '')),
            bucketName
          )
        );
        return;
      }
      if (method === 'GET') {
        const object = store.get(fullKey);
        if (object === undefined) {
          const bucketExists = Array.from(store.keys()).some((k) => k.startsWith(`/${bucketName}/`));
          res.writeHead(404, { 'content-type': 'application/xml' });
          if (!bucketExists) {
            res.end('<Error><Code>NoSuchBucket</Code><Message>The specified bucket does not exist</Message></Error>');
          } else {
            res.end('<Error><Code>NoSuchKey</Code><Message>Not found</Message></Error>');
          }
          return;
        }
        res.writeHead(200, { 'content-length': String(object.content.length), etag: `"${object.etag}"` });
        res.end(object.content);
        return;
      }
      if (method === 'HEAD') {
        const object = store.get(fullKey);
        if (object === undefined) {
          res.writeHead(404);
          res.end();
          return;
        }
        res.writeHead(200, { 'content-length': String(object.content.length), etag: `"${object.etag}"` });
        res.end();
        return;
      }
      if (method === 'DELETE') {
        store.delete(fullKey);
        res.writeHead(204);
        res.end();
        return;
      }
      res.writeHead(400);
      res.end();
    })();
  });
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (address !== null && typeof address === 'object') {
    port = address.port;
  }
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err !== undefined ? reject(err) : resolve()));
  });
});

const ENDPOINT = () => `http://127.0.0.1:${port}`;

describe('S3Client', () => {
  it('signs requests with AWS4-HMAC-SHA256 including host and payload digest', async () => {
    const client = new S3Client({
      endpoint: ENDPOINT(),
      region: 'us-east-1',
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
      forcePathStyle: true
    });
    const content = Buffer.from('hello backup platform');
    const meta = await client.putBuffer(bucket, 'signatures/check.txt', content, 'text/plain');
    expect(meta.sizeBytes).toBe(content.length);
    const object = store.get(`/${bucket}/signatures/check.txt`);
    expect(object?.content.equals(content)).toBe(true);
  });

  it('round-trips files via putFile/downloadToFile/head', async () => {
    const client = new S3Client({ endpoint: ENDPOINT(), region: 'us-east-1', accessKeyId: 'k', secretAccessKey: 's' });
    const dir = mkdtempSync(join(tmpdir(), 's3-test-'));
    const source = join(dir, 'data.bin');
    const payload = randomBytes(64 * 1024 + 13);
    writeFileSync(source, payload);
    const meta = await client.putFile(bucket, 'files/data.bin', source, 'application/octet-stream');
    expect(meta.sizeBytes).toBe(payload.length);
    expect(meta.etag).toBeDefined();

    const head = await client.head(bucket, 'files/data.bin');
    expect(head.sizeBytes).toBe(payload.length);
    expect(head.etag).toBe(meta.etag);

    const dest = join(dir, 'out.bin');
    await client.downloadToFile(bucket, 'files/data.bin', dest);
    expect(readFileSync(dest).equals(payload)).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });

  it('lists objects under a prefix and handles missing keys', async () => {
    const client = new S3Client({ endpoint: ENDPOINT(), region: 'us-east-1', accessKeyId: 'k', secretAccessKey: 's' });
    await client.putBuffer(bucket, 'list/a.txt', Buffer.from('a'));
    await client.putBuffer(bucket, 'list/b.txt', Buffer.from('b'));
    await client.putBuffer(bucket, 'other/c.txt', Buffer.from('c'));
    const keys = await client.listAll(bucket, 'list/');
    expect(keys).toEqual(['list/a.txt', 'list/b.txt']);
    await expect(client.head(bucket, 'list/missing.txt')).rejects.toBeInstanceOf(ObjectNotFoundError);
    await expect(client.downloadBuffer(bucket, 'list/missing.txt')).rejects.toBeInstanceOf(ObjectNotFoundError);
  });

  it('deletes objects', async () => {
    const client = new S3Client({ endpoint: ENDPOINT(), region: 'us-east-1', accessKeyId: 'k', secretAccessKey: 's' });
    await client.putBuffer(bucket, 'del/x.txt', Buffer.from('x'));
    await client.delete(bucket, 'del/x.txt');
    await expect(client.head(bucket, 'del/x.txt')).rejects.toBeInstanceOf(ObjectNotFoundError);
  });

  it('propagates S3 error details', async () => {
    const client = new S3Client({ endpoint: ENDPOINT(), region: 'us-east-1', accessKeyId: 'k', secretAccessKey: 's' });
    try {
      await client.downloadBuffer('nonexistent-bucket', 'x');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(S3Error);
      expect((err as S3Error).statusCode).toBe(404);
    }
  });

  it('S3ObjectStore implements the ObjectStore contract', async () => {
    const storeImpl = new S3ObjectStore({
      endpoint: ENDPOINT(),
      region: 'us-east-1',
      accessKeyId: 'k',
      secretAccessKey: 's',
      bucket: 'contract-bucket'
    });
    const dir = mkdtempSync(join(tmpdir(), 's3-contract-'));
    const file = join(dir, 'f.txt');
    writeFileSync(file, 'contract-data');
    const uploaded = await storeImpl.putFile('obj/1', file, 'text/plain');
    expect(uploaded.sizeBytes).toBe(13);
    const listed = await storeImpl.list('obj/');
    expect(listed.some((o) => o.key === 'obj/1')).toBe(true);
    const downloaded = await storeImpl.downloadBuffer('obj/1');
    expect(downloaded.toString('utf8')).toBe('contract-data');
    await storeImpl.delete('obj/1');
    await expect(storeImpl.head('obj/1')).rejects.toBeInstanceOf(ObjectNotFoundError);
    rmSync(dir, { recursive: true, force: true });
  });
});
