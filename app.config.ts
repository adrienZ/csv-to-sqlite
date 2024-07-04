export default defineAppConfig({
  ui: {
    primary: 'yellow',
    gray: 'zinc',
  },

  umami: {
    debug: import.meta.dev,
		ignoreLocalhost: false,
		host: "http://localhost:3000/",
		id: "replaceme",
		// sorry
		ignoreDnt: true,
    version: 2,
    useDirective: true,
	},
})