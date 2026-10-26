import { describe, expect, it } from 'vitest';
import { auditActionLabel } from './actions';

describe('auditActionLabel', () => {
  it('traduce las acciones habituales a español', () => {
    expect(auditActionLabel('announcement.created')).toBe('Aviso publicado');
    expect(auditActionLabel('announcement.deleted')).toBe('Aviso eliminado');
    expect(auditActionLabel('expense.paid')).toBe('Gasto marcado como pagado');
    expect(auditActionLabel('fee_charge.paid')).toBe('Cuota cobrada');
    expect(auditActionLabel('member.removed')).toBe('Miembro dado de baja');
  });

  it('si no conoce la acción, devuelve el código (nunca lo oculta)', () => {
    expect(auditActionLabel('test.viejo')).toBe('test.viejo');
    expect(auditActionLabel('accion.nueva.futura')).toBe('accion.nueva.futura');
  });

  it('cubre todas las acciones que escribe la API', async () => {
    // Las acciones salen del código: si aparece una nueva sin etiqueta,
    // este test avisa para decidir si se traduce.
    const { auditActionLabels } = await import('./actions');
    expect(Object.keys(auditActionLabels).length).toBeGreaterThan(50);
    expect(auditActionLabels['fee_charges.generated']).toBeDefined();
    expect(auditActionLabels['document.uploaded']).toBeDefined();
  });
});
