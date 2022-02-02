import * as esbuild from 'esbuild-wasm';

export const unpkgPathPlugin = () => {
  return {
    name: 'unpkg-path-plugin', // just a name to setup the plugin
    setup(build: esbuild.PluginBuild) {
      // we are intercepting and replacing esbuild's process of using the FILE SYSTEM to find packages
      // the "onResolve" step is the step to figuring out "where this file is stored"
      build.onResolve({ filter: /.*/ }, async (args: any) => {
        console.log('onResole', args);
        return { path: args.path, namespace: 'a' };
      });

      // here we are intercepting and replacing esbuild's default / natural way of loading a file - through the FILE SYSTEM
      // we are saying esbuild you don't need to load anything from our file system, we will give it to you directly!
      build.onLoad({ filter: /.*/ }, async (args: any) => {
        console.log('onLoad', args);

        if (args.path === 'index.js') {
          return {
            loader: 'jsx',
            contents: `
              import message from './message';
              console.log(message);
            `,
          };
        } else {
          return {
            loader: 'jsx',
            contents: 'export default "hi there!"',
          };
        }
      });
    },
  };
};
