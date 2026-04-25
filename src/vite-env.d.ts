/// <reference types="vite/client" />

// Vite serves image assets as URL strings by default. The ambient
// declaration from vite/client covers this, but we re-declare explicitly
// so tsc (without the Vite plugin loader) also understands the import.
declare module '*.svg' {
  const src: string
  export default src
}
declare module '*.png' {
  const src: string
  export default src
}
