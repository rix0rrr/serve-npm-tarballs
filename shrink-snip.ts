import * as fs from 'fs';

// Snip subtrees of packages from npm-shrinkwrap.json
const shrinkwrap = require('./npm-shrinkwrap.json');
const packageJson = require('./package.json');

const directDeps = [
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.devDependencies ?? {}),
];


// Snip snip
delete shrinkwrap.dependencies['@verdaccio/local-storage'].requires['level'];
delete shrinkwrap.dependencies['bunyan'].requires['dtrace-provider'];

let changes;
do {
  changes = false;
  removeObsoletePackages(shrinkwrap);
} while(changes);

fs.writeFileSync('npm-shrinkwrap.json', JSON.stringify(shrinkwrap, undefined, 2), { encoding: 'utf-8' });

function removeObsoletePackages(scope: { dependencies?: Record<string, any>}) {
  if (!scope.dependencies) { return; }

  for (const name of Object.keys(scope.dependencies)) {
    if (!directDeps.includes(name) && !doesAnythingDependOn(name, scope)) {
      delete scope.dependencies[name];
      changes = true;
    }
  }
}

/**
 * Ignores versions
 */
function doesAnythingDependOn(packageName: string, scope: { dependencies?: Record<string, any>}) {
  for (const pkg of Object.values(scope.dependencies ?? {})) {
    const requires = Object.keys(pkg.requires ?? {});
    if (requires.includes(packageName)) { return true; }
    if (doesAnythingDependOn(packageName, pkg)) { return true; }
  }
  return false;
}

