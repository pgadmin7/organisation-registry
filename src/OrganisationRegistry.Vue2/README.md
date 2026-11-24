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
The dev server listens on port 443 of `organisatie.dev-vlaanderen.local` (see the hosts entries in the root README).
On Linux, allow node to bind that port once per node version (same as for the Angular UI):
```
sudo setcap 'cap_net_bind_service=+ep' "$(readlink -f "$(which node)")"
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
