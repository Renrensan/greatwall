

export interface ChartData {
  times: number[];
  values: number[];
}

export interface MarinadeSOLData {
  mSolPrice: number;
  totalStaked: number;
  apys: {
    liquid: string;
    native: string;
  };
  chartData?: {
    liquid: ChartData;
    native: ChartData;
  };
  mSolBalance: number;     
  mSolValueInSol: number; 
  nativeStakeBalance: number;
  pendingRewards: number; 
  nativeAccounts: StakeAccountInfo[];  
}


export interface MarinadeUSDCData {
  // APY Metrics
  apy: string;
  apyBase: string;      
  apyReward: string;    
  apy7d: string;
  apy24h: string;
  apy30d: string;
  apy90d: string;
  apy365d: string;
  apyActual?: string;    
  tokenPrice: number;
  solPrice?: number;      
  tokensAvailable: number;
  tokensInvested: number;
  sharePrice: number;
  tokensPerShare: number;
  numberOfHolders: number;
  sharesIssued: number;
  totalTVL: number;
  cumulativeInterestEarnedUsd?: number;
  interestEarnedPerSecondUsd?: number;
  userUsdcDeposited: number; 
  userShares: number;
  userShareOfVault: number; 
  userInterestEarnedUsd?: number;
  pendingFarmRewards: number;
}

export interface StakeAccountInfo {
  pubkey: string;
  lamports: number;
  status: 'active' | 'activating' | 'deactivating' | 'deactivated';
}