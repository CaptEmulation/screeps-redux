const _modules = {};

export function names() {
  return Object.values(_modules);
}

export default function createModule(name, module) {
  _modules[name] = module;
}
