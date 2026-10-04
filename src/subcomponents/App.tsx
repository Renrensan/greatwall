"use client";

// The page of an app section: the navbar (Create, Mint, Convert, Portfolio,
// Explore) chooses the app and section through the URL, so this only shows
// the app the URL names.

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";

const Vault = dynamic(() => import("./Vault"), { ssr: false });
const Convert = dynamic(() => import("./Convert"), { ssr: false });
const Bridge = dynamic(() => import("./Bridge"), { ssr: false });
const Beta = dynamic(() => import("./Beta"), { ssr: false });

function App() {
  const { app } = useParams<{ app: string }>();

  return (
    <div className="2xl:container 2xl:mx-auto flex flex-col w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-3 w-full max-w-full lg:max-w-170 mx-auto pb-16">
        <div className="flex flex-col gap-8 py-7.5">
          {app === "convert" ? <Convert /> : app === "bridge" ? <Bridge /> : app === "beta" ? <Beta /> : <Vault />}
        </div>
      </div>
    </div>
  );
}

export default App;
