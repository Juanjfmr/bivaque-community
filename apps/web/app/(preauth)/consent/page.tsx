import { redirect } from "next/navigation"

export default function ConsentPage() {
  redirect("/login?consent=required")
}
