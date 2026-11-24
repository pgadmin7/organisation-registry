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
The dev server listens on port 8443 of `organisatie.dev-vlaanderen.local` (see the hosts entries in the root README),
because the Angular dev server uses 443: https://organisatie.dev-vlaanderen.local:8443/v2/
The Angular dev server proxies `/v2` to it, so https://organisatie.dev-vlaanderen.local/v2/ works too and shares the Angular login.

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
