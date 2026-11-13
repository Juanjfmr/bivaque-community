import React from "react";
export function Progress({value=0,className="",...props}:React.HTMLAttributes<HTMLDivElement>&{value?:number}){return <div {...props} className={"h-2 w-full overflow-hidden rounded-full bg-muted "+className}><div style={{width:Math.min(100,Math.max(0,value))+"%"}} className="h-full bg-primary"/></div>}
