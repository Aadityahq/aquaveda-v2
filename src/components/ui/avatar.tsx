"use client";

import * as React from "react";
import Image from "next/image";
import type { ImageProps } from "next/image";

import { cn } from "@/lib/utils";

type AvatarState = {
  loaded: boolean;
  setLoaded: (loaded: boolean) => void;
};

const AvatarContext = React.createContext<AvatarState | null>(null);

export type AvatarProps = React.HTMLAttributes<HTMLDivElement>;

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, ...props }, ref) => {
    const [loaded, setLoaded] = React.useState(false);

    return (
      <AvatarContext.Provider value={{ loaded, setLoaded }}>
        <div
          ref={ref}
          className={cn("relative flex size-8 shrink-0 overflow-hidden rounded-full", className)}
          {...props}
        />
      </AvatarContext.Provider>
    );
  },
);
Avatar.displayName = "Avatar";

export type AvatarImageProps = Omit<ImageProps, "fill" | "alt"> & {
  alt?: string;
};

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, alt = "", onLoad, onError, ...props }, ref) => {
    const context = React.useContext(AvatarContext);

    return (
      <Image
        ref={ref}
        alt={alt}
        fill
        unoptimized
        className={cn(
          "absolute inset-0 size-full object-cover transition-opacity",
          context?.loaded ? "opacity-100" : "opacity-0",
          className,
        )}
        onLoad={(event) => {
          context?.setLoaded(true);
          onLoad?.(event);
        }}
        onError={(event) => {
          context?.setLoaded(false);
          onError?.(event);
        }}
        {...props}
      />
    );
  },
);
AvatarImage.displayName = "AvatarImage";

export type AvatarFallbackProps = React.HTMLAttributes<HTMLDivElement>;

const AvatarFallback = React.forwardRef<HTMLDivElement, AvatarFallbackProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-muted text-muted-foreground flex size-full items-center justify-center rounded-full font-mono text-xs font-medium uppercase tracking-wider",
        className,
      )}
      {...props}
    />
  ),
);
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };