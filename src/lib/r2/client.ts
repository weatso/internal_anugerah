import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// 1. PEMBERSIHAN MUTLAK (Membuang spasi dan tanda kutip dari .env)
let rawEndpoint = (process.env.R2_ENDPOINT || '').trim().replace(/['"]/g, '');

// 2. Jika Anda tidak sengaja menaruh nama bucket di ujung URL .env, potong!
if (rawEndpoint.includes('.com/')) {
  rawEndpoint = rawEndpoint.split('.com/')[0] + '.com';
}

// 3. Paksa penggunaan HTTPS
const safeEndpoint = rawEndpoint.startsWith('http') ? rawEndpoint : `https://${rawEndpoint}`;

// DIAGNOSTIK SERVER: Perhatikan log di terminal Anda!
console.log('--- R2 DIAGNOSTIC START ---');
console.log('Endpoint :', safeEndpoint);
console.log('Bucket   :', (process.env.R2_BUCKET_NAME || '').trim());
console.log('Key ID   :', (process.env.R2_ACCESS_KEY_ID || '').trim() ? 'Tersedia' : 'KOSONG!');
console.log('--- R2 DIAGNOSTIC END ---');

const BUCKET = (process.env.R2_BUCKET_NAME || '').trim();

const R2 = new S3Client({
  region: 'auto',
  endpoint: safeEndpoint,
  forcePathStyle: true, // KUNCI MUTLAK PENCEGAH SSL HANDSHAKE FAILURE
  credentials: {
    accessKeyId: (process.env.R2_ACCESS_KEY_ID || '').trim(),
    secretAccessKey: (process.env.R2_SECRET_ACCESS_KEY || '').trim(),
  },
})

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  await R2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )
  return key
}

export async function getPresignedUrl(key: string, expiresInSeconds = 900): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key })
  return getSignedUrl(R2, command, { expiresIn: expiresInSeconds })
}

export async function deleteFromR2(key: string): Promise<void> {
  await R2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

export function buildStorageKey(folder: string, entityId: string, filename: string): string {
  const timestamp = Date.now()
  const ext = filename.split('.').pop()
  return `${folder}/${entityId}/${timestamp}.${ext}`
}