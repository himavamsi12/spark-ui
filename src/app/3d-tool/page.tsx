import Header from "@/components/layout/Header";
import ThreeDToolIntro from "@/components/3d-tool/ThreeDToolIntro";

export const metadata = {
  title: "3D Tool | Spark UI",
  description: "An inspector for 3D and WebGL sites: scene graph, shaders, and scroll triggers, laid out as layers. Coming soon, open source.",
};

export default function ThreeDToolPage() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <ThreeDToolIntro />
    </div>
  );
}
