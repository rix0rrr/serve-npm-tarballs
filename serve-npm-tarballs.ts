import * as yargs from 'yargs';
import * as childProcess from 'child_process';

// No types :(
const { default: startVerdaccio } = require('verdaccio');

async function main() {
  const argv = yargs
    .usage('$0 [options] COMMAND [...]')
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      desc: 'Increase logging verbosity',
      count: true,
      default: 0
    })
    .option('directory', {
      alias: 'd',
      type: 'string',
      requiresArg: true,
      desc: 'Serve *.tgz files from the given directory',
      default: '.',
    })
    .option('log', {
      alias: 'l',
      type: 'string',
      requiresArg: true,
      desc: 'Write logs to the given file',
    })
    .option('log-level', {
      alias: 'L',
      type: 'string',
      requiresArg: true,
      desc: 'Log level to log to file with',
      default: 'info'
    })
    .help()
    .strict()
    .version()
    .showHelpOnFail(false)
    .argv;

  if (argv._.length === 0) {
    throw new Error(`Usage: serve-npm-tarballs COMMAND`);
  }

  if (!argv.verbose) {
    debug = () => undefined;
  }

  const port = 6000;

  const configJson = {
    storage: argv.directory,
    uplinks: {
      npmjs: {
        url: 'https://registry.npmjs.org',
        cache: false
      }
    },
    max_body_size: '100mb',
    publish: {
      allow_offline: true
    },
    logs: [
      ...argv.log ? [{ type: 'file', path: argv.log, format: 'pretty', level: argv["log-level"] }] : [],
      ...argv.verbose ? [{ type: 'stderr', format: 'pretty', level: argv["log-level"] }] : [],
    ],
    packages: {
      '@aws-cdk/core': {
        access: '$all',
        publish: '$all',
      },
      '**': {
        access: '$all',
        publish: '$all',
        proxy: 'npmjs',
      }
    },
  };

  startVerdaccio(configJson, port, argv.directory, '0.1.0', 'serve-npm-tarballs+verdaccio', (webServer: any, addr: any, _pkgName: any, _pkgVersion: any) => {
    webServer.listen(addr.port || addr.path, addr.host, async () => {
      debug('Verdaccio running');

      // Disable SIGINT handling just before starting the subprocess, so the subprocess
      // completely gets to decide what to do with Ctrl-C.
      process.on('SIGINT', () => undefined);
      try {
        await invokeSubprocess(argv._, {
          verbose: argv.verbose > 0
        });

        debug('Subprocess finished');
      } catch (e) {
        console.error(e.message);
        process.exitCode = 1;
      }

      webServer.close();
    });
  });
}

let debug = (message: string) => {
  console.error('>', message);
};

export interface ShellOptions extends childProcess.SpawnOptions {
  verbose?: boolean;
}

export async function invokeSubprocess(command: string[], options: ShellOptions = {}): Promise<string> {
  if (options.verbose) {
    debug(`Executing '${command.join(' ')}'`);
  }
  const child = childProcess.spawn(command[0], command.slice(1), {
    ...options,
    stdio: 'inherit',
  });

  return new Promise<string>((resolve, reject) => {
    child.once('error', reject);

    child.once('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command '${command}' exited with error code ${code}`));
      }
    });
  });
}


main().catch(e => {
  console.error(e);
  process.exitCode = 1;
});