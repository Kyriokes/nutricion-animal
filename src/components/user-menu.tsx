"use client";

import { ChevronDown, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NavGroup } from "@/modules/usuarios/navegacion";

// Menú del usuario: las opciones las decide navigationFor (según permisos) en
// el servidor; este componente solo las muestra.
export function UserMenu({
  name,
  photoUrl,
  groups,
}: {
  name: string;
  photoUrl: string | null;
  groups: NavGroup[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" className="h-9 gap-2 px-1.5" aria-label={`Menú de ${name}`} />}
      >
        {photoUrl ? (
          <Image src={photoUrl} alt="" width={28} height={28} className="rounded-full" />
        ) : (
          <span className="flex size-7 items-center justify-center rounded-full bg-muted text-sm font-medium" aria-hidden>
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="hidden max-w-40 truncate text-sm sm:inline">{name}</span>
        <ChevronDown aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-56">
        {groups.map((group, i) => (
          <Fragment key={group.label}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuGroup>
              <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
              {group.items.map((item) => (
                <DropdownMenuItem key={item.href} render={<Link href={item.href} />}>
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </Fragment>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut aria-hidden />
          Salir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
