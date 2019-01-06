export function defineCachedGetter(proto, propertyName, fn) {
  Object.defineProperty(proto, propertyName, {
    get() {
      if (this === proto || this === undefined) {
        return;
      }
      const result = fn.call(this, this);
      Object.defineProperty(this, propertyName, {
        configurable: true,
        enumerable: false,
        value: result,
      });
      return result;
    },
    configurable: true,
    enumerable: false,
  });
}
