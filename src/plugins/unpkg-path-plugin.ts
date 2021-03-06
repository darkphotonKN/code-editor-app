import * as esbuild from 'esbuild-wasm';
import axios from 'axios';
import localForage from 'localforage';

// using IndexedDB to store cached items for performance gains

const fileCache = localForage.createInstance({
  name: 'filecache',
});

export const unpkgPathPlugin = (inputCode: string) => {
  return {
    name: 'unpkg-path-plugin', // just a name to setup the plugin
    setup(build: esbuild.PluginBuild) {
      // we are intercepting and replacing esbuild's process of using the FILE SYSTEM to find packages
      // the "onResolve" step is the step to figuring out "where this file is stored"
      // * this is the standard way to override the default way packaging bundlers try to find files *
      build.onResolve({ filter: /.*/ }, async (args: any) => {
        console.log('onResolve', args);
        if (args.path === 'index.js') {
          return { path: args.path, namespace: 'a' };
        }

        // working on a file with a relative path we need to create the correct relative final path for esbuild
        if (args.path.includes('./') || args.path.includes('../')) {
          console.log('args.path:', args.path);
          console.log('args.importer:', args.importer);
          // creates a new concatenated url from importer and new path
          // made relative by adding a "/" at the end of the importer's url
          // const relativePath = new URL(args.path, `${args.importer}/`).href;
          // on top of the above - we might need account for nested requires / imports:
          const relativePath = new URL(
            args.path,
            'https://unpkg.com' + args.resolveDir + '/'
          ).href;

          console.log('relativePath:', relativePath);
          return { path: relativePath, namespace: 'a' };
        }

        return {
          path: `https://unpkg.com/${args.path}`,
          namespace: 'a',
        };
      });

      // here we are intercepting and replacing esbuild's default / natural way of loading a file - through the FILE SYSTEM
      // we are saying esbuild you don't need to load anything from our file system, we will give it to you directly!
      // * this is the standard way to override the default way packaging bundlers try to load files *
      build.onLoad({ filter: /.*/ }, async (args: any) => {
        console.log('onLoad', args);

        if (args.path === 'index.js') {
          return {
            loader: 'jsx',
            contents: inputCode,
          };
        } else {
          // check if result was already cached before to prevent re-fetching data via network requests
          const cachedResult = await fileCache.getItem<esbuild.OnLoadResult>(
            args.path
          ); // using the (most often) unique paths as identifiers

          if (cachedResult) {
            return cachedResult;
          }

          // fetch the data via axios
          const { data, request } = await axios.get(args.path);

          console.log('request:', request);
          const result: esbuild.OnLoadResult = {
            loader: 'jsx',
            contents: data,
            // tells esbuild where we found the next package
            // request object from axios provides extra information
            // we need the responseURL here to get the correct "importer" path for esbuild onResolve
            // to create the correct path/namespace object for esbuild for nested imports/requires
            resolveDir: new URL('.', request.responseURL).pathname, // onResolve will recieve this as a property in the object passed to it's function (args.path)
          };
          // store as cache for later use, with the path as the key
          await fileCache.setItem(args.path, result);

          return result;
        }
      });
    },
  };
};
