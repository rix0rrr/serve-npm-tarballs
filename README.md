# serve-npm-tarballs

A teensy little utility to serve NPM tarballs for testing purposes.

If you want to integration tests your (set of) NPM tarballs, you might
run into behaviors of `npm install` that are slightly different depending
on whether you're installing from a registry or running `npm install <file>.tgz`.

This tool helps make testing the same as for your users.

## Usage

Basic usage:

```
serve-npm-tarballs [options] [COMMAND [...]]

Options:
  --verbose, -v        Increase logging verbosity           [count] [default: 0]
  --directory, -d      Serve all *.tgz files from the given directory   [string]
  --glob, -g           Serve all tarballs matching the given glob       [string]
  --log, -l            Write logs to the given file                     [string]
  --port, -p           Port number to serve on          [number] [default: 4873]
  --log-level, -L      Log level to log to file with  [string] [default: "info"]
  --hide-upstream, -H  Hide upstream packages matching this filename mask (may
                       be repeated)                        [array] [default: []]
  --hide-tarballs, -h  Hide all packages found in *.tgz in the --directory from
                       upstream (hides all versions)                   [boolean]
  --daemon, -D         Run as a daemon. Output environment variables to interace
                       with the daemon on stdout, ready to be eval'ed  [boolean]
  --help               Show help                                       [boolean]
  --version            Show version number                             [boolean]
```

The tool can be used in two ways:

* Runs a subcommand and wait for it to exit.
* Run as a daemon

## Run a subcommand

Convenient if you just need to run a single script against a mock repo:

```
serve-npm-tarballs [options] -- ./some-script-that-uses-npm.sh
```

The subcommand will be run with a modified environment so that all invocations
of `npm` will automatically hit the fake registry.

## Daemon mode

Appropriate for integrating into a more complex bash workflow:

```
eval $(serve-npm-tarballs [options] --daemon)
trap "kill $SERVE_NPM_TARBALLS_PID" EXIT

# ...continue script...
```

The main invocation will output `export VAR=value` statements to stdout,
which can be eval'ed in a bash script. The server will continue to run
in the background while your script does something else.

The environment variables will configure NPM to hit the mock registry.

Don't forget to kill the server before your script exits.

# Packages and hiding

## Packages served

By default, packages from packed tarballs in a directory are served:

```
# Serve tarballs from directory
serve-npm-tarballs -d DIRECTORY [...]
```

Will serve all files called `*.tgz` as NPM packages from the given directory
from the repository (default: current directory).

Additional packages can be published later on by running `npm publish`, but
ONLY if their upstream versions are 'hidden' (see below). Otherwise,
Verdaccio will first retrieve the upstream version and then refuse to
publish the new version. `--force` won't help, [see here](https://github.com/verdaccio/verdaccio/issues/1435).

## Hiding

By default, all package versions that haven't been published into the mock
repository are transparently downloaded from the upstream repository
(`npmjs.com`).

If you want to ensure some kind of isolation and prevent against versioning
mistakes, you can prevent packages with certain names or name patterns from
being downloaded from the upstream repository. If they're not found in the mock
directory, then they won't be found in the registry at all (See [Verdaccio
docs](https://verdaccio.org/docs/en/packages)).

```
# Prevent all packages named @mycorp/* from being proxied
serve-npm-tarballs -d DIRECTORY -H @mycorp/\* [...]
```

You can also automatically prevent proxying for all package names found in
the collection of tarballs:

```
# Prevent all other versions of packages in DIRECTORY from being proxied
serve-npm-tarballs -d DIRECTORY -h
```
