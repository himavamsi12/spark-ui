import Header from "@/components/layout/Header";
import InteractionDnaStudio from "@/components/dna/InteractionDnaStudio";

export const metadata = {
  title: "Interaction DNA | Spark UI",
  description:
    "A timeline studio for building scroll, pointer and text animations, then exporting them as ready-to-run GSAP.",
};

export default function InteractionDnaPage() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <InteractionDnaStudio />
    </div>
  );
}
