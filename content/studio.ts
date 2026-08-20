/** Static studio copy — from the design reference, not derived from the application content model. */

export const studio = {
  name: "Recruitment 26/27",
  recruitmentLine: "CLOSES SEPT 20TH 11:59PM",
  intro: [
    "Founded in September 2019 by 3 female engineering students, Third Quadrant Design brings together passionate students from various disciplines to learn and act on our climate crisis. Our team utilizes innovative technologies to design and build regenerative high-performance buildings.",
    "From 2019-2025, we competed in the U.S. Department of Energy Solar Decathlon® Design Challenge collegiate competition and went undefeated with our 2020 and 2021 submissions. ",
  ],
  currently: [
    {
      strong: "Vancouver Special 2.0",
      rest: " — our 2024 Solar Decathlon Design Challenge submission, now in design development.",
    },
    {
      strong: null,
      rest: "Undefeated at the U.S. Department of Energy Solar Decathlon Design Challenge with our 2020 and 2021 entries.",
    },
    {
      strong: null,
      rest: "Working toward the first student‑designed and student‑built net‑zero academic space on our own campus.",
    },
  ],
  selectedWorks: [
    {
      title: "Poetry Night",
      year: "2025–26",
      body: "A passive house retrofit of an Iranian Yakhchal designed to break gender barriers and bring communities together. Designed for the 2026 Buildner Re:Form Architecture Competition.",
      image: "/works/Poetry-Night-2.png",
    },
    {
      title: "Vancouver Special 2.0",
      year: "2024–26",
      body: "A retrofit strategy for the city's most common house type, entered in the Solar Decathlon Design Challenge and now in design development.",
      image: "/works/vancouver-special-2.0.png",
    },
    {
      title: "Third Space Commons",
      year: "2021-2023",
      body: "A design-build project on UBC’s Vancouver campus designed and constructed on the principles of carbon minimalism, system minimalism, flexibility & adaptability, resilience, and UBC as a living lab.",
      image: "/works/third-space-commons.avif",
    },
  ],
  howWeReview:
    "We read every submission, then invite a shortlist to a thirty‑minute conversation in the studio. Offers go out after interviews close. Portfolios matter more than grades; a sketchbook page counts.",
  footer: {
    cycle: "2026–27",
  },
} as const;
