import { describe, expect, it } from 'vitest';
import { resolvedJokers } from '../src/engine/inventory';
import type { JokerInstance } from '../src/engine/state';

const inst = (id: string, uid: string): JokerInstance => ({ uid, id, state: {}, cost: 1 });

describe('Boto Cor-de-Rosa: cópia total do Coringa à direita', () => {
  it('assume a definição inteira do vizinho da direita, com o estado dele', () => {
    const boto = inst('boto', 'b');
    const mula = inst('mula', 'm');
    const [r] = resolvedJokers([boto, mula]);
    expect(r.owner).toBe(boto);
    expect(r.self).toBe(mula);
    expect(r.def.id).toBe('mula');
  });

  it('sem vizinho à direita, não copia nada', () => {
    expect(resolvedJokers([inst('mula', 'm'), inst('boto', 'b')])).toHaveLength(1);
  });

  it('não copia outro Boto (evita loop)', () => {
    expect(resolvedJokers([inst('boto', 'b1'), inst('boto', 'b2')])).toHaveLength(0);
  });
});
