"use client"

import { useEffect, useRef } from "react"
import { mountApp } from "../../lib/app-lit/app"
import "../../lib/app-lit/app.css"

export default function AppPage() {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!host.current) return
    return mountApp(host.current)
  }, [])
  return <div id="app-lit" ref={host} />
}
