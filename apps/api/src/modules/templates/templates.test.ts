import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestContext, TestUser } from '../../test/test-context';
import {
  createCommunityAs,
  createTestContext,
  joinCommunity,
} from '../../test/test-context';

interface Template {
  id: string;
  name: string;
  category: string;
  content: string;
  createdByName: string | null;
}

describe('Plantillas de documentos', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let member: TestUser;
  let communityId: string;
  let templateId: string;

  const createTemplate = (
    cookie: string,
    body: Record<string, unknown>,
  ): Promise<Response> =>
    ctx.request(`/api/communities/${communityId}/templates`, {
      method: 'POST',
      cookie,
      body,
    });

  const validBody = {
    name: 'Modelo de convocatoria',
    category: 'minutes',
    content:
      'CONVOCATORIA\n\nPor la presente se convoca a los propietarios…\nFirma: ____',
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
    communityId = await createCommunityAs(ctx, owner);
    await joinCommunity(ctx, communityId, owner, member, 'member');
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('las plantillas son herramienta de la administración', async () => {
    const memberRead = await ctx.request(`/api/communities/${communityId}/templates`, {
      cookie: member.cookie,
    });
    expect(memberRead.status).toBe(403);

    const memberCreate = await createTemplate(member.cookie, validBody);
    expect(memberCreate.status).toBe(403);
  });

  it('el presidente crea y edita plantillas', async () => {
    const res = await createTemplate(owner.cookie, validBody);
    expect(res.status).toBe(201);
    const template = (await res.json()) as Template;
    expect(template.createdByName).toBe('Elena Presidenta');
    templateId = template.id;

    const patch = await ctx.request(
      `/api/communities/${communityId}/templates/${templateId}`,
      {
        method: 'PATCH',
        cookie: owner.cookie,
        body: { content: `${validBody.content}\nAnexo: ____` },
      },
    );
    expect(patch.status).toBe(200);
  });

  it('genera un documento .txt en el almacén privado', async () => {
    const res = await ctx.request(
      `/api/communities/${communityId}/templates/${templateId}/generate`,
      { method: 'POST', cookie: owner.cookie, body: {} },
    );
    expect(res.status).toBe(201);
    const document = (await res.json()) as {
      title: string;
      contentType: string;
      sizeBytes: number;
    };
    expect(document.title).toBe('Modelo de convocatoria');
    expect(document.contentType).toBe('text/plain');
    expect(document.sizeBytes).toBeGreaterThan(0);

    // El binario vive en el almacén con el contenido de la plantilla.
    const generated = [...ctx.storage.objects.entries()].find(([key]) =>
      key.includes('/plantilla.txt'),
    );
    expect(generated).toBeDefined();
    expect(generated?.[1].contentType).toBe('text/plain');
    expect(Buffer.from(generated![1].body).toString('utf8')).toContain('CONVOCATORIA');

    // Y aparece en el listado de documentos.
    const list = await ctx.request(`/api/communities/${communityId}/documents`, {
      cookie: owner.cookie,
    });
    const documents = (await list.json()) as Array<{ title: string }>;
    expect(documents.map((row) => row.title)).toContain('Modelo de convocatoria');
  });

  it('audita y permite eliminar plantillas', async () => {
    const forbidden = await ctx.request(
      `/api/communities/${communityId}/templates/${templateId}`,
      { method: 'DELETE', cookie: member.cookie },
    );
    expect(forbidden.status).toBe(403);

    const deleteRes = await ctx.request(
      `/api/communities/${communityId}/templates/${templateId}`,
      { method: 'DELETE', cookie: owner.cookie },
    );
    expect(deleteRes.status).toBe(200);

    const audit = await ctx.request(
      `/api/communities/${communityId}/audit-events?limit=30`,
      { cookie: owner.cookie },
    );
    const actions = ((await audit.json()) as Array<{ action: string }>).map(
      (event) => event.action,
    );
    expect(actions).toContain('template.created');
    expect(actions).toContain('template.updated');
    expect(actions).toContain('template.deleted');
    expect(actions).toContain('document.generated');
  });
});
