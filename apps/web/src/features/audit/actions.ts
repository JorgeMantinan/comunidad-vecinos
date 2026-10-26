/**
 * Etiquetas en español de las acciones de auditoría: en la interfaz se
 * muestra el texto humano y el código original queda en el `title`
 * (útil a la administración para reportar incidencias).
 *
 * Si aparece una acción sin etiqueta, se muestra tal cual: mejor ver el
 * código que perder el evento.
 */
export const auditActionLabels: Record<string, string> = {
  'community.created': 'Comunidad creada',
  'member.role_changed': 'Rol de un miembro cambiado',
  'member.removed': 'Miembro dado de baja',

  'announcement.created': 'Aviso publicado',
  'announcement.updated': 'Aviso editado',
  'announcement.deleted': 'Aviso eliminado',

  'meeting.created': 'Reunión convocada',
  'meeting.updated': 'Reunión editada',
  'meeting.deleted': 'Reunión eliminada',
  'agenda.item_added': 'Punto añadido al orden del día',
  'agenda.item_updated': 'Punto del orden del día editado',
  'agenda.item_removed': 'Punto del orden del día eliminado',
  'agreement.created': 'Acuerdo propuesto',
  'agreement.status_changed': 'Estado de un acuerdo cambiado',

  'expense.created': 'Gasto registrado',
  'expense.updated': 'Gasto editado',
  'expense.paid': 'Gasto marcado como pagado',
  'expense.deleted': 'Gasto eliminado',
  'invoice.created': 'Factura registrada',
  'invoice.updated': 'Factura editada',
  'invoice.paid': 'Factura marcada como pagada',
  'invoice.deleted': 'Factura eliminada',

  'assessment.created': 'Derrama creada',
  'assessment.charge_paid': 'Cuota de derrama cobrada',
  'assessment.deleted': 'Derrama eliminada',

  'fee_tariff.created': 'Tarifa de cuota creada',
  'fee_tariff.updated': 'Tarifa de cuota editada',
  'fee_tariff.deleted': 'Tarifa de cuota eliminada',
  'fee_charges.generated': 'Cuotas de un periodo generadas',
  'fee_charge.paid': 'Cuota cobrada',
  'fee_charge.unpaid': 'Cobro de cuota deshecho',

  'unit.created': 'Unidad añadida',
  'unit.deleted': 'Unidad eliminada',

  'incident.created': 'Incidencia reportada',
  'incident.updated': 'Incidencia editada',
  'incident.status_changed': 'Estado de la incidencia cambiado',
  'incident.resolved': 'Incidencia resuelta',
  'incident.photo_added': 'Foto añadida a una incidencia',
  'incident.photo_removed': 'Foto eliminada de una incidencia',
  'incident.deleted': 'Incidencia eliminada',

  'task.created': 'Tarea creada',
  'task.updated': 'Tarea editada',
  'task.recurred': 'Tarea repetitiva renovada',
  'task.deleted': 'Tarea eliminada',

  'suggestion.created': 'Sugerencia enviada',
  'suggestion.status_changed': 'Estado de una sugerencia cambiado',
  'suggestion.deleted': 'Sugerencia eliminada',

  'poll.created': 'Encuesta creada',
  'poll.closed': 'Encuesta cerrada',
  'poll.deleted': 'Encuesta eliminada',

  'document.uploaded': 'Documento subido',
  'document.generated': 'Documento generado desde plantilla',
  'document.deleted': 'Documento eliminado',
  'template.created': 'Plantilla creada',
  'template.updated': 'Plantilla editada',
  'template.deleted': 'Plantilla eliminada',

  'professional.created': 'Profesional añadido',
  'professional.updated': 'Profesional editado',
  'professional.deleted': 'Profesional eliminado',

  'contract.created': 'Contrato registrado',
  'contract.deleted': 'Contrato eliminado',

  'asset.created': 'Elemento añadido al inventario',
  'asset.updated': 'Elemento del inventario editado',
  'asset.deleted': 'Elemento eliminado del inventario',

  'invitation.created': 'Invitación enviada',
  'invitation.accepted': 'Invitación aceptada',
  'invitation.revoked': 'Invitación revocada',

  'sponsorship.created': 'Anuncio creado',
  'sponsorship.updated': 'Anuncio actualizado',
  'sponsorship.deleted': 'Anuncio eliminado',
};

/** Etiqueta legible de una acción; si no la conoce, devuelve el código. */
export function auditActionLabel(action: string): string {
  return auditActionLabels[action] ?? action;
}
