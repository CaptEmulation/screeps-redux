// from https://gist.github.com/youssman/745578062609e8acac9f#gistcomment-2586740
export function camelCaseToDash(str) {
    return str
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/([0-9])([^0-9])/g, '$1_$2')
        .replace(/([^0-9])([0-9])/g, '$1_$2')
        .toUpperCase();
}
