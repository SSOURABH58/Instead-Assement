import { describe, it, expect } from 'vitest';
import { PathResolver } from '../src/engine/path-resolver.js';
import { ConditionOperator } from '../src/types/schema.js';

describe('PathResolver', () => {
  const sampleData = {
    taxpayer: {
      primary: {
        firstName: 'Jonathan',
        ssn: '123456789',
        income: 150000,
      },
      dependents: [
        { name: 'Lucas', age: 8, relationship: 'Son' },
        { name: 'Maya', age: 5, relationship: 'Daughter' },
      ],
    },
    schedules: [
      { type: 'A', itemizedDeductions: 18000 },
      { type: 'C', netProfit: 32500, businessName: 'Tech Consulting' },
    ],
  };

  it('resolves standard dot notation', () => {
    expect(PathResolver.resolve(sampleData, 'taxpayer.primary.firstName')).toBe('Jonathan');
    expect(PathResolver.resolve(sampleData, 'taxpayer.primary.ssn')).toBe('123456789');
  });

  it('resolves bracket array index notation', () => {
    expect(PathResolver.resolve(sampleData, 'taxpayer.dependents[0].name')).toBe('Lucas');
    expect(PathResolver.resolve(sampleData, 'taxpayer.dependents[1].age')).toBe(5);
  });

  it('resolves JSONPath filter expressions', () => {
    const netProfit = PathResolver.resolve(sampleData, 'schedules[?(@.type=="C")].netProfit');
    expect(netProfit).toBe(32500);

    const business = PathResolver.resolve(sampleData, 'schedules[?(@.type=="C")].businessName');
    expect(business).toBe('Tech Consulting');
  });

  it('returns fallback value when path does not exist', () => {
    expect(PathResolver.resolve(sampleData, 'taxpayer.spouse.ssn', 'N/A')).toBe('N/A');
    expect(PathResolver.resolve(sampleData, 'taxpayer.dependents[5].name', 'NONE')).toBe('NONE');
  });

  it('evaluates conditions accurately', () => {
    expect(
      PathResolver.evaluateCondition(sampleData, {
        path: 'taxpayer.primary.income',
        operator: ConditionOperator.GREATER_THAN,
        value: 100000,
      })
    ).toBe(true);

    expect(
      PathResolver.evaluateCondition(sampleData, {
        path: 'taxpayer.primary.firstName',
        operator: ConditionOperator.EQUALS,
        value: 'Jonathan',
      })
    ).toBe(true);

    expect(
      PathResolver.evaluateCondition(sampleData, {
        path: 'taxpayer.spouse',
        operator: ConditionOperator.EXISTS,
      })
    ).toBe(false);
  });
});
