import type { UnitKind } from '@comunidad/shared';

/** Etiquetas en español de los tipos de unidad (unidades y cuotas). */
export const unitKindLabels: Record<UnitKind, string> = {
  vivienda: 'Vivienda',
  garaje: 'Garaje',
  trastero: 'Trastero',
  local: 'Local',
  buzon: 'Buzón',
  plaza: 'Plaza',
};

export const unitKindOptions = Object.entries(unitKindLabels).map(([value, label]) => ({
  value: value as UnitKind,
  label,
}));
