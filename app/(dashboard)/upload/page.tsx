import type { Metadata } from "next"
import { UploadClient } from "./upload-client"

export const metadata: Metadata = { title: "Subir Excel" }

// Server Component wrapper — permite exportar metadata
// El trabajo real está en el Client Component
export default function UploadPage() {
  return <UploadClient />
}
