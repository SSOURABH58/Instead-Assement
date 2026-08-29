import { ConditionOperator, RenderCondition } from '../types/schema.js';

export class PathResolver {
  /**
   * Resolves a deeply nested value from a data context using dot/bracket/filter path syntax.
   * Examples:
   *  - 'taxpayer.personalInfo.ssn'
   *  - 'taxpayer.dependents[0].firstName'
   *  - 'schedules[?(@.type=="C")].netProfit'
   *  - 'taxpayer.contact.phone.areaCode'
   */
  public static resolve(data: any, path: string, fallbackValue: any = undefined): any {
    if (!path || path.trim() === '') {
      return fallbackValue;
    }

    if (data === null || data === undefined) {
      return fallbackValue;
    }

    try {
      const result = this.evaluatePath(data, path.trim());
      return result !== undefined && result !== null ? result : fallbackValue;
    } catch {
      return fallbackValue;
    }
  }

  /**
   * Evaluates conditional rendering rules against data context.
   */
  public static evaluateCondition(data: any, condition?: RenderCondition): boolean {
    if (!condition) {
      return true;
    }

    const actualValue = this.resolve(data, condition.path);

    switch (condition.operator) {
      case ConditionOperator.EQUALS:
        return actualValue === condition.value;

      case ConditionOperator.NOT_EQUALS:
        return actualValue !== condition.value;

      case ConditionOperator.GREATER_THAN:
        return typeof actualValue === 'number' && actualValue > Number(condition.value);

      case ConditionOperator.LESS_THAN:
        return typeof actualValue === 'number' && actualValue < Number(condition.value);

      case ConditionOperator.EXISTS:
        return actualValue !== undefined && actualValue !== null && actualValue !== '';

      case ConditionOperator.IN:
        return Array.isArray(condition.value) && condition.value.includes(actualValue);

      case ConditionOperator.IS_TRUE:
        return Boolean(actualValue) === true;

      default:
        return true;
    }
  }

  private static evaluatePath(data: any, path: string): any {
    const segments = this.tokenizePath(path);
    let current = data;

    for (const segment of segments) {
      if (current === null || current === undefined) {
        return undefined;
      }

      if (segment.type === 'PROPERTY' && segment.value !== undefined) {
        current = current[segment.value];
      } else if (segment.type === 'INDEX' && segment.index !== undefined) {
        if (!Array.isArray(current)) {
          return undefined;
        }
        current = current[segment.index];
      } else if (segment.type === 'FILTER') {
        if (!Array.isArray(current)) {
          return undefined;
        }
        current = this.applyFilter(current, segment.filterProp, segment.filterOp, segment.filterVal);
      }
    }

    return current;
  }

  private static tokenizePath(path: string): Array<{
    type: 'PROPERTY' | 'INDEX' | 'FILTER';
    value?: string;
    index?: number;
    filterProp?: string;
    filterOp?: string;
    filterVal?: any;
  }> {
    const tokens: Array<{
      type: 'PROPERTY' | 'INDEX' | 'FILTER';
      value?: string;
      index?: number;
      filterProp?: string;
      filterOp?: string;
      filterVal?: any;
    }> = [];

    let i = 0;
    const len = path.length;
    let buffer = '';

    while (i < len) {
      const char = path[i];

      if (char === '.') {
        if (buffer.length > 0) {
          tokens.push({ type: 'PROPERTY', value: buffer });
          buffer = '';
        }
        i++;
      } else if (char === '[') {
        if (buffer.length > 0) {
          tokens.push({ type: 'PROPERTY', value: buffer });
          buffer = '';
        }

        const closeIdx = path.indexOf(']', i);
        if (closeIdx === -1) {
          buffer += char;
          i++;
          continue;
        }

        const bracketContent = path.substring(i + 1, closeIdx).trim();

        if (bracketContent.startsWith('?(') && bracketContent.endsWith(')')) {
          const expr = bracketContent.substring(2, bracketContent.length - 1).trim();
          const filter = this.parseFilterExpression(expr);
          if (filter) {
            tokens.push({
              type: 'FILTER',
              filterProp: filter.prop,
              filterOp: filter.op,
              filterVal: filter.val,
            });
          }
        } else if (/^\d+$/.test(bracketContent)) {
          tokens.push({ type: 'INDEX', index: parseInt(bracketContent, 10) });
        } else if (
          (bracketContent.startsWith("'") && bracketContent.endsWith("'")) ||
          (bracketContent.startsWith('"') && bracketContent.endsWith('"'))
        ) {
          tokens.push({ type: 'PROPERTY', value: bracketContent.slice(1, -1) });
        } else {
          tokens.push({ type: 'PROPERTY', value: bracketContent });
        }

        i = closeIdx + 1;
      } else {
        buffer += char;
        i++;
      }
    }

    if (buffer.length > 0) {
      tokens.push({ type: 'PROPERTY', value: buffer });
    }

    return tokens;
  }

  private static parseFilterExpression(expr: string): { prop: string; op: string; val: any } | null {
    const match = expr.match(/@\.([a-zA-Z0-9_]+)\s*(==|!=|>|<|>=|<=)\s*(.*)/);
    if (!match) return null;

    const prop = match[1];
    const op = match[2];
    const valStr = match[3].trim();

    let val: any = valStr;
    if (
      (valStr.startsWith("'") && valStr.endsWith("'")) ||
      (valStr.startsWith('"') && valStr.endsWith('"'))
    ) {
      val = valStr.slice(1, -1);
    } else if (valStr === 'true') {
      val = true;
    } else if (valStr === 'false') {
      val = false;
    } else if (!isNaN(Number(valStr))) {
      val = Number(valStr);
    }

    return { prop, op, val };
  }

  private static applyFilter(array: any[], prop?: string, op?: string, targetVal?: any): any {
    if (!prop || !op) return array[0];

    const match = array.find((item) => {
      if (!item || typeof item !== 'object') return false;
      const actual = item[prop];
      if (op === '==' || op === '===') return actual == targetVal;
      if (op === '!=' || op === '!==') return actual != targetVal;
      if (op === '>') return actual > targetVal;
      if (op === '<') return actual < targetVal;
      if (op === '>=') return actual >= targetVal;
      if (op === '<=') return actual <= targetVal;
      return false;
    });

    return match;
  }
}
