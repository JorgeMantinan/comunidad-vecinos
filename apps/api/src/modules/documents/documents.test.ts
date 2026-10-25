import { MAX_FILE_BYTES } from '@comunidad/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestContext, TestUser } from '../../test/test-context';
import {
  createCommunityAs,
  createTestContext,
  joinCommunity,
} from '../../test/test-context';

interface Document {
  id: string;
  title: string;
  category: string;
  contentType: string;
  sizeBytes: number;
  uploadedByName: string | null;
}

const SAMPLE_PDF_BASE64 = Buffer.from('%PDF-1.4 contenido de prueba').toString(
  'base64',
);

describe('Documentación privada (Vercel Blob)', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let member: TestUser;
  let resident: TestUser;
  let communityId: string;
  let documentId: string;
  let storageKey: string;

  const upload = (cookie: string, body: Record<string, unknown>): Promise<Response> =>
    ctx.request(`/api/communities/${communityId}/documents`, {
      method: 'POST',
      cookie,
      body,
    });

  const validBody = {
    title: 'Acta de la junta',
    category: 'minutes',
    contentType: 'application/pdf',
    contentBase64: SAMPLE_PDF_BASE64,
  };

  beforeAll(async () => {
    ctx = await createTestContext();
    owner = await ctx.signUp({
      name: 'Elena Presidenta',
      email: 'presidente@ejemplo.local',
      password: 'Password123!',
    });
    member = await ctx.signUp({
      name: 'Vicente Vecino',
      email: 'vecino@ejemplo.local',
      password: 'Password123!',
    });
    resident = await ctx.signUp({
      name: 'Rosa Residente',
      email: 'residente@ejemplo.local',
      password: 'Password123!',
    });
    communityId = await createCommunityAs(ctx, owner);
    await joinCommunity(ctx, communityId, owner, member, 'member');
    await joinCommunity(ctx, communityId, owner, resident, 'resident');
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('la residente no accede; el propietario lee pero no sube', async () => {
    const residentRead = await ctx.request(
      `/api/communities/${communityId}/documents`,
      { cookie: resident.cookie },
    );
    expect(residentRead.status).toBe(403);

    const memberRead = await ctx.request(`/api/communities/${communityId}/documents`, {
      cookie: member.cookie,
    });
    expect(memberRead.status).toBe(200);
    await expect(memberRead.json()).resolves.toEqual([]);

    const memberUpload = await upload(member.cookie, validBody);
    expect(memberUpload.status).toBe(403);
  });

  it('el presidente sube un documento al almacén privado', async () => {
    const res = await upload(owner.cookie, validBody);
    expect(res.status).toBe(201);
    const document = (await res.json()) as Document;
    expect(document.title).toBe('Acta de la junta');
    expect(document.uploadedByName).toBe('Elena Presidenta');
    expect(document.sizeBytes).toBeGreaterThan(0);
    documentId = document.id;

    // El binario vive fuera de la BD: solo su clave en el almacén.
    const keys = [...ctx.storage.objects.keys()];
    expect(
      keys.some((key) => key.startsWith(`communities/${communityId}/documents/`)),
    ).toBe(true);
    storageKey = keys.find((key) =>
      key.startsWith(`communities/${communityId}/documents/`),
    )!;
  });

  it('valida tipo de contenido, vacío y tamaño máximo', async () => {
    const wrongType = await upload(owner.cookie, {
      ...validBody,
      contentType: 'application/zip',
    });
    expect(wrongType.status).toBe(400);

    const empty = await upload(owner.cookie, { ...validBody, contentBase64: '' });
    expect(empty.status).toBe(400);

    const oversized = Buffer.alloc(MAX_FILE_BYTES + 1, 7).toString('base64');
    const tooBig = await upload(owner.cookie, {
      ...validBody,
      contentBase64: oversized,
    });
    expect(tooBig.status).toBe(400);
  });

  it('la descarga entrega una URL firmada, nunca una pública', async () => {
    const forbidden = await ctx.request(
      `/api/communities/${communityId}/documents/${documentId}/download`,
      { cookie: resident.cookie },
    );
    expect(forbidden.status).toBe(403);

    const res = await ctx.request(
      `/api/communities/${communityId}/documents/${documentId}/download`,
      { cookie: member.cookie },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { url: string; expiresInSeconds: number };
    expect(body.url).toContain('signed');
    expect(body.expiresInSeconds).toBe(600);
    expect(body.url).not.toContain(SAMPLE_PDF_BASE64);
  });

  it('solo admin elimina (y el binario desaparece del almacén)', async () => {
    expect(ctx.storage.objects.has(storageKey)).toBe(true);

    const forbidden = await ctx.request(
      `/api/communities/${communityId}/documents/${documentId}`,
      { method: 'DELETE', cookie: member.cookie },
    );
    expect(forbidden.status).toBe(403);

    const deleteRes = await ctx.request(
      `/api/communities/${communityId}/documents/${documentId}`,
      { method: 'DELETE', cookie: owner.cookie },
    );
    expect(deleteRes.status).toBe(200);
    expect(ctx.storage.objects.has(storageKey)).toBe(false);

    const audit = await ctx.request(
      `/api/communities/${communityId}/audit-events?limit=20`,
      { cookie: owner.cookie },
    );
    const actions = ((await audit.json()) as Array<{ action: string }>).map(
      (event) => event.action,
    );
    expect(actions).toContain('document.uploaded');
    expect(actions).toContain('document.deleted');
  });
});
