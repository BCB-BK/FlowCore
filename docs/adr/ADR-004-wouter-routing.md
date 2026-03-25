# ADR-004: Wouter for Client-Side Routing

## Status

Accepted

## Context

The frontend shell (Cluster 4) required a client-side router for the React+Vite wiki application. The original roadmap referenced React Router as a possible choice.

## Decision

We chose **wouter** (v3) instead of React Router for the following reasons:

1. **Bundle size**: wouter is ~2.1 KB gzipped vs React Router's ~30+ KB. For an enterprise intranet wiki, fast load times on potentially constrained networks matter.
2. **API simplicity**: wouter provides `useRoute`, `useLocation`, `Link`, `Route`, and `Switch` — sufficient for our flat route structure (Hub `/`, NodeDetail `/node/:id`, Search `/search`).
3. **No provider boilerplate**: wouter works without wrapping the app in a `<BrowserRouter>` provider, reducing component nesting.
4. **Hook-first design**: aligns with our React Query + hooks architecture pattern.

## Consequences

- Route matching is simpler (no nested routes, no loaders/actions).
- If we later need React Router v7 features (data loaders, deferred data, form actions), migration would require updating route definitions and replacing `useRoute`/`useLocation` with React Router equivalents.
- The current route structure (3 pages) is well within wouter's design scope.

## Migration Path

If React Router becomes necessary (e.g., for route-level code splitting with lazy loaders):

1. Install `react-router-dom`
2. Replace `Switch`/`Route` in `App.tsx` with `RouterProvider` + `createBrowserRouter`
3. Replace `useRoute` → `useParams`, `useLocation` → `useNavigate`
4. Estimated effort: ~2 hours for current 3-page app
