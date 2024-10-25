import type { CompilationTargets, BinaryTargets } from '@/types/build';
import { build, $, type BuildConfig } from 'bun';
import { mkdir } from 'node:fs/promises';
import { execSync } from 'child_process';

const COMPILATION_TARGETS: CompilationTargets = {
  javascript: true,
  binary: true,
  binaryTargets: ['bun-linux-x64-modern', 'bun-linux-x64'],
  binaryType: 'js',
};

let entrypoints = ['./src/index.ts'];

const buildConfig: BuildConfig = {
  entrypoints: entrypoints,
  outdir: './dist',
  target: 'bun',
  format: 'esm',
  splitting: false,
  plugins: [],
  external: [],
  packages: 'bundle',
  publicPath: '/public',
  minify: true,
  sourcemap: 'none',
  conditions: ['exports', 'development'],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.versions.electron': '',
  },
  jsx: {
    runtime: 'automatic',
  },
  banner: `// Bundled using ${process.platform === 'linux' ? execSync('lsb_release -d').toString().trim().replace('Description:\t', '') : process.platform} on ${new Date()}`,
  footer: '',
} as BuildConfig;

// Main function to handle the build process
const main = async () => {
  await $`rm -rf ./dist/`;

  if (COMPILATION_TARGETS.javascript) {
    console.log(
      `Transpiling ${entrypoints.join(', ')} (${entrypoints.length} file${entrypoints.length > 1 ? 's' : ''}) to javascript`,
    );
    await mkdir('./dist/', { recursive: true });

    const js = await build(buildConfig);

    if (js.success === true) {
      console.log(
        `Successfully transpiled ${entrypoints.length} file${entrypoints.length > 1 ? 's' : ''} to javascript`,
      );
    } else {
      console.error(`Failed to transpile JavaScript. Error: ${js.logs}`);
      return; // Stop further execution if compilation fails
    }
  }

  if (COMPILATION_TARGETS.binary) {
    const successfulCompilations: string[] = [];

    if (COMPILATION_TARGETS.binaryType === 'js') {
      entrypoints = ['./dist/index.js'];
    }

    const compile = async (target: BinaryTargets) => {
      if (
        (
          await $`bun build ${entrypoints[0]} --compile --outfile ./dist/bin/liteproxy-${target}`
        ).exitCode === 0
      ) {
        successfulCompilations.push(target);
      } else {
        console.log(`Failed to compile to binary with target ${target}`);
      }
    };

    console.log(
      `Compiling ${entrypoints.join(', ')} (${entrypoints.length} file${entrypoints.length > 1 ? 's' : ''}) to binary`,
    );
    await mkdir('./dist/bin/', { recursive: true });

    await Promise.all(COMPILATION_TARGETS.binaryTargets.map(compile));

    if (successfulCompilations.length > 0) {
      console.log(
        `Successfully compiled ${successfulCompilations.length} target${successfulCompilations.length > 1 ? 's' : ''} to binary with targets: ${successfulCompilations.join(', ')}`,
      );
    } else {
      console.log(
        `Failed compilation of ${successfulCompilations.length} target${successfulCompilations.length > 1 ? 's' : ''} to binary with targets: ${successfulCompilations.join(', ')}`,
      );
    }
  }
};

// Call the main function
main().catch(error => {
  console.error('An error occurred during the build process:', error);
});