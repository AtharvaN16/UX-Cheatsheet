import { expect, test, describe } from 'bun:test';
import { getDomainGroup, DOMAIN_GROUPS } from './domains';

describe('getDomainGroup', () => {
  test('finds the group containing a given domain id', () => {
    const group = getDomainGroup('quantitative-research');
    expect(group?.title).toBe('Research');
  });

  test('returns undefined for an unknown domain id', () => {
    expect(getDomainGroup('not-a-real-domain')).toBeUndefined();
  });

  test('every domain in DOMAIN_GROUPS resolves back to its own group', () => {
    for (const group of DOMAIN_GROUPS) {
      for (const id of group.domainIds) {
        expect(getDomainGroup(id)?.title).toBe(group.title);
      }
    }
  });
});
