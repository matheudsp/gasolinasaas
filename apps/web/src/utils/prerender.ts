

export const prerenderRoutes = ["/", "/terms", "/privacy"].map((path) => ({
  path: (path),
  prerender: {
    enabled: true,
  },
}));
