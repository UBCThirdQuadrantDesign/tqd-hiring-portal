/** Static studio copy — from the design reference, not derived from the application content model. */

export const studio = {
  name: "Hiring 2026/27",
  recruitmentLine: "CLOSES Sunday, Sept 13th, 11:59PM",
  intro: [
    "Third Quadrant Design (TQD) strives to address our changing climactic conditions by designing carbon-negative buildings through sustainable design principles. Our multidisciplinary approach allows us to choose different projects each year and find creative solutions for complex issues.",
    "From 2019-2025, we competed in the U.S. Department of Energy Solar Decathlon® Design Challenge and went undefeated with our 2020 and 2021 submissions. For our 2023 submission, TQD designed and built Third Space Commons on the UBC Vancouver campus with help from many partners, including DIALOG and Ledcor Consuction. In 2026, we are starting a new chapter separate from the Solar Decathlon."
  ],
  currently: [
    {
      strong: "Project Third Skin (2026):",
      rest: " Inspired by the Vancouver (2021) Heatwave, our upcoming project hopes to reimagine the accessibility of temperature controlled buildings by designing a four-unit apartment to uplift underlooked individuals, rooted in Passive House and co-living principles. ",
    },
    {
      strong: "Learning/Doing:",
      bullets: [
      "Conceptualizing an original building design focused on uplifting socially-isolated individuals",
      "Researching design/construction practices for a potential academic publication",
      "Creating an interactive digital walkthrough to go along with our designed space",
      "Gaining meaningful experience by working directly with architecture, engineering, and construction professionals",
      ],
    }
  ],
  selectedWorks: [
    {
      title: "Poetry Night",
      year: "2025–26",
      body: "A passive house retrofit of an Iranian Yakhchal designed to break gender barriers and bring communities together. Designed for the 2026 Buildner Re:Form Architecture Competition.",
      image: "/works/tqd-poetry-night1.jpg",
    },
    {
      title: "Vancouver Special 2.0",
      year: "2024–25",
      body: "A retrofit strategy for the city's most common house type, entered in the Solar Decathlon Design Challenge.",
      image: "/works/Vancouver-Special-2.0.png",
    },
    {
      title: "Third Space Commons",
      year: "2021-2023",
      body: "A design-build project on UBC’s Vancouver campus designed and constructed on the principles of carbon minimalism, system minimalism, flexibility & adaptability, resilience, and UBC as a living lab.",
      image: "/works/third-space-commons.avif",
    },
  ],
  captains: [
    { name: "Emma Heris", image: "/captains/emma1.jpg" },
    { name: "Spencer Sun", image: "/captains/spencer.jpg" },
    { name: "Juna Ibrahim", image: "/captains/juna1.jpg" },
  ],
  footer: {
    cycle: "Third Quadrant Design",
  },
} as const;
