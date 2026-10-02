

import { redirect} from 'next/navigation';


const VALID_APPS = ["vault", "convert", "dapphub", "dapp"] as const;
const DEFAULT_APP = "vault";

 
export default async function AppLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; network: string; app: string}>;
}) {
  const {network, locale, app} = await params;
  
  if (!VALID_APPS.includes(app as any)) {
    redirect(`/${locale}/${network}/${DEFAULT_APP}/buy`);
  }

  return (
    <>
    {children}</>

  );
}
