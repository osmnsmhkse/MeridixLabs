"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    // Small delay so the new page's DOM has rendered
    const timer = setTimeout(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
      );

      document
        .querySelectorAll(".reveal:not(.is-visible)")
        .forEach((el) => observer.observe(el));

      return () => observer.disconnect();
    }, 80);

    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
