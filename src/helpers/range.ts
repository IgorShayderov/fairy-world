type Range = {
  from: number;
  to: number;
  isExclusive: boolean;
};

/**
 * Range
 * @param {Range} this - Range constructor
 * @param {number} from - Starting number
 * @param {number} to - End number
 * @param {boolean} isExclusive - Exclude last number
 */
function Range(
  this: Range,
  from: number,
  to: number,
  isExclusive = false
): void {
  if (to === 0) {
    throw new Error("To can't be zero.");
  }

  if (to < from) {
    throw new Error("To can't be lower than from.");
  }

  if (isExclusive && to <= from) {
    throw new Error('To should be higher than from at least by one.');
  }

  this.from = from;
  this.to = to;
  this.isExclusive = isExclusive;
}

Range.prototype[Symbol.iterator] = function () {
  return {
    current: this.from,
    last: this.isExclusive ? this.to - 1 : this.to,
    next() {
      if (this.current <= this.last) {
        return { done: false, value: this.current++ };
      }

      return { done: true };
    },
  };
};

export default Range;
