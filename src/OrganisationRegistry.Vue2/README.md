# organisation-registry-vue2

Vue 2.7 app built with [Vite](https://vite.dev). Served below `/v2/`.

## Project setup
Uses the Node version in `.nvmrc` (Vite needs Node >= 20.19). The `@govflanders` packages need `NPM_TOKEN` to be set.
```
nvm use
npm ci --legacy-peer-deps
```

### Compiles and hot-reloads for development
```
npm run serve
```
The dev server listens on https://localhost:8443/v2/ (`npm run build && npm run preview` serves the build on the same port). The Angular dev server proxies `/v2` to it, so
https://localhost:5173/v2/ (or any host the Angular dev server forwards, see the root README) works too and shares
the Angular login.

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://vite.dev/config/).
