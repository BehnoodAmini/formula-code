import Hero from "@/components/Hero";
import Skills from "@/components/Skills";
import Projects from "@/components/Projects";
import Garage from "@/components/Garage";
import Contact from "@/components/Contact";
import SectionWipe from "@/components/SectionWipe";

export default function Home() {
  return (
    <main id="main">
      <Hero />
      <SectionWipe />
      <Skills />
      <SectionWipe />
      <Projects />
      <SectionWipe />
      <Garage />
      <SectionWipe />
      <Contact />
    </main>
  );
}
