import {ChainInfo, Zeroone, Avalanche} from '@particle-network/chains';
import * as particleAA from '@particle-network/rn-aa';
import * as particleAuthCore from '@particle-network/rn-auth-core';
import {evm} from '@particle-network/rn-auth-core';
import * as particleBase from '@particle-network/rn-base';
import {
  AccountName,
  Env,
  EvmService,
  ParticleInfo,
  SecurityAccountConfig,
  SmartAccountInfo,
} from '@particle-network/rn-base';
import * as particleConnect from '@particle-network/rn-connect';
import {WalletType} from '@particle-network/rn-connect';
import {Buffer} from 'buffer';
import React, {createContext, useContext, useEffect, useMemo} from 'react';

let isConnected = false;
let eoaAddress: null | string = null;

// Define your chain configurations
const AVALANCHE_C_CHAIN: ChainInfo = Avalanche;

const ZEROONE_SUBNET: ChainInfo = Zeroone;

interface SmartAccountData {
  chainInfo: ChainInfo;
  smartAccountAddress?: string;
  isDeployed?: boolean;
  lastUpdated?: Date;
}

interface ParticleContextType {
  particleUserInfo: particleAuthCore.UserInfo | null | undefined;
  isLoading: boolean;
  currentChain: ChainInfo;
  smartAccounts: Map<number, SmartAccountData>;
  smartAccount: SmartAccountData | undefined;

  // Connection methods
  connect: (
    walletType: particleConnect.WalletType,
    config?: particleConnect.ParticleConnectConfig,
  ) => Promise<particleAuthCore.UserInfo | undefined>;
  getConnected: () => Promise<boolean>;
  disconnect: () => Promise<string | undefined>;
  sendCode: (email: string) => Promise<boolean>;
  signMessage: (msg: string) => Promise<string | undefined>;

  // Chain management
  switchToChain: (chainInfo: ChainInfo) => Promise<boolean>;
  switchToCChain: () => Promise<boolean>;
  switchToSubnet: () => Promise<boolean>;

  // Smart account methods
  isDeploy: (chainInfo?: ChainInfo) => Promise<boolean | undefined>;
  getSmartAccountAddress: (
    chainInfo?: ChainInfo,
    scanForUpgradedAccountsFromV1?: boolean,
  ) => Promise<string | undefined>;
  getEoaAddress: () => Promise<string | undefined>;

  // Multi-chain helpers
  getAllSmartAccounts: () => Promise<Map<number, SmartAccountData>>;
  getSmartAccountForChain: (
    chainInfo: ChainInfo,
  ) => Promise<string | undefined>;
  refreshSmartAccountData: (chainInfo?: ChainInfo) => Promise<void>;
}

const ParticleContext = createContext<ParticleContextType | undefined>(
  undefined,
);

ParticleInfo.projectId = '869f3430-7f88-4fe4-afef-1d300f6c5de6'; // your project id
ParticleInfo.clientKey = 'c8AfXtRdc4L8uK4qDZwi8ruvfZKPsKmkN0mr2Cf0'; // your client key

if (ParticleInfo.projectId === '' || ParticleInfo.clientKey === '') {
  throw new Error(
    'You need set project info, Get your project id and client from dashboard, https://dashboard.particle.network',
  );
}

// Initialize with C-Chain first
const env = Env.Production;
particleBase.init(AVALANCHE_C_CHAIN, env);
particleBase.setSecurityAccountConfig(new SecurityAccountConfig(0, 0));
particleAuthCore.init();
// particleAuthCore.setBlindEnable(true);
particleAA.init(AccountName.BICONOMY_V2());
particleAA.enableAAMode();

// const result = await particleAuthCore.getBlindEnable();

/**
 * Provides Particle authentication and multi-chain wallet connection context to its child components.
 *
 * The `ParticleProvider` component initializes the Particle SDK, manages user authentication state,
 * handles multiple smart accounts across different chains, and exposes methods for connecting/disconnecting wallets,
 * chain switching, and smart account management.
 *
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The child components that will have access to the Particle context.
 * @returns {JSX.Element} The context provider wrapping the children.
 */
export const ParticleProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [particleUserInfo, setParticleUserInfo] =
    React.useState<particleAuthCore.UserInfo | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [currentChain, setCurrentChain] =
    React.useState<ChainInfo>(AVALANCHE_C_CHAIN);
  const [smartAccounts, setSmartAccounts] = React.useState<
    Map<number, SmartAccountData>
  >(new Map());

  /**
   * Switches to a different blockchain network.
   */
  async function switchToChain(chainInfo: ChainInfo): Promise<boolean> {
    try {
      setIsLoading(true);
      const result = await particleAuthCore.switchChain(chainInfo);
      if (result) {
        setCurrentChain(chainInfo);
        console.log(`Switched to ${chainInfo.name}`);
        return true;
      }
      return false;
    } catch (error) {
      console.log('Error switching chain:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Switches to Avalanche C-Chain.
   */
  async function switchToCChain(): Promise<boolean> {
    return await switchToChain(AVALANCHE_C_CHAIN);
  }

  /**
   * Switches to ZeroOne Subnet.
   */
  async function switchToSubnet(): Promise<boolean> {
    return await switchToChain(ZEROONE_SUBNET);
  }

  /**
   * Sends a verification code to the specified email address using the Particle Auth Core service.
   */
  async function sendCode(email: string) {
    return await particleAuthCore.sendEmailCode(email);
  }

  /**
   * Checks if the user is currently connected via Particle Auth Core.
   */
  async function getConnected() {
    return await particleAuthCore.isConnected();
  }

  /**
   * Connects to a wallet using the Particle Connect SDK and initializes smart accounts.
   */
  async function connect(
    walletType: particleConnect.WalletType,
    config?: particleConnect.ParticleConnectConfig,
  ) {
    try {
      setIsLoading(true);
      await particleConnect.connect(walletType, config);
      const user = await particleAuthCore.getUserInfo();
      setParticleUserInfo(user);
      isConnected = true;

      // Initialize smart accounts for both chains after successful connection
      await initializeAllSmartAccounts();

      return user;
    } catch (error) {
      console.log({error});
      throw error; // Ném lỗi để component gọi hàm có thể xử lý
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Initializes smart accounts for all supported chains.
   */
  async function initializeAllSmartAccounts(): Promise<void> {
    try {
      const supportedChains: ChainInfo[] = [ZEROONE_SUBNET, AVALANCHE_C_CHAIN];
      const smartAccountsMap = new Map<number, SmartAccountData>();

      supportedChains.forEach(chain => {
        smartAccountsMap.set(chain.id, {
          chainInfo: chain,
          lastUpdated: new Date(),
        });
      });

      const address = await getEoaAddress();
      if (!address) {
        throw new Error('No wallet address EOA available');
      }

      const updatedSmartAccounts = new Map(smartAccountsMap);

      // Initialize smart accounts for both chains
      for (const [chainId, smartAccountData] of smartAccountsMap) {
        const chainInfo = smartAccountData.chainInfo;

        try {
          const smartAccountAddress = await getSmartAccountAddressForChain(
            address,
            chainInfo,
          );

          const isDeployed = await checkIfDeployedForChain(address, chainInfo);

          updatedSmartAccounts.set(chainId, {
            ...smartAccountData,
            smartAccountAddress,
            isDeployed,
            lastUpdated: new Date(),
          });
        } catch (error) {
          console.log(
            `Error initializing smart account for ${chainInfo.name}:`,
            error,
          );
        }
      }

      setSmartAccounts(updatedSmartAccounts);
      setCurrentChain(AVALANCHE_C_CHAIN);
    } catch (error) {
      console.log('Error initializing smart accounts:', error);
    }
  }

  /**
   * Gets the EOA (Externally Owned Account) address.
   */
  async function getEoaAddress(): Promise<string | undefined> {
    try {
      if (eoaAddress) {
        return eoaAddress;
      }
      eoaAddress = await evm.getAddress();
      return eoaAddress;
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Signs a given message using the EVM's personalSign method.
   */
  async function signMessage(message: string) {
    try {
      if (!message) {
        throw new Error('Message to sign cannot be empty');
      }

      if (!particleUserInfo?.uuid) {
        throw new Error('Particle is not connected');
      }

      const walletAddress = await getEoaAddress();
      if (!walletAddress) {
        throw new Error('No wallet address available');
      }

      const hexMessage = '0x' + Buffer.from(message, 'utf8').toString('hex');

      return await particleConnect.signMessage(
        WalletType.AuthCore,
        walletAddress,
        hexMessage,
      );
    } catch (error) {
      console.log('Sign message error:', error);
    }
  }

  /**
   * Disconnects the current user and clears smart account data.
   */
  async function disconnect(): Promise<string | undefined> {
    try {
      setIsLoading(true);
      const status = await particleAuthCore.disconnect();
      const connectionStatus = await getConnected();
      isConnected = connectionStatus;
      setParticleUserInfo(null);

      // Clear smart accounts data
      setSmartAccounts(new Map());
      eoaAddress = null;

      return status;
    } catch (error) {
      console.log('Disconnect error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Gets smart account address for a specific chain or current chain.
   */
  async function getSmartAccountAddress(
    chainInfo?: ChainInfo,
    scanForUpgradedAccountsFromV1?: boolean,
  ): Promise<string | undefined> {
    try {
      const address = await getEoaAddress();
      if (!address) {
        throw new Error('No wallet address available');
      }

      const targetChain = chainInfo || currentChain;

      // Check if we have cached data
      const cachedData = smartAccounts.get(targetChain.id);
      if (cachedData?.smartAccountAddress && !scanForUpgradedAccountsFromV1) {
        return cachedData.smartAccountAddress;
      }

      // Switch to target chain if needed
      if (targetChain.id !== currentChain.id) {
        const switched = await switchToChain(targetChain);
        if (!switched) {
          return undefined;
        }
      }

      const smartAccountAddress = await getSmartAccountAddressForChain(
        address,
        targetChain,
        scanForUpgradedAccountsFromV1,
      );

      // Update cache
      if (smartAccountAddress) {
        const updatedSmartAccounts = new Map(smartAccounts);
        const existing = updatedSmartAccounts.get(targetChain.id) || {
          chainInfo: targetChain,
        };
        updatedSmartAccounts.set(targetChain.id, {
          ...existing,
          smartAccountAddress,
          lastUpdated: new Date(),
        });
        setSmartAccounts(updatedSmartAccounts);
      }

      return smartAccountAddress;
    } catch (error) {
      console.log('Error getting smart account address:', error);
    }
  }

  /**
   * Helper function to get smart account address for a specific chain.
   */
  async function getSmartAccountAddressForChain(
    eoaAddress: string,
    chainInfo: ChainInfo,
    scanForUpgradedAccountsFromV1?: boolean,
  ): Promise<string | undefined> {
    const smartAccountParam = {
      name: AccountName.BICONOMY_V2().name,
      version: AccountName.BICONOMY_V2().version,
      ownerAddress: eoaAddress,
      ...(scanForUpgradedAccountsFromV1 && {scanForUpgradedAccountsFromV1}),
    };

    const result: SmartAccountInfo[] = await EvmService.getSmartAccount([
      smartAccountParam,
    ]);

    const smartAccountAddress = result[0]?.smartAccountAddress;

    console.log(
      `Smart account address for ${chainInfo.name}:`,
      smartAccountAddress,
    );
    return smartAccountAddress;
  }

  /**
   * Checks if smart account is deployed for a specific chain or current chain.
   */
  async function isDeploy(chainInfo?: ChainInfo): Promise<boolean | undefined> {
    try {
      const address = await getEoaAddress();
      if (!address) {
        return undefined;
      }

      const targetChain = chainInfo || currentChain;

      // Check if we have cached data
      const cachedData = smartAccounts.get(targetChain.id);
      if (cachedData?.isDeployed !== undefined) {
        return cachedData.isDeployed;
      }

      // Switch to target chain if needed
      if (targetChain.id !== currentChain.id) {
        const switched = await switchToChain(targetChain);
        if (!switched) {
          return undefined;
        }
      }

      const result = await checkIfDeployedForChain(address, targetChain);

      // Update cache
      const updatedSmartAccounts = new Map(smartAccounts);
      const existing = updatedSmartAccounts.get(targetChain.id) || {
        chainInfo: targetChain,
      };
      updatedSmartAccounts.set(targetChain.id, {
        ...existing,
        isDeployed: result,
        lastUpdated: new Date(),
      });
      setSmartAccounts(updatedSmartAccounts);

      return result;
    } catch (error) {
      console.log('Error checking deployment status:', error);
    }
  }

  /**
   * Helper function to check if smart account is deployed for a specific chain.
   */
  async function checkIfDeployedForChain(
    eoaAddress: string,
    chainInfo: ChainInfo,
  ): Promise<boolean> {
    const result = await particleAA.isDeploy(eoaAddress);
    console.log(`Is deployed on ${chainInfo.name}:`, result);
    return result;
  }

  /**
   * Gets smart account address for a specific chain (convenience method).
   */
  async function getSmartAccountForChain(
    chainInfo: ChainInfo,
  ): Promise<string | undefined> {
    return await getSmartAccountAddress(chainInfo);
  }

  /**
   * Returns all smart accounts data.
   */
  async function getAllSmartAccounts(): Promise<Map<number, SmartAccountData>> {
    return smartAccounts;
  }

  /**
   * Refreshes smart account data for a specific chain or all chains.
   */
  async function refreshSmartAccountData(chainInfo?: ChainInfo): Promise<void> {
    try {
      const address = await getEoaAddress();
      if (!address) {
        return;
      }

      const updatedSmartAccounts = new Map(smartAccounts);
      const chainsToRefresh = chainInfo
        ? [chainInfo]
        : Array.from(smartAccounts.values()).map(data => data.chainInfo);

      for (const chain of chainsToRefresh) {
        const switched = await switchToChain(chain);
        if (!switched) {
          continue;
        }

        try {
          const smartAccountAddress = await getSmartAccountAddressForChain(
            address,
            chain,
          );
          const isDeployed = await checkIfDeployedForChain(address, chain);

          updatedSmartAccounts.set(chain.id, {
            chainInfo: chain,
            smartAccountAddress,
            isDeployed,
            lastUpdated: new Date(),
          });
        } catch (error) {
          console.log(`Error refreshing data for ${chain.name}:`, error);
        }
      }

      setSmartAccounts(updatedSmartAccounts);
    } catch (error) {
      console.log('Error refreshing smart account data:', error);
    }
  }

  const smartAccount = useMemo(() => {
    return smartAccounts.get(currentChain.id);
  }, [smartAccounts]);

  useEffect(() => {
    (async () => {
      try {
        isConnected = await getConnected();

        if (particleUserInfo?.uuid && isConnected) {
          isConnected = true;
          return;
        }

        if (isConnected) {
          const user = await particleAuthCore.getUserInfo();
          setParticleUserInfo(user);

          await initializeAllSmartAccounts();
        }
      } catch (error) {
        console.log('Initialization error:', error);
      }
    })();
  }, []);

  const value: ParticleContextType = {
    particleUserInfo,
    isLoading,
    currentChain,
    smartAccounts,
    smartAccount,
    connect,
    disconnect,
    getConnected,
    sendCode,
    signMessage,
    switchToChain,
    switchToCChain,
    switchToSubnet,
    isDeploy,
    getSmartAccountAddress,
    getEoaAddress,
    getAllSmartAccounts,
    getSmartAccountForChain,
    refreshSmartAccountData,
  };

  return (
    <ParticleContext.Provider value={value}>
      {children}
    </ParticleContext.Provider>
  );
};

export const useParticle = () => {
  const context = useContext(ParticleContext);
  if (context === undefined) {
    throw new Error('useParticle must be used within a ParticleProvider');
  }
  return context;
};

// Helper hook for current chain smart account
export const useCurrentChainSmartAccount = () => {
  const {currentChain, smartAccounts} = useParticle();
  return smartAccounts.get(currentChain.id);
};
