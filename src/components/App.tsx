import * as esbuild from 'esbuild-wasm';
import { useState, useEffect, useRef } from 'react';
import { unpkgPathPlugin } from '../plugins/unpkg-path-plugin';

const App = () => {
  const ref = useRef<any>(); // to store ESBUILD object for transpiling code
  const [input, setInput] = useState<string>('');
  const [code, setCode] = useState<any>('');

  useEffect(() => {
    startService(); // initiate ESBUILD service
  }, []);

  console.log('input:', input, ' code:', code, ' ref.current', ref);

  const handleSubmitCode = async () => {
    if (!ref.current) return;

    // transpile with esbuild (old version - with default esbuild)
    // const transpiledCode = await ref.current.transform(input, {
    //   loader: 'jsx', // type of loader
    //   target: 'es2015', // transpiling process
    // });

    // new build with our custom unpkg-path-plugin to help package everything together with esbuild's transpiled code
    const result = await ref.current.build({
      entryPoints: ['index.js'],
      bundle: true,
      write: false,
      plugins: [unpkgPathPlugin()],
      define: {
        'process.env.NODE_ENV': '"production"', // whenever we find "process.env.NODE_ENV" in the code, we should replace it with the string "production"
        global: 'window', // setting for running inside the browser
      },
    });

    console.log('result:', result);
    setCode(result.outputFiles[0]);
  };

  const startService = async () => {
    // setting a global "variable" ref to hold the started service from esbuild
    // refs can hold any value and not just elements / components
    ref.current = await esbuild.startService({
      worker: true,
      wasmURL: '/esbuild.wasm',
    });
  };

  return (
    <div>
      <textarea
        onChange={(e) => setInput(e.target.value)}
        value={input}
      ></textarea>
      <div>
        <button onClick={() => handleSubmitCode()}>Submit</button>
        <pre>{code?.text}</pre>
      </div>
    </div>
  );
};

export default App;
