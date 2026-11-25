import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function AvatarGroup({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center [&>*]:-ml-2.5 [&>*]:ring-2 [&>*]:ring-background first:[&>*]:ml-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

function AvatarGroupCount({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-muted text-muted-foreground -ml-2.5 flex h-8 w-8 items-center justify-center rounded-full text-xs ring-2 ring-background",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface AvatarStackItem {
  name: string;
  src?: string;
  fallback?: string;
}

interface AvatarStackProps {
  avatars: AvatarStackItem[];
  max?: number;
  className?: string;
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AvatarStack({ avatars, max = 4, className }: AvatarStackProps) {
  const visible = avatars.slice(0, max);
  const overflow = avatars.length - max;

  return (
    <AvatarGroup className={cn(className)}>
      {visible.map((avatar, i) => (
        <Avatar key={i} className="transition-transform hover:-translate-y-0.5">
          <AvatarImage src={avatar.src} alt={avatar.name} />
          <AvatarFallback>
            {avatar.fallback ?? getInitials(avatar.name)}
          </AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 && (
        <AvatarGroupCount className="text-foreground font-medium">
          +{overflow}
        </AvatarGroupCount>
      )}
    </AvatarGroup>
  );
}

const avatars: AvatarStackItem[] = [
  {
    name: "Olivia Sparks",
    src: "https://cdn.21st.dev/assets/localized/b539abc60701ab9cbcd73f9241d13a14a09582a4fd06c65784cb5567d77a2e0e.webp",
    fallback: "OS",
  },
  {
    name: "Hallie Richards",
    src: "https://cdn.21st.dev/assets/localized/61fda783ca2662349458bad61a434038016f05d6a14bd7c5a314f48c8ee8be03.webp",
    fallback: "HR",
  },
  {
    name: "Howard Lloyd",
    src: "https://cdn.21st.dev/assets/localized/2bc5f22fa3400c61a2161d14e3dce5a0804badebfc1b3d9cbe844feaa3b72180.webp",
    fallback: "HL",
  },
  {
    name: "Jenny Wilson",
    src: "https://cdn.21st.dev/assets/localized/c5ee2e124ea7334450d30a46607f793534f567e97d4b708cda110a06aeed4953.webp",
    fallback: "JW",
  },
  {
    name: "Daniel Park",
    src: "https://cdn.21st.dev/assets/localized/3ac4ad42a8a76abc8f29025d958460be1771e6e4d12a771e2bef33b21b0a30d6.jpg",
    fallback: "DP",
  },
  {
    name: "Alice Morgan",
    src: "https://cdn.21st.dev/assets/localized/c70d48e47d3a2d79ad07d16bff3aa3cff686580be031b6102cad73a15b47d8fd.jpg",
    fallback: "AM",
  },
];

export default function AvatarStackDemo() {
  return (
    <div className="bg-background flex flex-wrap items-center justify-center rounded-full border p-1">
      <AvatarStack avatars={avatars} max={3} />
      <p className="text-muted-foreground px-2 text-xs">
        Loved by <strong className="text-foreground font-medium">30K+</strong>{" "}
        developers.
      </p>
    </div>
  );
}
