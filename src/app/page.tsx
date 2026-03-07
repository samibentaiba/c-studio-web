"use client";
import dynamic from "next/dynamic";
const AppDynamic = dynamic(() => import("./page-client"), { ssr: false });
export default function Page() { return <AppDynamic />; }
