import { and, eq } from 'drizzle-orm';
import type { DeleteAccountResult, PersonalExport } from '@comunidad/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auditEvents, communities } from '../../db/schema';
import type { TestContext, TestUser } from '../../test/test-context';
import {
  createCommunityAs,
  createTestContext,
  joinCommunity,
} from '../../test/test-context';

const PASSWORD = 'Password123!';

describe('Cuenta personal: exportación y baja', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
  });

  afterAll(async () => {
    await ctx.close();
  });

  const signUp = (email: string): Promise<TestUser> =>
    ctx.signUp({ name: 'Persona de prueba', email, password: PASSWORD });

  const communityExists = async (id: string): Promise<boolean> => {
    const rows = await ctx.db
      .select({ id: communities.id })
      .from(communities)
      .where(eq(communities.id, id));
    return rows.length > 0;
  };

  it('exige sesión para exportar los datos', async () => {
    const res = await ctx.request('/api/account/export');
    expect(res.status).toBe(401);
  });

  it('exige sesión para darse de baja', async () => {
    const res = await ctx.request('/api/account', {
      method: 'DELETE',
      body: { password: PASSWORD, confirm: 'ELIMINAR' },
    });
    expect(res.status).toBe(401);
  });

  it('exporta solo los datos de la persona que lo pide', async () => {
    const alice = await signUp('alice-export@ejemplo.local');
    const bob = await signUp('bob-export@ejemplo.local');

    const ajena = await createCommunityAs(ctx, alice, 'Comunidad Privada De Alice');
    await ctx.request(`/api/communities/${ajena}/announcements`, {
      method: 'POST',
      cookie: alice.cookie,
      body: { title: 'Aviso solo de Alice', body: 'Contenido confidencial.' },
    });
    const propia = await createCommunityAs(ctx, bob, 'Comunidad De Bob');
    await ctx.request(`/api/communities/${propia}/announcements`, {
      method: 'POST',
      cookie: bob.cookie,
      body: { title: 'Aviso de Bob', body: 'Contenido de Bob.' },
    });

    const res = await ctx.request('/api/account/export', { cookie: bob.cookie });
    expect(res.status).toBe(200);
    const payload = (await res.json()) as PersonalExport;

    expect(payload.format).toBe('comunidad-vecinos/export-personal-v1');
    expect(payload.profile.email).toBe('bob-export@ejemplo.local');
    expect(payload.communities.map((row) => row.name)).toEqual(['Comunidad De Bob']);
    expect(payload.announcements.map((row) => row.title)).toEqual(['Aviso de Bob']);

    // Nunca aparece información de la comunidad ajena.
    const raw = JSON.stringify(payload);
    expect(raw).not.toContain('Comunidad Privada De Alice');
    expect(raw).not.toContain('alice-export@ejemplo.local');
    expect(raw).not.toContain('Contenido confidencial');
  });

  it('rechaza la baja con la contraseña incorrecta', async () => {
    const user = await signUp('wrong-pass@ejemplo.local');
    const res = await ctx.request('/api/account', {
      method: 'DELETE',
      cookie: user.cookie,
      body: { password: 'Otraclave123!', confirm: 'ELIMINAR' },
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { message: string };
    expect(body.message).toContain('contraseña');

    // La cuenta sigue viva.
    const after = await ctx.request('/api/account/export', { cookie: user.cookie });
    expect(after.status).toBe(200);
  });

  it('rechaza la baja sin la confirmación explícita', async () => {
    const user = await signUp('sin-confirm@ejemplo.local');
    const res = await ctx.request('/api/account', {
      method: 'DELETE',
      cookie: user.cookie,
      body: { password: PASSWORD, confirm: 'borrar' },
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { message: string };
    expect(body.message).toContain('ELIMINAR');
  });

  it('bloquea la baja si es la única propietaria de una comunidad con miembros', async () => {
    const owner = await signUp('presidenta-sola@ejemplo.local');
    const member = await signUp('vecina-sola@ejemplo.local');
    const id = await createCommunityAs(ctx, owner, 'Comunidad Con Miembros');
    await joinCommunity(ctx, id, owner, member, 'member');

    const res = await ctx.request('/api/account', {
      method: 'DELETE',
      cookie: owner.cookie,
      body: { password: PASSWORD, confirm: 'ELIMINAR' },
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { message: string };
    expect(body.message).toContain('Transfiere la presidencia');
    expect(await communityExists(id)).toBe(true);

    const after = await ctx.request('/api/account/export', { cookie: owner.cookie });
    expect(after.status).toBe(200);
  });

  it('elimina la cuenta y las comunidades en las que es la única persona', async () => {
    const user = await signUp('baja-total@ejemplo.local');
    const suya = await createCommunityAs(ctx, user, 'Comunidad Solo De Ella');
    await ctx.request(`/api/communities/${suya}/announcements`, {
      method: 'POST',
      cookie: user.cookie,
      body: { title: 'Aviso propio', body: 'Se borra con la cuenta.' },
    });
    const upload = await ctx.request(`/api/communities/${suya}/documents`, {
      method: 'POST',
      cookie: user.cookie,
      body: {
        title: 'Escritura privada',
        category: 'other',
        contentType: 'text/plain',
        contentBase64: Buffer.from('Documento personal.', 'utf8').toString('base64'),
      },
    });
    expect(upload.status).toBe(201);
    const keysBefore = [...ctx.storage.objects.keys()].filter((key) =>
      key.startsWith(`communities/${suya}/`),
    );
    expect(keysBefore).toHaveLength(1);

    const res = await ctx.request('/api/account', {
      method: 'DELETE',
      cookie: user.cookie,
      body: { password: PASSWORD, confirm: 'ELIMINAR' },
    });
    expect(res.status).toBe(200);
    const payload = (await res.json()) as DeleteAccountResult;
    expect(payload.deleted).toBe(true);
    expect(payload.deletedCommunities).toBe(1);

    // La comunidad propia, su contenido y sus archivos desaparecen.
    expect(await communityExists(suya)).toBe(false);
    for (const key of keysBefore) {
      expect(ctx.storage.objects.has(key)).toBe(false);
    }

    // La sesión deja de valer.
    const after = await ctx.request('/api/account/export', { cookie: user.cookie });
    expect(after.status).toBe(401);
  });

  it('permite la baja con dos propietarias y conserva la comunidad', async () => {
    const alice = await signUp('baja-con-dupla@ejemplo.local');
    const bob = await signUp('dupla-socia@ejemplo.local');
    const id = await createCommunityAs(ctx, alice, 'Comunidad Con Dupla');
    await joinCommunity(ctx, id, alice, bob, 'admin');

    // Bob pasa a propietaria: ya no hay una única responsable.
    const members = (await (
      await ctx.request(`/api/communities/${id}/members`, { cookie: alice.cookie })
    ).json()) as Array<{ id: string; userId: string }>;
    const bobMembership = members.find((row) => row.userId === bob.id);
    expect(bobMembership).toBeDefined();

    const promote = await ctx.request(
      `/api/communities/${id}/members/${bobMembership?.id}`,
      {
        method: 'PATCH',
        cookie: alice.cookie,
        body: { role: 'owner' },
      },
    );
    expect(promote.status).toBe(200);

    const res = await ctx.request('/api/account', {
      method: 'DELETE',
      cookie: alice.cookie,
      body: { password: PASSWORD, confirm: 'ELIMINAR' },
    });
    expect(res.status).toBe(200);
    const payload = (await res.json()) as DeleteAccountResult;
    expect(payload.deletedCommunities).toBe(0);
    expect(payload.removedMemberships).toBe(1);

    // La comunidad sigue viva y Bob sigue siendo miembro.
    expect(await communityExists(id)).toBe(true);
    const stillBob = await ctx.request(`/api/communities/${id}`, {
      cookie: bob.cookie,
    });
    expect(stillBob.status).toBe(200);

    // Queda constancia de la salida, con el actor ya anónimo.
    const traces = await ctx.db
      .select()
      .from(auditEvents)
      .where(
        and(eq(auditEvents.communityId, id), eq(auditEvents.action, 'member.removed')),
      );
    expect(traces).toHaveLength(1);
    expect(traces[0]?.actorId).toBeNull();
    expect(traces[0]?.metadata).toMatchObject({ reason: 'account_deleted' });
  });
});
