/** Adapted from 21st.dev @kokonutd/carousel-cards, demo 19168 (MIT).\n * Source copy: 21st-carousel-cards.source.txt. Adaptations: data props, accessible favorites, links, Bivaque price units, external images. */\n"use client";

/**
 * @author: @dorianbaffier
 * @description: Carousel Cards
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { ChevronLeft, ChevronRight, Heart, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

export interface ExperienceItem {
  href?: string;
  priceLabel?: string;
  id: string;
  title: string;
  image: string;
  location: string;
  price: number;
  currency?: string;
  rating?: number;
  reviewCount?: number;
  badge?: string;
  date?: string;
}

interface ExperienceGridProps {
  title: string;
  items: ExperienceItem[];
  viewAllHref?: string;
  onSelect?: (item: ExperienceItem) => void;
}

const ExperienceCard = ({ experience }: { experience: ExperienceItem }) => {
  const [saved, setSaved] = React.useState(false);
  return (
  <Card className="group relative flex h-[320px] w-full flex-col overflow-hidden rounded-xl border-0 shadow-sm transition-shadow duration-300 hover:shadow-md">
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-xl">
      <Image
        alt={experience.title}
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        unoptimized
        fill
        src={experience.image}
      />
      <Button
        onClick={(event) => { event.preventDefault(); event.stopPropagation(); setSaved(!saved); }}
        aria-pressed={saved}
        aria-label={saved ? "Remover dos favoritos" : "Salvar nos favoritos"}
        className="absolute top-2 right-2 z-10 rounded-full bg-white/80 text-neutral-700 backdrop-blur-sm hover:bg-white/90 hover:text-black"
        size="icon"
        variant="ghost"
      >
        <Heart className={`h-4 w-4 stroke-[2px] ${saved ? "fill-rose-500 text-rose-500" : ""}`} />
        <span className="sr-only">Salvar nos favoritos</span>
      </Button>
      {experience.badge && (
        <Badge className="absolute top-2 left-2 rounded-md bg-white/90 px-1.5 py-0.5 font-medium text-black text-xs">
          {experience.badge}
        </Badge>
      )}
    </div>

    <div className="flex flex-1 flex-col justify-between">
      <CardContent className="p-2 pt-3 pb-0">
        <h3 className="font-medium text-sm tracking-tight">
          {experience.title}
        </h3>
        <p className="text-muted-foreground text-xs tracking-tight">
          {experience.location}
        </p>
        {experience.date && (
          <p className="text-muted-foreground text-xs tracking-tight">
            {experience.date}
          </p>
        )}
      </CardContent>

      <CardFooter className="mt-auto flex items-center gap-0.5 p-2 pt-0 text-xs">
        {experience.rating && (
          <span className="flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-current" />
            {experience.rating}
          </span>
        )}
        {experience.reviewCount && (
          <span className="text-muted-foreground text-xs tracking-tight">
            {experience.rating && "·"}
            {experience.reviewCount > 0 ? ` (${experience.reviewCount})` : ""}
          </span>
        )}
        <span className="ml-auto text-xs tracking-tight">
          {experience.price === 0 ? "Gratuito" : `${experience.currency || "R$"} ${experience.price.toLocaleString("pt-BR")} ${experience.priceLabel ?? ""}`}
        </span>
      </CardFooter>
    </div>
  </Card>
);
};

const ExperienceSection = ({
  title,
  items,
  viewAllHref = "#",
  onSelect,
}: ExperienceGridProps) => {
  const scrollContainer = React.useRef<HTMLDivElement>(null);

  const handleScrollLeft = () => {
    if (scrollContainer.current) {
      scrollContainer.current.scrollBy({
        left: -320,
        behavior: "smooth",
      });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainer.current) {
      scrollContainer.current.scrollBy({ left: 320, behavior: "smooth" });
    }
  };

  return (
    <div className="w-full py-4">
      <div className="mx-auto max-w-[1760px] px-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-medium text-lg tracking-tight md:text-xl">
            {title}
          </h2>
          <div className="flex items-center gap-1">
            <Button
              className="h-7 w-7 rounded-full border-neutral-200 hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-900"
              onClick={handleScrollLeft}
              size="icon"
              variant="outline"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Scroll left</span>
            </Button>
            <Button
              className="h-7 w-7 rounded-full border-neutral-200 hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-900"
              onClick={handleScrollRight}
              size="icon"
              variant="outline"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Scroll right</span>
            </Button>
            <Link
              className="ml-1 hidden font-medium text-xs hover:underline md:block"
              href={viewAllHref}
            >
              Show all
            </Link>
          </div>
        </div>

        <div
          className="scrollbar-hide -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2"
          ref={scrollContainer}
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {items.map((item) => (
            <div
              className="w-[240px] flex-none snap-start md:w-[260px]"
              key={item.id}
            >
              <Link
                className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                href={item.href ?? "#"}
                onClick={(event) => { if (!item.href) { event.preventDefault(); onSelect?.(item); } }}
              >
                <ExperienceCard experience={item} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


export default function CarouselCards({
  sections,
  onSelect,
}: {
  sections: { title: string; items: ExperienceItem[]; viewAllHref?: string }[];
  onSelect?: (item: ExperienceItem) => void;
}) {
  return (
    <div className="mt-4 w-full space-y-4" data-component-source="21st.dev/kokonutd/carousel-cards">
      {sections.map((section) => (
        <ExperienceSection
          key={section.title}
          title={section.title}
          items={section.items}
          viewAllHref={section.viewAllHref ?? "#"}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
