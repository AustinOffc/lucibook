"use client";

import { useEffect, useState } from "react";
import { avatarSrc, initialOf } from "@/lib/profile";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function Avatar({
  user,
  className,
}: {
  user: Pick<User, "username" | "name" | "avatar_url"> | null | undefined;
  className?: string;
}) {
  const src = avatarSrc(user);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-pinksoft-200 font-bold uppercase text-pinksoft-900",
        className ?? "h-9 w-9 text-sm"
      )}
    >
      {src && !failed ? (
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        initialOf(user)
      )}
    </div>
  );
}
