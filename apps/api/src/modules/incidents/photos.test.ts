import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestContext, TestUser } from '../../test/test-context';
import {
  createCommunityAs,
  createTestContext,
  joinCommunity,
} from '../../test/test-context';

interface Incident {
  id: string;
  title: string;
  photos: Array<{
    id: string;
    contentType: string;
    sizeBytes: number;
    uploadedByName: string | null;
  }>;
}

interface Photo {
  id: string;
  contentType: string;
  uploadedByName: string | null;
}

const SAMPLE_PNG_BASE64 = Buffer.from('datos-de-imagen-de-prueba').toString('base64');

describe('Fotografías de incidencias', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let member: TestUser;
  let resident: TestUser;
  let communityId: string;
  let incidentId: string;
  let residentPhotoId: string;

  const uploadPhoto = (
    cookie: string,
    body: Record<string, unknown>,
  ): Promise<Response> =>
    ctx.request(`/api/communities/${communityId}/incidents/${incidentId}/photos`, {
      method: 'POST',
      cookie,
      body,
    });

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

    const incidentRes = await ctx.request(`/api/communities/${communityId}/incidents`, {
      method: 'POST',
      cookie: resident.cookie,
      body: {
        title: 'Gotera del parking',
        description: 'Se ve una mancha húmeda en la losa.',
      },
    });
    expect(incidentRes.status).toBe(201);
    incidentId = ((await incidentRes.json()) as Incident).id;
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('cualquier miembro adjunta fotos y aparecen en la incidencia', async () => {
    const res = await uploadPhoto(resident.cookie, {
      contentType: 'image/png',
      contentBase64: SAMPLE_PNG_BASE64,
    });
    expect(res.status).toBe(201);
    const photo = (await res.json()) as Photo;
    expect(photo.uploadedByName).toBe('Rosa Residente');
    residentPhotoId = photo.id;

    const list = await ctx.request(`/api/communities/${communityId}/incidents`, {
      cookie: member.cookie,
    });
    const incidents = (await list.json()) as Incident[];
    const incident = incidents.find((row) => row.id === incidentId);
    expect(incident?.photos).toHaveLength(1);
    expect(incident?.photos[0]?.id).toBe(residentPhotoId);

    // El binario vive en el almacén, no en la base de datos.
    expect(
      [...ctx.storage.objects.keys()].some(
        (key) => key.includes('/incidents/') && key.includes('/photos/'),
      ),
    ).toBe(true);
  });

  it('solo admite imágenes y respeta el límite de tamaño', async () => {
    const wrongType = await uploadPhoto(member.cookie, {
      contentType: 'application/pdf',
      contentBase64: SAMPLE_PNG_BASE64,
    });
    expect(wrongType.status).toBe(400);
  });

  it('la descarga usa URL firmada y es accesible a cualquier miembro', async () => {
    const res = await ctx.request(
      `/api/communities/${communityId}/incidents/${incidentId}/photos/${residentPhotoId}/download`,
      { cookie: member.cookie },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { url: string; expiresInSeconds: number };
    expect(body.url).toContain('signed');
    expect(body.expiresInSeconds).toBe(600);
  });

  it('borra quien la subió o la administración (no otros miembros)', async () => {
    const byStranger = await ctx.request(
      `/api/communities/${communityId}/incidents/${incidentId}/photos/${residentPhotoId}`,
      { method: 'DELETE', cookie: member.cookie },
    );
    expect(byStranger.status).toBe(403);

    const byAdmin = await ctx.request(
      `/api/communities/${communityId}/incidents/${incidentId}/photos/${residentPhotoId}`,
      { method: 'DELETE', cookie: owner.cookie },
    );
    expect(byAdmin.status).toBe(200);

    const audit = await ctx.request(
      `/api/communities/${communityId}/audit-events?limit=20`,
      { cookie: owner.cookie },
    );
    const actions = ((await audit.json()) as Array<{ action: string }>).map(
      (event) => event.action,
    );
    expect(actions).toContain('incident.photo_added');
    expect(actions).toContain('incident.photo_removed');
  });

  it('la foto no puede servirse desde otra incidencia (404 cruzado)', async () => {
    const fresh = await uploadPhoto(resident.cookie, {
      contentType: 'image/jpeg',
      contentBase64: SAMPLE_PNG_BASE64,
    });
    expect(fresh.status).toBe(201);
    const freshPhoto = (await fresh.json()) as Photo;

    const other = await ctx.request(`/api/communities/${communityId}/incidents`, {
      method: 'POST',
      cookie: owner.cookie,
      body: { title: 'Otra incidencia', description: 'Detalle.' },
    });
    const otherId = ((await other.json()) as Incident).id;

    const res = await ctx.request(
      `/api/communities/${communityId}/incidents/${otherId}/photos/${freshPhoto.id}/download`,
      { cookie: owner.cookie },
    );
    expect(res.status).toBe(404);
  });
});
