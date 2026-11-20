import { notFound } from "next/navigation";
import AuthForm from "./auth-form";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ path: "sign-in" }, { path: "sign-up" }];
}

export default async function AuthPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  if (path !== "sign-in" && path !== "sign-up") notFound();
  return <AuthForm mode={path} />;
}
