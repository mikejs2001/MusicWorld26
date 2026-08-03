import Hero from "../components/home/Hero";
import USPs from "../components/home/USPs";
import FeaturedServices from "../components/home/FeaturedServices";
import ChatPromo from "../components/home/ChatPromo";
import Testimonials from "../components/home/Testimonials";
import GalleryStrip from "../components/home/GalleryStrip";
import CTABand from "../components/home/CTABand";

export default function Home() {
  return (
    <>
      <Hero />
      <USPs />
      <FeaturedServices />
      <ChatPromo />
      <Testimonials />
      <GalleryStrip />
      <CTABand />
    </>
  );
}
