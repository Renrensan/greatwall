import { AllDappProviders } from "@/components/providers/dapp-providers";
import ContractTestPage from "@/subcomponents/contract-test/ContractTestPage";

export default function Page() {
  return (
    <AllDappProviders>
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <ContractTestPage />
      </div>
    </AllDappProviders>
  );
}
