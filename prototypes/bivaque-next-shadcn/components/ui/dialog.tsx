"use client";
import * as React from "react";
import * as D from "@radix-ui/react-dialog";
import {X} from "lucide-react";
export const Dialog=D.Root;
export const DialogTrigger=D.Trigger;
export function DialogContent({title,children}:React.PropsWithChildren<{title:string}>){return <D.Portal><D.Overlay className="dialog-overlay"/><D.Content className="dialog-body" aria-describedby={undefined}><D.Title className="dialog-title">{title}</D.Title><D.Close className="dialog-exit" aria-label="Fechar"><X size={20}/></D.Close>{children}</D.Content></D.Portal>;}