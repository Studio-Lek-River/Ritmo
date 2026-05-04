/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  safelist: [
    // All color utility patterns used dynamically by modules
    {
      pattern: /(bg|text|border|ring|from|to|fill)-(amber|cyan|purple|green|indigo|pink|blue|orange|rose|teal|red|yellow|slate)-(50|100|200|300|400|500|600|700|800|900)/,
    },
    {
      pattern: /(bg|text|border|ring)-(amber|cyan|purple|green|indigo|pink|blue|orange|rose|teal|red|yellow)-(900)\/(20|30|40|50)/,
    },
    {
      pattern: /hover:(bg|text|border)-(amber|cyan|purple|green|indigo|pink|blue|orange|rose|teal|red|yellow)-(50|100|200|300|400|500|600)/,
    },
    {
      pattern: /focus:ring-(amber|cyan|purple|green|indigo|pink|blue|orange|rose|teal|red|yellow)-(300|400)/,
    },
  ],
  plugins: [],
};
