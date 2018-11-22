const _modules = {};

export function names() {
  return Object.keys(_modules);
}

export default function createModule(name, module) {
  _modules[name] = module;
}
