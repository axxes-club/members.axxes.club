import Link from "next/link";
import { GangstarzEditor } from "./editor";

export default function Page() {
  return <><div className="mb-4"><Link className="underline" href="/atelier">Open in Atelier ↗</Link></div><GangstarzEditor /></>;
}
