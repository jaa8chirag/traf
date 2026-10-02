import { Hero } from "@/components/Hero";
import { Categories } from "@/components/Categories";
import { ProductRail } from "@/components/ProductRail";
import { WhyTarf } from "@/components/WhyTarf";
import { FeaturedCollection } from "@/components/FeaturedCollection";
import { Education } from "@/components/Education";
import { Reviews } from "@/components/Reviews";
import { FAQ } from "@/components/FAQ";
import { Newsletter } from "@/components/Newsletter";

export default function Home() {
  return (
    <>
      
        <Hero />
        <Categories />
        <ProductRail />
        <WhyTarf />
        <FeaturedCollection />
        <Education />
        <Reviews />
        <FAQ />
        <Newsletter />
    </>
  );
}
